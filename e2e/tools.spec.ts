import { expect, test } from '@playwright/test';

// The headless browser reports en-US, so the interface is in English.

test('bcrypt hashes in a worker and returns a $2b$ string', async ({ page }) => {
	await page.goto('/bcrypt');
	await page.locator('#bcrypt-password').fill('hunter2');
	await page.locator('#bcrypt-cost').fill('4');
	await page.getByRole('button', { name: 'Generate hash' }).click();
	await expect(page.locator('#bcrypt-output')).toHaveValue(/^\$2b\$04\$/);
});

test('argon2 hashes with WebAssembly and returns an argon2id string', async ({ page }) => {
	await page.goto('/argon2');
	await page.locator('#argon2-password').fill('hunter2');
	await page.locator('#argon2-memory').fill('64');
	await page.getByRole('button', { name: 'Generate hash' }).click();
	await expect(page.locator('#argon2-encoded')).toHaveValue(/^\$argon2id\$v=19\$m=64,/);
});

test('regex runs in a worker and highlights matches', async ({ page }) => {
	await page.goto('/regex');
	await expect(page.getByText('2 matches')).toBeVisible();
	await expect(page.locator('mark')).toHaveCount(2);
});

test('sql lazily loads the formatter and formats the example', async ({ page }) => {
	await page.goto('/sql');
	await expect(page.locator('#sql-output')).not.toHaveValue('');
	const output = await page.locator('#sql-output').inputValue();
	expect(output.split('\n').length).toBeGreaterThan(2);
});

test('jsontypes emits Go and Rust code', async ({ page }) => {
	await page.goto('/jsontypes');
	await page.locator('#jsontypes-language').selectOption('go');
	await expect(page.locator('#jsontypes-output')).toHaveValue(/type Root struct/);
	await page.locator('#jsontypes-language').selectOption('rust');
	await expect(page.locator('#jsontypes-output')).toHaveValue(/#\[derive\(.*Serialize/);
});

test('cron explains an expression and lists the next runs', async ({ page }) => {
	await page.goto('/cron');
	await page.locator('#cron-expr').fill('*/15 * * * *');
	await expect(page.getByText(/15 minutes/i).first()).toBeVisible();
});

test('qr renders a preview image', async ({ page }) => {
	await page.goto('/qr');
	await expect(page.locator('img[src^="data:image/svg"]').first()).toBeVisible();
});

test('hash computes MD5 locally', async ({ page }) => {
	await page.goto('/hash');
	await expect(page.getByText('a02bf1dd0d2695e2ba8b107a5be9732c')).toBeVisible();
});
