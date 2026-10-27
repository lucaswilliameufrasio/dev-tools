import type { ObjectDef, Schema } from '../infer';

export type LanguageId =
	| 'typescript'
	| 'go'
	| 'rust'
	| 'dart'
	| 'kotlin'
	| 'swift'
	| 'csharp'
	| 'java'
	| 'python'
	| 'zod'
	| 'jsonschema';

export type EmitOptions = {
	tsStyle: 'interface' | 'type';
	goOptional: 'pointer' | 'omitempty';
	rustCloneEq: boolean;
	pythonStyle: 'dataclass' | 'pydantic';
};

export const DEFAULT_EMIT_OPTIONS: EmitOptions = {
	tsStyle: 'interface',
	goOptional: 'pointer',
	rustCloneEq: true,
	pythonStyle: 'dataclass'
};

export type Emitter = (schema: Schema, options: EmitOptions) => string;

export function joinBlocks(blocks: readonly string[]): string {
	return blocks.join('\n\n') + '\n';
}

/** Objects ordered so that dependencies come before the objects using them. */
export function postOrder(schema: Schema): ObjectDef[] {
	const byName = new Map<string, ObjectDef>();
	for (const def of schema.objects) {
		byName.set(def.name, def);
	}
	const out: ObjectDef[] = [];
	const seen = new Set<string>();
	const walk = (name: string): void => {
		if (seen.has(name)) {
			return;
		}
		seen.add(name);
		const def = byName.get(name);
		if (def === undefined) {
			return;
		}
		for (const field of def.fields) {
			let type = field.type;
			while (type.kind === 'array') {
				type = type.item;
			}
			if (type.kind === 'object') {
				walk(type.name);
			}
		}
		out.push(def);
	};
	for (const def of schema.objects) {
		walk(def.name);
	}
	return out;
}
