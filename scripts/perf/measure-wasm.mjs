// Measures the cost of the WebAssembly hashing tools (bcrypt, argon2).
//
//   pnpm build
//   npx wrangler pages dev --port 8788   (or `pnpm exec vite preview --port 4398 --strictPort`)
//   BASE_URL=http://127.0.0.1:8788 node scripts/perf/measure-wasm.mjs
//
// Reports: worker bundle sizes, cold start, compute time per parameter set,
// main-thread frame gaps while hashing, and native Node argon2 for comparison.
import { argon2Sync, randomBytes } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { brotliCompressSync, gzipSync } from 'node:zlib';
import { chromium, firefox, webkit } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:8788';
const RUNS = Number(process.env.RUNS ?? 3);
const BROWSERS = [
	['chromium', chromium],
	['firefox', firefox],
	['webkit', webkit]
];

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const fmt = (ms) => (ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${ms.toFixed(0)} ms`);

function bundleSizes() {
	const dir = 'build/_app/immutable/workers';
	console.log('\n== Worker bundles (WebAssembly is embedded in each)');
	for (const name of readdirSync(dir)) {
		const buffer = readFileSync(`${dir}/${name}`);
		console.log(
			`${name.padEnd(36)} raw ${(buffer.length / 1024).toFixed(1)} KiB  gzip ${(gzipSync(buffer).length / 1024).toFixed(1)} KiB  brotli ${(brotliCompressSync(buffer).length / 1024).toFixed(1)} KiB`
		);
	}
}

function nativeArgon2(memory, passes, parallelism) {
	const runs = [];
	for (let index = 0; index < RUNS; index += 1) {
		const start = performance.now();
		argon2Sync('argon2id', {
			message: Buffer.from('correct horse'),
			nonce: randomBytes(16),
			parallelism,
			tagLength: 32,
			memory,
			passes
		});
		runs.push(performance.now() - start);
	}
	return median(runs);
}

async function timeAction(page, buttonSelector, resultSelector) {
	return page.evaluate(
		({ buttonSelector, resultSelector }) =>
			new Promise((resolve) => {
				let last = performance.now();
				let maxGap = 0;
				let running = true;
				const tick = () => {
					const now = performance.now();
					maxGap = Math.max(maxGap, now - last);
					last = now;
					if (running) {
						requestAnimationFrame(tick);
					}
				};
				requestAnimationFrame(tick);
				const start = performance.now();
				const observer = new MutationObserver(() => {
					const element = document.querySelector(resultSelector);
					if (element && element.value) {
						running = false;
						observer.disconnect();
						resolve({ ms: performance.now() - start, maxGap });
					}
				});
				observer.observe(document.body, { subtree: true, childList: true, attributes: true });
				document.querySelector(buttonSelector).click();
			}),
		{ buttonSelector, resultSelector }
	);
}

async function measureBcrypt(browser) {
	const page = await browser.newPage();
	await page.goto(`${BASE_URL}/bcrypt`, { waitUntil: 'networkidle' });
	await page.locator('#bcrypt-password').fill('correct horse');
	const rows = [];
	for (const cost of [4, 10, 12]) {
		await page.locator('#bcrypt-cost').fill(String(cost));
		const times = [];
		let gap = 0;
		for (let index = 0; index < RUNS; index += 1) {
			const result = await timeAction(page, 'form button[type="submit"]', '#bcrypt-output');
			times.push(result.ms);
			gap = Math.max(gap, result.maxGap);
		}
		rows.push({ label: `bcrypt cost ${cost}`, times, gap });
	}
	await page.close();
	return rows;
}

async function measureArgon2(browser, scenarios) {
	const page = await browser.newPage();
	await page.goto(`${BASE_URL}/argon2`, { waitUntil: 'networkidle' });
	await page.locator('#argon2-password').fill('correct horse');
	const rows = [];
	for (const scenario of scenarios) {
		await page.locator('#argon2-memory').fill(String(scenario.memory));
		await page.locator('#argon2-iterations').fill(String(scenario.passes));
		await page.locator('#argon2-parallelism').fill(String(scenario.parallelism));
		const times = [];
		let gap = 0;
		for (let index = 0; index < RUNS; index += 1) {
			const result = await timeAction(page, 'form button[type="submit"]', '#argon2-encoded');
			times.push(result.ms);
			gap = Math.max(gap, result.maxGap);
		}
		rows.push({ label: scenario.label, times, gap });
	}
	await page.close();
	return rows;
}

const ARGON2_SCENARIOS = [
	{ label: 'argon2id floor (8 KiB, t=1, p=1)', memory: 8, passes: 1, parallelism: 1 },
	{ label: 'argon2id OWASP (19 MiB, t=2, p=1)', memory: 19456, passes: 2, parallelism: 1 },
	{ label: 'argon2id strong (64 MiB, t=3, p=4)', memory: 65536, passes: 3, parallelism: 4 }
];

bundleSizes();

console.log(`\n== Native Node ${process.version} argon2 (reference, median of ${RUNS})`);
for (const scenario of ARGON2_SCENARIOS.slice(1)) {
	console.log(`${scenario.label.padEnd(40)} ${fmt(nativeArgon2(scenario.memory, scenario.passes, scenario.parallelism))}`);
}

for (const [name, type] of BROWSERS) {
	const browser = await type.launch();
	console.log(`\n== ${name}: first / median / worst of ${RUNS}; "frame gap" = worst main-thread stall`);
	const rows = [...(await measureBcrypt(browser)), ...(await measureArgon2(browser, ARGON2_SCENARIOS))];
	for (const row of rows) {
		console.log(
			`${row.label.padEnd(40)} first ${fmt(row.times[0]).padStart(8)}  median ${fmt(median(row.times)).padStart(8)}  worst ${fmt(Math.max(...row.times)).padStart(8)}  frame gap ${fmt(row.gap)}`
		);
	}
	await browser.close();
}
