import { describe, expect, it } from 'vitest';
import { formatJson, minifyJson } from './json';

describe('json', () => {
	it('formats with indentation and sorts keys deeply', () => {
		const result = formatJson('{"b":1,"a":{"d":[{"z":1,"y":2}],"c":2}}', {
			indent: 2,
			sortKeys: true
		});
		expect(result).toEqual({
			ok: true,
			output:
				'{\n  "a": {\n    "c": 2,\n    "d": [\n      {\n        "y": 2,\n        "z": 1\n      }\n    ]\n  },\n  "b": 1\n}'
		});
	});

	it('supports tab indentation', () => {
		expect(formatJson('{"a":1}', { indent: 'tab', sortKeys: false })).toEqual({
			ok: true,
			output: '{\n\t"a": 1\n}'
		});
	});

	it('minifies', () => {
		expect(minifyJson('{ "a": [1, 2],\n "b": null }')).toEqual({
			ok: true,
			output: '{"a":[1,2],"b":null}'
		});
	});

	it('reports syntax errors', () => {
		const result = minifyJson('{"a":');
		expect(result.ok).toBe(false);
	});
});
