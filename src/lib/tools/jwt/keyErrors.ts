import type { MessageKey } from '#lib/i18n/index.svelte.js';
import type { KeyErrorReason, SignErrorReason } from './jwtCrypto';

export const KEY_ERROR_MESSAGES: Record<KeyErrorReason, MessageKey> = {
	empty: 'jwtx.keyErr.empty',
	'pem-format': 'jwtx.keyErr.pemFormat',
	'pem-unsupported': 'jwtx.keyErr.pemUnsupported',
	'pem-wrong-kind': 'jwtx.keyErr.pemWrongKind',
	'pem-base64': 'jwtx.keyErr.pemBase64',
	'jwk-json': 'jwtx.keyErr.jwkJson',
	'jwk-invalid': 'jwtx.keyErr.jwkInvalid',
	'secret-base64': 'jwtx.keyErr.secretBase64',
	'import-failed': 'jwtx.keyErr.importFailed'
};

export const SIGN_ERROR_MESSAGES: Record<Exclude<SignErrorReason, 'bad-key'>, MessageKey> = {
	'header-json': 'jwtx.signErr.headerJson',
	'payload-json': 'jwtx.signErr.payloadJson',
	'header-alg': 'jwtx.signErr.headerAlg',
	'sign-failed': 'jwtx.signErr.signFailed'
};
