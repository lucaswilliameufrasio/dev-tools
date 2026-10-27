export const MAX_ROWS = 2000;

export type CategoryGroup =
	| 'letter'
	| 'mark'
	| 'number'
	| 'punctuation'
	| 'symbol'
	| 'separator'
	| 'other';

export type CharFlag = 'invisible' | 'zero-width' | 'bidi' | 'space' | 'control';

export type CodePointInfo = {
	char: string;
	codePoint: number;
	/** `U+XXXX` (at least four hex digits). */
	hex: string;
	utf8: string[];
	utf16: string[];
	/** Two-letter general category such as `Lu`, or `Cn` when unassigned. */
	category: string;
	group: CategoryGroup;
	script: string;
	flags: CharFlag[];
	/** Short readable name for characters that cannot be shown as themselves. */
	label: string | undefined;
	/** Combining marks get a dotted circle so they render on their own. */
	display: string;
};

export type Summary = {
	utf16Length: number;
	codePoints: number;
	graphemes: number | undefined;
	utf8Bytes: number;
	isNfc: boolean;
	isNfd: boolean;
	nfcEqualsNfd: boolean;
	isNfkc: boolean;
	invisibleCount: number;
};

export type Analysis = {
	summary: Summary;
	rows: CodePointInfo[];
	truncated: boolean;
};

const CATEGORIES = [
	'Lu', 'Ll', 'Lt', 'Lm', 'Lo', 'Mn', 'Mc', 'Me', 'Nd', 'Nl', 'No', 'Pc', 'Pd', 'Ps', 'Pe', 'Pi',
	'Pf', 'Po', 'Sm', 'Sc', 'Sk', 'So', 'Zs', 'Zl', 'Zp', 'Cc', 'Cf', 'Cs', 'Co'
] as const;

const CATEGORY_TESTS: { code: string; pattern: RegExp }[] = CATEGORIES.map((code) => ({
	code,
	pattern: new RegExp(`^\\p{${code}}$`, 'u')
}));

export const SCRIPTS = [
	'Latin',
	'Greek',
	'Cyrillic',
	'Arabic',
	'Hebrew',
	'Han',
	'Hiragana',
	'Katakana',
	'Hangul',
	'Thai',
	'Devanagari',
	'Common',
	'Inherited'
] as const;

const SCRIPT_TESTS: { name: string; pattern: RegExp }[] = SCRIPTS.map((name) => ({
	name,
	pattern: new RegExp(`^\\p{Script=${name}}$`, 'u')
}));

const DEFAULT_IGNORABLE = /^\p{Default_Ignorable_Code_Point}$/u;

const GROUP_BY_LETTER: Record<string, CategoryGroup> = {
	L: 'letter',
	M: 'mark',
	N: 'number',
	P: 'punctuation',
	S: 'symbol',
	Z: 'separator',
	C: 'other'
};

const ZERO_WIDTH = new Set([0x200b, 0x200c, 0x200d, 0x2060, 0xfeff]);
const BIDI = new Set([
	0x061c, 0x200e, 0x200f, 0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2066, 0x2067, 0x2068, 0x2069
]);

const NAMES: Record<number, string> = {
	0x00: 'NUL',
	0x09: 'TAB',
	0x0a: 'LF',
	0x0d: 'CR',
	0x1b: 'ESC',
	0x7f: 'DEL',
	0x00a0: 'NBSP',
	0x00ad: 'SHY',
	0x061c: 'ALM',
	0x180e: 'MVS',
	0x200b: 'ZWSP',
	0x200c: 'ZWNJ',
	0x200d: 'ZWJ',
	0x200e: 'LRM',
	0x200f: 'RLM',
	0x2028: 'LS',
	0x2029: 'PS',
	0x202a: 'LRE',
	0x202b: 'RLE',
	0x202c: 'PDF',
	0x202d: 'LRO',
	0x202e: 'RLO',
	0x202f: 'NNBSP',
	0x2060: 'WJ',
	0x2066: 'LRI',
	0x2067: 'RLI',
	0x2068: 'FSI',
	0x2069: 'PDI',
	0x3000: 'IDEOGRAPHIC SPACE',
	0xfeff: 'BOM',
	0xfe0e: 'VS15',
	0xfe0f: 'VS16'
};

function hex(value: number, min: number): string {
	return value.toString(16).toUpperCase().padStart(min, '0');
}

export function utf8Bytes(codePoint: number): number[] {
	if (codePoint < 0x80) {
		return [codePoint];
	}
	if (codePoint < 0x800) {
		return [0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f)];
	}
	if (codePoint < 0x10000) {
		return [0xe0 | (codePoint >> 12), 0x80 | ((codePoint >> 6) & 0x3f), 0x80 | (codePoint & 0x3f)];
	}
	return [
		0xf0 | (codePoint >> 18),
		0x80 | ((codePoint >> 12) & 0x3f),
		0x80 | ((codePoint >> 6) & 0x3f),
		0x80 | (codePoint & 0x3f)
	];
}

