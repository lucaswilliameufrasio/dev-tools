<script lang="ts">
	import { t } from '#lib/i18n/index.svelte.js';
	import Notice from '#lib/ui/Notice.svelte';
	import OutputBox from '#lib/ui/OutputBox.svelte';
	import Segmented from '#lib/ui/Segmented.svelte';
	import { DEFAULT_INFER_OPTIONS, inferFromText } from './infer';
	import { LANGUAGES, emit, isLanguageId, type EmitOptions, type LanguageId } from './emit';
	import { SAMPLE } from './sample';

	type TsStyle = EmitOptions['tsStyle'];
	type GoOptional = EmitOptions['goOptional'];
	type PythonStyle = EmitOptions['pythonStyle'];

	let input = $state(SAMPLE);
	let language = $state<LanguageId>('typescript');
	let rootName = $state(DEFAULT_INFER_OPTIONS.rootName);
	let allOptional = $state(false);
	let bigIntString = $state(false);
	let tsStyle = $state<TsStyle>('interface');
	let goOptional = $state<GoOptional>('pointer');
	let rustCloneEq = $state(true);
	let pythonStyle = $state<PythonStyle>('dataclass');

	function onLanguageChange(event: Event & { currentTarget: HTMLSelectElement }): void {
		const value = event.currentTarget.value;
		if (isLanguageId(value)) {
			language = value;
		}
	}

	const result = $derived.by(() => {
		const inferred = inferFromText(input, {
			rootName,
			allOptional,
			bigInt: bigIntString ? 'string' : 'float'
		});
		if (!inferred.ok) {
			return inferred;
		}
		const code = emit(language, inferred.schema, { tsStyle, goOptional, rustCloneEq, pythonStyle });
		const rootArray = inferred.schema.root.kind === 'array';
		const item = inferred.schema.root.kind === 'array' ? inferred.schema.root.item : undefined;
		return {
			ok: true as const,
			code,
			rootArray,
			rootName: inferred.schema.rootName,
			itemName: item !== undefined && item.kind === 'object' ? item.name : 'T'
		};
	});

	const errorText = $derived.by(() => {
		if (result.ok || result.reason === 'empty') {
			return undefined;
		}
		if (result.reason === 'syntax') {
			return t('jsontypes.err.syntax', { message: result.message });
		}
		return t('jsontypes.err.scalar');
	});
</script>

<div class="stack">
	<div class="row">
		<div class="field compact">
			<label for="jsontypes-language">{t('jsontypes.language')}</label>
			<select
				id="jsontypes-language"
				class="input"
				value={language}
				onchange={onLanguageChange}
			>
				<optgroup label={t('jsontypes.group.languages')}>
					{#each LANGUAGES.filter((item) => item.group === 'languages') as item (item.id)}
						<option value={item.id}>{item.label}</option>
					{/each}
				</optgroup>
				<optgroup label={t('jsontypes.group.schemas')}>
					{#each LANGUAGES.filter((item) => item.group === 'schemas') as item (item.id)}
						<option value={item.id}>{item.label}</option>
					{/each}
				</optgroup>
			</select>
		</div>
		<div class="field compact">
			<label for="jsontypes-root">{t('jsontypes.rootName')}</label>
			<input
				id="jsontypes-root"
				class="input mono"
				type="text"
				spellcheck="false"
				autocomplete="off"
				bind:value={rootName}
			/>
		</div>
	</div>

	<fieldset class="stack options">
		<legend class="muted small-text">{t('jsontypes.options')}</legend>
		<div class="row">
			<label class="check">
				<input type="checkbox" bind:checked={allOptional} />
				<span>{t('jsontypes.allOptional')}</span>
			</label>
			<label class="check">
				<input type="checkbox" bind:checked={bigIntString} />
				<span>{t('jsontypes.bigIntString')}</span>
			</label>
			{#if language === 'rust'}
				<label class="check">
					<input type="checkbox" bind:checked={rustCloneEq} />
					<span>{t('jsontypes.rustCloneEq')}</span>
				</label>
			{/if}
		</div>
		{#if language === 'typescript'}
			<Segmented
				name="jsontypes-ts-style"
				legend={t('jsontypes.tsStyle')}
				bind:value={tsStyle}
				options={[
					{ value: 'interface', label: 'interface' },
					{ value: 'type', label: 'type' }
				]}
			/>
		{:else if language === 'go'}
			<Segmented
				name="jsontypes-go-optional"
				legend={t('jsontypes.goOptional')}
				bind:value={goOptional}
				options={[
					{ value: 'pointer', label: t('jsontypes.goPointer') },
					{ value: 'omitempty', label: t('jsontypes.goOmitempty') }
				]}
			/>
		{:else if language === 'python'}
			<Segmented
				name="jsontypes-python-style"
				legend={t('jsontypes.pythonStyle')}
				bind:value={pythonStyle}
				options={[
					{ value: 'dataclass', label: 'dataclass' },
					{ value: 'pydantic', label: 'Pydantic' }
				]}
			/>
		{/if}
	</fieldset>

	<div class="io">
		<div class="panel">
			<div class="panel-head">
				<label for="jsontypes-input">{t('jsontypes.input')}</label>
			</div>
			<textarea
				id="jsontypes-input"
				class="area"
				rows="16"
				spellcheck="false"
				aria-invalid={errorText !== undefined}
				bind:value={input}
			></textarea>
		</div>

		<div class="stack">
			{#if errorText !== undefined}
				<Notice tone="error">{errorText}</Notice>
			{:else if !result.ok}
				<p class="muted">{t('jsontypes.empty')}</p>
			{:else}
				{#if result.rootArray}
					<Notice tone="info">
						{t('jsontypes.note.rootArray', { item: result.itemName, root: result.rootName })}
					</Notice>
				{/if}
				<OutputBox id="jsontypes-output" label={t('jsontypes.output')} value={result.code} rows={16} />
			{/if}
		</div>
	</div>
	<p class="muted small-text">{t('jsontypes.note.numbers')}</p>
</div>

<style>
	.options {
		border: 0;
		padding: 0;
		margin: 0;
		min-width: 0;
	}
</style>
