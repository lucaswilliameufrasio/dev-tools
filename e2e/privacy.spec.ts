import { open } from './support';
import { expect, test } from '@playwright/test';
import { TOOLS } from '../src/lib/tools/registry';

/**
 * The product promise is that nothing leaves the browser. Every page must
 * work while any request to a different origin is blocked and recorded.
 */
const PAGES = ['/', ...TOOLS.map((tool) => `/${tool.id}`)];

for (const path of PAGES) {
	test(`makes no external requests: ${path}`, async ({ page, context, baseURL }) => {
		const origin = new URL(baseURL ?? 'http://localhost').origin;
		const external: string[] = [];
		const errors: string[] = [];

		await context.route('**/*', async (route) => {
			const url = route.request().url();
			if (url.startsWith('data:') || url.startsWith('blob:') || new URL(url).origin === origin) {
				await route.continue();
				return;
			}
			external.push(url);
			await route.abort();
		});
		page.on('pageerror', (error) => {
			errors.push(error.message);
		});

		await open(page, path, { waitUntil: 'networkidle' });
		await expect(page.locator('h1')).toBeVisible();
		await page.waitForTimeout(400);

		expect(external, 'requests to other origins').toEqual([]);
		expect(errors, 'uncaught page errors').toEqual([]);
	});
}

test('declares a strict content security policy', async ({ page }) => {
	await open(page, '/');
	const policy = await page
		.locator('meta[http-equiv="content-security-policy"]')
		.getAttribute('content');
	expect(policy).toContain("default-src 'none'");
	expect(policy).toContain("connect-src 'self'");
});
