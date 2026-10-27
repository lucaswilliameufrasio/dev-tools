import { defineMessages } from '#lib/i18n/define.js';

export const messages = defineMessages(
	{
		'jwtx.mode': 'Modo',
		'jwtx.mode.decode': 'Decodificar',
		'jwtx.mode.verify': 'Verificar',
		'jwtx.mode.sign': 'Assinar',
		'jwtx.alg': 'Algoritmo esperado',
		'jwtx.algSign': 'Algoritmo',
		'jwtx.algNever':
			'O campo alg do header nunca é usado para escolher como verificar: você define o algoritmo esperado. Isso evita ataques de troca de algoritmo e tokens com alg none.',
		'jwtx.algDiffers':
			'O alg do token ({tokenAlg}) é diferente do algoritmo escolhido ({chosen}). A verificação vai falhar com "algoritmo diferente" enquanto não coincidirem.',
		'jwtx.useTokenAlg': 'Usar {alg}',
		'jwtx.key': 'Chave',
		'jwtx.keyVerifyHint':
			'Chave pública em PEM (-----BEGIN PUBLIC KEY-----), JWK em JSON, ou o segredo para HS256/384/512.',
		'jwtx.keySignHint':
			'Chave privada em PEM PKCS#8 (-----BEGIN PRIVATE KEY-----), JWK com campo d, ou o segredo para HS256/384/512.',
		'jwtx.secret': 'Segredo',
		'jwtx.secretBase64': 'Tratar o segredo como base64/base64url',
		'jwtx.generateSecret': 'Gerar segredo HS256 de teste',
		'jwtx.generatedNote': 'Segredo aleatório gerado no navegador. Use só para testes.',
		'jwtx.verify.valid': 'Assinatura válida',
		'jwtx.verify.invalid': 'Assinatura inválida',
		'jwtx.verify.badKey': 'Chave inválida',
		'jwtx.verify.mismatch': 'Algoritmo diferente do esperado',
		'jwtx.verify.none': 'Algoritmo "none" recusado',
		'jwtx.verify.malformed': 'Token malformado',
		'jwtx.verify.validHelp': 'A assinatura confere com a chave e o algoritmo escolhidos.',
		'jwtx.verify.invalidHelp':
			'O conteúdo foi alterado, a chave não é a correta ou o algoritmo é outro. Confira a chave e o algoritmo.',
		'jwtx.verify.mismatchHelp':
			'O header do token declara {tokenAlg}, mas você escolheu {chosen}. Escolha o algoritmo que você espera receber; não confie no do token.',
		'jwtx.verify.noneHelp':
			'Tokens com alg none não têm assinatura e nunca são aceitos na verificação.',
		'jwtx.verify.malformedHelp':
			'Um JWT tem três partes (header.payload.assinatura) com header e payload em JSON Base64URL.',
		'jwtx.verify.empty': 'Cole um token para verificar a assinatura.',
		'jwtx.time.expired': 'O token expirou (exp).',
		'jwtx.time.notYet': 'O token ainda não é válido (nbf).',
		'jwtx.time.ok': 'Dentro do período de validade (exp/nbf).',
		'jwtx.time.none': 'O token não tem exp nem nbf.',
		'jwtx.keyErr.empty': 'Informe a chave ou o segredo.',
		'jwtx.keyErr.pemFormat':
			'Não parece uma chave PEM nem um JWK. Use blocos -----BEGIN PUBLIC KEY----- ou -----BEGIN PRIVATE KEY----- completos, ou um JSON.',
		'jwtx.keyErr.pemUnsupported':
			'Formato PEM não suportado. Converta para PKCS#8 (BEGIN PRIVATE KEY) ou SPKI (BEGIN PUBLIC KEY), por exemplo com openssl pkcs8 -topk8 -nocrypt. Certificados e chaves cifradas não são aceitos.',
		'jwtx.keyErr.pemWrongKind':
			'Tipo de chave errado: use a chave pública (BEGIN PUBLIC KEY) para verificar e a privada (BEGIN PRIVATE KEY) para assinar.',
		'jwtx.keyErr.pemBase64': 'O conteúdo do PEM não é Base64 válido. Copie o bloco inteiro, sem cortar linhas.',
		'jwtx.keyErr.jwkJson': 'O JWK não é um JSON válido.',
		'jwtx.keyErr.jwkInvalid':
			'JWK inválido: precisa ser um objeto com kty e os campos da chave (para assinar, também o campo privado d).',
		'jwtx.keyErr.secretBase64': 'O segredo não é base64 válido. Desmarque a opção ou corrija o valor.',
		'jwtx.keyErr.importFailed':
			'Não foi possível usar esta chave com o algoritmo escolhido. Confira se o tipo (RSA ou EC), a curva (P-256, P-384, P-521) e o algoritmo combinam.',
		'jwtx.signErr.headerJson': 'O header não é um objeto JSON válido.',
		'jwtx.signErr.payloadJson': 'O payload não é um objeto JSON válido.',
		'jwtx.signErr.headerAlg': 'O campo alg do header precisa ser igual ao algoritmo escolhido.',
		'jwtx.signErr.signFailed': 'Não foi possível assinar com esta chave.',
		'jwtx.header': 'Header (JSON)',
		'jwtx.payload': 'Payload (JSON)',
		'jwtx.setTimes': 'iat = agora, exp = agora + 1 h',
		'jwtx.signedToken': 'JWT assinado',
		'jwtx.signEmpty': 'Informe a chave para gerar o token.',
		'jwtx.signNotice':
			'A assinatura acontece neste navegador com a Web Crypto API. A chave não sai da sua máquina. O JSON é reserializado sem espaços, então a assinatura pode diferir de exemplos com espaços no original.'
	},
	{
		'jwtx.mode': 'Mode',
		'jwtx.mode.decode': 'Decode',
		'jwtx.mode.verify': 'Verify',
		'jwtx.mode.sign': 'Sign',
		'jwtx.alg': 'Expected algorithm',
		'jwtx.algSign': 'Algorithm',
		'jwtx.algNever':
			"The token's own alg header is never used to choose how to verify: you pick the expected algorithm. This prevents algorithm-confusion attacks and alg none tokens.",
		'jwtx.algDiffers':
			"The token's alg ({tokenAlg}) differs from the chosen algorithm ({chosen}). Verification will fail with \"algorithm mismatch\" until they match.",
		'jwtx.useTokenAlg': 'Use {alg}',
		'jwtx.key': 'Key',
		'jwtx.keyVerifyHint':
			'Public key as PEM (-----BEGIN PUBLIC KEY-----), a JWK as JSON, or the secret for HS256/384/512.',
		'jwtx.keySignHint':
			'Private key as PKCS#8 PEM (-----BEGIN PRIVATE KEY-----), a JWK with the d field, or the secret for HS256/384/512.',
		'jwtx.secret': 'Secret',
		'jwtx.secretBase64': 'Treat the secret as base64/base64url',
		'jwtx.generateSecret': 'Generate a random HS256 test secret',
		'jwtx.generatedNote': 'Random secret generated in your browser. Use for testing only.',
		'jwtx.verify.valid': 'Valid signature',
		'jwtx.verify.invalid': 'Invalid signature',
		'jwtx.verify.badKey': 'Bad key',
		'jwtx.verify.mismatch': 'Algorithm mismatch',
		'jwtx.verify.none': 'Algorithm "none" rejected',
		'jwtx.verify.malformed': 'Malformed token',
		'jwtx.verify.validHelp': 'The signature matches the chosen key and algorithm.',
		'jwtx.verify.invalidHelp':
			'The content was changed, the key is not the right one, or the algorithm is different. Check the key and the algorithm.',
		'jwtx.verify.mismatchHelp':
			"The token header declares {tokenAlg}, but you chose {chosen}. Pick the algorithm you expect to receive; do not trust the token's.",
		'jwtx.verify.noneHelp': 'Tokens with alg none carry no signature and are never accepted for verification.',
		'jwtx.verify.malformedHelp':
			'A JWT has three parts (header.payload.signature) with Base64URL JSON header and payload.',
		'jwtx.verify.empty': 'Paste a token to verify its signature.',
		'jwtx.time.expired': 'The token has expired (exp).',
		'jwtx.time.notYet': 'The token is not valid yet (nbf).',
		'jwtx.time.ok': 'Within its validity window (exp/nbf).',
		'jwtx.time.none': 'The token has no exp or nbf.',
		'jwtx.keyErr.empty': 'Enter the key or secret.',
		'jwtx.keyErr.pemFormat':
			'This does not look like a PEM key or a JWK. Use complete -----BEGIN PUBLIC KEY----- or -----BEGIN PRIVATE KEY----- blocks, or a JSON object.',
		'jwtx.keyErr.pemUnsupported':
			'Unsupported PEM format. Convert it to PKCS#8 (BEGIN PRIVATE KEY) or SPKI (BEGIN PUBLIC KEY), for example with openssl pkcs8 -topk8 -nocrypt. Certificates and encrypted keys are not accepted.',
		'jwtx.keyErr.pemWrongKind':
			'Wrong key type: use the public key (BEGIN PUBLIC KEY) to verify and the private key (BEGIN PRIVATE KEY) to sign.',
		'jwtx.keyErr.pemBase64': 'The PEM body is not valid Base64. Copy the whole block without cutting lines.',
		'jwtx.keyErr.jwkJson': 'The JWK is not valid JSON.',
		'jwtx.keyErr.jwkInvalid':
			'Invalid JWK: it must be an object with kty and the key fields (to sign, also the private d field).',
		'jwtx.keyErr.secretBase64': 'The secret is not valid base64. Untick the option or fix the value.',
		'jwtx.keyErr.importFailed':
			'This key cannot be used with the chosen algorithm. Check that the key type (RSA or EC), the curve (P-256, P-384, P-521) and the algorithm match.',
		'jwtx.signErr.headerJson': 'The header is not a valid JSON object.',
		'jwtx.signErr.payloadJson': 'The payload is not a valid JSON object.',
		'jwtx.signErr.headerAlg': 'The alg field in the header must equal the chosen algorithm.',
		'jwtx.signErr.signFailed': 'Could not sign with this key.',
		'jwtx.header': 'Header (JSON)',
		'jwtx.payload': 'Payload (JSON)',
		'jwtx.setTimes': 'iat = now, exp = now + 1 h',
		'jwtx.signedToken': 'Signed JWT',
		'jwtx.signEmpty': 'Enter the key to produce the token.',
		'jwtx.signNotice':
			'Signing happens in this browser with the Web Crypto API. The key never leaves your machine. The JSON is re-serialized without whitespace, so the signature may differ from examples that had spaces in the original.'
	}
);
