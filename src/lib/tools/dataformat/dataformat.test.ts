import { describe, expect, it } from 'vitest';
import { detectDelimiter, parseCsv, stringifyCsv } from './csv';
import { convert, DEFAULT_OPTIONS, inferValue, type ConvertOptions } from './dataformat';

const opts = (patch: Partial<ConvertOptions> = {}): ConvertOptions => ({ ...DEFAULT_OPTIONS, ...patch });

function ok(result: ReturnType<typeof convert>): string {
	if (!result.ok) {
		throw new Error(`expected ok, got ${result.kind}: ${result.message}`);
	}
	return result.output;
}

describe('csv parser', () => {
	it('parses quoted fields, doubled quotes and newlines in quotes', () => {
		const parsed = parseCsv('a,b\n"x, y","he said ""hi"""\n"multi\nline",z', ',');
		expect(parsed).toEqual({
			ok: true,
			rows: [['a', 'b'], ['x, y', 'he said "hi"'], ['multi\nline', 'z']]
		});
	});

	it('handles CRLF, trailing newline, BOM and blank lines', () => {
		const parsed = parseCsv('﻿a,b\r\n1,2\r\n\r\n3,4\r\n', ',');
		expect(parsed).toEqual({ ok: true, rows: [['a', 'b'], ['1', '2'], ['3', '4']] });
	});

	it('keeps empty trailing fields and quoted empty rows', () => {
		expect(parseCsv('a,b,', ',')).toEqual({ ok: true, rows: [['a', 'b', '']] });
		expect(parseCsv('""\nx', ',')).toEqual({ ok: true, rows: [[''], ['x']] });
	});

	it('reports unterminated quotes with position', () => {
		const result = parseCsv('a,b\n1,"oops', ',');
		expect(result).toMatchObject({ ok: false, line: 2, column: 3 });
	});

	it('reports junk after a closing quote', () => {
		const result = parseCsv('"a"b,c', ',');
		expect(result).toMatchObject({ ok: false, line: 1, column: 4 });
	});

	it('detects delimiters outside quotes', () => {
		expect(detectDelimiter('a;b;c')).toBe(';');
		expect(detectDelimiter('a\tb\tc')).toBe('\t');
		expect(detectDelimiter('a|b|c,d')).toBe('|');
		expect(detectDelimiter('"a,b,c";d')).toBe(';');
		expect(detectDelimiter('single')).toBe(',');
	});

	it('stringifies with quoting', () => {
		expect(stringifyCsv([['a', 'b,c', 'd"e', 'f\ng']], ',', 'lf')).toBe('a,"b,c","d""e","f\ng"');
		expect(stringifyCsv([['1'], ['2']], ',', 'crlf')).toBe('1\r\n2');
	});
});

describe('infer', () => {
	it('infers numbers, booleans and empty', () => {
		expect(inferValue('12')).toBe(12);
		expect(inferValue('-1.5e3')).toBe(-1500);
		expect(inferValue('true')).toBe(true);
		expect(inferValue('')).toBeNull();
		expect(inferValue('007')).toBe('007');
		expect(inferValue('12345678901234567890')).toBe('12345678901234567890');
		expect(inferValue('abc')).toBe('abc');
	});
});

