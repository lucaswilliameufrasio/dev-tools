import { describe, expect, it } from 'vitest';
import {
	UF_LIST,
	cnpjCheckDigits,
	cpfCheckDigits,
	generateCnpj,
	generateCpf,
	maskCnpj,
	maskCpf,
	randomInt,
	ufDigit,
	validateDocument,
	validateLines
} from './cpfcnpj';

/** Reference classic (numeric-only) CNPJ algorithm, written independently. */
function classicCnpj(twelve: string): string {
	const calc = (digits: number[]): number => {
		let weight = 2;
		let sum = 0;
		for (let i = digits.length - 1; i >= 0; i -= 1) {
			sum += (digits[i] ?? 0) * weight;
			weight = weight === 9 ? 2 : weight + 1;
		}
		const rest = sum % 11;
		return rest < 2 ? 0 : 11 - rest;
	};
	const digits = twelve.split('').map(Number);
	const d1 = calc(digits);
	const d2 = calc([...digits, d1]);
	return `${d1}${d2}`;
}

describe('cpf', () => {
	it('validates known vectors', () => {
		const result = validateDocument('529.982.247-25');
		expect(result.valid).toBe(true);
		expect(result.valid && result.masked).toBe('529.982.247-25');
		expect(validateDocument('52998224725').valid).toBe(true);
		expect(cpfCheckDigits('529982247')).toBe('25');
	});

	it('explains failures', () => {
		expect(validateDocument('529.982.247-26')).toMatchObject({ valid: false, reason: 'check-digit', kind: 'cpf' });
		expect(validateDocument('111.111.111-11')).toMatchObject({ valid: false, reason: 'equal-digits' });
		expect(validateDocument('1234')).toMatchObject({ valid: false, reason: 'length' });
		expect(validateDocument('   ')).toMatchObject({ valid: false, reason: 'empty' });
		expect(validateDocument('5299822472A')).toMatchObject({ valid: false, reason: 'chars', kind: 'cpf' });
	});

	it('generates valid CPFs, never all-equal, respecting the UF digit', () => {
		for (let i = 0; i < 500; i += 1) {
			const cpf = generateCpf();
			expect(cpf).toMatch(/^\d{11}$/);
			expect(validateDocument(cpf).valid).toBe(true);
			expect(validateDocument(maskCpf(cpf)).valid).toBe(true);
		}
		for (const uf of UF_LIST) {
			for (let i = 0; i < 20; i += 1) {
				const cpf = generateCpf(uf);
				expect(Number(cpf.charAt(8))).toBe(ufDigit(uf));
				expect(validateDocument(cpf).valid).toBe(true);
			}
		}
		expect(ufDigit('SP')).toBe(8);
		expect(ufDigit('RS')).toBe(0);
		expect(ufDigit('PR')).toBe(9);
	});
});

describe('cnpj', () => {
	it('validates known vectors', () => {
		expect(validateDocument('11.222.333/0001-81')).toMatchObject({ valid: true, kind: 'cnpj', masked: '11.222.333/0001-81' });
		expect(validateDocument('11222333000181').valid).toBe(true);
		expect(validateDocument('11.222.333/0001-82')).toMatchObject({ valid: false, reason: 'check-digit' });
		expect(validateDocument('00000000000000')).toMatchObject({ valid: false, reason: 'equal-digits' });
	});

	it('validates the alphanumeric vector 12.ABC.345/01DE-35', () => {
		// Values (charCode - 48): 1 2 17 18 19 3 4 5 0 1 20 21
		// Sum 1 = 5+8+51+36+171+24+28+30+0+4+60+42 = 459; 459 mod 11 = 8 -> d1 = 11-8 = 3
		// Sum 2 (with d1=3) = 6+10+68+54+38+27+32+35+0+5+80+63+6 = 424; 424 mod 11 = 6 -> d2 = 5
		expect(cnpjCheckDigits('12ABC34501DE')).toBe('35');
		expect(validateDocument('12.ABC.345/01DE-35')).toMatchObject({ valid: true, kind: 'cnpj', masked: '12.ABC.345/01DE-35' });
		expect(validateDocument('12.ABC.345/01DE-36')).toMatchObject({ valid: false, reason: 'check-digit' });
		expect(validateDocument('12abc34501de35').valid).toBe(true);
	});

	it('matches the classic algorithm for numeric CNPJs', () => {
		for (let i = 0; i < 500; i += 1) {
			let twelve = '';
			for (let j = 0; j < 12; j += 1) {
				twelve += String(randomInt(10));
			}
			expect(cnpjCheckDigits(twelve)).toBe(classicCnpj(twelve));
		}
	});

	it('generates valid numeric and alphanumeric CNPJs', () => {
		for (let i = 0; i < 300; i += 1) {
			const numeric = generateCnpj({ alphanumeric: false, branch: '1' });
			expect(numeric).toMatch(/^\d{8}0001\d{2}$/);
			expect(validateDocument(numeric).valid).toBe(true);
			const alpha = generateCnpj({ alphanumeric: true, branch: '0001' });
			expect(alpha).toMatch(/^[0-9A-Z]{8}0001\d{2}$/);
			expect(validateDocument(maskCnpj(alpha)).valid).toBe(true);
		}
		expect(generateCnpj({ alphanumeric: true, branch: 'ab' }).slice(8, 12)).toBe('00AB');
		expect(generateCnpj({ alphanumeric: false, branch: 'ab' }).slice(8, 12)).toBe('0000');
	});
});

describe('validateLines / randomInt', () => {
	it('validates many lines and skips blanks', () => {
		const rows = validateLines('529.982.247-25\n\n11.222.333/0001-81\r\nabc');
		expect(rows).toHaveLength(3);
		expect(rows.map((r) => r.result.valid)).toEqual([true, true, false]);
	});

	it('randomInt stays in range and rejects bad bounds', () => {
		for (let i = 0; i < 1000; i += 1) {
			const v = randomInt(7);
			expect(v).toBeGreaterThanOrEqual(0);
			expect(v).toBeLessThan(7);
		}
		expect(() => randomInt(0)).toThrow();
	});
});
