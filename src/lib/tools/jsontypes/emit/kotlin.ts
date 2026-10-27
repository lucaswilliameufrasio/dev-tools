import type { TypeRef } from '../infer';
import { fieldNames } from '../names';
import { joinBlocks, type Emitter } from './types';

const KEYWORDS: ReadonlySet<string> = new Set([
	'as', 'break', 'class', 'continue', 'do', 'else', 'false', 'for', 'fun', 'if', 'in',
	'interface', 'is', 'null', 'object', 'package', 'return', 'super', 'this', 'throw', 'true',
	'try', 'typealias', 'typeof', 'val', 'var', 'when', 'while'
]);

function ktBase(type: TypeRef): string {
	switch (type.kind) {
		case 'string':
			return 'String';
		case 'integer':
			return 'Long';
		case 'float':
			return 'Double';
		case 'boolean':
			return 'Boolean';
		case 'unknown':
			return 'JsonElement';
		case 'object':
			return type.name;
		case 'array':
			return `List<${ktType(type.item, false)}>`;
	}
}

function ktType(type: TypeRef, optional: boolean): string {
	const base = ktBase(type);
	const nullable = (type.nullable && type.kind !== 'unknown') || optional;
	return nullable ? `${base}?` : base;
}

function ktString(text: string): string {
	return JSON.stringify(text).replaceAll('$', '\\$');
}

export const emitKotlin: Emitter = (schema) => {
	const blocks: string[] = [];
	if (schema.root.kind === 'array') {
		blocks.push(`typealias ${schema.rootName} = ${ktBase(schema.root)}`);
	}
	for (const def of schema.objects) {
		const names = fieldNames(
			def.fields.map((field) => field.key),
			{ style: 'camel', keywords: KEYWORDS }
		);
		if (def.fields.length === 0) {
			blocks.push(`@Serializable\nclass ${def.name}`);
			continue;
		}
		const lines: string[] = [];
		for (let index = 0; index < def.fields.length; index += 1) {
			const field = def.fields[index];
			const name = names[index];
			if (field === undefined || name === undefined) {
				continue;
			}
			const rename = name !== field.key ? `@SerialName(${ktString(field.key)}) ` : '';
			const nullable = field.optional || (field.type.nullable && field.type.kind !== 'unknown');
			const suffix = nullable ? ' = null' : '';
			const last = index === def.fields.length - 1;
			lines.push(
				`    ${rename}val ${name}: ${ktType(field.type, field.optional)}${suffix}${last ? '' : ','}`
			);
		}
		blocks.push(`@Serializable\ndata class ${def.name}(\n${lines.join('\n')}\n)`);
	}
	const body = blocks.join('\n\n');
	const imports: string[] = [];
	if (body.includes('@SerialName(')) {
		imports.push('import kotlinx.serialization.SerialName');
	}
	imports.push('import kotlinx.serialization.Serializable');
	if (/\bJsonElement\b/.test(body)) {
		imports.push('import kotlinx.serialization.json.JsonElement');
	}
	return joinBlocks([imports.join('\n'), ...blocks]);
};
