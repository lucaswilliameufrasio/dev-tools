import type { TypeRef } from '../infer';
import { fieldNames } from '../names';
import { joinBlocks, type Emitter } from './types';

const KEYWORDS: ReadonlySet<string> = new Set([
	'associatedtype', 'class', 'deinit', 'enum', 'extension', 'fileprivate', 'func', 'import',
	'init', 'inout', 'internal', 'let', 'open', 'operator', 'private', 'protocol', 'public',
	'rethrows', 'static', 'struct', 'subscript', 'typealias', 'var', 'break', 'case', 'continue',
	'default', 'defer', 'do', 'else', 'fallthrough', 'for', 'guard', 'if', 'in', 'repeat',
	'return', 'switch', 'where', 'while', 'as', 'false', 'is', 'nil', 'self', 'super', 'throw',
	'throws', 'true', 'try', 'Type', 'Protocol'
]);

const JSON_VALUE = `enum JSONValue: Codable {
    case string(String)
    case number(Double)
    case bool(Bool)
    case array([JSONValue])
    case object([String: JSONValue])
    case null

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() {
            self = .null
        } else if let value = try? container.decode(Bool.self) {
            self = .bool(value)
        } else if let value = try? container.decode(Double.self) {
            self = .number(value)
        } else if let value = try? container.decode(String.self) {
            self = .string(value)
        } else if let value = try? container.decode([JSONValue].self) {
            self = .array(value)
        } else {
            self = .object(try container.decode([String: JSONValue].self))
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .string(let value): try container.encode(value)
        case .number(let value): try container.encode(value)
        case .bool(let value): try container.encode(value)
        case .array(let value): try container.encode(value)
        case .object(let value): try container.encode(value)
        case .null: try container.encodeNil()
        }
    }
}`;

function swiftBase(type: TypeRef): string {
	switch (type.kind) {
		case 'string':
			return 'String';
		case 'integer':
			return 'Int';
		case 'float':
			return 'Double';
		case 'boolean':
			return 'Bool';
		case 'unknown':
			return 'JSONValue';
		case 'object':
			return type.name;
		case 'array':
			return `[${swiftType(type.item, false)}]`;
	}
}

function swiftType(type: TypeRef, optional: boolean): string {
	const base = swiftBase(type);
	return (type.nullable && type.kind !== 'unknown') || optional ? `${base}?` : base;
}

export const emitSwift: Emitter = (schema) => {
	const blocks: string[] = ['import Foundation'];
	if (schema.root.kind === 'array') {
		blocks.push(`typealias ${schema.rootName} = ${swiftBase(schema.root)}`);
	}
	for (const def of schema.objects) {
		const names = fieldNames(
			def.fields.map((field) => field.key),
			{ style: 'camel', keywords: KEYWORDS }
		);
		const props: string[] = [];
		const keys: string[] = [];
		let renamed = false;
		for (let index = 0; index < def.fields.length; index += 1) {
			const field = def.fields[index];
			const name = names[index];
			if (field === undefined || name === undefined) {
				continue;
			}
			props.push(`    let ${name}: ${swiftType(field.type, field.optional)}`);
			if (name === field.key) {
				keys.push(`        case ${name}`);
			} else {
				renamed = true;
				keys.push(`        case ${name} = ${JSON.stringify(field.key)}`);
			}
		}
		const lines = [`struct ${def.name}: Codable {`, ...props];
		if (renamed) {
			lines.push('', '    enum CodingKeys: String, CodingKey {', ...keys, '    }');
		}
		lines.push('}');
		blocks.push(lines.join('\n'));
	}
	if (blocks.join('\n').includes('JSONValue')) {
		blocks.push(JSON_VALUE);
	}
	return joinBlocks(blocks);
};
