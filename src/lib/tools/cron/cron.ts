export type CronFieldName = 'second' | 'minute' | 'hour' | 'dayOfMonth' | 'month' | 'dayOfWeek';

export type CronItem =
	| { kind: 'any' }
	| { kind: 'value'; value: number }
	| { kind: 'range'; from: number; to: number }
	| { kind: 'step'; from: number; to: number; step: number; wildcard: boolean };

export type CronField = {
	name: CronFieldName;
	raw: string;
	items: CronItem[];
	/** Sorted, unique values that match (day of week already normalised to 0-6). */
	values: number[];
	set: Set<number>;
	/** True when the raw field starts with `*` (Vixie "star" flag, used for the day OR rule). */
	star: boolean;
};

export type ParsedCron = {
	source: string;
	/** Five-field form of a macro, when the expression was one. */
	macro?: string;
	seconds: boolean;
	fields: Record<CronFieldName, CronField>;
	/** Fields in the order they were written. */
	order: CronFieldName[];
};

export type CronErrorReason =
	| 'empty'
	| 'fieldCount'
	| 'macro'
	| 'syntax'
	| 'range'
	| 'order'
	| 'step';

export type CronError = {
	reason: CronErrorReason;
	/** Undefined for errors about the whole expression. */
	field?: CronFieldName;
	token: string;
	min: number;
	max: number;
	/** For `fieldCount`: how many fields were expected / found. */
	expected?: number;
	found?: number;
};

export type CronParseResult = { ok: true; cron: ParsedCron } | { ok: false; errors: CronError[] };

type FieldSpec = { name: CronFieldName; min: number; max: number; names?: string[]; nameBase?: number };

const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const WEEKDAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export const FIELD_SPECS: Record<CronFieldName, FieldSpec> = {
	second: { name: 'second', min: 0, max: 59 },
	minute: { name: 'minute', min: 0, max: 59 },
	hour: { name: 'hour', min: 0, max: 23 },
	dayOfMonth: { name: 'dayOfMonth', min: 1, max: 31 },
	month: { name: 'month', min: 1, max: 12, names: MONTH_NAMES, nameBase: 1 },
	dayOfWeek: { name: 'dayOfWeek', min: 0, max: 7, names: WEEKDAY_NAMES, nameBase: 0 }
};

const FIVE_FIELDS: CronFieldName[] = ['minute', 'hour', 'dayOfMonth', 'month', 'dayOfWeek'];
const SIX_FIELDS: CronFieldName[] = ['second', ...FIVE_FIELDS];

const MACROS: Record<string, string> = {
	'@yearly': '0 0 1 1 *',
	'@annually': '0 0 1 1 *',
	'@monthly': '0 0 1 * *',
	'@weekly': '0 0 * * 0',
	'@daily': '0 0 * * *',
	'@midnight': '0 0 * * *',
	'@hourly': '0 * * * *'
};

function parseNumber(spec: FieldSpec, token: string): number | undefined {
	if (/^\d+$/.test(token)) {
		return Number(token);
	}
	if (spec.names !== undefined && spec.nameBase !== undefined) {
		const index = spec.names.indexOf(token.toUpperCase());
		if (index >= 0) {
			return index + spec.nameBase;
		}
	}
	return undefined;
}

function error(spec: FieldSpec, reason: CronErrorReason, token: string): CronError {
	return { reason, field: spec.name, token, min: spec.min, max: spec.max };
}

function parseItem(spec: FieldSpec, text: string): CronItem | CronError {
	if (text === '') {
		return error(spec, 'syntax', text);
	}
	const parts = text.split('/');
	if (parts.length > 2) {
		return error(spec, 'syntax', text);
	}
	const base = parts[0] ?? '';
	const stepText = parts[1];
	let step: number | undefined;
	if (stepText !== undefined) {
		if (!/^\d+$/.test(stepText)) {
			return error(spec, 'step', text);
		}
		step = Number(stepText);
		if (step < 1) {
			return error(spec, 'step', text);
		}
	}
	const wildcardMax = spec.name === 'dayOfWeek' ? 6 : spec.max;
	if (base === '*' || (base === '?' && (spec.name === 'dayOfMonth' || spec.name === 'dayOfWeek'))) {
		if (step === undefined) {
			return { kind: 'any' };
		}
		return { kind: 'step', from: spec.min, to: wildcardMax, step, wildcard: true };
	}
	const bounds = base.split('-');
	if (bounds.length > 2) {
		return error(spec, 'syntax', text);
	}
	const from = parseNumber(spec, bounds[0] ?? '');
	if (from === undefined) {
		return error(spec, 'syntax', text);
	}
	if (from < spec.min || from > spec.max) {
		return error(spec, 'range', text);
	}
	if (bounds.length === 1) {
		if (step === undefined) {
			return { kind: 'value', value: from };
		}
		return { kind: 'step', from, to: wildcardMax, step, wildcard: false };
	}
	const to = parseNumber(spec, bounds[1] ?? '');
	if (to === undefined) {
		return error(spec, 'syntax', text);
	}
	if (to < spec.min || to > spec.max) {
		return error(spec, 'range', text);
	}
	if (from > to) {
		return error(spec, 'order', text);
	}
	if (step === undefined) {
		return { kind: 'range', from, to };
	}
	return { kind: 'step', from, to, step, wildcard: false };
}

