<script lang="ts">
	import { t } from '#lib/i18n/index.svelte.js';
	import CopyButton from '#lib/ui/CopyButton.svelte';
	import Notice from '#lib/ui/Notice.svelte';
	import OutputBox from '#lib/ui/OutputBox.svelte';
	import {
		analyze,
		MAX_ROWS,
		NORMAL_FORMS,
		normalizeSpaces,
		normalizeText,
		stripInvisible
	} from './unicode';

	type Action =
		| { kind: 'none' }
		| { kind: 'normalize'; form: (typeof NORMAL_FORMS)[number] }
		| { kind: 'strip' }
		| { kind: 'spaces' };

	let input = $state('Café café ​zero⁠width nbsp 👨‍👩‍👧 αб日');
	let action = $state<Action>({ kind: 'none' });
	let keepEmoji = $state(true);

	const analysis = $derived(analyze(input));
	const summary = $derived(analysis.summary);
	const result = $derived.by(() => {
		switch (action.kind) {
			case 'normalize':
				return normalizeText(input, action.form);
			case 'strip':
				return stripInvisible(input, keepEmoji);
			case 'spaces':
				return normalizeSpaces(input);
			case 'none':
				return '';
		}
	});

	function yesNo(value: boolean): string {
		return value ? t('unicode.yes') : t('unicode.no');
	}
</script>

<div class="stack">
	<div class="panel">
		<div class="panel-head">
			<label for="unicode-input">{t('unicode.input')}</label>
			<button type="button" class="btn small" onclick={() => ((input = ''), (action = { kind: 'none' }))}>
				{t('common.clear')}
			</button>
		</div>
		<textarea id="unicode-input" class="area" rows="5" bind:value={input} spellcheck="false"
		></textarea>
	</div>

	{#if input === ''}
		<Notice tone="info">{t('unicode.empty')}</Notice>
	{:else}
		<div class="panel">
			<dl class="summary">
				<div><dt>{t('unicode.utf16')}</dt><dd>{summary.utf16Length}</dd></div>
				<div><dt>{t('unicode.codePoints')}</dt><dd>{summary.codePoints}</dd></div>
				<div><dt>{t('unicode.graphemes')}</dt><dd>{summary.graphemes ?? '-'}</dd></div>
				<div><dt>{t('unicode.utf8')}</dt><dd>{summary.utf8Bytes}</dd></div>
				<div><dt>{t('unicode.invisible')}</dt><dd>{summary.invisibleCount}</dd></div>
				<div><dt>{t('unicode.nfc')}</dt><dd>{yesNo(summary.isNfc)}</dd></div>
				<div><dt>{t('unicode.nfd')}</dt><dd>{yesNo(summary.isNfd)}</dd></div>
			</dl>
			<p class="muted small-text">
				{summary.nfcEqualsNfd ? t('unicode.hintSame') : t('unicode.hintDiffer')}
			</p>
			{#if summary.invisibleCount > 0}
				<Notice tone="info">{t('unicode.hintInvisible', { count: summary.invisibleCount })}</Notice>
			{/if}
		</div>

		<div class="panel">
			<div class="panel-head"><span>{t('unicode.actions')}</span></div>
			<div class="row tight">
				{#each NORMAL_FORMS as form (form)}
					<button
						type="button"
						class="btn small"
						class:primary={action.kind === 'normalize' && action.form === form}
						onclick={() => (action = { kind: 'normalize', form })}
					>
						{form}
					</button>
				{/each}
				<button
					type="button"
					class="btn small"
					class:primary={action.kind === 'strip'}
					onclick={() => (action = { kind: 'strip' })}
				>
					{t('unicode.stripInvisible')}
				</button>
				<button
					type="button"
					class="btn small"
					class:primary={action.kind === 'spaces'}
					onclick={() => (action = { kind: 'spaces' })}
				>
					{t('unicode.fixSpaces')}
				</button>
			</div>
			<label class="check">
				<input type="checkbox" bind:checked={keepEmoji} />
				<span>{t('unicode.keepEmoji')}</span>
			</label>
			{#if action.kind !== 'none'}
				<OutputBox id="unicode-result" label={t('unicode.result')} value={result} rows={4} />
				<div class="row">
					<button
						type="button"
						class="btn small"
						onclick={() => ((input = result), (action = { kind: 'none' }))}
					>
						{t('unicode.useResult')}
					</button>
				</div>
			{/if}
		</div>

		<div class="panel">
			<div class="table-wrap">
				<table>
					<thead>
						<tr>
							<th>{t('unicode.colChar')}</th>
							<th>{t('unicode.colCode')}</th>
							<th>{t('unicode.colUtf8')}</th>
							<th>{t('unicode.colUtf16')}</th>
							<th>{t('unicode.colCategory')}</th>
							<th>{t('unicode.colScript')}</th>
							<th>{t('unicode.colFlags')}</th>
						</tr>
					</thead>
					<tbody>
						{#each analysis.rows as row, index (index)}
							<tr>
								<td>
									{#if row.label !== undefined}
										<span class="pill ghost mono">{row.label}</span>
									{:else}
										<span class="glyph">{row.display}</span>
									{/if}
								</td>
								<td class="mono">{row.hex}</td>
								<td class="mono">{row.utf8.join(' ')}</td>
								<td class="mono">{row.utf16.join(' ')}</td>
								<td>{row.category} <span class="muted">{t(`unicode.group.${row.group}`)}</span></td>
								<td>{row.script}</td>
								<td>
									{#each row.flags as flag (flag)}
										<span class="pill bad flag">{t(`unicode.flag.${flag}`)}</span>
									{/each}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			{#if analysis.truncated}
				<Notice tone="info">
					{t('unicode.truncated', { limit: MAX_ROWS, total: summary.codePoints })}
				</Notice>
			{/if}
		</div>
	{/if}
</div>

<style>
	.summary {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr));
		gap: 10px;
		margin: 0;
	}
	.summary div {
		background: var(--surface-2);
		border-radius: var(--radius);
		padding: 8px 12px;
	}
	dt {
		font-size: 0.75rem;
		color: var(--ink-2);
	}
	dd {
		margin: 2px 0 0;
		font-size: 1.15rem;
		font-weight: 650;
		font-family: var(--font-mono);
	}
	.glyph {
		font-size: 1.2rem;
	}
	.pill.ghost {
		background: var(--accent-soft);
		color: var(--accent);
	}
	.flag {
		margin: 0 4px 4px 0;
	}
</style>
