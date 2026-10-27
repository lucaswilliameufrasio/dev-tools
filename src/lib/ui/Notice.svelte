<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = { tone: 'error' | 'info'; children: Snippet };

	let { tone, children }: Props = $props();
</script>

<p class="notice {tone}" role={tone === 'error' ? 'alert' : 'status'}>{@render children()}</p>