function isError(value: CronItem | CronError): value is CronError {
	return 'reason' in value;
}

function expandItem(spec: FieldSpec, item: CronItem): number[] {
	if (item.kind === 'any') {
		return range(spec.min, spec.name === 'dayOfWeek' ? 6 : spec.max, 1);
	}
	if (item.kind === 'value') {
		return [item.value];
	}
	if (item.kind === 'range') {
		return range(item.from, item.to, 1);
	}
	return range(item.from, item.to, item.step);
}

function range(from: number, to: number, step: number): number[] {
	const values: number[] = [];
	for (let value = from; value <= to; value += step) {
		values.push(value);
	}
	return values;
}

function parseField(spec: FieldSpec, raw: string): CronField | CronError[] {
	const items: CronItem[] = [];
	const errors: CronError[] = [];
	for (const text of raw.split(',')) {
		const item = parseItem(spec, text);
		if (isError(item)) {
			errors.push(item);
		} else {
			items.push(item);
		}
	}
	if (errors.length > 0) {
		return errors;
	}
	const set = new Set<number>();
	for (const item of items) {
		for (const value of expandItem(spec, item)) {
			set.add(spec.name === 'dayOfWeek' && value === 7 ? 0 : value);
		}
	}
	return {
		name: spec.name,
		raw,
		items,
		values: [...set].sort((a, b) => a - b),
		set,
		star: raw.startsWith('*') || raw.startsWith('?')
	};
}

export function parseCron(expression: string, options: { seconds: boolean }): CronParseResult {
	const source = expression.trim();
	if (source === '') {
		return { ok: false, errors: [{ reason: 'empty', token: '', min: 0, max: 0 }] };
	}
	let macro: string | undefined;
	let text = source;
	if (source.startsWith('@')) {
		const expanded = MACROS[source.toLowerCase()];
		if (expanded === undefined) {
			return { ok: false, errors: [{ reason: 'macro', token: source, min: 0, max: 0 }] };
		}
		macro = expanded;
		text = options.seconds ? `0 ${expanded}` : expanded;
	}
	const names = options.seconds ? SIX_FIELDS : FIVE_FIELDS;
	const tokens = text.split(/\s+/);
	if (tokens.length !== names.length) {
		return {
			ok: false,
			errors: [
				{
					reason: 'fieldCount',
					token: source,
					min: 0,
					max: 0,
					expected: names.length,
					found: tokens.length
				}
			]
		};
	}
	const fields: Partial<Record<CronFieldName, CronField>> = {};
	const errors: CronError[] = [];
	for (const [index, name] of names.entries()) {
		const parsed = parseField(FIELD_SPECS[name], tokens[index] ?? '');
		if (Array.isArray(parsed)) {
			errors.push(...parsed);
		} else {
			fields[name] = parsed;
		}
	}
	if (errors.length > 0) {
		return { ok: false, errors };
	}
	const zero = parseField(FIELD_SPECS.second, '0');
	const { second = zero, minute, hour, dayOfMonth, month, dayOfWeek } = fields;
	if (
		Array.isArray(second) ||
		minute === undefined ||
		hour === undefined ||
		dayOfMonth === undefined ||
		month === undefined ||
		dayOfWeek === undefined
	) {
		return { ok: false, errors: [{ reason: 'syntax', token: source, min: 0, max: 0 }] };
	}
	return {
		ok: true,
		cron: {
			source,
			macro,
			seconds: options.seconds,
			fields: { second, minute, hour, dayOfMonth, month, dayOfWeek },
			order: names
		}
	};
}

