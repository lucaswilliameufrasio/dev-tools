import { mkdirSync, writeFileSync } from 'node:fs';
import { open } from './support';
import { expect, test } from '@playwright/test';

/**
 * End-to-end user journeys. Evidence (screenshots and a network log) is
 * written to verification-artifacts/ and survives teardown.
 * The headless browser reports en-US, so the interface starts in English.
 */
const ARTIFACTS = 'verification-artifacts';

test.beforeAll(() => {
	mkdirSync(ARTIFACTS, { recursive: true });
});

test('journey: find Base64 from the palette, encode, decode, keep the language', async ({
	page,
	context,
	baseURL
}) => {
	const origin = new URL(baseURL ?? 'http://localhost').origin;
	const requests: { url: string; sameOrigin: boolean }[] = [];
	context.on('request', (request) => {
		const url = request.url();
		const sameOrigin = url.startsWith('data:') || url.startsWith('blob:') || new URL(url).origin === origin;
		requests.push({ url, sameOrigin });
	});

	// 1. Open the app and reach the tool through the command palette.
	await open(page, '/', { waitUntil: 'networkidle' });
	await page.keyboard.press('ControlOrMeta+K');
	await page.locator('#palette-search').fill('b64');
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(/\/base64$/);
	await expect(page.getByRole('heading', { level: 1, name: 'Base64' })).toBeVisible();

	// 2. Encode text (including accents and an emoji).
	const original = 'Olá, mundo! 👋';
	const encoded = Buffer.from(original, 'utf-8').toString('base64');
	await page.locator('#b64-input').fill(original);
	await expect(page.locator('#b64-output')).toHaveValue(encoded);
	await page.screenshot({ path: `${ARTIFACTS}/base64-encode.png`, fullPage: true });

	// 3. Decode it back.
	await page.getByRole('radio', { name: 'Decode' }).check({ force: true });
	await page.locator('#b64-input').fill(encoded);
	await expect(page.locator('#b64-output')).toHaveValue(original);
	await page.screenshot({ path: `${ARTIFACTS}/base64-decode.png`, fullPage: true });

	// 4. Switching the language is remembered after a reload.
	await page.getByRole('button', { name: 'Language' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Base64' })).toBeVisible();
	await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
	await page.reload();
	await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
	await expect(page.getByText('Codifica e decodifica texto ou arquivos')).toBeVisible();
	const stored = await page.evaluate(() => localStorage.getItem('dev-tools:locale'));
	expect(stored).toBe('pt');

	// 5. Evidence that nothing left the browser during the whole journey.
	const external = requests.filter((entry) => !entry.sameOrigin);
	writeFileSync(`${ARTIFACTS}/base64-network-log.json`, JSON.stringify(requests, undefined, 2));
	expect(external).toEqual([]);
});

test.describe('offline PWA', () => {
	test.use({ serviceWorkers: 'allow' });

	test('journey: install the service worker, go offline and still use a tool', async ({
		page,
		context
	}) => {
		await open(page, '/');
		await page.evaluate(async () => {
			await navigator.serviceWorker.ready;
		});
		// The first load is not controlled yet; reload so the worker serves it.
		await page.reload();
		await expect
			.poll(async () => page.evaluate(() => navigator.serviceWorker.controller !== null))
			.toBe(true);

		await context.setOffline(true);
		await open(page, '/json');
		await expect(page.getByRole('heading', { level: 1, name: 'JSON' })).toBeVisible();
		await page.locator('#json-input').fill('{"a":1,"b":[true,null]}');
		await expect(page.locator('#json-output')).toHaveValue('{\n  "a": 1,\n  "b": [\n    true,\n    null\n  ]\n}');
		await page.screenshot({ path: `${ARTIFACTS}/json-offline.png`, fullPage: true });
		await context.setOffline(false);
	});
});
