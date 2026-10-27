import { format } from 'sql-formatter';
import { describe, expect, it } from 'vitest';
import { minifySql } from './minify';
import { buildFormatOptions, formatSql, type FormatFn, type SqlFormatOptions } from './sql';

function min(input: string, hash = false): string {
	const result = minifySql(input, hash);
	if (!result.ok) {
		throw new Error(result.message);
	}
	return result.output;
}

describe('minifySql', () => {
	it('collapses whitespace and newlines', () => {
		expect(min('SELECT  a,\n\tb\n  FROM   t\n WHERE a = 1;')).toBe('SELECT a,b FROM t WHERE a=1;');
	});

	it('removes line and block comments', () => {
		expect(min('SELECT 1 -- note\n, 2 /* block\n comment */ , 3')).toBe('SELECT 1,2,3');
	});

	it('keeps string literals intact, including comment markers and spaces', () => {
		expect(min("SELECT  'a  --b /* c */  d'  AS x")).toBe("SELECT 'a  --b /* c */  d' AS x");
		expect(min("SELECT 'it''s   ok'")).toBe("SELECT 'it''s   ok'");
		expect(min("SELECT 'back\\'slash  x'")).toBe("SELECT 'back\\'slash  x'");
	});

	it('keeps quoted identifiers intact', () => {
		expect(min('SELECT "my   col", `a  b`, [c  d] FROM t')).toBe(
			'SELECT "my   col",`a  b`,[c  d] FROM t'
		);
	});

	it('keeps dollar-quoted bodies', () => {
		expect(min('SELECT $$a   --b$$ , $tag$x  y$tag$')).toBe('SELECT $$a   --b$$,$tag$x  y$tag$');
	});

	it('does not merge tokens', () => {
		expect(min('a\n-- c\nb')).toBe('a b');
		expect(min('a /* c */ b')).toBe('a b');
	});

	it('treats # as a comment only when asked', () => {
		expect(min('SELECT 1 # c\n, 2', true)).toBe('SELECT 1,2');
		expect(min('SELECT a # b', false)).toBe('SELECT a#b');
	});

	it('reports unterminated constructs', () => {
		expect(minifySql("SELECT 'abc")).toMatchObject({ ok: false });
		expect(minifySql('SELECT /* abc')).toMatchObject({ ok: false });
	});
});

const base: SqlFormatOptions = { dialect: 'postgresql', keywordCase: 'upper', indent: '2' };

describe('formatSql', () => {
	it('passes dialect, case and indent to the formatter', () => {
		const calls: unknown[] = [];
		const spy: FormatFn = (query, options) => {
			calls.push(options);
			return query;
		};
		formatSql(spy, 'select 1', { dialect: 'mysql', keywordCase: 'lower', indent: 'tab' });
		expect(calls[0]).toEqual({ language: 'mysql', keywordCase: 'lower', tabWidth: 2, useTabs: true });
		expect(buildFormatOptions({ ...base, indent: '4' })).toMatchObject({ tabWidth: 4, useTabs: false });
	});

	it('formats with the real library', () => {
		const result = formatSql(format, 'select a,b from t where x=1', base);
		expect(result).toEqual({ ok: true, output: 'SELECT\n  a,\n  b\nFROM\n  t\nWHERE\n  x = 1' });
	});

	it('maps thrown errors to a result', () => {
		const result = formatSql(format, "select 'unterminated", base);
		expect(result.ok).toBe(false);
		const thrower: FormatFn = () => {
			throw new Error('boom\nstack');
		};
		expect(formatSql(thrower, 'x', base)).toEqual({ ok: false, message: 'boom' });
	});
});
