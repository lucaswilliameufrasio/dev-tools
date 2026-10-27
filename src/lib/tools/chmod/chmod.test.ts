import { describe, expect, it } from 'vitest';
import {
	applyUmask,
	hasPermission,
	hasSpecial,
	octalCommand,
	parseOctal,
	parseSymbolic,
	PRESETS,
	setPermission,
	setSpecial,
	symbolicCommand,
	toOctal,
	toSymbolic
} from './chmod';

describe('octal and symbolic', () => {
	it('known values', () => {
		expect(toSymbolic(0o755)).toBe('rwxr-xr-x');
		expect(toSymbolic(0o644)).toBe('rw-r--r--');
		expect(toSymbolic(0o000)).toBe('---------');
		expect(toSymbolic(0o4755)).toBe('rwsr-xr-x');
		expect(toSymbolic(0o4644)).toBe('rwSr--r--');
		expect(toSymbolic(0o2755)).toBe('rwxr-sr-x');
		expect(toSymbolic(0o2745)).toBe('rwxr-Sr-x');
		expect(toSymbolic(0o1777)).toBe('rwxrwxrwt');
		expect(toSymbolic(0o1776)).toBe('rwxrwxrwT');
	});

	it('round-trips all 4096 modes', () => {
		for (let mode = 0; mode < 4096; mode += 1) {
			const symbolic = toSymbolic(mode);
			expect(parseSymbolic(symbolic)).toEqual({ ok: true, mode });
			expect(parseOctal(toOctal(mode))).toEqual({ ok: true, mode });
		}
	});

	it('octal formatting', () => {
		expect(toOctal(0o7)).toBe('007');
		expect(toOctal(0o4755)).toBe('4755');
		expect(toOctal(0o755)).toBe('755');
	});

	it('rejects malformed input', () => {
		for (const bad of ['', '75', '75555', '758', 'abc', '-1']) {
			expect(parseOctal(bad).ok).toBe(false);
		}
		for (const bad of ['rwxr-xr-', 'rwxr-xr-xx', 'xwrr-xr-x', 'rwtr-xr-x', 'rwxr-xr-s', 'rwxr-xr-S']) {
			expect(parseSymbolic(bad).ok).toBe(false);
		}
	});

	it('accepts four-digit octal with leading zero', () => {
		expect(parseOctal('0755')).toEqual({ ok: true, mode: 0o755 });
	});
});

describe('grid helpers', () => {
	it('toggles bits', () => {
		let mode = 0;
		mode = setPermission(mode, 'owner', 'read', true);
		mode = setPermission(mode, 'owner', 'write', true);
		mode = setPermission(mode, 'other', 'execute', true);
		expect(toOctal(mode)).toBe('601');
		expect(hasPermission(mode, 'group', 'read')).toBe(false);
		mode = setSpecial(mode, 'setgid', true);
		expect(hasSpecial(mode, 'setgid')).toBe(true);
		expect(toOctal(mode)).toBe('2601');
		expect(toOctal(setSpecial(mode, 'setgid', false))).toBe('601');
	});
});

describe('commands', () => {
	it('builds snippets', () => {
		expect(octalCommand(0o755)).toBe('chmod 755 file');
		expect(symbolicCommand(0o755)).toBe('chmod u=rwx,g=rx,o=rx file');
		expect(symbolicCommand(0o4755, 'app')).toBe('chmod u=rwxs,g=rx,o=rx app');
		expect(symbolicCommand(0o1777, 'tmp')).toBe('chmod u=rwx,g=rwx,o=rwxt tmp');
		expect(symbolicCommand(0)).toBe('chmod u=,g=,o= file');
	});
});

describe('umask', () => {
	it('computes defaults', () => {
		expect(applyUmask('022')).toMatchObject({ ok: true, files: '644', directories: '755' });
		expect(applyUmask('077')).toMatchObject({ ok: true, files: '600', directories: '700' });
		expect(applyUmask('002')).toMatchObject({ ok: true, files: '664', directories: '775' });
		expect(applyUmask('0000')).toMatchObject({ ok: true, files: '666', directories: '777' });
		expect(applyUmask('777')).toMatchObject({ ok: true, files: '000', directories: '000' });
		expect(applyUmask('027')).toMatchObject({ files: '640', directories: '750', filesSymbolic: 'rw-r-----' });
	});

	it('rejects invalid umask', () => {
		expect(applyUmask('89')).toEqual({ ok: false, reason: 'format' });
		expect(applyUmask('')).toEqual({ ok: false, reason: 'format' });
	});
});

describe('presets', () => {
	it('are valid modes', () => {
		for (const preset of PRESETS) {
			expect(parseOctal(preset.octal).ok).toBe(true);
		}
		expect(PRESETS).toHaveLength(10);
	});
});
