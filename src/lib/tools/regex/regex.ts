export type RegexRequest = { pattern: string; flags: string; text: string };

export type RegexMatch = {
	index: number;
	text: string;
	groups: (string | undefined)[];
	named: Record<string, string | undefined>;
};

export type RegexResponse =
	| { ok: true; matches: RegexMatch[]; truncated: boolean }
	| { ok: false; reason: 'invalid'; message: string };

const MAX_MATCHES = 500;

export function runRegex(request: RegexRequest): RegexResponse {
	let expression: RegExp;
	try {
		const flags = request.flags.includes('g') ? request.flags : `${request.flags}g`;
		expression = new RegExp(request.pattern, flags);
	} catch (error) {
		return { ok: false, reason: 'invalid', message: error instanceof Error ? error.message : String(error) };
	}
	const matches: RegexMatch[] = [];
	let truncated = false;
	for (const match of request.text.matchAll(expression)) {
		if (matches.length >= MAX_MATCHES) {
			truncated = true;
			break;
		}
		matches.push({
			index: match.index ?? 0,
			text: match[0],
			groups: match.slice(1),
			named: { ...match.groups }
		});
	}
	return { ok: true, matches, truncated };
}
