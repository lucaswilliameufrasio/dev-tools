<script lang="ts">
	import { t, type MessageKey } from '#lib/i18n/index.svelte.js';
	import CopyButton from '#lib/ui/CopyButton.svelte';
	import Notice from '#lib/ui/Notice.svelte';
	import OutputBox from '#lib/ui/OutputBox.svelte';
	import Segmented from '#lib/ui/Segmented.svelte';
	import {
		BRANDS,
		GATEWAY_TEST_NUMBERS,
		formatCardNumber,
		generateCard,
		maskCardNumber,
		validateCard,
		type Brand
	} from './card';

	type Mode = 'generate' | 'validate';

	const BRAND_LABELS: Record<Brand, string> = {
		visa: 'Visa',
		mastercard: 'Mastercard',
		amex: 'American Express',
		elo: 'Elo',
		hipercard: 'Hipercard',
		diners: 'Diners Club',
		discover: 'Discover',
		jcb: 'JCB'
	};

	const ERROR_KEYS: Record<'chars' | 'short', MessageKey> = {
		chars: 'card.error.chars',
		short: 'card.error.short'
	};

	let mode = $state<Mode>('generate');
	let brand = $state<Brand>('visa');
	let count = $state(5);
	let withExpiry = $state(true);
	let withCvv = $state(true);
	let withHolder = $state(true);
	let spaces = $state(true);
	let output = $state('');
	let cardInput = $state('4242 4242 4242 4242');
	let masked = $state(false);

	function regenerate(): void {
		const quantity = Math.min(20, Math.max(1, Math.floor(count) || 1));
		const now = new Date();
		const lines: string[] = [];
		for (let i = 0; i < quantity; i += 1) {
			const card = generateCard(brand, now);
			const parts = [spaces ? formatCardNumber(card.number, brand) : card.number];
			if (withExpiry) {
				parts.push(card.expiry);
			}
			if (withCvv) {
				parts.push(card.cvv);
			}
			if (withHolder) {
				parts.push(card.holder);
			}
			lines.push(parts.join('  '));
		}
		output = lines.join('\n');
	}

	$effect(() => {
		void brand;
		void count;
		void withExpiry;
		void withCvv;
		void withHolder;
		void spaces;
		regenerate();
	});

	const validation = $derived(validateCard(cardInput));
</script>

<div class="stack">
	<Notice tone="info">{t('card.warning')}</Notice>

	<div class="row">
		<Segmented
			name="card-mode"
			legend={t('card.mode')}
			bind:value={mode}
			options={[
				{ value: 'generate', label: t('card.mode.generate') },
				{ value: 'validate', label: t('card.mode.validate') }
			]}
		/>
	</div>

	{#if mode === 'generate'}
		<div class="row">
			<div class="field compact">
				<label for="card-brand">{t('card.brand')}</label>
				<select id="card-brand" class="input" bind:value={brand}>
					{#each BRANDS as item (item)}
						<option value={item}>{BRAND_LABELS[item]}</option>
					{/each}
				</select>
			</div>
			<div class="field compact">
				<label for="card-count">{t('card.count')}</label>
				<input id="card-count" class="input mono" type="number" min="1" max="20" bind:value={count} />
			</div>
			<label class="check">
				<input type="checkbox" bind:checked={withExpiry} />
				<span>{t('card.withExpiry')}</span>
			</label>
			<label class="check">
				<input type="checkbox" bind:checked={withCvv} />
				<span>{t('card.withCvv')}</span>
			</label>
			<label class="check">
				<input type="checkbox" bind:checked={withHolder} />
				<span>{t('card.withHolder')}</span>
			</label>
			<label class="check">
				<input type="checkbox" bind:checked={spaces} />
				<span>{t('card.spaces')}</span>
			</label>
			<button type="button" class="btn primary" onclick={regenerate}>{t('common.generate')}</button>
		</div>
		<OutputBox id="card-output" label={t('card.output')} value={output} rows={Math.min(14, Math.max(3, count + 1))} />
	{:else}
		<div class="row">
			<div class="field grow">
				<label for="card-input">{t('card.input')}</label>
				<input id="card-input" class="input mono" inputmode="numeric" autocomplete="off" spellcheck="false" bind:value={cardInput} />
			</div>
			<label class="check">
				<input type="checkbox" bind:checked={masked} />
				<span>{t('card.mask')}</span>
			</label>
		</div>
		{#if validation.ok}
			{@const brandValue = validation.brand}
			<ul class="results">
				<li>
					<span class="results-label">{t('card.input')}</span>
					<span class="results-value mono">
						{masked ? maskCardNumber(validation.digits) : formatCardNumber(validation.digits, brandValue)}
					</span>
				</li>
				<li>
					<span class="results-label">{t('card.brand')}</span>
					<span class="results-value">
						{brandValue === undefined ? t('card.brandUnknown') : t('card.brandDetected', { brand: BRAND_LABELS[brandValue] })}
					</span>
				</li>
				<li>
					<span class="results-label">Luhn</span>
					<span class="results-value">
						<span class={validation.luhn ? 'pill' : 'pill bad'}>{validation.luhn ? t('card.luhn.ok') : t('card.luhn.bad')}</span>
					</span>
				</li>
				<li>
					<span class="results-label">{t('card.col.number')}</span>
					<span class="results-value">
						<span class={validation.lengthOk ? 'pill' : 'pill bad'}>
							{validation.lengthOk
								? t('card.length.ok', { length: validation.digits.length })
								: t('card.length.bad', { length: validation.digits.length })}
						</span>
					</span>
				</li>
			</ul>
		{:else if validation.reason === 'empty'}
			<p class="muted">{t('card.empty')}</p>
		{:else}
			<Notice tone="error">{t(ERROR_KEYS[validation.reason])}</Notice>
		{/if}
	{/if}

	<div class="panel">
		<div class="panel-head">
			<h2 class="small-text">{t('card.reference')}</h2>
		</div>
		<p class="muted small-text">{t('card.reference.note')}</p>
		<!-- A scrollable region must be reachable by keyboard. -->
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<div class="table-wrap" tabindex="0">
			<table>
				<thead>
					<tr>
						<th>{t('card.col.gateway')}</th>
						<th>{t('card.col.brand')}</th>
						<th>{t('card.col.number')}</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each GATEWAY_TEST_NUMBERS as item (item.gateway + item.number)}
						<tr>
							<td>{item.gateway}</td>
							<td>{BRAND_LABELS[item.brand]}</td>
							<td class="mono">{formatCardNumber(item.number, item.brand)}</td>
							<td><CopyButton value={item.number} /></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
