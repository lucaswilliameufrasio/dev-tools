import { parse as parseToml, stringify as stringifyToml, TomlError } from 'smol-toml';
import { parse as parseYaml, stringify as stringifyYaml, YAMLParseError } from 'yaml';
import {
	detectDelimiter,
	parseCsv,
	stringifyCsv,
	type Delimiter,
	type Eol
} from './csv';

export type DataFormat = 'json' | 'yaml' | 'toml' | 'csv';
export const DATA_FORMATS: DataFormat[] = ['json', 'yaml', 'toml', 'csv'];

export type DelimiterChoice = 'auto' | Delimiter;

export type ConvertOptions = {
	indent: 2 | 4;
	delimiter: DelimiterChoice;
	header: boolean;
	inferTypes: boolean;
	eol: Eol;
};

export const DEFAULT_OPTIONS: ConvertOptions = {
	indent: 2,
	delimiter: 'auto',
	header: true,
	inferTypes: false,
	eol: 'lf'
};

export type ConvertErrorKind =
	| 'parse'
	| 'toml-root'
	| 'csv-shape'
	| 'unsupported'
	| 'empty';

export type ConvertResult =
	| { ok: true; output: string }
	| {
			ok: false;
			kind: ConvertErrorKind;
			message: string;
			line?: number;
			column?: number;
	  };

type ParseResult =
	| { ok: true; value: unknown }
	| { ok: false; message: string; line?: number; column?: number };

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function offsetToLineColumn(text: string, offset: number): { line: number; column: number } {
	let line = 1;
	let column = 1;
	for (let index = 0; index < offset && index < text.length; index += 1) {
		if (text[index] === '\n') {
			line += 1;
			column = 1;
		} else {
			column += 1;
		}
	}
	return { line, column };
}

function parseJsonText(text: string): ParseResult {
	try {
		return { ok: true, value: JSON.parse(text) };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		const position = /position (\d+)/.exec(message);
		if (position?.[1] !== undefined) {
			const where = offsetToLineColumn(text, Number(position[1]));
			return { ok: false, message, ...where };
		}
		const lineColumn = /line (\d+) column (\d+)/.exec(message);
		if (lineColumn?.[1] !== undefined && lineColumn[2] !== undefined) {
			return {
				ok: false,
				message,
				line: Number(lineColumn[1]),
				column: Number(lineColumn[2])
			};
		}
		return { ok: false, message };
	}
}

function parseYamlText(text: string): ParseResult {
	try {
		return { ok: true, value: parseYaml(text) };
	} catch (error) {
		if (error instanceof YAMLParseError) {
			const first = error.linePos?.[0];
			return {
				ok: false,
				message: error.message.split('\n')[0] ?? error.message,
				line: first?.line,
				column: first?.col
			};
		}
		return { ok: false, message: error instanceof Error ? error.message : String(error) };
	}
}

function parseTomlText(text: string): ParseResult {
	try {
		return { ok: true, value: parseToml(text) };
	} catch (error) {
		if (error instanceof TomlError) {
			return {
				ok: false,
				message: error.message.split('\n')[0] ?? error.message,
				line: error.line,
				column: error.column
			};
		}
		return { ok: false, message: error instanceof Error ? error.message : String(error) };
	}
}

const NUMBER_PATTERN = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?$/;

export function inferValue(cell: string): unknown {
	if (cell === '') {
		return null;
	}
	if (cell === 'true') {
		return true;
	}
	if (cell === 'false') {
		return false;
	}
	if (NUMBER_PATTERN.test(cell)) {
		const number = Number(cell);
		const isInteger = /^-?\d+$/.test(cell);
		if (Number.isFinite(number) && (!isInteger || Number.isSafeInteger(number))) {
			return number;
		}
	}
	return cell;
}

function uniqueHeaders(cells: string[]): string[] {
	const seen = new Map<string, number>();
	const result: string[] = [];
	for (const [index, raw] of cells.entries()) {
		const base = raw === '' ? `column_${index + 1}` : raw;
		const count = (seen.get(base) ?? 0) + 1;
		seen.set(base, count);
		result.push(count === 1 ? base : `${base}_${count}`);
	}
	return result;
}

