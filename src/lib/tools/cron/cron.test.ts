import { describe, expect, it } from 'vitest';
import { nextRuns, parseCron, type CronFieldName, type ParsedCron } from './cron';
import { breakdown, summarize, type Translate } from './explain';

function parse(expression: string, seconds = false): ParsedCron {
	const result = parseCron(expression, { seconds });
	if (!result.ok) {
		throw new Error(`parse failed: ${JSON.stringify(result.errors)}`);
	}
	return result.cron;
}

function values(cron: ParsedCron, field: CronFieldName): number[] {
	return cron.fields[field].values;
}

function iso(dates: Date[]): string[] {
	return dates.map((date) => date.toISOString());
}

function errorsOf(expression: string, seconds = false): ReturnType<typeof parseCron> {
	return parseCron(expression, { seconds });
}

describe('parseCron', () => {
	it('expands star, lists, ranges and steps', () => {
		const cron = parse('*/15 1,3 10-12 */4 1-5/2');
		expect(values(cron, 'minute')).toEqual([0, 15, 30, 45]);
		expect(values(cron, 'hour')).toEqual([1, 3]);
		expect(values(cron, 'dayOfMonth')).toEqual([10, 11, 12]);
		expect(values(cron, 'month')).toEqual([1, 5, 9]);
		expect(values(cron, 'dayOfWeek')).toEqual([1, 3, 5]);
	});

	it('supports stepped ranges and a start with a step', () => {
		expect(values(parse('10-30/5 * * * *'), 'minute')).toEqual([10, 15, 20, 25, 30]);
		expect(values(parse('50/5 * * * *'), 'minute')).toEqual([50, 55]);
	});

	it('accepts month and weekday names in any case', () => {
		const cron = parse('0 0 * jan,Mar-MAY mon-Fri');
		expect(values(cron, 'month')).toEqual([1, 3, 4, 5]);
		expect(values(cron, 'dayOfWeek')).toEqual([1, 2, 3, 4, 5]);
		expect(values(parse('0 0 * * SUN,sat'), 'dayOfWeek')).toEqual([0, 6]);
	});

	it('treats 0 and 7 as Sunday', () => {
		expect(values(parse('0 0 * * 7'), 'dayOfWeek')).toEqual([0]);
		expect(values(parse('0 0 * * 0,7'), 'dayOfWeek')).toEqual([0]);
		expect(values(parse('0 0 * * 5-7'), 'dayOfWeek')).toEqual([0, 5, 6]);
	});

	it('expands macros', () => {
		expect(parse('@daily').macro).toBe('0 0 * * *');
		expect(values(parse('@hourly'), 'minute')).toEqual([0]);
		expect(values(parse('@hourly'), 'hour')).toHaveLength(24);
		expect(parse('@YEARLY').macro).toBe('0 0 1 1 *');
		expect(parse('@annually').macro).toBe('0 0 1 1 *');
		expect(parse('@monthly').macro).toBe('0 0 1 * *');
		expect(parse('@weekly').macro).toBe('0 0 * * 0');
		expect(parse('@midnight').macro).toBe('0 0 * * *');
		const withSeconds = parse('@daily', true);
		expect(values(withSeconds, 'second')).toEqual([0]);
		expect(values(withSeconds, 'hour')).toEqual([0]);
	});

	it('parses the optional seconds field', () => {
		const cron = parse('*/20 0 12 * * *', true);
		expect(values(cron, 'second')).toEqual([0, 20, 40]);
		expect(cron.order[0]).toBe('second');
		expect(values(parse('0 12 * * *'), 'second')).toEqual([0]);
	});

	it('reports per-field errors with token and allowed range', () => {
		const result = errorsOf('61 24 0 13 8');
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.errors).toEqual([
				{ reason: 'range', field: 'minute', token: '61', min: 0, max: 59 },
				{ reason: 'range', field: 'hour', token: '24', min: 0, max: 23 },
				{ reason: 'range', field: 'dayOfMonth', token: '0', min: 1, max: 31 },
				{ reason: 'range', field: 'month', token: '13', min: 1, max: 12 },
				{ reason: 'range', field: 'dayOfWeek', token: '8', min: 0, max: 7 }
			]);
		}
	});

	it('classifies syntax, order, step and macro errors', () => {
		const reason = (expression: string): string | undefined => {
			const result = errorsOf(expression);
			return result.ok ? undefined : result.errors[0]?.reason;
		};
		expect(reason('abc * * * *')).toBe('syntax');
		expect(reason('1,,2 * * * *')).toBe('syntax');
		expect(reason('1-2-3 * * * *')).toBe('syntax');
		expect(reason('30-10 * * * *')).toBe('order');
		expect(reason('*/0 * * * *')).toBe('step');
		expect(reason('*/x * * * *')).toBe('step');
		expect(reason('* * * foo *')).toBe('syntax');
		expect(reason('@reboot')).toBe('macro');
		expect(reason('   ')).toBe('empty');
	});

	it('reports a field count mismatch with the numbers', () => {
		const five = errorsOf('* * * *');
		expect(five.ok).toBe(false);
		if (!five.ok) {
			expect(five.errors[0]).toMatchObject({ reason: 'fieldCount', expected: 5, found: 4 });
		}
		const six = errorsOf('0 * * * * *');
		expect(six.ok).toBe(false);
		if (!six.ok) {
			expect(six.errors[0]).toMatchObject({ reason: 'fieldCount', expected: 5, found: 6 });
		}
		expect(errorsOf('* * * * *', true).ok).toBe(false);
	});
});

