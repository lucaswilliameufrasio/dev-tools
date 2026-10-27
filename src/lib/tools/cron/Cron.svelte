<script lang="ts">
	import { i18n, t, type MessageKey } from '#lib/i18n/index.svelte.js';
	import Notice from '#lib/ui/Notice.svelte';
	import Segmented from '#lib/ui/Segmented.svelte';
	import { localTimeZone, relativeTime } from '../timestamp/timestamp';
	import { nextRuns, parseCron, type CronError } from './cron';
	import { breakdown, FIELD_LABEL_KEYS, summarize } from './explain';

	type Preset = { expr: string; label: MessageKey; seconds: boolean };

	const PRESETS: Preset[] = [
		{ expr: '* * * * *', label: 'cron.preset.minute', seconds: false },
		{ expr: '*/5 * * * *', label: 'cron.preset.every5', seconds: false },
		{ expr: '0 * * * *', label: 'cron.preset.hourly', seconds: false },
		{ expr: '0 0 * * *', label: 'cron.preset.daily', seconds: false },
		{ expr: '0 9 * * 1-5', label: 'cron.preset.weekdays9', seconds: false },
		{ expr: '30 8 * * MON', label: 'cron.preset.monday', seconds: false },
		{ expr: '0 0 1 * *', label: 'cron.preset.monthStart', seconds: false },
		{ expr: '0 0 1 1 *', label: 'cron.preset.newYear', seconds: false },
		{ expr: '0 0 29 2 *', label: 'cron.preset.leap', seconds: false },
		{ expr: '*/30 * * * * *', label: 'cron.preset.seconds30', seconds: true }
	];

	let expression = $state('*/15 9-17 * * 1-5');
	let seconds = $state(false);
	let zoneKind = $state<'utc' | 'local'>('utc');
	let count = $state(10);
	// Time-dependent values are filled after mount because pages are prerendered.
	let now = $state<Date | undefined>(undefined);
	let localZone = $state('UTC');

	$effect(() => {
		now = new Date();
		localZone = localTimeZone();
	});

	const parsed = $derived(parseCron(expression, { seconds }));
	const zone = $derived(zoneKind === 'utc' ? 'UTC' : localZone);
	const safeCount = $derived(Math.min(50, Math.max(1, Math.floor(count) || 10)));

	const summary = $derived(parsed.ok ? summarize(parsed.cron, t, i18n.intlLocale) : undefined);
	const rows = $derived(parsed.ok ? breakdown(parsed.cron, t, i18n.intlLocale) : []);
	const runs = $derived(parsed.ok && now ? nextRuns(parsed.cron, now, safeCount, zone) : []);
	const bothDays = $derived(
		parsed.ok && !parsed.cron.fields.dayOfMonth.star && !parsed.cron.fields.dayOfWeek.star
	);

	function errorText(error: CronError): string {
		const field = error.field === undefined ? '' : t(FIELD_LABEL_KEYS[error.field]);
		const params = { field, token: error.token, min: error.min, max: error.max };
		if (error.reason === 'empty') {
			return t('cron.err.empty');
		}
		if (error.reason === 'macro') {
			return t('cron.err.macro', params);
		}
		if (error.reason === 'fieldCount') {
			const layout = seconds ? t('cron.layout6') : t('cron.layout5');
			const base = t('cron.err.fieldCount', {
				expected: error.expected ?? 0,
				found: error.found ?? 0,
				layout
			});
			if (!seconds && error.found === 6) {
				return `${base} ${t('cron.err.fieldCountHint5')}`;
			}
			if (seconds && error.found === 5) {
				return `${base} ${t('cron.err.fieldCountHint6')}`;
			}
			return base;
		}
		if (error.reason === 'range') {
			return t('cron.err.range', params);
		}
		if (error.reason === 'order') {
			return t('cron.err.order', params);
		}
		if (error.reason === 'step') {
			return t('cron.err.step', params);
		}
		return t('cron.err.syntax', params);
	}

	function applyPreset(preset: Preset): void {
		expression = preset.expr;
		seconds = preset.seconds;
	}

	function formatRun(date: Date): string {
		return new Intl.DateTimeFormat(i18n.intlLocale, {
			dateStyle: 'full',
			timeStyle: seconds ? 'long' : 'short',
			timeZone: zone
		}).format(date);
	}
