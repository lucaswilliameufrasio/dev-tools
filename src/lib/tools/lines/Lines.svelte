<script lang="ts">
	import { formatBytes } from '#lib/download.js';
	import { i18n, t, type MessageKey } from '#lib/i18n/index.svelte.js';
	import Notice from '#lib/ui/Notice.svelte';
	import OutputBox from '#lib/ui/OutputBox.svelte';
	import { applyAction, computeStats, LINES_ACTIONS, type LinesAction } from './lines';

	const ACTION_LABELS: Record<LinesAction, MessageKey> = {
		sortAsc: 'lines.a.sortAsc',
		sortDesc: 'lines.a.sortDesc',
		natural: 'lines.a.natural',
		byLength: 'lines.a.byLength',
		unique: 'lines.a.unique',
		removeEmpty: 'lines.a.removeEmpty',
		trim: 'lines.a.trim',
		reverse: 'lines.a.reverse',
		shuffle: 'lines.a.shuffle',
		numbers: 'lines.a.numbers',
		join: 'lines.a.join',
		split: 'lines.a.split',
		slugify: 'lines.a.slugify',
		countDuplicates: 'lines.a.countDuplicates',
		prefixSuffix: 'lines.a.prefixSuffix'
	};
	const CASE_ACTIONS: LinesAction[] = ['sortAsc', 'sortDesc', 'natural', 'unique', 'countDuplicates'];
	const SEPARATOR_ACTIONS: LinesAction[] = ['join', 'split'];

	let input = $state('banana\nmaçã\nfile10.txt\nfile2.txt\nBanana\n\nAção de Graças\nmaçã');
	let action = $state<LinesAction>('natural');
	let caseInsensitive = $state(false);
	let separator = $state(', ');
	let prefix = $state('');
	let suffix = $state('');
	let shuffleRound = $state(0);

	const stats = $derived(computeStats(input));
	const output = $derived.by(() => {
		void shuffleRound;
		return applyAction(input, action, {
			caseInsensitive,
			separator,
			prefix,
			suffix,
			locale: i18n.intlLocale
		});
	});
	const separatorMissing = $derived(action === 'split' && separator === '');
	const statItems = $derived<{ key: MessageKey; value: string }[]>([
		{ key: 'lines.stat.lines', value: String(stats.lines) },
		{ key: 'lines.stat.unique', value: String(stats.unique) },
		{ key: 'lines.stat.words', value: String(stats.words) },
		{ key: 'lines.stat.characters', value: String(stats.characters) },
		{ key: 'lines.stat.bytes', value: `${stats.bytes} (${formatBytes(stats.bytes)})` }
	]);
</script>

<div class="stack">
	<div class="panel">
		<div class="panel-head">
			<label for="lines-input">{t('lines.input')}</label>
		</div>
		<textarea id="lines-input" class="area" rows="8" bind:value={input} spellcheck="false"
		></textarea>
	</div>

	<div class="panel">
		<div class="fields">
			<div class="field">
				<label for="lines-action">{t('lines.action')}</label>
				<select id="lines-action" class="input" bind:value={action}>
					{#each LINES_ACTIONS as item (item)}
						<option value={item}>{t(ACTION_LABELS[item])}</option>
					{/each}
				</select>
			</div>
			{#if SEPARATOR_ACTIONS.includes(action)}
				<div class="field">
					<label for="lines-separator">{t('lines.separator')}</label>
					<input
						id="lines-separator"
						class="input mono"
						type="text"
						bind:value={separator}
						spellcheck="false"
						autocomplete="off"
						placeholder={t('lines.separatorHint')}
					/>
				</div>
			{/if}
			{#if action === 'prefixSuffix'}
				<div class="field">
					<label for="lines-prefix">{t('lines.prefix')}</label>
					<input
						id="lines-prefix"
						class="input mono"
						type="text"
						bind:value={prefix}
						spellcheck="false"
						autocomplete="off"
					/>
				</div>
				<div class="field">
					<label for="lines-suffix">{t('lines.suffix')}</label>
					<input
						id="lines-suffix"
						class="input mono"
						type="text"
						bind:value={suffix}
						spellcheck="false"
						autocomplete="off"
					/>
				</div>
			{/if}
		</div>
		<div class="row">
			{#if CASE_ACTIONS.includes(action)}
				<label class="check">
					<input type="checkbox" bind:checked={caseInsensitive} />
					<span>{t('lines.caseInsensitive')}</span>
				</label>
			{/if}
			{#if action === 'shuffle'}
				<button type="button" class="btn small" onclick={() => (shuffleRound += 1)}>
					{t('lines.reshuffle')}
				</button>
			{/if}
		</div>
	</div>

	{#if separatorMissing}
		<Notice tone="info">{t('lines.emptySeparator')}</Notice>
	{:else if input === ''}
		<Notice tone="info">{t('lines.empty')}</Notice>
	{/if}

	<OutputBox id="lines-output" label={t('lines.output')} value={output} rows={8} />

	<div class="panel">
		<ul class="results">
			{#each statItems as item (item.key)}
				<li>
					<span class="results-label">{t(item.key)}</span>
					<code class="results-value">{item.value}</code>
				</li>
			{/each}
		</ul>
	</div>
</div>
