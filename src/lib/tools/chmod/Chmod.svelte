<script lang="ts">
	import { t, type MessageKey } from '#lib/i18n/index.svelte.js';
	import CopyButton from '#lib/ui/CopyButton.svelte';
	import Notice from '#lib/ui/Notice.svelte';
	import {
		PRESETS,
		RIGHT_ORDER,
		WHO_ORDER,
		applyUmask,
		hasPermission,
		hasSpecial,
		octalCommand,
		parseOctal,
		parseSymbolic,
		setPermission,
		setSpecial,
		symbolicCommand,
		toOctal,
		toSymbolic,
		type Preset,
		type Right,
		type Special,
		type Who
	} from './chmod';

	type Draft = { kind: 'octal' | 'symbolic'; text: string };

	const WHO_LABEL: Record<Who, MessageKey> = {
		owner: 'chmod.owner',
		group: 'chmod.group',
		other: 'chmod.other'
	};
	const RIGHT_LABEL: Record<Right, MessageKey> = {
		read: 'chmod.read',
		write: 'chmod.write',
		execute: 'chmod.execute'
	};
	const SPECIALS: { value: Special; label: MessageKey }[] = [
		{ value: 'setuid', label: 'chmod.setuid' },
		{ value: 'setgid', label: 'chmod.setgid' },
		{ value: 'sticky', label: 'chmod.sticky' }
	];
	const PRESET_TEXT: Record<Preset['key'], MessageKey> = {
		p644: 'chmod.p644',
		p600: 'chmod.p600',
		p700: 'chmod.p700',
		p755: 'chmod.p755',
		p750: 'chmod.p750',
		p775: 'chmod.p775',
		p777: 'chmod.p777',
		p1777: 'chmod.p1777',
		p2775: 'chmod.p2775',
		p4755: 'chmod.p4755'
	};

	let mode = $state(0o755);
	let draft = $state<Draft | undefined>(undefined);
	let umaskText = $state('022');

	const octalText = $derived(draft?.kind === 'octal' ? draft.text : toOctal(mode));
	const symbolicText = $derived(draft?.kind === 'symbolic' ? draft.text : toSymbolic(mode));
	const octalInvalid = $derived(draft?.kind === 'octal' && !parseOctal(draft.text).ok);
	const symbolicInvalid = $derived(draft?.kind === 'symbolic' && !parseSymbolic(draft.text).ok);
	const umask = $derived(applyUmask(umaskText));

	function editOctal(text: string): void {
		draft = { kind: 'octal', text };
		const result = parseOctal(text);
		if (result.ok) {
			mode = result.mode;
		}
	}

	function editSymbolic(text: string): void {
		draft = { kind: 'symbolic', text };
		const result = parseSymbolic(text);
		if (result.ok) {
			mode = result.mode;
		}
	}

	function toggle(who: Who, right: Right, on: boolean): void {
		draft = undefined;
		mode = setPermission(mode, who, right, on);
	}

	function toggleSpecial(special: Special, on: boolean): void {
		draft = undefined;
		mode = setSpecial(mode, special, on);
	}

	function choose(octal: string): void {
		const result = parseOctal(octal);
		if (result.ok) {
			draft = undefined;
			mode = result.mode;
		}
	}
</script>

