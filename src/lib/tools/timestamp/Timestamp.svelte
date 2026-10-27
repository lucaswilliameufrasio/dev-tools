<script lang="ts">
	import { i18n, t } from '#lib/i18n/index.svelte.js';
	import CopyButton from '#lib/ui/CopyButton.svelte';
	import Notice from '#lib/ui/Notice.svelte';
	import { onMount } from 'svelte';
	import {
		availableTimeZones,
		formatInZone,
		localTimeZone,
		parseMoment,
		relativeTime
	} from './timestamp';

	let input = $state('');
	let zone = $state('UTC');
	let zones = $state<string[]>(['UTC']);
	let now = $state(new Date());

	onMount(() => {
		zones = availableTimeZones();
		zone = localTimeZone();
		useNow();
	});

	function useNow(): void {
		now = new Date();
		input = String(Math.floor(now.getTime() / 1000));
	}

	const moment = $derived(parseMoment(input));
	const rows = $derived.by((): { label: string; value: string }[] => {
		if (!moment) {
			return [];
		}
		const { date } = moment;
		return [
			{ label: t('ts.seconds'), value: String(Math.floor(date.getTime() / 1000)) },
			{ label: t('ts.milliseconds'), value: String(date.getTime()) },
			{ label: 'ISO 8601 (UTC)', value: date.toISOString() },
			{ label: zone, value: formatInZone(date, zone, i18n.intlLocale) },
			{ label: t('ts.relative'), value: relativeTime(date, now, i18n.intlLocale) }
		];
	});
</script>

<div class="stack">
	<div class="panel">
		<div class="panel-head">
			<label for="ts-input">{t('ts.input')}</label>
			<button type="button" class="btn small" onclick={useNow}>{t('ts.now')}</button>
		</div>
		<input
			id="ts-input"
			class="input mono"
			type="text"
			bind:value={input}
			spellcheck="false"
			placeholder="1700000000 · 2024-02-29T12:00:00Z"
			aria-invalid={input.trim() !== '' && moment === undefined}
		/>
		<div class="field">
			<label for="ts-zone">{t('ts.zone')}</label>
			<select id="ts-zone" class="input" bind:value={zone}>
				{#each zones as option (option)}
					<option value={option}>{option}</option>
				{/each}
			</select>
		</div>
	</div>

	{#if moment}
		<div class="panel">
			<p class="muted small-text">
				{moment.interpretedAs === 'seconds'
					? t('ts.asSeconds')
					: moment.interpretedAs === 'milliseconds'
						? t('ts.asMilliseconds')
						: t('ts.asText')}
			</p>
			<ul class="results">
				{#each rows as row (row.label)}
					<li>
						<span class="results-label">{row.label}</span>
						<code class="results-value">{row.value}</code>
						<CopyButton value={row.value} />
					</li>
				{/each}
			</ul>
		</div>
	{:else if input.trim() !== ''}
		<Notice tone="error">{t('ts.errInvalid')}</Notice>
	{/if}
</div>
