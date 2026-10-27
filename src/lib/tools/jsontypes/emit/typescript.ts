import type { TypeRef } from '../infer';
import { isPlainIdentifier } from '../names';
import { joinBlocks, type Emitter } from './types';

function tsBase(type: TypeRef): string {
	switch (type.kind) {
		case 'string':
			return 'string';
		case 'integer':
		case 'float':
			return 'number';
		case 'boolean':
			return 'boolean';
		case 'unknown':
			return 'unknown';
		case 'object':
			return type.name;
		case 'array': {
			const inner = tsType(type.item);
			return inner.includes(' | ') ? `(${inner})[]` : `${inner}[]`;
		}
	}
}

function tsType(type: TypeRef): string {
	const base = tsBase(type);
	return type.nullable && type.kind !== 'unknown' ? `${base} | null` : base;
}

export const emitTypescript: Emitter = (schema, options) => {
	const blocks: string[] = [];
	if (schema.root.kind === 'array') {
		blocks.push(`export type ${schema.rootName} = ${tsBase(schema.root)};`);
	}
	for (const def of schema.objects) {
		const lines = def.fields.map((field) => {
			const key = isPlainIdentifier(field.key) ? field.key : JSON.stringify(field.key);
			return `  ${key}${field.optional ? '?' : ''}: ${tsType(field.type)};`;
		});
		if (options.tsStyle === 'interface') {
			blocks.push(
				lines.length === 0
					? `export interface ${def.name} {}`
					: `export interface ${def.name} {\n${lines.join('\n')}\n}`
			);
		} else {
			blocks.push(
				lines.length === 0
					? `export type ${def.name} = Record<string, never>;`
					: `export type ${def.name} = {\n${lines.join('\n')}\n};`
			);
		}
	}
	return joinBlocks(blocks);
};
