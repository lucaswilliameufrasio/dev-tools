import type { TypeRef } from '../infer';
import { fieldNames } from '../names';
import { joinBlocks, type Emitter } from './types';

const NO_KEYWORDS: ReadonlySet<string> = new Set();

function csBase(type: TypeRef): string {
	switch (type.kind) {
		case 'string':
			return 'string';
		case 'integer':
			return 'long';
		case 'float':
			return 'double';
		case 'boolean':
			return 'bool';
		case 'unknown':
			return 'object';
		case 'object':
			return type.name;
		case 'array':
			return `List<${csType(type.item, false)}>`;
	}
}

function csType(type: TypeRef, optional: boolean): string {
	const base = csBase(type);
	return type.nullable || optional || type.kind === 'unknown' ? `${base}?` : base;
}

function csInitializer(type: TypeRef, optional: boolean): string {
	if (type.nullable || optional || type.kind === 'unknown') {
		return '';
	}
	switch (type.kind) {
		case 'string':
			return ' = string.Empty;';
		case 'array':
		case 'object':
			return ' = new();';
		default:
			return '';
	}
}

export const emitCsharp: Emitter = (schema) => {
	const blocks: string[] = [];
	if (schema.root.kind === 'array') {
		blocks.push(`// The JSON root is an array: ${csBase(schema.root)} (${schema.rootName})`);
	}
	for (const def of schema.objects) {
		const names = fieldNames(
			def.fields.map((field) => field.key),
			{ style: 'pascal', keywords: NO_KEYWORDS, digitPrefix: 'Field' }
		);
		const lines: string[] = [];
		for (let index = 0; index < def.fields.length; index += 1) {
			const field = def.fields[index];
			const name = names[index];
			if (field === undefined || name === undefined) {
				continue;
			}
			if (lines.length > 0) {
				lines.push('');
			}
			lines.push(`    [JsonPropertyName(${JSON.stringify(field.key)})]`);
			const init = csInitializer(field.type, field.optional);
			lines.push(
				`    public ${csType(field.type, field.optional)} ${name} { get; set; }${init === '' ? '' : init}`
			);
		}
		blocks.push(`public class ${def.name}\n{${lines.length === 0 ? '' : `\n${lines.join('\n')}`}\n}`);
	}
	const body = blocks.join('\n\n');
	const usings: string[] = [];
	if (body.includes('List<')) {
		usings.push('using System.Collections.Generic;');
	}
	if (body.includes('[JsonPropertyName(')) {
		usings.push('using System.Text.Json.Serialization;');
	}
	const header = ['#nullable enable', ...usings].join('\n');
	return joinBlocks([header, ...blocks]);
};
