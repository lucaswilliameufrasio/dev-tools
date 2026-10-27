import { decodeToBytes, encodeBytes, encodeText } from '../base64/base64';

export const JWT_ALGORITHMS = [
	'HS256',
	'HS384',
	'HS512',
	'RS256',
	'RS384',
	'RS512',
	'PS256',
	'PS384',
	'PS512',
	'ES256',
	'ES384',
	'ES512'
] as const;

export type JwtAlgorithm = (typeof JWT_ALGORITHMS)[number];

export type KeyErrorReason =
	| 'empty'
	| 'pem-format'
	| 'pem-unsupported'
	| 'pem-wrong-kind'
	| 'pem-base64'
	| 'jwk-json'
	| 'jwk-invalid'
	| 'secret-base64'
	| 'import-failed';

export type KeyError = { reason: KeyErrorReason };

export type KeyOptions = { secretIsBase64: boolean };

export type TimeStatus = 'none' | 'ok' | 'expired' | 'not-yet';

export type VerifyStatus =
	| 'valid'
	| 'invalid-signature'
	| 'bad-key'
	| 'alg-mismatch'
	| 'alg-none'
	| 'malformed';

export type VerifyOutcome = {
	status: VerifyStatus;
	keyReason?: KeyErrorReason;
	headerAlg?: string;
	time: TimeStatus;
};

export type SignErrorReason = 'header-json' | 'payload-json' | 'header-alg' | 'bad-key' | 'sign-failed';

export type SignResult =
	| { ok: true; token: string }
	| { ok: false; reason: SignErrorReason; keyReason?: KeyErrorReason };

type HashName = 'SHA-256' | 'SHA-384' | 'SHA-512';
type Family = 'HS' | 'RS' | 'PS' | 'ES';
type CurveName = 'P-256' | 'P-384' | 'P-521';

type AlgorithmInfo = { family: Family; hash: HashName; saltLength: number; curve: CurveName };

const HASHES: Record<string, { hash: HashName; bytes: number; curve: CurveName }> = {
	'256': { hash: 'SHA-256', bytes: 32, curve: 'P-256' },
	'384': { hash: 'SHA-384', bytes: 48, curve: 'P-384' },
	'512': { hash: 'SHA-512', bytes: 64, curve: 'P-521' }
};

export function isJwtAlgorithm(value: unknown): value is JwtAlgorithm {
	for (const algorithm of JWT_ALGORITHMS) {
		if (algorithm === value) {
			return true;
		}
	}
	return false;
}

function isFamily(value: string): value is Family {
	return value === 'HS' || value === 'RS' || value === 'PS' || value === 'ES';
}

