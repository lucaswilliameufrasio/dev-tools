<script lang="ts">
	import { i18n, t, type MessageKey } from '#lib/i18n/index.svelte.js';
	import Notice from '#lib/ui/Notice.svelte';
	import OutputBox from '#lib/ui/OutputBox.svelte';
	import { relativeTime } from '../timestamp/timestamp';
	import { decodeJwt, type JwtTime } from './jwt';

	// Public sample token from the JWT spec examples; it carries no real data.
	let input = $state(
		'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
	);

	const result = $derived(input.trim() === '' ? undefined : decodeJwt(input));

	function pretty(value: unknown): string {
		return JSON.stringify(value, undefined, 2);
	}

	function status(time: JwtTime): MessageKey | undefined {
		const now = Date.now();
		if (time.claim === 'exp') {
			return time.date.getTime() < now ? 'jwt.expired' : 'jwt.valid';
		}
		if (time.claim === 'nbf') {
			return time.date.getTime() > now ? 'jwt.notYet' : undefined;
		}
		return undefined;
	}
</script>

<div class="stack">
	<div class="panel">
		<div class="panel-head">
			<label for="jwt-input">{t('jwt.token')}</label>
			<button type="button" class="btn small" onclick={() => (input = '')}>{t('common.clear')}</button>
		</div>
		<textarea
			id="jwt-input"
			class="area"
			rows="5"
			bind:value={input}
			spellcheck="false"
			aria-invalid={result !== undefined && !result.ok}
		></textarea>
	</div>

	<Notice tone="info">{t('jwt.noVerify')}</Notice>

	{#if result && !result.ok}
		<Notice tone="error">{t(`jwt.err.${result.reason}` as MessageKey)}</Notice>
	{:else if result}
		<div class="io">
			<OutputBox id="jwt-header" label="Header" value={pretty(result.token.header)} rows={8} />
			<OutputBox id="jwt-payload" label="Payload" value={pretty(result.token.payload)} rows={8} />
		</div>
		{#if result.token.times.length > 0}
			<div class="panel">
				<div class="panel-head"><h2>{t('jwt.times')}</h2></div>
				<ul class="results">
					{#each result.token.times as time (time.claim)}
						{@const state = status(time)}
						<li>
							<span class="results-label mono">{time.claim}</span>
							<span class="results-value">
								<code>{time.date.toISOString()}</code>
								<span class="muted">· {relativeTime(time.date, new Date(), i18n.intlLocale)}</span>
							</span>
							{#if state}
								<span class="pill" class:bad={state !== 'jwt.valid'}>{t(state)}</span>
							{/if}
						</li>
					{/each}
				</ul>
			</div>
		{/if}
		<OutputBox id="jwt-signature" label={t('jwt.signature')} value={result.token.signature} rows={2} />
	{/if}
</div>
