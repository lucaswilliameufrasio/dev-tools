/**
 * Collapses whitespace and removes comments outside string literals and quoted
 * identifiers. Handles '...', "...", `...`, [...] (T-SQL), $$...$$ / $tag$...$tag$
 * (PostgreSQL), -- and # line comments (# only when `hashComments`), and block comments.
 */
export type MinifyResult = { ok: true; output: string } | { ok: false; message: string };

const WORD_CHAR = /[A-Za-z0-9_$'"`\]\u0080-\uffff]/;

function isIdentChar(char: string | undefined): boolean {
	return char !== undefined && WORD_CHAR.test(char);
}

export function minifySql(input: string, hashComments = false): MinifyResult {
	let output = '';
	let pendingSpace = false;
	let index = 0;

	function emit(chunk: string): void {
		if (pendingSpace && output !== '') {
			const last = output[output.length - 1];
			const first = chunk[0];
			// Keep a space only where removing it could merge tokens or start a comment.
			const needsSpace =
				(isIdentChar(last) && isIdentChar(first)) ||
				(last === '-' && first === '-') ||
				(last === '/' && first === '*');
			if (needsSpace) {
				output += ' ';
			}
		}
		pendingSpace = false;
		output += chunk;
	}

	function readQuoted(open: string, close: string, doubled: boolean, escapes: boolean): boolean {
		const start = index;
		index += 1;
		while (index < input.length) {
			const char = input[index];
			if (escapes && char === '\\') {
				index += 2;
				continue;
			}
			if (char === close) {
				if (doubled && input[index + 1] === close) {
					index += 2;
					continue;
				}
				index += 1;
				emit(input.slice(start, index));
				return true;
			}
			index += 1;
		}
		return false;
	}

	while (index < input.length) {
		const char = input[index];
		const next = input[index + 1];
		if (char === undefined) {
			break;
		}
		if (/\s/.test(char)) {
			pendingSpace = true;
			index += 1;
			continue;
		}
		if (char === '-' && next === '-') {
			while (index < input.length && input[index] !== '\n') {
				index += 1;
			}
			pendingSpace = true;
			continue;
		}
		if (hashComments && char === '#') {
			while (index < input.length && input[index] !== '\n') {
				index += 1;
			}
			pendingSpace = true;
			continue;
		}
		if (char === '/' && next === '*') {
			const end = input.indexOf('*/', index + 2);
			if (end === -1) {
				return { ok: false, message: 'Unterminated block comment.' };
			}
			index = end + 2;
			pendingSpace = true;
			continue;
		}
		if (char === "'") {
			if (!readQuoted("'", "'", true, true)) {
				return { ok: false, message: 'Unterminated string literal.' };
			}
			continue;
		}
		if (char === '"') {
			if (!readQuoted('"', '"', true, false)) {
				return { ok: false, message: 'Unterminated quoted identifier.' };
			}
			continue;
		}
		if (char === '`') {
			if (!readQuoted('`', '`', true, false)) {
				return { ok: false, message: 'Unterminated quoted identifier.' };
			}
			continue;
		}
		if (char === '[') {
			if (!readQuoted('[', ']', false, false)) {
				return { ok: false, message: 'Unterminated bracketed identifier.' };
			}
			continue;
		}
		if (char === '$') {
			const tag = /^\$[A-Za-z_]*\$/.exec(input.slice(index, index + 64));
			if (tag) {
				const end = input.indexOf(tag[0], index + tag[0].length);
				if (end === -1) {
					return { ok: false, message: 'Unterminated dollar-quoted string.' };
				}
				const stop = end + tag[0].length;
				emit(input.slice(index, stop));
				index = stop;
				continue;
			}
		}
		// Plain token run up to the next special character.
		const start = index;
		index += 1;
		while (index < input.length) {
			const c = input[index];
			const n = input[index + 1];
			if (
				c === undefined ||
				/\s/.test(c) ||
				c === "'" ||
				c === '"' ||
				c === '`' ||
				c === '[' ||
				(c === '-' && n === '-') ||
				(c === '/' && n === '*') ||
				(hashComments && c === '#')
			) {
				break;
			}
			index += 1;
		}
		emit(input.slice(start, index));
	}
	return { ok: true, output };
}
