<script lang="ts">
	import { t } from '#lib/i18n/index.svelte.js';
	import Notice from '#lib/ui/Notice.svelte';
	import type { RegexMatch } from './regex';
	import { runRegexSafely, type RunnerResponse } from './regexRunner';

	const FLAG_OPTIONS = ['i', 'm', 's', 'u'];

	let pattern = $state('(?<ano>\\d{4})-(?<mes>\\d{2})-(?<dia>\\d{2})');
	let flags = $state<string[]>(['g']);
	let text = $state('Entrega em 2024-02-29, revisão em 2024-03-15.');
	let outcome = $state<RunnerResponse | undefined>();
	let pending = $state(false);
	let sequence = 0;

	const flagString = $derived(flags.join(''));

	$effect(() => {
		const request = { pattern, flags: flagString, text };
		sequence += 1;
		const current = sequence;
		if (pattern === '') {
			outcome = undefined;
			pending = false;
			return;
		}
		pending = true;
		const timer = setTimeout(async () => {
			const response = await runRegexSafely(request);
			if (current === sequence) {
				outcome = response;
				pending = false;
			}
		}, 150);
		return () => {
			clearTimeout(timer);
		};
	});

	type Segment = { text: string; matched: boolean };

	function segments(source: string, matches: RegexMatch[]): Segment[] {
		const parts: Segment[] = [];
		let cursor = 0;
		for (const match of matches) {
			if (match.text === '') {
				continue;
			}
			if (match.index > cursor) {
				parts.push({ text: source.slice(cursor, match.index), matched: false });
			}
			parts.push({ text: match.text, matched: true });
			cursor = match.index + match.text.length;
		}
		if (cursor < source.length) {
			parts.push({ text: source.slice(cursor), matched: false });
		}
		return parts;
	}
</script>

<div class="stack">
	<div class="panel">
		<div class="panel-head"><label for="regex-pattern">{t('regex.pattern')}</label></div>
		<div class="row">
			<input
				id="regex-pattern"
				class="input mono grow"
				type="text"
				bind:value={pattern}
				spellcheck="false"
				autocomplete="off"
				aria-invalid={outcome !== undefined && !outcome.ok}
			/>
			<fieldset class="flags">
				<legend>{t('regex.flags')}</legend>
				{#each FLAG_OPTIONS as flag (flag)}
					<label class="check">
						<input type="checkbox" value={flag} bind:group={flags} />
						<span class="mono">{flag}</span>
					</label>
				{/each}
			</fieldset>
		</div>
	</div>

	<div class="panel">
		<div class="panel-head"><label for="regex-text">{t('regex.text')}</label></div>
		<textarea id="regex-text" class="area" rows="6" bind:value={text} spellcheck="false"></textarea>
	</div>

	{#if outcome && !outcome.ok}
		<Notice tone="error">
			{#if outcome.reason === 'timeout'}
				{t('regex.errTimeout')}
			{:else}
				{t('regex.errInvalid')} <code>{outcome.message}</code>
			{/if}
		</Notice>
	{:else if outcome}
		<div class="panel" aria-busy={pending}>
			<div class="panel-head">
				<h2>{t('regex.result', { n: outcome.matches.length })}</h2>
			</div>
			<pre class="highlight">{#each segments(text, outcome.matches) as part, position (position)}{#if part.matched}<mark>{part.text}</mark>{:else}{part.text}{/if}{/each}</pre>
			{#if outcome.truncated}
				<Notice tone="info">{t('regex.truncated')}</Notice>
			{/if}
			{#if outcome.matches.length > 0}
				<div class="table-wrap">
					<table>
						<thead>
							<tr>
								<th>#</th>
								<th>{t('regex.match')}</th>
								<th>{t('regex.position')}</th>
								<th>{t('regex.groups')}</th>
							</tr>
						</thead>
						<tbody>
							{#each outcome.matches as match, position (position)}
								<tr>
									<td class="mono">{position + 1}</td>
									<td class="mono">{match.text}</td>
									<td class="mono">{match.index}</td>
									<td class="mono">
										{#each Object.entries(match.named) as [name, value] (name)}
											<div>{name}: {value ?? '—'}</div>
										{/each}
										{#each match.groups as group, groupPosition (groupPosition)}
											<div>${groupPosition + 1}: {group ?? '—'}</div>
										{/each}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	{/if}
</div>
