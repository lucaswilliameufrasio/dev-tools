export type ErrorLevel = 'L' | 'M' | 'Q' | 'H';
export const ERROR_LEVELS: ErrorLevel[] = ['L', 'M', 'Q', 'H'];

export type WifiSecurity = 'WPA' | 'WEP' | 'nopass';

export type QrOptions = {
	level: ErrorLevel;
	size: number;
	margin: number;
	dark: string;
	light: string;
};

export const SIZE_RANGE = { min: 128, max: 1024 } as const;
export const MARGIN_RANGE = { min: 0, max: 8 } as const;
export const MIN_CONTRAST = 3;

export function isErrorLevel(value: string): value is ErrorLevel {
	return value === 'L' || value === 'M' || value === 'Q' || value === 'H';
}

export function isWifiSecurity(value: string): value is WifiSecurity {
	return value === 'WPA' || value === 'WEP' || value === 'nopass';
}

export function escapeWifi(value: string): string {
	return value.replace(/[\\;,:"]/g, (char) => `\\${char}`);
}

export function buildWifi(ssid: string, password: string, security: WifiSecurity, hidden: boolean): string {
	const parts = [`WIFI:T:${security};S:${escapeWifi(ssid)};`];
	if (security !== 'nopass') {
		parts.push(`P:${escapeWifi(password)};`);
	}
	if (hidden) {
		parts.push('H:true;');
	}
	parts.push(';');
	return parts.join('');
}

function escapeVcard(value: string): string {
	return value
		.replace(/\\/g, '\\\\')
		.replace(/\r\n|\r|\n/g, '\\n')
		.replace(/[;,]/g, (char) => `\\${char}`);
}

export function buildVcard(name: string, phone: string, email: string, organization: string): string {
	const lines = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${escapeVcard(name)}`];
	if (organization !== '') {
		lines.push(`ORG:${escapeVcard(organization)}`);
	}
	if (phone !== '') {
		lines.push(`TEL:${escapeVcard(phone)}`);
	}
	if (email !== '') {
		lines.push(`EMAIL:${escapeVcard(email)}`);
	}
	lines.push('END:VCARD');
	return lines.join('\n');
}

function clampInteger(value: number, min: number, max: number): number {
	if (!Number.isFinite(value)) {
		return min;
	}
	return Math.min(max, Math.max(min, Math.round(value)));
}

export function normalizeOptions(options: QrOptions): QrOptions {
	return {
		...options,
		size: clampInteger(options.size, SIZE_RANGE.min, SIZE_RANGE.max),
		margin: clampInteger(options.margin, MARGIN_RANGE.min, MARGIN_RANGE.max)
	};
}

export type RgbResult = { ok: true; r: number; g: number; b: number } | { ok: false };

export function parseHexColor(hex: string): RgbResult {
	const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
	const digits = match?.[1];
	if (digits === undefined) {
		return { ok: false };
	}
	const full =
		digits.length === 3
			? digits
					.split('')
					.map((char) => char + char)
					.join('')
			: digits;
	return {
		ok: true,
		r: parseInt(full.slice(0, 2), 16),
		g: parseInt(full.slice(2, 4), 16),
		b: parseInt(full.slice(4, 6), 16)
	};
}

function channel(value: number): number {
	const scaled = value / 255;
	return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

function luminance(color: { r: number; g: number; b: number }): number {
	return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
}

/** WCAG contrast ratio between two hex colours, or undefined when either is invalid. */
export function contrastRatio(a: string, b: string): number | undefined {
	const first = parseHexColor(a);
	const second = parseHexColor(b);
	if (!first.ok || !second.ok) {
		return undefined;
	}
	const la = luminance(first);
	const lb = luminance(second);
	return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Scanners expect dark modules on a light background. */
export function isInverted(dark: string, light: string): boolean {
	const first = parseHexColor(dark);
	const second = parseHexColor(light);
	if (!first.ok || !second.ok) {
		return false;
	}
	return luminance(first) > luminance(second);
}

export function looksLikeUrl(text: string): boolean {
	const trimmed = text.trim();
	if (/\s/.test(trimmed)) {
		return false;
	}
	try {
		const url = new URL(trimmed);
		return url.protocol === 'http:' || url.protocol === 'https:';
	} catch {
		return false;
	}
}
