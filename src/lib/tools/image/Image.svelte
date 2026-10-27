<script lang="ts">
	import { onMount } from 'svelte';
	import { downloadBytes, formatBytes } from '#lib/download.js';
	import { t } from '#lib/i18n/index.svelte.js';
	import CopyButton from '#lib/ui/CopyButton.svelte';
	import Notice from '#lib/ui/Notice.svelte';
	import {
		baseName,
		buildDataUri,
		bytesToBase64,
		cssSnippet,
		extensionFor,
		formatPercent,
		imgSnippet,
		isOutputFormat,
		MAX_DIMENSION,
		OUTPUT_FORMATS,
		percentSaved,
		sniffMime,
		targetSize,
		type OutputFormat
	} from './image';

	type Loaded = {
		name: string;
		declaredType: string;
		mime: string | undefined;
		bytes: Uint8Array;
		url: string;
		width: number;
		height: number;
	};
	type Source = { kind: 'none' } | { kind: 'busy' } | { kind: 'error'; reason: 'notImage' | 'tooLarge' } | ({ kind: 'loaded' } & Loaded);
	type Conversion =
		| { kind: 'idle' }
		| { kind: 'busy' }
		| { kind: 'error' }
		| { kind: 'done'; bytes: Uint8Array; mime: string; width: number; height: number; url: string };

	const SHOW_LIMIT = 200_000;

	let source = $state<Source>({ kind: 'none' });
	let conversion = $state<Conversion>({ kind: 'idle' });
	let supported = $state<OutputFormat[]>(['image/png']);
	let unsupported = $state<OutputFormat[]>([]);
	let format = $state<OutputFormat>('image/webp');
	let quality = $state(80);
	let maxWidth = $state<number | undefined>(undefined);
	let maxHeight = $state<number | undefined>(undefined);
	let keepAspect = $state(true);
	let dragging = $state(false);
	let sequence = 0;

	const loaded = $derived(source.kind === 'loaded' ? source : undefined);
	const base64 = $derived(loaded ? bytesToBase64(loaded.bytes) : '');
	const dataUri = $derived(
		loaded ? buildDataUri(loaded.mime ?? loaded.declaredType, loaded.bytes) : ''
	);
	const outputs = $derived(
		loaded
			? [
					{ id: 'image-datauri', label: t('image.dataUri'), value: dataUri },
					{ id: 'image-base64', label: t('image.base64'), value: base64 },
					{
						id: 'image-imgtag',
						label: t('image.imgTag'),
						value: imgSnippet(dataUri, { width: loaded.width, height: loaded.height })
					},
					{ id: 'image-css', label: t('image.css'), value: cssSnippet(dataUri) }
				]
			: []
	);
	const mismatch = $derived(
		loaded && loaded.mime !== undefined && loaded.declaredType !== '' && loaded.declaredType !== loaded.mime
			? { declared: loaded.declaredType, detected: loaded.mime }
			: undefined
	);

	function canvasToBlob(canvas: HTMLCanvasElement, mime: string, q?: number): Promise<Blob | null> {
		return new Promise((resolve) => {
			canvas.toBlob(resolve, mime, q);
		});
	}

	onMount(() => {
		void (async () => {
			const canvas = document.createElement('canvas');
			canvas.width = 1;
			canvas.height = 1;
			const ok: OutputFormat[] = [];
			const missing: OutputFormat[] = [];
			for (const candidate of OUTPUT_FORMATS) {
				const blob = await canvasToBlob(canvas, candidate, 0.8);
				if (blob && blob.type === candidate) {
					ok.push(candidate);
				} else {
					missing.push(candidate);
				}
			}
			supported = ok.length > 0 ? ok : ['image/png'];
			unsupported = missing;
			if (!supported.includes(format)) {
				format = supported.includes('image/jpeg') ? 'image/jpeg' : 'image/png';
			}
		})();
	});

	function loadElement(url: string): Promise<HTMLImageElement | undefined> {
		return new Promise((resolve) => {
			const element = new Image();
			element.onload = () => resolve(element);
			element.onerror = () => resolve(undefined);
			element.src = url;
		});
	}

	function release(): void {
		if (source.kind === 'loaded') {
			URL.revokeObjectURL(source.url);
		}
		if (conversion.kind === 'done') {
			URL.revokeObjectURL(conversion.url);
		}
	}

	async function openFile(file: File): Promise<void> {
		release();
		conversion = { kind: 'idle' };
		source = { kind: 'busy' };
		const bytes = new Uint8Array(await file.arrayBuffer());
		const url = URL.createObjectURL(new Blob([bytes], { type: file.type }));
		const element = await loadElement(url);
		if (!element || element.naturalWidth === 0 || element.naturalHeight === 0) {
			URL.revokeObjectURL(url);
			source = { kind: 'error', reason: 'notImage' };
			return;
		}
		source = {
			kind: 'loaded',
			name: file.name === '' ? 'image' : file.name,
			declaredType: file.type,
			mime: sniffMime(bytes),
			bytes,
			url,
			width: element.naturalWidth,
			height: element.naturalHeight
		};
	}

	function clear(): void {
		release();
		conversion = { kind: 'idle' };
		source = { kind: 'none' };
	}

	function onPick(event: Event & { currentTarget: HTMLInputElement }): void {
		const file = event.currentTarget.files?.[0];
		if (file) {
			void openFile(file);
		}
		event.currentTarget.value = '';
	}

	function onDrop(event: DragEvent): void {
		event.preventDefault();
		dragging = false;
		const file = event.dataTransfer?.files[0];
		if (file) {
			void openFile(file);
		}
	}

	function onPaste(event: ClipboardEvent): void {
		const file = event.clipboardData?.files[0];
		if (file && file.type.startsWith('image/')) {
			event.preventDefault();
			void openFile(file);
		}
	}

	function onFormat(event: Event & { currentTarget: HTMLSelectElement }): void {
		const value = event.currentTarget.value;
		if (isOutputFormat(value)) {
			format = value;
		}
	}

	function parseLimit(event: Event & { currentTarget: HTMLInputElement }): number | undefined {
		const value = event.currentTarget.valueAsNumber;
		return Number.isFinite(value) && value > 0 ? value : undefined;
	}

	$effect(() => {
		const current = loaded;
		const chosen = format;
		const q = quality / 100;
		const limitW = maxWidth;
		const limitH = maxHeight;
		const aspect = keepAspect;
		sequence += 1;
		const mine = sequence;
		if (!current) {
			return;
		}
		void (async () => {
			const size = targetSize(
				{ width: current.width, height: current.height },
				limitW,
				limitH,
				aspect
			);
			const element = await loadElement(current.url);
			if (!element || size.width > MAX_DIMENSION || size.height > MAX_DIMENSION) {
				if (mine === sequence) {
					conversion = { kind: 'error' };
				}
				return;
			}
			const canvas = document.createElement('canvas');
			canvas.width = size.width;
			canvas.height = size.height;
			const context = canvas.getContext('2d');
			if (!context) {
				if (mine === sequence) {
					conversion = { kind: 'error' };
				}
				return;
			}
			if (chosen === 'image/jpeg') {
				context.fillStyle = '#ffffff';
				context.fillRect(0, 0, size.width, size.height);
			}
			context.drawImage(element, 0, 0, size.width, size.height);
			const blob = await canvasToBlob(canvas, chosen, chosen === 'image/png' ? undefined : q);
			if (mine !== sequence) {
				return;
			}
			if (!blob) {
				conversion = { kind: 'error' };
				return;
			}
			const bytes = new Uint8Array(await blob.arrayBuffer());
			if (mine !== sequence) {
				return;
			}
			if (conversion.kind === 'done') {
				URL.revokeObjectURL(conversion.url);
			}
			conversion = {
				kind: 'done',
				bytes,
				mime: blob.type,
				width: size.width,
				height: size.height,
				url: URL.createObjectURL(blob)
			};
		})();
	});

	function downloadResult(): void {
		if (conversion.kind === 'done' && loaded) {
			downloadBytes(`${baseName(loaded.name)}.${extensionFor(conversion.mime)}`, conversion.bytes);
		}
	}