describe('nextRuns', () => {
	const from = new Date('2024-01-15T10:07:30Z'); // a Monday

	it('lists upcoming steps in UTC', () => {
		expect(iso(nextRuns(parse('*/15 * * * *'), from, 4))).toEqual([
			'2024-01-15T10:15:00.000Z',
			'2024-01-15T10:30:00.000Z',
			'2024-01-15T10:45:00.000Z',
			'2024-01-15T11:00:00.000Z'
		]);
	});

	it('defaults to 10 results and excludes the starting instant', () => {
		expect(nextRuns(parse('* * * * *'), from)).toHaveLength(10);
		const exact = new Date('2024-01-15T10:15:00Z');
		expect(nextRuns(parse('*/15 * * * *'), exact, 1)[0]?.toISOString()).toBe('2024-01-15T10:30:00.000Z');
	});

	it('handles seconds', () => {
		const start = new Date('2024-01-15T12:00:00Z');
		expect(iso(nextRuns(parse('*/20 * * * * *', true), start, 3))).toEqual([
			'2024-01-15T12:00:20.000Z',
			'2024-01-15T12:00:40.000Z',
			'2024-01-15T12:01:00.000Z'
		]);
	});

	it('matches weekdays only', () => {
		const friday = new Date('2024-01-12T10:00:00Z');
		expect(iso(nextRuns(parse('0 9 * * 1-5'), friday, 3))).toEqual([
			'2024-01-15T09:00:00.000Z',
			'2024-01-16T09:00:00.000Z',
			'2024-01-17T09:00:00.000Z'
		]);
		expect(iso(nextRuns(parse('0 0 * * 7'), from, 2))).toEqual([
			'2024-01-21T00:00:00.000Z',
			'2024-01-28T00:00:00.000Z'
		]);
	});

	it('uses OR when both day fields are restricted', () => {
		const start = new Date('2024-01-01T00:00:00Z');
		expect(iso(nextRuns(parse('0 0 13 * 5'), start, 5))).toEqual([
			'2024-01-05T00:00:00.000Z',
			'2024-01-12T00:00:00.000Z',
			'2024-01-13T00:00:00.000Z',
			'2024-01-19T00:00:00.000Z',
			'2024-01-26T00:00:00.000Z'
		]);
	});

	it('uses AND when one day field is a star', () => {
		const start = new Date('2024-01-01T00:00:00Z');
		expect(iso(nextRuns(parse('0 0 13 * *'), start, 2))).toEqual([
			'2024-01-13T00:00:00.000Z',
			'2024-02-13T00:00:00.000Z'
		]);
		expect(iso(nextRuns(parse('0 0 */2 * 5'), start, 2))).toEqual([
			'2024-01-05T00:00:00.000Z',
			'2024-01-19T00:00:00.000Z'
		]);
	});

	it('finds the leap day and gives up after about five years', () => {
		const result = nextRuns(parse('0 0 29 2 *'), new Date('2023-03-01T00:00:00Z'), 5);
		expect(iso(result)).toEqual(['2024-02-29T00:00:00.000Z', '2028-02-29T00:00:00.000Z']);
	});

	it('returns nothing for dates that never exist', () => {
		expect(nextRuns(parse('0 0 31 2 *'), from, 3)).toEqual([]);
	});

	it('skips months without the day', () => {
		const start = new Date('2024-01-01T00:00:00Z');
		expect(iso(nextRuns(parse('0 0 31 * *'), start, 5))).toEqual([
			'2024-01-31T00:00:00.000Z',
			'2024-03-31T00:00:00.000Z',
			'2024-05-31T00:00:00.000Z',
			'2024-07-31T00:00:00.000Z',
			'2024-08-31T00:00:00.000Z'
		]);
		expect(iso(nextRuns(parse('0 0 30 * *'), start, 2))).toEqual([
			'2024-01-30T00:00:00.000Z',
			'2024-03-30T00:00:00.000Z'
		]);
	});

	it('crosses year boundaries and handles macros', () => {
		expect(iso(nextRuns(parse('@yearly'), new Date('2024-06-01T00:00:00Z'), 2))).toEqual([
			'2025-01-01T00:00:00.000Z',
			'2026-01-01T00:00:00.000Z'
		]);
	});

	it('evaluates in a time zone', () => {
		const zone = 'America/New_York';
		const start = new Date('2024-03-09T00:00:00Z');
		expect(iso(nextRuns(parse('0 12 * * *'), start, 3, zone))).toEqual([
			'2024-03-09T17:00:00.000Z',
			'2024-03-10T16:00:00.000Z',
			'2024-03-11T16:00:00.000Z'
		]);
	});

	it('skips wall times removed by the spring-forward jump', () => {
		const start = new Date('2024-03-09T00:00:00Z');
		expect(iso(nextRuns(parse('30 2 * * *'), start, 3, 'America/New_York'))).toEqual([
			'2024-03-09T07:30:00.000Z',
			'2024-03-11T06:30:00.000Z',
			'2024-03-12T06:30:00.000Z'
		]);
	});

	it('runs a repeated fall-back wall time once', () => {
		const start = new Date('2024-11-02T00:00:00Z');
		expect(iso(nextRuns(parse('30 1 * * *'), start, 3, 'America/New_York'))).toEqual([
			'2024-11-02T05:30:00.000Z',
			'2024-11-03T05:30:00.000Z',
			'2024-11-04T06:30:00.000Z'
		]);
	});

	it('returns nothing for an invalid zone', () => {
		expect(nextRuns(parse('* * * * *'), from, 3, 'Not/AZone')).toEqual([]);
	});
});

