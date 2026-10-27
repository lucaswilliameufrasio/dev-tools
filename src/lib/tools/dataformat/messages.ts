import { defineMessages } from '#lib/i18n/define.js';

export const messages = defineMessages(
	{
		'tool.dataformat.name': 'JSON, YAML, TOML, CSV',
		'tool.dataformat.desc': 'Converta entre JSON, YAML, TOML e CSV, ou apenas formate.',
		'dataformat.from': 'De',
		'dataformat.to': 'Para',
		'dataformat.indent': 'Indentação',
		'dataformat.delimiter': 'Delimitador',
		'dataformat.delimAuto': 'Detectar',
		'dataformat.delimComma': 'Vírgula (,)',
		'dataformat.delimSemicolon': 'Ponto e vírgula (;)',
		'dataformat.delimTab': 'Tab',
		'dataformat.delimPipe': 'Barra vertical (|)',
		'dataformat.header': 'Primeira linha é cabeçalho',
		'dataformat.infer': 'Converter números, booleanos e vazios',
		'dataformat.crlf': 'Quebra de linha CRLF na saída',
		'dataformat.formatOnly': 'Mesmo formato nos dois lados: o texto será apenas formatado.',
		'dataformat.errParse': 'Não foi possível ler a entrada: {message}',
		'dataformat.errAt': 'Linha {line}, coluna {column}.',
		'dataformat.errTomlRoot':
			'TOML exige uma tabela (objeto) na raiz, mas os dados são uma lista ou um valor simples. Envolva em um objeto, por exemplo {"itens": [...]}.',
		'dataformat.errCsvShape':
			'CSV precisa de uma lista de objetos (ou uma lista de listas). Os itens têm tipos misturados.',
		'dataformat.errUnsupported': 'Não foi possível gerar a saída: {message}',
		'dataformat.empty': 'Cole um texto para converter.'
	},
	{
		'tool.dataformat.name': 'JSON, YAML, TOML, CSV',
		'tool.dataformat.desc': 'Convert between JSON, YAML, TOML and CSV, or just format.',
		'dataformat.from': 'From',
		'dataformat.to': 'To',
		'dataformat.indent': 'Indent',
		'dataformat.delimiter': 'Delimiter',
		'dataformat.delimAuto': 'Auto-detect',
		'dataformat.delimComma': 'Comma (,)',
		'dataformat.delimSemicolon': 'Semicolon (;)',
		'dataformat.delimTab': 'Tab',
		'dataformat.delimPipe': 'Pipe (|)',
		'dataformat.header': 'First row is a header',
		'dataformat.infer': 'Convert numbers, booleans and empty cells',
		'dataformat.crlf': 'CRLF line breaks in output',
		'dataformat.formatOnly': 'Same format on both sides: the text will only be formatted.',
		'dataformat.errParse': 'Could not read the input: {message}',
		'dataformat.errAt': 'Line {line}, column {column}.',
		'dataformat.errTomlRoot':
			'TOML needs a table (object) at the root, but the data is an array or a single value. Wrap it in an object, for example {"items": [...]}.',
		'dataformat.errCsvShape':
			'CSV needs an array of objects (or an array of arrays). The items have mixed types.',
		'dataformat.errUnsupported': 'Could not produce the output: {message}',
		'dataformat.empty': 'Paste some text to convert.'
	}
);