</script>

<div class="stack">
	<div class="panel">
		<div class="panel-head">
			<label for="cron-expr">{t('cron.expr')}</label>
			<button type="button" class="btn small" onclick={() => (expression = '')}>{t('common.clear')}</button>
		</div>
		<input
			id="cron-expr"
			class="input mono"
			type="text"
			bind:value={expression}
			spellcheck="false"
			autocomplete="off"
			autocapitalize="off"
			aria-invalid={!parsed.ok}
			aria-describedby="cron-layout"
		/>
		<p id="cron-layout" class="muted small-text mono">{seconds ? t('cron.layout6') : t('cron.layout5')}</p>
	</div>

	<div class="row">
		<label class="check">
			<input type="checkbox" bind:checked={seconds} />
			<span>{t('cron.seconds')}</span>
		</label>
		<Segmented
			name="cron-zone"
			legend={t('cron.tz')}
			bind:value={zoneKind}
			options={[
				{ value: 'utc', label: t('cron.tz.utc') },
				{ value: 'local', label: t('cron.tz.local', { zone: localZone }) }
			]}
		/>
	</div>

	<div class="panel">
		<div class="panel-head"><h2>{t('cron.presets')}</h2></div>
		<div class="row tight">
			{#each PRESETS as preset (preset.expr)}
				<button type="button" class="btn small" onclick={() => applyPreset(preset)}>
					{t(preset.label)}
					<span class="mono muted">{preset.expr}</span>
				</button>
			{/each}
		</div>
	</div>

	{#if !parsed.ok}
		{#each parsed.errors as error, index (index)}
			<Notice tone={error.reason === 'empty' ? 'info' : 'error'}>{errorText(error)}</Notice>
		{/each}
	{:else}
		<div class="panel">
			<div class="panel-head"><h2>{t('cron.summary')}</h2></div>
			<p class="summary">{summary ?? t('cron.noSummary')}</p>
			{#if parsed.cron.macro !== undefined}
				<p class="muted small-text">{t('cron.macroNote', { expanded: parsed.cron.macro })}</p>
			{/if}
			{#if bothDays}
				<p class="muted small-text">{t('cron.orNote')}</p>
			{/if}
		</div>

		<div class="panel">
			<div class="panel-head"><h2>{t('cron.breakdown')}</h2></div>
			<div class="table-wrap">
				<table>
					<thead>
						<tr>
							<th scope="col">{t('cron.col.field')}</th>
							<th scope="col">{t('cron.col.value')}</th>
							<th scope="col">{t('cron.col.meaning')}</th>
						</tr>
					</thead>
					<tbody>
						{#each rows as row (row.field)}
							<tr>
								<th scope="row">{t(FIELD_LABEL_KEYS[row.field])}</th>
								<td class="mono">{row.raw}</td>
								<td>{row.meaning}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<div class="panel">
			<div class="panel-head">
				<h2>{t('cron.next')}</h2>
				<div class="field compact">
					<label for="cron-count">{t('cron.nextCount')}</label>
					<input id="cron-count" class="input mono" type="number" min="1" max="50" bind:value={count} />
				</div>
			</div>
			{#if now === undefined}
				<p class="muted">…</p>
			{:else if runs.length === 0}
				<p class="muted">{t('cron.nextNone')}</p>
			{:else}
				<ol class="results">
					{#each runs as run (run.getTime())}
						<li>
							<span class="results-label mono">{formatRun(run)}</span>
							<span class="results-value muted">{relativeTime(run, now, i18n.intlLocale)}</span>
						</li>
					{/each}
				</ol>
				{#if runs.length < safeCount}
					<p class="muted small-text">{t('cron.nextFewer', { n: runs.length })}</p>
				{/if}
			{/if}
			<p class="muted small-text">{t('cron.dstNote')}</p>
		</div>
	{/if}
</div>

<style>
	.summary {
		font-size: 1.125rem;
		margin: 0;
	}
</style>
