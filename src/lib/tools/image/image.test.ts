import { describe, expect, it } from 'vitest';
import {
	baseName,
	buildDataUri,
	cssSnippet,
	extensionFor,
	formatPercent,
	imgSnippet,
	parseDataUri,
	isZipFile,
	looksLikeImage,
	readZipImages,
	percentSaved,
	sniffMime,
	targetSize
} from './image';
import { deflateRawSync } from 'node:zlib';

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

describe('sniffMime', () => {
	it('recognises common formats', () => {
		expect(sniffMime(png)).toBe('image/png');
		expect(sniffMime(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
		expect(sniffMime(new TextEncoder().encode('GIF89a....'))).toBe('image/gif');
		expect(sniffMime(new TextEncoder().encode('RIFF\0\0\0\0WEBPVP8 '))).toBe('image/webp');
		expect(sniffMime(new TextEncoder().encode('<?xml version="1.0"?><svg xmlns=""/>'))).toBe(
			'image/svg+xml'
		);
	});

	it('returns undefined for unknown or tiny input', () => {
		expect(sniffMime(new TextEncoder().encode('hello world'))).toBeUndefined();
		expect(sniffMime(new Uint8Array([]))).toBeUndefined();
		expect(sniffMime(new Uint8Array([0x89]))).toBeUndefined();
	});
});

describe('targetSize', () => {
	const original = { width: 2000, height: 1000 };
	it('keeps aspect ratio and fits within limits', () => {
		expect(targetSize(original, 1000, undefined, true)).toEqual({ width: 1000, height: 500 });
		expect(targetSize(original, 1000, 100, true)).toEqual({ width: 200, height: 100 });
	});
	it('never upscales when keeping aspect', () => {
		expect(targetSize(original, 5000, 5000, true)).toEqual(original);
		expect(targetSize(original, undefined, undefined, true)).toEqual(original);
	});
	it('uses exact limits without aspect lock and ignores invalid values', () => {
		expect(targetSize(original, 300, undefined, false)).toEqual({ width: 300, height: 1000 });
		expect(targetSize(original, NaN, -5, false)).toEqual(original);
	});
});

describe('percent helpers', () => {
	it('computes savings', () => {
		expect(percentSaved(1000, 250)).toBe(75);
		expect(percentSaved(1000, 1500)).toBe(-50);
		expect(percentSaved(0, 10)).toBe(0);
	});
	it('formats with direction', () => {
		expect(formatPercent(75)).toBe('-75.0%');
		expect(formatPercent(-50)).toBe('+50.0%');
		expect(formatPercent(0)).toBe('0.0%');
	});
});

describe('data URIs', () => {
	it('round-trips', () => {
		const uri = buildDataUri('image/png', png);
		expect(uri.startsWith('data:image/png;base64,iVBORw0KGgo')).toBe(true);
		const parsed = parseDataUri(uri);
		expect(parsed.ok).toBe(true);
		if (parsed.ok) {
			expect(parsed.mime).toBe('image/png');
			expect([...parsed.bytes]).toEqual([...png]);
		}
	});
	it('reports errors', () => {
		expect(parseDataUri('hello')).toEqual({ ok: false, reason: 'not-data-uri' });
		expect(parseDataUri('data:text/plain,hi')).toEqual({ ok: false, reason: 'not-base64' });
		expect(parseDataUri('data:image/png;base64,@@@')).toEqual({ ok: false, reason: 'invalid' });
	});
});

function crc32(data: Uint8Array): number {
	let crc = 0xffffffff;
	for (let index = 0; index < data.length; index += 1) {
		crc ^= data[index] ?? 0;
		for (let bit = 0; bit < 8; bit += 1) {
			const mask = -(crc & 1);
			crc = (crc >>> 1) ^ (0xedb88320 & mask);
		}
	}
	return (crc ^ 0xffffffff) >>> 0;
}

function zipBytes(
	entries: {
		name: string;
		data: Uint8Array;
		method?: number;
		flags?: number;
		payload?: Uint8Array;
		uncompressed?: number;
	}[]
): Uint8Array {
	const parts: Uint8Array[] = [];
	const centrals: Uint8Array[] = [];
	let offset = 0;
	for (let index = 0; index < entries.length; index += 1) {
		const entry = entries[index];
		if (entry === undefined) {
			continue;
		}
		const name = new TextEncoder().encode(entry.name);
		const method = entry.method ?? 0;
		const flags = entry.flags ?? 0x800;
		const payload = entry.payload ?? entry.data;
		const uncompressed = entry.uncompressed ?? entry.data.length;
		const local = new Uint8Array(30 + name.length);
		const localView = new DataView(local.buffer);
		localView.setUint32(0, 0x04034b50, true);
		localView.setUint16(4, 20, true);
		localView.setUint16(6, flags, true);
		localView.setUint16(8, method, true);
		localView.setUint32(14, crc32(entry.data), true);
		localView.setUint32(18, payload.length, true);
		localView.setUint32(22, uncompressed, true);
		localView.setUint16(26, name.length, true);
		local.set(name, 30);
		parts.push(local, payload);
		const central = new Uint8Array(46 + name.length);
		const centralView = new DataView(central.buffer);
		centralView.setUint32(0, 0x02014b50, true);
		centralView.setUint16(4, 20, true);
		centralView.setUint16(6, 20, true);
		centralView.setUint16(8, flags, true);
		centralView.setUint16(10, method, true);
		centralView.setUint32(16, crc32(entry.data), true);
		centralView.setUint32(20, payload.length, true);
		centralView.setUint32(24, uncompressed, true);
		centralView.setUint16(28, name.length, true);
		centralView.setUint32(42, offset, true);
		central.set(name, 46);
		centrals.push(central);
		offset += local.length + payload.length;
	}
	const cdSize = centrals.reduce((sum, part) => sum + part.length, 0);
	const eocd = new Uint8Array(22);
	const eocdView = new DataView(eocd.buffer);
	eocdView.setUint32(0, 0x06054b50, true);
	eocdView.setUint16(8, entries.length, true);
	eocdView.setUint16(10, entries.length, true);
	eocdView.setUint32(12, cdSize, true);
	eocdView.setUint32(16, offset, true);
	const length = offset + cdSize + eocd.length;
	const zip = new Uint8Array(length);
	let cursor = 0;
	for (let index = 0; index < parts.length; index += 1) {
		const part = parts[index];
		if (part === undefined) {
			continue;
		}
		zip.set(part, cursor);
		cursor += part.length;
	}
	for (let index = 0; index < centrals.length; index += 1) {
		const part = centrals[index];
		if (part === undefined) {
			continue;
		}
		zip.set(part, cursor);
		cursor += part.length;
	}
	zip.set(eocd, cursor);
	return zip;
}

describe('file kinds', () => {
	it('recognises a zip by name or mime type', () => {
		expect(isZipFile({ name: 'fotos.ZIP', type: '' })).toBe(true);
		expect(isZipFile({ name: 'fotos', type: 'application/x-zip-compressed' })).toBe(true);
		expect(isZipFile({ name: 'fotos', type: 'application/zip; charset=binary' })).toBe(true);
		expect(isZipFile({ name: 'foto.png', type: 'image/png' })).toBe(false);
	});

	it('recognises image names and mime types', () => {
		expect(looksLikeImage({ name: 'foto.JPEG', type: '' })).toBe(true);
		expect(looksLikeImage({ name: 'sem-extensao', type: 'image/webp' })).toBe(true);
		expect(looksLikeImage({ name: 'notas.txt', type: '' })).toBe(false);
	});
});

describe('readZipImages', () => {
	const text = new TextEncoder().encode('hello');

	it('returns stored and deflated images in name order and skips the rest', async () => {
		const zip = zipBytes([
			{ name: 'notes/readme.txt', data: text },
			{ name: 'b.png', data: png },
			{ name: 'dir/', data: new Uint8Array() },
			{ name: 'a/a.png', data: png, method: 8, payload: deflateRawSync(png) }
		]);
		const read = await readZipImages(zip, 10);
		expect(read.ok).toBe(true);
		if (read.ok) {
			expect(read.images.map((image) => image.name)).toEqual(['a/a.png', 'b.png']);
			const first = read.images[0];
			expect(first?.bytes).toEqual(png);
			expect(read.skipped).toBe(1);
			expect(read.truncated).toBe(false);
		}
	});

	it('stops at the caller limit', async () => {
		const zip = zipBytes([
			{ name: 'b.png', data: png },
			{ name: 'a.png', data: png }
		]);
		const read = await readZipImages(zip, 1);
		expect(read).toMatchObject({ ok: true, truncated: true, skipped: 0 });
		if (read.ok) {
			expect(read.images).toHaveLength(1);
		}
	});

	it('stops when an entry declares more bytes than the safety limit', async () => {
		const huge = 50 * 1024 * 1024;
		const only = zipBytes([{ name: 'a.png', data: png, uncompressed: huge }]);
		expect(await readZipImages(only, 10)).toEqual({ ok: false, reason: 'tooBig' });
		const later = zipBytes([
			{ name: 'a.png', data: png },
			{ name: 'b.png', data: png, uncompressed: huge }
		]);
		const read = await readZipImages(later, 10);
		expect(read).toMatchObject({ ok: true, oversized: true, truncated: false, skipped: 0 });
		if (read.ok) {
			expect(read.images).toHaveLength(1);
		}
	});

	it('reports encrypted, invalid and unsupported archives', async () => {
		const locked = zipBytes([{ name: 'a.png', data: png, flags: 1 }]);
		expect(await readZipImages(locked, 10)).toEqual({ ok: false, reason: 'encrypted' });
		expect(await readZipImages(new Uint8Array([1, 2, 3]), 10)).toEqual({ ok: false, reason: 'invalid' });
		const exotic = zipBytes([{ name: 'a.png', data: png, method: 12 }]);
		expect(await readZipImages(exotic, 10)).toEqual({ ok: false, reason: 'unsupported' });
	});
});

describe('names and snippets', () => {
	it('derives names and extensions', () => {
		expect(baseName('foto.final.png')).toBe('foto.final');
		expect(baseName('.png')).toBe('.png');
		expect(extensionFor('image/jpeg')).toBe('jpg');
		expect(extensionFor('image/webp')).toBe('webp');
	});
	it('builds snippets', () => {
		expect(imgSnippet('data:x', { width: 2, height: 3 })).toBe(
			'<img src="data:x" width="2" height="3" alt="">'
		);
		expect(cssSnippet('data:x')).toBe('background-image: url("data:x");');
	});
});
