import { describe, expect, it } from 'vitest';
import { diffLines } from './diff';

describe('diff', () => {
	it('marks added and removed lines', () => {
		const result = diffLines('a\nb\nc', 'a\nc\nd');
		expect(result).toEqual({
			ok: true,
			added: 1,
			removed: 1,
			lines: [
				{ kind: 'same', text: 'a' },
				{ kind: 'removed', text: 'b' },
				{ kind: 'same', text: 'c' },
				{ kind: 'added', text: 'd' }
			]
		});
	});

	it('handles empty sides', () => {
		expect(diffLines('', 'x')).toMatchObject({ ok: true, added: 1, removed: 0 });
		expect(diffLines('x', '')).toMatchObject({ ok: true, added: 0, removed: 1 });
	});

	it('refuses inputs that are too large', () => {
		const big = Array.from({ length: 3000 }, (_, index) => String(index)).join('\n');
		expect(diffLines(big, big)).toEqual({ ok: false, reason: 'too-large' });
	});
});
