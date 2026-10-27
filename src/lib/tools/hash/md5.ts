// MD5 (RFC 1321). The Web Crypto API does not offer it, so it is implemented here.
// It is broken for security purposes and exists only for checksums and legacy compatibility.

const SHIFTS: number[] = [
	7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14,
	20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6,
	10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
];

const CONSTANTS: number[] = Array.from({ length: 64 }, (_, index) => {
	return Math.floor(Math.abs(Math.sin(index + 1)) * 2 ** 32) >>> 0;
});

function rotateLeft(value: number, amount: number): number {
	return ((value << amount) | (value >>> (32 - amount))) >>> 0;
}

export function md5(data: Uint8Array): Uint8Array {
	const length = data.length;
	const paddedLength = (((length + 8) >> 6) + 1) << 6;
	const padded = new Uint8Array(paddedLength);
	padded.set(data);
	padded[length] = 0x80;
	const view = new DataView(padded.buffer);
	view.setUint32(paddedLength - 8, (length << 3) >>> 0, true);
	view.setUint32(paddedLength - 4, Math.floor(length / 0x20000000), true);

	let a0 = 0x67452301;
	let b0 = 0xefcdab89;
	let c0 = 0x98badcfe;
	let d0 = 0x10325476;

	for (let offset = 0; offset < paddedLength; offset += 64) {
		let a = a0;
		let b = b0;
		let c = c0;
		let d = d0;
		for (let step = 0; step < 64; step += 1) {
			let mixed: number;
			let wordIndex: number;
			if (step < 16) {
				mixed = (b & c) | (~b & d);
				wordIndex = step;
			} else if (step < 32) {
				mixed = (d & b) | (~d & c);
				wordIndex = (5 * step + 1) % 16;
			} else if (step < 48) {
				mixed = b ^ c ^ d;
				wordIndex = (3 * step + 5) % 16;
			} else {
				mixed = c ^ (b | ~d);
				wordIndex = (7 * step) % 16;
			}
			const word = view.getUint32(offset + wordIndex * 4, true);
			const sum = (mixed + a + (CONSTANTS[step] ?? 0) + word) >>> 0;
			a = d;
			d = c;
			c = b;
			b = (b + rotateLeft(sum, SHIFTS[step] ?? 0)) >>> 0;
		}
		a0 = (a0 + a) >>> 0;
		b0 = (b0 + b) >>> 0;
		c0 = (c0 + c) >>> 0;
		d0 = (d0 + d) >>> 0;
	}

	const output = new Uint8Array(16);
	const outputView = new DataView(output.buffer);
	outputView.setUint32(0, a0, true);
	outputView.setUint32(4, b0, true);
	outputView.setUint32(8, c0, true);
	outputView.setUint32(12, d0, true);
	return output;
}

const BLOCK_SIZE = 64;

export function hmacMd5(key: Uint8Array, data: Uint8Array): Uint8Array {
	const normalizedKey = key.length > BLOCK_SIZE ? md5(key) : key;
	const inner = new Uint8Array(BLOCK_SIZE + data.length);
	const outer = new Uint8Array(BLOCK_SIZE + 16);
	for (let index = 0; index < BLOCK_SIZE; index += 1) {
		const keyByte = normalizedKey[index] ?? 0;
		inner[index] = keyByte ^ 0x36;
		outer[index] = keyByte ^ 0x5c;
	}
	inner.set(data, BLOCK_SIZE);
	outer.set(md5(inner), BLOCK_SIZE);
	return md5(outer);
}
