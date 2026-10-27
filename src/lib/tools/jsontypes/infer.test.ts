import { describe, expect, it } from 'vitest';
import { DEFAULT_INFER_OPTIONS, inferFromText, type Schema } from './infer';
import { fieldNames, singularize, typeNameFromKey } from './names';

function infer(text: string, overrides: Partial<typeof DEFAULT_INFER_OPTIONS> = {}): Schema {
	const result = inferFromText(text, { ...DEFAULT_INFER_OPTIONS, ...overrides });
	if (!result.ok) {
		throw new Error(`unexpected failure: ${result.reason}`);
	}
	return result.schema;
}

function fieldsOf(schema: Schema, name: string): Record<string, string> {
	const def = schema.objects.find((candidate) => candidate.name === name);
	if (def === undefined) {
		throw new Error(`missing object ${name}`);
	}
	const out: Record<string, string> = {};
	for (const field of def.fields) {
		const type = field.type;
		let label: string = type.kind === 'object' ? type.name : type.kind;
		if (type.kind === 'array') {
			label = `${type.item.kind === 'object' ? type.item.name : type.item.kind}[]`;
		}
		out[field.key] = `${label}${type.nullable ? '|null' : ''}${field.optional ? '?' : ''}`;
	}
	return out;
}

describe('inferFromText', () => {
	it('reports empty input, syntax errors and scalar roots', () => {
		expect(inferFromText('  ', DEFAULT_INFER_OPTIONS)).toMatchObject({ ok: false, reason: 'empty' });
		const bad = inferFromText('{"a": }', DEFAULT_INFER_OPTIONS);
		expect(bad).toMatchObject({ ok: false, reason: 'syntax' });
		expect(bad.ok ? '' : bad.message.length).toBeGreaterThan(0);
		expect(inferFromText('42', DEFAULT_INFER_OPTIONS)).toMatchObject({ ok: false, reason: 'scalar' });
		expect(inferFromText('"x"', DEFAULT_INFER_OPTIONS)).toMatchObject({ ok: false, reason: 'scalar' });
		expect(inferFromText('null', DEFAULT_INFER_OPTIONS)).toMatchObject({ ok: false, reason: 'scalar' });
	});

	it('infers scalars and keeps field order', () => {
		const schema = infer('{"b": 1, "a": "x", "c": true, "d": 1.5}');
		expect(fieldsOf(schema, 'Root')).toEqual({ b: 'integer', a: 'string', c: 'boolean', d: 'float' });
		expect(Object.keys(fieldsOf(schema, 'Root'))).toEqual(['b', 'a', 'c', 'd']);
	});

	it('merges array elements, marking missing fields optional and null fields nullable', () => {
		const schema = infer('{"rows": [{"a": 1, "b": "x"}, {"a": 2, "c": true}, {"a": null, "b": "y"}]}');
		expect(fieldsOf(schema, 'Row')).toEqual({
			a: 'integer|null',
			b: 'string?',
			c: 'boolean?'
		});
	});

	it('widens integer and float to float', () => {
		const schema = infer('{"xs": [1, 2.5], "cats": [{"n": 1}, {"n": 2.5}]}');
		expect(fieldsOf(schema, 'Root').xs).toBe('float[]');
		expect(fieldsOf(schema, 'Cat').n).toBe('float');
	});

	it('handles integers outside 64 bits per option', () => {
		const text = '{"big": 100000000000000000000000, "ok": 9007199254740993}';
		expect(fieldsOf(infer(text), 'Root')).toEqual({ big: 'float', ok: 'integer' });
		expect(fieldsOf(infer(text, { bigInt: 'string' }), 'Root')).toEqual({ big: 'string', ok: 'integer' });
	});

	it('turns mixed arrays into unknown and empty arrays into arrays of unknown', () => {
		const schema = infer('{"mixed": [1, "a"], "empty": [], "nulls": [null], "objAndNum": [{}, 1]}');
		expect(fieldsOf(schema, 'Root')).toEqual({
			mixed: 'unknown[]',
			empty: 'unknown[]',
			nulls: 'unknown[]',
			objAndNum: 'unknown[]'
		});
	});

	it('makes a nullable item when an array mixes a type with null', () => {
		const schema = infer('{"xs": [1, null]}');
		const root = schema.objects[0];
		const field = root?.fields[0];
		expect(field?.type).toEqual({
			kind: 'array',
			item: { kind: 'integer', nullable: true },
			nullable: false
		});
	});

	it('treats an always-null field as unknown', () => {
		expect(fieldsOf(infer('{"n": null}'), 'Root')).toEqual({ n: 'unknown' });
	});

	it('names nested types from keys, singularizing array items and keeping them unique', () => {
		const schema = infer(
			'{"items": [{"a": 1}], "item": {"b": 2}, "categories": [{"c": 3}], "user_profile": {"d": 4}}'
		);
		expect(schema.objects.map((def) => def.name)).toEqual([
			'Root',
			'Item',
			'Item2',
			'Category',
			'UserProfile'
		]);
	});

	it('reuses a type for structurally equal nested objects', () => {
		const schema = infer('{"billing": {"street": "a"}, "shipping": {"street": "b"}, "other": {"zip": "1"}}');
		expect(schema.objects.map((def) => def.name)).toEqual(['Root', 'Billing', 'Other']);
		expect(fieldsOf(schema, 'Root').shipping).toBe('Billing');
	});

	it('does not reuse a type when only optionality differs', () => {
		const schema = infer('{"a": {"x": 1}, "b": [{"x": 1}, {"y": 2}]}');
		expect(schema.objects.length).toBe(3);
	});

	it('emits the item type for a top-level array of objects', () => {
		const schema = infer('[{"id": 1}, {"id": 2, "name": "x"}]', { rootName: 'User' });
		expect(schema.root).toEqual({
			kind: 'array',
			item: { kind: 'object', name: 'UserItem', nullable: false },
			nullable: false
		});
		expect(fieldsOf(schema, 'UserItem')).toEqual({ id: 'integer', name: 'string?' });
	});

	it('supports a top-level array of scalars', () => {
		const schema = infer('[1, 2]');
		expect(schema.objects).toEqual([]);
		expect(schema.root).toEqual({ kind: 'array', item: { kind: 'integer', nullable: false }, nullable: false });
	});

	it('can make every field optional', () => {
		const schema = infer('{"a": 1, "b": {"c": 2}}', { allOptional: true });
		expect(fieldsOf(schema, 'Root')).toEqual({ a: 'integer?', b: 'B?' });
		expect(fieldsOf(schema, 'B')).toEqual({ c: 'integer?' });
	});

	it('sanitizes the root name', () => {
		expect(infer('{}', { rootName: 'my response' }).rootName).toBe('MyResponse');
		expect(infer('{}', { rootName: '' }).rootName).toBe('Root');
		expect(infer('{}', { rootName: '9lives' }).rootName).toBe('T9lives');
	});
});

