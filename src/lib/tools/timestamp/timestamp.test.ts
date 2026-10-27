import { describe, expect, it } from 'vitest';
import { formatInZone, parseMoment, relativeTime } from './timestamp';

describe('timestamp', () => {
	it('detects seconds and milliseconds', () => {
		expect(parseMoment('1700000000')?.interpretedAs).toBe('seconds');
		expect(parseMoment('1700000000000')?.interpretedAs).toBe('milliseconds');
		expect(parseMoment('1700000000')?.date.toISOString()).toBe('2023-11-14T22:13:20.000Z');
	});

	it('parses ISO text', () => {
		expect(parseMoment('2024-02-29T12:00:00Z')?.date.getTime()).toBe(Date.UTC(2024, 1, 29, 12));
	});

	it('rejects garbage and empty input', () => {
		expect(parseMoment('not a date')).toBeUndefined();
		expect(parseMoment('  ')).toBeUndefined();
	});

	it('formats in a zone', () => {
		const text = formatInZone(new Date(Date.UTC(2024, 0, 1, 3, 0)), 'America/Sao_Paulo', 'en-US');
		expect(text).toContain('January 1, 2024 at 12:00:00 AM');
	});

	it('describes relative time', () => {
		const now = new Date('2024-01-01T00:00:00Z');
		expect(relativeTime(new Date('2024-01-01T03:00:00Z'), now, 'en')).toBe('in 3 hours');
	});
});
