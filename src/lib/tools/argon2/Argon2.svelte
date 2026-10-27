<script lang="ts">
	import { onDestroy } from 'svelte';
	import { t, type MessageKey } from '#lib/i18n/index.svelte.js';
	import Notice from '#lib/ui/Notice.svelte';
	import OutputBox from '#lib/ui/OutputBox.svelte';
	import Segmented from '#lib/ui/Segmented.svelte';
	import {
		ARGON2_DEFAULTS,
		ARGON2_HEAVY_MEMORY,
		ARGON2_LIMITS,
		generateSalt,
		type Argon2Failure,
		type Argon2Request,
		type Argon2Variant
	} from './argon2';
	import { startArgon2, type Argon2Job } from './argon2Runner';

	type Mode = 'hash' | 'verify';
	type Status =
		| { kind: 'idle' }
		| { kind: 'running' }
		| { kind: 'cancelled' }
		| { kind: 'hashed'; encoded: string; hex: string; elapsedMs: number }
		| { kind: 'verified'; matches: boolean; elapsedMs: number }
		| { kind: 'error'; reason: Argon2Failure };

	const errorKeys: Record<Argon2Failure, MessageKey> = {
		'empty-password': 'argon2.errEmptyPassword',
		'invalid-memory': 'argon2.errMemory',
		'invalid-memory-for-parallelism': 'argon2.errMemoryParallelism',
		'invalid-iterations': 'argon2.errIterations',
		'invalid-parallelism': 'argon2.errParallelism',
		'invalid-hash-length': 'argon2.errHashLength',
		'invalid-salt': 'argon2.errFailed',
		'invalid-hash': 'argon2.errHash',
		failed: 'argon2.errFailed'
	};

	let mode = $state<Mode>('hash');
	let password = $state('');
	let variant = $state<Argon2Variant>(ARGON2_DEFAULTS.variant);
	let memory = $state(ARGON2_DEFAULTS.memory);
	let iterations = $state(ARGON2_DEFAULTS.iterations);
	let parallelism = $state(ARGON2_DEFAULTS.parallelism);
	let hashLength = $state(ARGON2_DEFAULTS.hashLength);
	let hashInput = $state('');
	let status = $state<Status>({ kind: 'idle' });
	let job: Argon2Job | undefined;

	const busy = $derived(status.kind === 'running');
	const heavy = $derived(mode === 'hash' && memory > ARGON2_HEAVY_MEMORY);

	function cancel(): void {
		job?.cancel();
	}

	async function run(): Promise<void> {
		const request: Argon2Request =
			mode === 'hash'
				? {
						kind: 'hash',
						password,
						salt: generateSalt(),
						variant,
						memory,
						iterations,
						parallelism,
						hashLength
					}
				: { kind: 'verify', password, hash: hashInput };
		status = { kind: 'running' };
		const current = startArgon2(request);
		job = current;
		const response = await current.result;
		if (job !== current) {
			return;
		}
		job = undefined;
		if (!response.ok) {
			status =
				response.reason === 'cancelled'
					? { kind: 'cancelled' }
					: { kind: 'error', reason: response.reason };
		} else if (response.kind === 'hash') {
			status = {
				kind: 'hashed',
				encoded: response.encoded,
				hex: response.hex,
				elapsedMs: response.elapsedMs
			};
		} else {
			status = { kind: 'verified', matches: response.matches, elapsedMs: response.elapsedMs };
		}
	}

	$effect(() => {
		// Switching mode drops a stale result and any running job.
		void mode;
		job?.cancel();
		job = undefined;
		status = { kind: 'idle' };
	});

	onDestroy(() => {
		job?.cancel();
	});
</script>

