import type { BcryptRequest, BcryptResponse } from './bcrypt';

export type BcryptJob = {
	result: Promise<BcryptResponse | { ok: false; reason: 'cancelled' }>;
	cancel: () => void;
};

/** Starts the computation in a module worker; cancel() terminates it. */
export function startBcrypt(request: BcryptRequest): BcryptJob {
	const worker = new Worker(new URL('./bcrypt.worker.ts', import.meta.url), { type: 'module' });
	let finish: (value: Awaited<BcryptJob['result']>) => void = () => {};
	const result = new Promise<Awaited<BcryptJob['result']>>((resolve) => {
		finish = resolve;
	});
	worker.onmessage = (event: MessageEvent<BcryptResponse>) => {
		worker.terminate();
		finish(event.data);
	};
	worker.onerror = () => {
		worker.terminate();
		finish({ ok: false, reason: 'failed' });
	};
	worker.postMessage(request);
	return {
		result,
		cancel: () => {
			worker.terminate();
			finish({ ok: false, reason: 'cancelled' });
		}
	};
}
