<script lang="ts">
	import '../app.css';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { i18n, t, type MessageKey } from '#lib/i18n/index.svelte.js';
	import { theme } from '#lib/theme.svelte.js';
	import { GROUP_ORDER, TOOLS } from '#lib/tools/registry.js';
	import Logo from '#lib/ui/Logo.svelte';
	import Palette from '#lib/ui/Palette.svelte';
	import { onMount } from 'svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
	let palette = $state<Palette>();

	onMount(() => {
		i18n.init();
		theme.init();
	});
</script>

<a class="skip" href="#main">{t('nav.tools')}</a>

<header class="top">
	<a class="brand" href={resolve('/')} aria-label={`${t('app.name')} — ${t('nav.home')}`}>
		<Logo size={30} />
		<span class="brand-name">{t('app.name')}</span>
	</a>

	<a class="privacy-chip" href={`${resolve('/')}#privacidade`}>
		<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
			<path
				d="M12 2 4 5v6c0 5 3.4 9.3 8 11 4.6-1.7 8-6 8-11V5l-8-3Zm-1.2 14.2-3.5-3.5 1.4-1.4 2.1 2.1 4.6-4.6 1.4 1.4-6 6Z"
				fill="currentColor"
			/>
		</svg>
		<span>{t('privacy.badge')}</span>
	</a>

	<div class="top-actions">
		<button
			type="button"
			class="search-trigger"
			aria-label={t('nav.search')}
			onclick={() => palette?.open()}
		>
			<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
				<circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2" />
				<path d="m16 16 4.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
			</svg>
			<span class="search-label">{t('nav.search')}</span>
			<kbd>Ctrl K</kbd>
		</button>
		<button
			type="button"
			class="icon-btn"
			aria-label={t('nav.language')}
			onclick={() => i18n.set(i18n.locale === 'pt' ? 'en' : 'pt')}
		>
			{i18n.locale === 'pt' ? 'PT' : 'EN'}
		</button>
		<button
			type="button"
			class="icon-btn"
			aria-label={t('nav.theme', { name: t(`theme.${theme.choice}` as MessageKey) })}
			title={t('nav.theme', { name: t(`theme.${theme.choice}` as MessageKey) })}
			onclick={() => theme.cycle()}
		>
			<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
				{#if theme.choice === 'system'}
					<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2" />
					<path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" />
				{:else if theme.choice === 'light'}
					<circle cx="12" cy="12" r="4" fill="currentColor" />
					<path
						d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
					/>
				{:else}
					<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" fill="currentColor" />
				{/if}
			</svg>
		</button>
	</div>
</header>

<div class="shell">
	<nav class="side" aria-label={t('nav.tools')}>
		{#each GROUP_ORDER as group (group)}
			<div class="side-group">
				<h2>{t(`group.${group}` as MessageKey)}</h2>
				<ul>
					{#each TOOLS.filter((tool) => tool.group === group) as tool (tool.id)}
						<li>
							<a
								href={resolve('/[id]', { id: tool.id })}
								aria-current={page.params.id === tool.id ? 'page' : undefined}
							>
								<span class="glyph small-glyph">{tool.glyph}</span>
								<span>{t(`tool.${tool.id}.name` as MessageKey)}</span>
							</a>
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	</nav>

	<main id="main">
		{@render children()}
	</main>
</div>

<footer class="foot">
	<span>{t('privacy.footer')}</span>
	<a href="https://github.com/lucaswilliameufrasio/dev-tools" rel="noopener noreferrer">
		{t('footer.source')}
	</a>
</footer>

<Palette bind:this={palette} />

<style>
	.skip {
		position: absolute;
		left: -999px;
	}

	.skip:focus {
		left: 16px;
		top: 8px;
		z-index: 20;
		background: var(--surface);
		padding: 6px 10px;
		border-radius: 6px;
	}

	.top {
		position: sticky;
		top: env(safe-area-inset-top, 0px);
		z-index: 10;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 16px;
		background: var(--surface);
		border-bottom: 1px solid var(--line);
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		color: var(--ink);
		text-decoration: none;
	}

	.brand-name {
		white-space: nowrap;
		font-family: var(--font-mono);
		font-weight: 700;
		font-size: 1.05rem;
		letter-spacing: -0.02em;
	}

	.privacy-chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 3px 10px;
		border-radius: 999px;
		background: var(--ok-soft);
		color: var(--ok);
		font-size: 0.8rem;
		font-weight: 650;
		text-decoration: none;
		white-space: nowrap;
	}

	.top-actions {
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.search-trigger,
	.icon-btn {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		min-height: 36px;
		padding: 4px 12px;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: var(--surface-2);
		color: var(--ink);
		font: inherit;
		cursor: pointer;
	}

	.icon-btn {
		min-width: 36px;
		justify-content: center;
		font-weight: 700;
		font-size: 0.85rem;
	}

	.search-trigger:hover,
	.icon-btn:hover {
		border-color: var(--accent);
	}

	.search-label {
		color: var(--ink-2);
		white-space: nowrap;
	}

	kbd {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		padding: 1px 6px;
		border: 1px solid var(--line);
		border-radius: 4px;
		color: var(--ink-2);
	}

	.shell {
		display: grid;
		grid-template-columns: 15rem minmax(0, 1fr);
		gap: 24px;
		max-width: 76rem;
		margin: 0 auto;
		padding: 20px 16px 8px;
	}

	.side {
		position: sticky;
		top: calc(70px + env(safe-area-inset-top, 0px));
		align-self: start;
		display: flex;
		flex-direction: column;
		gap: 18px;
		max-height: calc(100vh - 90px);
		overflow-y: auto;
		padding-right: 6px;
		scrollbar-width: thin;
	}

	.side-group h2 {
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--ink-2);
		margin-bottom: 6px;
	}

	.side ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.side a {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 5px 8px;
		border-radius: 7px;
		color: var(--ink);
		text-decoration: none;
		font-weight: 550;
	}

	.side a:hover {
		background: var(--surface-2);
	}

	.side a[aria-current='page'] {
		background: var(--accent-soft);
		color: var(--accent);
	}

	.small-glyph {
		width: 2rem;
		height: 1.7rem;
		font-size: 0.7rem;
	}

	main {
		min-width: 0;
	}

	.foot {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 8px 16px;
		max-width: 76rem;
		margin: 0 auto;
		padding: 20px 16px 28px;
		color: var(--ink-2);
		font-size: 0.85rem;
	}

	@media (max-width: 900px) {
		.shell {
			grid-template-columns: minmax(0, 1fr);
		}

		.side {
			display: none;
		}
	}

	@media (max-width: 640px) {
		.privacy-chip span {
			display: none;
		}

		.privacy-chip {
			padding: 6px;
		}

		kbd,
		.search-label {
			display: none;
		}

		.search-trigger {
			padding: 4px 9px;
		}
	}
</style>
