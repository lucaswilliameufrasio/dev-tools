import { describe, expect, it } from 'vitest';
import { encodeBytes, encodeText } from '../base64/base64';
import {
	JWT_ALGORITHMS,
	generateTestSecret,
	setHeaderAlgorithm,
	signJwt,
	timeStatus,
	verifyJwt,
	withTimestamps,
	type JwtAlgorithm
} from './jwtCrypto';

const RFC_TOKEN =
	'eyJ0eXAiOiJKV1QiLA0KICJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJqb2UiLA0KICJleHAiOjEzMDA4MTkzODAsDQogImh0dHA6Ly9leGFtcGxlLmNvbS9pc19yb290Ijp0cnVlfQ.dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const RFC_JWK = JSON.stringify({
	kty: 'oct',
	k: 'AyM1SysPpbyDfgZld3umj1qzKObwVMkoqQ-EstJQLr_T-1qS0gZH75aKtMN3Yj0iPS4hcgUuTwjAzZr1Z9CAow'
});
const OPTIONS = { secretIsBase64: false };

function toPem(label: string, der: ArrayBuffer): string {
	const base64 = encodeBytes(new Uint8Array(der), 'standard', true);
	const lines = base64.match(/.{1,64}/g) ?? [];
	return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----`;
}

type PemPair = { publicPem: string; privatePem: string };

async function rsaPair(name: 'RSASSA-PKCS1-v1_5' | 'RSA-PSS'): Promise<PemPair> {
	const pair = await crypto.subtle.generateKey(
		{ name, modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
		true,
		['sign', 'verify']
	);
	return {
		publicPem: toPem('PUBLIC KEY', await crypto.subtle.exportKey('spki', pair.publicKey)),
		privatePem: toPem('PRIVATE KEY', await crypto.subtle.exportKey('pkcs8', pair.privateKey))
	};
}

async function ecPair(namedCurve: string): Promise<PemPair> {
	const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve }, true, ['sign', 'verify']);
	return {
		publicPem: toPem('PUBLIC KEY', await crypto.subtle.exportKey('spki', pair.publicKey)),
		privatePem: toPem('PRIVATE KEY', await crypto.subtle.exportKey('pkcs8', pair.privateKey))
	};
}

const HEADER = (alg: string): string => JSON.stringify({ alg, typ: 'JWT' });
const PAYLOAD = JSON.stringify({ sub: 'abc', exp: 4_000_000_000 });

describe('RFC 7515 A.1', () => {
	it('verifies the HS256 example with the JWK key', async () => {
		const outcome = await verifyJwt(RFC_TOKEN, 'HS256', RFC_JWK, OPTIONS, 1_300_000_000);
		expect(outcome.status).toBe('valid');
		expect(outcome.time).toBe('ok');
	});

	it('reports the token as expired later on', async () => {
		const outcome = await verifyJwt(RFC_TOKEN, 'HS256', RFC_JWK, OPTIONS, 1_400_000_000);
		expect(outcome.status).toBe('valid');
		expect(outcome.time).toBe('expired');
	});

	it('fails with a wrong secret', async () => {
		const outcome = await verifyJwt(RFC_TOKEN, 'HS256', 'not the key', OPTIONS, 1);
		expect(outcome.status).toBe('invalid-signature');
	});
});

describe('HMAC round trips', () => {
	for (const alg of ['HS256', 'HS384', 'HS512'] satisfies JwtAlgorithm[]) {
		it(`${alg} signs and verifies, detects tampering and wrong keys`, async () => {
			const signed = await signJwt(HEADER(alg), PAYLOAD, alg, 'secret', OPTIONS);
			expect(signed.ok).toBe(true);
			if (!signed.ok) {
				return;
			}
			expect((await verifyJwt(signed.token, alg, 'secret', OPTIONS)).status).toBe('valid');
			expect((await verifyJwt(signed.token, alg, 'other', OPTIONS)).status).toBe('invalid-signature');
			const [h = '', , s = ''] = signed.token.split('.');
			const tampered = `${h}.${encodeText('{"sub":"evil"}', 'url', false)}.${s}`;
			expect((await verifyJwt(tampered, alg, 'secret', OPTIONS)).status).toBe('invalid-signature');
		});
	}

	it('treats the secret as base64 when asked', async () => {
		const secret = encodeText('raw-secret', 'standard', true);
		const signed = await signJwt(HEADER('HS256'), PAYLOAD, 'HS256', 'raw-secret', OPTIONS);
		expect(signed.ok).toBe(true);
		if (signed.ok) {
			const outcome = await verifyJwt(signed.token, 'HS256', secret, { secretIsBase64: true });
			expect(outcome.status).toBe('valid');
		}
	});

	it('rejects invalid base64 secrets and empty keys', async () => {
		const bad = await verifyJwt(RFC_TOKEN, 'HS256', '***', { secretIsBase64: true }, 1);
		expect(bad).toMatchObject({ status: 'bad-key', keyReason: 'secret-base64' });
		const empty = await verifyJwt(RFC_TOKEN, 'HS256', '', OPTIONS, 1);
		expect(empty).toMatchObject({ status: 'bad-key', keyReason: 'empty' });
	});

	it('generates distinct test secrets', () => {
		expect(generateTestSecret()).not.toBe(generateTestSecret());
		expect(generateTestSecret().length).toBeGreaterThanOrEqual(43);
	});
});

describe('asymmetric round trips', () => {
	it('covers every algorithm family', async () => {
		const rsa = await rsaPair('RSASSA-PKCS1-v1_5');
		const pss = await rsaPair('RSA-PSS');
		const pairs: Record<string, PemPair> = {
			RS: rsa,
			PS: pss,
			P256: await ecPair('P-256'),
			P384: await ecPair('P-384'),
			P521: await ecPair('P-521')
		};
		const wrongRsa = await rsaPair('RSASSA-PKCS1-v1_5');
		const wrongEc = await ecPair('P-256');
		for (const alg of JWT_ALGORITHMS) {
			if (alg.startsWith('HS')) {
				continue;
			}
			const pair =
				alg === 'ES256'
					? pairs.P256
					: alg === 'ES384'
						? pairs.P384
						: alg === 'ES512'
							? pairs.P521
							: pairs[alg.slice(0, 2)];
			expect(pair, alg).toBeDefined();
			if (pair === undefined) {
				continue;
			}
			const signed = await signJwt(HEADER(alg), PAYLOAD, alg, pair.privatePem, OPTIONS);
			expect(signed.ok, alg).toBe(true);
			if (!signed.ok) {
				continue;
			}
			expect((await verifyJwt(signed.token, alg, pair.publicPem, OPTIONS)).status, alg).toBe('valid');
			const [h = '', p = '', s = ''] = signed.token.split('.');
			const flipped = `${s.slice(0, -2)}${s.endsWith('AA') ? 'BB' : 'AA'}`;
			expect((await verifyJwt(`${h}.${p}.${flipped}`, alg, pair.publicPem, OPTIONS)).status, alg).toBe(
				'invalid-signature'
			);
			const wrong = alg.startsWith('ES') ? wrongEc : wrongRsa;
			if (!(alg === 'ES384' || alg === 'ES512')) {
				expect((await verifyJwt(signed.token, alg, wrong.publicPem, OPTIONS)).status, alg).toBe(
					'invalid-signature'
				);
			}
		}
	}, 60_000);

	it('ES256 signatures are raw 64-byte r||s', async () => {
		const pair = await ecPair('P-256');
		const signed = await signJwt(HEADER('ES256'), PAYLOAD, 'ES256', pair.privatePem, OPTIONS);
		expect(signed.ok).toBe(true);
		if (signed.ok) {
			const signature = signed.token.split('.')[2] ?? '';
			expect(signature.length).toBe(86);
		}
	});

	it('accepts JWK keys and a private JWK for verification', async () => {
		const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
			'sign',
			'verify'
		]);
		const privateJwk = JSON.stringify(await crypto.subtle.exportKey('jwk', pair.privateKey));
		const publicJwk = JSON.stringify(await crypto.subtle.exportKey('jwk', pair.publicKey));
		const signed = await signJwt(HEADER('ES256'), PAYLOAD, 'ES256', privateJwk, OPTIONS);
		expect(signed.ok).toBe(true);
		if (signed.ok) {
			expect((await verifyJwt(signed.token, 'ES256', publicJwk, OPTIONS)).status).toBe('valid');
			expect((await verifyJwt(signed.token, 'ES256', privateJwk, OPTIONS)).status).toBe('valid');
		}
	});
});

describe('key errors', () => {
	it('maps PEM and JWK problems to reasons', async () => {
		const pair = await ecPair('P-256');
		const check = async (key: string, alg: JwtAlgorithm = 'ES256'): Promise<unknown> =>
			(await verifyJwt(RFC_TOKEN.replace('eyJ0eXAiOiJKV1QiLA0KICJhbGciOiJIUzI1NiJ9', encodeText(HEADER(alg), 'url', false)), alg, key, OPTIONS, 1)).keyReason;
		expect(await check('')).toBe('empty');
		expect(await check('hello')).toBe('pem-format');
		expect(await check('{oops')).toBe('jwk-json');
		expect(await check('{"a":1}')).toBe('jwk-invalid');
		expect(await check(pair.privatePem)).toBe('pem-wrong-kind');
		expect(await check('-----BEGIN RSA PRIVATE KEY-----\nAAAA\n-----END RSA PRIVATE KEY-----')).toBe('pem-unsupported');
		expect(await check('-----BEGIN PUBLIC KEY-----\n@@@\n-----END PUBLIC KEY-----')).toBe('pem-base64');
		expect(await check('-----BEGIN PUBLIC KEY-----\nAAAA\n-----END PUBLIC KEY-----')).toBe('import-failed');
		expect(await check(pair.publicPem, 'ES384')).toBe('import-failed');
	});

	it('rejects a public key for signing', async () => {
		const pair = await ecPair('P-256');
		const result = await signJwt(HEADER('ES256'), PAYLOAD, 'ES256', pair.publicPem, OPTIONS);
		expect(result).toEqual({ ok: false, reason: 'bad-key', keyReason: 'pem-wrong-kind' });
	});
});

describe('algorithm safety', () => {
	it('rejects alg none', async () => {
		const header = encodeText('{"alg":"none"}', 'url', false);
		const payload = encodeText('{"sub":"x"}', 'url', false);
		const outcome = await verifyJwt(`${header}.${payload}.`, 'HS256', 'secret', OPTIONS);
		expect(outcome.status).toBe('alg-none');
	});

	it('does not trust the token alg header', async () => {
		const signed = await signJwt(HEADER('HS512'), PAYLOAD, 'HS512', 'secret', OPTIONS);
		expect(signed.ok).toBe(true);
		if (signed.ok) {
			const outcome = await verifyJwt(signed.token, 'HS256', 'secret', OPTIONS);
			expect(outcome).toMatchObject({ status: 'alg-mismatch', headerAlg: 'HS512' });
		}
	});

	it('reports malformed tokens', async () => {
		expect((await verifyJwt('a.b', 'HS256', 'x', OPTIONS)).status).toBe('malformed');
		expect((await verifyJwt('@@.e30.x', 'HS256', 'x', OPTIONS)).status).toBe('malformed');
	});
});

describe('sign validation and helpers', () => {
	it('validates header, payload and alg', async () => {
		expect(await signJwt('{', PAYLOAD, 'HS256', 'k', OPTIONS)).toEqual({ ok: false, reason: 'header-json' });
		expect(await signJwt(HEADER('HS256'), '[]', 'HS256', 'k', OPTIONS)).toEqual({ ok: false, reason: 'payload-json' });
		expect(await signJwt(HEADER('HS384'), PAYLOAD, 'HS256', 'k', OPTIONS)).toEqual({ ok: false, reason: 'header-alg' });
	});

	it('reports time status from exp and nbf', () => {
		expect(timeStatus({ exp: 100 }, 200)).toBe('expired');
		expect(timeStatus({ nbf: 300 }, 200)).toBe('not-yet');
		expect(timeStatus({ nbf: 100, exp: 300 }, 200)).toBe('ok');
		expect(timeStatus({}, 200)).toBe('none');
	});

	it('sets alg and timestamps', () => {
		expect(JSON.parse(setHeaderAlgorithm(HEADER('HS256'), 'ES256'))).toEqual({ alg: 'ES256', typ: 'JWT' });
		expect(setHeaderAlgorithm('{', 'ES256')).toBe('{');
		const payload = JSON.parse(withTimestamps('{"a":1}', 1000));
		expect(payload).toEqual({ a: 1, iat: 1000, exp: 4600 });
	});
});
