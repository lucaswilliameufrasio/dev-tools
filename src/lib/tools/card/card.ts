export type Brand = 'visa' | 'mastercard' | 'amex' | 'elo' | 'hipercard' | 'diners' | 'discover' | 'jcb';

export const BRANDS: readonly Brand[] = ['visa', 'mastercard', 'amex', 'elo', 'hipercard', 'diners', 'discover', 'jcb'];

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

function randomDigits(length: number): string {
	let out = '';
	for (let i = 0; i < length; i += 1) {
		out += String(randomInt(10));
	}
	return out;
}

/** Inclusive numeric prefix ranges; start and end have the same number of digits. */
type PrefixRange = readonly [start: number, end: number];

const ELO_RANGES: readonly PrefixRange[] = [
	[401178, 401178], [401179, 401179], [431274, 431274], [438935, 438935], [451416, 451416],
	[457393, 457393], [457631, 457631], [457632, 457632], [504175, 504175], [506699, 506778],
	[509000, 509999], [627780, 627780], [636297, 636297], [636368, 636368], [650031, 650033],
	[650035, 650051], [650405, 650439], [650485, 650538], [650541, 650598], [650700, 650718],
	[650720, 650727], [650901, 650920], [651652, 651679], [655000, 655019], [655021, 655058]
];

const HIPERCARD_RANGES: readonly PrefixRange[] = [[606282, 606282], [384100, 384100], [384140, 384140], [384160, 384160]];

type BrandSpec = {
	/** Prefix ranges used both to generate and to detect. */
	prefixes: readonly PrefixRange[];
	lengths: readonly number[];
	generateLength: number;
	cvvLength: number;
};

const SPECS: Record<Brand, BrandSpec> = {
	visa: { prefixes: [[4, 4]], lengths: [13, 16, 19], generateLength: 16, cvvLength: 3 },
	mastercard: { prefixes: [[51, 55], [2221, 2720]], lengths: [16], generateLength: 16, cvvLength: 3 },
	amex: { prefixes: [[34, 34], [37, 37]], lengths: [15], generateLength: 15, cvvLength: 4 },
	elo: { prefixes: ELO_RANGES, lengths: [16], generateLength: 16, cvvLength: 3 },
	hipercard: { prefixes: HIPERCARD_RANGES, lengths: [16], generateLength: 16, cvvLength: 3 },
	diners: { prefixes: [[36, 36], [300, 305]], lengths: [14], generateLength: 14, cvvLength: 3 },
	discover: { prefixes: [[6011, 6011], [65, 65]], lengths: [16], generateLength: 16, cvvLength: 3 },
	jcb: { prefixes: [[3528, 3589]], lengths: [16], generateLength: 16, cvvLength: 3 }
};

/** Detection order matters: Elo and Hipercard BINs overlap Visa, Discover and others. */
const DETECTION_ORDER: readonly Brand[] = ['elo', 'hipercard', 'amex', 'diners', 'jcb', 'discover', 'mastercard', 'visa'];

export function cvvLength(brand: Brand): number {
	return SPECS[brand].cvvLength;
}

export function luhnValid(digits: string): boolean {
	if (!/^[0-9]{2,}$/.test(digits)) {
		return false;
	}
	let sum = 0;
	let double = false;
	for (let i = digits.length - 1; i >= 0; i -= 1) {
		let value = Number(digits.charAt(i));
		if (double) {
			value *= 2;
			if (value > 9) {
				value -= 9;
			}
		}
		sum += value;
		double = !double;
	}
	return sum % 10 === 0;
}

export function luhnCheckDigit(partial: string): string {
	for (let d = 0; d <= 9; d += 1) {
		if (luhnValid(partial + String(d))) {
			return String(d);
		}
	}
	return '0';
}

function matchesPrefix(digits: string, ranges: readonly PrefixRange[]): boolean {
	for (const [start, end] of ranges) {
		const size = String(start).length;
		if (digits.length < size) {
			continue;
		}
		const value = Number(digits.slice(0, size));
		if (value >= start && value <= end) {
			return true;
		}
	}
	return false;
}

export function detectBrand(digits: string): Brand | undefined {
	for (const brand of DETECTION_ORDER) {
		if (matchesPrefix(digits, SPECS[brand].prefixes)) {
			return brand;
		}
	}
	return undefined;
}

function randomPrefix(brand: Brand): string {
	const ranges = SPECS[brand].prefixes;
	const range = ranges[randomInt(ranges.length)] ?? ranges[0];
	if (range === undefined) {
		return '';
	}
	const [start, end] = range;
	return String(start + randomInt(end - start + 1));
}