describe('convert', () => {
	it('JSON to YAML and back', () => {
		const json = '{"a":1,"b":[true,null,"x"],"c":{"d":"e"}}';
		const yaml = ok(convert('json', 'yaml', json, opts()));
		expect(yaml).toBe('a: 1\nb:\n  - true\n  - null\n  - x\nc:\n  d: e');
		expect(JSON.parse(ok(convert('yaml', 'json', yaml, opts())))).toEqual(JSON.parse(json));
	});

	it('respects indent 4', () => {
		expect(ok(convert('json', 'json', '{"a":{"b":1}}', opts({ indent: 4 })))).toBe(
			'{\n    "a": {\n        "b": 1\n    }\n}'
		);
	});

	it('JSON to TOML and back', () => {
		const json = '{"title":"x","owner":{"name":"Ana"},"ports":[80,443]}';
		const toml = ok(convert('json', 'toml', json, opts()));
		expect(toml).toContain('title = "x"');
		expect(toml).toContain('[owner]');
		expect(JSON.parse(ok(convert('toml', 'json', toml, opts())))).toEqual(JSON.parse(json));
	});

	it('rejects non-table roots for TOML', () => {
		const result = convert('json', 'toml', '[1,2]', opts());
		expect(result).toMatchObject({ ok: false, kind: 'toml-root' });
		expect(convert('json', 'toml', '5', opts())).toMatchObject({ kind: 'toml-root' });
	});

	it('CSV to JSON with and without inference', () => {
		const csv = 'name,age,ok\nAna,30,true\nBia,,false';
		expect(JSON.parse(ok(convert('csv', 'json', csv, opts())))).toEqual([
			{ name: 'Ana', age: '30', ok: 'true' },
			{ name: 'Bia', age: '', ok: 'false' }
		]);
		expect(JSON.parse(ok(convert('csv', 'json', csv, opts({ inferTypes: true }))))).toEqual([
			{ name: 'Ana', age: 30, ok: true },
			{ name: 'Bia', age: null, ok: false }
		]);
	});

	it('CSV without header gives arrays', () => {
		expect(JSON.parse(ok(convert('csv', 'json', '1;2\n3;4', opts({ header: false }))))).toEqual([
			['1', '2'],
			['3', '4']
		]);
	});

	it('CSV header duplicates and ragged rows', () => {
		const out = JSON.parse(ok(convert('csv', 'json', 'a,a\n1,2,3\n4', opts())));
		expect(out).toEqual([
			{ a: '1', a_2: '2', column_3: '3' },
			{ a: '4', a_2: '' }
		]);
	});

	it('JSON to CSV stringifies nested values and unions columns', () => {
		const json = '[{"id":1,"tags":["a","b"]},{"id":2,"note":"x,y"}]';
		const csv = ok(convert('json', 'csv', json, opts()));
		expect(csv).toBe('id,tags,note\n1,"[""a"",""b""]",\n2,,"x,y"');
	});

	it('CSV round trip with tricky cells', () => {
		const json = '[{"t":"say \\"hi\\"","m":"l1\\nl2","e":""}]';
		const csv = ok(convert('json', 'csv', json, opts()));
		const back = JSON.parse(ok(convert('csv', 'json', csv, opts())));
		expect(back).toEqual([{ t: 'say "hi"', m: 'l1\nl2', e: '' }]);
	});

	it('uses the chosen output delimiter', () => {
		expect(ok(convert('json', 'csv', '[{"a":1,"b":2}]', opts({ delimiter: ';' })))).toBe('a;b\n1;2');
	});

	it('preserves detected delimiter on CSV format-only', () => {
		expect(ok(convert('csv', 'csv', 'a;b\n"1;2";3', opts()))).toBe('a;b\n"1;2";3');
	});

	it('refuses CSV for mixed arrays', () => {
		expect(convert('json', 'csv', '[{"a":1}, 2]', opts())).toMatchObject({ kind: 'csv-shape' });
	});

	it('reports JSON errors with line and column', () => {
		const result = convert('json', 'yaml', '{\n  "a": 1,\n  oops\n}', opts());
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.kind).toBe('parse');
			expect(result.line).toBe(3);
		}
	});

	it('reports YAML errors with position', () => {
		const result = convert('yaml', 'json', 'a: [1, 2\nb: 3', opts());
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.line).toBeGreaterThan(0);
		}
	});

	it('reports TOML errors with position', () => {
		const result = convert('toml', 'json', 'a = 1\nb = = 2', opts());
		expect(result).toMatchObject({ ok: false, kind: 'parse', line: 2 });
	});

	it('flags empty input', () => {
		expect(convert('json', 'yaml', '  ', opts())).toMatchObject({ ok: false, kind: 'empty' });
	});
});
