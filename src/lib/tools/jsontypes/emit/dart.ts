import type { TypeRef } from '../infer';
import { fieldNames } from '../names';
import { joinBlocks, type Emitter } from './types';

const KEYWORDS: ReadonlySet<string> = new Set([
	'abstract', 'as', 'assert', 'async', 'await', 'break', 'case', 'catch', 'class', 'const',
	'continue', 'covariant', 'default', 'deferred', 'do', 'dynamic', 'else', 'enum', 'export',
	'extends', 'extension', 'external', 'factory', 'false', 'final', 'finally', 'for', 'get',
	'if', 'implements', 'import', 'in', 'interface', 'is', 'late', 'library', 'mixin', 'new',
	'null', 'on', 'operator', 'part', 'required', 'rethrow', 'return', 'set', 'static', 'super',
	'switch', 'this', 'throw', 'true', 'try', 'typedef', 'var', 'void', 'while', 'with', 'yield'
]);

function dartBase(type: TypeRef): string {
	switch (type.kind) {
		case 'string':
			return 'String';
		case 'integer':
			return 'int';
		case 'float':
			return 'double';
		case 'boolean':
			return 'bool';
		case 'unknown':
			return 'dynamic';
		case 'object':
			return type.name;
		case 'array':
			return `List<${dartType(type.item, false)}>`;
	}
}

function dartType(type: TypeRef, optional: boolean): string {
	const base = dartBase(type);
	return (type.nullable || optional) && type.kind !== 'unknown' ? `${base}?` : base;
}

function dartString(text: string): string {
	return `'${text.replaceAll('\\', '\\\\').replaceAll("'", "\\'").replaceAll('$', '\\$')}'`;
}

function variable(depth: number): string {
	return depth === 0 ? 'e' : `e${String(depth)}`;
}

function fromJson(type: TypeRef, expr: string, depth: number, nullable: boolean): string {
	const q = nullable ? '?' : '';
	switch (type.kind) {
		case 'string':
			return `${expr} as String${q}`;
		case 'integer':
			return `${expr} as int${q}`;
		case 'boolean':
			return `${expr} as bool${q}`;
		case 'unknown':
			return expr;
		case 'float':
			return nullable ? `(${expr} as num?)?.toDouble()` : `(${expr} as num).toDouble()`;
		case 'object': {
			const call = `${type.name}.fromJson(${expr} as Map<String, dynamic>)`;
			return nullable ? `${expr} == null ? null : ${call}` : call;
		}
		case 'array': {
			let call: string;
			if (type.item.kind === 'unknown') {
				call = `${expr} as List<dynamic>`;
			} else {
				const v = variable(depth);
				const inner = fromJson(type.item, v, depth + 1, type.item.nullable);
				call = `(${expr} as List<dynamic>).map((${v}) => ${inner}).toList()`;
			}
			return nullable ? `${expr} == null ? null : ${call}` : call;
		}
	}
}

function toJson(type: TypeRef, expr: string, depth: number, nullable: boolean): string {
	const q = nullable ? '?' : '';
	if (type.kind === 'object') {
		return `${expr}${q}.toJson()`;
	}
	if (type.kind === 'array') {
		const v = variable(depth);
		const inner = toJson(type.item, v, depth + 1, type.item.nullable);
		return inner === v ? expr : `${expr}${q}.map((${v}) => ${inner}).toList()`;
	}
	return expr;
}

export const emitDart: Emitter = (schema) => {
	const blocks: string[] = [];
	if (schema.root.kind === 'array') {
		blocks.push(`typedef ${schema.rootName} = ${dartBase(schema.root)};`);
	}
	for (const def of schema.objects) {
		const names = fieldNames(
			def.fields.map((field) => field.key),
			{ style: 'camel', keywords: KEYWORDS }
		);
		if (def.fields.length === 0) {
			blocks.push(
				[
					`class ${def.name} {`,
					`  const ${def.name}();`,
					'',
					`  factory ${def.name}.fromJson(Map<String, dynamic> json) => const ${def.name}();`,
					'',
					'  Map<String, dynamic> toJson() => {};',
					'}'
				].join('\n')
			);
			continue;
		}
		const fields: string[] = [];
		const params: string[] = [];
		const reads: string[] = [];
		const writes: string[] = [];
		for (let index = 0; index < def.fields.length; index += 1) {
			const field = def.fields[index];
			const name = names[index];
			if (field === undefined || name === undefined) {
				continue;
			}
			const nullable = field.type.nullable || field.optional;
			const key = dartString(field.key);
			fields.push(`  final ${dartType(field.type, field.optional)} ${name};`);
			params.push(`    ${field.optional ? '' : 'required '}this.${name},`);
			reads.push(`      ${name}: ${fromJson(field.type, `json[${key}]`, 0, nullable)},`);
			const written = toJson(field.type, name, 0, nullable);
			writes.push(
				field.optional
					? `      if (${name} != null) ${key}: ${written},`
					: `      ${key}: ${written},`
			);
		}
		blocks.push(
			[
				`class ${def.name} {`,
				...fields,
				'',
				`  const ${def.name}({`,
				...params,
				'  });',
				'',
				`  factory ${def.name}.fromJson(Map<String, dynamic> json) {`,
				`    return ${def.name}(`,
				...reads,
				'    );',
				'  }',
				'',
				'  Map<String, dynamic> toJson() {',
				'    return {',
				...writes,
				'    };',
				'  }',
				'}'
			].join('\n')
		);
	}
	return joinBlocks(blocks);
};