<div class="stack">
	<div class="panel">
		<div class="fields">
			<div class="field">
				<label for="chmod-octal">{t('chmod.octal')}</label>
				<input
					id="chmod-octal"
					class="input mono"
					type="text"
					inputmode="numeric"
					maxlength="4"
					value={octalText}
					oninput={(event) => editOctal(event.currentTarget.value)}
					spellcheck="false"
					autocomplete="off"
					placeholder={t('chmod.octalHint')}
					aria-invalid={octalInvalid}
				/>
			</div>
			<div class="field">
				<label for="chmod-symbolic">{t('chmod.symbolic')}</label>
				<input
					id="chmod-symbolic"
					class="input mono"
					type="text"
					maxlength="9"
					value={symbolicText}
					oninput={(event) => editSymbolic(event.currentTarget.value)}
					spellcheck="false"
					autocomplete="off"
					autocapitalize="off"
					placeholder={t('chmod.symbolicHint')}
					aria-invalid={symbolicInvalid}
				/>
			</div>
		</div>
	</div>

	{#if octalInvalid}
		<Notice tone="error">{t('chmod.errOctal')}</Notice>
	{/if}
	{#if symbolicInvalid}
		<Notice tone="error">{t('chmod.errSymbolic')}</Notice>
	{/if}

	<div class="panel">
		<div class="table-wrap">
			<table class="grid">
				<caption class="sr-only">{t('chmod.grid')}</caption>
				<thead>
					<tr>
						<th></th>
						{#each RIGHT_ORDER as right (right)}
							<th scope="col">{t(RIGHT_LABEL[right])}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each WHO_ORDER as who (who)}
						<tr>
							<th scope="row">{t(WHO_LABEL[who])}</th>
							{#each RIGHT_ORDER as right (right)}
								<td>
									<input
										type="checkbox"
										class="cell"
										aria-label="{t(WHO_LABEL[who])}: {t(RIGHT_LABEL[right])}"
										checked={hasPermission(mode, who, right)}
										onchange={(event) => toggle(who, right, event.currentTarget.checked)}
									/>
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<fieldset class="specials">
			<legend>{t('chmod.special')}</legend>
			{#each SPECIALS as special (special.value)}
				<label class="check">
					<input
						type="checkbox"
						checked={hasSpecial(mode, special.value)}
						onchange={(event) => toggleSpecial(special.value, event.currentTarget.checked)}
					/>
					<span>{t(special.label)}</span>
				</label>
			{/each}
		</fieldset>
	</div>

	<div class="panel">
		<div class="panel-head"><h2>{t('chmod.commands')}</h2></div>
		<ul class="results">
			<li>
				<span class="results-label">{t('chmod.cmdOctal')}</span>
				<code class="results-value">{octalCommand(mode)}</code>
				<CopyButton value={octalCommand(mode)} />
			</li>
			<li>
				<span class="results-label">{t('chmod.cmdSymbolic')}</span>
				<code class="results-value">{symbolicCommand(mode)}</code>
				<CopyButton value={symbolicCommand(mode)} />
			</li>
		</ul>
	</div>

	<div class="panel">
		<div class="panel-head"><h2>{t('chmod.presets')}</h2></div>
		<ul class="presets">
			{#each PRESETS as preset (preset.octal)}
				<li>
					<button
						type="button"
						class="btn small mono"
						aria-pressed={toOctal(mode) === preset.octal}
						onclick={() => choose(preset.octal)}
					>
						{preset.octal}
					</button>
					<span class="small-text">{t(PRESET_TEXT[preset.key])}</span>
				</li>
			{/each}
		</ul>
	</div>

	<div class="panel">
		<div class="panel-head"><h2>{t('chmod.umask')}</h2></div>
		<div class="field">
			<label for="chmod-umask">{t('chmod.umaskLabel')}</label>
			<input
				id="chmod-umask"
				class="input mono"
				type="text"
				inputmode="numeric"
				maxlength="4"
				bind:value={umaskText}
				spellcheck="false"
				autocomplete="off"
				placeholder={t('chmod.umaskHint')}
				aria-invalid={!umask.ok}
			/>
		</div>
		{#if umask.ok}
			<ul class="results">
				<li>
					<span class="results-label">{t('chmod.umaskFiles')}</span>
					<code class="results-value">{umask.files} ({umask.filesSymbolic})</code>
					<button type="button" class="btn small" onclick={() => choose(umask.files)}>
						{t('chmod.umaskUse')}
					</button>
				</li>
				<li>
					<span class="results-label">{t('chmod.umaskDirs')}</span>
					<code class="results-value">{umask.directories} ({umask.directoriesSymbolic})</code>
					<button type="button" class="btn small" onclick={() => choose(umask.directories)}>
						{t('chmod.umaskUse')}
					</button>
				</li>
			</ul>
		{:else}
			<Notice tone="error">{t('chmod.umaskErr')}</Notice>
		{/if}
	</div>
</div>

<style>
	.grid th,
	.grid td {
		text-align: center;
		vertical-align: middle;
	}
	.grid tbody th {
		text-align: left;
		text-transform: none;
		letter-spacing: 0;
		font-size: 0.88rem;
		color: var(--ink);
	}
	.cell {
		width: 22px;
		height: 22px;
		accent-color: var(--accent);
	}
	.specials {
		border: 0;
		margin: 12px 0 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 4px 18px;
	}
	.specials legend {
		font-size: 0.82rem;
		font-weight: 600;
		color: var(--ink-2);
		padding: 0;
		margin-bottom: 4px;
	}
	.presets {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.presets li {
		display: grid;
		grid-template-columns: 4.5rem minmax(0, 1fr);
		align-items: center;
		gap: 10px;
	}
	.presets .btn[aria-pressed='true'] {
		background: var(--accent-soft);
		border-color: var(--accent);
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
</style>
