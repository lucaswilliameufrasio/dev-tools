<script lang="ts">
	import { resolve } from '$app/paths';
	import { t, type MessageKey } from '#lib/i18n/index.svelte.js';
	import { findTool, type ToolId } from '#lib/tools/registry.js';
	import type { Snippet } from 'svelte';

	type Props = { id: ToolId; children: Snippet };

	let { id, children }: Props = $props();

	const tool = $derived(findTool(id));
	const name = $derived(t(`tool.${id}.name` as MessageKey));
</script>

<svelte:head>
	<title>{name} · dev-tools</title>
	<meta name="description" content={t(`tool.${id}.desc` as MessageKey)} />
</svelte:head>

{#if tool}
	<article class="tool">
		<header class="tool-head">
			<nav class="crumbs" aria-label="breadcrumb">
				<a href={resolve('/')}>{t('nav.home')}</a>
				<span aria-hidden="true">/</span>
				<span>{t(`group.${tool.group}` as MessageKey)}</span>
			</nav>
			<h1>{name}</h1>
			<p class="muted">{t(`tool.${id}.desc` as MessageKey)}</p>
		</header>

		{@render children()}
	</article>
{/if}

<style>
	.tool {
		display: flex;
		flex-direction: column;
		gap: 18px;
		min-width: 0;
	}

	.tool-head {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.crumbs {
		display: flex;
		gap: 6px;
		font-size: 0.8rem;
		color: var(--ink-2);
	}

	.crumbs a {
		color: inherit;
	}
</style>
