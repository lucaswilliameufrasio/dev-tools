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
};

export const TOOLS: ToolDefinition[] = [
	{
		id: 'base64',
		group: 'convert',
		glyph: 'b64',
		keywords: ['base64', 'b64', 'encode', 'decode', 'codificar', 'atob', 'btoa']
	},
	{
		id: 'url',
		group: 'convert',
		glyph: '%',
		keywords: ['url', 'uri', 'percent', 'query', 'encodeuricomponent', 'escape']
	},
	{
		id: 'bases',
		group: 'convert',
		glyph: '0x',
		keywords: ['hex', 'binary', 'binario', 'octal', 'decimal', 'base', 'radix']
	},
	{
		id: 'textcase',
		group: 'convert',
		glyph: 'Aa',
		keywords: ['camel', 'snake', 'kebab', 'pascal', 'case', 'maiuscula', 'minuscula']
	},
	{
		id: 'color',
		group: 'convert',
		glyph: 'rgb',
		keywords: ['color', 'cor', 'hex', 'rgb', 'hsl', 'contrast', 'contraste']
	},
	{
		id: 'timestamp',
		group: 'convert',
		glyph: 'ts',
		keywords: ['timestamp', 'unix', 'epoch', 'date', 'data', 'iso', 'timezone', 'fuso']
	},
	{
		id: 'json',
		group: 'inspect',
		glyph: '{}',
		keywords: ['json', 'format', 'formatar', 'minify', 'validate', 'validar', 'pretty']
	},
	{
		id: 'jwt',
		group: 'security',
		glyph: 'jwt',
		keywords: ['jwt', 'token', 'bearer', 'jws', 'claims']
	},
	{
		id: 'regex',
		group: 'inspect',
		glyph: '.*',
		keywords: ['regex', 'regexp', 'expressao', 'pattern', 'match']
	},
	{
		id: 'diff',
		group: 'inspect',
		glyph: '±',
		keywords: ['diff', 'compare', 'comparar', 'text', 'texto']
	},
	{
		id: 'hash',
		group: 'security',
		glyph: '#',
		keywords: ['hash', 'sha', 'sha256', 'sha1', 'hmac', 'digest', 'checksum']
	},
	{
		id: 'ids',
		group: 'generate',
		glyph: 'id',
		keywords: ['uuid', 'ulid', 'guid', 'id', 'v4', 'v7', 'random']
	},
	{
		id: 'password',
		group: 'security',
		glyph: '••',
		keywords: ['password', 'senha', 'random', 'aleatoria', 'secret', 'entropy']
	},
	{
		id: 'bcrypt',
		group: 'security',
		glyph: 'bc',
		keywords: ['bcrypt', 'hash', 'senha', 'password', 'verify', 'verificar', 'cost']
	},
	{
		id: 'argon2',
		group: 'security',
		glyph: 'a2',
		keywords: ['argon2', 'argon2id', 'argon2i', 'argon2d', 'hash', 'senha', 'password', 'kdf']
	},
	{
		id: 'cpfcnpj',
		group: 'testdata',
		glyph: 'cpf',
		keywords: ['cpf', 'cnpj', 'documento', 'validar', 'gerar', 'brasil', 'dados de teste']
	},
	{
		id: 'plate',
		group: 'testdata',
		glyph: 'BR',
		keywords: ['placa', 'plate', 'mercosul', 'veiculo', 'carro', 'gerar']
	},
	{
		id: 'card',
		group: 'testdata',
		glyph: 'pan',
		keywords: ['cartao', 'card', 'credito', 'luhn', 'visa', 'mastercard', 'elo', 'amex', 'gerar']
	},
	{
		id: 'cron',
		group: 'inspect',
		glyph: '* *',
		keywords: ['cron', 'crontab', 'agendamento', 'schedule', 'job']
	},
	{
		id: 'jsontypes',
		group: 'code',
		glyph: '<T>',
		keywords: ['json', 'typescript', 'go', 'golang', 'rust', 'dart', 'kotlin', 'swift', 'java', 'csharp', 'python', 'struct', 'class', 'tipos']
	},
	{
		id: 'dataformat',
		group: 'convert',
		glyph: 'yml',
		keywords: ['yaml', 'yml', 'toml', 'csv', 'json', 'converter']
	},
	{
		id: 'sql',
		group: 'code',
		glyph: 'sql',
		keywords: ['sql', 'format', 'formatar', 'query', 'postgres', 'mysql']
	},
	{
		id: 'escape',
		group: 'convert',
		glyph: '&;',
		keywords: ['html', 'entities', 'escape', 'unescape', 'json string', 'javascript', 'unicode escape']
	},
	{
		id: 'unicode',
		group: 'inspect',
		glyph: 'U+',
		keywords: ['unicode', 'codepoint', 'utf8', 'utf-8', 'utf16', 'emoji', 'caractere']
	},
	{
		id: 'qr',
		group: 'generate',
		glyph: 'qr',
		keywords: ['qr', 'qrcode', 'barcode', 'codigo', 'ler', 'scan']
	},
	{
		id: 'image',
		group: 'convert',
		glyph: 'img',
		keywords: ['imagem', 'image', 'data uri', 'base64', 'png', 'jpeg', 'webp', 'comprimir', 'compress']
	},
	{
		id: 'lines',
		group: 'convert',
		glyph: '≡',
		keywords: ['linhas', 'lines', 'sort', 'ordenar', 'dedupe', 'duplicadas', 'slug', 'trim']
	},
	{
		id: 'cidr',
		group: 'reference',
		glyph: '/24',
		keywords: ['cidr', 'subnet', 'sub-rede', 'ip', 'mascara', 'netmask', 'ipv4']
	},
	{
		id: 'chmod',
		group: 'reference',
		glyph: '755',
		keywords: ['chmod', 'permissoes', 'permissions', 'unix', 'linux', 'rwx']
	},
	{
		id: 'httpstatus',
		group: 'reference',
		glyph: '404',
		keywords: ['http', 'status', 'codigo', 'code', 'rest', 'api']
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
