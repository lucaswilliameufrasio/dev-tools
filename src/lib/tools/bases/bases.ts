export type BaseId = 2 | 8 | 10 | 16;

export const BASES: BaseId[] = [2, 8, 10, 16];

const DIGITS: Record<BaseId, RegExp> = {
	2: /^[01]+$/,
	8: /^[0-7]+$/,
	10: /^[0-9]+$/,
	16: /^[0-9a-f]+$/
};

export type BasesResult = { ok: true; value: bigint } | { ok: false };

export function parseInBase(input: string, base: BaseId): BasesResult {
	let text = input.trim().toLowerCase().replace(/[_\s]/g, '');
	let negative = false;
	if (text.startsWith('-')) {
		negative = true;
		text = text.slice(1);
	}
	const prefixes: Record<BaseId, string> = { 2: '0b', 8: '0o', 10: '', 16: '0x' };
	const prefix = prefixes[base];
	if (prefix !== '' && text.startsWith(prefix)) {
		text = text.slice(prefix.length);
	}
	if (!DIGITS[base].test(text)) {
		return { ok: false };
	}
	const prefixForBigInt: Record<BaseId, string> = { 2: '0b', 8: '0o', 10: '', 16: '0x' };
	const value = BigInt(prefixForBigInt[base] + text);
	return { ok: true, value: negative ? -value : value };
}

export function formatInBase(value: bigint, base: BaseId): string {
	return value.toString(base);
}
