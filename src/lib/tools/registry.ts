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
	| 'textcase'
	| 'bcrypt'
	| 'argon2'
	| 'cpfcnpj'
	| 'plate'
	| 'card'
	| 'cron'
	| 'jsontypes'
	| 'dataformat'
	| 'sql'
	| 'escape'
	| 'unicode'
	| 'qr'
	| 'image'
	| 'lines'
	| 'cidr'
	| 'chmod'
	| 'httpstatus';

export type ToolGroup =
	| 'convert'
	| 'inspect'
	| 'security'
	| 'generate'
	| 'testdata'
	| 'code'
	| 'reference';

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
		group: 'security',
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
		group: 'security',
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
		group: 'security',
		glyph: '••',
		keywords: ['password', 'senha', 'random', 'aleatoria', 'secret', 'entropy'],
		load: () => import('./password/Password.svelte')
	},
	{
		id: 'bcrypt',
		group: 'security',
		glyph: 'bc',
		keywords: ['bcrypt', 'hash', 'senha', 'password', 'verify', 'verificar', 'cost'],
		load: () => import('./bcrypt/Bcrypt.svelte')
	},
	{
		id: 'argon2',
		group: 'security',
		glyph: 'a2',
		keywords: ['argon2', 'argon2id', 'argon2i', 'argon2d', 'hash', 'senha', 'password', 'kdf'],
		load: () => import('./argon2/Argon2.svelte')
	},
	{
		id: 'cpfcnpj',
		group: 'testdata',
		glyph: 'cpf',
		keywords: ['cpf', 'cnpj', 'documento', 'validar', 'gerar', 'brasil', 'dados de teste'],
		load: () => import('./cpfcnpj/CpfCnpj.svelte')
	},
	{
		id: 'plate',
		group: 'testdata',
		glyph: 'BR',
		keywords: ['placa', 'plate', 'mercosul', 'veiculo', 'carro', 'gerar'],
		load: () => import('./plate/Plate.svelte')
	},
	{
		id: 'card',
		group: 'testdata',
		glyph: 'pan',
		keywords: ['cartao', 'card', 'credito', 'luhn', 'visa', 'mastercard', 'elo', 'amex', 'gerar'],
		load: () => import('./card/Card.svelte')
	},
	{
		id: 'cron',
		group: 'inspect',
		glyph: '* *',
		keywords: ['cron', 'crontab', 'agendamento', 'schedule', 'job'],
		load: () => import('./cron/Cron.svelte')
	},
	{
		id: 'jsontypes',
		group: 'code',
		glyph: '<T>',
		keywords: ['json', 'typescript', 'go', 'golang', 'rust', 'dart', 'kotlin', 'swift', 'java', 'csharp', 'python', 'struct', 'class', 'tipos'],
		load: () => import('./jsontypes/JsonTypes.svelte')
	},
	{
		id: 'dataformat',
		group: 'convert',
		glyph: 'yml',
		keywords: ['yaml', 'yml', 'toml', 'csv', 'json', 'converter'],
		load: () => import('./dataformat/DataFormat.svelte')
	},
	{
		id: 'sql',
		group: 'code',
		glyph: 'sql',
		keywords: ['sql', 'format', 'formatar', 'query', 'postgres', 'mysql'],
		load: () => import('./sql/Sql.svelte')
	},
	{
		id: 'escape',
		group: 'convert',
		glyph: '&;',
		keywords: ['html', 'entities', 'escape', 'unescape', 'json string', 'javascript', 'unicode escape'],
		load: () => import('./escape/Escape.svelte')
	},
	{
		id: 'unicode',
		group: 'inspect',
		glyph: 'U+',
		keywords: ['unicode', 'codepoint', 'utf8', 'utf-8', 'utf16', 'emoji', 'caractere'],
		load: () => import('./unicode/Unicode.svelte')
	},
	{
		id: 'qr',
		group: 'generate',
		glyph: 'qr',
		keywords: ['qr', 'qrcode', 'barcode', 'codigo', 'ler', 'scan'],
		load: () => import('./qr/Qr.svelte')
	},
	{
		id: 'image',
		group: 'convert',
		glyph: 'img',
		keywords: ['imagem', 'image', 'data uri', 'base64', 'png', 'jpeg', 'webp', 'comprimir', 'compress'],
		load: () => import('./image/Image.svelte')
	},
	{
		id: 'lines',
		group: 'convert',
		glyph: '≡',
		keywords: ['linhas', 'lines', 'sort', 'ordenar', 'dedupe', 'duplicadas', 'slug', 'trim'],
		load: () => import('./lines/Lines.svelte')
	},
	{
		id: 'cidr',
		group: 'reference',
		glyph: '/24',
		keywords: ['cidr', 'subnet', 'sub-rede', 'ip', 'mascara', 'netmask', 'ipv4'],
		load: () => import('./cidr/Cidr.svelte')
	},
	{
		id: 'chmod',
		group: 'reference',
		glyph: '755',
		keywords: ['chmod', 'permissoes', 'permissions', 'unix', 'linux', 'rwx'],
		load: () => import('./chmod/Chmod.svelte')
	},
	{
		id: 'httpstatus',
		group: 'reference',
		glyph: '404',
		keywords: ['http', 'status', 'codigo', 'code', 'rest', 'api'],
		load: () => import('./httpstatus/HttpStatus.svelte')
	}
];

export const GROUP_ORDER: ToolGroup[] = [
	'convert',
	'inspect',
	'security',
	'generate',
	'testdata',
	'code',
	'reference'
];

export function findTool(id: string): ToolDefinition | undefined {
	return TOOLS.find((tool) => tool.id === id);
}
