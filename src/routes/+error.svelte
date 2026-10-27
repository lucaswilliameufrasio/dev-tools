<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { t } from '#lib/i18n/index.svelte.js';
</script>

<svelte:head>
	<title>{t('notfound.title')} · dev-tools</title>
</svelte:head>

<div class="stack">
	<h1>{t('notfound.title')}</h1>
	<p class="muted">{t('notfound.body', { path: page.url.pathname })}</p>
	<p><a class="btn primary" href={resolve('/')}>{t('nav.home')}</a></p>
</div>
