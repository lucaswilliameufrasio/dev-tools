import { describe, expect, it } from 'vitest';
import { hmacMd5, md5 } from './md5';
import { toHex } from './hash';

const encode = (text: string): Uint8Array => new TextEncoder().encode(text);

describe('md5', () => {
	it('matches the RFC 1321 test vectors', () => {
		expect(toHex(md5(encode('')))).toBe('d41d8cd98f00b204e9800998ecf8427e');
		expect(toHex(md5(encode('abc')))).toBe('900150983cd24fb0d6963f7d28e17f72');
		expect(toHex(md5(encode('message digest')))).toBe('f96b697d7cb7938d525a2f31aaf161d0');
		expect(
			toHex(md5(encode('12345678901234567890123456789012345678901234567890123456789012345678901234567890')))
		).toBe('57edf4a22be3c955ac49da2e2107b67a');
	});

	it('handles padding boundaries', () => {
		expect(toHex(md5(encode('a'.repeat(55))))).toBe('ef1772b6dff9a122358552954ad0df65');
		expect(toHex(md5(encode('a'.repeat(56))))).toBe('3b0c8ac703f828b04c6c197006d17218');
		expect(toHex(md5(encode('a'.repeat(64))))).toBe('014842d480b571495a4a0363793f7367');
	});

	it('handles utf-8 input', () => {
		expect(toHex(md5(encode('The quick brown fox jumps over the lazy dog')))).toBe(
			'9e107d9d372bb6826bd81d3542a419d6'
		);
	});

	it('matches the RFC 2202 hmac-md5 vector', () => {
		expect(toHex(hmacMd5(encode('Jefe'), encode('what do ya want for nothing?')))).toBe(
			'750c783e6ab0b503eaa86e310a5db738'
		);
	});
});
