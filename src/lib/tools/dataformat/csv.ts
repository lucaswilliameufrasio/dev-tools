export type Delimiter = ',' | ';' | '\t' | '|';
export type Eol = 'lf' | 'crlf';

export const DELIMITERS: Delimiter[] = [',', ';', '\t', '|'];

export type CsvParseResult =
	| { ok: true; rows: string[][] }
	| { ok: false; message: string; line: number; column: number };

/** Picks the delimiter that appears most often on the first line, outside quotes. */
export function detectDelimiter(text: string): Delimiter {
	const counts = new Map<Delimiter, number>();
	for (const delimiter of DELIMITERS) {
		counts.set(delimiter, 0);
	}
	let inQuotes = false;
	for (const char of text.replace(/^﻿/, '')) {
		if (char === '"') {
			inQuotes = !inQuotes;
			continue;
		}
		if (!inQuotes && (char === '\n' || char === '\r')) {
			break;
		}
		if (!inQuotes) {
			for (const delimiter of DELIMITERS) {
				if (char === delimiter) {
					counts.set(delimiter, (counts.get(delimiter) ?? 0) + 1);
				}
			}
		}
	}
	let best: Delimiter = ',';
	let bestCount = 0;
	for (const delimiter of DELIMITERS) {
		const count = counts.get(delimiter) ?? 0;
		if (count > bestCount) {
			best = delimiter;
			bestCount = count;
		}
	}
	return best;
}

/** RFC 4180 parser: quoted fields, doubled quotes, newlines inside quotes, CRLF or LF. */
export function parseCsv(input: string, delimiter: Delimiter): CsvParseResult {
	const text = input.replace(/^﻿/, '');
	const rows: string[][] = [];
	let row: string[] = [];
	let field = '';
	let line = 1;
	let column = 1;
	let index = 0;
	let rowHasContent = false;

	function endField(): void {
		row.push(field);
		field = '';
	}
	function endRow(): void {
		endField();
		if (rowHasContent || row.length > 1 || row[0] !== '') {
			rows.push(row);
		}
		row = [];
		rowHasContent = false;
	}

	while (index < text.length) {
		const char = text[index];
		if (char === '"' && field === '' && !rowHasContentInField(text, index, delimiter)) {
			// Quoted field.
			const startLine = line;
			const startColumn = column;
			index += 1;
			column += 1;
			let closed = false;
			while (index < text.length) {
				const inner = text[index];
				if (inner === '"') {
					if (text[index + 1] === '"') {
						field += '"';
						index += 2;
						column += 2;
						continue;
					}
					closed = true;
					index += 1;
					column += 1;
					break;
				}
				field += inner;
				if (inner === '\n') {
					line += 1;
					column = 1;
				} else {
					column += 1;
				}
				index += 1;
			}
			if (!closed) {
				return {
					ok: false,
					message: `Unterminated quoted field starting at line ${startLine}, column ${startColumn}.`,
					line: startLine,
					column: startColumn
				};
			}
			rowHasContent = true;
			const next = text[index];
			if (next !== undefined && next !== delimiter && next !== '\n' && next !== '\r') {
				return {
					ok: false,
					message: `Unexpected character "${next}" after closing quote at line ${line}, column ${column}. Double the quote ("") to include it in the value.`,
					line,
					column
				};
			}
			continue;
		}
		if (char === delimiter) {
			endField();
			rowHasContent = true;
			index += 1;
			column += 1;
			continue;
		}
		if (char === '\r' || char === '\n') {
			if (char === '\r' && text[index + 1] === '\n') {
				index += 1;
			}
			endRow();
			index += 1;
			line += 1;
			column = 1;
			continue;
		}
		field += char;
		index += 1;
		column += 1;
	}
	if (field !== '' || row.length > 0 || rowHasContent) {
		endRow();
	}
	return { ok: true, rows };
}

// A quote only opens a quoted field at the start of a field. `field === ''` is not enough
// when the previous char was a closing quote, but that case is handled by the check after
// the closing quote, so here we only need to look at the previous character.
function rowHasContentInField(text: string, index: number, delimiter: Delimiter): boolean {
	if (index === 0) {
		return false;
	}
	const previous = text[index - 1];
	return previous !== delimiter && previous !== '\n' && previous !== '\r';
}

function needsQuoting(value: string, delimiter: Delimiter): boolean {
	return (
		value.includes(delimiter) ||
		value.includes('"') ||
		value.includes('\n') ||
		value.includes('\r') ||
		value.startsWith(' ') ||
		value.endsWith(' ')
	);
}

export function stringifyCsv(rows: string[][], delimiter: Delimiter, eol: Eol): string {
	const newline = eol === 'crlf' ? '\r\n' : '\n';
	const lines: string[] = [];
	for (const row of rows) {
		const cells: string[] = [];
		for (const cell of row) {
			cells.push(needsQuoting(cell, delimiter) ? `"${cell.replaceAll('"', '""')}"` : cell);
		}
		lines.push(cells.join(delimiter));
	}
	return lines.join(newline);
}
