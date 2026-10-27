import { describe, expect, it } from 'vitest';
import { digest, hmac } from './hash';

const encode = (text: string): Uint8Array => new TextEncoder().encode(text);

describe('hash', () => {
	it('computes sha-256', async () => {
		expect(await digest('SHA-256', encode('abc'))).toBe(
			'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
		);
	});

	it('computes sha-1 of empty input', async () => {
		expect(await digest('SHA-1', encode(''))).toBe('da39a3ee5e6b4b0d3255bfef95601890afd80709');
	});

	it('computes hmac-sha256', async () => {
		expect(
			await hmac('SHA-256', encode('key'), encode('The quick brown fox jumps over the lazy dog'))
		).toBe('f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8');
	});
});
