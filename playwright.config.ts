import { defineConfig } from '@playwright/test';

const PORT = 4399;

export default defineConfig({
	testDir: 'e2e',
	fullyParallel: true,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
	use: {
		baseURL: `http://localhost:${PORT}`,
		serviceWorkers: 'block'
	},
	webServer: {
		// Serves the production build; run `pnpm build` first.
		command: `pnpm exec vite preview --port ${PORT} --strictPort`,
		url: `http://localhost:${PORT}`,
		reuseExistingServer: false
	},
	projects: [{ name: 'chromium', use: { browserName: 'chromium' } }]
});
