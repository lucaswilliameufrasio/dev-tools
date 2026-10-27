<script lang="ts">
	import { t } from '#lib/i18n/index.svelte.js';
	import Notice from '#lib/ui/Notice.svelte';
	import { diffLines } from './diff';

	let before = $state('name: dev-tools\nversion: 1.0.0\nprivate: true\nlicense: MIT');
	let after = $state('name: dev-tools\nversion: 1.1.0\nprivate: false\nlicense: MIT\nauthor: lucas');

	const result = $derived(diffLines(before, after));

	const MARKERS = { same: ' ', added: '+', removed: '-' } as const;
</script>

<div class="stack">
	<div class="io">
		<div class="panel">
			<div class="panel-head"><label for="diff-before">{t('diff.before')}</label></div>
			<textarea id="diff-before" class="area" rows="10" bind:value={before} spellcheck="false"
			></textarea>
		</div>
		<div class="panel">
			<div class="panel-head"><label for="diff-after">{t('diff.after')}</label></div>
			<textarea id="diff-after" class="area" rows="10" bind:value={after} spellcheck="false"
			></textarea>
		</div>
	</div>

	{#if result.ok}
		<div class="panel">
			<div class="panel-head">
				<h2>{t('diff.result')}</h2>
				<span class="muted mono">+{result.added} −{result.removed}</span>
			</div>
			{#if result.added === 0 && result.removed === 0}
				<Notice tone="info">{t('diff.identical')}</Notice>
			{:else}
				<div class="diff" role="table" aria-label={t('diff.result')}>
					{#each result.lines as line, position (position)}
						<div class="diff-line {line.kind}" role="row">
							<span class="diff-mark" role="cell">{MARKERS[line.kind]}</span>
							<span class="diff-text" role="cell">{line.text}</span>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{:else}
		<Notice tone="error">{t('diff.errTooLarge')}</Notice>
	{/if}
</div>
