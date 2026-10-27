import { describe, expect, it } from 'vitest';
import {
	ARGON2_DEFAULTS,
	encodedToHex,
	generateSalt,
	parseEncoded,
	runArgon2,
	validateParams
} from './argon2';

// Vector from the argon2 reference README:
// echo -n password | argon2 somesalt -t 2 -m 16 -p 4 -l 24  (argon2i)
const CLI_ENCODED =
	'$argon2i$v=19$m=65536,t=2,p=4$c29tZXNhbHQ$RdescudvJCsgt3ub+b+dWRWJTmaaJObG';
const CLI_HEX = '45d7ac72e76f242b20b77b9bf9bf9d5915894e669a24e6c6';

describe('validateParams', () => {
	it('accepts the defaults', () => {
		expect(validateParams(ARGON2_DEFAULTS)).toBeUndefined();
	});

	it('rejects out-of-range values with specific reasons', () => {
		expect(validateParams({ ...ARGON2_DEFAULTS, memory: 7 })).toBe('invalid-memory');
		expect(validateParams({ ...ARGON2_DEFAULTS, memory: 8.5 })).toBe('invalid-memory');
		expect(validateParams({ ...ARGON2_DEFAULTS, iterations: 0 })).toBe('invalid-iterations');
		expect(validateParams({ ...ARGON2_DEFAULTS, parallelism: 0 })).toBe('invalid-parallelism');
		expect(validateParams({ ...ARGON2_DEFAULTS, hashLength: 3 })).toBe('invalid-hash-length');
		expect(validateParams({ ...ARGON2_DEFAULTS, memory: 16, parallelism: 3 })).toBe(
			'invalid-memory-for-parallelism'
		);
	});
});

describe('encoded string helpers', () => {
	it('parses params out of an encoded hash', () => {
		const parsed = parseEncoded(CLI_ENCODED);
		expect(parsed).toMatchObject({
			variant: 'argon2i',
			memory: 65536,
			iterations: 2,
			parallelism: 4,
			hashLength: 24
		});
	});

	it('extracts the raw hash as hex', () => {
		expect(encodedToHex(CLI_ENCODED)).toBe(CLI_HEX);
	});

	it('rejects malformed input', () => {
		expect(parseEncoded('nope')).toBeUndefined();
		expect(parseEncoded('$argon2id$v=16$m=8,t=1,p=1$c29tZXNhbHQ$AAECAwQFBgc')).toBeUndefined();
		expect(parseEncoded('$argon2id$v=19$m=1,t=1,p=1$c29tZXNhbHQ$AAECAwQFBgc')).toBeUndefined();
	});
});

describe('hash-wasm argon2', () => {
	it('round-trips every variant with small memory', async () => {
		for (const variant of ['argon2id', 'argon2i', 'argon2d'] as const) {
			const hashed = await runArgon2({
				kind: 'hash',
				password: 'senha-secreta',
				salt: generateSalt(),
				...ARGON2_DEFAULTS,
				variant,
				memory: 64,
				iterations: 1
			});
			if (!hashed.ok || hashed.kind !== 'hash') {
				throw new Error(`hash failed for ${variant}`);
			}
			expect(hashed.encoded.startsWith(`$${variant}$v=19$m=64,t=1,p=1$`)).toBe(true);
			expect(hashed.hex).toMatch(/^[0-9a-f]{64}$/);
			const good = await runArgon2({
				kind: 'verify',
				password: 'senha-secreta',
				hash: hashed.encoded
			});
			const bad = await runArgon2({ kind: 'verify', password: 'outra', hash: hashed.encoded });
			expect(good).toMatchObject({ ok: true, matches: true });
			expect(bad).toMatchObject({ ok: true, matches: false });
		}
	});

	it('verifies the argon2 reference CLI vector', async () => {
		const result = await runArgon2({ kind: 'verify', password: 'password', hash: CLI_ENCODED });
		expect(result).toMatchObject({ ok: true, matches: true });
	});

	it('is deterministic for a fixed salt and respects hash length', async () => {
		const request = {
			kind: 'hash' as const,
			password: 'x',
			salt: new Uint8Array(16).fill(1),
			...ARGON2_DEFAULTS,
			memory: 32,
			hashLength: 16
		};
		const a = await runArgon2(request);
		const b = await runArgon2(request);
		expect(a.ok && a.kind === 'hash' ? a.hex : '').toHaveLength(32);
		expect(a).toEqual(
			expect.objectContaining({ encoded: b.ok && b.kind === 'hash' ? b.encoded : '?' })
		);
	});

	it('reports validation failures', async () => {
		const salt = generateSalt();
		expect(
			await runArgon2({ kind: 'hash', password: '', salt, ...ARGON2_DEFAULTS })
		).toEqual({ ok: false, reason: 'empty-password' });
		expect(
			await runArgon2({ kind: 'hash', password: 'x', salt, ...ARGON2_DEFAULTS, memory: 4 })
		).toEqual({ ok: false, reason: 'invalid-memory' });
		expect(await runArgon2({ kind: 'verify', password: 'x', hash: 'bad' })).toEqual({
			ok: false,
			reason: 'invalid-hash'
		});
	});
});