</script>

<svelte:window onpaste={onPaste} />

<div class="stack">
	<div class="panel">
		<div class="panel-head">
			<span>{t('image.pick')}</span>
			<div class="row tight">
				{#if source.kind === 'loaded'}
					<button type="button" class="btn small" onclick={clear}>{t('image.clear')}</button>
				{/if}
				<label class="btn small file-pick">
					{t('image.pick')}
					<input type="file" accept="image/*" onchange={onPick} />
				</label>
			</div>
		</div>
		<div
			class="dropzone"
			class:dragging
			role="group"
			aria-label={t('image.dropLabel')}
			ondragover={(event) => {
				event.preventDefault();
				dragging = true;
			}}
			ondragleave={() => (dragging = false)}
			ondrop={onDrop}
		>
			<span class="muted">{t('image.dropHint')}</span>
		</div>
	</div>

	{#if source.kind === 'error'}
		<Notice tone="error">
			{source.reason === 'tooLarge' ? t('image.errTooLarge') : t('image.errNotImage')}
		</Notice>
	{/if}

	{#if loaded}
		<div class="panel">
			<div class="preview">
				<img src={loaded.url} alt={t('image.previewAlt')} />
			</div>
			<ul class="results">
				<li>
					<span class="results-label">{t('image.name')}</span>
					<code class="results-value">{loaded.name}</code>
				</li>
				<li>
					<span class="results-label">{t('image.type')}</span>
					<code class="results-value">{loaded.mime ?? (loaded.declaredType || t('image.typeUnknown'))}</code>
				</li>
				<li>
					<span class="results-label">{t('image.dimensions')}</span>
					<code class="results-value">{loaded.width} × {loaded.height}</code>
				</li>
				<li>
					<span class="results-label">{t('image.size')}</span>
					<code class="results-value">{formatBytes(loaded.bytes.length)} ({loaded.bytes.length} B)</code>
				</li>
			</ul>
			{#if mismatch}
				<Notice tone="info">{t('image.typeMismatch', mismatch)}</Notice>
			{/if}
		</div>

		<div class="panel">
			<div class="panel-head"><span>{t('image.outputs')}</span></div>
			{#each outputs as output (output.id)}
				<div class="field">
					<div class="panel-head">
						<label for={output.id}>{output.label}</label>
						<CopyButton value={output.value} />
					</div>
					{#if output.value.length > SHOW_LIMIT}
						<p class="small-text muted" id={output.id}>
							{t('image.tooBigToShow', { chars: output.value.length })}
						</p>
					{:else}
						<textarea
							id={output.id}
							class="area mono"
							readonly
							rows="3"
							value={output.value}
							spellcheck="false"
						></textarea>
					{/if}
				</div>
			{/each}
		</div>

		<div class="panel">
			<div class="panel-head"><span>{t('image.convert')}</span></div>
			<div class="fields">
				<div class="field">
					<label for="image-format">{t('image.format')}</label>
					<select id="image-format" class="input" value={format} onchange={onFormat}>
						{#each supported as item (item)}
							<option value={item}>{extensionFor(item).toUpperCase()}</option>
						{/each}
					</select>
				</div>
				<div class="field">
					<label for="image-quality">
						{format === 'image/png' ? t('image.qualityNa') : t('image.quality', { value: quality })}
					</label>
					<input
						id="image-quality"
						class="range"
						type="range"
						min="1"
						max="100"
						bind:value={quality}
						disabled={format === 'image/png'}
					/>
				</div>
				<div class="field">
					<label for="image-maxw">{t('image.maxWidth')}</label>
					<input
						id="image-maxw"
						class="input"
						type="number"
						min="1"
						max={MAX_DIMENSION}
						inputmode="numeric"
						placeholder={String(loaded.width)}
						oninput={(event) => (maxWidth = parseLimit(event))}
					/>
				</div>
				<div class="field">
					<label for="image-maxh">{t('image.maxHeight')}</label>
					<input
						id="image-maxh"
						class="input"
						type="number"
						min="1"
						max={MAX_DIMENSION}
						inputmode="numeric"
						placeholder={String(loaded.height)}
						oninput={(event) => (maxHeight = parseLimit(event))}
					/>
				</div>
			</div>
			<label class="check">
				<input type="checkbox" bind:checked={keepAspect} />
				<span>{t('image.keepAspect')}</span>
			</label>
			<p class="small-text muted">{t('image.limitHint')}</p>
			{#if unsupported.length > 0}
				<Notice tone="info">
					{t('image.fallback', {
						formats: unsupported.map((item) => extensionFor(item).toUpperCase()).join(', ')
					})}
				</Notice>
			{/if}
			{#if format === 'image/jpeg'}
				<p class="small-text muted">{t('image.transparencyNote')}</p>
			{/if}
			<Notice tone="info">{t('image.exifNote')}</Notice>
		</div>

		<div class="panel">
			<div class="panel-head">
				<span>{t('image.resultTitle')}</span>
				<button
					type="button"
					class="btn small primary"
					onclick={downloadResult}
					disabled={conversion.kind !== 'done'}
				>
					{t('image.download')}
				</button>
			</div>
			{#if conversion.kind === 'done'}
				{@const delta = percentSaved(loaded.bytes.length, conversion.bytes.length)}
				{#if conversion.mime !== format}
					<Notice tone="error">{t('image.fallbackResult', { actual: conversion.mime })}</Notice>
				{/if}
				<div class="preview">
					<img src={conversion.url} alt={t('image.previewAlt')} />
				</div>
				<ul class="results">
					<li>
						<span class="results-label">{t('image.resultSize')}</span>
						<code class="results-value">{formatBytes(conversion.bytes.length)}</code>
					</li>
					<li>
						<span class="results-label">{t('image.resultDims')}</span>
						<code class="results-value">{conversion.width} × {conversion.height}</code>
					</li>
					<li>
						<span class="results-label">{t('image.saved')}</span>
						<code class="results-value">{formatPercent(delta)}</code>
					</li>
				</ul>
				{#if delta < 0}
					<Notice tone="info">{t('image.larger')}</Notice>
				{/if}
			{:else if conversion.kind === 'error'}
				<Notice tone="error">{t('image.errConvert')}</Notice>
			{:else}
				<Notice tone="info">{t('image.converting')}</Notice>
			{/if}
		</div>
	{:else if source.kind === 'busy'}
		<Notice tone="info">{t('image.converting')}</Notice>
	{/if}
</div>

<style>
	.dropzone {
		display: grid;
		place-items: center;
		min-height: 110px;
		padding: 16px;
		text-align: center;
		border: 2px dashed var(--line);
		border-radius: var(--radius);
		background: var(--surface-2);
	}

	.dropzone.dragging {
		border-color: var(--accent);
		background: var(--accent-soft);
	}

	.preview {
		display: flex;
		justify-content: center;
		padding: 12px;
		background: var(--surface-2);
		border-radius: var(--radius);
	}

	.preview img {
		max-width: 100%;
		max-height: 320px;
		object-fit: contain;
	}
</style>
