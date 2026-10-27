import { describe, expect, it } from 'vitest';
import { decodeJwt } from './jwt';

const TOKEN =
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

describe('jwt', () => {
	it('decodes header, payload and time claims', () => {
		const result = decodeJwt(TOKEN);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.token.header).toEqual({ alg: 'HS256', typ: 'JWT' });
			expect(result.token.payload).toEqual({ sub: '1234567890', name: 'John Doe', iat: 1516239022 });
			expect(result.token.times[0]?.date.toISOString()).toBe('2018-01-18T01:30:22.000Z');
		}
	});

	it('accepts a Bearer prefix', () => {
		expect(decodeJwt(`Bearer ${TOKEN}`).ok).toBe(true);
	});

	it('rejects malformed tokens', () => {
		expect(decodeJwt('abc.def')).toEqual({ ok: false, reason: 'format' });
		expect(decodeJwt('@@.e30.x')).toEqual({ ok: false, reason: 'header' });
	});
});
