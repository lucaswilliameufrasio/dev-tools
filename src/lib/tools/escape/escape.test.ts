import { describe, expect, it } from 'vitest';
import {
	DEFAULT_ESCAPE_OPTIONS,
	ESCAPE_FORMATS,
	escapeCsvField,
	escapeHtml,
	escapeJsString,
	escapeUnicode,
	escapeXml,
	runEscape,
	unescapeCsvField,
	unescapeHtml,
	unescapeJsString,
	unescapeJsonString,
	unescapeUnicode
} from './escape';

function out(result: ReturnType<typeof runEscape>): string {
	if (!result.ok) {
		throw new Error(result.message);
	}
	return result.output;
}

describe('html', () => {
	it('escapes the five characters', () => {
		expect(escapeHtml(`<a href="x">Tom & 'Jerry'</a>`, false)).toBe(
			'&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;'
		);
	});

	it('optionally encodes non-ASCII as numeric entities (astral included)', () => {
		expect(escapeHtml('café 😀', true)).toBe('caf&#233; &#128512;');
		expect(escapeHtml('café', false)).toBe('café');
	});

	it('unescapes numeric, hex and named entities', () => {
		expect(unescapeHtml('&#65;&#x42;&#X43; &amp;lt; &copy; &eacute; &Ntilde; &hellip; &euro; &nbsp;|')).toBe(
			'ABC &lt; © é Ñ … € \u00a0|'
		);
		expect(unescapeHtml('&#128512;')).toBe('😀');
		expect(unescapeHtml('&laquo;x&raquo; &mdash; &ndash; &trade; &reg; &apos;')).toBe('«x» — – ™ ® \'');
	});

	it('leaves unknown or invalid entities alone', () => {
		expect(unescapeHtml('&bogus; &#0; &#xD800; &#1114112; & x')).toBe('&bogus; &#0; &#xD800; &#1114112; & x');
	});

	it('round trips', () => {
		const text = `<p class="a">Olá & 'mundo' 😀 ©</p>`;
		expect(unescapeHtml(escapeHtml(text, true))).toBe(text);
		expect(unescapeHtml(escapeHtml(text, false))).toBe(text);
	});
});

describe('xml', () => {
	it('uses the predefined entities', () => {
		expect(escapeXml(`<a b="c">'&'</a>`)).toBe('&lt;a b=&quot;c&quot;&gt;&apos;&amp;&apos;&lt;/a&gt;');
	});

	it('only decodes predefined and numeric entities', () => {
		expect(out(runEscape('xml', 'unescape', '&lt;&copy;&#169;&apos;', DEFAULT_ESCAPE_OPTIONS))).toBe("<&copy;©'");
	});
});

describe('json', () => {
	it('escapes to a valid literal with control chars', () => {
		const result = out(runEscape('json', 'escape', 'a"b\\c\n\u0001😀', DEFAULT_ESCAPE_OPTIONS));
		expect(result).toBe('"a\\"b\\\\c\\n\\u0001😀"');
		expect(JSON.parse(result)).toBe('a"b\\c\n\u0001😀');
	});

	it('unescapes with or without surrounding quotes', () => {
		expect(unescapeJsonString('"a\\nb\\u00e9"')).toEqual({ ok: true, output: 'a\nbé' });
		expect(unescapeJsonString('a\\nb\\"q\\"')).toEqual({ ok: true, output: 'a\nb"q"' });
		expect(unescapeJsonString('\\ud83d\\ude00')).toEqual({ ok: true, output: '😀' });
	});

	it('rejects invalid escapes', () => {
		expect(unescapeJsonString('a\\xb')).toMatchObject({ ok: false });
		expect(unescapeJsonString('a"b')).toMatchObject({ ok: false });
		expect(unescapeJsonString('\\u12')).toMatchObject({ ok: false });
	});
});

