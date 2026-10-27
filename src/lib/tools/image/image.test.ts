import { describe, expect, it } from 'vitest';
import {
	baseName,
	buildDataUri,
	cssSnippet,
	extensionFor,
	formatPercent,
	imgSnippet,
	parseDataUri,
	percentSaved,
	sniffMime,
	targetSize
} from './image';

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
