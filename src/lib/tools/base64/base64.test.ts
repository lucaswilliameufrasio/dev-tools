import { describe, expect, it } from 'vitest';
import { decodeText, decodeToBytes, encodeText } from './base64';

describe('base64', () => {
	it('encodes text with padding', () => {
		expect(encodeText('olá, mundo', 'standard', true)).toBe('b2zDoSwgbXVuZG8=');
	});

	it('encodes url-safe without padding', () => {
		expect(encodeText('???>>>', 'url', false)).toBe('Pz8_Pj4-');
		expect(encodeText('a', 'url', false)).toBe('YQ');
	});

	it('round-trips unicode', () => {
		const original = 'こんにちは 👋 café';
		const encoded = encodeText(original, 'standard', true);
		expect(decodeText(encoded)).toEqual({ ok: true, text: original });
	});

	it('decodes url-safe input without padding and with whitespace', () => {
		expect(decodeText(' Pz8_\nPj4- ')).toEqual({ ok: true, text: '???>>>' });
	});

	it('accepts data URIs', () => {
		expect(decodeText('data:text/plain;base64,YQ==')).toEqual({ ok: true, text: 'a' });
	});

	it('rejects invalid input', () => {
		expect(decodeToBytes('abc$')).toEqual({ ok: false, reason: 'invalid' });
		expect(decodeToBytes('a')).toEqual({ ok: false, reason: 'invalid' });
	});

	it('reports bytes that are not utf-8', () => {
		expect(decodeText('/w==')).toEqual({ ok: false, reason: 'not-utf8' });
	});
});
