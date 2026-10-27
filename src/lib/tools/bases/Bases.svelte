<script lang="ts">
	import { t } from '#lib/i18n/index.svelte.js';
	import CopyButton from '#lib/ui/CopyButton.svelte';
	import Notice from '#lib/ui/Notice.svelte';
	import { BASES, formatInBase, parseInBase, type BaseId } from './bases';

	const NAMES: Record<BaseId, string> = { 2: 'bin', 8: 'oct', 10: 'dec', 16: 'hex' };

	let fields = $state<Record<BaseId, string>>({ 2: '11111111', 8: '377', 10: '255', 16: 'ff' });
	let invalidBase = $state<BaseId | undefined>();

	function update(base: BaseId, text: string): void {
		fields[base] = text;
		if (text.trim() === '') {
			invalidBase = undefined;
			for (const other of BASES) {
				if (other !== base) {
					fields[other] = '';
				}
			}
			return;
		}
		const parsed = parseInBase(text, base);
		if (!parsed.ok) {
			invalidBase = base;
			return;
		}
		invalidBase = undefined;
		for (const other of BASES) {
			if (other !== base) {
				fields[other] = formatInBase(parsed.value, other);
			}
		}
	}
</script>

<div class="stack">
	<div class="panel">
		<div class="fields">
			{#each BASES as base (base)}
				<div class="field">
					<div class="panel-head">
						<label for={`base-${base}`}>{t('bases.base', { n: base })} <span class="muted">{NAMES[base]}</span></label>
						<CopyButton value={fields[base]} />
					</div>
					<input
						id={`base-${base}`}
						class="input mono"
						type="text"
						spellcheck="false"
						autocomplete="off"
						aria-invalid={invalidBase === base}
						value={fields[base]}
						oninput={(event) => update(base, event.currentTarget.value)}
					/>
				</div>
			{/each}
		</div>
	</div>
	{#if invalidBase !== undefined}
		<Notice tone="error">{t('bases.errDigits', { n: invalidBase })}</Notice>
	{:else}
		<Notice tone="info">{t('bases.hint')}</Notice>
	{/if}
</div>
