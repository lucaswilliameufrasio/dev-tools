<script lang="ts">
	import { t, type MessageKey } from '#lib/i18n/index.svelte.js';
	import Notice from '#lib/ui/Notice.svelte';
	import OutputBox from '#lib/ui/OutputBox.svelte';
	import {
		convert,
		DATA_FORMATS,
		type ConvertOptions,
		type DataFormat,
		type DelimiterChoice
	} from './dataformat';

	const EXAMPLE = `{
  "name": "dev-tools",
  "private": true,
  "tags": ["json", "yaml", "toml"],
  "author": { "name": "Ana", "active": true }
}`;

	const DELIMITER_LABELS: { value: DelimiterChoice; key: MessageKey }[] = [
		{ value: 'auto', key: 'dataformat.delimAuto' },
		{ value: ',', key: 'dataformat.delimComma' },
		{ value: ';', key: 'dataformat.delimSemicolon' },
		{ value: '\t', key: 'dataformat.delimTab' },
		{ value: '|', key: 'dataformat.delimPipe' }
	];

	let from = $state<DataFormat>('json');
	let to = $state<DataFormat>('yaml');
	let indent = $state<'2' | '4'>('2');
	let delimiter = $state<DelimiterChoice>('auto');
	let header = $state(true);
	let inferTypes = $state(false);
	let crlf = $state(false);
	let input = $state(EXAMPLE);

	function isFormat(value: string): value is DataFormat {
		return DATA_FORMATS.some((format) => format === value);
	}
	function isDelimiter(value: string): value is DelimiterChoice {
		return DELIMITER_LABELS.some((entry) => entry.value === value);
	}

	const options = $derived<ConvertOptions>({
		indent: indent === '4' ? 4 : 2,
		delimiter,
		header,
		inferTypes,
		eol: crlf ? 'crlf' : 'lf'
	});
	const result = $derived(convert(from, to, input, options));
	const output = $derived(result.ok ? result.output : '');
	const usesCsv = $derived(from === 'csv' || to === 'csv');
	const usesIndent = $derived(to === 'json' || to === 'yaml');

	function errorText(failure: Exclude<typeof result, { ok: true }>): string {
		switch (failure.kind) {
			case 'toml-root':
				return t('dataformat.errTomlRoot');
			case 'csv-shape':
				return t('dataformat.errCsvShape');
			case 'unsupported':
				return t('dataformat.errUnsupported', { message: failure.message });
			case 'parse': {
				const base = t('dataformat.errParse', { message: failure.message });
				if (failure.line !== undefined && failure.column !== undefined) {
					return `${base} ${t('dataformat.errAt', { line: failure.line, column: failure.column })}`;
				}
				return base;
			}
			case 'empty':
				return t('dataformat.empty');
		}
	}
</script>

<div class="stack">
	<div class="panel">
		<div class="fields">
			<div class="field">
				<label for="dataformat-from">{t('dataformat.from')}</label>
				<select
					id="dataformat-from"
					class="input"
					value={from}
					onchange={(event) => {
						if (isFormat(event.currentTarget.value)) {
							from = event.currentTarget.value;
						}
					}}
				>
					{#each DATA_FORMATS as format (format)}
						<option value={format}>{format.toUpperCase()}</option>
					{/each}
				</select>
			</div>
			<div class="field">
				<label for="dataformat-to">{t('dataformat.to')}</label>
				<select
					id="dataformat-to"
					class="input"
					value={to}
					onchange={(event) => {
						if (isFormat(event.currentTarget.value)) {
							to = event.currentTarget.value;
						}
					}}
				>
					{#each DATA_FORMATS as format (format)}
						<option value={format}>{format.toUpperCase()}</option>
					{/each}
				</select>
			</div>
			{#if usesIndent}
				<div class="field">
					<label for="dataformat-indent">{t('dataformat.indent')}</label>
					<select id="dataformat-indent" class="input" bind:value={indent}>
						<option value="2">2</option>
						<option value="4">4</option>
					</select>
				</div>
			{/if}
			{#if usesCsv}
				<div class="field">
					<label for="dataformat-delimiter">{t('dataformat.delimiter')}</label>
					<select
						id="dataformat-delimiter"
						class="input"
						value={delimiter}
						onchange={(event) => {
							if (isDelimiter(event.currentTarget.value)) {
								delimiter = event.currentTarget.value;
							}
						}}
					>
						{#each DELIMITER_LABELS as entry (entry.value)}
							<option value={entry.value}>{t(entry.key)}</option>
						{/each}
					</select>
				</div>
			{/if}
		</div>
		{#if usesCsv}
			<div class="row">
				<label class="check">
					<input type="checkbox" bind:checked={header} />
					<span>{t('dataformat.header')}</span>
				</label>
				{#if from === 'csv'}
					<label class="check">
						<input type="checkbox" bind:checked={inferTypes} />
						<span>{t('dataformat.infer')}</span>
					</label>
				{/if}
				{#if to === 'csv'}
					<label class="check">
						<input type="checkbox" bind:checked={crlf} />
						<span>{t('dataformat.crlf')}</span>
					</label>
				{/if}
			</div>
		{/if}
		{#if from === to}
			<p class="muted small-text">{t('dataformat.formatOnly')}</p>
		{/if}
	</div>

	<div class="io">
		<div class="panel">
			<div class="panel-head">
				<label for="dataformat-input">{t('common.input')}</label>
				<button type="button" class="btn small" onclick={() => (input = '')}>
					{t('common.clear')}
				</button>
			</div>
			<textarea
				id="dataformat-input"
				class="area mono"
				rows="14"
				bind:value={input}
				spellcheck="false"
			></textarea>
		</div>
		<OutputBox id="dataformat-output" label={t('common.output')} value={output} rows={14} />
	</div>

	{#if !result.ok && result.kind !== 'empty'}
		<Notice tone="error">{errorText(result)}</Notice>
	{:else if !result.ok}
		<Notice tone="info">{errorText(result)}</Notice>
	{/if}
</div>
