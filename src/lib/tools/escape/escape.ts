import { namedEntityCodePoint } from './entities';

export type EscapeFormat = 'html' | 'json' | 'js' | 'unicode' | 'xml' | 'csv';
export const ESCAPE_FORMATS: EscapeFormat[] = ['html', 'json', 'js', 'unicode', 'xml', 'csv'];
export type EscapeMode = 'escape' | 'unescape';
export type QuoteStyle = 'single' | 'double';

export type EscapeOptions = {
	/** HTML: also encode every non-ASCII code point as a numeric entity. */
	nonAscii: boolean;
	/** JS: quote used for the surrounding literal (also escaped inside). */
	quote: QuoteStyle;
	/** Unicode: encode all code points, not only non-ASCII. */
	allCharacters: boolean;
};

export const DEFAULT_ESCAPE_OPTIONS: EscapeOptions = {
	nonAscii: false,
	quote: 'single',
	allCharacters: false
};

export type EscapeResult = { ok: true; output: string } | { ok: false; message: string };

function hex4(unit: number): string {
	return unit.toString(16).toUpperCase().padStart(4, '0');
}

function fail(message: string): EscapeResult {
	return { ok: false, message };
}

// ---------------------------------------------------------------- HTML / XML

const XML_MAP: Record<string, string> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&apos;'
};

function escapeEntities(input: string, nonAscii: boolean, apos: string): string {
	let output = '';
	for (const char of input) {
		const point = char.codePointAt(0) ?? 0;
		if (char === "'") {
			output += apos;
		} else if (Object.hasOwn(XML_MAP, char)) {
			output += XML_MAP[char];
		} else if (nonAscii && point > 0x7e) {
			output += `&#${point};`;
		} else {
			output += char;
		}
	}
	return output;
}

export function escapeHtml(input: string, nonAscii: boolean): string {
	return escapeEntities(input, nonAscii, '&#39;');
}

export function escapeXml(input: string): string {
	return escapeEntities(input, false, '&apos;');
}

