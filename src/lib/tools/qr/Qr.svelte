<script lang="ts">
	import QRCode from 'qrcode';
	import { downloadBytes } from '#lib/download.js';
	import { t } from '#lib/i18n/index.svelte.js';
	import CopyButton from '#lib/ui/CopyButton.svelte';
	import Notice from '#lib/ui/Notice.svelte';
	import Segmented from '#lib/ui/Segmented.svelte';
	import {
		buildVcard,
		buildWifi,
		contrastRatio,
		ERROR_LEVELS,
		isErrorLevel,
		isInverted,
		isWifiSecurity,
		looksLikeUrl,
		MARGIN_RANGE,
		MIN_CONTRAST,
		normalizeOptions,
		SIZE_RANGE,
		type ErrorLevel,
		type WifiSecurity
	} from './qr';

	type Mode = 'generate' | 'read';
	type Preset = 'text' | 'url' | 'wifi' | 'vcard';
	type Rendered =
		| { kind: 'empty' }
		| { kind: 'error'; message: 'tooLong' | 'generic' }
		| { kind: 'ok'; svg: string };
	type ReadState =
		| { kind: 'idle' }
		| { kind: 'busy' }
		| { kind: 'error'; message: 'noQr' | 'notImage' }
		| { kind: 'ok'; text: string; preview: string };

	const MAX_READ_DIMENSION = 2000;

	let mode = $state<Mode>('generate');
	let preset = $state<Preset>('url');
	let text = $state('Olá, QR Code!');
	let url = $state('https://example.com');
	let ssid = $state('MinhaRede');
	let password = $state('');
	let security = $state<WifiSecurity>('WPA');
	let hidden = $state(false);
	let contactName = $state('Ana Silva');
	let contactPhone = $state('');
	let contactEmail = $state('');
	let contactOrg = $state('');
	let level = $state<ErrorLevel>('M');
	let size = $state(320);
	let margin = $state(2);
	let dark = $state('#000000');
	let light = $state('#ffffff');
	let rendered = $state<Rendered>({ kind: 'empty' });
	let pngFailed = $state(false);
	let sequence = 0;

	let readState = $state<ReadState>({ kind: 'idle' });
	let linkOpenedFor = $state<string | undefined>(undefined);
	let dragging = $state(false);

	const content = $derived.by(() => {
		switch (preset) {
			case 'text':
				return text;
			case 'url':
				return url;
			case 'wifi':
				return ssid === '' ? '' : buildWifi(ssid, password, security, hidden);
			case 'vcard':
				return contactName === ''
					? ''
					: buildVcard(contactName, contactPhone, contactEmail, contactOrg);
		}
	});
	const options = $derived(normalizeOptions({ level, size, margin, dark, light }));
	const ratio = $derived(contrastRatio(dark, light));
	const lowContrast = $derived(ratio !== undefined && ratio < MIN_CONTRAST);
	const inverted = $derived(!lowContrast && isInverted(dark, light));
	const svgDataUri = $derived(
		rendered.kind === 'ok' ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(rendered.svg)}` : ''
	);

	$effect(() => {
		const current = content;
		const opts = options;
		sequence += 1;
		const mine = sequence;
		if (current === '') {
			rendered = { kind: 'empty' };
			return;
		}
		void (async () => {
			try {
				const svg = await QRCode.toString(current, {
					type: 'svg',
					errorCorrectionLevel: opts.level,
					margin: opts.margin,
					width: opts.size,
					color: { dark: opts.dark, light: opts.light }
				});
				if (mine === sequence) {
					rendered = { kind: 'ok', svg };
				}
			} catch (error) {
				if (mine === sequence) {
					const tooLong = error instanceof Error && /too big|too long|capacity/i.test(error.message);
					rendered = { kind: 'error', message: tooLong ? 'tooLong' : 'generic' };
				}
			}
		})();
	});

	function onSecurity(event: Event & { currentTarget: HTMLSelectElement }): void {
		const value = event.currentTarget.value;
		if (isWifiSecurity(value)) {
			security = value;
		}
	}

	function onLevel(event: Event & { currentTarget: HTMLSelectElement }): void {
		const value = event.currentTarget.value;
		if (isErrorLevel(value)) {
			level = value;
		}
	}

	function downloadSvg(): void {
		if (rendered.kind === 'ok') {
			downloadBytes('qrcode.svg', new TextEncoder().encode(rendered.svg));
		}
	}

	async function downloadPng(): Promise<void> {
		pngFailed = false;
		try {
			const canvas = document.createElement('canvas');
			await QRCode.toCanvas(canvas, content, {
				errorCorrectionLevel: options.level,
				margin: options.margin,
				width: options.size,
				color: { dark: options.dark, light: options.light }
			});
			const blob = await new Promise<Blob | null>((resolve) => {
				canvas.toBlob(resolve, 'image/png');
			});
			if (!blob) {
				pngFailed = true;
				return;
			}
			downloadBytes('qrcode.png', new Uint8Array(await blob.arrayBuffer()));
		} catch {
			pngFailed = true;
		}
	}

	async function readFile(file: File): Promise<void> {
		readState = { kind: 'busy' };
		linkOpenedFor = undefined;
		const preview = URL.createObjectURL(file);
		try {
			const bitmap = await createImageBitmap(file);
			const scale = Math.min(1, MAX_READ_DIMENSION / Math.max(bitmap.width, bitmap.height));
			const width = Math.max(1, Math.round(bitmap.width * scale));
			const height = Math.max(1, Math.round(bitmap.height * scale));
			const canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;
			const context = canvas.getContext('2d', { willReadFrequently: true });
			if (!context) {
				readState = { kind: 'error', message: 'notImage' };
				return;
			}
			context.drawImage(bitmap, 0, 0, width, height);
			bitmap.close();
			const data = context.getImageData(0, 0, width, height);
			// Only needed when reading a code, so it is loaded on demand.
			const { default: jsQR } = await import('jsqr');
			const found = jsQR(data.data, width, height, { inversionAttempts: 'attemptBoth' });
			if (found) {
				readState = { kind: 'ok', text: found.data, preview };
			} else {
				readState = { kind: 'error', message: 'noQr' };
			}
		} catch {
			readState = { kind: 'error', message: 'notImage' };
		}
	}

	function onPick(event: Event & { currentTarget: HTMLInputElement }): void {
		const file = event.currentTarget.files?.[0];
		if (file) {
			void readFile(file);
		}
		event.currentTarget.value = '';
	}

	function onDrop(event: DragEvent): void {
		event.preventDefault();
		dragging = false;
		const file = event.dataTransfer?.files[0];
		if (file) {
			void readFile(file);
		}
	}

	function onPaste(event: ClipboardEvent): void {
		if (mode !== 'read') {
			return;
		}
		const items = event.clipboardData?.files;
		const file = items?.[0];
		if (file) {
			event.preventDefault();
			void readFile(file);
		}
	}
</script>

<svelte:window onpaste={onPaste} />

<div class="stack">
	<Segmented
		name="qr-mode"
		legend={t('qr.mode')}
		options={[
			{ value: 'generate', label: t('qr.modeGenerate') },
			{ value: 'read', label: t('qr.modeRead') }
		]}
		bind:value={mode}
	/>

	{#if mode === 'generate'}
		<div class="panel">
			<Segmented
				name="qr-preset"
				legend={t('qr.preset')}
				options={[
					{ value: 'url', label: t('qr.presetUrl') },
					{ value: 'text', label: t('qr.presetText') },
					{ value: 'wifi', label: t('qr.presetWifi') },
					{ value: 'vcard', label: t('qr.presetVcard') }
				]}
				bind:value={preset}
			/>
			{#if preset === 'text'}
				<div class="field">
					<label for="qr-text">{t('qr.text')}</label>
					<textarea id="qr-text" class="area" rows="4" bind:value={text} spellcheck="false"
					></textarea>
				</div>
			{:else if preset === 'url'}
				<div class="field">
					<label for="qr-url">{t('qr.url')}</label>
					<input
						id="qr-url"
						class="input mono"
						type="text"
						inputmode="url"
						bind:value={url}
						spellcheck="false"
						autocomplete="off"
					/>
				</div>
			{:else if preset === 'wifi'}
				<div class="fields">
					<div class="field">
						<label for="qr-ssid">{t('qr.ssid')}</label>
						<input id="qr-ssid" class="input" type="text" bind:value={ssid} autocomplete="off" />
					</div>
					<div class="field">
						<label for="qr-security">{t('qr.security')}</label>
						<select id="qr-security" class="input" value={security} onchange={onSecurity}>
							<option value="WPA">WPA/WPA2/WPA3</option>
							<option value="WEP">WEP</option>
							<option value="nopass">{t('qr.securityNone')}</option>
						</select>
					</div>
					{#if security !== 'nopass'}
						<div class="field">
							<label for="qr-password">{t('qr.password')}</label>
							<input
								id="qr-password"
								class="input"
								type="text"
								bind:value={password}
								autocomplete="off"
								spellcheck="false"
							/>
						</div>
					{/if}
				</div>
				<label class="check">
					<input type="checkbox" bind:checked={hidden} />
					<span>{t('qr.hidden')}</span>
				</label>
			{:else}
				<div class="fields">
					<div class="field">
						<label for="qr-cname">{t('qr.contactName')}</label>
						<input id="qr-cname" class="input" type="text" bind:value={contactName} />
					</div>
					<div class="field">
						<label for="qr-cphone">{t('qr.contactPhone')}</label>
						<input id="qr-cphone" class="input" type="tel" bind:value={contactPhone} />
					</div>
					<div class="field">
						<label for="qr-cmail">{t('qr.contactEmail')}</label>
						<input id="qr-cmail" class="input" type="email" bind:value={contactEmail} />
					</div>
					<div class="field">
						<label for="qr-corg">{t('qr.contactOrg')}</label>
						<input id="qr-corg" class="input" type="text" bind:value={contactOrg} />
					</div>
				</div>
			{/if}
		</div>

		<div class="panel">
			<div class="fields">
				<div class="field">
					<label for="qr-level">{t('qr.level')}</label>
					<select id="qr-level" class="input" value={level} onchange={onLevel}>
						{#each ERROR_LEVELS as item (item)}
							<option value={item}>{item}</option>
						{/each}
					</select>
					<span class="small-text muted">{t('qr.levelHint')}</span>
				</div>
				<div class="field">
					<label for="qr-size">{t('qr.size')}: {options.size}</label>
					<input
						id="qr-size"
						class="range"
						type="range"
						min={SIZE_RANGE.min}
						max={SIZE_RANGE.max}
						step="16"
						bind:value={size}
					/>
				</div>
				<div class="field">
					<label for="qr-margin">{t('qr.margin')}: {options.margin}</label>
					<input
						id="qr-margin"
						class="range"
						type="range"
						min={MARGIN_RANGE.min}
						max={MARGIN_RANGE.max}
						step="1"
						bind:value={margin}
					/>
				</div>
			</div>
			<div class="row">
				<div class="field compact">
					<label for="qr-dark">{t('qr.dark')}</label>
					<input id="qr-dark" class="picker" type="color" bind:value={dark} />
				</div>
				<div class="field compact">
					<label for="qr-light">{t('qr.light')}</label>
					<input id="qr-light" class="picker" type="color" bind:value={light} />
				</div>
			</div>
			{#if lowContrast && ratio !== undefined}
				<Notice tone="error">{t('qr.lowContrast', { ratio: ratio.toFixed(1) })}</Notice>
			{:else if inverted}
				<Notice tone="info">{t('qr.inverted')}</Notice>
			{/if}
		</div>

		<div class="panel">
			<div class="panel-head">
				<span>{t('qr.preview')}</span>
				<div class="row tight">
					<button type="button" class="btn small" onclick={downloadSvg} disabled={rendered.kind !== 'ok'}>
						{t('qr.downloadSvg')}
					</button>
					<button
						type="button"
						class="btn small"
						onclick={downloadPng}
						disabled={rendered.kind !== 'ok'}
					>
						{t('qr.downloadPng')}
					</button>
					<CopyButton value={rendered.kind === 'ok' ? rendered.svg : ''} label={t('qr.copySvg')} />
				</div>
			</div>
			{#if rendered.kind === 'ok'}
				<div class="qr-frame">
					<img class="qr-img" src={svgDataUri} alt={t('qr.previewAlt')} width={options.size} height={options.size} />
				</div>
			{:else if rendered.kind === 'error'}
				<Notice tone="error">
					{rendered.message === 'tooLong' ? t('qr.errTooLong') : t('qr.errGenerate')}
				</Notice>
			{:else}
				<Notice tone="info">{t('qr.emptyGenerate')}</Notice>
			{/if}
			{#if pngFailed}
				<Notice tone="error">{t('qr.errPng')}</Notice>
			{/if}
		</div>
	{:else}
		<div class="panel">
			<div class="panel-head">
				<span>{t('qr.readTitle')}</span>
				<label class="btn small file-pick">
					{t('qr.pick')}
					<input type="file" accept="image/*" onchange={onPick} />
				</label>
			</div>
			<div
				class="dropzone"
				class:dragging
				role="group"
				aria-label={t('qr.dropLabel')}
				ondragover={(event) => {
					event.preventDefault();
					dragging = true;
				}}
				ondragleave={() => (dragging = false)}
				ondrop={onDrop}
			>
				<span class="muted">{t('qr.dropHint')}</span>
			</div>
		</div>

		{#if readState.kind === 'busy'}
			<Notice tone="info">{t('qr.reading')}</Notice>
		{:else if readState.kind === 'error'}
			<Notice tone="error">
				{readState.message === 'noQr' ? t('qr.errNoQr') : t('qr.errNotImage')}
			</Notice>
		{:else if readState.kind === 'ok'}
			{@const decoded = readState.text}
			<div class="panel">
				<div class="panel-head">
					<label for="qr-decoded">{t('qr.decoded')}</label>
					<CopyButton value={decoded} />
				</div>
				<textarea id="qr-decoded" class="area" readonly rows="4" value={decoded} spellcheck="false"
				></textarea>
				{#if looksLikeUrl(decoded)}
					<Notice tone="info">{t('qr.urlNotice')}</Notice>
					{#if linkOpenedFor === decoded}
						<a href={decoded.trim()} target="_blank" rel="noopener noreferrer" class="mono">
							{t('qr.openedLink')}: {decoded.trim()}
						</a>
					{:else}
						<div>
							<button type="button" class="btn small" onclick={() => (linkOpenedFor = decoded)}>
								{t('qr.openLink')}
							</button>
						</div>
					{/if}
				{/if}
				<img class="read-img" src={readState.preview} alt={t('qr.readPreviewAlt')} />
			</div>
		{/if}
	{/if}
</div>

<style>
	.qr-frame {
		display: flex;
		justify-content: center;
		padding: 12px;
		overflow: auto;
		background: var(--surface-2);
		border-radius: var(--radius);
	}

	.qr-img {
		max-width: 100%;
		height: auto;
		image-rendering: pixelated;
	}

	.read-img {
		max-width: 100%;
		max-height: 280px;
		object-fit: contain;
		align-self: center;
	}

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
</style>