describe('javascript', () => {
	it('escapes with single quotes by default', () => {
		expect(escapeJsString("it's \"x\"\n\t\\ \u0001 😀 é", 'single')).toBe(
			"'it\\'s \"x\"\\n\\t\\\\ \\x01 \\u{1F600} é'"
		);
	});

	it('escapes with double quotes', () => {
		expect(escapeJsString(`it's "x"`, 'double')).toBe('"it\'s \\"x\\""');
	});

	it('escapes line separators', () => {
		expect(escapeJsString('\u2028', 'single')).toBe("'\\u2028'");
	});

	it('unescapes x, u and u{} forms, with or without quotes', () => {
		expect(unescapeJsString("'a\\x41\\u00e9\\u{1F600}\\n'")).toEqual({ ok: true, output: 'aAé😀\n' });
		expect(unescapeJsString('a\\tb')).toEqual({ ok: true, output: 'a\tb' });
	});

	it('round trips for both quote styles', () => {
		const text = `He said "hi", it's \\ ok\n\t😀\u0000\u200b`;
		for (const quote of ['single', 'double'] as const) {
			expect(unescapeJsString(escapeJsString(text, quote))).toEqual({ ok: true, output: text });
		}
	});

	it('reports invalid escapes clearly', () => {
		expect(unescapeJsString('a\\qb')).toMatchObject({ ok: false });
		expect(unescapeJsString('a\\x4')).toMatchObject({ ok: false });
		expect(unescapeJsString('a\\u{110000}')).toMatchObject({ ok: false });
		expect(unescapeJsString('trailing\\')).toMatchObject({ ok: false });
		const result = unescapeJsString('a\\qb');
		expect(!result.ok && result.message).toContain('\\q');
	});
});

describe('unicode escapes', () => {
	it('escapes non-ASCII with surrogate pairs', () => {
		expect(escapeUnicode('aé😀', false)).toBe('a\\u00E9\\uD83D\\uDE00');
		expect(escapeUnicode('a', true)).toBe('\\u0061');
	});

	it('unescapes \\uXXXX, pairs and \\u{...}', () => {
		expect(unescapeUnicode('a\\u00E9\\uD83D\\uDE00\\u{1f600}')).toEqual({ ok: true, output: 'aé😀😀' });
	});

	it('leaves other backslashes alone and rejects bad \\u', () => {
		expect(unescapeUnicode('C:\\dir\\n')).toEqual({ ok: true, output: 'C:\\dir\\n' });
		expect(unescapeUnicode('\\u12G4')).toMatchObject({ ok: false });
		expect(unescapeUnicode('\\u{}')).toMatchObject({ ok: false });
	});

	it('round trips', () => {
		const text = 'Zażółć 日本語 👨‍👩‍👧 a\\b';
		const escaped = escapeUnicode(text, false);
		expect(unescapeUnicode(escaped)).toEqual({ ok: true, output: text.replace(/\\/g, '\\') });
	});
});

describe('csv', () => {
	it('quotes and doubles quotes', () => {
		expect(escapeCsvField('say "hi", ok\nbye')).toBe('"say ""hi"", ok\nbye"');
	});

	it('unquotes', () => {
		expect(unescapeCsvField('"say ""hi"", ok"')).toEqual({ ok: true, output: 'say "hi", ok' });
		expect(unescapeCsvField('plain')).toEqual({ ok: true, output: 'plain' });
	});

	it('rejects malformed quoting', () => {
		expect(unescapeCsvField('"abc')).toMatchObject({ ok: false });
		expect(unescapeCsvField('"a"b"')).toMatchObject({ ok: false });
	});
});

describe('round trips through runEscape', () => {
	const samples = ['', 'plain', `"quotes" & 'apostrophes' <tags>`, 'line1\nline2\ttab', '😀 é ñ 日本', 'back\\slash'];
	for (const format of ESCAPE_FORMATS) {
		it(`${format} escape then unescape restores the text`, () => {
			for (const sample of samples) {
				const escaped = out(runEscape(format, 'escape', sample, DEFAULT_ESCAPE_OPTIONS));
				expect(out(runEscape(format, 'unescape', escaped, DEFAULT_ESCAPE_OPTIONS))).toBe(sample);
			}
		});
	}
});