function parseCsvText(text: string, options: ConvertOptions): ParseResult {
	const delimiter = options.delimiter === 'auto' ? detectDelimiter(text) : options.delimiter;
	const parsed = parseCsv(text, delimiter);
	if (!parsed.ok) {
		return parsed;
	}
	const convert = (cell: string): unknown => (options.inferTypes ? inferValue(cell) : cell);
	if (!options.header) {
		return { ok: true, value: parsed.rows.map((row) => row.map(convert)) };
	}
	const [headerRow, ...body] = parsed.rows;
	if (headerRow === undefined) {
		return { ok: true, value: [] };
	}
	const baseHeaders = uniqueHeaders(headerRow);
	const records: Record<string, unknown>[] = [];
	for (const row of body) {
		const keys = [...baseHeaders];
		while (keys.length < row.length) {
			keys.push(`column_${keys.length + 1}`);
		}
		const record: Record<string, unknown> = {};
		for (const [index, key] of keys.entries()) {
			record[key] = convert(row[index] ?? '');
		}
		records.push(record);
	}
	return { ok: true, value: records };
}

export function parseData(
	from: DataFormat,
	text: string,
	options: ConvertOptions
): ParseResult {
	switch (from) {
		case 'json':
			return parseJsonText(text);
		case 'yaml':
			return parseYamlText(text);
		case 'toml':
			return parseTomlText(text);
		case 'csv':
			return parseCsvText(text, options);
	}
}

function cellText(value: unknown): string {
	if (value === null || value === undefined) {
		return '';
	}
	if (typeof value === 'string') {
		return value;
	}
	if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
		return String(value);
	}
	if (value instanceof Date) {
		return value.toISOString();
	}
	return JSON.stringify(value) ?? '';
}

type CsvBuild = { ok: true; rows: string[][] } | { ok: false; message: string };

function toCsvRows(value: unknown, header: boolean): CsvBuild {
	const items: unknown[] = Array.isArray(value) ? value : [value];
	if (items.length === 0) {
		return { ok: true, rows: [] };
	}
	const allRecords = items.every(isRecord);
	const allArrays = items.every((item) => Array.isArray(item));
	if (allRecords) {
		const columns: string[] = [];
		for (const item of items) {
			if (!isRecord(item)) {
				continue;
			}
			for (const key of Object.keys(item)) {
				if (!columns.includes(key)) {
					columns.push(key);
				}
			}
		}
		const rows: string[][] = header ? [columns] : [];
		for (const item of items) {
			if (isRecord(item)) {
				rows.push(columns.map((column) => cellText(item[column])));
			}
		}
		return { ok: true, rows };
	}
	if (allArrays) {
		return {
			ok: true,
			rows: items.map((item) => (Array.isArray(item) ? item.map(cellText) : []))
		};
	}
	if (items.every((item) => !isRecord(item) && !Array.isArray(item))) {
		return { ok: true, rows: items.map((item) => [cellText(item)]) };
	}
	return {
		ok: false,
		message:
			'CSV needs an array of objects (or an array of arrays). The items here are of mixed types.'
	};
}

function stringifyData(
	to: DataFormat,
	value: unknown,
	options: ConvertOptions,
	delimiter: Delimiter
): ConvertResult {
	switch (to) {
		case 'json': {
			const output = JSON.stringify(value, undefined, options.indent);
			if (output === undefined) {
				return { ok: false, kind: 'unsupported', message: 'This value cannot be represented as JSON.' };
			}
			return { ok: true, output };
		}
		case 'yaml': {
			try {
				return { ok: true, output: stringifyYaml(value, { indent: options.indent }).trimEnd() };
			} catch (error) {
				return {
					ok: false,
					kind: 'unsupported',
					message: error instanceof Error ? error.message : String(error)
				};
			}
		}
		case 'toml': {
			if (!isRecord(value)) {
				return {
					ok: false,
					kind: 'toml-root',
					message:
						'TOML needs a table (an object) at the root, but the data is an array or a single value. Wrap it in an object, for example {"items": [...]}.'
				};
			}
			try {
				return { ok: true, output: stringifyToml(value) };
			} catch (error) {
				return {
					ok: false,
					kind: 'unsupported',
					message: error instanceof Error ? error.message : String(error)
				};
			}
		}
		case 'csv': {
			const built = toCsvRows(value, options.header);
			if (!built.ok) {
				return { ok: false, kind: 'csv-shape', message: built.message };
			}
			return { ok: true, output: stringifyCsv(built.rows, delimiter, options.eol) };
		}
	}
}

export function convert(
	from: DataFormat,
	to: DataFormat,
	input: string,
	options: ConvertOptions
): ConvertResult {
	if (input.trim() === '') {
		return { ok: false, kind: 'empty', message: '' };
	}
	const parsed = parseData(from, input, options);
	if (!parsed.ok) {
		return { ok: false, kind: 'parse', message: parsed.message, line: parsed.line, column: parsed.column };
	}
	let delimiter: Delimiter = ',';
	if (options.delimiter !== 'auto') {
		delimiter = options.delimiter;
	} else if (from === 'csv') {
		delimiter = detectDelimiter(input);
	}
	return stringifyData(to, parsed.value, options, delimiter);
}
