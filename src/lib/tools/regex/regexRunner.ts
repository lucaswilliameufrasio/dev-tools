import type { RegexRequest, RegexResponse } from './regex';

export type RunnerResponse = RegexResponse | { ok: false; reason: 'timeout' };

const TIMEOUT_MS = 1500;

/**
 * Runs the expression in a worker so a pattern with catastrophic
 * backtracking can be stopped instead of freezing the tab.
 */
export function runRegexSafely(request: RegexRequest): Promise<RunnerResponse> {
	return new Promise((resolve) => {
		const worker = new Worker(new URL('./regex.worker.ts', import.meta.url), { type: 'module' });
		const timer = setTimeout(() => {
			worker.terminate();
			resolve({ ok: false, reason: 'timeout' });
		}, TIMEOUT_MS);
		worker.onmessage = (event: MessageEvent<RegexResponse>) => {
			clearTimeout(timer);
			worker.terminate();
			resolve(event.data);
		};
		worker.onerror = () => {
			clearTimeout(timer);
			worker.terminate();
			resolve({ ok: false, reason: 'invalid', message: 'worker error' });
		};
		worker.postMessage(request);
	});
}
