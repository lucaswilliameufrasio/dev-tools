import { mkdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { TOOLS } from '../src/lib/tools/registry';

const PAGES = ['/', ...TOOLS.map((tool) => `/${tool.id}`)];
const DIR = 'verification-artifacts/layout';

test.beforeAll(() => {
	mkdirSync(DIR, { recursive: true });
});

for (const path of PAGES) {
	test(`no horizontal scroll in light and dark: ${path}`, async ({ page }, testInfo) => {
		await page.goto(path, { waitUntil: 'networkidle' });
		await expect(page.locator('h1')).toBeVisible();

		for (const scheme of ['light', 'dark'] as const) {
			await page.emulateMedia({ colorScheme: scheme });
			const overflow = await page.evaluate(
				() => document.documentElement.scrollWidth - document.documentElement.clientWidth
			);
			expect(overflow, `${path} overflows by ${overflow}px in ${scheme}`).toBeLessThanOrEqual(0);

			if (testInfo.project.name === 'mobile-chrome') {
				const name = path === '/' ? 'home' : path.slice(1);
				await page.screenshot({ path: `${DIR}/${testInfo.project.name}-${scheme}-${name}.png`, fullPage: true });
			}
		}
	});
}

test('the command palette is usable on this viewport', async ({ page }) => {
	await page.goto('/', { waitUntil: 'networkidle' });
	await page.getByRole('button', { name: 'Search tools' }).click();
	await page.locator('#palette-search').fill('cron');
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(/\/cron$/);
});
