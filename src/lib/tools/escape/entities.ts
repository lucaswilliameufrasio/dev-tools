/** Named HTML entities supported on unescape (and used for nothing else on escape). */
const NAMED: Record<string, number> = {
	amp: 0x26,
	lt: 0x3c,
	gt: 0x3e,
	quot: 0x22,
	apos: 0x27,
	nbsp: 0xa0,
	copy: 0xa9,
	reg: 0xae,
	trade: 0x2122,
	hellip: 0x2026,
	mdash: 0x2014,
	ndash: 0x2013,
	laquo: 0xab,
	raquo: 0xbb,
	euro: 0x20ac
};

const LATIN1_NAMES: string[] = [
	'iexcl', 'cent', 'pound', 'curren', 'yen', 'brvbar', 'sect', 'uml', 'copy', 'ordf', 'laquo', 'not',
	'shy', 'reg', 'macr', 'deg', 'plusmn', 'sup2', 'sup3', 'acute', 'micro', 'para', 'middot', 'cedil',
	'sup1', 'ordm', 'raquo', 'frac14', 'frac12', 'frac34', 'iquest', 'Agrave', 'Aacute', 'Acirc',
	'Atilde', 'Auml', 'Aring', 'AElig', 'Ccedil', 'Egrave', 'Eacute', 'Ecirc', 'Euml', 'Igrave',
	'Iacute', 'Icirc', 'Iuml', 'ETH', 'Ntilde', 'Ograve', 'Oacute', 'Ocirc', 'Otilde', 'Ouml', 'times',
	'Oslash', 'Ugrave', 'Uacute', 'Ucirc', 'Uuml', 'Yacute', 'THORN', 'szlig', 'agrave', 'aacute',
	'acirc', 'atilde', 'auml', 'aring', 'aelig', 'ccedil', 'egrave', 'eacute', 'ecirc', 'euml',
	'igrave', 'iacute', 'icirc', 'iuml', 'eth', 'ntilde', 'ograve', 'oacute', 'ocirc', 'otilde',
	'ouml', 'divide', 'oslash', 'ugrave', 'uacute', 'ucirc', 'uuml', 'yacute', 'thorn', 'yuml'
];

for (const [offset, name] of LATIN1_NAMES.entries()) {
	NAMED[name] = 0xa1 + offset;
}

export function namedEntityCodePoint(name: string): number | undefined {
	return Object.hasOwn(NAMED, name) ? NAMED[name] : undefined;
}
