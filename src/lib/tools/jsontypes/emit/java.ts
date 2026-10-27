import type { TypeRef } from '../infer';
import { fieldNames } from '../names';
import { joinBlocks, type Emitter } from './types';

const KEYWORDS: ReadonlySet<string> = new Set([
	'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class', 'const',
	'continue', 'default', 'do', 'double', 'else', 'enum', 'extends', 'final', 'finally', 'float',
	'for', 'goto', 'if', 'implements', 'import', 'instanceof', 'int', 'interface', 'long',
	'native', 'new', 'package', 'private', 'protected', 'public', 'return', 'short', 'static',
	'strictfp', 'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient', 'try',
	'void', 'volatile', 'while', 'true', 'false', 'null', 'record', 'var', 'yield'
]);

function javaBase(type: TypeRef, boxed: boolean): string {
	switch (type.kind) {
		case 'string':
			return 'String';
		case 'integer':
			return boxed ? 'Long' : 'long';
		case 'float':
			return boxed ? 'Double' : 'double';
		case 'boolean':
			return boxed ? 'Boolean' : 'boolean';
		case 'unknown':
			return 'Object';
		case 'object':
			return type.name;
		case 'array':
			return `List<${javaBase(type.item, true)}>`;
	}
}

export const emitJava: Emitter = (schema) => {
	const blocks: string[] = [];
	if (schema.root.kind === 'array') {
		blocks.push(`// The JSON root is an array: ${javaBase(schema.root, true)} (${schema.rootName})`);
	}
	for (let defIndex = 0; defIndex < schema.objects.length; defIndex += 1) {
		const def = schema.objects[defIndex];
		if (def === undefined) {
			continue;
		}
		const names = fieldNames(
			def.fields.map((field) => field.key),
			{ style: 'camel', keywords: KEYWORDS }
		);
		const visibility = defIndex === 0 ? 'public ' : '';
		if (def.fields.length === 0) {
			blocks.push(`${visibility}record ${def.name}() {}`);
			continue;
		}
		const lines: string[] = [];
		for (let index = 0; index < def.fields.length; index += 1) {
			const field = def.fields[index];
			const name = names[index];
			if (field === undefined || name === undefined) {
				continue;
			}
			const boxed = field.type.nullable || field.optional;
			const rename = name !== field.key ? `@JsonProperty(${JSON.stringify(field.key)}) ` : '';
			const last = index === def.fields.length - 1;
			lines.push(`    ${rename}${javaBase(field.type, boxed)} ${name}${last ? '' : ','}`);
		}
		blocks.push(`${visibility}record ${def.name}(\n${lines.join('\n')}\n) {}`);
	}
	const body = blocks.join('\n\n');
	const imports: string[] = [];
	if (body.includes('@JsonProperty(')) {
		imports.push('import com.fasterxml.jackson.annotation.JsonProperty;');
	}
	if (body.includes('List<')) {
		imports.push('import java.util.List;');
	}
	return joinBlocks(imports.length === 0 ? blocks : [imports.join('\n'), ...blocks]);
};
