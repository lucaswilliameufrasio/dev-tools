import { defineConfig, devices } from '@playwright/test';

const PORT = 4399;

// Set E2E_BASE_URL to run the same suite against another deployment, for
// example `wrangler pages dev` or a Cloudflare preview URL. Without it the
// suite serves the local production build on a dedicated port.
const externalBaseUrl = process.env.E2E_BASE_URL;

export default defineConfig({
	testDir: 'e2e',
	fullyParallel: true,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
	use: {
		baseURL: externalBaseUrl ?? `http://localhost:${PORT}`,
		serviceWorkers: 'block'
	},
	webServer: externalBaseUrl
		? undefined
		: {
				// Serves the production build; run `pnpm build` first.
				command: `pnpm exec vite preview --port ${PORT} --strictPort`,
				url: `http://localhost:${PORT}`,
				reuseExistingServer: false
			},
	projects: [
		{ name: 'chromium', use: { ...devices['Desktop Chrome'] } },
		{ name: 'firefox', use: { ...devices['Desktop Firefox'] } },
		{ name: 'webkit', use: { ...devices['Desktop Safari'] } },
		// Phone-sized viewports run the layout checks (see e2e/layout.spec.ts).
		{ name: 'mobile-chrome', use: { ...devices['Pixel 7'] }, testMatch: /(layout|a11y)\.spec\.ts/ },
		{ name: 'mobile-safari', use: { ...devices['iPhone 14'] }, testMatch: /layout\.spec\.ts/ }
	]
});
