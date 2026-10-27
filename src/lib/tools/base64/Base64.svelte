<script lang="ts">
	import { downloadBytes, formatBytes } from '#lib/download.js';
	import { t } from '#lib/i18n/index.svelte.js';
	import Notice from '#lib/ui/Notice.svelte';
	import OutputBox from '#lib/ui/OutputBox.svelte';
	import Segmented from '#lib/ui/Segmented.svelte';
	import {
		decodeText,
		decodeToBytes,
		encodeBytes,
		encodeText,
		type Base64Variant
	} from './base64';

	type Mode = 'encode' | 'decode';
	type Source = { kind: 'text' } | { kind: 'file'; name: string; bytes: Uint8Array };

	let mode = $state<Mode>('encode');
	let variant = $state<Base64Variant>('standard');
	let padding = $state(true);
	let input = $state('Olá, mundo! 👋');
	let source = $state<Source>({ kind: 'text' });

	const encoded = $derived.by((): string => {
		if (mode !== 'encode') {
			return '';
		}
		if (source.kind === 'file') {
			return encodeBytes(source.bytes, variant, padding);
		}
		return encodeText(input, variant, padding);
	});
	const decoded = $derived(mode === 'decode' ? decodeText(input) : undefined);
	const output = $derived(mode === 'encode' ? encoded : decoded?.ok ? decoded.text : '');

	async function pickFile(event: Event & { currentTarget: HTMLInputElement }): Promise<void> {
		const file = event.currentTarget.files?.[0];
		if (!file) {
			return;
		}
		source = { kind: 'file', name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) };
		event.currentTarget.value = '';
	}

	function downloadDecoded(): void {
		const result = decodeToBytes(input);
		if (result.ok) {
			downloadBytes('decoded.bin', result.bytes);
		}
	}
</script>

<div class="stack">
	<div class="row">
		<Segmented
			name="b64-mode"
			legend={t('common.mode')}
			bind:value={mode}
			options={[
				{ value: 'encode', label: t('common.encode') },
				{ value: 'decode', label: t('common.decode') }
			]}
		/>
		{#if mode === 'encode'}
			<Segmented
				name="b64-variant"
				legend={t('b64.variant')}
				bind:value={variant}
				options={[
					{ value: 'standard', label: t('b64.standard') },
					{ value: 'url', label: t('b64.urlsafe') }
				]}
			/>
			<label class="check">
				<input type="checkbox" bind:checked={padding} />
				<span>{t('b64.padding')}</span>
			</label>
		{/if}
	</div>

	<div class="io">
		<div class="panel">
			<div class="panel-head">
				<label for="b64-input">{t('common.input')}</label>
				<div class="row tight">
					{#if mode === 'encode'}
						<label class="btn small file-pick">
							{t('b64.pickFile')}
							<input type="file" onchange={pickFile} />
						</label>
					{/if}
					<button
						type="button"
						class="btn small"
						onclick={() => {
							input = '';
							source = { kind: 'text' };
						}}
					>
						{t('common.clear')}
					</button>
				</div>
			</div>
			{#if mode === 'encode' && source.kind === 'file'}
				<div class="file-card">
					<span class="mono">{source.name}</span>
					<span class="muted">{formatBytes(source.bytes.length)}</span>
					<button type="button" class="btn small" onclick={() => (source = { kind: 'text' })}>
						{t('b64.removeFile')}
					</button>
				</div>
			{:else}
				<textarea
					id="b64-input"
					class="area"
					rows="8"
					bind:value={input}
					spellcheck="false"
					autocomplete="off"
				></textarea>
			{/if}
		</div>

		<div class="stack">
			<OutputBox id="b64-output" label={t('common.output')} value={output} />
			{#if decoded && !decoded.ok}
				<Notice tone="error">
					{decoded.reason === 'invalid' ? t('b64.errInvalid') : t('b64.errNotUtf8')}
				</Notice>
				{#if decoded.reason === 'not-utf8'}
					<div>
						<button type="button" class="btn" onclick={downloadDecoded}>{t('b64.download')}</button>
					</div>
				{/if}
			{/if}
		</div>
	</div>
</div>
