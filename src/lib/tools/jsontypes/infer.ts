import { typeNameFromKey } from './names';

export type ScalarKind = 'string' | 'integer' | 'float' | 'boolean' | 'unknown';

export type TypeRef =
	| { kind: ScalarKind; nullable: boolean }
	| { kind: 'array'; item: TypeRef; nullable: boolean }
	| { kind: 'object'; name: string; nullable: boolean };

export type Field = { key: string; type: TypeRef; optional: boolean };
export type ObjectDef = { name: string; fields: Field[] };

/** Language-neutral schema. `objects` is in pre-order starting at the root. */
export type Schema = { rootName: string; root: TypeRef; objects: ObjectDef[] };

export type BigIntMode = 'float' | 'string';

export type InferOptions = {
	rootName: string;
	allOptional: boolean;
	/** What to do with integers that do not fit in 64 bits. */
	bigInt: BigIntMode;
};

export const DEFAULT_INFER_OPTIONS: InferOptions = {
	rootName: 'Root',
	allOptional: false,
	bigInt: 'float'
};

export type InferResult =
	| { ok: true; schema: Schema }
	| { ok: false; reason: 'empty' | 'syntax' | 'scalar'; message: string };

type NodeField = { key: string; node: Node; optional: boolean };

type Node =
	| { kind: ScalarKind; nullable: boolean }
	| { kind: 'null' }
	| { kind: 'array'; item: Node | undefined; nullable: boolean }
	| { kind: 'object'; fields: NodeField[]; nullable: boolean };

const TWO_POW_63 = 9223372036854775808;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toNode(value: unknown, options: InferOptions): Node {
	if (value === null || value === undefined) {
		return { kind: 'null' };
	}
	if (typeof value === 'string') {
		return { kind: 'string', nullable: false };
	}
	if (typeof value === 'boolean') {
		return { kind: 'boolean', nullable: false };
	}
	if (typeof value === 'number') {
		if (Number.isInteger(value)) {
			if (Math.abs(value) < TWO_POW_63) {
				return { kind: 'integer', nullable: false };
			}
			return { kind: options.bigInt === 'string' ? 'string' : 'float', nullable: false };
		}
		return { kind: 'float', nullable: false };
	}
	if (Array.isArray(value)) {
		let item: Node | undefined;
		for (const element of value) {
			const node = toNode(element, options);
			item = item === undefined ? node : merge(item, node);
		}
		return { kind: 'array', item, nullable: false };
	}
	if (isRecord(value)) {
		const fields: NodeField[] = [];
		for (const [key, child] of Object.entries(value)) {
			fields.push({ key, node: toNode(child, options), optional: false });
		}
		return { kind: 'object', fields, nullable: false };
	}
	return { kind: 'unknown', nullable: false };
}

function mergeOptional(a: Node | undefined, b: Node | undefined): Node | undefined {
	if (a === undefined) {
		return b;
	}
	if (b === undefined) {
		return a;
	}
	return merge(a, b);
}

function mergeFields(a: NodeField[], b: NodeField[]): NodeField[] {
	const result: NodeField[] = [];
	const bByKey = new Map<string, NodeField>();
	for (const field of b) {
		bByKey.set(field.key, field);
	}
	const seen = new Set<string>();
	for (const field of a) {
		seen.add(field.key);
		const other = bByKey.get(field.key);
		if (other === undefined) {
			result.push({ ...field, optional: true });
		} else {
			result.push({
				key: field.key,
				node: merge(field.node, other.node),
				optional: field.optional || other.optional
			});
		}
	}
	for (const field of b) {
		if (!seen.has(field.key)) {
			result.push({ ...field, optional: true });
		}
	}
	return result;
}

function merge(a: Node, b: Node): Node {
	if (a.kind === 'null') {
		return b.kind === 'null' ? a : { ...b, nullable: true };
	}
	if (b.kind === 'null') {
		return { ...a, nullable: true };
	}
	const nullable = a.nullable || b.nullable;
	if (a.kind === 'array' && b.kind === 'array') {
		return { kind: 'array', item: mergeOptional(a.item, b.item), nullable };
	}
	if (a.kind === 'object' && b.kind === 'object') {
		return { kind: 'object', fields: mergeFields(a.fields, b.fields), nullable };
	}
	if (a.kind === 'array' || a.kind === 'object' || b.kind === 'array' || b.kind === 'object') {
		return { kind: 'unknown', nullable };
	}
	if (a.kind === b.kind) {
		return { kind: a.kind, nullable };
	}
	if (
		(a.kind === 'integer' && b.kind === 'float') ||
		(a.kind === 'float' && b.kind === 'integer')
	) {
		return { kind: 'float', nullable };
	}
	return { kind: 'unknown', nullable };
}

