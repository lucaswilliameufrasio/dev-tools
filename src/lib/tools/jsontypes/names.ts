export type NameStyle = 'camel' | 'snake' | 'pascal';

export type NameRules = {
	style: NameStyle;
	keywords: ReadonlySet<string>;
	/** Prefix for names that would start with a digit. Defaults to `_`. */
	digitPrefix?: string;
	/** Upper-case well-known initialisms (id -> ID), used by Go. */
	initialisms?: boolean;
};

const INITIALISMS: ReadonlySet<string> = new Set([
	'id',
	'url',
	'uri',
	'api',
	'http',
	'https',
	'json',
	'xml',
	'html',
	'ip',
	'uuid',
	'sql',
	'ui',
	'uid'
]);

const RESERVED_TYPE_NAMES: ReadonlySet<string> = new Set([
	'String',
	'Object',
	'List',
	'Map',
	'Set',
	'Date',
	'Error',
	'Int',
	'Integer',
	'Long',
	'Double',
	'Float',
	'Boolean',
	'Bool',
	'Array',
	'Any',
	'Optional',
	'Option',
	'Vec',
	'Result',
	'Value',
	'Number',
	'Record',
	'Field',
	'Self',
	'Type',
	'Data',
	'URL',
	'Void',
	'Character'
]);

const IRREGULAR_PLURALS: ReadonlyMap<string, string> = new Map([
	['people', 'person'],
	['children', 'child'],
	['men', 'man'],
	['women', 'woman'],
	['indices', 'index'],
	['mice', 'mouse']
]);

const UNCOUNTABLE: ReadonlySet<string> = new Set(['data', 'news', 'series', 'status', 'metadata', 'info']);

export function splitWords(text: string): string[] {
	return text
		.replace(/([\p{Ll}\p{N}])(\p{Lu})/gu, '$1 $2')
		.replace(/(\p{Lu}+)(\p{Lu}\p{Ll})/gu, '$1 $2')
		.split(/[^\p{L}\p{N}]+/u)
		.filter((word) => word.length > 0);
}

function capitalize(word: string): string {
	return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

export function singularize(word: string): string {
	const lower = word.toLowerCase();
	const irregular = IRREGULAR_PLURALS.get(lower);
	if (irregular !== undefined) {
		return word === word.toUpperCase() || word.charAt(0) === word.charAt(0).toUpperCase()
			? capitalize(irregular)
			: irregular;
	}
	if (UNCOUNTABLE.has(lower) || lower.length < 4) {
		return word;
	}
	if (lower.endsWith('ies')) {
		return word.slice(0, -3) + 'y';
	}
	if (/(sses|shes|ches|xes|zes)$/.test(lower)) {
		return word.slice(0, -2);
	}
	if (lower.endsWith('ss') || lower.endsWith('us') || lower.endsWith('is')) {
		return word;
	}
	if (lower.endsWith('s')) {
		return word.slice(0, -1);
	}
	return word;
}

export function toPascal(text: string): string {
	return splitWords(text).map(capitalize).join('');
}

/** PascalCase type name derived from a JSON key. */
export function typeNameFromKey(key: string, singular: boolean): string {
	const words = splitWords(key);
	if (singular && words.length > 0) {
		const last = words[words.length - 1] ?? '';
		words[words.length - 1] = singularize(last);
	}
	let name = words.map(capitalize).join('');
	if (name === '') {
		name = singular ? 'Item' : 'Type';
	}
	if (/^\p{N}/u.test(name)) {
		name = 'T' + name;
	}
	if (RESERVED_TYPE_NAMES.has(name)) {
		name += 'Model';
	}
	return name;
}

function convert(key: string, rules: NameRules): string {
	const words = splitWords(key);
	if (words.length === 0) {
		return '';
	}
	if (rules.style === 'snake') {
		return words.map((word) => word.toLowerCase()).join('_');
	}
	const parts = words.map((word, index) => {
		if (rules.initialisms === true && INITIALISMS.has(word.toLowerCase())) {
			return word.toUpperCase();
		}
		if (rules.style === 'camel' && index === 0) {
			return word.toLowerCase();
		}
		return capitalize(word);
	});
	return parts.join('');
}

/**
 * Turns JSON keys into valid, unique identifiers for a language: converts the
 * case, fixes leading digits, avoids keywords and de-duplicates collisions.
 */
export function fieldNames(keys: readonly string[], rules: NameRules): string[] {
	const used = new Set<string>();
	const result: string[] = [];
	for (const key of keys) {
		let name = convert(key, rules);
		if (name === '') {
			name = rules.style === 'pascal' ? 'Field' : 'field';
		}
		if (/^\p{N}/u.test(name)) {
			name = (rules.digitPrefix ?? '_') + name;
		}
		if (rules.keywords.has(name)) {
			name += '_';
		}
		let unique = name;
		let counter = 2;
		while (used.has(unique)) {
			unique = name + String(counter);
			counter += 1;
		}
		used.add(unique);
		result.push(unique);
	}
	return result;
}

export function isPlainIdentifier(key: string): boolean {
	return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key);
}
