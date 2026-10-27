<script lang="ts">
	import { t } from '#lib/i18n/index.svelte.js';
	import CopyButton from '#lib/ui/CopyButton.svelte';
	import Notice from '#lib/ui/Notice.svelte';
	import { entropyBits, generatePassword, type PasswordOptions } from './password';

	let length = $state(20);
	let lowercase = $state(true);
	let uppercase = $state(true);
	let digits = $state(true);
	let symbols = $state(true);
	let avoidAmbiguous = $state(false);
	let password = $state('');

	const options = $derived<PasswordOptions>({
		length,
		lowercase,
		uppercase,
		digits,
		symbols,
		avoidAmbiguous
	});
	const bits = $derived(entropyBits(options));
	const strength = $derived(bits < 50 ? 'weak' : bits < 80 ? 'fair' : 'strong');

	function regenerate(): void {
		password = generatePassword(options) ?? '';
	}


	$effect(() => {
		void options;
		regenerate();
	});
</script>

<div class="stack">
	<div class="panel">
		<div class="panel-head">
			<span class="label">{t('password.result')}</span>
			<div class="row tight">
				<button type="button" class="btn small" onclick={regenerate}>{t('common.generate')}</button>
				<CopyButton value={password} />
			</div>
		</div>
		<output class="secret mono" aria-live="polite">{password === '' ? '—' : password}</output>
		<div class="meter" data-strength={strength}>
			<div class="meter-bar" style:width={`${Math.min(100, (bits / 128) * 100)}%`}></div>
		</div>
		<p class="muted small-text">
			{t('password.entropy', { bits })} · {t(`password.${strength}` as 'password.weak')}
		</p>
	</div>

	<div class="panel">
		<div class="field">
			<label for="password-length">{t('password.length', { n: length })}</label>
			<input id="password-length" class="range" type="range" min="8" max="128" bind:value={length} />
		</div>
		<div class="row">
			<label class="check"><input type="checkbox" bind:checked={lowercase} /><span>a–z</span></label>
			<label class="check"><input type="checkbox" bind:checked={uppercase} /><span>A–Z</span></label>
			<label class="check"><input type="checkbox" bind:checked={digits} /><span>0–9</span></label>
			<label class="check"><input type="checkbox" bind:checked={symbols} /><span>!@#</span></label>
			<label class="check">
				<input type="checkbox" bind:checked={avoidAmbiguous} />
				<span>{t('password.ambiguous')}</span>
			</label>
		</div>
	</div>
	{#if password === ''}
		<Notice tone="error">{t('password.errEmpty')}</Notice>
	{/if}
</div>
