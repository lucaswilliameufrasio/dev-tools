<script lang="ts">
	import { t } from '#lib/i18n/index.svelte.js';
	import CopyButton from '#lib/ui/CopyButton.svelte';
	import Notice from '#lib/ui/Notice.svelte';
	import OutputBox from '#lib/ui/OutputBox.svelte';
	import Segmented from '#lib/ui/Segmented.svelte';
	import { generatePlate, mercosulToOld, oldToMercosul, validatePlate, type PlateFormat } from './plate';

	type Mode = 'generate' | 'validate' | 'convert';
	type FormatChoice = PlateFormat | 'both';
	type Direction = 'to-mercosul' | 'to-old';

	let mode = $state<Mode>('generate');
	let formatChoice = $state<FormatChoice>('both');
	let count = $state(5);
	let hyphen = $state(true);
	let generated = $state<string[]>([]);
	let plateInput = $state('ABC-1234');
	let convertInput = $state('ABC-1234');
	let direction = $state<Direction>('to-mercosul');

	function regenerate(): void {
		const quantity = Math.min(50, Math.max(1, Math.floor(count) || 1));
		const list: string[] = [];
		for (let i = 0; i < quantity; i += 1) {
			if (formatChoice === 'old') {
				list.push(generatePlate('old', hyphen));
			} else if (formatChoice === 'mercosul') {
				list.push(generatePlate('mercosul', false));
			} else {
				list.push(generatePlate(i % 2 === 0 ? 'old' : 'mercosul', hyphen));
			}
		}
		generated = list;
	}

	$effect(() => {
		void formatChoice;
		void count;
		void hyphen;
		regenerate();
	});

	const output = $derived(generated.join('\n'));
	const validation = $derived(validatePlate(plateInput));
	const converted = $derived(direction === 'to-mercosul' ? oldToMercosul(convertInput) : mercosulToOld(convertInput));
	const convertError = $derived.by(() => {
		const check = validatePlate(convertInput);
		if (!check.valid) {
			return t('plate.invalid');
		}
		if (direction === 'to-old' && check.format === 'mercosul') {
			return t('plate.convertNoOld');
		}
		return t('plate.convertWrongFormat', {
			format: direction === 'to-mercosul' ? t('plate.format.old') : t('plate.format.mercosul')
		});
	});
</script>

<div class="stack">
	<div class="row">
		<Segmented
			name="plate-mode"
			legend={t('plate.mode')}
			bind:value={mode}
			options={[
				{ value: 'generate', label: t('plate.mode.generate') },
				{ value: 'validate', label: t('plate.mode.validate') },
				{ value: 'convert', label: t('plate.mode.convert') }
			]}
		/>
	</div>

	{#if mode === 'generate'}
		<div class="row">
			<Segmented
				name="plate-format"
				legend={t('plate.format')}
				bind:value={formatChoice}
				options={[
					{ value: 'both', label: t('plate.format.both') },
					{ value: 'old', label: t('plate.format.old') },
					{ value: 'mercosul', label: t('plate.format.mercosul') }
				]}
			/>
			<div class="field compact">
				<label for="plate-count">{t('plate.count')}</label>
				<input id="plate-count" class="input mono" type="number" min="1" max="50" bind:value={count} />
			</div>
			{#if formatChoice !== 'mercosul'}
				<label class="check">
					<input type="checkbox" bind:checked={hyphen} />
					<span>{t('plate.hyphen')}</span>
				</label>
			{/if}
			<button type="button" class="btn primary" onclick={regenerate}>{t('common.generate')}</button>
		</div>
		<OutputBox id="plate-output" label={t('plate.output')} value={output} rows={Math.min(14, Math.max(3, generated.length + 1))} />
		<p class="muted small-text">{t('plate.fictionalNote')}</p>
	{:else if mode === 'validate'}
		<div class="field">
			<label for="plate-input">{t('plate.input')}</label>
			<input id="plate-input" class="input mono" maxlength="8" spellcheck="false" autocomplete="off" bind:value={plateInput} />
		</div>
		{#if validation.valid}
			<Notice tone="info">
				{validation.format === 'old' ? t('plate.valid.old') : t('plate.valid.mercosul')}
				<span class="mono">{t('plate.display', { value: validation.display })}</span>
			</Notice>
		{:else if validation.reason === 'empty'}
			<p class="muted">{t('plate.empty')}</p>
		{:else}
			<Notice tone="error">{t('plate.invalid')}</Notice>
		{/if}
	{:else}
		<div class="row">
			<Segmented
				name="plate-direction"
				legend={t('plate.mode.convert')}
				bind:value={direction}
				options={[
					{ value: 'to-mercosul', label: t('plate.toMercosul') },
					{ value: 'to-old', label: t('plate.toOld') }
				]}
			/>
		</div>
		<div class="field">
			<label for="plate-convert-input">{t('plate.input')}</label>
			<input id="plate-convert-input" class="input mono" maxlength="8" spellcheck="false" autocomplete="off" bind:value={convertInput} />
			<p class="muted small-text">{t('plate.convertHint')}</p>
		</div>
		{#if converted.ok}
			<ul class="results">
				<li>
					<span class="results-label">{t('plate.result')}</span>
					<span class="results-value mono">{converted.plate}</span>
					<CopyButton value={converted.plate} />
				</li>
			</ul>
		{:else if converted.reason === 'empty'}
			<p class="muted">{t('plate.empty')}</p>
		{:else}
			<Notice tone="error">{convertError}</Notice>
		{/if}
	{/if}
</div>
