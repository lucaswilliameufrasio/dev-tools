import type { TypeRef } from '../infer';
import { fieldNames } from '../names';
import { joinBlocks, type Emitter } from './types';

const KEYWORDS: ReadonlySet<string> = new Set([
	'as', 'break', 'const', 'continue', 'crate', 'else', 'enum', 'extern', 'false', 'fn', 'for',
	'if', 'impl', 'in', 'let', 'loop', 'match', 'mod', 'move', 'mut', 'pub', 'ref', 'return',
	'self', 'static', 'struct', 'super', 'trait', 'true', 'type', 'unsafe', 'use', 'where',
	'while', 'async', 'await', 'dyn', 'abstract', 'become', 'box', 'do', 'final', 'macro',
	'override', 'priv', 'typeof', 'unsized', 'virtual', 'yield', 'try'
]);

function rustBase(type: TypeRef): string {
	switch (type.kind) {
		case 'string':
			return 'String';
		case 'integer':
			return 'i64';
		case 'float':
			return 'f64';
		case 'boolean':
			return 'bool';
		case 'unknown':
			return 'serde_json::Value';
		case 'object':
			return type.name;
		case 'array':
			return `Vec<${rustType(type.item, false)}>`;
	}
}

function rustType(type: TypeRef, optional: boolean): string {
	const base = rustBase(type);
	const wrap = optional || (type.nullable && type.kind !== 'unknown');
	return wrap ? `Option<${base}>` : base;
}

export const emitRust: Emitter = (schema, options) => {
	const derives = options.rustCloneEq
		? 'Debug, Clone, PartialEq, Serialize, Deserialize'
		: 'Debug, Serialize, Deserialize';
	const blocks: string[] = ['use serde::{Deserialize, Serialize};'];
	if (schema.root.kind === 'array') {
		blocks.push(`pub type ${schema.rootName} = ${rustBase(schema.root)};`);
	}
	for (const def of schema.objects) {
		const names = fieldNames(
			def.fields.map((field) => field.key),
			{ style: 'snake', keywords: KEYWORDS }
		);
		const lines: string[] = [];
		for (let index = 0; index < def.fields.length; index += 1) {
			const field = def.fields[index];
			const name = names[index];
			if (field === undefined || name === undefined) {
				continue;
			}
			const attributes: string[] = [];
			if (name !== field.key) {
				attributes.push(`rename = ${JSON.stringify(field.key)}`);
			}
			if (field.optional) {
				attributes.push('skip_serializing_if = "Option::is_none"');
			}
			if (attributes.length > 0) {
				lines.push(`    #[serde(${attributes.join(', ')})]`);
			}
			lines.push(`    pub ${name}: ${rustType(field.type, field.optional)},`);
		}
		const body = lines.length === 0 ? '' : `\n${lines.join('\n')}\n`;
		blocks.push(`#[derive(${derives})]\npub struct ${def.name} {${body}}`);
	}
	return joinBlocks(blocks);
};
