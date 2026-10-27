import { describe, expect, it } from 'vitest';
import {
	analyze,
	categoryOf,
	describeCodePoint,
	normalizeSpaces,
	normalizeText,
	scriptOf,
	stripInvisible,
	utf8Bytes
} from './unicode';

describe('summary', () => {
	it('counts an astral emoji correctly', () => {
		const { summary, rows } = analyze('😀');
		expect(summary).toMatchObject({ utf16Length: 2, codePoints: 1, graphemes: 1, utf8Bytes: 4 });
		expect(rows[0]).toMatchObject({
			hex: 'U+1F600',
			utf8: ['F0', '9F', '98', '80'],
			utf16: ['D83D', 'DE00'],
			category: 'So',
			group: 'symbol'
		});
	});

	it('treats a ZWJ family as one grapheme with many code points', () => {
		const family = '👨‍👩‍👧';
		const { summary, rows } = analyze(family);
		expect(summary.codePoints).toBe(5);
		expect(summary.graphemes).toBe(1);
		expect(summary.utf16Length).toBe(8);
		expect(summary.utf8Bytes).toBe(18);
		expect(rows[1]?.flags).toEqual(expect.arrayContaining(['zero-width', 'invisible']));
		expect(rows[1]?.label).toBe('ZWJ');
	});

	it('reports normalisation differences for combining marks', () => {
		const decomposed = 'é';
		const { summary, rows } = analyze(decomposed);
		expect(summary.codePoints).toBe(2);
		expect(summary.graphemes).toBe(1);
		expect(summary.isNfc).toBe(false);
		expect(summary.isNfd).toBe(true);
		expect(summary.nfcEqualsNfd).toBe(false);
		expect(analyze('abc').summary.nfcEqualsNfd).toBe(true);
		expect(rows[1]).toMatchObject({ group: 'mark', category: 'Mn', script: 'Inherited' });
		expect(rows[1]?.display).toBe('◌́');
		const composed = analyze('é').summary;
		expect(composed.isNfc).toBe(true);
		expect(composed.isNfd).toBe(false);
	});

	it('counts UTF-8 bytes of mixed text', () => {
		expect(analyze('aé日😀').summary.utf8Bytes).toBe(1 + 2 + 3 + 4);
		expect(new TextEncoder().encode('aé日😀').length).toBe(10);
	});

	it('handles empty text', () => {
		const { summary, rows, truncated } = analyze('');
		expect(summary.codePoints).toBe(0);
		expect(summary.graphemes).toBe(0);
		expect(rows).toEqual([]);
		expect(truncated).toBe(false);
	});
});

describe('utf8Bytes', () => {
	it('matches TextEncoder', () => {
		for (const point of [0x41, 0x7f, 0x80, 0x7ff, 0x800, 0xffff, 0x10000, 0x10ffff]) {
			expect(utf8Bytes(point)).toEqual([...new TextEncoder().encode(String.fromCodePoint(point))]);
		}
	});
});

describe('classification', () => {
	it('detects categories', () => {
		expect(categoryOf('A')).toBe('Lu');
		expect(categoryOf('a')).toBe('Ll');
		expect(categoryOf('5')).toBe('Nd');
		expect(categoryOf('!')).toBe('Po');
		expect(categoryOf('+')).toBe('Sm');
		expect(categoryOf(' ')).toBe('Zs');
		expect(categoryOf('\n')).toBe('Cc');
		expect(categoryOf('͸')).toBe('Cn');
	});

	it('detects scripts', () => {
		expect(scriptOf('a')).toBe('Latin');
		expect(scriptOf('α')).toBe('Greek');
		expect(scriptOf('Ж')).toBe('Cyrillic');
		expect(scriptOf('ب')).toBe('Arabic');
		expect(scriptOf('א')).toBe('Hebrew');
		expect(scriptOf('日')).toBe('Han');
		expect(scriptOf('あ')).toBe('Hiragana');
		expect(scriptOf('カ')).toBe('Katakana');
		expect(scriptOf('한')).toBe('Hangul');
		expect(scriptOf('ก')).toBe('Thai');
		expect(scriptOf('क')).toBe('Devanagari');
		expect(scriptOf('1')).toBe('Common');
		expect(scriptOf('́')).toBe('Inherited');
		expect(scriptOf('ა')).toBe('Other');
	});

	it('flags invisible, zero-width, bidi and odd spaces', () => {
		expect(describeCodePoint('​')).toMatchObject({ label: 'ZWSP', flags: ['zero-width', 'invisible'] });
		expect(describeCodePoint('﻿').label).toBe('BOM');
		expect(describeCodePoint('‮').flags).toEqual(expect.arrayContaining(['bidi', 'invisible']));
		expect(describeCodePoint(' ')).toMatchObject({ label: 'NBSP', flags: ['space'] });
		expect(describeCodePoint('　').flags).toContain('space');
		expect(describeCodePoint('­').flags).toContain('invisible');
		expect(describeCodePoint('\t')).toMatchObject({ label: 'TAB', flags: ['control'] });
		expect(describeCodePoint(' ')).toMatchObject({ label: 'SP', flags: [] });
		expect(describeCodePoint('a')).toMatchObject({ label: undefined, flags: [] });
	});

	it('counts invisible characters, also beyond the row cap', () => {
		const { summary } = analyze('a​b​c', 2);
		expect(summary.invisibleCount).toBe(2);
	});
});

describe('cap', () => {
	it('truncates the table but keeps totals', () => {
		const result = analyze('x'.repeat(2500));
		expect(result.rows).toHaveLength(2000);
		expect(result.truncated).toBe(true);
		expect(result.summary.codePoints).toBe(2500);
	});
});

describe('actions', () => {
	it('normalises', () => {
		expect(normalizeText('é', 'NFC')).toBe('é');
		expect(normalizeText('é', 'NFD')).toBe('é');
		expect(normalizeText('ﬁ①', 'NFKC')).toBe('fi1');
		expect(normalizeText('ﬁ', 'NFKD')).toBe('fi');
		expect(normalizeText('ﬁ', 'NFC')).toBe('ﬁ');
	});

	it('strips invisible characters but keeps line breaks and emoji joiners by default', () => {
		expect(stripInvisible('a​b﻿c‮d­e\nf\tg')).toBe('abcde\nf\tg');
		expect(stripInvisible('👨‍👩‍👧')).toBe('👨‍👩‍👧');
		expect(stripInvisible('👨‍👩‍👧', false)).toBe('👨👩👧');
	});

	it('normalises unusual spaces', () => {
		expect(normalizeSpaces('a b　c d e')).toBe('a b c d e');
	});
});
