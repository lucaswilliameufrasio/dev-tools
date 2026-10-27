<script lang="ts">
	import { t } from '#lib/i18n/index.svelte.js';
	import CopyButton from '#lib/ui/CopyButton.svelte';
	import Notice from '#lib/ui/Notice.svelte';
	import { contrastRatio, parseColor, rgbToHex, rgbToHsl, type Rgb } from './color';

	const WHITE: Rgb = { r: 255, g: 255, b: 255 };
	const BLACK: Rgb = { r: 0, g: 0, b: 0 };

	let input = $state('#2447e0');

	const rgb = $derived(parseColor(input));
	const hex = $derived(rgb ? rgbToHex(rgb) : '');
	const rgbText = $derived(rgb ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : '');
	const hslText = $derived.by((): string => {
		if (!rgb) {
			return '';
		}
		const hsl = rgbToHsl(rgb);
		return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
	});
	const onWhite = $derived(rgb ? contrastRatio(rgb, WHITE) : 0);
	const onBlack = $derived(rgb ? contrastRatio(rgb, BLACK) : 0);

	function grade(ratio: number): string {
		if (ratio >= 7) {
			return 'AAA';
		}
		if (ratio >= 4.5) {
			return 'AA';
		}
		if (ratio >= 3) {
			return 'AA (large)';
		}
		return t('color.fail');
	}
</script>

<div class="stack">
	<div class="panel">
		<div class="panel-head"><label for="color-input">{t('color.input')}</label></div>
		<div class="row">
			<input
				id="color-picker"
				class="picker"
				type="color"
				aria-label={t('color.picker')}
				value={hex === '' ? '#000000' : hex}
				oninput={(event) => (input = event.currentTarget.value)}
			/>
			<input
				id="color-input"
				class="input mono grow"
				type="text"
				bind:value={input}
				spellcheck="false"
				aria-invalid={rgb === undefined}
			/>
		</div>
	</div>

	{#if rgb}
		<div class="io">
			<div class="panel">
				<ul class="results">
					{#each [hex, rgbText, hslText] as value (value)}
						<li>
							<code class="results-value">{value}</code>
							<CopyButton {value} />
						</li>
					{/each}
				</ul>
			</div>
			<div class="panel">
				<div class="swatch-pair">
					{#each [{ label: t('color.onWhite'), ink: '#ffffff', ratio: onWhite }, { label: t('color.onBlack'), ink: '#000000', ratio: onBlack }] as sample (sample.ink)}
						<div class="sample">
							<div class="swatch" style:background={hex} style:color={sample.ink} aria-hidden="true">
								<span class="aa">Aa</span>
							</div>
							<strong>{sample.label}</strong>
							<span class="mono">{sample.ratio.toFixed(2)}:1 · {grade(sample.ratio)}</span>
						</div>
					{/each}
				</div>
			</div>
		</div>
	{:else}
		<Notice tone="error">{t('color.errInvalid')}</Notice>
	{/if}
</div>

<style>
	.sample {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}

	.aa {
		font-size: 2rem;
		font-weight: 700;
		line-height: 1;
	}
</style>
