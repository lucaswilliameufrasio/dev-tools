import type { Component } from 'svelte';

export type ToolId =
	| 'base64'
	| 'url'
	| 'json'
	| 'jwt'
	| 'hash'
	| 'ids'
	| 'password'
	| 'timestamp'
	| 'diff'
	| 'regex'
	| 'color'
	| 'bases'
	| 'textcase';

export type ToolGroup = 'convert' | 'inspect' | 'generate';

export type ToolDefinition = {
	id: ToolId;
	group: ToolGroup;
	glyph: string;
	keywords: string[];
	load: () => Promise<{ default: Component }>;
};

export const TOOLS: ToolDefinition[] = [
	{
		id: 'base64',
		group: 'convert',
		glyph: 'b64',
		keywords: ['base64', 'b64', 'encode', 'decode', 'codificar', 'atob', 'btoa'],
		load: () => import('./base64/Base64.svelte')
	},
	{
		id: 'url',
		group: 'convert',
		glyph: '%',
		keywords: ['url', 'uri', 'percent', 'query', 'encodeuricomponent', 'escape'],
		load: () => import('./url/Url.svelte')
	},
	{
		id: 'bases',
		group: 'convert',
		glyph: '0x',
		keywords: ['hex', 'binary', 'binario', 'octal', 'decimal', 'base', 'radix'],
		load: () => import('./bases/Bases.svelte')
	},
	{
		id: 'textcase',
		group: 'convert',
		glyph: 'Aa',
		keywords: ['camel', 'snake', 'kebab', 'pascal', 'case', 'maiuscula', 'minuscula'],
		load: () => import('./textcase/TextCase.svelte')
	},
	{
		id: 'color',
		group: 'convert',
		glyph: 'rgb',
		keywords: ['color', 'cor', 'hex', 'rgb', 'hsl', 'contrast', 'contraste'],
		load: () => import('./color/Color.svelte')
	},
	{
		id: 'timestamp',
		group: 'convert',
		glyph: 'ts',
		keywords: ['timestamp', 'unix', 'epoch', 'date', 'data', 'iso', 'timezone', 'fuso'],
		load: () => import('./timestamp/Timestamp.svelte')
	},
	{
		id: 'json',
		group: 'inspect',
		glyph: '{}',
		keywords: ['json', 'format', 'formatar', 'minify', 'validate', 'validar', 'pretty'],
		load: () => import('./json/Json.svelte')
	},
	{
		id: 'jwt',
		group: 'inspect',
		glyph: 'jwt',
		keywords: ['jwt', 'token', 'bearer', 'jws', 'claims'],
		load: () => import('./jwt/Jwt.svelte')
	},
	{
		id: 'regex',
		group: 'inspect',
		glyph: '.*',
		keywords: ['regex', 'regexp', 'expressao', 'pattern', 'match'],
		load: () => import('./regex/Regex.svelte')
	},
	{
		id: 'diff',
		group: 'inspect',
		glyph: '±',
		keywords: ['diff', 'compare', 'comparar', 'text', 'texto'],
		load: () => import('./diff/Diff.svelte')
	},
	{
		id: 'hash',
		group: 'generate',
		glyph: '#',
		keywords: ['hash', 'sha', 'sha256', 'sha1', 'hmac', 'digest', 'checksum'],
		load: () => import('./hash/Hash.svelte')
	},
	{
		id: 'ids',
		group: 'generate',
		glyph: 'id',
		keywords: ['uuid', 'ulid', 'guid', 'id', 'v4', 'v7', 'random'],
		load: () => import('./ids/Ids.svelte')
	},
	{
		id: 'password',
		group: 'generate',
		glyph: '••',
		keywords: ['password', 'senha', 'random', 'aleatoria', 'secret', 'entropy'],
		load: () => import('./password/Password.svelte')
	}
];

export const GROUP_ORDER: ToolGroup[] = ['convert', 'inspect', 'generate'];

export function findTool(id: string): ToolDefinition | undefined {
	return TOOLS.find((tool) => tool.id === id);
}
