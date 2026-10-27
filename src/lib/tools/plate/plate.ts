export type PlateFormat = 'old' | 'mercosul';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';

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

function pick(alphabet: string, length: number): string {
	let out = '';
	for (let i = 0; i < length; i += 1) {
		out += alphabet.charAt(randomInt(alphabet.length));
	}
	return out;
}

export function generatePlate(format: PlateFormat, hyphen: boolean): string {
	if (format === 'old') {
		const letters = pick(LETTERS, 3);
		const digits = pick(DIGITS, 4);
		return hyphen ? `${letters}-${digits}` : letters + digits;
	}
	return pick(LETTERS, 3) + pick(DIGITS, 1) + pick(LETTERS, 1) + pick(DIGITS, 2);
}

const OLD_PATTERN = /^[A-Z]{3}[0-9]{4}$/;
const MERCOSUL_PATTERN = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;

export type PlateValidation =
	| { valid: true; format: PlateFormat; plain: string; display: string }
	| { valid: false; reason: 'empty' | 'invalid' };

export function validatePlate(input: string): PlateValidation {
	const trimmed = input.trim().toUpperCase();
	if (trimmed.length === 0) {
		return { valid: false, reason: 'empty' };
	}
	const plain = /^[A-Z]{3}-[0-9]{4}$/.test(trimmed) ? trimmed.replace('-', '') : trimmed;
	if (OLD_PATTERN.test(plain)) {
		return { valid: true, format: 'old', plain, display: `${plain.slice(0, 3)}-${plain.slice(3)}` };
	}
	if (MERCOSUL_PATTERN.test(plain)) {
		return { valid: true, format: 'mercosul', plain, display: plain };
	}
	return { valid: false, reason: 'invalid' };
}

export type ConvertResult =
	| { ok: true; plate: string; from: PlateFormat; to: PlateFormat }
	| { ok: false; reason: 'empty' | 'invalid' };

/** Old plate (ABC-1234) to Mercosul (ABC1C34): the 5th character, a digit, becomes the letter at that index. */
export function oldToMercosul(input: string): ConvertResult {
	const validation = validatePlate(input);
	if (!validation.valid) {
		return { ok: false, reason: validation.reason };
	}
	if (validation.format !== 'old') {
		return { ok: false, reason: 'invalid' };
	}
	const p = validation.plain;
	const letter = LETTERS.charAt(Number(p.charAt(4)));
	return { ok: true, plate: p.slice(0, 4) + letter + p.slice(5), from: 'old', to: 'mercosul' };
}

/** Mercosul (ABC1C34) back to the old layout (ABC-1234); only A-J can be mapped. */
export function mercosulToOld(input: string): ConvertResult {
	const validation = validatePlate(input);
	if (!validation.valid) {
		return { ok: false, reason: validation.reason };
	}
	if (validation.format !== 'mercosul') {
		return { ok: false, reason: 'invalid' };
	}
	const p = validation.plain;
	const index = LETTERS.indexOf(p.charAt(4));
	if (index > 9) {
		return { ok: false, reason: 'invalid' };
	}
	return { ok: true, plate: `${p.slice(0, 3)}-${p.slice(3, 4)}${index}${p.slice(5)}`, from: 'mercosul', to: 'old' };
}
