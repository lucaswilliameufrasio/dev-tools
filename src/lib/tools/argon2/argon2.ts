import { argon2d, argon2i, argon2id, argon2Verify } from 'hash-wasm';

export type Argon2Variant = 'argon2id' | 'argon2i' | 'argon2d';

export const ARGON2_VARIANTS: readonly Argon2Variant[] = ['argon2id', 'argon2i', 'argon2d'];
export const ARGON2_SALT_BYTES = 16;
export const ARGON2_LIMITS = {
	memory: { min: 8, max: 1_048_576 },
	iterations: { min: 1, max: 100 },
	parallelism: { min: 1, max: 16 },
	hashLength: { min: 4, max: 128 }
} as const;
export const ARGON2_DEFAULTS = {
	variant: 'argon2id' as Argon2Variant,
	memory: 19456,
	iterations: 2,
	parallelism: 1,
	hashLength: 32
};
/** Above this many KiB the computation may be slow or hit browser memory limits. */
export const ARGON2_HEAVY_MEMORY = 262_144;

export type Argon2Params = {
	variant: Argon2Variant;
	memory: number;
	iterations: number;
	parallelism: number;
	hashLength: number;
};

export type Argon2Request =
	| ({ kind: 'hash'; password: string; salt: Uint8Array } & Argon2Params)
	| { kind: 'verify'; password: string; hash: string };

export type Argon2Failure =
	| 'empty-password'
	| 'invalid-memory'
	| 'invalid-memory-for-parallelism'
	| 'invalid-iterations'
	| 'invalid-parallelism'
	| 'invalid-hash-length'
	| 'invalid-salt'
	| 'invalid-hash'
	| 'failed';

export type Argon2Response =
	| { ok: true; kind: 'hash'; encoded: string; hex: string; elapsedMs: number }
	| { ok: true; kind: 'verify'; matches: boolean; elapsedMs: number }
	| { ok: false; reason: Argon2Failure };

const ENCODED_PATTERN =
	/^\$argon2(id|i|d)\$v=(\d+)\$m=(\d+),t=(\d+),p=(\d+)\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/;

function inRange(value: number, range: { min: number; max: number }): boolean {
	return Number.isInteger(value) && value >= range.min && value <= range.max;
}

export function generateSalt(): Uint8Array {
	const salt = new Uint8Array(ARGON2_SALT_BYTES);
	crypto.getRandomValues(salt);
	return salt;
}

export function validateParams(params: Argon2Params): Argon2Failure | undefined {
	if (!inRange(params.memory, ARGON2_LIMITS.memory)) {
		return 'invalid-memory';
	}
	if (!inRange(params.iterations, ARGON2_LIMITS.iterations)) {
		return 'invalid-iterations';
	}
	if (!inRange(params.parallelism, ARGON2_LIMITS.parallelism)) {
		return 'invalid-parallelism';
	}
	if (!inRange(params.hashLength, ARGON2_LIMITS.hashLength)) {
		return 'invalid-hash-length';
	}
	if (params.memory < 8 * params.parallelism) {
		return 'invalid-memory-for-parallelism';
	}
	return undefined;
}

export type ParsedEncoded = Argon2Params & { saltBase64: string; hashBase64: string };

export function parseEncoded(encoded: string): ParsedEncoded | undefined {
	const match = ENCODED_PATTERN.exec(encoded);
	if (match === null) {
		return undefined;
	}
	const variant = match[1];
	if (variant !== 'id' && variant !== 'i' && variant !== 'd') {
		return undefined;
	}
	const hashBase64 = match[7];
	const saltBase64 = match[6];
	if (hashBase64 === undefined || saltBase64 === undefined || match[2] !== '19') {
		return undefined;
	}
	const hashBytes = base64ToBytes(hashBase64);
	if (hashBytes === undefined) {
		return undefined;
	}
	const params: Argon2Params = {
		variant: variant === 'id' ? 'argon2id' : variant === 'i' ? 'argon2i' : 'argon2d',
		memory: Number(match[3]),
		iterations: Number(match[4]),
		parallelism: Number(match[5]),
		hashLength: hashBytes.length
	};
	if (validateParams(params) !== undefined) {
		return undefined;
	}
	return { ...params, saltBase64, hashBase64 };
}

export function base64ToBytes(unpadded: string): Uint8Array | undefined {
	if (unpadded.length % 4 === 1) {
		return undefined;
	}
	const padded = unpadded + '='.repeat((4 - (unpadded.length % 4)) % 4);
	try {
		const binary = atob(padded);
		const bytes = new Uint8Array(binary.length);
		for (let index = 0; index < binary.length; index += 1) {
			bytes[index] = binary.charCodeAt(index);
		}
		return bytes;
	} catch {
		return undefined;
	}
}

export function bytesToHex(bytes: Uint8Array): string {
	let hex = '';
	for (const byte of bytes) {
		hex += byte.toString(16).padStart(2, '0');
	}
	return hex;
}

/** Raw hash (hex) taken from the last segment of an encoded argon2 string. */
export function encodedToHex(encoded: string): string | undefined {
	const parsed = parseEncoded(encoded);
	if (parsed === undefined) {
		return undefined;
	}
	const bytes = base64ToBytes(parsed.hashBase64);
	return bytes === undefined ? undefined : bytesToHex(bytes);
}

export function validateRequest(request: Argon2Request): Argon2Failure | undefined {
	if (request.password === '') {
		return 'empty-password';
	}
	if (request.kind === 'verify') {
		return parseEncoded(request.hash.trim()) === undefined ? 'invalid-hash' : undefined;
	}
	if (request.salt.length < 8) {
		return 'invalid-salt';
	}
	return validateParams(request);
}

/** Runs the real computation. Called from the worker (and from tests). */
export async function runArgon2(request: Argon2Request): Promise<Argon2Response> {
	const failure = validateRequest(request);
	if (failure !== undefined) {
		return { ok: false, reason: failure };
	}
	const started = performance.now();
	try {
		if (request.kind === 'verify') {
			const matches = await argon2Verify({
				password: request.password,
				hash: request.hash.trim()
			});
			return { ok: true, kind: 'verify', matches, elapsedMs: performance.now() - started };
		}
		const options = {
			password: request.password,
			salt: request.salt,
			parallelism: request.parallelism,
			iterations: request.iterations,
			memorySize: request.memory,
			hashLength: request.hashLength,
			outputType: 'encoded' as const
		};
		const encoded =
			request.variant === 'argon2id'
				? await argon2id(options)
				: request.variant === 'argon2i'
					? await argon2i(options)
					: await argon2d(options);
		const hex = encodedToHex(encoded);
		if (hex === undefined) {
			return { ok: false, reason: 'failed' };
		}
		return { ok: true, kind: 'hash', encoded, hex, elapsedMs: performance.now() - started };
	} catch {
		return { ok: false, reason: 'failed' };
	}
}
