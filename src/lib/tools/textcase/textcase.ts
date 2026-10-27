export type CaseStyle = 'camel' | 'pascal' | 'snake' | 'constant' | 'kebab' | 'title' | 'lower' | 'upper';

export const CASE_STYLES: CaseStyle[] = [
	'camel',
	'pascal',
	'snake',
	'constant',
	'kebab',
	'title',
	'lower',
	'upper'
];

export function splitWords(input: string): string[] {
	const spaced = input
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
		.replace(/[_\-./]+/g, ' ');
	return spaced
		.split(/\s+/)
		.map((word) => word.trim())
		.filter((word) => word !== '');
}

function capitalize(word: string): string {
	return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

export function convertCase(input: string, style: CaseStyle): string {
	if (style === 'lower') {
		return input.toLowerCase();
	}
	if (style === 'upper') {
		return input.toUpperCase();
	}
	const words = splitWords(input);
	const lowered = words.map((word) => word.toLowerCase());
	switch (style) {
		case 'camel':
			return lowered.map((word, index) => (index === 0 ? word : capitalize(word))).join('');
		case 'pascal':
			return lowered.map(capitalize).join('');
		case 'snake':
			return lowered.join('_');
		case 'constant':
			return lowered.join('_').toUpperCase();
		case 'kebab':
			return lowered.join('-');
		case 'title':
			return lowered.map(capitalize).join(' ');
	}
}
