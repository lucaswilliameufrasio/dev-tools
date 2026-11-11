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

/** How many images the editor will walk through from one drop. */
export const MAX_QUEUE = 100;

const MAX_ZIP_ENTRY = 40 * 1024 * 1024;
/** Uncompressed images kept from one zip, and the largest zip file read into memory. */
export const MAX_ZIP_BYTES = 80 * 1024 * 1024;
const ZIP_TYPES = new Set(['application/zip', 'application/x-zip', 'application/x-zip-compressed']);
const IMAGE_EXTENSIONS = new Set([
	'png',
	'jpg',
	'jpeg',
	'jfif',
	'gif',
	'webp',
	'bmp',
	'avif',
	'svg',
	'ico',
	'tif',
	'tiff',
	'heic',
	'heif'
]);

export function isZipFile(file: { name: string; type: string }): boolean {
	const name = file.name.trim().toLowerCase();
	if (name.endsWith('.zip')) {
		return true;
	}
	const type = file.type.trim().toLowerCase().split(';', 1)[0]?.trim() ?? '';
	return ZIP_TYPES.has(type);
}

export function looksLikeImage(file: { name: string; type: string }): boolean {
	const type = file.type.trim().toLowerCase().split(';', 1)[0]?.trim() ?? '';
	if (type.startsWith('image/')) {
		return true;
	}
	const name = file.name.trim().toLowerCase();
	const dot = name.lastIndexOf('.');
	if (dot < 0 || dot === name.length - 1) {
		return false;
	}
	return IMAGE_EXTENSIONS.has(name.slice(dot + 1));
}

export type ZipImage = { name: string; bytes: Uint8Array };

export type ZipRead =
	| { ok: true; images: ZipImage[]; skipped: number; truncated: boolean; oversized: boolean }
	| { ok: false; reason: 'invalid' | 'encrypted' | 'unsupported' | 'tooBig' };

function readU16(bytes: Uint8Array, offset: number): number | undefined {
	const low = bytes[offset];
	const high = bytes[offset + 1];
	if (low === undefined || high === undefined) {
		return undefined;
	}
	return low | (high << 8);
}

function readU32(bytes: Uint8Array, offset: number): number | undefined {
	const b0 = bytes[offset];
	const b1 = bytes[offset + 1];
	const b2 = bytes[offset + 2];
	const b3 = bytes[offset + 3];
	if (b0 === undefined || b1 === undefined || b2 === undefined || b3 === undefined) {
		return undefined;
	}
	return (b0 | (b1 << 8) | (b2 << 16) | (b3 << 24)) >>> 0;
}

function findEocd(bytes: Uint8Array): number | undefined {
	if (bytes.length < 22) {
		return undefined;
	}
	const start = Math.max(0, bytes.length - 22 - 65535);
	for (let offset = bytes.length - 22; offset >= start; offset -= 1) {
		if (
			bytes[offset] !== 0x50 ||
			bytes[offset + 1] !== 0x4b ||
			bytes[offset + 2] !== 0x05 ||
			bytes[offset + 3] !== 0x06
		) {
			continue;
		}
		const commentLength = readU16(bytes, offset + 20);
		if (commentLength !== undefined && offset + 22 + commentLength <= bytes.length) {
			return offset;
		}
	}
	return undefined;
}

/** Drops empty, current and parent segments so a zip name cannot climb out of the archive. */
function safeZipName(raw: string): string | undefined {
	const normalized = raw.replaceAll('\\', '/').replace(/^\/+/, '');
	if (normalized === '' || normalized.endsWith('/')) {
		return undefined;
	}
	const parts: string[] = [];
	const pieces = normalized.split('/');
	for (let index = 0; index < pieces.length; index += 1) {
		const part = pieces[index];
		if (part === undefined || part === '' || part === '.' || part === '..') {
			continue;
		}
		parts.push(part);
	}
	if (parts.length === 0) {
		return undefined;
	}
	const name = parts.join('/');
	if (name.startsWith('__MACOSX/') || name === '__MACOSX') {
		return undefined;
	}
	return name;
}

type ZipEntry = {
	name: string;
	method: number;
	compressedSize: number;
	uncompressedSize: number;
	dataOffset: number;
};

