import { describe, expect, it } from 'vitest';
import { generateIds, ulid, uuidV7 } from './ids';

describe('ids', () => {
	it('generates uuid v4', () => {
		const [id = ''] = generateIds('uuid-v4', 1);
		expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
	});

	it('generates uuid v7 with the timestamp prefix', () => {
		const id = uuidV7(0x018f_0000_0000);
		expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
		expect(id.replace(/-/g, '').slice(0, 12)).toBe('018f00000000');
	});

	it('generates sortable ulids', () => {
		const earlier = ulid(1_700_000_000_000);
		const later = ulid(1_700_000_000_001);
		expect(earlier).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
		expect(earlier.slice(0, 10) < later.slice(0, 10)).toBe(true);
	});

	it('generates the requested count', () => {
		expect(generateIds('ulid', 5)).toHaveLength(5);
	});
});
