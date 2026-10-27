import { describe, expect, it } from 'vitest';
import { formatInBase, parseInBase } from './bases';

describe('bases', () => {
	it('parses with and without prefixes', () => {
		expect(parseInBase('0xFF', 16)).toEqual({ ok: true, value: 255n });
		expect(parseInBase('ff', 16)).toEqual({ ok: true, value: 255n });
		expect(parseInBase('1010_1010', 2)).toEqual({ ok: true, value: 170n });
		expect(parseInBase('-42', 10)).toEqual({ ok: true, value: -42n });
	});

	it('rejects digits outside the base', () => {
		expect(parseInBase('12', 2)).toEqual({ ok: false });
		expect(parseInBase('', 10)).toEqual({ ok: false });
	});

	it('handles values beyond 2^53', () => {
		const parsed = parseInBase('ffffffffffffffffffff', 16);
		expect(parsed.ok && formatInBase(parsed.value, 10)).toBe('1208925819614629174706175');
	});
});