describe('explanations', () => {
	const tr: Translate = (key, params) => (params === undefined ? key : `${key}${JSON.stringify(params)}`);

	it('builds a per-field breakdown', () => {
		const rows = breakdown(parse('*/5 9-17 * * MON'), tr, 'en');
		expect(rows.map((row) => row.field)).toEqual(['minute', 'hour', 'dayOfMonth', 'month', 'dayOfWeek']);
		expect(rows[0]?.meaning).toContain('cron.mean.step');
		expect(rows[1]?.meaning).toContain('"a":"9"');
		expect(rows[4]?.meaning).toContain('Monday');
	});

	it('summarises common patterns', () => {
		expect(summarize(parse('* * * * *'), tr, 'en')).toBe('Cron.sum.everyMinute.');
		expect(summarize(parse('*/5 * * * *'), tr, 'en')).toContain('everyNMinutes{"n":5}');
		expect(summarize(parse('30 9 * * *'), tr, 'en')).toContain('atTimes{"times":"09:30"}');
		expect(summarize(parse('30 9 * * *'), tr, 'en')).toContain('everyDay');
		expect(summarize(parse('0 9 * * 1-5'), tr, 'en')).toContain('cron.sum.weekdays');
		expect(summarize(parse('0 0 1 * *'), tr, 'en')).toContain('onDom{"days":"1"}');
		expect(summarize(parse('0 0 * 3 *'), tr, 'en')).toContain('"months":"March"');
		expect(summarize(parse('0 0 13 * 5'), tr, 'en')).toContain('cron.sum.either');
		expect(summarize(parse('*/20 * * * * *', true), tr, 'en')).toContain('everyNSeconds{"n":20}');
	});

	it('uses the real locale for names and lists', () => {
		const real: Translate = (key, params) => `${key}:${Object.values(params ?? {}).join('|')}`;
		expect(summarize(parse('0 8,20 * * *'), real, 'en')).toContain('08:00 and 20:00');
		expect(summarize(parse('0 0 * jun *'), real, 'pt-BR')).toContain('junho');
	});

	it('falls back when the pattern is too complex', () => {
		expect(summarize(parse('*/7 */5 * * *'), tr, 'en')).toBeUndefined();
		expect(summarize(parse('0 0 */2 * *'), tr, 'en')).toBeUndefined();
		expect(summarize(parse('5 * * * * *', true), tr, 'en')).toBeUndefined();
	});
});
