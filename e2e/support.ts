import type { Page, Response } from '@playwright/test';

type GotoOptions = Parameters<Page['goto']>[1];

/**
 * Opens a page and waits until the app has hydrated. Tool pages are
 * prerendered, so interacting earlier would race with hydration.
 */
export async function open(page: Page, path: string, options?: GotoOptions): Promise<Response | null> {
	const response = await page.goto(path, options);
	await page.waitForFunction(() => document.documentElement.dataset.hydrated === 'true');
	return response;
}
