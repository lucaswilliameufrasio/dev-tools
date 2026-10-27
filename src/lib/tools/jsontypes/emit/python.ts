import type { Field, TypeRef } from '../infer';
import { fieldNames } from '../names';
import { postOrder, type Emitter } from './types';

const KEYWORDS: ReadonlySet<string> = new Set([
	'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'class',
	'continue', 'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if',
	'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try',
	'while', 'with', 'yield'
]);

function pyBase(type: TypeRef): string {
	switch (type.kind) {
		case 'string':
			return 'str';
		case 'integer':
			return 'int';
		case 'float':
			return 'float';
		case 'boolean':
			return 'bool';
		case 'unknown':
			return 'Any';
		case 'object':
			return type.name;
		case 'array':
			return `list[${pyType(type.item, false)}]`;
	}
}

function pyType(type: TypeRef, optional: boolean): string {
	const base = pyBase(type);
	return (type.nullable && type.kind !== 'unknown') || optional ? `Optional[${base}]` : base;
}

type Row = { field: Field; name: string };

export const emitPython: Emitter = (schema, options) => {
	const pydantic = options.pythonStyle === 'pydantic';
	const blocks: string[] = [];
	for (const def of postOrder(schema)) {
		const names = fieldNames(
			def.fields.map((field) => field.key),
			{ style: 'snake', keywords: KEYWORDS, digitPrefix: 'field_' }
		);
		const rows: Row[] = [];
		for (let index = 0; index < def.fields.length; index += 1) {
			const field = def.fields[index];
			const name = names[index];
			if (field !== undefined && name !== undefined) {
				rows.push({ field, name });
			}
		}
		// Dataclass fields without a default must come first.
		const ordered = [
			...rows.filter((row) => !row.field.optional),
			...rows.filter((row) => row.field.optional)
		];
		const lines: string[] = [];
		let aliased = false;
		for (const row of ordered) {
			const type = pyType(row.field.type, row.field.optional);
			const renamed = row.name !== row.field.key;
			if (pydantic) {
				aliased = aliased || renamed;
				const alias = renamed ? `alias=${JSON.stringify(row.field.key)}` : '';
				if (row.field.optional) {
					lines.push(
						`    ${row.name}: ${type} = ${alias === '' ? 'None' : `Field(default=None, ${alias})`}`
					);
				} else {
					lines.push(`    ${row.name}: ${type}${alias === '' ? '' : ` = Field(${alias})`}`);
				}
			} else {
				const comment = renamed ? `  # JSON key: ${JSON.stringify(row.field.key)}` : '';
				lines.push(`    ${row.name}: ${type}${row.field.optional ? ' = None' : ''}${comment}`);
			}
		}
		if (pydantic && aliased) {
			lines.unshift('    model_config = ConfigDict(populate_by_name=True)', '');
		}
		if (lines.length === 0) {
			lines.push('    pass');
		}
		const head = pydantic ? `class ${def.name}(BaseModel):` : `@dataclass\nclass ${def.name}:`;
		blocks.push(`${head}\n${lines.join('\n')}`);
	}
	if (schema.root.kind === 'array') {
		blocks.push(`${schema.rootName} = ${pyBase(schema.root)}`);
	}
	const body = blocks.join('\n\n\n');
	const typing: string[] = [];
	if (/\bAny\b/.test(body)) {
		typing.push('Any');
	}
	if (body.includes('Optional[')) {
		typing.push('Optional');
	}
	const imports: string[] = [];
	if (!pydantic && body.includes('@dataclass')) {
		imports.push('from dataclasses import dataclass');
	}
	if (typing.length > 0) {
		imports.push(`from typing import ${typing.join(', ')}`);
	}
	if (pydantic) {
		const names = ['BaseModel'];
		if (body.includes('ConfigDict(')) {
			names.push('ConfigDict');
		}
		if (body.includes('Field(')) {
			names.push('Field');
		}
		names.sort();
		imports.push('', `from pydantic import ${names.join(', ')}`);
	}
	const header = imports.join('\n').trim();
	return header === '' ? body + '\n' : `${header}\n\n\n${body}\n`;
};

