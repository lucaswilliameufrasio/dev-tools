<script lang="ts">
	import { t } from '#lib/i18n/index.svelte.js';
	import Notice from '#lib/ui/Notice.svelte';
	import OutputBox from '#lib/ui/OutputBox.svelte';
	import Segmented from '#lib/ui/Segmented.svelte';
	import { decodeUrl, encodeUrl, parseQuery, type UrlMode } from './url';

	type Direction = 'encode' | 'decode';

	let direction = $state<Direction>('encode');
	let scope = $state<UrlMode>('component');
	let input = $state('https://exemplo.dev/busca?q=café com leite&ordem=preço');

	const decoded = $derived(direction === 'decode' ? decodeUrl(input, scope) : undefined);
	const output = $derived.by((): string => {
		if (direction === 'encode') {
			return encodeUrl(input, scope);
		}
		return decoded?.ok ? decoded.output : '';
	});
	const query = $derived(parseQuery(input));
</script>

<div class="stack">
	<div class="row">
		<Segmented
			name="url-direction"
			legend={t('common.mode')}
			bind:value={direction}
			options={[
				{ value: 'encode', label: t('common.encode') },
				{ value: 'decode', label: t('common.decode') }
			]}
		/>
		<Segmented
			name="url-scope"
			legend={t('url.scope')}
			bind:value={scope}
			options={[
				{ value: 'component', label: t('url.component') },
				{ value: 'full', label: t('url.full') }
			]}
		/>
	</div>

	<div class="io">
		<div class="panel">
			<div class="panel-head">
				<label for="url-input">{t('common.input')}</label>
				<button type="button" class="btn small" onclick={() => (input = '')}>
					{t('common.clear')}
				</button>
			</div>
			<textarea id="url-input" class="area" rows="6" bind:value={input} spellcheck="false"
			></textarea>
		</div>
		<div class="stack">
			<OutputBox id="url-output" label={t('common.output')} value={output} rows={6} />
			{#if decoded && !decoded.ok}
				<Notice tone="error">{t('url.errMalformed')}</Notice>
			{/if}
		</div>
	</div>

	{#if query.length > 0}
		<div class="panel">
			<div class="panel-head"><h2>{t('url.params')}</h2></div>
			<!-- A scrollable region must be reachable by keyboard. -->
			<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
			<div class="table-wrap" tabindex="0">
				<table>
					<thead>
						<tr><th>{t('url.key')}</th><th>{t('url.value')}</th></tr>
					</thead>
					<tbody>
						{#each query as entry, position (position)}
							<tr><td class="mono">{entry.key}</td><td class="mono">{entry.value}</td></tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>
