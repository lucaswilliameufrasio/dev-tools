import { bcrypt, bcryptVerify } from 'hash-wasm';

export const BCRYPT_MIN_COST = 4;
export const BCRYPT_MAX_COST = 15;
export const BCRYPT_DEFAULT_COST = 10;
export const BCRYPT_SLOW_COST = 13;
export const BCRYPT_MAX_PASSWORD_BYTES = 72;
export const BCRYPT_SALT_BYTES = 16;

const BCRYPT_HASH_PATTERN = /^\$2[abxy]\$(\d{2})\$[./A-Za-z0-9]{53}$/;
const encoder = new TextEncoder();

export type BcryptRequest =
	| { kind: 'hash'; password: string; cost: number; salt: Uint8Array }
	| { kind: 'verify'; password: string; hash: string };

export type BcryptResponse =
	| { ok: true; kind: 'hash'; hash: string; elapsedMs: number }
	| { ok: true; kind: 'verify'; matches: boolean; elapsedMs: number }
	| { ok: false; reason: BcryptFailure };

export type BcryptFailure =
	| 'empty-password'
	| 'invalid-cost'
	| 'invalid-hash'
	| 'invalid-salt'
	| 'failed';

export function passwordByteLength(password: string): number {
	return encoder.encode(password).length;
}

export function exceedsBcryptLimit(password: string): boolean {
	return passwordByteLength(password) > BCRYPT_MAX_PASSWORD_BYTES;
}

/** bcrypt only reads the first 72 bytes; hash-wasm rejects longer input. */
export function bcryptPasswordBytes(password: string): Uint8Array {
	return encoder.encode(password).slice(0, BCRYPT_MAX_PASSWORD_BYTES);
}

/** hash-wasm emits $2a$; for passwords under 256 bytes it is identical to the modern $2b$ prefix. */
export function toBcryptPrefix(hash: string, prefix: '2a' | '2b'): string {
	return hash.replace(/^\$2[abxy]\$/, `$${prefix}$`);
}

export function isSlowCost(cost: number): boolean {
	return cost >= BCRYPT_SLOW_COST;
}

export function validateCost(cost: number): boolean {
	return Number.isInteger(cost) && cost >= BCRYPT_MIN_COST && cost <= BCRYPT_MAX_COST;
}

export function isBcryptHash(hash: string): boolean {
	const match = BCRYPT_HASH_PATTERN.exec(hash);
	if (match === null) {
		return false;
	}
	const cost = Number(match[1]);
	return validateCost(cost);
}

export function generateSalt(): Uint8Array {
	const salt = new Uint8Array(BCRYPT_SALT_BYTES);
	crypto.getRandomValues(salt);
	return salt;
}

export function validateRequest(request: BcryptRequest): BcryptFailure | undefined {
	if (request.password === '') {
		return 'empty-password';
	}
	if (request.kind === 'hash') {
		if (!validateCost(request.cost)) {
			return 'invalid-cost';
		}
		if (request.salt.length !== BCRYPT_SALT_BYTES) {
			return 'invalid-salt';
		}
		return undefined;
	}
	if (!isBcryptHash(request.hash.trim())) {
		return 'invalid-hash';
	}
	return undefined;
}

/** Runs the real computation. Called from the worker (and from tests). */
export async function runBcrypt(request: BcryptRequest): Promise<BcryptResponse> {
	const failure = validateRequest(request);
	if (failure !== undefined) {
		return { ok: false, reason: failure };
	}
	const started = performance.now();
	try {
		if (request.kind === 'hash') {
			const hash = await bcrypt({
				password: bcryptPasswordBytes(request.password),
				salt: request.salt,
				costFactor: request.cost,
				outputType: 'encoded'
			});
			return {
				ok: true,
				kind: 'hash',
				hash: toBcryptPrefix(hash, '2b'),
				elapsedMs: performance.now() - started
			};
		}
		const matches = await bcryptVerify({
			password: bcryptPasswordBytes(request.password),
			hash: toBcryptPrefix(request.hash.trim(), '2a')
		});
		return { ok: true, kind: 'verify', matches, elapsedMs: performance.now() - started };
	} catch {
		return { ok: false, reason: 'failed' };
	}
}
