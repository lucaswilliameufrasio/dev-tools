import { defineMessages } from '#lib/i18n/define.js';

export const messages = defineMessages(
	{
		'tool.argon2.name': 'Argon2',
		'tool.argon2.desc': 'Gera e verifica hashes Argon2id, Argon2i e Argon2d, localmente no navegador.',
		'argon2.modeHash': 'Gerar hash',
		'argon2.modeVerify': 'Verificar',
		'argon2.password': 'Senha',
		'argon2.variant': 'Variante',
		'argon2.memory': 'Memória (KiB)',
		'argon2.iterations': 'Iterações',
		'argon2.parallelism': 'Paralelismo',
		'argon2.hashLength': 'Tamanho do hash (bytes)',
		'argon2.hashInput': 'Hash codificado',
		'argon2.encodedOutput': 'Hash codificado',
		'argon2.hexOutput': 'Hash bruto (hex)',
		'argon2.run': 'Gerar hash',
		'argon2.verifyRun': 'Verificar',
		'argon2.cancel': 'Cancelar',
		'argon2.running': 'Calculando… a página continua utilizável.',
		'argon2.elapsed': 'Tempo: {ms} ms',
		'argon2.cancelled': 'Cálculo cancelado.',
		'argon2.match': 'A senha corresponde ao hash.',
		'argon2.noMatch': 'A senha NÃO corresponde ao hash.',
		'argon2.warnHeavy':
			'Memória acima de 256 MiB pode ser lenta ou falhar em aparelhos com pouca RAM.',
		'argon2.errEmptyPassword': 'Digite uma senha.',
		'argon2.errMemory': 'A memória deve ser um inteiro entre 8 e 1048576 KiB.',
		'argon2.errMemoryParallelism': 'A memória deve ser de pelo menos 8 KiB por unidade de paralelismo.',
		'argon2.errIterations': 'As iterações devem ser um inteiro entre 1 e 100.',
		'argon2.errParallelism': 'O paralelismo deve ser um inteiro entre 1 e 16.',
		'argon2.errHashLength': 'O tamanho do hash deve ser um inteiro entre 4 e 128 bytes.',
		'argon2.errHash':
			'Hash inválido. Esperado o formato $argon2id$v=19$m=…,t=…,p=…$salt$hash com parâmetros válidos.',
		'argon2.errFailed':
			'Não foi possível calcular o hash. Tente novamente com menos memória.',
		'argon2.privacy':
			'O hash é calculado localmente no seu navegador; a senha nunca sai do aparelho.',
		'argon2.owasp':
			'Em sistemas reais, use um salt aleatório e único por senha e siga as recomendações atuais da OWASP. Mínimo para Argon2id: m=19456 KiB (19 MiB), t=2, p=1.'
	},
	{
		'tool.argon2.name': 'Argon2',
		'tool.argon2.desc': 'Generate and verify Argon2id, Argon2i and Argon2d hashes locally in the browser.',
		'argon2.modeHash': 'Generate hash',
		'argon2.modeVerify': 'Verify',
		'argon2.password': 'Password',
		'argon2.variant': 'Variant',
		'argon2.memory': 'Memory (KiB)',
		'argon2.iterations': 'Iterations',
		'argon2.parallelism': 'Parallelism',
		'argon2.hashLength': 'Hash length (bytes)',
		'argon2.hashInput': 'Encoded hash',
		'argon2.encodedOutput': 'Encoded hash',
		'argon2.hexOutput': 'Raw hash (hex)',
		'argon2.run': 'Generate hash',
		'argon2.verifyRun': 'Verify',
		'argon2.cancel': 'Cancel',
		'argon2.running': 'Computing… the page stays usable.',
		'argon2.elapsed': 'Time: {ms} ms',
		'argon2.cancelled': 'Computation cancelled.',
		'argon2.match': 'The password matches the hash.',
		'argon2.noMatch': 'The password does NOT match the hash.',
		'argon2.warnHeavy': 'Memory above 256 MiB can be slow or fail on devices with little RAM.',
		'argon2.errEmptyPassword': 'Enter a password.',
		'argon2.errMemory': 'Memory must be a whole number between 8 and 1048576 KiB.',
		'argon2.errMemoryParallelism': 'Memory must be at least 8 KiB per unit of parallelism.',
		'argon2.errIterations': 'Iterations must be a whole number between 1 and 100.',
		'argon2.errParallelism': 'Parallelism must be a whole number between 1 and 16.',
		'argon2.errHashLength': 'Hash length must be a whole number between 4 and 128 bytes.',
		'argon2.errHash':
			'Invalid hash. Expected the format $argon2id$v=19$m=…,t=…,p=…$salt$hash with valid parameters.',
		'argon2.errFailed': 'Could not compute the hash. Try again with less memory.',
		'argon2.privacy': 'The hash is computed locally in your browser; the password never leaves your device.',
		'argon2.owasp':
			'For real systems, use a random, unique salt per password and follow current OWASP guidance. Argon2id minimum: m=19456 KiB (19 MiB), t=2, p=1.'
	}
);
