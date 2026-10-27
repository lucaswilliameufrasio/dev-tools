import { describe, expect, it } from 'vitest';
import {
	applyAction,
	computeStats,
	DEFAULT_OPTIONS,
	shuffle,
	slugify,
	splitLines,
	type LinesOptions
} from './lines';

const opts = (patch: Partial<LinesOptions> = {}): LinesOptions => ({ ...DEFAULT_OPTIONS, ...patch });

describe('lines', () => {
	it('sorts naturally so file2 comes before file10', () => {
		expect(applyAction('file10\nfile2\nfile1', 'natural', opts())).toBe('file1\nfile2\nfile10');
		expect(applyAction('file10\nfile2', 'sortAsc', opts())).toBe('file10\nfile2');
	});

	it('sorts with locale awareness for diacritics', () => {
		expect(applyAction('z\nárvore\nb\na', 'sortAsc', opts())).toBe('a\nárvore\nb\nz');
		expect(applyAction('a\nb', 'sortDesc', opts())).toBe('b\na');
	});

	it('sorts case-insensitively when asked', () => {
		expect(applyAction('b\nA\na\nB', 'sortAsc', opts({ caseInsensitive: true }))).toBe('A\na\nb\nB');
	});

	it('sorts by length keeping ties stable', () => {
		expect(applyAction('ccc\nb\naa\nd', 'byLength', opts())).toBe('b\nd\naa\nccc');
	});

	it('dedupes keeping the first, with optional case folding', () => {
		expect(applyAction('a\nA\na\nb', 'unique', opts())).toBe('a\nA\nb');
		expect(applyAction('a\nA\na\nb', 'unique', opts({ caseInsensitive: true }))).toBe('a\nb');
	});

	it('removes empty and trims', () => {
		expect(applyAction('a\n\n  \nb', 'removeEmpty', opts())).toBe('a\nb');
		expect(applyAction('  a \n\tb', 'trim', opts())).toBe('a\nb');
	});

	it('reverses and numbers', () => {
		expect(applyAction('a\nb\nc', 'reverse', opts())).toBe('c\nb\na');
		expect(applyAction('a\nb', 'numbers', opts())).toBe('1. a\n2. b');
	});

	it('joins and splits with custom separators', () => {
		expect(applyAction('a\nb\nc', 'join', opts({ separator: '|' }))).toBe('a|b|c');
		expect(applyAction('a|b|c', 'split', opts({ separator: '|' }))).toBe('a\nb\nc');
		expect(applyAction('a|b', 'split', opts({ separator: '' }))).toBe('a|b');
	});

	it('slugifies', () => {
		expect(slugify('Ação de Graças')).toBe('acao-de-gracas');
		expect(applyAction('Olá  Mundo!\nX_Y', 'slugify', opts())).toBe('ola-mundo\nx-y');
	});

	it('counts duplicates', () => {
		expect(applyAction('a\nb\na\nA', 'countDuplicates', opts())).toBe('2  a\n1  b\n1  A');
		expect(applyAction('a\nb\na\nA', 'countDuplicates', opts({ caseInsensitive: true }))).toBe(
			'3  a\n1  b'
		);
	});

	it('adds prefix and suffix', () => {
		expect(applyAction('a\nb', 'prefixSuffix', opts({ prefix: '"', suffix: '",' }))).toBe(
			'"a",\n"b",'
		);
	});

	it('handles CRLF input and trailing newline', () => {
		expect(splitLines('a\r\nb\r\n')).toEqual(['a', 'b']);
		expect(applyAction('b\r\na\r\n', 'sortAsc', opts())).toBe('a\nb');
		expect(splitLines('')).toEqual([]);
	});

	it('shuffles as a permutation using the provided random', () => {
		expect(shuffle(['a', 'b', 'c'], () => 0)).toEqual(['b', 'c', 'a']);
		const out = applyAction('a\nb\nc\nd\ne', 'shuffle', opts()).split('\n').sort();
		expect(out).toEqual(['a', 'b', 'c', 'd', 'e']);
	});

	it('computes stats', () => {
		expect(computeStats('olá mundo\nolá mundo\nx')).toEqual({
			lines: 3,
			unique: 2,
			words: 5,
			characters: 21,
			bytes: 23
		});
		expect(computeStats('').lines).toBe(0);
	});
});
