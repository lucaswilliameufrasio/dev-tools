<script lang="ts">
	import { t, type MessageKey } from '#lib/i18n/index.svelte.js';
	import { toolHref } from '#lib/tools/href.js';
	import { GROUP_ORDER, TOOLS } from '#lib/tools/registry.js';
</script>

<svelte:head>
	<title>dev-tools</title>
</svelte:head>

<div class="home">
	<section class="intro">
		<h1>{t('home.title')}</h1>
		<p class="muted">{t('home.lead', { shortcut: 'Ctrl/⌘ K' })}</p>
	</section>

	{#each GROUP_ORDER as group (group)}
		<section aria-labelledby={`group-${group}`}>
			<h2 id={`group-${group}`} class="group-title">{t(`group.${group}` as MessageKey)}</h2>
			<ul class="cards">
				{#each TOOLS.filter((tool) => tool.group === group) as tool (tool.id)}
					<li>
						<a class="card" href={toolHref(tool.id)}>
							<span class="glyph">{tool.glyph}</span>
							<span class="card-text">
								<strong>{t(`tool.${tool.id}.name` as MessageKey)}</strong>
								<span class="muted">{t(`tool.${tool.id}.desc` as MessageKey)}</span>
							</span>
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/each}

	<section id="privacidade" class="privacy">
		<h2>{t('privacy.title')}</h2>
		<p>{t('privacy.body')}</p>
		<p class="muted">{t('privacy.verify')}</p>
	</section>
</div>

<style>
	.home {
		display: flex;
		flex-direction: column;
		gap: 28px;
	}

	.intro {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.group-title {
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--ink-2);
		margin-bottom: 10px;
	}

	.cards {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
		gap: 10px;
	}

	.card {
		display: flex;
		align-items: center;
		gap: 12px;
		height: 100%;
		padding: 12px;
		background: var(--surface);
		border: 1px solid var(--line);
		border-radius: var(--radius);
		color: var(--ink);
		text-decoration: none;
		box-shadow: var(--shadow);
	}

	.card:hover {
		border-color: var(--accent);
	}

	.card-text {
		display: flex;
		flex-direction: column;
		min-width: 0;
		font-size: 0.88rem;
	}

	.card-text strong {
		font-size: 1rem;
	}

	.privacy {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 16px;
		border: 1px solid var(--line);
		border-left: 4px solid var(--ok);
		border-radius: var(--radius);
		background: var(--surface);
		max-width: 46rem;
		scroll-margin-top: 80px;
	}

	.privacy h2 {
		font-size: 1.05rem;
	}
</style>
