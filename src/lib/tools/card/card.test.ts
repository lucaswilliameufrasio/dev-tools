import { describe, expect, it } from 'vitest';
import {
	BRANDS,
	GATEWAY_TEST_NUMBERS,
	cvvLength,
	detectBrand,
	formatCardNumber,
	generateCard,
	generateCardNumber,
	generateExpiry,
	luhnCheckDigit,
	luhnValid,
	maskCardNumber,
	randomInt,
	validateCard
} from './card';

describe('luhn', () => {
	it('accepts known vectors and rejects altered ones', () => {
		for (const ok of ['4242424242424242', '5555555555554444', '378282246310005', '79927398713']) {
			expect(luhnValid(ok)).toBe(true);
		}
		expect(luhnValid('4242424242424241')).toBe(false);
		expect(luhnValid('79927398710')).toBe(false);
		expect(luhnValid('')).toBe(false);
		expect(luhnValid('42a2')).toBe(false);
		expect(luhnCheckDigit('7992739871')).toBe('3');
	});
});

describe('detectBrand', () => {
	it('identifies brands, preferring Elo/Hipercard on overlapping BINs', () => {
		expect(detectBrand('4242424242424242')).toBe('visa');
		expect(detectBrand('5555555555554444')).toBe('mastercard');
		expect(detectBrand('2221000000000009')).toBe('mastercard');
		expect(detectBrand('378282246310005')).toBe('amex');
		expect(detectBrand('4011780000000000')).toBe('elo');
		expect(detectBrand('5067000000000000')).toBe('elo');
		expect(detectBrand('6062820000000000')).toBe('hipercard');
		expect(detectBrand('3841000000000000')).toBe('hipercard');
		expect(detectBrand('36227206271667')).toBe('diners');
		expect(detectBrand('6011111111111117')).toBe('discover');
		expect(detectBrand('3566002020360505')).toBe('jcb');
		expect(detectBrand('9999999999999999')).toBeUndefined();
	});
});

describe('generateCardNumber', () => {
	it('is Luhn-valid, correct length and detects as the requested brand', () => {
		const lengths = { visa: 16, mastercard: 16, amex: 15, elo: 16, hipercard: 16, diners: 14, discover: 16, jcb: 16 };
		for (const brand of BRANDS) {
			for (let i = 0; i < 200; i += 1) {
				const number = generateCardNumber(brand);
				expect(number).toHaveLength(lengths[brand]);
				expect(luhnValid(number)).toBe(true);
				expect(detectBrand(number)).toBe(brand);
				expect(validateCard(number)).toMatchObject({ ok: true, brand, luhn: true, lengthOk: true });
			}
		}
	});

	it('generates complete cards with future expiry and the right CVV length', () => {
		const now = new Date(2026, 11, 15);
		for (let i = 0; i < 300; i += 1) {
			const card = generateCard('amex', now);
			expect(card.cvv).toMatch(/^\d{4}$/);
			expect(card.holder).toMatch(/^[A-Z]+ [A-Z]+$/);
			const [mm, yy] = card.expiry.split('/').map(Number);
			expect(mm).toBeGreaterThanOrEqual(1);
			expect(mm).toBeLessThanOrEqual(12);
			const expiryIndex = (2000 + (yy ?? 0)) * 12 + ((mm ?? 1) - 1);
			expect(expiryIndex).toBeGreaterThan(2026 * 12 + 11);
			expect(generateExpiry(now)).toMatch(/^\d{2}\/\d{2}$/);
		}
		expect(cvvLength('visa')).toBe(3);
		expect(generateCard('visa', now).cvv).toMatch(/^\d{3}$/);
	});
});

describe('validateCard', () => {
	it('reports luhn, brand and length problems', () => {
		expect(validateCard('4242 4242 4242 4242')).toMatchObject({ ok: true, brand: 'visa', luhn: true, lengthOk: true });
		expect(validateCard('4242-4242-4242-4241')).toMatchObject({ ok: true, luhn: false });
		expect(validateCard('3782 822463 10005')).toMatchObject({ ok: true, brand: 'amex', luhn: true });
		expect(validateCard('37828224631000')).toMatchObject({ ok: true, brand: 'amex', lengthOk: false });
		expect(validateCard('')).toEqual({ ok: false, reason: 'empty' });
		expect(validateCard('42x')).toEqual({ ok: false, reason: 'chars' });
		expect(validateCard('4242')).toEqual({ ok: false, reason: 'short' });
	});
});

describe('formatting and reference data', () => {
	it('formats and masks', () => {
		expect(formatCardNumber('4242424242424242', 'visa')).toBe('4242 4242 4242 4242');
		expect(formatCardNumber('378282246310005', 'amex')).toBe('3782 822463 10005');
		expect(maskCardNumber('4242424242424242')).toBe('424242******4242');
	});

	it('gateway numbers are all Luhn-valid and match their brand', () => {
		for (const item of GATEWAY_TEST_NUMBERS) {
			expect(luhnValid(item.number)).toBe(true);
			expect(detectBrand(item.number)).toBe(item.brand);
		}
	});

	it('randomInt rejects bad bounds', () => {
		expect(() => randomInt(-1)).toThrow();
	});
});
