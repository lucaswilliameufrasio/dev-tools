import type { MessageKey } from '#lib/i18n/index.svelte.js';
import type { CronField, CronFieldName, CronItem, ParsedCron } from './cron';

export type Translate = (key: MessageKey, params?: Record<string, string | number>) => string;

export type BreakdownRow = { field: CronFieldName; raw: string; meaning: string };

const ANY_KEYS: Record<CronFieldName, MessageKey> = {
	second: 'cron.mean.any.second',
	minute: 'cron.mean.any.minute',
	hour: 'cron.mean.any.hour',
	dayOfMonth: 'cron.mean.any.dayOfMonth',
	month: 'cron.mean.any.month',
	dayOfWeek: 'cron.mean.any.dayOfWeek'
};

const VALUE_KEYS: Record<CronFieldName, MessageKey> = {
	second: 'cron.mean.value.second',
	minute: 'cron.mean.value.minute',
	hour: 'cron.mean.value.hour',
	dayOfMonth: 'cron.mean.value.dayOfMonth',
	month: 'cron.mean.value.month',
	dayOfWeek: 'cron.mean.value.dayOfWeek'
};

const UNIT_KEYS: Record<CronFieldName, MessageKey> = {
	second: 'cron.unit.second',
	minute: 'cron.unit.minute',
	hour: 'cron.unit.hour',
	dayOfMonth: 'cron.unit.dayOfMonth',
	month: 'cron.unit.month',
	dayOfWeek: 'cron.unit.dayOfWeek'
};

export const FIELD_LABEL_KEYS: Record<CronFieldName, MessageKey> = {
	second: 'cron.field.second',
	minute: 'cron.field.minute',
	hour: 'cron.field.hour',
	dayOfMonth: 'cron.field.dayOfMonth',
	month: 'cron.field.month',
	dayOfWeek: 'cron.field.dayOfWeek'
};

function monthName(month: number, locale: string): string {
	return new Date(Date.UTC(2021, month - 1, 1)).toLocaleDateString(locale, {
		month: 'long',
		timeZone: 'UTC'
	});
}

function weekdayName(day: number, locale: string): string {
	// 2021-08-01 was a Sunday.
	return new Date(Date.UTC(2021, 7, 1 + (day % 7))).toLocaleDateString(locale, {
		weekday: 'long',
		timeZone: 'UTC'
	});
}

function formatValue(field: CronFieldName, value: number, locale: string): string {
	if (field === 'month') {
		return monthName(value, locale);
	}
	if (field === 'dayOfWeek') {
		return weekdayName(value, locale);
	}
	return String(value);
}

function list(values: string[], locale: string): string {
	return new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(values);
}

function describeItem(name: CronFieldName, item: CronItem, tr: Translate, locale: string): string {
	if (item.kind === 'any') {
		return tr(ANY_KEYS[name]);
	}
	if (item.kind === 'value') {
		return tr(VALUE_KEYS[name], { v: formatValue(name, item.value, locale) });
	}
	const a = formatValue(name, item.from, locale);
	const b = formatValue(name, item.to, locale);
	if (item.kind === 'range') {
		return tr('cron.mean.range', { a, b });
	}
	const step = tr('cron.mean.step', { n: item.step, unit: tr(UNIT_KEYS[name]) });
	if (item.wildcard) {
		return step;
	}
	return `${step}, ${tr('cron.mean.range', { a, b })}`;
}

export function describeField(field: CronField, tr: Translate, locale: string): string {
	return list(
		field.items.map((item) => describeItem(field.name, item, tr, locale)),
		locale
	);
}

export function breakdown(cron: ParsedCron, tr: Translate, locale: string): BreakdownRow[] {
	const rows: BreakdownRow[] = [];
	for (const name of cron.order) {
		const field = cron.fields[name];
		rows.push({ field: name, raw: field.raw, meaning: describeField(field, tr, locale) });
	}
	return rows;
}

type Shape =
	| { kind: 'any' }
	| { kind: 'step'; n: number }
	| { kind: 'values'; values: number[] }
	| { kind: 'range'; from: number; to: number }
	| { kind: 'other' };

function shapeOf(field: CronField): Shape {
	const first = field.items[0];
	if (field.items.length === 1 && first !== undefined) {
		if (first.kind === 'any') {
			return { kind: 'any' };
		}
		if (first.kind === 'step' && first.wildcard) {
			return { kind: 'step', n: first.step };
		}
		if (first.kind === 'range') {
			return { kind: 'range', from: first.from, to: first.to };
		}
	}
	for (const item of field.items) {
		if (item.kind !== 'value') {
			return { kind: 'other' };
		}
	}
	return { kind: 'values', values: field.values };
}

function pad(value: number): string {
	return String(value).padStart(2, '0');
}

function secondsPart(cron: ParsedCron): Shape {
	return shapeOf(cron.fields.second);
}

