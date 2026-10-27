<script lang="ts">
	import { i18n, t, type MessageKey } from '#lib/i18n/index.svelte.js';
	import CopyButton from '#lib/ui/CopyButton.svelte';
	import { CATEGORIES, STATUSES, fullName, searchStatuses, type StatusCategory } from './statuses';

	const CATEGORY_LABEL: Record<StatusCategory, MessageKey> = {
		1: 'httpstatus.cat1',
		2: 'httpstatus.cat2',
		3: 'httpstatus.cat3',
		4: 'httpstatus.cat4',
		5: 'httpstatus.cat5'
	};

	let query = $state('');
	let selected = $state<StatusCategory[]>([...CATEGORIES]);

	const results = $derived(searchStatuses(STATUSES, query, i18n.locale, selected));

	function toggle(category: StatusCategory, on: boolean): void {
		if (on) {
			selected = CATEGORIES.filter((item) => item === category || selected.includes(item));
			return;
		}
		selected = selected.filter((item) => item !== category);
	}
</script>

<div class="stack">
	<div class="panel">
		<div class="field">
			<label for="httpstatus-search">{t('httpstatus.search')}</label>
			<input
				id="httpstatus-search"
				class="input"
				type="search"
				bind:value={query}
				spellcheck="false"
				autocomplete="off"
				placeholder={t('httpstatus.searchHint')}
			/>
		</div>
		<fieldset class="cats">
			<legend>{t('httpstatus.categories')}</legend>
			{#each CATEGORIES as category (category)}
				<label class="chip" class:active={selected.includes(category)}>
					<input
						type="checkbox"
						checked={selected.includes(category)}
						onchange={(event) => toggle(category, event.currentTarget.checked)}
					/>
					<span>{t(CATEGORY_LABEL[category])}</span>
				</label>
			{/each}
		</fieldset>
	</div>

	<p class="small-text muted" role="status">{t('httpstatus.count', { count: results.length })}</p>

	{#if results.length === 0}
		<p class="panel muted">{t('httpstatus.empty')}</p>
	{:else}
		<ul class="cards">
			{#each results as entry (entry.code)}
				<li class="card c{entry.category}" id="status-{entry.code}">
					<div class="card-head">
						<span class="code mono">{entry.code}</span>
						<h2>{entry.name}</h2>
						<CopyButton value={fullName(entry)} label={t('httpstatus.copyLabel', { name: fullName(entry) })} />
					</div>
					<p class="meta small-text">
						<span class="mono muted">{entry.rfc}</span>
						{#if entry.nonStandard}
							<span class="pill bad">{t('httpstatus.nonStandard')}</span>
						{/if}
					</p>
					<p>{entry.description[i18n.locale]}</p>
					<p class="when small-text">
						<strong>{t('httpstatus.whenToUse')}:</strong>
						{entry.whenToUse[i18n.locale]}
					</p>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.cats {
		border: 0;
		margin: 12px 0 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.cats legend {
		font-size: 0.82rem;
		font-weight: 600;
		color: var(--ink-2);
		padding: 0;
		margin-bottom: 6px;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		min-height: 36px;
		padding: 0 14px;
		border: 1px solid var(--line);
		border-radius: 999px;
		cursor: pointer;
		font-size: 0.88rem;
		background: var(--surface);
	}
	.chip.active {
		background: var(--accent-soft);
		border-color: var(--accent);
		color: var(--ink);
	}
	.chip:has(input:focus-visible) {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	.chip input {
		position: absolute;
		opacity: 0;
		width: 1px;
		height: 1px;
	}
	.cards {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 10px;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 22rem), 1fr));
	}
	.card {
		border: 1px solid var(--line);
		border-left-width: 4px;
		border-radius: var(--radius);
		background: var(--surface);
		padding: 12px 14px;
		min-width: 0;
	}
	.card.c1 {
		border-left-color: var(--ink-2);
	}
	.card.c2 {
		border-left-color: var(--ok);
	}
	.card.c3 {
		border-left-color: var(--accent);
	}
	.card.c4 {
		border-left-color: var(--mark);
	}
	.card.c5 {
		border-left-color: var(--bad);
	}
	.card p {
		margin: 6px 0 0;
	}
	.card-head {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.card-head h2 {
		flex: 1;
		min-width: 0;
		margin: 0;
		font-size: 1rem;
		overflow-wrap: anywhere;
	}
	.code {
		font-size: 1.3rem;
		font-weight: 700;
	}
	.meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
	}
	.when {
		color: var(--ink-2);
	}
</style>
