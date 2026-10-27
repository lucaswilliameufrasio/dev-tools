export type ParsedMoment = { date: Date; interpretedAs: 'seconds' | 'milliseconds' | 'text' };

const NUMERIC = /^-?\d+(\.\d+)?$/;
const MILLISECOND_THRESHOLD = 100_000_000_000;

export function parseMoment(input: string): ParsedMoment | undefined {
	const trimmed = input.trim();
	if (trimmed === '') {
		return undefined;
	}
	if (NUMERIC.test(trimmed)) {
		const numeric = Number(trimmed);
		const isMilliseconds = Math.abs(numeric) >= MILLISECOND_THRESHOLD;
		const date = new Date(isMilliseconds ? numeric : numeric * 1000);
		if (Number.isNaN(date.getTime())) {
			return undefined;
		}
		return { date, interpretedAs: isMilliseconds ? 'milliseconds' : 'seconds' };
	}
	const date = new Date(trimmed);
	if (Number.isNaN(date.getTime())) {
		return undefined;
	}
	return { date, interpretedAs: 'text' };
}

export function formatInZone(date: Date, timeZone: string, locale: string): string {
	return new Intl.DateTimeFormat(locale, {
		dateStyle: 'full',
		timeStyle: 'long',
		timeZone
	}).format(date);
}

export function relativeTime(date: Date, now: Date, locale: string): string {
	const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
	const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
	const units: [Intl.RelativeTimeFormatUnit, number][] = [
		['year', 31_536_000],
		['month', 2_592_000],
		['day', 86_400],
		['hour', 3_600],
		['minute', 60]
	];
	for (const [unit, size] of units) {
		if (Math.abs(seconds) >= size) {
			return formatter.format(Math.round(seconds / size), unit);
		}
	}
	return formatter.format(seconds, 'second');
}

export function localTimeZone(): string {
	return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function availableTimeZones(): string[] {
	const zones = Intl.supportedValuesOf('timeZone');
	return zones.includes('UTC') ? zones : ['UTC', ...zones];
}
