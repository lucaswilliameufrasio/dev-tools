import { describe, expect, it } from 'vitest';
import { decodeUrl, encodeUrl, parseQuery } from './url';

describe('url', () => {
	it('encodes components and full urls differently', () => {
		expect(encodeUrl('a b&c=d/é', 'component')).toBe('a%20b%26c%3Dd%2F%C3%A9');
		expect(encodeUrl('https://x.dev/a b?q=é', 'full')).toBe('https://x.dev/a%20b?q=%C3%A9');
	});

	it('decodes and reports malformed sequences', () => {
		expect(decodeUrl('a%20b', 'component')).toEqual({ ok: true, output: 'a b' });
		expect(decodeUrl('%E0%A4%A', 'component')).toEqual({ ok: false });
	});

	it('parses query strings', () => {
		expect(parseQuery('https://x.dev/p?a=1&b=dois%20tr%C3%AAs#frag')).toEqual([
			{ key: 'a', value: '1' },
			{ key: 'b', value: 'dois três' }
		]);
	});
});
