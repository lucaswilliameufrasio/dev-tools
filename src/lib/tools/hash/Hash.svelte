<script lang="ts">
	import { formatBytes } from '#lib/download.js';
	import { t } from '#lib/i18n/index.svelte.js';
	import CopyButton from '#lib/ui/CopyButton.svelte';
	import Notice from '#lib/ui/Notice.svelte';
	import { digest, hmac, HASH_ALGORITHMS, type HashAlgorithm } from './hash';

	type Source = { kind: 'text' } | { kind: 'file'; name: string; bytes: Uint8Array };
	type Row = { algorithm: HashAlgorithm; hex: string };

	const encoder = new TextEncoder();

	let input = $state('olá, mundo');
	let source = $state<Source>({ kind: 'text' });
	let secret = $state('');
	let uppercase = $state(false);
	let rows = $state<Row[]>([]);
	let failed = $state(false);
	let sequence = 0;

	$effect(() => {
		const data = source.kind === 'file' ? source.bytes : encoder.encode(input);
		const key = secret === '' ? undefined : encoder.encode(secret);
		sequence += 1;
		const current = sequence;
		void (async () => {
			try {
				const computed: Row[] = [];
				for (const algorithm of HASH_ALGORITHMS) {
					const hex = key ? await hmac(algorithm, key, data) : await digest(algorithm, data);
					computed.push({ algorithm, hex });
				}
				if (current === sequence) {
					rows = computed;
					failed = false;
				}
			} catch {
				if (current === sequence) {
					failed = true;
				}
			}
		})();
	});

	async function pickFile(event: Event & { currentTarget: HTMLInputElement }): Promise<void> {
		const file = event.currentTarget.files?.[0];
		if (!file) {
			return;
		}
		source = { kind: 'file', name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) };
		event.currentTarget.value = '';
	}
</script>

<div class="stack">
	<div class="panel">
		<div class="panel-head">
			<label for="hash-input">{t('common.input')}</label>
			<label class="btn small file-pick">
				{t('b64.pickFile')}
				<input type="file" onchange={pickFile} />
			</label>
		</div>
		{#if source.kind === 'file'}
			<div class="file-card">
				<span class="mono">{source.name}</span>
				<span class="muted">{formatBytes(source.bytes.length)}</span>
				<button type="button" class="btn small" onclick={() => (source = { kind: 'text' })}>
					{t('b64.removeFile')}
				</button>
			</div>
		{:else}
			<textarea id="hash-input" class="area" rows="5" bind:value={input} spellcheck="false"
			></textarea>
		{/if}
	</div>

	<div class="panel">
		<div class="field">
			<label for="hash-secret">{t('hash.secret')}</label>
			<input
				id="hash-secret"
				class="input mono"
				type="text"
				bind:value={secret}
				spellcheck="false"
				autocomplete="off"
				placeholder={t('hash.secretHint')}
			/>
		</div>
		<label class="check">
			<input type="checkbox" bind:checked={uppercase} />
			<span>{t('hash.uppercase')}</span>
		</label>
	</div>

	{#if failed}
		<Notice tone="error">{t('hash.errUnavailable')}</Notice>
	{:else}
		<div class="panel">
			<ul class="results">
				{#each rows as row (row.algorithm)}
					{@const value = uppercase ? row.hex.toUpperCase() : row.hex}
					<li>
						<span class="results-label mono">{secret === '' ? row.algorithm : `HMAC ${row.algorithm}`}</span>
						<code class="results-value">{value}</code>
						<CopyButton {value} />
					</li>
				{/each}
			</ul>
		</div>
	{/if}
	<Notice tone="info">{t('hash.noMd5')}</Notice>
</div>
