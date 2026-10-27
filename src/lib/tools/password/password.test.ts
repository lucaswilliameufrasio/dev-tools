import { describe, expect, it } from 'vitest';
import { entropyBits, generatePassword, type PasswordOptions } from './password';

const base: PasswordOptions = {
	length: 24,
	lowercase: true,
	uppercase: true,
	digits: true,
	symbols: true,
	avoidAmbiguous: false
};

describe('password', () => {
	it('uses every selected class', () => {
		for (let run = 0; run < 50; run += 1) {
			const password = generatePassword({ ...base, length: 4 }) ?? '';
			expect(password).toHaveLength(4);
			expect(password).toMatch(/[a-z]/);
			expect(password).toMatch(/[A-Z]/);
			expect(password).toMatch(/[0-9]/);
			expect(password).toMatch(/[^a-zA-Z0-9]/);
		}
	});

	it('avoids ambiguous characters', () => {
		for (let run = 0; run < 50; run += 1) {
			expect(generatePassword({ ...base, avoidAmbiguous: true })).not.toMatch(/[O0oIl1|]/);
		}
	});

	it('returns nothing when no class is selected', () => {
		expect(
			generatePassword({ ...base, lowercase: false, uppercase: false, digits: false, symbols: false })
		).toBeUndefined();
	});

	it('estimates entropy', () => {
		expect(entropyBits({ ...base, uppercase: false, symbols: false, length: 10 })).toBe(
			Math.round(10 * Math.log2(36))
		);
	});
});