function timePhrase(cron: ParsedCron, tr: Translate, locale: string): { text: string; specific: boolean } | undefined {
	const second = secondsPart(cron);
	const minute = shapeOf(cron.fields.minute);
	const hour = shapeOf(cron.fields.hour);
	const mf = cron.fields.minute.values;
	if (cron.seconds) {
		const everySecond = minute.kind === 'any' && hour.kind === 'any';
		if (second.kind === 'any' && everySecond) {
			return { text: tr('cron.sum.everySecond'), specific: false };
		}
		if (second.kind === 'step' && everySecond) {
			return { text: tr('cron.sum.everyNSeconds', { n: second.n }), specific: false };
		}
	}
	let secondValue = 0;
	if (cron.seconds) {
		if (second.kind !== 'values' || second.values.length !== 1) {
			return undefined;
		}
		secondValue = second.values[0] ?? 0;
	}
	if (secondValue !== 0 && !(minute.kind === 'values' && hour.kind === 'values')) {
		return undefined;
	}
	if (minute.kind === 'values' && hour.kind === 'values' && minute.values.length * hour.values.length <= 8) {
		const times: string[] = [];
		for (const h of hour.values) {
			for (const m of minute.values) {
				times.push(secondValue === 0 ? `${pad(h)}:${pad(m)}` : `${pad(h)}:${pad(m)}:${pad(secondValue)}`);
			}
		}
		return { text: tr('cron.sum.atTimes', { times: list(times, locale) }), specific: true };
	}
	if (minute.kind === 'any' && hour.kind === 'any') {
		return { text: tr('cron.sum.everyMinute'), specific: false };
	}
	if (minute.kind === 'step' && hour.kind === 'any') {
		return { text: tr('cron.sum.everyNMinutes', { n: minute.n }), specific: false };
	}
	if (minute.kind === 'values' && hour.kind === 'any') {
		const key = mf.length === 1 ? 'cron.sum.minuteOfEveryHour' : 'cron.sum.minutesOfEveryHour';
		return { text: tr(key, { m: list(mf.map(String), locale) }), specific: false };
	}
	if (minute.kind === 'any' && hour.kind === 'range') {
		return { text: tr('cron.sum.everyMinuteBetween', { a: pad(hour.from), b: pad(hour.to) }), specific: false };
	}
	if (minute.kind === 'any' && hour.kind === 'values' && hour.values.length === 1) {
		const h = pad(hour.values[0] ?? 0);
		return { text: tr('cron.sum.everyMinuteBetween', { a: h, b: h }), specific: false };
	}
	if (minute.kind === 'values' && mf.length === 1 && hour.kind === 'step') {
		if (mf[0] === 0) {
			return { text: tr('cron.sum.everyNHours', { n: hour.n }), specific: false };
		}
		return { text: tr('cron.sum.minuteEveryNHours', { m: mf[0] ?? 0, n: hour.n }), specific: false };
	}
	if (minute.kind === 'values' && mf.length === 1 && hour.kind === 'range') {
		return {
			text: tr('cron.sum.minuteHourRange', { m: mf[0] ?? 0, a: pad(hour.from), b: pad(hour.to) }),
			specific: false
		};
	}
	return undefined;
}

function weekdaysEqual(values: number[], expected: number[]): boolean {
	return values.length === expected.length && values.every((value, index) => value === expected[index]);
}

/** Returns '' when days are unrestricted, undefined when the pattern is too complex. */
function dayPhrase(cron: ParsedCron, tr: Translate, locale: string): string | undefined {
	const dom = shapeOf(cron.fields.dayOfMonth);
	const dow = shapeOf(cron.fields.dayOfWeek);
	let domText = '';
	if (dom.kind === 'values') {
		const days = list(dom.values.map(String), locale);
		domText = tr(dom.values.length === 1 ? 'cron.sum.onDom' : 'cron.sum.onDomPlural', { days });
	} else if (dom.kind === 'range') {
		domText = tr('cron.sum.domRange', { a: dom.from, b: dom.to });
	} else if (dom.kind !== 'any') {
		return undefined;
	}
	let dowText = '';
	if (dow.kind === 'any') {
		dowText = '';
	} else if (dow.kind === 'values' || dow.kind === 'range') {
		const values = cron.fields.dayOfWeek.values;
		if (weekdaysEqual(values, [1, 2, 3, 4, 5])) {
			dowText = tr('cron.sum.weekdays');
		} else if (weekdaysEqual(values, [0, 6])) {
			dowText = tr('cron.sum.weekends');
		} else {
			dowText = tr('cron.sum.onWeekdays', { days: list(values.map((v) => weekdayName(v, locale)), locale) });
		}
	} else {
		return undefined;
	}
	if (domText !== '' && dowText !== '') {
		return tr('cron.sum.either', { dom: domText, dow: dowText });
	}
	return domText !== '' ? domText : dowText;
}

function monthPhrase(cron: ParsedCron, tr: Translate, locale: string): string | undefined {
	const month = shapeOf(cron.fields.month);
	if (month.kind === 'any') {
		return '';
	}
	if (month.kind === 'values') {
		return tr('cron.sum.inMonths', { months: list(month.values.map((v) => monthName(v, locale)), locale) });
	}
	if (month.kind === 'range') {
		return tr('cron.sum.monthRange', { a: monthName(month.from, locale), b: monthName(month.to, locale) });
	}
	return undefined;
}

/**
 * One-sentence summary, or undefined when the schedule is too intricate to
 * summarise without being misleading (the per-field breakdown still applies).
 */
export function summarize(cron: ParsedCron, tr: Translate, locale: string): string | undefined {
	const time = timePhrase(cron, tr, locale);
	const days = dayPhrase(cron, tr, locale);
	const months = monthPhrase(cron, tr, locale);
	if (time === undefined || days === undefined || months === undefined) {
		return undefined;
	}
	const parts = [time.text];
	if (days !== '') {
		parts.push(days);
	} else if (time.specific && months === '') {
		parts.push(tr('cron.sum.everyDay'));
	}
	if (months !== '') {
		parts.push(months);
	}
	const sentence = parts.join(', ');
	return `${sentence.charAt(0).toLocaleUpperCase(locale)}${sentence.slice(1)}.`;
}
