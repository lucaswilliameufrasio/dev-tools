<script lang="ts">
	import { t } from '#lib/i18n/index.svelte.js';
	import Notice from '#lib/ui/Notice.svelte';
	import { decodeJwt } from './jwt';
	import { generateTestSecret, isJwtAlgorithm, JWT_ALGORITHMS, verifyJwt, type JwtAlgorithm, type VerifyOutcome } from './jwtCrypto';
	import { KEY_ERROR_MESSAGES } from './keyErrors';

	type Props = { token: string };

	let { token }: Props = $props();

	// Secret of the public sample token from the JWT spec examples.
	let key = $state('your-256-bit-secret');
	let algorithm = $state<JwtAlgorithm>('HS256');
	let secretIsBase64 = $state(false);
	let generated = $state(false);
	let outcome = $state<VerifyOutcome | undefined>(undefined);
	let sequence = 0;

	const tokenAlg = $derived.by(() => {
		const decoded = decodeJwt(token);
		if (!decoded.ok) {
			return undefined;
		}
		const header = decoded.token.header;
		if (typeof header === 'object' && header !== null && 'alg' in header && typeof header.alg === 'string') {
			return header.alg;
		}
		return undefined;
	});

	const isHmac = $derived(algorithm.startsWith('HS'));

	// Default to the token's alg whenever the token changes; the user can still override it.
	$effect(() => {
		if (isJwtAlgorithm(tokenAlg)) {
			algorithm = tokenAlg;
		}
	});

	$effect(() => {
		sequence += 1;
		const current = sequence;
		if (token.trim() === '') {
			outcome = undefined;
			return;
		}
		verifyJwt(token, algorithm, key, { secretIsBase64 }).then((result) => {
			if (current === sequence) {
				outcome = result;
			}
		});
	});

	function fillSecret(): void {
		key = generateTestSecret();
		secretIsBase64 = false;
		generated = true;
		algorithm = 'HS256';
	}

	const tone = $derived(outcome?.status === 'valid' ? 'ok' : 'bad');
</script>

<div class="stack">
	<Notice tone="info">{t('jwtx.algNever')}</Notice>

	<div class="row">
		<div class="field compact">
			<label for="jwtv-alg">{t('jwtx.alg')}</label>
			<select id="jwtv-alg" class="input mono" bind:value={algorithm}>
				{#each JWT_ALGORITHMS as option (option)}
					<option value={option}>{option}</option>
				{/each}
			</select>
		</div>
		{#if isHmac}
			<label class="check">
				<input type="checkbox" bind:checked={secretIsBase64} />
				<span>{t('jwtx.secretBase64')}</span>
			</label>
		{/if}
	</div>

	{#if tokenAlg !== undefined && tokenAlg !== algorithm}
		<Notice tone="error">
			{t('jwtx.algDiffers', { tokenAlg, chosen: algorithm })}
			{#if isJwtAlgorithm(tokenAlg)}
				<button type="button" class="btn small" onclick={() => (algorithm = tokenAlg)}>
					{t('jwtx.useTokenAlg', { alg: tokenAlg })}
				</button>
			{/if}
		</Notice>
	{/if}

	<div class="panel">
		<div class="panel-head">
			<label for="jwtv-key">{isHmac ? t('jwtx.secret') : t('jwtx.key')}</label>
			{#if isHmac}
				<button type="button" class="btn small" onclick={fillSecret}>{t('jwtx.generateSecret')}</button>
			{/if}
		</div>
		<textarea id="jwtv-key" class="area mono" rows="6" bind:value={key} spellcheck="false" aria-describedby="jwtv-key-hint"
		></textarea>
		<p id="jwtv-key-hint" class="muted small-text">{t('jwtx.keyVerifyHint')}</p>
		{#if generated && isHmac}
			<p class="muted small-text">{t('jwtx.generatedNote')}</p>
		{/if}
	</div>

	{#if outcome === undefined}
		<p class="muted">{t('jwtx.verify.empty')}</p>
	{:else}
		<div class="panel" aria-live="polite">
			<div class="panel-head">
				{#if outcome.status === 'valid'}
					<span class="pill">{t('jwtx.verify.valid')}</span>
				{:else if outcome.status === 'invalid-signature'}
					<span class="pill bad">{t('jwtx.verify.invalid')}</span>
				{:else if outcome.status === 'bad-key'}
					<span class="pill bad">{t('jwtx.verify.badKey')}</span>
				{:else if outcome.status === 'alg-mismatch'}
					<span class="pill bad">{t('jwtx.verify.mismatch')}</span>
				{:else if outcome.status === 'alg-none'}
					<span class="pill bad">{t('jwtx.verify.none')}</span>
				{:else}
					<span class="pill bad">{t('jwtx.verify.malformed')}</span>
				{/if}
			</div>
			<p class={tone === 'ok' ? '' : 'muted'}>
				{#if outcome.status === 'valid'}
					{t('jwtx.verify.validHelp')}
				{:else if outcome.status === 'invalid-signature'}
					{t('jwtx.verify.invalidHelp')}
				{:else if outcome.status === 'bad-key' && outcome.keyReason !== undefined}
					{t(KEY_ERROR_MESSAGES[outcome.keyReason])}
				{:else if outcome.status === 'alg-mismatch'}
					{t('jwtx.verify.mismatchHelp', { tokenAlg: outcome.headerAlg ?? '—', chosen: algorithm })}
				{:else if outcome.status === 'alg-none'}
					{t('jwtx.verify.noneHelp')}
				{:else}
					{t('jwtx.verify.malformedHelp')}
				{/if}
			</p>
			{#if outcome.status !== 'malformed'}
				<p class="small-text">
					<span class="pill" class:bad={outcome.time === 'expired' || outcome.time === 'not-yet'}>
						{#if outcome.time === 'expired'}
							{t('jwtx.time.expired')}
						{:else if outcome.time === 'not-yet'}
							{t('jwtx.time.notYet')}
						{:else if outcome.time === 'ok'}
							{t('jwtx.time.ok')}
						{:else}
							{t('jwtx.time.none')}
						{/if}
					</span>
				</p>
			{/if}
		</div>
	{/if}
</div>
