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
		fileFromBytes,
		formatPercent,
		imgSnippet,
		isOutputFormat,
		isZipFile,
		looksLikeImage,
		MAX_DIMENSION,
		MAX_QUEUE,
		MAX_ZIP_BYTES,
		OUTPUT_FORMATS,
		percentSaved,
		readZipImages,
		sniffMime,
		targetSize,
		type OutputFormat,
		type ZipRead
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
	type SourceError = 'notImage' | 'tooLarge';
	type BatchError = 'none' | 'tooBig' | 'invalidZip' | 'encryptedZip' | 'unsupportedZip' | 'folder';
	type QueuedImage = { name: string; file: File };
	type Batch =
		| { kind: 'none' }
		| { kind: 'reading' }
		| { kind: 'error'; reason: BatchError }
		| {
				kind: 'ready';
				items: QueuedImage[];
				index: number;
				skipped: number;
				truncated: boolean;
				partial: boolean;
				warning: BatchError | undefined;
		  };
	type Source =
		| { kind: 'none' }
		| { kind: 'busy' }
		| { kind: 'error'; reason: SourceError }
		| ({ kind: 'loaded' } & Loaded);
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
	let batch = $state.raw<Batch>({ kind: 'none' });
	let sequence = 0;
	let intakeToken = 0;
	let openToken = 0;

	const queue = $derived(batch.kind === 'ready' ? batch : undefined);
	const currentName = $derived(queue === undefined ? '' : (queue.items[queue.index]?.name ?? ''));

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

	async function openQueued(item: QueuedImage): Promise<void> {
		const token = ++openToken;
		release();
		conversion = { kind: 'idle' };
		source = { kind: 'busy' };
		const bytes = new Uint8Array(await item.file.arrayBuffer());
		if (token !== openToken) {
			return;
		}
		const url = URL.createObjectURL(new Blob([bytes], { type: item.file.type }));
		const element = await loadElement(url);
		if (token !== openToken) {
			URL.revokeObjectURL(url);
			return;
		}
		if (!element || element.naturalWidth === 0 || element.naturalHeight === 0) {
			URL.revokeObjectURL(url);
			source = { kind: 'error', reason: 'notImage' };
			return;
		}
		source = {
			kind: 'loaded',
			name: item.name === '' ? 'image' : item.name,
			declaredType: item.file.type,
			mime: sniffMime(bytes),
			bytes,
			url,
			width: element.naturalWidth,
			height: element.naturalHeight
		};
	}

	function clear(): void {
		intakeToken += 1;
		openToken += 1;
		release();
		conversion = { kind: 'idle' };
		source = { kind: 'none' };
		batch = { kind: 'none' };
	}

	function listFiles(list: FileList | null | undefined): File[] {
		const files: File[] = [];
		if (list === null || list === undefined) {
			return files;
		}
		for (let index = 0; index < list.length; index += 1) {
			const file = list[index];
			if (file !== undefined) {
				files.push(file);
			}
		}
		return files;
	}

	function isDirectoryEntry(entry: FileSystemEntry): entry is FileSystemDirectoryEntry {
		return entry.isDirectory;
	}

	function isFileEntry(entry: FileSystemEntry): entry is FileSystemFileEntry {
		return entry.isFile;
	}

	function fileFromEntry(entry: FileSystemFileEntry): Promise<File | undefined> {
		return new Promise((resolve) => {
			entry.file(
				(file) => resolve(file),
				() => resolve(undefined)
			);
		});
	}

	function readEntryPage(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[] | undefined> {
		return new Promise((resolve) => {
			reader.readEntries(
				(entries) => resolve(entries),
				() => resolve(undefined)
			);
		});
	}

	const MAX_SCAN = 2000;
	const MAX_DEPTH = 8;

	async function walkDirectory(
		entry: FileSystemDirectoryEntry,
		prefix: string,
		depth: number,
		images: QueuedImage[],
		zips: File[],
		state: { seen: number; skipped: number; truncated: boolean; failed: boolean }
	): Promise<void> {
		if (depth > MAX_DEPTH || state.failed || state.truncated) {
			return;
		}
		const reader = entry.createReader();
		while (!state.failed && !state.truncated) {
			const page = await readEntryPage(reader);
			if (page === undefined) {
				state.failed = true;
				return;
			}
			if (page.length === 0) {
				return;
			}
			for (let index = 0; index < page.length; index += 1) {
				const child = page[index];
				if (child === undefined) {
					continue;
				}
				state.seen += 1;
				if (state.seen > MAX_SCAN) {
					state.truncated = true;
					return;
				}
				const name = `${prefix}${child.name}`;
				if (name.startsWith('__MACOSX/') || child.name === '__MACOSX') {
					continue;
				}
				if (isDirectoryEntry(child)) {
					await walkDirectory(child, `${name}/`, depth + 1, images, zips, state);
					continue;
				}
				if (!isFileEntry(child)) {
					continue;
				}
				const file = await fileFromEntry(child);
				if (file === undefined) {
					state.skipped += 1;
					continue;
				}
				if (isZipFile({ name, type: file.type })) {
					zips.push(file);
					continue;
				}
				if (looksLikeImage({ name, type: file.type })) {
					images.push({ name, file });
					continue;
				}
				state.skipped += 1;
			}
		}
	}

	function zipFailure(reason: 'invalid' | 'encrypted' | 'unsupported' | 'tooBig'): BatchError {
		switch (reason) {
			case 'invalid':
				return 'invalidZip';
			case 'encrypted':
				return 'encryptedZip';
			case 'unsupported':
				return 'unsupportedZip';
			case 'tooBig':
				return 'tooBig';
		}
	}

	async function imagesFromZip(file: File, room: number): Promise<{
		images: QueuedImage[];
		skipped: number;
		truncated: boolean;
		oversized: boolean;
		failure: BatchError | undefined;
	}> {
		if (file.size > MAX_ZIP_BYTES) {
			return { images: [], skipped: 0, truncated: false, oversized: false, failure: 'tooBig' };
		}
		const bytes = new Uint8Array(await file.arrayBuffer());
		const read: ZipRead = await readZipImages(bytes, room);
		if (!read.ok) {
			return { images: [], skipped: 0, truncated: false, oversized: false, failure: zipFailure(read.reason) };
		}
		const images: QueuedImage[] = [];
		for (let index = 0; index < read.images.length; index += 1) {
			const image = read.images[index];
			if (image === undefined) {
				continue;
			}
			const mime = sniffMime(image.bytes) ?? 'application/octet-stream';
			const base = image.name.split('/').pop();
			const leaf = base === undefined || base === '' ? 'image' : base;
			images.push({
				name: image.name,
				file: fileFromBytes(leaf, image.bytes, mime)
			});
		}
		return {
			images,
			skipped: read.skipped,
			truncated: read.truncated,
			oversized: read.oversized,
			failure: undefined
		};
	}

	async function gather(
		files: File[],
		directories: FileSystemDirectoryEntry[],
		token: number
	): Promise<
		| { kind: 'error'; reason: BatchError }
		| {
				kind: 'ready';
				items: QueuedImage[];
				skipped: number;
				truncated: boolean;
				partial: boolean;
				warning: BatchError | undefined;
		  }
		| undefined
	> {
		const loose: QueuedImage[] = [];
		const folderImages: QueuedImage[] = [];
		const zips: File[] = [];
		let skipped = 0;
		let truncated = false;
		let partial = false;
		let zipProblem: BatchError | undefined;
		let directImages = 0;
		let directZips = 0;
		for (let index = 0; index < files.length; index += 1) {
			const file = files[index];
			if (file === undefined) {
				continue;
			}
			if (isZipFile(file)) {
				directZips += 1;
			} else if (looksLikeImage(file)) {
				directImages += 1;
			}
		}
		const onlyUnknown = files.length === 1 && directories.length === 0 && directZips === 0 && directImages === 0;
		for (let index = 0; index < files.length; index += 1) {
			const file = files[index];
			if (file === undefined) {
				continue;
			}
			if (isZipFile(file)) {
				zips.push(file);
				continue;
			}
			if (looksLikeImage(file) || onlyUnknown) {
				loose.push({ name: file.name === '' ? 'image' : file.name, file });
				continue;
			}
			skipped += 1;
		}
		const walk = { seen: 0, skipped: 0, truncated: false, failed: false };
		for (let index = 0; index < directories.length; index += 1) {
			const directory = directories[index];
			if (directory === undefined || walk.failed || walk.truncated) {
				continue;
			}
			const prefix = directory.name === '' ? '' : `${directory.name}/`;
			await walkDirectory(directory, prefix, 0, folderImages, zips, walk);
			if (token !== intakeToken) {
				return undefined;
			}
		}
		if (walk.failed) {
			return { kind: 'error', reason: 'folder' };
		}
		skipped += walk.skipped;
		if (walk.truncated) {
			partial = true;
		}
		folderImages.sort((left, right) => left.name.localeCompare(right.name));
		const fromZips: QueuedImage[] = [];
		for (let index = 0; index < zips.length; index += 1) {
			const zip = zips[index];
			if (zip === undefined) {
				continue;
			}
			const held = loose.length + folderImages.length + fromZips.length;
			if (held >= MAX_QUEUE) {
				truncated = true;
				break;
			}
			const extracted = await imagesFromZip(zip, MAX_QUEUE - held);
			if (token !== intakeToken) {
				return undefined;
			}
			if (extracted.failure !== undefined) {
				zipProblem = extracted.failure;
				continue;
			}
			for (let imageIndex = 0; imageIndex < extracted.images.length; imageIndex += 1) {
				const image = extracted.images[imageIndex];
				if (image !== undefined) {
					fromZips.push(image);
				}
			}
			skipped += extracted.skipped;
			if (extracted.truncated) {
				truncated = true;
			}
			if (extracted.oversized) {
				partial = true;
			}
		}
		const combined = [...loose, ...folderImages, ...fromZips];
		if (combined.length > MAX_QUEUE) {
			truncated = true;
		}
		const items = combined.slice(0, MAX_QUEUE);
		if (truncated && items.length < MAX_QUEUE) {
			truncated = false;
			partial = true;
		}
		if (truncated) {
			partial = false;
		}
		if (items.length === 0) {
			return { kind: 'error', reason: zipProblem ?? 'none' };
		}
		return { kind: 'ready', items, skipped, truncated, partial, warning: zipProblem };
	}

	async function ingest(files: File[], directories: FileSystemDirectoryEntry[]): Promise<void> {
		if (files.length === 0 && directories.length === 0) {
			return;
		}
		const token = ++intakeToken;
		openToken += 1;
		release();
		conversion = { kind: 'idle' };
		source = { kind: 'none' };
		batch = { kind: 'reading' };
		const result = await gather(files, directories, token);
		if (token !== intakeToken || result === undefined) {
			return;
		}
		if (result.kind === 'error') {
			batch = result;
			return;
		}
		batch = {
			kind: 'ready',
			items: result.items,
			index: 0,
			skipped: result.skipped,
			truncated: result.truncated,
			partial: result.partial,
			warning: result.warning
		};
		const first = result.items[0];
		if (first !== undefined) {
			await openQueued(first);
		}
	}

	function splitDrop(transfer: DataTransfer): { files: File[]; directories: FileSystemDirectoryEntry[] } {
		const files: File[] = [];
		const directories: FileSystemDirectoryEntry[] = [];
		const items = transfer.items;
		if (items.length === 0) {
			return { files: listFiles(transfer.files), directories };
		}
		for (let index = 0; index < items.length; index += 1) {
			const item = items[index];
			if (item === undefined || item.kind !== 'file') {
				continue;
			}
			const entry = typeof item.webkitGetAsEntry === 'function' ? item.webkitGetAsEntry() : null;
			if (entry !== null && isDirectoryEntry(entry)) {
				directories.push(entry);
				continue;
			}
			const file = item.getAsFile();
			if (file !== null) {
				files.push(file);
			}
		}
		if (files.length === 0 && directories.length === 0) {
			return { files: listFiles(transfer.files), directories };
		}
		return { files, directories };
	}

	function go(delta: number): void {
		if (batch.kind !== 'ready') {
			return;
		}
		const item = batch.items[batch.index + delta];
		if (item === undefined) {
			return;
		}
		batch = { ...batch, index: batch.index + delta };
		void openQueued(item);
	}

	function intakeMessage(reason: SourceError): string {
		switch (reason) {
			case 'tooLarge':
				return t('image.errTooLarge');
			case 'notImage':
				return t('image.errNotImage');
		}
	}

	function batchMessage(reason: BatchError): string {
		switch (reason) {
			case 'none':
				return t('image.errNone');
			case 'tooBig':
				return t('image.errZipTooBig');
			case 'invalidZip':
				return t('image.errZip');
			case 'encryptedZip':
				return t('image.errEncrypted');
			case 'unsupportedZip':
				return t('image.errUnsupported');
			case 'folder':
				return t('image.errFolder');
		}
	}

	function onPick(event: Event & { currentTarget: HTMLInputElement }): void {
		const files = listFiles(event.currentTarget.files);
		event.currentTarget.value = '';
		void ingest(files, []);
	}

	function onDrop(event: DragEvent): void {
		event.preventDefault();
		dragging = false;
		const transfer = event.dataTransfer;
		if (transfer === null) {
			return;
		}
		const dropped = splitDrop(transfer);
		void ingest(dropped.files, dropped.directories);
	}

	function onPaste(event: ClipboardEvent): void {
		const files = listFiles(event.clipboardData?.files);
		if (files.length === 0) {
			return;
		}
		event.preventDefault();
		void ingest(files, []);
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
		if (conversion.kind !== 'done' || !loaded) {
			return;
		}
		const leaf = loaded.name.split('/').pop();
		const filename = leaf === undefined || leaf === '' ? 'image' : leaf;
		downloadBytes(`${baseName(filename)}.${extensionFor(conversion.mime)}`, conversion.bytes);
	}
</script>

<svelte:window onpaste={onPaste} />

<div class="stack">
	<div class="panel">
		<div class="panel-head">
			<span>{t('image.pick')}</span>
			<div class="row tight">
				{#if batch.kind !== 'none' || source.kind === 'loaded' || source.kind === 'error'}
					<button type="button" class="btn small" onclick={clear}>{t('image.clear')}</button>
				{/if}
				<label class="btn small file-pick">
					{t('image.pick')}
					<input type="file" accept="image/*,.zip" multiple onchange={onPick} />
				</label>
			</div>
		</div>
		<div
			class={['dropzone', { dragging }]}
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

	{#if batch.kind === 'reading'}
		<Notice tone="info">{t('image.reading')}</Notice>
	{/if}
	{#if batch.kind === 'error'}
		<Notice tone="error">{batchMessage(batch.reason)}</Notice>
	{/if}
	{#if queue}
		{#if queue.items.length > 1}
			<div class="queue" role="group" aria-label={t('image.queueLabel')}>
				<button
					id="image-prev"
					type="button"
					class="btn small"
					onclick={() => go(-1)}
					disabled={queue.index === 0}
				>
					{t('image.prev')}
				</button>
				<p id="image-queue" aria-live="polite">
					{t('image.queuePosition', { current: queue.index + 1, total: queue.items.length })}
					<span class="muted">{currentName}</span>
				</p>
				<button
					id="image-next"
					type="button"
					class="btn small"
					onclick={() => go(1)}
					disabled={queue.index >= queue.items.length - 1}
				>
					{t('image.next')}
				</button>
			</div>
		{/if}
		{#if queue.skipped > 0}
			<Notice tone="info">{t('image.skipped', { count: queue.skipped })}</Notice>
		{/if}
		{#if queue.truncated}
			<Notice tone="info">{t('image.truncated', { max: MAX_QUEUE })}</Notice>
		{/if}
		{#if queue.partial}
			<Notice tone="info">{t('image.partial')}</Notice>
		{/if}
		{#if queue.warning !== undefined}
			<Notice tone="error">{batchMessage(queue.warning)}</Notice>
		{/if}
	{/if}

	{#if source.kind === 'error'}
		<Notice tone="error">{intakeMessage(source.reason)}</Notice>
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
	{/if}

	{#snippet browserVariance()}
		<Notice tone="info">{t('image.browserVariance')}</Notice>
	{/snippet}

	{#if loaded}
		{@render browserVariance()}

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
	{:else}
		{@render browserVariance()}
		{#if source.kind === 'busy'}
			<Notice tone="info">{t('image.converting')}</Notice>
		{/if}
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

	.queue {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px 12px;
	}

	.queue p {
		margin: 0;
		min-width: 0;
		overflow-wrap: anywhere;
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
