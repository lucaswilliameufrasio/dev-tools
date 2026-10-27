export type UrlMode = 'component' | 'full';

export type UrlResult = { ok: true; output: string } | { ok: false };

export function encodeUrl(input: string, mode: UrlMode): string {
	if (mode === 'full') {
		return encodeURI(input);
	}
	return encodeURIComponent(input);
}

export function decodeUrl(input: string, mode: UrlMode): UrlResult {
	try {
		const output = mode === 'full' ? decodeURI(input) : decodeURIComponent(input);
		return { ok: true, output };
	} catch {
		return { ok: false };
	}
}

export type QueryEntry = { key: string; value: string };

export function parseQuery(input: string): QueryEntry[] {
	const queryStart = input.indexOf('?');
	const query = queryStart >= 0 ? input.slice(queryStart + 1) : input;
	const withoutHash = query.split('#')[0] ?? '';
	const entries: QueryEntry[] = [];
	for (const [key, value] of new URLSearchParams(withoutHash)) {
		entries.push({ key, value });
	}
	return entries;
}
