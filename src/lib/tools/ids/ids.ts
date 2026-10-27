const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function randomBytes(length: number): Uint8Array {
	const bytes = new Uint8Array(length);
	crypto.getRandomValues(bytes);
	return bytes;
}

export function uuidV4(): string {
	return crypto.randomUUID();
}

export function uuidV7(timestampMs: number = Date.now()): string {
	const bytes = randomBytes(16);
	let remaining = BigInt(timestampMs);
	for (let index = 5; index >= 0; index -= 1) {
		bytes[index] = Number(remaining & 0xffn);
		remaining >>= 8n;
	}
	bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x70;
	bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
	const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function ulid(timestampMs: number = Date.now()): string {
	let timePart = '';
	let remaining = timestampMs;
	for (let index = 0; index < 10; index += 1) {
		timePart = CROCKFORD.charAt(remaining % 32) + timePart;
		remaining = Math.floor(remaining / 32);
	}
	let randomPart = '';
	for (const byte of randomBytes(16)) {
		randomPart += CROCKFORD.charAt(byte % 32);
		if (randomPart.length === 16) {
			break;
		}
	}
	return timePart + randomPart;
}

export type IdKind = 'uuid-v4' | 'uuid-v7' | 'ulid';

export function generateIds(kind: IdKind, count: number): string[] {
	const ids: string[] = [];
	for (let index = 0; index < count; index += 1) {
		if (kind === 'uuid-v4') {
			ids.push(uuidV4());
		} else if (kind === 'uuid-v7') {
			ids.push(uuidV7());
		} else {
			ids.push(ulid());
		}
	}
	return ids;
}
