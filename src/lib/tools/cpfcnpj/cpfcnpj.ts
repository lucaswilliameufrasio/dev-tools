export type Uf =
	| 'AC' | 'AL' | 'AM' | 'AP' | 'BA' | 'CE' | 'DF' | 'ES' | 'GO' | 'MA' | 'MG' | 'MS' | 'MT' | 'PA'
	| 'PB' | 'PE' | 'PI' | 'PR' | 'RJ' | 'RN' | 'RO' | 'RR' | 'RS' | 'SC' | 'SE' | 'SP' | 'TO';

export const UF_LIST: readonly Uf[] = [
	'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA',
	'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'
];

/** Ninth CPF digit per fiscal region of the issuing state. */
const UF_DIGIT: Record<Uf, number> = {
	RS: 0,
	DF: 1, GO: 1, MS: 1, MT: 1, TO: 1,
	AC: 2, AM: 2, AP: 2, PA: 2, RO: 2, RR: 2,
	CE: 3, MA: 3, PI: 3,
	AL: 4, PB: 4, PE: 4, RN: 4,
	BA: 5, SE: 5,
	MG: 6,
	ES: 7, RJ: 7,
	SP: 8,
	PR: 9, SC: 9
};

export function ufDigit(uf: Uf): number {
	return UF_DIGIT[uf];
}

const CNPJ_WEIGHTS_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const CNPJ_WEIGHTS_2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const ALNUM = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Uniform random integer in [0, max) using crypto with rejection sampling. */
export function randomInt(max: number): number {
	if (!Number.isInteger(max) || max < 1 || max > 0x100000000) {
		throw new RangeError('max must be an integer between 1 and 2^32');
	}
	const limit = 0x100000000 - (0x100000000 % max);
	const buffer = new Uint32Array(1);
	for (;;) {
		crypto.getRandomValues(buffer);
		const value = buffer[0] ?? 0;
		if (value < limit) {
			return value % max;
		}
	}
}

function randomChars(alphabet: string, length: number): string {
	let out = '';
	for (let i = 0; i < length; i += 1) {
		out += alphabet.charAt(randomInt(alphabet.length));
	}
	return out;
}

function checkDigit(values: readonly number[], weights: readonly number[]): number {
	let sum = 0;
	for (let i = 0; i < weights.length; i += 1) {
		sum += (values[i] ?? 0) * (weights[i] ?? 0);
	}
	const rest = sum % 11;
	return rest < 2 ? 0 : 11 - rest;
}

/** Official value of a CNPJ character: charCode - 48 (digits 0-9, letters 17-42). */
function charValue(char: string): number {
	return char.charCodeAt(0) - 48;
}

function allEqual(text: string): boolean {
	return text.length > 0 && text.split('').every((c) => c === text.charAt(0));
}

// ---------- CPF ----------

export function cpfCheckDigits(nine: string): string {
	const values = nine.split('').map(charValue);
	const d1 = checkDigit(values, [10, 9, 8, 7, 6, 5, 4, 3, 2]);
	const d2 = checkDigit([...values, d1], [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
	return `${d1}${d2}`;
}

export function generateCpf(uf?: Uf): string {
	for (;;) {
		let base = randomChars('0123456789', 8);
		base += uf === undefined ? randomChars('0123456789', 1) : String(UF_DIGIT[uf]);
		if (!allEqual(base)) {
			return base + cpfCheckDigits(base);
		}
	}
}

export function maskCpf(digits: string): string {
	return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

// ---------- CNPJ ----------

export function cnpjCheckDigits(twelve: string): string {
	const values = twelve.toUpperCase().split('').map(charValue);
	const d1 = checkDigit(values, CNPJ_WEIGHTS_1);
	const d2 = checkDigit([...values, d1], CNPJ_WEIGHTS_2);
	return `${d1}${d2}`;
}

export function sanitizeBranch(branch: string, alphanumeric: boolean): string {
	const pattern = alphanumeric ? /[^0-9A-Za-z]/g : /[^0-9]/g;
	const cleaned = branch.replace(pattern, '').toUpperCase().slice(0, 4);
	return cleaned.padStart(4, '0');
}

export function generateCnpj(options: { alphanumeric: boolean; branch: string }): string {
	const branch = sanitizeBranch(options.branch, options.alphanumeric);
	const alphabet = options.alphanumeric ? ALNUM : '0123456789';
	const root = randomChars(alphabet, 8);
	const base = root + branch;
	return base + cnpjCheckDigits(base);
}

export function maskCnpj(value: string): string {
	return `${value.slice(0, 2)}.${value.slice(2, 5)}.${value.slice(5, 8)}/${value.slice(8, 12)}-${value.slice(12, 14)}`;
}

// ---------- Validation ----------

export type DocumentKind = 'cpf' | 'cnpj';

export type ValidateReason = 'empty' | 'length' | 'chars' | 'equal-digits' | 'check-digit';

export type ValidationResult =
	| { valid: true; kind: DocumentKind; plain: string; masked: string }
	| { valid: false; kind: DocumentKind | undefined; reason: ValidateReason; plain: string };

export function validateDocument(input: string): ValidationResult {
	const plain = input.replace(/[\s.\-/]/g, '').toUpperCase();
	if (plain.length === 0) {
		return { valid: false, kind: undefined, reason: 'empty', plain };
	}
	if (plain.length !== 11 && plain.length !== 14) {
		return { valid: false, kind: undefined, reason: 'length', plain };
	}
	if (plain.length === 11) {
		if (!/^[0-9]{11}$/.test(plain)) {
			return { valid: false, kind: 'cpf', reason: 'chars', plain };
		}
		if (allEqual(plain)) {
			return { valid: false, kind: 'cpf', reason: 'equal-digits', plain };
		}
		if (cpfCheckDigits(plain.slice(0, 9)) !== plain.slice(9)) {
			return { valid: false, kind: 'cpf', reason: 'check-digit', plain };
		}
		return { valid: true, kind: 'cpf', plain, masked: maskCpf(plain) };
	}
	if (!/^[0-9A-Z]{12}[0-9]{2}$/.test(plain)) {
		return { valid: false, kind: 'cnpj', reason: 'chars', plain };
	}
	if (allEqual(plain)) {
		return { valid: false, kind: 'cnpj', reason: 'equal-digits', plain };
	}
	if (cnpjCheckDigits(plain.slice(0, 12)) !== plain.slice(12)) {
		return { valid: false, kind: 'cnpj', reason: 'check-digit', plain };
	}
	return { valid: true, kind: 'cnpj', plain, masked: maskCnpj(plain) };
}

export function validateLines(text: string): { line: string; result: ValidationResult }[] {
	const out: { line: string; result: ValidationResult }[] = [];
	for (const line of text.split(/\r?\n/)) {
		if (line.trim().length > 0) {
			out.push({ line: line.trim(), result: validateDocument(line) });
		}
	}
	return out;
}
