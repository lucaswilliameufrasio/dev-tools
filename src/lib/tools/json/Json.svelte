<script lang="ts">
	import { formatBytes } from '#lib/download.js';
	import { t } from '#lib/i18n/index.svelte.js';
	import Notice from '#lib/ui/Notice.svelte';
	import OutputBox from '#lib/ui/OutputBox.svelte';
	import Segmented from '#lib/ui/Segmented.svelte';
	import { formatJson, minifyJson } from './json';

	type Action = 'format' | 'minify';
	type Indent = '2' | '4' | 'tab';

	let action = $state<Action>('format');
	let indent = $state<Indent>('2');
	let sortKeys = $state(false);
	let input = $state(
		'{"nome":"Ana","ativo":true,"tags":["dev","web"],"endereco":{"cidade":"Recife","uf":"PE"},"saldo":1520.75}'
	);

	const result = $derived.by(() => {
		if (input.trim() === '') {
			return undefined;
		}
		if (action === 'minify') {
			return minifyJson(input);
		}
		return formatJson(input, { indent: indent === 'tab' ? 'tab' : Number(indent), sortKeys });
	});
	const output = $derived(result?.ok ? result.output : '');
	const size = $derived(new TextEncoder().encode(output).length);
</script>

<div class="stack">
	<div class="row">
		<Segmented
			name="json-action"
			legend={t('common.mode')}
			bind:value={action}
			options={[
				{ value: 'format', label: t('json.format') },
				{ value: 'minify', label: t('json.minify') }
			]}
		/>
		{#if action === 'format'}
			<Segmented
				name="json-indent"
				legend={t('json.indent')}
				bind:value={indent}
				options={[
					{ value: '2', label: '2' },
					{ value: '4', label: '4' },
					{ value: 'tab', label: 'Tab' }
				]}
			/>
			<label class="check">
				<input type="checkbox" bind:checked={sortKeys} />
				<span>{t('json.sortKeys')}</span>
			</label>
		{/if}
	</div>

	<div class="io">
		<div class="panel">
			<div class="panel-head">
				<label for="json-input">{t('common.input')}</label>
				<button type="button" class="btn small" onclick={() => (input = '')}>{t('common.clear')}</button>
			</div>
			<textarea
				id="json-input"
				class="area"
				rows="14"
				bind:value={input}
				spellcheck="false"
				aria-invalid={result !== undefined && !result.ok}
			></textarea>
		</div>
		<div class="stack">
			<OutputBox id="json-output" label={t('common.output')} value={output} rows={14} />
			{#if result?.ok}
				<Notice tone="info">{t('json.valid', { size: formatBytes(size) })}</Notice>
			{:else if result}
				<Notice tone="error">{t('json.invalid')} <code>{result.message}</code></Notice>
			{/if}
		</div>
	</div>
</div>
