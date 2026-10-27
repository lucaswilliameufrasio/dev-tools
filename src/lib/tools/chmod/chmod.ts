export const SETUID = 0o4000;
export const SETGID = 0o2000;
export const STICKY = 0o1000;

export type Who = 'owner' | 'group' | 'other';
export type Right = 'read' | 'write' | 'execute';
export type Special = 'setuid' | 'setgid' | 'sticky';

export const WHO_ORDER: readonly Who[] = ['owner', 'group', 'other'];
export const RIGHT_ORDER: readonly Right[] = ['read', 'write', 'execute'];

const WHO_SHIFT: Record<Who, number> = { owner: 6, group: 3, other: 0 };
const RIGHT_BIT: Record<Right, number> = { read: 4, write: 2, execute: 1 };
const SPECIAL_BIT: Record<Special, number> = { setuid: SETUID, setgid: SETGID, sticky: STICKY };

export type ParseResult = { ok: true; mode: number } | { ok: false; reason: 'format' };

export function permissionBit(who: Who, right: Right): number {
	return RIGHT_BIT[right] << WHO_SHIFT[who];
}

export function hasPermission(mode: number, who: Who, right: Right): boolean {
	return (mode & permissionBit(who, right)) !== 0;
}

export function hasSpecial(mode: number, special: Special): boolean {
	return (mode & SPECIAL_BIT[special]) !== 0;
}

export function setPermission(mode: number, who: Who, right: Right, on: boolean): number {
	const bit = permissionBit(who, right);
	return on ? mode | bit : mode & ~bit;
}

export function setSpecial(mode: number, special: Special, on: boolean): number {
	const bit = SPECIAL_BIT[special];
	return on ? mode | bit : mode & ~bit;
}

export function parseOctal(text: string): ParseResult {
	const trimmed = text.trim();
	if (!/^[0-7]{3,4}$/.test(trimmed)) {
		return { ok: false, reason: 'format' };
	}
	return { ok: true, mode: parseInt(trimmed, 8) };
}

/** Three digits, or four when any special bit is set. */
export function toOctal(mode: number): string {
	const digits = (mode & 0o7777).toString(8);
	if ((mode & 0o7000) === 0) {
		return digits.padStart(3, '0');
	}
	return digits.padStart(4, '0');
}

function triplet(mode: number, who: Who, specialBit: number, setChar: string, unsetChar: string): string {
	const read = hasPermission(mode, who, 'read') ? 'r' : '-';
	const write = hasPermission(mode, who, 'write') ? 'w' : '-';
	const execute = hasPermission(mode, who, 'execute');
	let last = execute ? 'x' : '-';
	if ((mode & specialBit) !== 0) {
		last = execute ? setChar : unsetChar;
	}
	return read + write + last;
}

export function toSymbolic(mode: number): string {
	return (
		triplet(mode, 'owner', SETUID, 's', 'S') +
		triplet(mode, 'group', SETGID, 's', 'S') +
		triplet(mode, 'other', STICKY, 't', 'T')
	);
}

const SYMBOLIC_PATTERN = /^[r-][w-][xsS-][r-][w-][xsS-][r-][w-][xtT-]$/;

export function parseSymbolic(text: string): ParseResult {
	const value = text.trim();
	if (!SYMBOLIC_PATTERN.test(value)) {
		return { ok: false, reason: 'format' };
	}
	let mode = 0;
	for (let index = 0; index < 9; index += 1) {
		const char = value[index];
		const who = WHO_ORDER[Math.floor(index / 3)];
		const position = index % 3;
		if (position === 0 && char === 'r') {
			mode |= permissionBit(who, 'read');
		} else if (position === 1 && char === 'w') {
			mode |= permissionBit(who, 'write');
		} else if (position === 2) {
			if (char === 'x' || char === 's' || char === 't') {
				mode |= permissionBit(who, 'execute');
			}
			if (char === 's' || char === 'S') {
				mode |= who === 'owner' ? SETUID : SETGID;
			}
			if (char === 't' || char === 'T') {
				mode |= STICKY;
			}
		}
	}
	return { ok: true, mode };
}

/** Symbolic argument for chmod, e.g. `u=rwx,g=rx,o=rx`. */
export function toSymbolicCommandArg(mode: number): string {
	const clauses: string[] = [];
	const letters: Record<Who, string> = { owner: 'u', group: 'g', other: 'o' };
	for (const who of WHO_ORDER) {
		let rights = '';
		if (hasPermission(mode, who, 'read')) {
			rights += 'r';
		}
		if (hasPermission(mode, who, 'write')) {
			rights += 'w';
		}
		if (hasPermission(mode, who, 'execute')) {
			rights += 'x';
		}
		if (who === 'owner' && hasSpecial(mode, 'setuid')) {
			rights += 's';
		}
		if (who === 'group' && hasSpecial(mode, 'setgid')) {
			rights += 's';
		}
		if (who === 'other' && hasSpecial(mode, 'sticky')) {
			rights += 't';
		}
		clauses.push(`${letters[who]}=${rights}`);
	}
	return clauses.join(',');
}

export function octalCommand(mode: number, file = 'file'): string {
	return `chmod ${toOctal(mode)} ${file}`;
}

export function symbolicCommand(mode: number, file = 'file'): string {
	return `chmod ${toSymbolicCommandArg(mode)} ${file}`;
}

export type UmaskResult =
	| { ok: true; umask: string; files: string; directories: string; filesSymbolic: string; directoriesSymbolic: string }
	| { ok: false; reason: 'format' };

export function applyUmask(text: string): UmaskResult {
	const trimmed = text.trim();
	if (!/^[0-7]{3,4}$/.test(trimmed)) {
		return { ok: false, reason: 'format' };
	}
	const umask = parseInt(trimmed, 8) & 0o777;
	const files = 0o666 & ~umask;
	const directories = 0o777 & ~umask;
	return {
		ok: true,
		umask: umask.toString(8).padStart(4, '0'),
		files: toOctal(files),
		directories: toOctal(directories),
		filesSymbolic: toSymbolic(files),
		directoriesSymbolic: toSymbolic(directories)
	};
}

export type Preset = { octal: string; key: 'p644' | 'p600' | 'p700' | 'p755' | 'p750' | 'p775' | 'p777' | 'p1777' | 'p2775' | 'p4755' };

export const PRESETS: readonly Preset[] = [
	{ octal: '644', key: 'p644' },
	{ octal: '600', key: 'p600' },
	{ octal: '700', key: 'p700' },
	{ octal: '755', key: 'p755' },
	{ octal: '750', key: 'p750' },
	{ octal: '775', key: 'p775' },
	{ octal: '777', key: 'p777' },
	{ octal: '1777', key: 'p1777' },
	{ octal: '2775', key: 'p2775' },
	{ octal: '4755', key: 'p4755' }
];
