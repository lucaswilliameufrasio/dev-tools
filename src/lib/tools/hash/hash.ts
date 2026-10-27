export type HashAlgorithm = 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';

export const HASH_ALGORITHMS: HashAlgorithm[] = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];

export function toHex(bytes: Uint8Array): string {
	let hex = '';
	for (const byte of bytes) {
		hex += byte.toString(16).padStart(2, '0');
	}
	return hex;
}

function asBuffer(bytes: Uint8Array): ArrayBuffer {
	const copy = new ArrayBuffer(bytes.byteLength);
	new Uint8Array(copy).set(bytes);
	return copy;
}

export async function digest(algorithm: HashAlgorithm, data: Uint8Array): Promise<string> {
	const result = await crypto.subtle.digest(algorithm, asBuffer(data));
	return toHex(new Uint8Array(result));
}

export async function hmac(
	algorithm: HashAlgorithm,
	key: Uint8Array,
	data: Uint8Array
): Promise<string> {
	const cryptoKey = await crypto.subtle.importKey(
		'raw',
		asBuffer(key),
		{ name: 'HMAC', hash: algorithm },
		false,
		['sign']
	);
	const signature = await crypto.subtle.sign('HMAC', cryptoKey, asBuffer(data));
	return toHex(new Uint8Array(signature));
}
