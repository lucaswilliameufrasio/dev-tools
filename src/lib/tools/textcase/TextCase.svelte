<script lang="ts">
	import { t, type MessageKey } from '#lib/i18n/index.svelte.js';
	import CopyButton from '#lib/ui/CopyButton.svelte';
	import { CASE_STYLES, convertCase } from './textcase';

	let input = $state('user profile id');
</script>

<div class="stack">
	<div class="panel">
		<div class="panel-head">
			<label for="case-input">{t('common.input')}</label>
			<button type="button" class="btn small" onclick={() => (input = '')}>{t('common.clear')}</button>
		</div>
		<textarea id="case-input" class="area" rows="3" bind:value={input} spellcheck="false"></textarea>
	</div>

	<div class="panel">
		<ul class="results">
			{#each CASE_STYLES as style (style)}
				{@const converted = convertCase(input, style)}
				<li>
					<span class="results-label">{t(`case.${style}` as MessageKey)}</span>
					<code class="results-value">{converted}</code>
					<CopyButton value={converted} />
				</li>
			{/each}
		</ul>
	</div>
</div>
