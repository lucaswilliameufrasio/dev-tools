<script lang="ts">
	import { resolve } from '$app/paths';
	import { t, type MessageKey } from '#lib/i18n/index.svelte.js';
	import { findTool } from '#lib/tools/registry.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const tool = $derived(findTool(data.id));
	const name = $derived(t(`tool.${data.id}.name` as MessageKey));
</script>

<svelte:head>
	<title>{name} · dev-tools</title>
	<meta name="description" content={t(`tool.${data.id}.desc` as MessageKey)} />
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
			<p class="muted">{t(`tool.${data.id}.desc` as MessageKey)}</p>
		</header>

		{#key data.id}
			{#await tool.load()}
				<p class="muted" role="status">{t('loading')}</p>
			{:then module}
				{@const ToolBody = module.default}
				<ToolBody />
			{:catch}
				<p class="notice error" role="alert">{t('loadFailed')}</p>
			{/await}
		{/key}
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
