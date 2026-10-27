export type JsonResult = { ok: true; output: string } | { ok: false; message: string };

function sortKeysDeep(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map(sortKeysDeep);
	}
	if (typeof value === 'object' && value !== undefined && value !== null) {
		const sorted: Record<string, unknown> = {};
		const source = value as Record<string, unknown>;
		for (const key of Object.keys(source).sort()) {
			sorted[key] = sortKeysDeep(source[key]);
		}
		return sorted;
	}
	return value;
}

export type JsonOptions = { indent: 'tab' | number; sortKeys: boolean };

export function formatJson(input: string, options: JsonOptions): JsonResult {
	try {
		const parsed: unknown = JSON.parse(input);
		const value = options.sortKeys ? sortKeysDeep(parsed) : parsed;
		const space = options.indent === 'tab' ? '\t' : options.indent;
		return { ok: true, output: JSON.stringify(value, undefined, space) };
	} catch (error) {
		return { ok: false, message: error instanceof Error ? error.message : String(error) };
	}
}

export function minifyJson(input: string): JsonResult {
	try {
		return { ok: true, output: JSON.stringify(JSON.parse(input)) };
	} catch (error) {
		return { ok: false, message: error instanceof Error ? error.message : String(error) };
	}
}
