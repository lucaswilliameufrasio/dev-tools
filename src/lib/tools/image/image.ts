export type ImageMime =
	| 'image/png'
	| 'image/jpeg'
	| 'image/webp'
	| 'image/gif'
	| 'image/bmp'
	| 'image/avif'
	| 'image/svg+xml'
	| 'image/x-icon';

export type OutputFormat = 'image/png' | 'image/jpeg' | 'image/webp';
export const OUTPUT_FORMATS: OutputFormat[] = ['image/png', 'image/jpeg', 'image/webp'];
export const MAX_DIMENSION = 8192;

export function isOutputFormat(value: string): value is OutputFormat {
	return value === 'image/png' || value === 'image/jpeg' || value === 'image/webp';
}

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
	if (bytes.length < offset + signature.length) {
		return false;
	}
	for (let index = 0; index < signature.length; index += 1) {
		if (bytes[offset + index] !== signature[index]) {
			return false;
		}
	}
	return true;
}

/** Detects the image type from magic bytes; undefined when it is not a known image. */
export function sniffMime(bytes: Uint8Array): ImageMime | undefined {
	if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
		return 'image/png';
	}
	if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
		return 'image/jpeg';
	}
	if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) {
		return 'image/gif';
	}
	if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
		return 'image/webp';
	}
	if (startsWith(bytes, [0x42, 0x4d])) {
		return 'image/bmp';
	}
	if (startsWith(bytes, [0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66], 4)) {
		return 'image/avif';
	}
	if (startsWith(bytes, [0x00, 0x00, 0x01, 0x00])) {
		return 'image/x-icon';
	}
	const head = new TextDecoder().decode(bytes.subarray(0, 512)).trimStart().toLowerCase();
	if (head.includes('<svg') && (head.startsWith('<') || head.startsWith('﻿<'))) {
		return 'image/svg+xml';
	}
	return undefined;
}

export function extensionFor(mime: string): string {
	switch (mime) {
		case 'image/jpeg':
			return 'jpg';
		case 'image/svg+xml':
			return 'svg';
		case 'image/x-icon':
			return 'ico';
		default:
			return mime.replace(/^image\//, '') || 'bin';
	}
}

export function baseName(filename: string): string {
	const dot = filename.lastIndexOf('.');
	const base = dot > 0 ? filename.slice(0, dot) : filename;
	return base === '' ? 'image' : base;
}

export type Size = { width: number; height: number };

function positiveInteger(value: number | undefined): number | undefined {
	if (value === undefined || !Number.isFinite(value) || value < 1) {
		return undefined;
	}
	return Math.min(MAX_DIMENSION, Math.round(value));
}

/**
 * Target dimensions. With keepAspect the image is only scaled down to fit inside
 * the limits; without it the given limits are used exactly (missing ones keep the original).
 */
export function targetSize(
	original: Size,
	maxWidth: number | undefined,
	maxHeight: number | undefined,
	keepAspect: boolean
): Size {
	const limitW = positiveInteger(maxWidth);
	const limitH = positiveInteger(maxHeight);
	if (!keepAspect) {
		return { width: limitW ?? original.width, height: limitH ?? original.height };
	}
	let scale = 1;
	if (limitW !== undefined) {
		scale = Math.min(scale, limitW / original.width);
	}
	if (limitH !== undefined) {
		scale = Math.min(scale, limitH / original.height);
	}
	return {
		width: Math.max(1, Math.round(original.width * scale)),
		height: Math.max(1, Math.round(original.height * scale))
	};
}

/** Percentage saved relative to the original (negative when the result is larger). */
export function percentSaved(original: number, result: number): number {
	if (original <= 0) {
		return 0;
	}
	return Math.round(((original - result) / original) * 1000) / 10;
}

export function formatPercent(value: number): string {
	const sign = value > 0 ? '-' : value < 0 ? '+' : '';
	return `${sign}${Math.abs(value).toFixed(1)}%`;
}

export function bytesToBase64(bytes: Uint8Array): string {
	const chunk = 0x8000;
	let binary = '';
	for (let offset = 0; offset < bytes.length; offset += chunk) {
		binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
	}
	return btoa(binary);
}

export function buildDataUri(mime: string, bytes: Uint8Array): string {
	return `data:${mime};base64,${bytesToBase64(bytes)}`;
}

export type ParsedDataUri =
	| { ok: true; mime: string; bytes: Uint8Array }
	| { ok: false; reason: 'not-data-uri' | 'not-base64' | 'invalid' };

export function parseDataUri(uri: string): ParsedDataUri {
	const match = /^data:([^,;]*)((?:;[^,;]*)*),(.*)$/s.exec(uri.trim());
	if (!match) {
		return { ok: false, reason: 'not-data-uri' };
	}
	const params = (match[2] ?? '').split(';');
	if (!params.includes('base64')) {
		return { ok: false, reason: 'not-base64' };
	}
	try {
		const binary = atob(match[3] ?? '');
		const bytes = new Uint8Array(binary.length);
		for (let index = 0; index < binary.length; index += 1) {
			bytes[index] = binary.charCodeAt(index);
		}
		return { ok: true, mime: match[1] || 'text/plain', bytes };
	} catch {
		return { ok: false, reason: 'invalid' };
	}
}

function escapeAttribute(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

export function imgSnippet(src: string, size: Size): string {
	return `<img src="${escapeAttribute(src)}" width="${size.width}" height="${size.height}" alt="">`;
}

export function cssSnippet(src: string): string {
	return `background-image: url("${src.replace(/"/g, '%22')}");`;
}
