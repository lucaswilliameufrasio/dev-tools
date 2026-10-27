import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { TOOLS } from '../src/lib/tools/registry';

const PAGES = ['/', ...TOOLS.map((tool) => `/${tool.id}`)];

test.skip(({ browserName }) => browserName !== 'chromium', 'axe runs once, on Chromium');

for (const path of PAGES) {
	test(`no serious accessibility violations: ${path}`, async ({ page }) => {
		await page.goto(path, { waitUntil: 'networkidle' });
		await expect(page.locator('h1')).toBeVisible();

		for (const scheme of ['light', 'dark'] as const) {
			await page.emulateMedia({ colorScheme: scheme });
			const results = await new AxeBuilder({ page })
				.withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
				.analyze();
			const serious = results.violations.filter(
				(violation) => violation.impact === 'serious' || violation.impact === 'critical'
			);
			const summary = serious.map(
				(violation) =>
					`${violation.id} (${violation.impact}): ${violation.nodes
						.slice(0, 3)
						.map((node) => node.target.join(' '))
						.join(' | ')}`
			);
			expect(summary, `${path} [${scheme}]`).toEqual([]);
		}
	});
}
