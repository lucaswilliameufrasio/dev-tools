<script lang="ts">
	import { t } from '#lib/i18n/index.svelte.js';
	import OutputBox from '#lib/ui/OutputBox.svelte';
	import Segmented from '#lib/ui/Segmented.svelte';
	import { generateIds, type IdKind } from './ids';

	let kind = $state<IdKind>('uuid-v4');
	let count = $state(5);
	let uppercase = $state(false);
	let hyphens = $state(true);
	let generated = $state<string[]>([]);

	function regenerate(): void {
		const safeCount = Math.min(100, Math.max(1, Math.floor(count) || 1));
		generated = generateIds(kind, safeCount);
	}


	$effect(() => {
		// Regenerate whenever the kind or count changes.
		void kind;
		void count;
		regenerate();
	});

	const output = $derived(
		generated
			.map((id) => {
				const withoutHyphens = hyphens || kind === 'ulid' ? id : id.replaceAll('-', '');
				return uppercase && kind !== 'ulid' ? withoutHyphens.toUpperCase() : withoutHyphens;
			})
			.join('\n')
	);
</script>

<div class="stack">
	<div class="row">
		<Segmented
			name="ids-kind"
			legend={t('ids.kind')}
			bind:value={kind}
			options={[
				{ value: 'uuid-v4', label: 'UUID v4' },
				{ value: 'uuid-v7', label: 'UUID v7' },
				{ value: 'ulid', label: 'ULID' }
			]}
		/>
		<div class="field compact">
			<label for="ids-count">{t('ids.count')}</label>
			<input id="ids-count" class="input mono" type="number" min="1" max="100" bind:value={count} />
		</div>
		{#if kind !== 'ulid'}
			<label class="check">
				<input type="checkbox" bind:checked={hyphens} />
				<span>{t('ids.hyphens')}</span>
			</label>
			<label class="check">
				<input type="checkbox" bind:checked={uppercase} />
				<span>{t('ids.uppercase')}</span>
			</label>
		{/if}
		<button type="button" class="btn primary" onclick={regenerate}>{t('common.generate')}</button>
	</div>

	<OutputBox id="ids-output" label={t('common.output')} value={output} rows={Math.min(12, Math.max(3, generated.length + 1))} />
	<p class="muted small-text">{t(`ids.note.${kind}` as 'ids.note.uuid-v4')}</p>
</div>