function parseZip(bytes: Uint8Array): { ok: true; entries: ZipEntry[] } | { ok: false; reason: 'invalid' | 'encrypted' | 'unsupported' } {
	const eocd = findEocd(bytes);
	if (eocd === undefined) {
		return { ok: false, reason: 'invalid' };
	}
	const disk = readU16(bytes, eocd + 4);
	const cdDisk = readU16(bytes, eocd + 6);
	const total = readU16(bytes, eocd + 10);
	const cdSize = readU32(bytes, eocd + 12);
	const cdOffset = readU32(bytes, eocd + 16);
	if (
		disk === undefined ||
		cdDisk === undefined ||
		total === undefined ||
		cdSize === undefined ||
		cdOffset === undefined
	) {
		return { ok: false, reason: 'invalid' };
	}
	if (disk !== 0 || cdDisk !== 0 || total === 0xffff || cdOffset === 0xffffffff || cdSize === 0xffffffff) {
		return { ok: false, reason: 'unsupported' };
	}
	if (cdOffset + cdSize > bytes.length) {
		return { ok: false, reason: 'invalid' };
	}
	const entries: ZipEntry[] = [];
	let cursor = cdOffset;
	const end = cdOffset + cdSize;
	for (let index = 0; index < total; index += 1) {
		if (cursor + 46 > end) {
			return { ok: false, reason: 'invalid' };
		}
		if (readU32(bytes, cursor) !== 0x02014b50) {
			return { ok: false, reason: 'invalid' };
		}
		const flags = readU16(bytes, cursor + 8);
		const method = readU16(bytes, cursor + 10);
		const compressedSize = readU32(bytes, cursor + 20);
		const uncompressedSize = readU32(bytes, cursor + 24);
		const nameLength = readU16(bytes, cursor + 28);
		const extraLength = readU16(bytes, cursor + 30);
		const commentLength = readU16(bytes, cursor + 32);
		const localOffset = readU32(bytes, cursor + 42);
		if (
			flags === undefined ||
			method === undefined ||
			compressedSize === undefined ||
			uncompressedSize === undefined ||
			nameLength === undefined ||
			extraLength === undefined ||
			commentLength === undefined ||
			localOffset === undefined
		) {
			return { ok: false, reason: 'invalid' };
		}
		const nameStart = cursor + 46;
		const nameEnd = nameStart + nameLength;
		if (nameEnd + extraLength + commentLength > end) {
			return { ok: false, reason: 'invalid' };
		}
		cursor = nameEnd + extraLength + commentLength;
		if ((flags & 1) !== 0) {
			return { ok: false, reason: 'encrypted' };
		}
		if (compressedSize === 0xffffffff || uncompressedSize === 0xffffffff || localOffset === 0xffffffff) {
			return { ok: false, reason: 'unsupported' };
		}
		const name = safeZipName(new TextDecoder('utf-8').decode(bytes.subarray(nameStart, nameEnd)));
		if (name === undefined) {
			continue;
		}
		if (localOffset + 30 > bytes.length || readU32(bytes, localOffset) !== 0x04034b50) {
			return { ok: false, reason: 'invalid' };
		}
		const localNameLength = readU16(bytes, localOffset + 26);
		const localExtraLength = readU16(bytes, localOffset + 28);
		if (localNameLength === undefined || localExtraLength === undefined) {
			return { ok: false, reason: 'invalid' };
		}
		const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
		if (dataOffset + compressedSize > bytes.length) {
			return { ok: false, reason: 'invalid' };
		}
		entries.push({ name, method, compressedSize, uncompressedSize, dataOffset });
	}
	return { ok: true, entries };
}

/** Copies a view into an ArrayBuffer that Blob and File accept. */
function ownedBuffer(bytes: Uint8Array): ArrayBuffer {
	if (
		bytes.buffer instanceof ArrayBuffer &&
		bytes.byteOffset === 0 &&
		bytes.byteLength === bytes.buffer.byteLength
	) {
		return bytes.buffer;
	}
	const copy = new ArrayBuffer(bytes.byteLength);
	new Uint8Array(copy).set(bytes);
	return copy;
}

export function fileFromBytes(name: string, bytes: Uint8Array, type: string): File {
	return new File([ownedBuffer(bytes)], name, { type });
}

async function inflateRaw(payload: Uint8Array): Promise<Uint8Array | undefined> {
	if (typeof DecompressionStream !== 'function') {
		return undefined;
	}
	try {
		const stream = new Blob([ownedBuffer(payload)]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
		const buffer = await new Response(stream).arrayBuffer();
		return new Uint8Array(buffer);
	} catch {
		return undefined;
	}
}

/** Images inside a zip, in name order. Other entries are counted as skipped. */
export async function readZipImages(bytes: Uint8Array, limit: number): Promise<ZipRead> {
	const parsed = parseZip(bytes);
	if (!parsed.ok) {
		return parsed;
	}
	const images: ZipImage[] = [];
	let skipped = 0;
	let unsupportedImages = 0;
	let truncated = false;
	let oversized = false;
	let total = 0;
	for (let index = 0; index < parsed.entries.length; index += 1) {
		const entry = parsed.entries[index];
		if (entry === undefined) {
			continue;
		}
		if (images.length >= limit) {
			truncated = true;
			break;
		}
		if (entry.method !== 0 && entry.method !== 8) {
			skipped += 1;
			if (looksLikeImage({ name: entry.name, type: '' })) {
				unsupportedImages += 1;
			}
			continue;
		}
		if (entry.uncompressedSize > MAX_ZIP_ENTRY) {
			if (images.length === 0) {
				return { ok: false, reason: 'tooBig' };
			}
			oversized = true;
			break;
		}
		const payload = bytes.subarray(entry.dataOffset, entry.dataOffset + entry.compressedSize);
		const raw = entry.method === 0 ? payload.slice() : await inflateRaw(payload);
		if (raw === undefined) {
			skipped += 1;
			if (looksLikeImage({ name: entry.name, type: '' })) {
				unsupportedImages += 1;
			}
			continue;
		}
		if (raw.byteLength > MAX_ZIP_ENTRY || total + raw.byteLength > MAX_ZIP_BYTES) {
			if (images.length === 0) {
				return { ok: false, reason: 'tooBig' };
			}
			oversized = true;
			break;
		}
		if (sniffMime(raw) === undefined) {
			skipped += 1;
			continue;
		}
		total += raw.byteLength;
		images.push({ name: entry.name, bytes: raw });
	}
	if (images.length === 0 && unsupportedImages > 0) {
		return { ok: false, reason: 'unsupported' };
	}
	images.sort((left, right) => left.name.localeCompare(right.name));
	return { ok: true, images, skipped, truncated, oversized };
}