<div class="stack">
	<Segmented
		name="argon2-mode"
		legend={t('common.mode')}
		bind:value={mode}
		options={[
			{ value: 'hash', label: t('argon2.modeHash') },
			{ value: 'verify', label: t('argon2.modeVerify') }
		]}
	/>

	<form
		class="panel stack"
		onsubmit={(event) => {
			event.preventDefault();
			void run();
		}}
	>
		<div class="field">
			<label for="argon2-password">{t('argon2.password')}</label>
			<input
				id="argon2-password"
				class="input mono"
				type="password"
				bind:value={password}
				autocomplete="off"
				spellcheck="false"
				disabled={busy}
			/>
		</div>

		{#if mode === 'hash'}
			<Segmented
				name="argon2-variant"
				legend={t('argon2.variant')}
				bind:value={variant}
				options={[
					{ value: 'argon2id', label: 'Argon2id' },
					{ value: 'argon2i', label: 'Argon2i' },
					{ value: 'argon2d', label: 'Argon2d' }
				]}
			/>
			<div class="fields">
				<div class="field compact">
					<label for="argon2-memory">{t('argon2.memory')}</label>
					<input
						id="argon2-memory"
						class="input mono"
						type="number"
						min={ARGON2_LIMITS.memory.min}
						max={ARGON2_LIMITS.memory.max}
						step="1"
						bind:value={memory}
						disabled={busy}
					/>
				</div>
				<div class="field compact">
					<label for="argon2-iterations">{t('argon2.iterations')}</label>
					<input
						id="argon2-iterations"
						class="input mono"
						type="number"
						min={ARGON2_LIMITS.iterations.min}
						max={ARGON2_LIMITS.iterations.max}
						step="1"
						bind:value={iterations}
						disabled={busy}
					/>
				</div>
				<div class="field compact">
					<label for="argon2-parallelism">{t('argon2.parallelism')}</label>
					<input
						id="argon2-parallelism"
						class="input mono"
						type="number"
						min={ARGON2_LIMITS.parallelism.min}
						max={ARGON2_LIMITS.parallelism.max}
						step="1"
						bind:value={parallelism}
						disabled={busy}
					/>
				</div>
				<div class="field compact">
					<label for="argon2-length">{t('argon2.hashLength')}</label>
					<input
						id="argon2-length"
						class="input mono"
						type="number"
						min={ARGON2_LIMITS.hashLength.min}
						max={ARGON2_LIMITS.hashLength.max}
						step="1"
						bind:value={hashLength}
						disabled={busy}
					/>
				</div>
			</div>
			{#if heavy}
				<Notice tone="info">{t('argon2.warnHeavy')}</Notice>
			{/if}
		{:else}
			<div class="field">
				<label for="argon2-hash">{t('argon2.hashInput')}</label>
				<input
					id="argon2-hash"
					class="input mono"
					type="text"
					bind:value={hashInput}
					autocomplete="off"
					spellcheck="false"
					placeholder="$argon2id$v=19$m=19456,t=2,p=1$…"
					disabled={busy}
				/>
			</div>
		{/if}

		<div class="row">
			<button type="submit" class="btn primary" disabled={busy}>
				{mode === 'hash' ? t('argon2.run') : t('argon2.verifyRun')}
			</button>
			{#if busy}
				<button type="button" class="btn" onclick={cancel}>{t('argon2.cancel')}</button>
			{/if}
		</div>
	</form>

	<div aria-live="polite" class="stack">
		{#if status.kind === 'running'}
			<Notice tone="info">{t('argon2.running')}</Notice>
		{:else if status.kind === 'cancelled'}
			<Notice tone="info">{t('argon2.cancelled')}</Notice>
		{:else if status.kind === 'error'}
			<Notice tone="error">{t(errorKeys[status.reason])}</Notice>
		{:else if status.kind === 'hashed'}
			<OutputBox
				id="argon2-encoded"
				label={t('argon2.encodedOutput')}
				value={status.encoded}
				rows={3}
			/>
			<OutputBox id="argon2-hex" label={t('argon2.hexOutput')} value={status.hex} rows={2} />
			<p class="muted small-text">{t('argon2.elapsed', { ms: Math.round(status.elapsedMs) })}</p>
		{:else if status.kind === 'verified'}
			{#if status.matches}
				<p class="pill">{t('argon2.match')}</p>
			{:else}
				<p class="pill bad">{t('argon2.noMatch')}</p>
			{/if}
			<p class="muted small-text">{t('argon2.elapsed', { ms: Math.round(status.elapsedMs) })}</p>
		{/if}
	</div>

	<Notice tone="info">{t('argon2.privacy')} {t('argon2.owasp')}</Notice>
</div>
