<script lang="ts">
	import { t } from '#lib/i18n/index.svelte.js';
	import Notice from '#lib/ui/Notice.svelte';
	import OutputBox from '#lib/ui/OutputBox.svelte';
	import {
		generateTestSecret,
		JWT_ALGORITHMS,
		setHeaderAlgorithm,
		signJwt,
		withTimestamps,
		type JwtAlgorithm,
		type SignResult
	} from './jwtCrypto';
	import { KEY_ERROR_MESSAGES, SIGN_ERROR_MESSAGES } from './keyErrors';

	let header = $state('{\n  "alg": "HS256",\n  "typ": "JWT"\n}');
	let payload = $state('{\n  "sub": "1234567890",\n  "name": "John Doe"\n}');
	let algorithm = $state<JwtAlgorithm>('HS256');
	// Sample secret for the public example; replace it with your own.
	let key = $state('your-256-bit-secret');
	let secretIsBase64 = $state(false);
	let generated = $state(false);
	let result = $state<SignResult | undefined>(undefined);
	let sequence = 0;

	const isHmac = $derived(algorithm.startsWith('HS'));

	$effect(() => {
		sequence += 1;
		const current = sequence;
		signJwt(header, payload, algorithm, key, { secretIsBase64 }).then((signed) => {
			if (current === sequence) {
				result = signed;
			}
		});
	});

	function changeAlgorithm(): void {
		header = setHeaderAlgorithm(header, algorithm);
	}

	function fillSecret(): void {
		key = generateTestSecret();
		secretIsBase64 = false;
		generated = true;
		algorithm = 'HS256';
		changeAlgorithm();
	}

	function setTimes(): void {
		payload = withTimestamps(payload, Math.floor(Date.now() / 1000));
	}
</script>

<div class="stack">
	<Notice tone="info">{t('jwtx.signNotice')}</Notice>

	<div class="row">
		<div class="field compact">
			<label for="jwts-alg">{t('jwtx.algSign')}</label>
			<select id="jwts-alg" class="input mono" bind:value={algorithm} onchange={changeAlgorithm}>
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

	<div class="io">
		<div class="panel">
			<div class="panel-head"><label for="jwts-header">{t('jwtx.header')}</label></div>
			<textarea id="jwts-header" class="area mono" rows="7" bind:value={header} spellcheck="false"></textarea>
		</div>
		<div class="panel">
			<div class="panel-head">
				<label for="jwts-payload">{t('jwtx.payload')}</label>
				<button type="button" class="btn small" onclick={setTimes}>{t('jwtx.setTimes')}</button>
			</div>
			<textarea id="jwts-payload" class="area mono" rows="7" bind:value={payload} spellcheck="false"></textarea>
		</div>
	</div>

	<div class="panel">
		<div class="panel-head">
			<label for="jwts-key">{isHmac ? t('jwtx.secret') : t('jwtx.key')}</label>
			{#if isHmac}
				<button type="button" class="btn small" onclick={fillSecret}>{t('jwtx.generateSecret')}</button>
			{/if}
		</div>
		<textarea id="jwts-key" class="area mono" rows="6" bind:value={key} spellcheck="false" aria-describedby="jwts-key-hint"
		></textarea>
		<p id="jwts-key-hint" class="muted small-text">{t('jwtx.keySignHint')}</p>
		{#if generated && isHmac}
			<p class="muted small-text">{t('jwtx.generatedNote')}</p>
		{/if}
	</div>

	{#if result === undefined}
		<p class="muted">{t('jwtx.signEmpty')}</p>
	{:else if result.ok}
		<OutputBox id="jwts-output" label={t('jwtx.signedToken')} value={result.token} rows={5} />
	{:else if result.reason === 'bad-key' && result.keyReason !== undefined}
		<Notice tone="error">{t(KEY_ERROR_MESSAGES[result.keyReason])}</Notice>
	{:else if result.reason !== 'bad-key'}
		<Notice tone="error">{t(SIGN_ERROR_MESSAGES[result.reason])}</Notice>
	{/if}
</div>
