import { describe, expect, it } from 'vitest';
import { DEFAULT_INFER_OPTIONS, inferFromText, type Schema } from './infer';
import { DEFAULT_EMIT_OPTIONS, LANGUAGES, emit, type EmitOptions, type LanguageId } from './emit';

function schemaOf(text: string): Schema {
	const result = inferFromText(text, DEFAULT_INFER_OPTIONS);
	if (!result.ok) {
		throw new Error('invalid sample');
	}
	return result.schema;
}

function run(language: LanguageId, text: string, options: Partial<EmitOptions> = {}): string {
	return emit(language, schemaOf(text), { ...DEFAULT_EMIT_OPTIONS, ...options });
}

describe('emitter options', () => {
	const sample = '{"id": 1, "x": {"a": 1.5, "b": null}, "type": "t", "n": [{"p": 1}, {}]}';

	it('typescript type alias', () => {
		expect(run('typescript', '{"a": [1, null], "b": {"c": 1}}', { tsStyle: 'type' })).toBe(
			`export type Root = {
  a: (number | null)[];
  b: B;
};

export type B = {
  c: number;
};
`
		);
	});

	it('go with omitempty instead of pointers', () => {
		const text = '{"rows": [{"a": 1, "b": "s"}, {"a": 2, "b": null}, {"a": 3}], "e": {}}';
		expect(run('go', text, { goOptional: 'omitempty' })).toBe(
			`type Root struct {
	Rows []Row                  \`json:"rows"\`
	E    map[string]interface{} \`json:"e"\`
}

type Row struct {
	A int64   \`json:"a"\`
	B *string \`json:"b,omitempty"\`
}
`
		);
	});

	it('go with pointers for optional fields', () => {
		expect(run('go', '[{"a": 1}, {}]', { goOptional: 'pointer' })).toBe(
			`type Root []RootItem

type RootItem struct {
	A *int64 \`json:"a,omitempty"\`
}
`
		);
	});

	it('rust without Clone/PartialEq and with keyword field', () => {
		expect(run('rust', '{"type": "t", "n": 1}', { rustCloneEq: false })).toBe(
			`use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Root {
    #[serde(rename = "type")]
    pub type_: String,
    pub n: i64,
}
`
		);
	});

	it('top-level arrays produce an alias or a note in every language', () => {
		const text = '[{"id": 1}]';
		const expected: Record<LanguageId, string> = {
			typescript: 'export type Root = RootItem[];',
			go: 'type Root []RootItem',
			rust: 'pub type Root = Vec<RootItem>;',
			dart: 'typedef Root = List<RootItem>;',
			kotlin: 'typealias Root = List<RootItem>',
			swift: 'typealias Root = [RootItem]',
			csharp: '// The JSON root is an array: List<RootItem> (Root)',
			java: '// The JSON root is an array: List<RootItem> (Root)',
			python: 'Root = list[RootItem]',
			zod: 'export const RootSchema = z.array(RootItemSchema);',
			jsonschema: '"type": "array"'
		};
		for (const language of LANGUAGES) {
			const output = run(language.id, text);
			expect(output, language.id).toContain(expected[language.id]);
			expect(output, language.id).toContain('RootItem');
		}
	});

	it('every language handles keywords, odd keys and empty objects', () => {
		for (const language of LANGUAGES) {
			const output = run(language.id, sample);
			expect(output.length, language.id).toBeGreaterThan(0);
			expect(output.endsWith('\n'), language.id).toBe(true);
		}
		expect(run('python', '{"from": 1, "class": 2, "my key": 3}')).toBe(
			`from dataclasses import dataclass


@dataclass
class Root:
    from_: int  # JSON key: "from"
    class_: int  # JSON key: "class"
    my_key: int  # JSON key: "my key"
`
		);
		expect(run('swift', '{"default": 1}')).toContain('let default_: Int');
		expect(run('java', '{"new": 1, "class": 2}')).toContain('@JsonProperty("new") long new_');
		expect(run('kotlin', '{"val": 1}')).toContain('@SerialName("val") val val_: Long');
		expect(run('dart', '{"class": 1}')).toContain('final int class_;');
	});

	it('kotlin and dart handle empty objects', () => {
		expect(run('kotlin', '{"a": {}}')).toContain('@Serializable\nclass A\n');
		expect(run('dart', '{}')).toContain('const Root();');
		expect(run('java', '{}')).toBe('public record Root() {}\n');
		expect(run('zod', '{}')).toContain('z.object({})');
		expect(run('typescript', '{}')).toBe('export interface Root {}\n');
	});

	it('dart converts nested lists and nullable values', () => {
		const output = run('dart', '{"m": [[1.5, null]], "o": [{"a": 1}, null]}');
		expect(output).toContain(
			"m: (json['m'] as List<dynamic>).map((e) => (e as List<dynamic>).map((e1) => (e1 as num?)?.toDouble()).toList()).toList(),"
		);
		expect(output).toContain("o: (json['o'] as List<dynamic>).map((e) => e == null ? null : O.fromJson(e as Map<String, dynamic>)).toList(),");
		expect(output).toContain("'o': o.map((e) => e?.toJson()).toList(),");
	});

	it('json schema uses anyOf for nullable references and valid JSON', () => {
		const output = run('jsonschema', '{"a": {"x": 1}, "b": [{"x": 1}, null]}');
		const parsed: unknown = JSON.parse(output);
		expect(parsed).toMatchObject({
			$schema: 'https://json-schema.org/draft/2020-12/schema',
			properties: { b: { type: 'array', items: { anyOf: [{ $ref: '#/$defs/A' }, { type: 'null' }] } } }
		});
	});
});
