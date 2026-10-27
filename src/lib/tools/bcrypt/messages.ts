import { defineMessages } from '#lib/i18n/define.js';

export const messages = defineMessages(
	{
		'tool.bcrypt.name': 'Bcrypt',
		'tool.bcrypt.desc': 'Gera e verifica hashes bcrypt de senhas, localmente no navegador.',
		'bcrypt.modeHash': 'Gerar hash',
		'bcrypt.modeVerify': 'Verificar',
		'bcrypt.password': 'Senha',
		'bcrypt.cost': 'Custo (4 a 15)',
		'bcrypt.costHint': 'Cada +1 dobra o tempo de cálculo. 10 a 12 é um ponto de partida comum.',
		'bcrypt.hashInput': 'Hash bcrypt',
		'bcrypt.hashOutput': 'Hash gerado',
		'bcrypt.run': 'Gerar hash',
		'bcrypt.verifyRun': 'Verificar',
		'bcrypt.cancel': 'Cancelar',
		'bcrypt.running': 'Calculando… a página continua utilizável.',
		'bcrypt.elapsed': 'Tempo: {ms} ms',
		'bcrypt.cancelled': 'Cálculo cancelado.',
		'bcrypt.match': 'A senha corresponde ao hash.',
		'bcrypt.noMatch': 'A senha NÃO corresponde ao hash.',
		'bcrypt.warnSlow': 'Custo {cost} é lento: pode levar vários segundos ou mais, dependendo do aparelho.',
		'bcrypt.warnLong':
			'O bcrypt usa só os primeiros 72 bytes da senha (UTF-8). Sua senha tem {bytes} bytes; o restante é ignorado.',
		'bcrypt.errEmptyPassword': 'Digite uma senha.',
		'bcrypt.errCost': 'O custo deve ser um número inteiro entre 4 e 15.',
		'bcrypt.errHash':
			'Formato de hash inválido. Esperado algo como $2b$10$ seguido de 53 caracteres.',
		'bcrypt.errFailed': 'Não foi possível calcular o hash. Tente novamente com um custo menor.',
		'bcrypt.privacy':
			'O hash é calculado localmente no seu navegador; a senha nunca sai do aparelho.',
		'bcrypt.owasp':
			'Em sistemas reais, siga as recomendações atuais da OWASP: salt aleatório e único por senha e custo ajustado ao seu hardware. Para novos projetos, prefira Argon2id (mínimo OWASP: m=19456 KiB, t=2, p=1).'
	},
	{
		'tool.bcrypt.name': 'Bcrypt',
		'tool.bcrypt.desc': 'Generate and verify bcrypt password hashes locally in the browser.',
		'bcrypt.modeHash': 'Generate hash',
		'bcrypt.modeVerify': 'Verify',
		'bcrypt.password': 'Password',
		'bcrypt.cost': 'Cost (4 to 15)',
		'bcrypt.costHint': 'Each +1 doubles the work. 10 to 12 is a common starting point.',
		'bcrypt.hashInput': 'Bcrypt hash',
		'bcrypt.hashOutput': 'Generated hash',
		'bcrypt.run': 'Generate hash',
		'bcrypt.verifyRun': 'Verify',
		'bcrypt.cancel': 'Cancel',
		'bcrypt.running': 'Computing… the page stays usable.',
		'bcrypt.elapsed': 'Time: {ms} ms',
		'bcrypt.cancelled': 'Computation cancelled.',
		'bcrypt.match': 'The password matches the hash.',
		'bcrypt.noMatch': 'The password does NOT match the hash.',
		'bcrypt.warnSlow': 'Cost {cost} is slow: it can take several seconds or more depending on your device.',
		'bcrypt.warnLong':
			'Bcrypt only uses the first 72 bytes of the password (UTF-8). Yours is {bytes} bytes; the rest is ignored.',
		'bcrypt.errEmptyPassword': 'Enter a password.',
		'bcrypt.errCost': 'Cost must be a whole number between 4 and 15.',
		'bcrypt.errHash': 'Invalid hash format. Expected something like $2b$10$ followed by 53 characters.',
		'bcrypt.errFailed': 'Could not compute the hash. Try again with a lower cost.',
		'bcrypt.privacy': 'The hash is computed locally in your browser; the password never leaves your device.',
		'bcrypt.owasp':
			'For real systems, follow current OWASP guidance: a random, unique salt per password and a cost tuned to your hardware. For new projects prefer Argon2id (OWASP minimum: m=19456 KiB, t=2, p=1).'
	}
);
