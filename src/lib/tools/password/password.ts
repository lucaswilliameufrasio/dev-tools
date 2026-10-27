export type PasswordOptions = {
	length: number;
	lowercase: boolean;
	uppercase: boolean;
	digits: boolean;
	symbols: boolean;
	avoidAmbiguous: boolean;
};

const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.?/~';
const AMBIGUOUS = /[O0oIl1|]/g;

function randomBelow(limit: number): number {
	const maxUnbiased = Math.floor(0x1_0000_0000 / limit) * limit;
	const buffer = new Uint32Array(1);
	for (;;) {
		crypto.getRandomValues(buffer);
		const value = buffer[0] ?? 0;
		if (value < maxUnbiased) {
			return value % limit;
		}
	}
}

export function buildPools(options: PasswordOptions): string[] {
	const candidates: string[] = [];
	if (options.lowercase) {
		candidates.push(LOWERCASE);
	}
	if (options.uppercase) {
		candidates.push(UPPERCASE);
	}
	if (options.digits) {
		candidates.push(DIGITS);
	}
	if (options.symbols) {
		candidates.push(SYMBOLS);
	}
	if (!options.avoidAmbiguous) {
		return candidates;
	}
	return candidates.map((pool) => pool.replace(AMBIGUOUS, ''));
}

export function generatePassword(options: PasswordOptions): string | undefined {
	const pools = buildPools(options);
	if (pools.length === 0 || options.length < pools.length) {
		return undefined;
	}
	const all = pools.join('');
	const characters: string[] = [];
	for (const pool of pools) {
		characters.push(pool.charAt(randomBelow(pool.length)));
	}
	while (characters.length < options.length) {
		characters.push(all.charAt(randomBelow(all.length)));
	}
	for (let index = characters.length - 1; index > 0; index -= 1) {
		const swapIndex = randomBelow(index + 1);
		const current = characters[index] ?? '';
		characters[index] = characters[swapIndex] ?? '';
		characters[swapIndex] = current;
	}
	return characters.join('');
}

export function entropyBits(options: PasswordOptions): number {
	const poolSize = buildPools(options).join('').length;
	if (poolSize === 0) {
		return 0;
	}
	return Math.round(options.length * Math.log2(poolSize));
}
