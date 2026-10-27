/**
 * Declares a tool's own messages. The English dictionary must have exactly
 * the same keys as the Portuguese one, which the compiler enforces.
 */
export function defineMessages<Pt extends Record<string, string>>(
	pt: Pt,
	en: Record<keyof Pt, string>
): { pt: Pt; en: Record<keyof Pt, string> } {
	return { pt, en };
}
