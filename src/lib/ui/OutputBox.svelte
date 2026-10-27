<script lang="ts">
	import CopyButton from './CopyButton.svelte';

	type Props = { id: string; label: string; value: string; rows?: number; placeholder?: string };

	let { id, label, value, rows = 8, placeholder }: Props = $props();
</script>

<div class="panel">
	<div class="panel-head">
		<label for={id}>{label}</label>
		<CopyButton {value} />
	</div>
	<textarea {id} class="area" readonly {rows} {value} {placeholder} spellcheck="false"></textarea>
</div>
