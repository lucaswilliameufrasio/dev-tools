import type { TypeRef } from '../infer';
import { fieldNames } from '../names';
import { joinBlocks, type Emitter, type EmitOptions } from './types';

const NO_KEYWORDS: ReadonlySet<string> = new Set();

type GoContext = { options: EmitOptions; maps: ReadonlySet<string> };

function isMap(type: TypeRef, ctx: GoContext): boolean {
	return type.kind === 'object' && ctx.maps.has(type.name);
}

function goBase(type: TypeRef, ctx: GoContext): string {
	switch (type.kind) {
		case 'string':
			return 'string';
		case 'integer':
			return 'int64';
		case 'float':
			return 'float64';
		case 'boolean':
			return 'bool';
		case 'unknown':
			return 'interface{}';
		case 'object':
			return ctx.maps.has(type.name) ? 'map[string]interface{}' : type.name;
		case 'array':
			return `[]${goType(type.item, false, ctx)}`;
	}
}

function goType(type: TypeRef, optional: boolean, ctx: GoContext): string {
	const base = goBase(type, ctx);
	if (type.kind === 'array' || type.kind === 'unknown' || isMap(type, ctx)) {
		return base;
	}
	const pointer = type.nullable || (optional && ctx.options.goOptional === 'pointer');
	return pointer ? `*${base}` : base;
}

export const emitGo: Emitter = (schema, options) => {
	const rootObject = schema.root.kind === 'object' ? schema.root.name : undefined;
	const maps = new Set<string>();
	for (const def of schema.objects) {
		if (def.fields.length === 0 && def.name !== rootObject) {
			maps.add(def.name);
		}
	}
	const ctx: GoContext = { options, maps };
	const blocks: string[] = [];
	if (schema.root.kind === 'array') {
		blocks.push(`type ${schema.rootName} ${goBase(schema.root, ctx)}`);
	}
	for (const def of schema.objects) {
		if (maps.has(def.name)) {
			continue;
		}
		if (def.fields.length === 0) {
			blocks.push(`type ${def.name} struct{}`);
			continue;
		}
		const names = fieldNames(
			def.fields.map((field) => field.key),
			{ style: 'pascal', keywords: NO_KEYWORDS, digitPrefix: 'Field', initialisms: true }
		);
		const rows = def.fields.map((field, index) => {
			const tag = `\`json:"${field.key}${field.optional ? ',omitempty' : ''}"\``;
			return [names[index] ?? '', goType(field.type, field.optional, ctx), tag];
		});
		const nameWidth = Math.max(...rows.map((row) => (row[0] ?? '').length));
		const typeWidth = Math.max(...rows.map((row) => (row[1] ?? '').length));
		const lines = rows.map(
			(row) => `\t${(row[0] ?? '').padEnd(nameWidth)} ${(row[1] ?? '').padEnd(typeWidth)} ${row[2] ?? ''}`
		);
		blocks.push(`type ${def.name} struct {\n${lines.join('\n')}\n}`);
	}
	return joinBlocks(blocks);
};
