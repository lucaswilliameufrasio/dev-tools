import { defineMessages } from '#lib/i18n/define.js';

export const messages = defineMessages(
	{
		'tool.httpstatus.name': 'Códigos HTTP',
		'tool.httpstatus.desc': 'Referência pesquisável de status HTTP com orientação prática para APIs.',
		'httpstatus.search': 'Buscar',
		'httpstatus.searchHint': 'Código, nome ou descrição (ex.: 404, timeout, redirect)',
		'httpstatus.categories': 'Categorias',
		'httpstatus.cat1': '1xx Informativo',
		'httpstatus.cat2': '2xx Sucesso',
		'httpstatus.cat3': '3xx Redirecionamento',
		'httpstatus.cat4': '4xx Erro do cliente',
		'httpstatus.cat5': '5xx Erro do servidor',
		'httpstatus.count': '{count} códigos',
		'httpstatus.empty': 'Nenhum código encontrado. Tente outro termo ou marque mais categorias.',
		'httpstatus.whenToUse': 'Quando usar',
		'httpstatus.nonStandard': 'Não padrão (nginx/Cloudflare)',
		'httpstatus.copyLabel': 'Copiar {name}'
	},
	{
		'tool.httpstatus.name': 'HTTP status codes',
		'tool.httpstatus.desc': 'Searchable HTTP status reference with practical guidance for APIs.',
		'httpstatus.search': 'Search',
		'httpstatus.searchHint': 'Code, name or description (e.g. 404, timeout, redirect)',
		'httpstatus.categories': 'Categories',
		'httpstatus.cat1': '1xx Informational',
		'httpstatus.cat2': '2xx Success',
		'httpstatus.cat3': '3xx Redirection',
		'httpstatus.cat4': '4xx Client error',
		'httpstatus.cat5': '5xx Server error',
		'httpstatus.count': '{count} codes',
		'httpstatus.empty': 'No codes found. Try another term or select more categories.',
		'httpstatus.whenToUse': 'When to use',
		'httpstatus.nonStandard': 'Non-standard (nginx/Cloudflare)',
		'httpstatus.copyLabel': 'Copy {name}'
	}
);
