import { describe, expect, it } from 'vitest';
import {
	exceedsBcryptLimit,
	generateSalt,
	isBcryptHash,
	isSlowCost,
	passwordByteLength,
	runBcrypt,
	validateCost
} from './bcrypt';

describe('pure helpers', () => {
	it('counts UTF-8 bytes, not characters', () => {
		expect(passwordByteLength('abc')).toBe(3);
		expect(passwordByteLength('é')).toBe(2);
		expect(passwordByteLength('😀')).toBe(4);
	});

	it('flags passwords above 72 bytes', () => {
		expect(exceedsBcryptLimit('a'.repeat(72))).toBe(false);
		expect(exceedsBcryptLimit('a'.repeat(73))).toBe(true);
		expect(exceedsBcryptLimit('é'.repeat(37))).toBe(true);
	});

	it('validates cost range and slow threshold', () => {
		expect(validateCost(3)).toBe(false);
		expect(validateCost(4)).toBe(true);
		expect(validateCost(15)).toBe(true);
		expect(validateCost(16)).toBe(false);
		expect(validateCost(10.5)).toBe(false);
		expect(isSlowCost(12)).toBe(false);
		expect(isSlowCost(13)).toBe(true);
	});

	it('generates 16 random bytes', () => {
		const a = generateSalt();
		const b = generateSalt();
		expect(a.length).toBe(16);
		expect(Array.from(a)).not.toEqual(Array.from(b));
	});

	it('recognises the bcrypt format', () => {
		expect(isBcryptHash('$2a$05$CCCCCCCCCCCCCCCCCCCCC.E5YPO9kmyuRGyh0XouQYb4YMJKvyOeW')).toBe(true);
		expect(isBcryptHash('$2b$99$CCCCCCCCCCCCCCCCCCCCC.E5YPO9kmyuRGyh0XouQYb4YMJKvyOeW')).toBe(false);
		expect(isBcryptHash('not a hash')).toBe(false);
		expect(isBcryptHash('$2b$10$short')).toBe(false);
	});
});

describe('hash-wasm bcrypt', () => {
	it('verifies a reference vector (crypt_blowfish test suite)', async () => {
		const result = await runBcrypt({
			kind: 'verify',
			password: 'U*U',
			hash: '$2a$05$CCCCCCCCCCCCCCCCCCCCC.E5YPO9kmyuRGyh0XouQYb4YMJKvyOeW'
		});
		expect(result).toMatchObject({ ok: true, kind: 'verify', matches: true });
	});

	it('rejects a wrong password for the reference vector', async () => {
		const result = await runBcrypt({
			kind: 'verify',
			password: 'U*V',
			hash: '$2a$05$CCCCCCCCCCCCCCCCCCCCC.E5YPO9kmyuRGyh0XouQYb4YMJKvyOeW'
		});
		expect(result).toMatchObject({ ok: true, matches: false });
	});

	it('round-trips hash then verify with a $2b$ string', async () => {
		const hashed = await runBcrypt({
			kind: 'hash',
			password: 'correct horse',
			cost: 4,
			salt: generateSalt()
		});
		expect(hashed.ok).toBe(true);
		if (!hashed.ok || hashed.kind !== 'hash') {
			return;
		}
		expect(hashed.hash).toMatch(/^\$2b\$04\$[./A-Za-z0-9]{53}$/);
		const good = await runBcrypt({ kind: 'verify', password: 'correct horse', hash: hashed.hash });
		const bad = await runBcrypt({ kind: 'verify', password: 'wrong', hash: hashed.hash });
		expect(good).toMatchObject({ ok: true, matches: true });
		expect(bad).toMatchObject({ ok: true, matches: false });
	});

	it('is deterministic for the same salt', async () => {
		const salt = new Uint8Array(16).fill(7);
		const a = await runBcrypt({ kind: 'hash', password: 'x', cost: 4, salt });
		const b = await runBcrypt({ kind: 'hash', password: 'x', cost: 4, salt });
		expect(a).toMatchObject({ ok: true });
		expect(a.ok && a.kind === 'hash' ? a.hash : '').toBe(b.ok && b.kind === 'hash' ? b.hash : '?');
	});

	it('ignores bytes beyond 72', async () => {
		const base = 'a'.repeat(72);
		const hashed = await runBcrypt({ kind: 'hash', password: base, cost: 4, salt: generateSalt() });
		if (!hashed.ok || hashed.kind !== 'hash') {
			throw new Error('hash failed');
		}
		const result = await runBcrypt({ kind: 'verify', password: `${base}zzz`, hash: hashed.hash });
		expect(result).toMatchObject({ ok: true, matches: true });
	});

	it('reports validation failures', async () => {
		const salt = generateSalt();
		expect(await runBcrypt({ kind: 'hash', password: '', cost: 10, salt })).toEqual({
			ok: false,
			reason: 'empty-password'
		});
		expect(await runBcrypt({ kind: 'hash', password: 'x', cost: 2, salt })).toEqual({
			ok: false,
			reason: 'invalid-cost'
		});
		expect(await runBcrypt({ kind: 'verify', password: 'x', hash: 'nope' })).toEqual({
			ok: false,
			reason: 'invalid-hash'
		});
	});
});
