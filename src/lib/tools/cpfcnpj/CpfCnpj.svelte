<script lang="ts">
	import { t, type MessageKey } from '#lib/i18n/index.svelte.js';
	import CopyButton from '#lib/ui/CopyButton.svelte';
	import OutputBox from '#lib/ui/OutputBox.svelte';
	import Segmented from '#lib/ui/Segmented.svelte';
	import {
		UF_LIST,
		generateCnpj,
		generateCpf,
		maskCnpj,
		maskCpf,
		validateLines,
		type DocumentKind,
		type Uf,
		type ValidateReason
	} from './cpfcnpj';

	type Mode = 'generate' | 'validate';

	const REASON_KEYS: Record<ValidateReason, MessageKey> = {
		empty: 'cpfcnpj.reason.empty',
		length: 'cpfcnpj.reason.length',
		chars: 'cpfcnpj.reason.chars',
		'equal-digits': 'cpfcnpj.reason.equalDigits',
		'check-digit': 'cpfcnpj.reason.checkDigit'
	};

	const KIND_KEYS: Record<DocumentKind, MessageKey> = {
		cpf: 'cpfcnpj.kind.cpf',
		cnpj: 'cpfcnpj.kind.cnpj'
	};

	let mode = $state<Mode>('generate');
	let doc = $state<DocumentKind>('cpf');
	let ufChoice = $state<Uf | 'any'>('any');
	let count = $state(5);
	let masked = $state(true);
	let alphanumeric = $state(false);
	let branch = $state('0001');
	let generated = $state<string[]>([]);
	let toValidate = $state('529.982.247-25\n11.222.333/0001-81\n12.ABC.345/01DE-35\n111.111.111-11\n123');

	function regenerate(): void {
		const quantity = Math.min(50, Math.max(1, Math.floor(count) || 1));
		const list: string[] = [];
		for (let i = 0; i < quantity; i += 1) {
			if (doc === 'cpf') {
				const cpf = generateCpf(ufChoice === 'any' ? undefined : ufChoice);
				list.push(masked ? maskCpf(cpf) : cpf);
			} else {
				const cnpj = generateCnpj({ alphanumeric, branch });
				list.push(masked ? maskCnpj(cnpj) : cnpj);
			}
		}
		generated = list;
	}

	$effect(() => {
		void doc;
		void ufChoice;
		void count;
		void masked;
		void alphanumeric;
		void branch;
		regenerate();
	});

	const output = $derived(generated.join('\n'));
	const rows = $derived(validateLines(toValidate));
	const validCount = $derived(rows.filter((row) => row.result.valid).length);
</script>

<div class="stack">
	<div class="row">
		<Segmented
			name="cpfcnpj-mode"
			legend={t('cpfcnpj.mode')}
			bind:value={mode}
			options={[
				{ value: 'generate', label: t('cpfcnpj.mode.generate') },
				{ value: 'validate', label: t('cpfcnpj.mode.validate') }
			]}
		/>
		{#if mode === 'generate'}
			<Segmented
				name="cpfcnpj-doc"
				legend={t('cpfcnpj.doc')}
				bind:value={doc}
				options={[
					{ value: 'cpf', label: 'CPF' },
					{ value: 'cnpj', label: 'CNPJ' }
				]}
			/>
		{/if}
	</div>

	{#if mode === 'generate'}
		<div class="row">
			<div class="field compact">
				<label for="cpfcnpj-count">{t('cpfcnpj.count')}</label>
				<input id="cpfcnpj-count" class="input mono" type="number" min="1" max="50" bind:value={count} />
			</div>
			{#if doc === 'cpf'}
				<div class="field compact">
					<label for="cpfcnpj-uf">{t('cpfcnpj.uf')}</label>
					<select id="cpfcnpj-uf" class="input" bind:value={ufChoice}>
						<option value="any">{t('cpfcnpj.uf.any')}</option>
						{#each UF_LIST as uf (uf)}
							<option value={uf}>{uf}</option>
						{/each}
					</select>
				</div>
			{:else}
				<div class="field compact">
					<label for="cpfcnpj-branch">{t('cpfcnpj.branch')}</label>
					<input id="cpfcnpj-branch" class="input mono" maxlength="4" bind:value={branch} />
				</div>
				<label class="check">
					<input type="checkbox" bind:checked={alphanumeric} />
					<span>{t('cpfcnpj.alphanumeric')}</span>
				</label>
			{/if}
			<label class="check">
				<input type="checkbox" bind:checked={masked} />
				<span>{t('cpfcnpj.mask')}</span>
			</label>
			<button type="button" class="btn primary" onclick={regenerate}>{t('common.generate')}</button>
		</div>

		<OutputBox
			id="cpfcnpj-output"
			label={t('cpfcnpj.output')}
			value={output}
			rows={Math.min(14, Math.max(3, generated.length + 1))}
		/>
		{#if doc === 'cnpj'}
			<p class="muted small-text">{t('cpfcnpj.alphanumericNote')}</p>
		{/if}
		<p class="muted small-text">{t('cpfcnpj.fictionalNote')}</p>
	{:else}
		<div class="field">
			<label for="cpfcnpj-input">{t('cpfcnpj.validateInput')}</label>
			<textarea id="cpfcnpj-input" class="area mono" rows="6" spellcheck="false" bind:value={toValidate}></textarea>
			<p class="muted small-text">{t('cpfcnpj.validateHint')}</p>
		</div>
		{#if rows.length === 0}
			<p class="muted">{t('cpfcnpj.empty')}</p>
		{:else}
			<p class="muted small-text">{t('cpfcnpj.summary', { valid: validCount, invalid: rows.length - validCount })}</p>
			<ul class="results">
				{#each rows as row, index (index)}
					<li>
						<span class="results-label mono">{row.line}</span>
						<span class="results-value">
							{#if row.result.valid}
								<span class="pill">{t('cpfcnpj.valid')}</span>
								{t(KIND_KEYS[row.result.kind])}
								<span class="mono">{row.result.masked}</span>
							{:else}
								<span class="pill bad">{t('cpfcnpj.invalid')}</span>
								{t(REASON_KEYS[row.result.reason])}
							{/if}
						</span>
						{#if row.result.valid}
							<CopyButton value={row.result.masked} />
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
</div>
