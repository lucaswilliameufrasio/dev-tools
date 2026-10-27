<script lang="ts">
	import { t } from '#lib/i18n/index.svelte.js';

	type Props = { value: string; label?: string };
	type CopyState = 'idle' | 'copied' | 'failed';

	let { value, label }: Props = $props();
	let copyState = $state<CopyState>('idle');
	let resetTimer: ReturnType<typeof setTimeout> | undefined;

	async function copy(): Promise<void> {
		try {
			await navigator.clipboard.writeText(value);
			copyState = 'copied';
		} catch {
			copyState = 'failed';
		}
		clearTimeout(resetTimer);
		resetTimer = setTimeout(() => {
			copyState = 'idle';
		}, 1600);
	}
</script>

<button type="button" class="btn small" onclick={copy} disabled={value === ''}>
	{#if copyState === 'copied'}
		{t('common.copied')}
	{:else if copyState === 'failed'}
		{t('common.copyFailed')}
	{:else}
		{label ?? t('common.copy')}
	{/if}
</button>
