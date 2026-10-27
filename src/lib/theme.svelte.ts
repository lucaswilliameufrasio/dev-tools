export type ThemeChoice = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'dev-tools:theme';
const ORDER: ThemeChoice[] = ['system', 'light', 'dark'];

class Theme {
	choice = $state<ThemeChoice>('system');

	init(): void {
		let stored: string | undefined;
		try {
			stored = localStorage.getItem(STORAGE_KEY) ?? undefined;
		} catch {
			stored = undefined;
		}
		if (stored === 'light' || stored === 'dark') {
			this.apply(stored);
		}
	}

	cycle(): void {
		const next = ORDER[(ORDER.indexOf(this.choice) + 1) % ORDER.length] ?? 'system';
		this.apply(next);
		try {
			localStorage.setItem(STORAGE_KEY, next);
		} catch {
			// Storage can be blocked; the choice then lasts only for this visit.
		}
	}

	private apply(choice: ThemeChoice): void {
		this.choice = choice;
		if (choice === 'system') {
			document.documentElement.removeAttribute('data-theme');
			return;
		}
		document.documentElement.setAttribute('data-theme', choice);
	}
}

export const theme = new Theme();