function algorithmInfo(algorithm: JwtAlgorithm): AlgorithmInfo {
	const family = algorithm.slice(0, 2);
	const size = HASHES[algorithm.slice(2)] ?? { hash: 'SHA-256', bytes: 32, curve: 'P-256' };
	return {
		family: isFamily(family) ? family : 'HS',
		hash: size.hash,
		saltLength: size.bytes,
		curve: size.curve
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Copies bytes into a fresh ArrayBuffer-backed array, which WebCrypto accepts as BufferSource. */
function toBuffer(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
	const copy = new Uint8Array(new ArrayBuffer(bytes.length));
	copy.set(bytes);
	return copy;
}

const PUBLIC_ONLY_FIELDS = ['kty', 'n', 'e', 'crv', 'x', 'y'];
const PRIVATE_FIELDS = ['d', 'p', 'q', 'dp', 'dq', 'qi', 'oth', 'k'];

function jwkFromRecord(record: Record<string, unknown>, publicOnly: boolean): JsonWebKey | undefined {
	const kty = record.kty;
	if (typeof kty !== 'string') {
		return undefined;
	}
	const jwk: JsonWebKey = {};
	const allowed = publicOnly ? PUBLIC_ONLY_FIELDS : [...PUBLIC_ONLY_FIELDS, ...PRIVATE_FIELDS];
	for (const field of allowed) {
		const value = record[field];
		if (typeof value === 'string') {
			Object.assign(jwk, { [field]: value });
		}
	}
	return jwk;
}

type ParsedKey =
	| { ok: true; kind: 'pem'; label: string; der: Uint8Array }
	| { ok: true; kind: 'jwk'; record: Record<string, unknown> }
	| { ok: false; reason: KeyErrorReason };

export function parseKeyText(text: string): ParsedKey {
	const trimmed = text.trim();
	if (trimmed === '') {
		return { ok: false, reason: 'empty' };
	}
	if (trimmed.startsWith('{')) {
		let parsed: unknown;
		try {
			parsed = JSON.parse(trimmed);
		} catch {
			return { ok: false, reason: 'jwk-json' };
		}
		if (!isRecord(parsed) || typeof parsed.kty !== 'string') {
			return { ok: false, reason: 'jwk-invalid' };
		}
		return { ok: true, kind: 'jwk', record: parsed };
	}
	const match = /-----BEGIN ([A-Z0-9 ]+)-----([\s\S]*?)-----END \1-----/.exec(trimmed);
	if (!match) {
		return { ok: false, reason: 'pem-format' };
	}
	const label = match[1] ?? '';
	const body = (match[2] ?? '').replace(/\s+/g, '');
	if (label !== 'PUBLIC KEY' && label !== 'PRIVATE KEY') {
		if (label.includes('PRIVATE KEY') || label === 'CERTIFICATE') {
			return { ok: false, reason: 'pem-unsupported' };
		}
		return { ok: false, reason: 'pem-format' };
	}
	const bytes = decodeToBytes(body);
	if (!bytes.ok || bytes.bytes.length === 0) {
		return { ok: false, reason: 'pem-base64' };
	}
	return { ok: true, kind: 'pem', label, der: bytes.bytes };
}

function hmacSecret(text: string, options: KeyOptions): { ok: true; bytes: Uint8Array } | { ok: false; reason: KeyErrorReason } {
	const trimmed = text.trim();
	if (trimmed.startsWith('{')) {
		const parsed = parseKeyText(trimmed);
		if (parsed.ok && parsed.kind === 'jwk' && parsed.record.kty === 'oct') {
			const k = parsed.record.k;
			if (typeof k !== 'string') {
				return { ok: false, reason: 'jwk-invalid' };
			}
			const decoded = decodeToBytes(k);
			return decoded.ok ? { ok: true, bytes: decoded.bytes } : { ok: false, reason: 'jwk-invalid' };
		}
	}
	if (text === '') {
		return { ok: false, reason: 'empty' };
	}
	if (options.secretIsBase64) {
		const decoded = decodeToBytes(text);
		return decoded.ok && decoded.bytes.length > 0
			? { ok: true, bytes: decoded.bytes }
			: { ok: false, reason: 'secret-base64' };
	}
	return { ok: true, bytes: new TextEncoder().encode(text) };
}

type KeyResult = { ok: true; key: CryptoKey } | { ok: false; reason: KeyErrorReason };

function importParams(algorithm: JwtAlgorithm): RsaHashedImportParams | EcKeyImportParams | HmacImportParams {
	const info = algorithmInfo(algorithm);
	if (info.family === 'HS') {
		return { name: 'HMAC', hash: info.hash };
	}
	if (info.family === 'RS') {
		return { name: 'RSASSA-PKCS1-v1_5', hash: info.hash };
	}
	if (info.family === 'PS') {
		return { name: 'RSA-PSS', hash: info.hash };
	}
	return { name: 'ECDSA', namedCurve: info.curve };
}

export async function importKey(
	algorithm: JwtAlgorithm,
	text: string,
	purpose: 'sign' | 'verify',
	options: KeyOptions
): Promise<KeyResult> {
	const info = algorithmInfo(algorithm);
	const params = importParams(algorithm);
	try {
		if (info.family === 'HS') {
			const secret = hmacSecret(text, options);
			if (!secret.ok) {
				return secret;
			}
			const key = await crypto.subtle.importKey('raw', toBuffer(secret.bytes), params, false, [purpose]);
			return { ok: true, key };
		}
		const parsed = parseKeyText(text);
		if (!parsed.ok) {
			return parsed;
		}
		if (parsed.kind === 'pem') {
			const isPrivate = parsed.label === 'PRIVATE KEY';
			if (purpose === 'sign' && !isPrivate) {
				return { ok: false, reason: 'pem-wrong-kind' };
			}
			if (purpose === 'verify' && isPrivate) {
				return { ok: false, reason: 'pem-wrong-kind' };
			}
			const key = await crypto.subtle.importKey(
				isPrivate ? 'pkcs8' : 'spki',
				toBuffer(parsed.der),
				params,
				false,
				[purpose]
			);
			return { ok: true, key };
		}
		const hasPrivate = typeof parsed.record.d === 'string';
		if (purpose === 'sign' && !hasPrivate) {
			return { ok: false, reason: 'jwk-invalid' };
		}
		const jwk = jwkFromRecord(parsed.record, purpose === 'verify');
		if (jwk === undefined) {
			return { ok: false, reason: 'jwk-invalid' };
		}
		const key = await crypto.subtle.importKey('jwk', jwk, params, false, [purpose]);
		return { ok: true, key };
	} catch {
		return { ok: false, reason: 'import-failed' };
	}
}

function signParams(algorithm: JwtAlgorithm): AlgorithmIdentifier | RsaPssParams | EcdsaParams {
	const info = algorithmInfo(algorithm);
	if (info.family === 'HS') {
		return { name: 'HMAC' };
	}
	if (info.family === 'RS') {
		return { name: 'RSASSA-PKCS1-v1_5' };
	}
	if (info.family === 'PS') {
		return { name: 'RSA-PSS', saltLength: info.saltLength };
	}
	return { name: 'ECDSA', hash: info.hash };
}

function parseJsonObject(text: string): Record<string, unknown> | undefined {
	try {
		const parsed: unknown = JSON.parse(text);
		return isRecord(parsed) ? parsed : undefined;
	} catch {
		return undefined;
	}
}

function decodeJsonSegment(segment: string): Record<string, unknown> | undefined {
	const bytes = decodeToBytes(segment);
	if (!bytes.ok) {
		return undefined;
	}
	try {
		return parseJsonObject(new TextDecoder('utf-8', { fatal: true }).decode(bytes.bytes));
	} catch {
		return undefined;
	}
}

export function timeStatus(payload: Record<string, unknown> | undefined, nowSeconds: number): TimeStatus {
	if (payload === undefined) {
		return 'none';
	}
	const exp = payload.exp;
	const nbf = payload.nbf;
	if (typeof exp === 'number' && Number.isFinite(exp) && exp <= nowSeconds) {
		return 'expired';
	}
	if (typeof nbf === 'number' && Number.isFinite(nbf) && nbf > nowSeconds) {
		return 'not-yet';
	}
	if (typeof exp === 'number' || typeof nbf === 'number') {
		return 'ok';
	}
	return 'none';
}

/**
 * Verifies a compact JWS. The algorithm is chosen by the caller (`expected`);
 * the token's own `alg` header is only compared against it, never trusted.
 */
export async function verifyJwt(
	token: string,
	expected: JwtAlgorithm,
	keyText: string,
	options: KeyOptions,
	nowSeconds: number = Math.floor(Date.now() / 1000)
): Promise<VerifyOutcome> {
	const parts = token.trim().replace(/^bearer\s+/i, '').split('.');
	if (parts.length !== 3) {
		return { status: 'malformed', time: 'none' };
	}
	const [headerPart = '', payloadPart = '', signaturePart = ''] = parts;
	const header = decodeJsonSegment(headerPart);
	if (header === undefined) {
		return { status: 'malformed', time: 'none' };
	}
	const payload = decodeJsonSegment(payloadPart);
	const time = timeStatus(payload, nowSeconds);
	const headerAlg = typeof header.alg === 'string' ? header.alg : undefined;
	if (headerAlg !== undefined && headerAlg.toLowerCase() === 'none') {
		return { status: 'alg-none', headerAlg, time };
	}
	if (headerAlg !== expected) {
		return { status: 'alg-mismatch', headerAlg, time };
	}
	const key = await importKey(expected, keyText, 'verify', options);
	if (!key.ok) {
		return { status: 'bad-key', keyReason: key.reason, headerAlg, time };
	}
	const signature = decodeToBytes(signaturePart);
	if (!signature.ok) {
		return { status: 'invalid-signature', headerAlg, time };
	}
	try {
		const data = new TextEncoder().encode(`${headerPart}.${payloadPart}`);
		const valid = await crypto.subtle.verify(
			signParams(expected),
			key.key,
			toBuffer(signature.bytes),
			toBuffer(data)
		);
		return { status: valid ? 'valid' : 'invalid-signature', headerAlg, time };
	} catch {
		return { status: 'invalid-signature', headerAlg, time };
	}
}

export async function signJwt(
	headerJson: string,
	payloadJson: string,
	algorithm: JwtAlgorithm,
	keyText: string,
	options: KeyOptions
): Promise<SignResult> {
	const header = parseJsonObject(headerJson);
	if (header === undefined) {
		return { ok: false, reason: 'header-json' };
	}
	const payload = parseJsonObject(payloadJson);
	if (payload === undefined) {
		return { ok: false, reason: 'payload-json' };
	}
	if (header.alg !== algorithm) {
		return { ok: false, reason: 'header-alg' };
	}
	const key = await importKey(algorithm, keyText, 'sign', options);
	if (!key.ok) {
		return { ok: false, reason: 'bad-key', keyReason: key.reason };
	}
	const signingInput = `${encodeText(JSON.stringify(header), 'url', false)}.${encodeText(JSON.stringify(payload), 'url', false)}`;
	try {
		const signature = await crypto.subtle.sign(
			signParams(algorithm),
			key.key,
			toBuffer(new TextEncoder().encode(signingInput))
		);
		return { ok: true, token: `${signingInput}.${encodeBytes(new Uint8Array(signature), 'url', false)}` };
	} catch {
		return { ok: false, reason: 'sign-failed' };
	}
}

/** Random 256-bit secret as base64url, meant for HS256 tests only. */
export function generateTestSecret(): string {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	return encodeBytes(bytes, 'url', false);
}

export function setHeaderAlgorithm(headerJson: string, algorithm: JwtAlgorithm): string {
	const header = parseJsonObject(headerJson);
	if (header === undefined) {
		return headerJson;
	}
	return JSON.stringify({ ...header, alg: algorithm }, undefined, 2);
}

export function withTimestamps(payloadJson: string, nowSeconds: number): string {
	const payload = parseJsonObject(payloadJson);
	if (payload === undefined) {
		return payloadJson;
	}
	return JSON.stringify({ ...payload, iat: nowSeconds, exp: nowSeconds + 3600 }, undefined, 2);
}
