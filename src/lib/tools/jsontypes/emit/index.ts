import type { Schema } from '../infer';
import { emitCsharp } from './csharp';
import { emitDart } from './dart';
import { emitGo } from './go';
import { emitJava } from './java';
import { emitJsonSchema } from './jsonschema';
import { emitKotlin } from './kotlin';
import { emitPython } from './python';
import { emitRust } from './rust';
import { emitSwift } from './swift';
import { emitTypescript } from './typescript';
import type { EmitOptions, Emitter, LanguageId } from './types';
import { emitZod } from './zod';

export type { EmitOptions, LanguageId } from './types';
export { DEFAULT_EMIT_OPTIONS } from './types';

export type LanguageGroup = 'languages' | 'schemas';

export type Language = { id: LanguageId; label: string; group: LanguageGroup };

export const LANGUAGES: readonly Language[] = [
	{ id: 'typescript', label: 'TypeScript', group: 'languages' },
	{ id: 'go', label: 'Go', group: 'languages' },
	{ id: 'rust', label: 'Rust (serde)', group: 'languages' },
	{ id: 'python', label: 'Python', group: 'languages' },
	{ id: 'dart', label: 'Dart', group: 'languages' },
	{ id: 'kotlin', label: 'Kotlin', group: 'languages' },
	{ id: 'swift', label: 'Swift', group: 'languages' },
	{ id: 'csharp', label: 'C#', group: 'languages' },
	{ id: 'java', label: 'Java', group: 'languages' },
	{ id: 'zod', label: 'Zod', group: 'schemas' },
	{ id: 'jsonschema', label: 'JSON Schema', group: 'schemas' }
];

const EMITTERS: Record<LanguageId, Emitter> = {
	typescript: emitTypescript,
	go: emitGo,
	rust: emitRust,
	dart: emitDart,
	kotlin: emitKotlin,
	swift: emitSwift,
	csharp: emitCsharp,
	java: emitJava,
	python: emitPython,
	zod: emitZod,
	jsonschema: emitJsonSchema
};

export function emit(language: LanguageId, schema: Schema, options: EmitOptions): string {
	return EMITTERS[language](schema, options);
}

export function isLanguageId(value: string): value is LanguageId {
	return value in EMITTERS;
}
