import { describe, expect, it } from 'vitest';
import { contrastRatio, hslToRgb, parseColor, rgbToHex, rgbToHsl } from './color';

describe('color', () => {
	it('parses hex, rgb and hsl', () => {
		expect(parseColor('#fa0')).toEqual({ r: 255, g: 170, b: 0 });
		expect(parseColor('rgb(10, 20, 30)')).toEqual({ r: 10, g: 20, b: 30 });
		expect(parseColor('hsl(120, 100%, 50%)')).toEqual({ r: 0, g: 255, b: 0 });
		expect(parseColor('nope')).toBeUndefined();
	});

	it('converts between models', () => {
		expect(rgbToHex({ r: 43, g: 89, b: 255 })).toBe('#2b59ff');
		expect(rgbToHsl({ r: 255, g: 0, b: 0 })).toEqual({ h: 0, s: 100, l: 50 });
		expect(hslToRgb({ h: 240, s: 100, l: 50 })).toEqual({ r: 0, g: 0, b: 255 });
	});

	it('computes WCAG contrast', () => {
		const ratio = contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 });
		expect(ratio).toBeCloseTo(21, 5);
	});
});
