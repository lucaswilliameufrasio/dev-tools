import { extraEn, extraPt, type ExtraKey } from './catalog';
import { en } from './en';
import { pt, type Messages } from './pt';

export type Locale = 'pt' | 'en';
export type MessageKey = keyof Messages | ExtraKey;

const dictionaries: Record<Locale, Record<MessageKey, string>> = {
	pt: { ...pt, ...extraPt },
	en: { ...en, ...extraEn }
};
const STORAGE_KEY = 'dev-tools:locale';

class I18n {
	locale = $state<Locale>('pt');

	init(): void {
		let stored: string | undefined;
		try {
			stored = localStorage.getItem(STORAGE_KEY) ?? undefined;
		} catch {
			stored = undefined;
		}
		if (stored === 'pt' || stored === 'en') {
			this.set(stored);
			return;
		}
		this.set(navigator.language.toLowerCase().startsWith('pt') ? 'pt' : 'en', false);
	}

	set(locale: Locale, persist = true): void {
		this.locale = locale;
		document.documentElement.lang = locale === 'pt' ? 'pt-BR' : 'en';
		if (!persist) {
			return;
		}
		try {
			localStorage.setItem(STORAGE_KEY, locale);
		} catch {
			// Storage can be blocked; the choice then lasts only for this visit.
		}
	}

	get intlLocale(): string {
		return this.locale === 'pt' ? 'pt-BR' : 'en-US';
	}
}

export const i18n = new I18n();

export function t(key: MessageKey, params?: Record<string, string | number>): string {
	const template = dictionaries[i18n.locale][key];
	if (params === undefined) {
		return template;
	}
	let result = template;
	for (const [name, value] of Object.entries(params)) {
		result = result.replaceAll(`{${name}}`, String(value));
	}
	return result;
}
