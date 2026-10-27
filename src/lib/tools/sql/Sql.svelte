<script lang="ts">
	import { t, type MessageKey } from '#lib/i18n/index.svelte.js';
	import Notice from '#lib/ui/Notice.svelte';
	import OutputBox from '#lib/ui/OutputBox.svelte';
	import Segmented from '#lib/ui/Segmented.svelte';
	import { minifySql } from './minify';
	import {
		formatSql,
		SQL_DIALECTS,
		type FormatFn,
		type KeywordCase,
		type SqlDialect,
		type SqlFormatResult,
		type SqlIndent
	} from './sql';

	type Action = 'format' | 'minify';
	type Loader = { kind: 'loading' } | { kind: 'ready'; format: FormatFn } | { kind: 'failed' };

	const EXAMPLE =
		"select u.id, u.name, count(o.id) as orders from users u left join orders o on o.user_id = u.id where u.active = true and u.created_at > '2024-01-01' group by u.id, u.name having count(o.id) > 3 order by orders desc limit 10; -- top buyers";

	let action = $state<Action>('format');
	let dialect = $state<SqlDialect>('postgresql');
	let keywordCase = $state<KeywordCase>('upper');
	let indent = $state<SqlIndent>('2');
	let input = $state(EXAMPLE);
	let loader = $state<Loader>({ kind: 'loading' });

	$effect(() => {
		let active = true;
		void (async () => {
			try {
				const module = await import('sql-formatter');
				if (active) {
					loader = { kind: 'ready', format: module.format };
				}
			} catch {
				if (active) {
					loader = { kind: 'failed' };
				}
			}
		})();
		return () => {
			active = false;
		};
	});

	function isDialect(value: string): value is SqlDialect {
		return SQL_DIALECTS.some((entry) => entry === value);
	}

	const result = $derived.by((): SqlFormatResult | undefined => {
		if (input.trim() === '') {
			return undefined;
		}
		if (action === 'minify') {
			return minifySql(input, dialect === 'mysql' || dialect === 'mariadb');
		}
		if (loader.kind !== 'ready') {
			return undefined;
		}
		return formatSql(loader.format, input, { dialect, keywordCase, indent });
	});
	const output = $derived(result?.ok ? result.output : '');
</script>

<div class="stack">
	<div class="panel">
		<div class="fields">
			<Segmented
				name="sql-action"
				legend={t('sql.action')}
				options={[
					{ value: 'format', label: t('sql.actionFormat') },
					{ value: 'minify', label: t('sql.actionMinify') }
				]}
				bind:value={action}
			/>
			<div class="field">
				<label for="sql-dialect">{t('sql.dialect')}</label>
				<select
					id="sql-dialect"
					class="input"
					value={dialect}
					onchange={(event) => {
						if (isDialect(event.currentTarget.value)) {
							dialect = event.currentTarget.value;
						}
					}}
				>
					{#each SQL_DIALECTS as entry (entry)}
						<option value={entry}>{t(`sql.dialect.${entry}` satisfies MessageKey)}</option>
					{/each}
				</select>
			</div>
			{#if action === 'format'}
				<div class="field">
					<label for="sql-case">{t('sql.keywordCase')}</label>
					<select id="sql-case" class="input" bind:value={keywordCase}>
						<option value="upper">{t('sql.caseUpper')}</option>
						<option value="lower">{t('sql.caseLower')}</option>
						<option value="preserve">{t('sql.casePreserve')}</option>
					</select>
				</div>
				<div class="field">
					<label for="sql-indent">{t('sql.indent')}</label>
					<select id="sql-indent" class="input" bind:value={indent}>
						<option value="2">2</option>
						<option value="4">4</option>
						<option value="tab">{t('sql.indentTab')}</option>
					</select>
				</div>
			{/if}
		</div>
	</div>

	<div class="io">
		<div class="panel">
			<div class="panel-head">
				<label for="sql-input">{t('common.input')}</label>
				<button type="button" class="btn small" onclick={() => (input = '')}>
					{t('common.clear')}
				</button>
			</div>
			<textarea id="sql-input" class="area mono" rows="14" bind:value={input} spellcheck="false"
			></textarea>
		</div>
		<OutputBox id="sql-output" label={t('common.output')} value={output} rows={14} />
	</div>

	{#if action === 'format' && loader.kind === 'loading'}
		<Notice tone="info">{t('sql.loading')}</Notice>
	{:else if loader.kind === 'failed' && action === 'format'}
		<Notice tone="error">{t('sql.errLoad')}</Notice>
	{:else if input.trim() === ''}
		<Notice tone="info">{t('sql.empty')}</Notice>
	{:else if result && !result.ok}
		<Notice tone="error">
			{t(action === 'minify' ? 'sql.errMinify' : 'sql.errFormat', { message: result.message })}
		</Notice>
	{/if}
</div>
