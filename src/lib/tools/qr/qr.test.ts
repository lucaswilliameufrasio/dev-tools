import { describe, expect, it } from 'vitest';
import {
	buildVcard,
	buildWifi,
	contrastRatio,
	escapeWifi,
	isInverted,
	looksLikeUrl,
	normalizeOptions,
	parseHexColor
} from './qr';

describe('qr helpers', () => {
	it('escapes wifi special characters', () => {
		expect(escapeWifi('a;b,c:d"e\\f')).toBe('a\\;b\\,c\\:d\\"e\\\\f');
	});

	it('builds wifi strings', () => {
		expect(buildWifi('Casa', 'segredo', 'WPA', false)).toBe('WIFI:T:WPA;S:Casa;P:segredo;;');
		expect(buildWifi('A;B', 'p:w', 'WPA', true)).toBe('WIFI:T:WPA;S:A\\;B;P:p\\:w;H:true;;');
		expect(buildWifi('Open', 'ignored', 'nopass', false)).toBe('WIFI:T:nopass;S:Open;;');
	});

	it('builds a minimal vcard and escapes fields', () => {
		expect(buildVcard('Ana; Silva', '+5511', '', '')).toBe(
			'BEGIN:VCARD\nVERSION:3.0\nFN:Ana\\; Silva\nTEL:+5511\nEND:VCARD'
		);
	});

	it('clamps options', () => {
		const result = normalizeOptions({ level: 'M', size: 5000, margin: -2, dark: '#000', light: '#fff' });
		expect(result.size).toBe(1024);
		expect(result.margin).toBe(0);
		expect(normalizeOptions({ level: 'M', size: NaN, margin: 3.6, dark: '', light: '' }).size).toBe(128);
	});

	it('parses hex colours', () => {
		expect(parseHexColor('#fff')).toEqual({ ok: true, r: 255, g: 255, b: 255 });
		expect(parseHexColor('#102030')).toEqual({ ok: true, r: 16, g: 32, b: 48 });
		expect(parseHexColor('red')).toEqual({ ok: false });
	});

	it('computes contrast ratio', () => {
		expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
		expect(contrastRatio('#777777', '#888888') ?? 0).toBeLessThan(3);
		expect(contrastRatio('x', '#fff')).toBeUndefined();
	});

	it('detects inverted colours', () => {
		expect(isInverted('#ffffff', '#000000')).toBe(true);
		expect(isInverted('#000000', '#ffffff')).toBe(false);
	});

	it('detects urls', () => {
		expect(looksLikeUrl('https://example.com/a?b=1')).toBe(true);
		expect(looksLikeUrl('javascript:alert(1)')).toBe(false);
		expect(looksLikeUrl('olá mundo https://x.com')).toBe(false);
		expect(looksLikeUrl('texto')).toBe(false);
	});
});
