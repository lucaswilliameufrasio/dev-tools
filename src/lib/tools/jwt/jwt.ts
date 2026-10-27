import { decodeText } from '../base64/base64';

export type JwtDecoded = {
	header: unknown;
	payload: unknown;
	signature: string;
	times: JwtTime[];
};

export type JwtTimeClaim = 'exp' | 'iat' | 'nbf';

export type JwtTime = { claim: JwtTimeClaim; date: Date };

export type JwtResult =
	| { ok: true; token: JwtDecoded }
	| { ok: false; reason: 'format' | 'header' | 'payload' };

function parseSegment(segment: string): unknown {
	const decoded = decodeText(segment);
	if (!decoded.ok) {
		return undefined;
	}
	try {
		return JSON.parse(decoded.text);
	} catch {
		return undefined;
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function decodeJwt(input: string): JwtResult {
	const cleaned = input.trim().replace(/^bearer\s+/i, '');
	const parts = cleaned.split('.');
	if (parts.length !== 3) {
		return { ok: false, reason: 'format' };
	}
	const [headerPart = '', payloadPart = '', signature = ''] = parts;
	const header = parseSegment(headerPart);
	if (!isRecord(header)) {
		return { ok: false, reason: 'header' };
	}
	const payload = parseSegment(payloadPart);
	if (payload === undefined) {
		return { ok: false, reason: 'payload' };
	}
	const times: JwtTime[] = [];
	if (isRecord(payload)) {
		const claims: JwtTimeClaim[] = ['iat', 'nbf', 'exp'];
		for (const claim of claims) {
			const value = payload[claim];
			if (typeof value === 'number' && Number.isFinite(value)) {
				times.push({ claim, date: new Date(value * 1000) });
			}
		}
	}
	return { ok: true, token: { header, payload, signature, times } };
}
