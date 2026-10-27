import type { TypeRef } from '../infer';
import { isPlainIdentifier } from '../names';
import { postOrder, type Emitter } from './types';

function zodBase(type: TypeRef): string {
	switch (type.kind) {
		case 'string':
			return 'z.string()';
		case 'integer':
			return 'z.number().int()';
		case 'float':
			return 'z.number()';
		case 'boolean':
			return 'z.boolean()';
		case 'unknown':
			return 'z.unknown()';
		case 'object':
			return `${type.name}Schema`;
		case 'array':
			return `z.array(${zodType(type.item, false)})`;
	}
}

function zodType(type: TypeRef, optional: boolean): string {
	let result = zodBase(type);
	if (type.nullable && type.kind !== 'unknown') {
		result += '.nullable()';
	}
	if (optional) {
		result += '.optional()';
	}
	return result;
}

export const emitZod: Emitter = (schema) => {
	const blocks: string[] = ['import { z } from "zod";'];
	for (const def of postOrder(schema)) {
		const lines = def.fields.map((field) => {
			const key = isPlainIdentifier(field.key) ? field.key : JSON.stringify(field.key);
			return `  ${key}: ${zodType(field.type, field.optional)},`;
		});
		const body = lines.length === 0 ? 'z.object({})' : `z.object({\n${lines.join('\n')}\n})`;
		blocks.push(
			`export const ${def.name}Schema = ${body};\nexport type ${def.name} = z.infer<typeof ${def.name}Schema>;`
		);
	}
	if (schema.root.kind === 'array') {
		blocks.push(
			`export const ${schema.rootName}Schema = ${zodBase(schema.root)};\nexport type ${schema.rootName} = z.infer<typeof ${schema.rootName}Schema>;`
		);
	}
	return blocks.join('\n\n') + '\n';
};