export function generateCardNumber(brand: Brand): string {
	const length = SPECS[brand].generateLength;
	for (;;) {
		const prefix = randomPrefix(brand);
		const partial = prefix + randomDigits(length - 1 - prefix.length);
		const number = partial + luhnCheckDigit(partial);
		// Overlapping BINs (e.g. Discover 65 vs Elo 6500xx) must still detect as the requested brand.
		if (detectBrand(number) === brand) {
			return number;
		}
	}
}

export function formatCardNumber(digits: string, brand: Brand | undefined): string {
	if (brand === 'amex') {
		return [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10)].filter((g) => g.length > 0).join(' ');
	}
	if (brand === 'diners') {
		return [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10)].filter((g) => g.length > 0).join(' ');
	}
	const groups: string[] = [];
	for (let i = 0; i < digits.length; i += 4) {
		groups.push(digits.slice(i, i + 4));
	}
	return groups.join(' ');
}

/** Keeps the first 6 (BIN) and last 4 digits, masks the rest. */
export function maskCardNumber(digits: string): string {
	if (digits.length <= 10) {
		return '*'.repeat(digits.length);
	}
	return digits.slice(0, 6) + '*'.repeat(digits.length - 10) + digits.slice(-4);
}

export type CardValidation =
	| { ok: true; digits: string; brand: Brand | undefined; luhn: boolean; lengthOk: boolean }
	| { ok: false; reason: 'empty' | 'chars' | 'short' };

export function validateCard(input: string): CardValidation {
	const stripped = input.replace(/[\s-]/g, '');
	if (stripped.length === 0) {
		return { ok: false, reason: 'empty' };
	}
	if (!/^[0-9]+$/.test(stripped)) {
		return { ok: false, reason: 'chars' };
	}
	if (stripped.length < 8) {
		return { ok: false, reason: 'short' };
	}
	const brand = detectBrand(stripped);
	const lengthOk = brand === undefined ? stripped.length >= 12 && stripped.length <= 19 : SPECS[brand].lengths.includes(stripped.length);
	return { ok: true, digits: stripped, brand, luhn: luhnValid(stripped), lengthOk };
}

export function generateCvv(brand: Brand): string {
	return randomDigits(SPECS[brand].cvvLength);
}

/** A month/year strictly in the future: 1 to 5 years ahead of `now`. */
export function generateExpiry(now: Date): string {
	const monthsAhead = 1 + randomInt(60);
	const total = now.getFullYear() * 12 + now.getMonth() + monthsAhead;
	const year = Math.floor(total / 12);
	const month = (total % 12) + 1;
	return `${String(month).padStart(2, '0')}/${String(year % 100).padStart(2, '0')}`;
}

const FIRST_NAMES = ['ANA', 'BRUNO', 'CARLA', 'DANIEL', 'ELISA', 'FELIPE', 'GABRIELA', 'HUGO', 'ISABELA', 'JOAO', 'KARINA', 'LUCAS', 'MARIA', 'NATALIA', 'OTAVIO', 'PAULA', 'RAFAEL', 'SOFIA', 'THIAGO', 'VITORIA'];
const LAST_NAMES = ['ALMEIDA', 'BARBOSA', 'CARDOSO', 'DIAS', 'FERREIRA', 'GOMES', 'LIMA', 'MARTINS', 'NUNES', 'OLIVEIRA', 'PEREIRA', 'RAMOS', 'SANTOS', 'SOUZA', 'TEIXEIRA', 'VIEIRA'];

export function generateHolderName(): string {
	const first = FIRST_NAMES[randomInt(FIRST_NAMES.length)] ?? 'ANA';
	const last = LAST_NAMES[randomInt(LAST_NAMES.length)] ?? 'SILVA';
	return `${first} ${last}`;
}

export type GeneratedCard = { number: string; expiry: string; cvv: string; holder: string };

export function generateCard(brand: Brand, now: Date): GeneratedCard {
	return {
		number: generateCardNumber(brand),
		expiry: generateExpiry(now),
		cvv: generateCvv(brand),
		holder: generateHolderName()
	};
}

export type GatewayTestNumber = { gateway: string; brand: Brand; number: string };

export const GATEWAY_TEST_NUMBERS: readonly GatewayTestNumber[] = [
	{ gateway: 'Stripe', brand: 'visa', number: '4242424242424242' },
	{ gateway: 'Stripe', brand: 'mastercard', number: '5555555555554444' },
	{ gateway: 'Stripe', brand: 'amex', number: '378282246310005' },
	{ gateway: 'Stripe', brand: 'discover', number: '6011111111111117' },
	{ gateway: 'Stripe', brand: 'diners', number: '36227206271667' },
	{ gateway: 'Stripe', brand: 'jcb', number: '3566002020360505' }
];
