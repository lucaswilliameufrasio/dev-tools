export type LinesAction =
	| 'sortAsc'
	| 'sortDesc'
	| 'natural'
	| 'byLength'
	| 'unique'
	| 'removeEmpty'
	| 'trim'
	| 'reverse'
	| 'shuffle'
	| 'numbers'
	| 'join'
	| 'split'
	| 'slugify'
	| 'countDuplicates'
	| 'prefixSuffix';

export const LINES_ACTIONS: LinesAction[] = [
	'sortAsc',
	'sortDesc',
	'natural',
	'byLength',
	'unique',
	'removeEmpty',
	'trim',
	'reverse',
	'shuffle',
	'numbers',
	'join',
	'split',
	'slugify',
	'countDuplicates',
	'prefixSuffix'
];

export type LinesOptions = {
	caseInsensitive: boolean;
	separator: string;
	prefix: string;
	suffix: string;
	locale: string;
};

export const DEFAULT_OPTIONS: LinesOptions = {
	caseInsensitive: false,
	separator: ', ',
	prefix: '',
	suffix: '',
	locale: 'pt-BR'
};

export type LinesStats = {
	lines: number;
	unique: number;
	words: number;
	characters: number;
	bytes: number;
};

export type RandomInt = (maxExclusive: number) => number;

export function splitLines(text: string): string[] {
	if (text === '') {
		return [];
	}
	const lines = text.split(/\r\n|\r|\n/);
	if (lines.length > 1 && lines[lines.length - 1] === '') {
		lines.pop();
	}
	return lines;
}

export function cryptoRandomInt(maxExclusive: number): number {
	const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
	const buffer = new Uint32Array(1);
	for (;;) {
		crypto.getRandomValues(buffer);
		const value = buffer[0] ?? 0;
		if (value < limit) {
			return value % maxExclusive;
		}
	}
}

function foldKey(line: string, caseInsensitive: boolean): string {
	return caseInsensitive ? line.toLocaleLowerCase() : line;
}

export function slugify(line: string): string {
	return line
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

function sortedBy(lines: string[], compare: (a: string, b: string) => number): string[] {
	return lines
		.map((line, index) => ({ line, index }))
		.sort((a, b) => compare(a.line, b.line) || a.index - b.index)
		.map((entry) => entry.line);
}

export function unique(lines: string[], caseInsensitive: boolean): string[] {
	const seen = new Set<string>();
	const result: string[] = [];
	for (const line of lines) {
		const key = foldKey(line, caseInsensitive);
		if (!seen.has(key)) {
			seen.add(key);
			result.push(line);
		}
	}
	return result;
}

export function countDuplicates(lines: string[], caseInsensitive: boolean): string[] {
	const counts = new Map<string, { line: string; count: number }>();
	for (const line of lines) {
		const key = foldKey(line, caseInsensitive);
		const entry = counts.get(key);
		if (entry) {
			entry.count += 1;
		} else {
			counts.set(key, { line, count: 1 });
		}
	}
	const entries = [...counts.values()];
	const sorted = entries
		.map((entry, index) => ({ entry, index }))
		.sort((a, b) => b.entry.count - a.entry.count || a.index - b.index);
	return sorted.map(({ entry }) => `${entry.count}  ${entry.line}`);
}

export function shuffle(lines: string[], random: RandomInt = cryptoRandomInt): string[] {
	const result = [...lines];
	for (let index = result.length - 1; index > 0; index -= 1) {
		const other = random(index + 1);
		const a = result[index] ?? '';
		const b = result[other] ?? '';
		result[index] = b;
		result[other] = a;
	}
	return result;
}

export function applyAction(
	text: string,
	action: LinesAction,
	options: LinesOptions,
	random: RandomInt = cryptoRandomInt
): string {
	if (action === 'split') {
		if (options.separator === '') {
			return text;
		}
		return text.split(options.separator).join('\n');
	}
	const lines = splitLines(text);
	const collator = new Intl.Collator(options.locale, {
		sensitivity: options.caseInsensitive ? 'accent' : 'variant'
	});
	const natural = new Intl.Collator(options.locale, {
		numeric: true,
		sensitivity: options.caseInsensitive ? 'accent' : 'variant'
	});
	let result: string[];
	switch (action) {
		case 'sortAsc':
			result = sortedBy(lines, (a, b) => collator.compare(a, b));
			break;
		case 'sortDesc':
			result = sortedBy(lines, (a, b) => collator.compare(b, a));
			break;
		case 'natural':
			result = sortedBy(lines, (a, b) => natural.compare(a, b));
			break;
		case 'byLength':
			result = sortedBy(lines, (a, b) => [...a].length - [...b].length);
			break;
		case 'unique':
			result = unique(lines, options.caseInsensitive);
			break;
		case 'removeEmpty':
			result = lines.filter((line) => line.trim() !== '');
			break;
		case 'trim':
			result = lines.map((line) => line.trim());
			break;
		case 'reverse':
			result = [...lines].reverse();
			break;
		case 'shuffle':
			result = shuffle(lines, random);
			break;
		case 'numbers': {
			const width = String(lines.length).length;
			result = lines.map((line, index) => `${String(index + 1).padStart(width, ' ')}. ${line}`);
			break;
		}
		case 'join':
			return lines.join(options.separator);
		case 'slugify':
			result = lines.map(slugify);
			break;
		case 'countDuplicates':
			result = countDuplicates(lines, options.caseInsensitive);
			break;
		case 'prefixSuffix':
			result = lines.map((line) => `${options.prefix}${line}${options.suffix}`);
			break;
	}
	return result.join('\n');
}

export function computeStats(text: string): LinesStats {
	const lines = splitLines(text);
	const words = text.split(/\s+/).filter((word) => word !== '').length;
	return {
		lines: lines.length,
		unique: new Set(lines).size,
		words,
		characters: [...text].length,
		bytes: new TextEncoder().encode(text).length
	};
}
