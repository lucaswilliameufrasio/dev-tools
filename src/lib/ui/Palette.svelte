<script lang="ts">
	import { goto } from '$app/navigation';
	import { t, type MessageKey } from '#lib/i18n/index.svelte.js';
	import { toolHref } from '#lib/tools/href.js';
	import { TOOLS, type ToolDefinition } from '#lib/tools/registry.js';
	import { tick } from 'svelte';

	type PaletteState = { kind: 'closed' } | { kind: 'open'; query: string; index: number };

	let palette = $state<PaletteState>({ kind: 'closed' });
	let dialog = $state<HTMLDialogElement>();
	let searchInput = $state<HTMLInputElement>();

	const matches = $derived.by((): ToolDefinition[] => {
		if (palette.kind === 'closed') {
			return [];
		}
		const query = palette.query.trim().toLowerCase();
		if (query === '') {
			return TOOLS;
		}
		return TOOLS.filter((tool) => {
			const name = t(`tool.${tool.id}.name` as MessageKey).toLowerCase();
			const description = t(`tool.${tool.id}.desc` as MessageKey).toLowerCase();
			return (
				name.includes(query) ||
				description.includes(query) ||
				tool.keywords.some((keyword) => keyword.includes(query))
			);
		});
	});

	export async function open(): Promise<void> {
		palette = { kind: 'open', query: '', index: 0 };
		await tick();
		if (dialog && !dialog.open) {
			dialog.showModal();
		}
		searchInput?.focus();
	}

	function close(): void {
		palette = { kind: 'closed' };
		if (dialog?.open) {
			dialog.close();
		}
	}

	async function choose(tool: ToolDefinition): Promise<void> {
		close();
		await goto(toolHref(tool.id));
	}

	function onInput(event: Event & { currentTarget: HTMLInputElement }): void {
		palette = { kind: 'open', query: event.currentTarget.value, index: 0 };
	}

	function onKeydown(event: KeyboardEvent): void {
		if (palette.kind !== 'open') {
			return;
		}
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			palette = { ...palette, index: Math.min(palette.index + 1, matches.length - 1) };
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			palette = { ...palette, index: Math.max(palette.index - 1, 0) };
		} else if (event.key === 'Enter') {
			event.preventDefault();
			const chosen = matches[palette.index];
			if (chosen) {
				void choose(chosen);
			}
		}
	}

	function onWindowKeydown(event: KeyboardEvent): void {
		if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
			event.preventDefault();
			void open();
		}
	}
</script>

<svelte:window onkeydown={onWindowKeydown} />

<dialog bind:this={dialog} class="palette" onclose={close} aria-label={t('palette.title')}>
	{#if palette.kind === 'open'}
		<input
			bind:this={searchInput}
			id="palette-search"
			type="search"
			class="palette-input"
			placeholder={t('palette.placeholder')}
			autocomplete="off"
			spellcheck="false"
			value={palette.query}
			oninput={onInput}
			onkeydown={onKeydown}
		/>
		<ul class="palette-list" role="listbox" aria-label={t('palette.title')}>
			{#each matches as tool, position (tool.id)}
				<li role="option" aria-selected={position === palette.index}>
					<button
						type="button"
						class:active={position === palette.index}
						onclick={() => choose(tool)}
						onmousemove={() => {
							if (palette.kind === 'open') {
								palette = { ...palette, index: position };
							}
						}}
					>
						<span class="glyph">{tool.glyph}</span>
						<span class="palette-text">
							<strong>{t(`tool.${tool.id}.name` as MessageKey)}</strong>
							<small>{t(`tool.${tool.id}.desc` as MessageKey)}</small>
						</span>
					</button>
				</li>
			{:else}
				<li class="palette-empty">{t('palette.empty')}</li>
			{/each}
		</ul>
	{/if}
</dialog>