/** Vixie rule: if both day fields are restricted a day matches when EITHER matches. */
export function dayMatches(cron: ParsedCron, year: number, month: number, day: number): boolean {
	const { dayOfMonth, dayOfWeek } = cron.fields;
	const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
	const domMatch = dayOfMonth.set.has(day);
	const dowMatch = dayOfWeek.set.has(weekday);
	if (dayOfMonth.star || dayOfWeek.star) {
		return domMatch && dowMatch;
	}
	return domMatch || dowMatch;
}

type WallParts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
	const cached = formatters.get(timeZone);
	if (cached !== undefined) {
		return cached;
	}
	const created = new Intl.DateTimeFormat('en-US', {
		timeZone,
		hourCycle: 'h23',
		year: 'numeric',
		month: 'numeric',
		day: 'numeric',
		hour: 'numeric',
		minute: 'numeric',
		second: 'numeric'
	});
	formatters.set(timeZone, created);
	return created;
}

function wallParts(timestamp: number, timeZone: string): WallParts {
	const result: WallParts = { year: 0, month: 0, day: 0, hour: 0, minute: 0, second: 0 };
	for (const part of formatterFor(timeZone).formatToParts(new Date(timestamp))) {
		const value = Number(part.value);
		if (part.type === 'year') {
			result.year = value;
		} else if (part.type === 'month') {
			result.month = value;
		} else if (part.type === 'day') {
			result.day = value;
		} else if (part.type === 'hour') {
			result.hour = value % 24;
		} else if (part.type === 'minute') {
			result.minute = value;
		} else if (part.type === 'second') {
			result.second = value;
		}
	}
	return result;
}

/** The wall clock of `timestamp` in the zone, expressed as if it were UTC. */
function wallMs(timestamp: number, timeZone: string): number {
	const p = wallParts(Math.floor(timestamp / 1000) * 1000, timeZone);
	return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
}

const DAY_MS = 86_400_000;

/**
 * Converts a wall-clock time to an instant. Times skipped by a DST jump do
 * not exist and return undefined; repeated times resolve to the first pass.
 */
function wallToInstant(target: number, timeZone: string): number | undefined {
	const before = wallMs(target - DAY_MS, timeZone) - (target - DAY_MS);
	const after = wallMs(target + DAY_MS, timeZone) - (target + DAY_MS);
	let best: number | undefined;
	for (const offset of new Set([before, after])) {
		const candidate = target - offset;
		if (wallMs(candidate, timeZone) === target && (best === undefined || candidate < best)) {
			best = candidate;
		}
	}
	return best;
}

const MAX_DAYS = 366 * 5 + 2;

/**
 * Next `count` runs strictly after `from`, evaluated on the wall clock of
 * `timeZone` ('UTC' or an IANA name). Gives up after about five years and
 * returns whatever was found. Wall times skipped by a DST jump do not run;
 * wall times repeated by a DST fall-back run once (first pass).
 */
export function nextRuns(cron: ParsedCron, from: Date, count = 10, timeZone = 'UTC'): Date[] {
	const runs: Date[] = [];
	if (!Number.isFinite(from.getTime())) {
		return runs;
	}
	let startWall: number;
	try {
		startWall = wallMs(from.getTime(), timeZone);
	} catch {
		return runs;
	}
	const startInstant = Math.floor(from.getTime() / 1000) * 1000 + 1000;
	const startDay = Math.floor(startWall / DAY_MS) * DAY_MS;
	const { second, minute, hour, month } = cron.fields;
	for (let offset = 0; offset < MAX_DAYS; offset += 1) {
		const dayMs = startDay + offset * DAY_MS;
		const date = new Date(dayMs);
		const y = date.getUTCFullYear();
		const m = date.getUTCMonth() + 1;
		const d = date.getUTCDate();
		if (!month.set.has(m) || !dayMatches(cron, y, m, d)) {
			continue;
		}
		for (const h of hour.values) {
			for (const mi of minute.values) {
				for (const s of second.values) {
					const target = dayMs + ((h * 60 + mi) * 60 + s) * 1000;
					if (target <= startWall) {
						continue;
					}
					const instant = wallToInstant(target, timeZone);
					if (instant === undefined || instant < startInstant) {
						continue;
					}
					runs.push(new Date(instant));
					if (runs.length >= count) {
						return runs;
					}
				}
			}
		}
	}
	return runs;
}