export function categoryOf(char: string): string {
	for (const test of CATEGORY_TESTS) {
		if (test.pattern.test(char)) {
			return test.code;
		}
	}
	return 'Cn';
}

export function scriptOf(char: string): string {
	for (const test of SCRIPT_TESTS) {
		if (test.pattern.test(char)) {
			return test.name;
		}
	}
	return 'Other';
}

export function describeCodePoint(char: string): CodePointInfo {
	const codePoint = char.codePointAt(0) ?? 0;
	const category = categoryOf(char);
	const group = GROUP_BY_LETTER[category.charAt(0)] ?? 'other';
	const flags: CharFlag[] = [];
	const isControl = category === 'Cc';
	if (isControl) {
		flags.push('control');
	}
	if (ZERO_WIDTH.has(codePoint)) {
		flags.push('zero-width');
	}
	if (BIDI.has(codePoint)) {
		flags.push('bidi');
	}
	if (category === 'Zs' && codePoint !== 0x20) {
		flags.push('space');
	}
	const invisible =
		flags.includes('zero-width') ||
		flags.includes('bidi') ||
		(DEFAULT_IGNORABLE.test(char) && codePoint !== 0x20) ||
		category === 'Cf' ||
		(codePoint >= 0xe0000 && codePoint <= 0xe007f);
	if (invisible) {
		flags.push('invisible');
	}
	let label = NAMES[codePoint];
	if (label === undefined && (isControl || invisible || category === 'Zl' || category === 'Zp')) {
		label = `U+${hex(codePoint, 4)}`;
	}
	if (label === undefined && category === 'Zs' && codePoint !== 0x20) {
		label = 'SPACE';
	}
	if (label === undefined && category === 'Zs') {
		label = 'SP';
	}
	const utf16: string[] = [];
	for (let index = 0; index < char.length; index += 1) {
		utf16.push(hex(char.charCodeAt(index), 4));
	}
	return {
		char,
		codePoint,
		hex: `U+${hex(codePoint, 4)}`,
		utf8: utf8Bytes(codePoint).map((byte) => hex(byte, 2)),
		utf16,
		category,
		group,
		script: scriptOf(char),
		flags,
		label,
		display: group === 'mark' ? `◌${char}` : char
	};
}

function countGraphemes(text: string): number | undefined {
	if (typeof Intl === 'undefined' || typeof Intl.Segmenter !== 'function') {
		return undefined;
	}
	return Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)).length;
}

export function analyze(text: string, limit = MAX_ROWS): Analysis {
	const rows: CodePointInfo[] = [];
	let codePoints = 0;
	let bytes = 0;
	let invisibleCount = 0;
	for (const char of text) {
		codePoints += 1;
		const point = char.codePointAt(0) ?? 0;
		bytes += utf8Bytes(point).length;
		const needsInfo = rows.length < limit;
		const info = needsInfo ? describeCodePoint(char) : undefined;
		if (info) {
			rows.push(info);
			if (info.flags.includes('invisible')) {
				invisibleCount += 1;
			}
		} else if (isInvisible(char)) {
			invisibleCount += 1;
		}
	}
	const nfc = text.normalize('NFC');
	const nfd = text.normalize('NFD');
	return {
		summary: {
			utf16Length: text.length,
			codePoints,
			graphemes: countGraphemes(text),
			utf8Bytes: bytes,
			isNfc: text === nfc,
			isNfd: text === nfd,
			nfcEqualsNfd: nfc === nfd,
			isNfkc: text === text.normalize('NFKC'),
			invisibleCount
		},
		rows,
		truncated: codePoints > limit
	};
}

function isInvisible(char: string): boolean {
	return describeCodePoint(char).flags.includes('invisible');
}

export type NormalForm = 'NFC' | 'NFD' | 'NFKC' | 'NFKD';
export const NORMAL_FORMS: NormalForm[] = ['NFC', 'NFD', 'NFKC', 'NFKD'];

export function normalizeText(text: string, form: NormalForm): string {
	return text.normalize(form);
}

/**
 * Removes zero-width, bidi, soft hyphen, BOM, tag and other default-ignorable characters.
 * Line breaks and tabs stay. With `keepEmoji`, ZWJ and VS16 survive so emoji sequences are not broken.
 */
export function stripInvisible(text: string, keepEmoji = true): string {
	let output = '';
	for (const char of text) {
		const point = char.codePointAt(0) ?? 0;
		if (keepEmoji && (point === 0x200d || point === 0xfe0f)) {
			output += char;
			continue;
		}
		const info = describeCodePoint(char);
		if (info.flags.includes('invisible') && !info.flags.includes('control')) {
			continue;
		}
		output += char;
	}
	return output;
}

/** Maps unusual spaces (NBSP, em space, ideographic space...) to a regular space. */
export function normalizeSpaces(text: string): string {
	let output = '';
	for (const char of text) {
		output += describeCodePoint(char).flags.includes('space') ? ' ' : char;
	}
	return output;
}
