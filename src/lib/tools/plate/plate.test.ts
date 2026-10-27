import { describe, expect, it } from 'vitest';
import { generatePlate, mercosulToOld, oldToMercosul, randomInt, validatePlate } from './plate';

describe('validatePlate', () => {
	it('detects formats, case-insensitive, optional hyphen', () => {
		expect(validatePlate('ABC-1234')).toMatchObject({ valid: true, format: 'old', display: 'ABC-1234' });
		expect(validatePlate('abc1234')).toMatchObject({ valid: true, format: 'old', plain: 'ABC1234' });
		expect(validatePlate('abc1d23')).toMatchObject({ valid: true, format: 'mercosul', display: 'ABC1D23' });
	});

	it('rejects malformed input', () => {
		expect(validatePlate('')).toEqual({ valid: false, reason: 'empty' });
		for (const bad of ['AB-12345', 'ABC-1D23', 'ABCD123', 'ABC12D3', '1BC1234', 'ABC 1234', 'ABC1D2']) {
			expect(validatePlate(bad)).toEqual({ valid: false, reason: 'invalid' });
		}
	});
});

describe('generatePlate', () => {
	it('always produces valid plates of the requested format', () => {
		for (let i = 0; i < 500; i += 1) {
			expect(validatePlate(generatePlate('old', true))).toMatchObject({ valid: true, format: 'old' });
			const plain = generatePlate('old', false);
			expect(plain).toMatch(/^[A-Z]{3}\d{4}$/);
			expect(validatePlate(plain)).toMatchObject({ valid: true, format: 'old' });
			expect(validatePlate(generatePlate('mercosul', true))).toMatchObject({ valid: true, format: 'mercosul' });
		}
	});

	it('randomInt rejects bad bounds', () => {
		expect(() => randomInt(0)).toThrow();
		expect(randomInt(1)).toBe(0);
	});
});

describe('conversion', () => {
	it('maps the fifth character digit to a letter and back', () => {
		expect(oldToMercosul('ABC-1234')).toMatchObject({ ok: true, plate: 'ABC1C34' });
		expect(oldToMercosul('XYZ0000')).toMatchObject({ ok: true, plate: 'XYZ0A00' });
		expect(oldToMercosul('XYZ9999')).toMatchObject({ ok: true, plate: 'XYZ9J99' });
		expect(mercosulToOld('ABC1C34')).toMatchObject({ ok: true, plate: 'ABC-1234' });
		expect(mercosulToOld('ABC1K34')).toEqual({ ok: false, reason: 'invalid' });
		expect(oldToMercosul('ABC1C34')).toEqual({ ok: false, reason: 'invalid' });
		expect(mercosulToOld('ABC-1234')).toEqual({ ok: false, reason: 'invalid' });
		expect(oldToMercosul('')).toEqual({ ok: false, reason: 'empty' });
	});

	it('round-trips every digit', () => {
		for (let d = 0; d <= 9; d += 1) {
			const old = `QWE-${d}${d}${d}${d}`;
			const merc = oldToMercosul(old);
			expect(merc.ok).toBe(true);
			if (merc.ok) {
				expect(mercosulToOld(merc.plate)).toMatchObject({ ok: true, plate: old });
			}
		}
	});
});