const ENTITY_PATTERN = /&(?:#(\d+)|#[xX]([0-9a-fA-F]+)|([A-Za-z][A-Za-z0-9]*));/g;

function codePointToString(point: number): string | undefined {
	if (point === 0 || point > 0x10ffff || (point >= 0xd800 && point <= 0xdfff)) {
		return undefined;
	}
	return String.fromCodePoint(point);
}

/** Unknown or invalid entities are left untouched. */
export function unescapeHtml(input: string, xmlOnly = false): string {
	return input.replace(ENTITY_PATTERN, (match, dec?: string, hex?: string, name?: string) => {
		if (dec !== undefined) {
			return codePointToString(Number.parseInt(dec, 10)) ?? match;
		}
		if (hex !== undefined) {
			return codePointToString(Number.parseInt(hex, 16)) ?? match;
		}
		if (name !== undefined) {
			if (xmlOnly && !['amp', 'lt', 'gt', 'quot', 'apos'].includes(name)) {
				return match;
			}
			const point = namedEntityCodePoint(name);
			return point === undefined ? match : String.fromCodePoint(point);
		}
		return match;
	});
}

// ---------------------------------------------------------------- JSON

export function escapeJsonString(input: string): string {
	return JSON.stringify(input);
}

export function unescapeJsonString(input: string): EscapeResult {
	const trimmed = input.trim();
	const quoted = trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"');
	const candidate = quoted ? trimmed : `"${trimmed}"`;
	try {
		const parsed: unknown = JSON.parse(candidate);
		if (typeof parsed === 'string') {
			return { ok: true, output: parsed };
		}
		return fail('The text is not a JSON string.');
	} catch (error) {
		const detail = error instanceof Error ? error.message : String(error);
		return fail(
			`Invalid JSON string escape (${detail}). Unescaped quotes, raw line breaks and sequences other than \\n \\t \\r \\b \\f \\" \\\\ \\/ \\uXXXX are not allowed.`
		);
	}
}

// ---------------------------------------------------------------- JavaScript

export function escapeJsString(input: string, quote: QuoteStyle): string {
	const quoteChar = quote === 'single' ? "'" : '"';
	let output = '';
	for (const char of input) {
		const point = char.codePointAt(0) ?? 0;
		if (char === '\\') {
			output += '\\\\';
		} else if (char === quoteChar) {
			output += `\\${char}`;
		} else if (char === '\n') {
			output += '\\n';
		} else if (char === '\r') {
			output += '\\r';
		} else if (char === '\t') {
			output += '\\t';
		} else if (char === '\b') {
			output += '\\b';
		} else if (char === '\f') {
			output += '\\f';
		} else if (char === '\v') {
			output += '\\v';
		} else if (point < 0x20 || (point >= 0x7f && point <= 0x9f)) {
			output += `\\x${point.toString(16).toUpperCase().padStart(2, '0')}`;
		} else if (point === 0x2028 || point === 0x2029) {
			output += `\\u${hex4(point)}`;
		} else if (point > 0xffff) {
			output += `\\u{${point.toString(16).toUpperCase()}}`;
		} else if (point >= 0xd800 && point <= 0xdfff) {
			output += `\\u${hex4(point)}`;
		} else {
			output += char;
		}
	}
	return `${quoteChar}${output}${quoteChar}`;
}

const SIMPLE_ESCAPES: Record<string, string> = {
	n: '\n',
	r: '\r',
	t: '\t',
	b: '\b',
	f: '\f',
	v: '\v',
	'0': '\0',
	'\\': '\\',
	"'": "'",
	'"': '"',
	'`': '`'
};

/** Decodes backslash escapes in the style of JavaScript/JSON. `strictJson` limits the set to JSON's. */
function decodeBackslashes(body: string, allowExtended: boolean): EscapeResult {
	let output = '';
	let index = 0;
	while (index < body.length) {
		const char = body[index];
		if (char !== '\\') {
			output += char;
			index += 1;
			continue;
		}
		const next = body[index + 1];
		if (next === undefined) {
			return fail(`Dangling backslash at position ${index + 1}. Use \\\\ for a literal backslash.`);
		}
		if (next === 'u') {
			if (body[index + 2] === '{' && allowExtended) {
				const end = body.indexOf('}', index + 3);
				const digits = end === -1 ? '' : body.slice(index + 3, end);
				if (!/^[0-9a-fA-F]{1,6}$/.test(digits) || Number.parseInt(digits, 16) > 0x10ffff) {
					return fail(`Invalid \\u{...} escape at position ${index + 1}.`);
				}
				output += String.fromCodePoint(Number.parseInt(digits, 16));
				index = end + 1;
				continue;
			}
			const digits = body.slice(index + 2, index + 6);
			if (!/^[0-9a-fA-F]{4}$/.test(digits)) {
				return fail(`Invalid \\u escape at position ${index + 1}: expected 4 hex digits.`);
			}
			output += String.fromCharCode(Number.parseInt(digits, 16));
			index += 6;
			continue;
		}
		if (next === 'x' && allowExtended) {
			const digits = body.slice(index + 2, index + 4);
			if (!/^[0-9a-fA-F]{2}$/.test(digits)) {
				return fail(`Invalid \\x escape at position ${index + 1}: expected 2 hex digits.`);
			}
			output += String.fromCharCode(Number.parseInt(digits, 16));
			index += 4;
			continue;
		}
		if (next === '\n' && allowExtended) {
			index += 2;
			continue;
		}
		if (Object.hasOwn(SIMPLE_ESCAPES, next)) {
			output += SIMPLE_ESCAPES[next];
			index += 2;
			continue;
		}
		return fail(`Unknown escape "\\${next}" at position ${index + 1}. Use \\\\ for a literal backslash.`);
	}
	return { ok: true, output };
}

export function unescapeJsString(input: string): EscapeResult {
	const trimmed = input.trim();
	const first = trimmed[0];
	let body = input;
	if (
		trimmed.length >= 2 &&
		(first === "'" || first === '"' || first === '`') &&
		trimmed.endsWith(first)
	) {
		body = trimmed.slice(1, -1);
	}
	return decodeBackslashes(body, true);
}

// ---------------------------------------------------------------- Unicode

export function escapeUnicode(input: string, allCharacters: boolean): string {
	let output = '';
	for (const char of input) {
		const point = char.codePointAt(0) ?? 0;
		if (!allCharacters && point < 0x80) {
			output += char;
		} else if (point > 0xffff) {
			const offset = point - 0x10000;
			const high = 0xd800 + (offset >> 10);
			const low = 0xdc00 + (offset & 0x3ff);
			output += `\\u${hex4(high)}\\u${hex4(low)}`;
		} else {
			output += `\\u${hex4(point)}`;
		}
	}
	return output;
}

export function unescapeUnicode(input: string): EscapeResult {
	let output = '';
	let index = 0;
	while (index < input.length) {
		const char = input[index];
		if (char !== '\\' || input[index + 1] !== 'u') {
			output += char;
			index += 1;
			continue;
		}
		if (input[index + 2] === '{') {
			const end = input.indexOf('}', index + 3);
			const digits = end === -1 ? '' : input.slice(index + 3, end);
			if (!/^[0-9a-fA-F]{1,6}$/.test(digits) || Number.parseInt(digits, 16) > 0x10ffff) {
				return fail(`Invalid \\u{...} escape at position ${index + 1}.`);
			}
			output += String.fromCodePoint(Number.parseInt(digits, 16));
			index = end + 1;
			continue;
		}
		const digits = input.slice(index + 2, index + 6);
		if (!/^[0-9a-fA-F]{4}$/.test(digits)) {
			return fail(`Invalid \\u escape at position ${index + 1}: expected 4 hex digits (\\uXXXX).`);
		}
		output += String.fromCharCode(Number.parseInt(digits, 16));
		index += 6;
	}
	return { ok: true, output };
}

// ---------------------------------------------------------------- CSV

export function escapeCsvField(input: string): string {
	return `"${input.replaceAll('"', '""')}"`;
}

export function unescapeCsvField(input: string): EscapeResult {
	const trimmed = input.trim();
	if (!trimmed.startsWith('"')) {
		return { ok: true, output: input };
	}
	if (trimmed.length < 2 || !trimmed.endsWith('"')) {
		return fail('The field starts with a quote but does not end with one.');
	}
	const body = trimmed.slice(1, -1);
	if (body.replaceAll('""', '').includes('"')) {
		return fail('Found a single quote inside the field. Inside quotes, a quote must be doubled ("").');
	}
	return { ok: true, output: body.replaceAll('""', '"') };
}

// ---------------------------------------------------------------- dispatch

export function runEscape(
	format: EscapeFormat,
	mode: EscapeMode,
	input: string,
	options: EscapeOptions
): EscapeResult {
	if (mode === 'escape') {
		switch (format) {
			case 'html':
				return { ok: true, output: escapeHtml(input, options.nonAscii) };
			case 'xml':
				return { ok: true, output: escapeXml(input) };
			case 'json':
				return { ok: true, output: escapeJsonString(input) };
			case 'js':
				return { ok: true, output: escapeJsString(input, options.quote) };
			case 'unicode':
				return { ok: true, output: escapeUnicode(input, options.allCharacters) };
			case 'csv':
				return { ok: true, output: escapeCsvField(input) };
		}
	}
	switch (format) {
		case 'html':
			return { ok: true, output: unescapeHtml(input) };
		case 'xml':
			return { ok: true, output: unescapeHtml(input, true) };
		case 'json':
			return unescapeJsonString(input);
		case 'js':
			return unescapeJsString(input);
		case 'unicode':
			return unescapeUnicode(input);
		case 'csv':
			return unescapeCsvField(input);
	}
}
