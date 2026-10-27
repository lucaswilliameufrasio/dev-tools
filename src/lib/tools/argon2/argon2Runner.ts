import type { Argon2Request, Argon2Response } from './argon2';

export type Argon2Job = {
	result: Promise<Argon2Response | { ok: false; reason: 'cancelled' }>;
	cancel: () => void;
};

/** Starts the computation in a module worker; cancel() terminates it. */
export function startArgon2(request: Argon2Request): Argon2Job {
	const worker = new Worker(new URL('./argon2.worker.ts', import.meta.url), { type: 'module' });
	let finish: (value: Awaited<Argon2Job['result']>) => void = () => {};
	const result = new Promise<Awaited<Argon2Job['result']>>((resolve) => {
		finish = resolve;
	});
	worker.onmessage = (event: MessageEvent<Argon2Response>) => {
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
