import type { FormatOptionsWithLanguage } from 'sql-formatter';

export type SqlDialect =
	| 'sql'
	| 'postgresql'
	| 'mysql'
	| 'mariadb'
	| 'sqlite'
	| 'transactsql'
	| 'plsql'
	| 'bigquery'
	| 'snowflake'
	| 'redshift';

export const SQL_DIALECTS: SqlDialect[] = [
	'sql',
	'postgresql',
	'mysql',
	'mariadb',
	'sqlite',
	'transactsql',
	'plsql',
	'bigquery',
	'snowflake',
	'redshift'
];

export type KeywordCase = 'upper' | 'lower' | 'preserve';
export type SqlIndent = '2' | '4' | 'tab';

export type SqlFormatOptions = {
	dialect: SqlDialect;
	keywordCase: KeywordCase;
	indent: SqlIndent;
};

export type FormatFn = (query: string, options: FormatOptionsWithLanguage) => string;

export type SqlFormatResult =
	| { ok: true; output: string }
	| { ok: false; message: string; line?: number; column?: number };

export function buildFormatOptions(options: SqlFormatOptions): FormatOptionsWithLanguage {
	return {
		language: options.dialect,
		keywordCase: options.keywordCase,
		tabWidth: options.indent === 'tab' ? 2 : Number(options.indent),
		useTabs: options.indent === 'tab'
	};
}

/** Maps the formatter's thrown errors to a plain result. `format` is injected so the bundle can be lazy. */
export function formatSql(
	format: FormatFn,
	input: string,
	options: SqlFormatOptions
): SqlFormatResult {
	try {
		return { ok: true, output: format(input, buildFormatOptions(options)) };
	} catch (error) {
		const raw = error instanceof Error ? error.message : String(error);
		const message = raw.split('\n')[0] ?? raw;
		const where = /line (\d+) column (\d+)/i.exec(message);
		if (where?.[1] !== undefined && where[2] !== undefined) {
			return { ok: false, message, line: Number(where[1]), column: Number(where[2]) };
		}
		return { ok: false, message };
	}
}