type NameMode = 'root' | 'exact' | 'key' | 'item';

type BuildContext = {
	options: InferOptions;
	used: Set<string>;
	bySignature: Map<string, string>;
	defs: Map<string, ObjectDef>;
};

function uniqueName(base: string, used: Set<string>): string {
	let name = base;
	let counter = 2;
	while (used.has(name)) {
		name = base + String(counter);
		counter += 1;
	}
	used.add(name);
	return name;
}

function signatureOf(type: TypeRef): string {
	const flag = type.nullable ? '?' : '';
	if (type.kind === 'array') {
		return `[${signatureOf(type.item)}]${flag}`;
	}
	if (type.kind === 'object') {
		return `@${type.name}${flag}`;
	}
	return `${type.kind}${flag}`;
}

function build(node: Node, hint: string, mode: NameMode, ctx: BuildContext): TypeRef {
	if (node.kind === 'null') {
		return { kind: 'unknown', nullable: false };
	}
	if (node.kind === 'array') {
		const item: TypeRef =
			node.item === undefined
				? { kind: 'unknown', nullable: false }
				: build(node.item, hint, mode === 'exact' ? 'exact' : 'item', ctx);
		return { kind: 'array', item, nullable: node.nullable };
	}
	if (node.kind === 'object') {
		const fields: Field[] = node.fields.map((field) => {
			const type = build(field.node, field.key, 'key', ctx);
			return { key: field.key, type, optional: ctx.options.allOptional || field.optional };
		});
		const signature = JSON.stringify(
			fields.map((field) => [field.key, signatureOf(field.type), field.optional])
		);
		if (mode !== 'root') {
			const existing = ctx.bySignature.get(signature);
			if (existing !== undefined) {
				return { kind: 'object', name: existing, nullable: node.nullable };
			}
		}
		let name: string;
		if (mode === 'root') {
			name = hint;
		} else if (mode === 'exact') {
			name = uniqueName(hint, ctx.used);
		} else {
			name = uniqueName(typeNameFromKey(hint, mode === 'item'), ctx.used);
		}
		ctx.bySignature.set(signature, name);
		ctx.defs.set(name, { name, fields });
		return { kind: 'object', name, nullable: node.nullable };
	}
	return { kind: node.kind, nullable: node.kind === 'unknown' ? false : node.nullable };
}

function visit(type: TypeRef, defs: Map<string, ObjectDef>, out: ObjectDef[], seen: Set<string>): void {
	if (type.kind === 'array') {
		visit(type.item, defs, out, seen);
		return;
	}
	if (type.kind !== 'object' || seen.has(type.name)) {
		return;
	}
	seen.add(type.name);
	const def = defs.get(type.name);
	if (def === undefined) {
		return;
	}
	out.push(def);
	for (const field of def.fields) {
		visit(field.type, defs, out, seen);
	}
}

export function sanitizeRootName(name: string): string {
	const cleaned = typeNameFromKey(name, false);
	return name.trim() === '' ? 'Root' : cleaned;
}

/** Infers a schema from a parsed JSON value. Returns undefined for scalar roots. */
export function inferSchema(value: unknown, options: InferOptions): Schema | undefined {
	if (!Array.isArray(value) && !isRecord(value)) {
		return undefined;
	}
	const rootName = sanitizeRootName(options.rootName);
	const node = toNode(value, options);
	const ctx: BuildContext = {
		options,
		used: new Set([rootName]),
		bySignature: new Map(),
		defs: new Map()
	};
	const root =
		node.kind === 'array'
			? build(node, `${rootName}Item`, 'exact', ctx)
			: build(node, rootName, 'root', ctx);
	const objects: ObjectDef[] = [];
	visit(root, ctx.defs, objects, new Set());
	return { rootName, root, objects };
}

export function inferFromText(text: string, options: InferOptions): InferResult {
	if (text.trim() === '') {
		return { ok: false, reason: 'empty', message: '' };
	}
	let value: unknown;
	try {
		value = JSON.parse(text);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { ok: false, reason: 'syntax', message };
	}
	const schema = inferSchema(value, options);
	if (schema === undefined) {
		return { ok: false, reason: 'scalar', message: '' };
	}
	return { ok: true, schema };
}
