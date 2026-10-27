import type { ObjectDef, TypeRef } from '../infer';
import type { Emitter } from './types';

type Json = Record<string, unknown>;

function scalarName(type: TypeRef): string | undefined {
	switch (type.kind) {
		case 'string':
			return 'string';
		case 'integer':
			return 'integer';
		case 'float':
			return 'number';
		case 'boolean':
			return 'boolean';
		default:
			return undefined;
	}
}

function typeSchema(type: TypeRef): Json {
	const nullable = type.nullable && type.kind !== 'unknown';
	if (type.kind === 'unknown') {
		return {};
	}
	if (type.kind === 'object') {
		const ref: Json = { $ref: `#/$defs/${type.name}` };
		return nullable ? { anyOf: [ref, { type: 'null' }] } : ref;
	}
	if (type.kind === 'array') {
		return { type: nullable ? ['array', 'null'] : 'array', items: typeSchema(type.item) };
	}
	const name = scalarName(type);
	return { type: nullable ? [name, 'null'] : name };
}

function objectSchema(def: ObjectDef): Json {
	const properties: Json = {};
	const required: string[] = [];
	for (const field of def.fields) {
		properties[field.key] = typeSchema(field.type);
		if (!field.optional) {
			required.push(field.key);
		}
	}
	const result: Json = { type: 'object', properties };
	if (required.length > 0) {
		result.required = required;
	}
	return result;
}

export const emitJsonSchema: Emitter = (schema) => {
	const head: Json = {
		$schema: 'https://json-schema.org/draft/2020-12/schema',
		title: schema.rootName
	};
	let rootDef: ObjectDef | undefined;
	let body: Json;
	if (schema.root.kind === 'object') {
		const rootName = schema.root.name;
		rootDef = schema.objects.find((def) => def.name === rootName);
		body = rootDef === undefined ? { type: 'object' } : objectSchema(rootDef);
	} else {
		body = typeSchema(schema.root);
	}
	const defs: Json = {};
	for (const def of schema.objects) {
		if (def !== rootDef) {
			defs[def.name] = objectSchema(def);
		}
	}
	const result: Json = { ...head, ...body };
	if (Object.keys(defs).length > 0) {
		result.$defs = defs;
	}
	return JSON.stringify(result, undefined, 2) + '\n';
};
