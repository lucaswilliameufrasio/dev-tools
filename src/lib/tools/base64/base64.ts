export type Base64Variant = 'standard' | 'url';

export type DecodeBytesResult =
	| { ok: true; bytes: Uint8Array }
	| { ok: false; reason: 'invalid' };

export type DecodeTextResult =
	| { ok: true; text: string }
	| { ok: false; reason: 'invalid' | 'not-utf8' };

const BASE64_PATTERN = /^[A-Za-z0-9+/]*={0,2}$/;
const CHUNK_SIZE = 0x8000;

export function encodeBytes(bytes: Uint8Array, variant: Base64Variant, padding: boolean): string {
	let binary = '';
	for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
		const chunk = bytes.subarray(offset, offset + CHUNK_SIZE);
		binary += String.fromCharCode(...chunk);
	}
	let encoded = btoa(binary);
	if (variant === 'url') {
		encoded = encoded.replace(/\+/g, '-').replace(/\//g, '_');
	}
	if (!padding) {
		encoded = encoded.replace(/=+$/, '');
	}
	return encoded;
}

export function encodeText(input: string, variant: Base64Variant, padding: boolean): string {
	return encodeBytes(new TextEncoder().encode(input), variant, padding);
}

export function decodeToBytes(input: string): DecodeBytesResult {
	const withoutDataUri = input.trim().replace(/^data:[^,]*;base64,/i, '');
	const normalized = withoutDataUri
		.replace(/\s+/g, '')
		.replace(/-/g, '+')
		.replace(/_/g, '/');
	if (!BASE64_PATTERN.test(normalized)) {
		return { ok: false, reason: 'invalid' };
	}
	const unpadded = normalized.replace(/=+$/, '');
	if (unpadded.length % 4 === 1) {
		return { ok: false, reason: 'invalid' };
	}
	const padded = unpadded + '='.repeat((4 - (unpadded.length % 4)) % 4);
	try {
		const binary = atob(padded);
		const bytes = new Uint8Array(binary.length);
		for (let index = 0; index < binary.length; index += 1) {
			bytes[index] = binary.charCodeAt(index);
		}
		return { ok: true, bytes };
	} catch {
		return { ok: false, reason: 'invalid' };
	}
}

export function decodeText(input: string): DecodeTextResult {
	const result = decodeToBytes(input);
	if (!result.ok) {
		return result;
	}
	try {
		const text = new TextDecoder('utf-8', { fatal: true }).decode(result.bytes);
		return { ok: true, text };
	} catch {
		return { ok: false, reason: 'not-utf8' };
	}
}
