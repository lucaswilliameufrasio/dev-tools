import { defineMessages } from '#lib/i18n/define.js';

export const messages = defineMessages(
	{
		'tool.escape.name': 'Escape e unescape',
		'tool.escape.desc':
			'Escape e unescape de HTML, JSON, JavaScript, Unicode, XML e campos CSV.',
		'escape.format': 'Formato',
		'escape.fmtHtml': 'Entidades HTML',
		'escape.fmtJson': 'String JSON',
		'escape.fmtJs': 'String JavaScript',
		'escape.fmtUnicode': 'Escapes Unicode (\\uXXXX)',
		'escape.fmtXml': 'XML',
		'escape.fmtCsv': 'Campo CSV',
		'escape.modeEscape': 'Escape',
		'escape.modeUnescape': 'Unescape',
		'escape.nonAscii': 'Codificar também caracteres não ASCII (&#NNN;)',
		'escape.quote': 'Aspas',
		'escape.quoteSingle': 'Simples (\')',
		'escape.quoteDouble': 'Duplas (")',
		'escape.allChars': 'Escapar também caracteres ASCII',
		'escape.err': 'Não foi possível converter: {message}',
		'escape.empty': 'Digite ou cole um texto.'
	},
	{
		'tool.escape.name': 'Escape and unescape',
		'tool.escape.desc': 'Escape and unescape HTML, JSON, JavaScript, Unicode, XML and CSV fields.',
		'escape.format': 'Format',
		'escape.fmtHtml': 'HTML entities',
		'escape.fmtJson': 'JSON string',
		'escape.fmtJs': 'JavaScript string',
		'escape.fmtUnicode': 'Unicode escapes (\\uXXXX)',
		'escape.fmtXml': 'XML',
		'escape.fmtCsv': 'CSV field',
		'escape.modeEscape': 'Escape',
		'escape.modeUnescape': 'Unescape',
		'escape.nonAscii': 'Also encode non-ASCII characters (&#NNN;)',
		'escape.quote': 'Quotes',
		'escape.quoteSingle': "Single (')",
		'escape.quoteDouble': 'Double (")',
		'escape.allChars': 'Also escape ASCII characters',
		'escape.err': 'Could not convert: {message}',
		'escape.empty': 'Type or paste some text.'
	}
);
