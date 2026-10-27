import { describe, expect, it } from 'vitest';
import { CATEGORIES, fullName, searchStatuses, STATUSES } from './statuses';

const REQUIRED = [
	100, 101, 102, 103, 200, 201, 202, 203, 204, 205, 206, 207, 208, 226, 300, 301, 302, 303, 304, 305,
	307, 308, 400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 417,
	418, 421, 422, 423, 424, 425, 426, 428, 429, 431, 451, 500, 501, 502, 503, 504, 505, 506, 507, 508,
	510, 511
];

describe('data integrity', () => {
	it('has unique codes', () => {
		const codes = STATUSES.map((entry) => entry.code);
		expect(new Set(codes).size).toBe(codes.length);
	});

	it('covers every required code and the non-standard ones', () => {
		const codes = new Set(STATUSES.map((entry) => entry.code));
		for (const code of [...REQUIRED, 499, 520, 521, 522, 523, 524]) {
			expect(codes.has(code)).toBe(true);
		}
	});

	it('marks only 499 and 520-524 as non-standard', () => {
		const flagged = STATUSES.filter((entry) => entry.nonStandard).map((entry) => entry.code);
		expect(flagged).toEqual([499, 520, 521, 522, 523, 524]);
	});

	it('has complete text in both languages', () => {
		for (const entry of STATUSES) {
			expect(entry.name.trim()).not.toBe('');
			expect(entry.rfc.trim()).not.toBe('');
			for (const text of [
				entry.description.pt,
				entry.description.en,
				entry.whenToUse.pt,
				entry.whenToUse.en
			]) {
				expect(text.trim().length).toBeGreaterThan(5);
			}
		}
	});

	it('category matches the first digit and list is sorted', () => {
		for (const entry of STATUSES) {
			expect(entry.category).toBe(Math.floor(entry.code / 100));
		}
		const codes = STATUSES.map((entry) => entry.code);
		expect(codes).toEqual([...codes].sort((a, b) => a - b));
	});
});

describe('searchStatuses', () => {
	it('returns everything for an empty query', () => {
		expect(searchStatuses(STATUSES, '', 'en')).toHaveLength(STATUSES.length);
	});

	it('jumps to an exact code, ignoring category filter', () => {
		const result = searchStatuses(STATUSES, '404', 'en', [2]);
		expect(result[0].code).toBe(404);
		expect(fullName(result[0])).toBe('404 Not Found');
	});

	it('matches code prefixes', () => {
		const result = searchStatuses(STATUSES, '40', 'en');
		expect(result.length).toBeGreaterThan(5);
		expect(result.every((entry) => String(entry.code).startsWith('40'))).toBe(true);
	});

	it('matches names and descriptions in the current locale, ignoring accents and case', () => {
		expect(searchStatuses(STATUSES, 'teapot', 'en').map((entry) => entry.code)).toContain(418);
		expect(searchStatuses(STATUSES, 'NOT FOUND', 'en').map((entry) => entry.code)).toContain(404);
		expect(searchStatuses(STATUSES, 'redirecionamento', 'pt').map((entry) => entry.code)).toContain(302);
		expect(searchStatuses(STATUSES, 'redirecionamento', 'en')).toHaveLength(0);
		expect(searchStatuses(STATUSES, 'sintaxe', 'pt').map((entry) => entry.code)).toContain(400);
		expect(searchStatuses(STATUSES, 'sintáxe', 'pt').map((entry) => entry.code)).toContain(400);
	});

	it('filters by category', () => {
		const result = searchStatuses(STATUSES, '', 'en', [5]);
		expect(result.every((entry) => entry.category === 5)).toBe(true);
		expect(searchStatuses(STATUSES, '', 'en', [])).toHaveLength(0);
		expect(CATEGORIES).toHaveLength(5);
	});

	it('returns nothing for unknown text', () => {
		expect(searchStatuses(STATUSES, 'zzzzqq', 'en')).toHaveLength(0);
	});
});