describe('names', () => {
	it('singularizes simple English plurals', () => {
		expect(singularize('items')).toBe('item');
		expect(singularize('categories')).toBe('category');
		expect(singularize('boxes')).toBe('box');
		expect(singularize('addresses')).toBe('address');
		expect(singularize('status')).toBe('status');
		expect(singularize('data')).toBe('data');
		expect(singularize('people')).toBe('person');
		expect(singularize('class')).toBe('class');
	});

	it('builds PascalCase type names', () => {
		expect(typeNameFromKey('user-profile', false)).toBe('UserProfile');
		expect(typeNameFromKey('userProfiles', true)).toBe('UserProfile');
		expect(typeNameFromKey('123abc', false)).toBe('T123abc');
		expect(typeNameFromKey('', true)).toBe('Item');
		expect(typeNameFromKey('list', false)).toBe('ListModel');
	});

	it('sanitizes field names: dashes, spaces, digits, keywords, collisions', () => {
		const keywords = new Set(['type', 'class']);
		expect(
			fieldNames(['user-name', 'first name', '1st', 'type', 'userID', 'a_b', 'a-b', '', '$$'], {
				style: 'snake',
				keywords
			})
		).toEqual(['user_name', 'first_name', '_1st', 'type_', 'user_id', 'a_b', 'a_b2', 'field', 'field2']);
		expect(fieldNames(['user_id', 'class', '2fa'], { style: 'camel', keywords })).toEqual([
			'userId',
			'class_',
			'_2fa'
		]);
		expect(
			fieldNames(['id', 'api_url', '3d'], {
				style: 'pascal',
				keywords: new Set(),
				digitPrefix: 'Field',
				initialisms: true
			})
		).toEqual(['ID', 'APIURL', 'Field3d']);
	});
});
