import { describe, expect, it } from 'vitest';
import { runRegex } from './regex';

describe('regex', () => {
	it('finds matches with groups and named groups', () => {
		const result = runRegex({
			pattern: '(?<key>\\w+)=(\\d+)',
			flags: 'g',
			text: 'a=1 b=22'
		});
		expect(result).toMatchObject({ ok: true, truncated: false });
		if (result.ok) {
			expect(result.matches).toHaveLength(2);
			expect(result.matches[1]).toEqual({
				index: 4,
				text: 'b=22',
				groups: ['b', '22'],
				named: { key: 'b' }
			});
		}
	});

	it('always scans all matches, even without the g flag', () => {
		const result = runRegex({ pattern: 'a', flags: 'i', text: 'aAa' });
		expect(result.ok && result.matches.length).toBe(3);
	});

	it('handles empty matches without looping forever', () => {
		const result = runRegex({ pattern: 'x*', flags: '', text: 'ab' });
		expect(result.ok && result.matches.length).toBe(3);
	});

	it('reports invalid patterns', () => {
		expect(runRegex({ pattern: '(', flags: '', text: '' })).toMatchObject({
			ok: false,
			reason: 'invalid'
		});
	});
});
