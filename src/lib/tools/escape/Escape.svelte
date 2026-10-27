<script lang="ts">
	import { t, type MessageKey } from '#lib/i18n/index.svelte.js';
	import Notice from '#lib/ui/Notice.svelte';
	import OutputBox from '#lib/ui/OutputBox.svelte';
	import Segmented from '#lib/ui/Segmented.svelte';
	import {
		ESCAPE_FORMATS,
		runEscape,
		type EscapeFormat,
		type EscapeMode,
		type QuoteStyle
	} from './escape';

	const FORMAT_LABELS: Record<EscapeFormat, MessageKey> = {
		html: 'escape.fmtHtml',
		json: 'escape.fmtJson',
		js: 'escape.fmtJs',
		unicode: 'escape.fmtUnicode',
		xml: 'escape.fmtXml',
		csv: 'escape.fmtCsv'
	};

	let mode = $state<EscapeMode>('escape');
	let format = $state<EscapeFormat>('html');
	let nonAscii = $state(false);
	let allCharacters = $state(false);
	let quote = $state<QuoteStyle>('single');
	let input = $state(`<a href="/olá?x=1&y=2">Tom & "Jerry" 😀</a>`);

	function isFormat(value: string): value is EscapeFormat {
		return ESCAPE_FORMATS.some((entry) => entry === value);
	}

	const result = $derived(
		input === '' ? undefined : runEscape(format, mode, input, { nonAscii, quote, allCharacters })
	);
	const output = $derived(result?.ok ? result.output : '');
</script>

<div class="stack">
	<div class="panel">
		<div class="fields">
			<Segmented
				name="escape-mode"
				legend={t('common.mode')}
				options={[
					{ value: 'escape', label: t('escape.modeEscape') },
					{ value: 'unescape', label: t('escape.modeUnescape') }
				]}
				bind:value={mode}
			/>
			<div class="field">
				<label for="escape-format">{t('escape.format')}</label>
				<select
					id="escape-format"
					class="input"
					value={format}
					onchange={(event) => {
						if (isFormat(event.currentTarget.value)) {
							format = event.currentTarget.value;
						}
					}}
				>
					{#each ESCAPE_FORMATS as entry (entry)}
						<option value={entry}>{t(FORMAT_LABELS[entry])}</option>
					{/each}
				</select>
			</div>
			{#if mode === 'escape' && format === 'js'}
				<div class="field">
					<label for="escape-quote">{t('escape.quote')}</label>
					<select id="escape-quote" class="input" bind:value={quote}>
						<option value="single">{t('escape.quoteSingle')}</option>
						<option value="double">{t('escape.quoteDouble')}</option>
					</select>
				</div>
			{/if}
		</div>
		{#if mode === 'escape' && format === 'html'}
			<label class="check">
				<input type="checkbox" bind:checked={nonAscii} />
				<span>{t('escape.nonAscii')}</span>
			</label>
		{/if}
		{#if mode === 'escape' && format === 'unicode'}
			<label class="check">
				<input type="checkbox" bind:checked={allCharacters} />
				<span>{t('escape.allChars')}</span>
			</label>
		{/if}
	</div>

	<div class="io">
		<div class="panel">
			<div class="panel-head">
				<label for="escape-input">{t('common.input')}</label>
				<button type="button" class="btn small" onclick={() => (input = '')}>
					{t('common.clear')}
				</button>
			</div>
			<textarea id="escape-input" class="area mono" rows="10" bind:value={input} spellcheck="false"
			></textarea>
		</div>
		<OutputBox id="escape-output" label={t('common.output')} value={output} rows={10} />
	</div>

	{#if result && !result.ok}
		<Notice tone="error">{t('escape.err', { message: result.message })}</Notice>
	{:else if input === ''}
		<Notice tone="info">{t('escape.empty')}</Notice>
	{/if}
</div>
