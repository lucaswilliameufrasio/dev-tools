<script lang="ts">
	import { onDestroy } from 'svelte';
	import { t, type MessageKey } from '#lib/i18n/index.svelte.js';
	import Notice from '#lib/ui/Notice.svelte';
	import OutputBox from '#lib/ui/OutputBox.svelte';
	import Segmented from '#lib/ui/Segmented.svelte';
	import {
		BCRYPT_DEFAULT_COST,
		BCRYPT_MAX_COST,
		BCRYPT_MIN_COST,
		exceedsBcryptLimit,
		generateSalt,
		isSlowCost,
		passwordByteLength,
		type BcryptFailure,
		type BcryptRequest
	} from './bcrypt';
	import { startBcrypt, type BcryptJob } from './bcryptRunner';

	type Mode = 'hash' | 'verify';
	type Status =
		| { kind: 'idle' }
		| { kind: 'running' }
		| { kind: 'cancelled' }
		| { kind: 'hashed'; hash: string; elapsedMs: number }
		| { kind: 'verified'; matches: boolean; elapsedMs: number }
		| { kind: 'error'; reason: BcryptFailure };

	const errorKeys: Record<BcryptFailure, MessageKey> = {
		'empty-password': 'bcrypt.errEmptyPassword',
		'invalid-cost': 'bcrypt.errCost',
		'invalid-hash': 'bcrypt.errHash',
		'invalid-salt': 'bcrypt.errFailed',
		failed: 'bcrypt.errFailed'
	};

	let mode = $state<Mode>('hash');
	let password = $state('');
	let cost = $state(BCRYPT_DEFAULT_COST);
	let hashInput = $state('');
	let status = $state<Status>({ kind: 'idle' });
	let job: BcryptJob | undefined;

	const busy = $derived(status.kind === 'running');
	const tooLong = $derived(exceedsBcryptLimit(password));
	const slow = $derived(mode === 'hash' && isSlowCost(cost));

	function cancel(): void {
		job?.cancel();
	}

	async function run(): Promise<void> {
		const request: BcryptRequest =
			mode === 'hash'
				? { kind: 'hash', password, cost, salt: generateSalt() }
				: { kind: 'verify', password, hash: hashInput };
		status = { kind: 'running' };
		const current = startBcrypt(request);
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
			status = { kind: 'hashed', hash: response.hash, elapsedMs: response.elapsedMs };
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
		name="bcrypt-mode"
		legend={t('common.mode')}
		bind:value={mode}
		options={[
			{ value: 'hash', label: t('bcrypt.modeHash') },
			{ value: 'verify', label: t('bcrypt.modeVerify') }
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
			<label for="bcrypt-password">{t('bcrypt.password')}</label>
			<input
				id="bcrypt-password"
				class="input mono"
				type="password"
				bind:value={password}
				autocomplete="off"
				spellcheck="false"
				disabled={busy}
			/>
		</div>

		{#if mode === 'hash'}
			<div class="field compact">
				<label for="bcrypt-cost">{t('bcrypt.cost')}</label>
				<input
					id="bcrypt-cost"
					class="input mono"
					type="number"
					min={BCRYPT_MIN_COST}
					max={BCRYPT_MAX_COST}
					step="1"
					bind:value={cost}
					disabled={busy}
					aria-describedby="bcrypt-cost-hint"
				/>
				<span id="bcrypt-cost-hint" class="muted small-text">{t('bcrypt.costHint')}</span>
			</div>
		{:else}
			<div class="field">
				<label for="bcrypt-hash">{t('bcrypt.hashInput')}</label>
				<input
					id="bcrypt-hash"
					class="input mono"
					type="text"
					bind:value={hashInput}
					autocomplete="off"
					spellcheck="false"
					placeholder="$2b$10$…"
					disabled={busy}
				/>
			</div>
		{/if}

		{#if tooLong}
			<Notice tone="info">{t('bcrypt.warnLong', { bytes: passwordByteLength(password) })}</Notice>
		{/if}
		{#if slow}
			<Notice tone="info">{t('bcrypt.warnSlow', { cost })}</Notice>
		{/if}

		<div class="row">
			<button type="submit" class="btn primary" disabled={busy}>
				{mode === 'hash' ? t('bcrypt.run') : t('bcrypt.verifyRun')}
			</button>
			{#if busy}
				<button type="button" class="btn" onclick={cancel}>{t('bcrypt.cancel')}</button>
			{/if}
		</div>
	</form>

	<div aria-live="polite" class="stack">
		{#if status.kind === 'running'}
			<Notice tone="info">{t('bcrypt.running')}</Notice>
		{:else if status.kind === 'cancelled'}
			<Notice tone="info">{t('bcrypt.cancelled')}</Notice>
		{:else if status.kind === 'error'}
			<Notice tone="error">{t(errorKeys[status.reason])}</Notice>
		{:else if status.kind === 'hashed'}
			<OutputBox id="bcrypt-output" label={t('bcrypt.hashOutput')} value={status.hash} rows={2} />
			<p class="muted small-text">{t('bcrypt.elapsed', { ms: Math.round(status.elapsedMs) })}</p>
		{:else if status.kind === 'verified'}
			{#if status.matches}
				<p class="pill">{t('bcrypt.match')}</p>
			{:else}
				<p class="pill bad">{t('bcrypt.noMatch')}</p>
			{/if}
			<p class="muted small-text">{t('bcrypt.elapsed', { ms: Math.round(status.elapsedMs) })}</p>
		{/if}
	</div>

	<Notice tone="info">{t('bcrypt.privacy')} {t('bcrypt.owasp')}</Notice>
</div>
