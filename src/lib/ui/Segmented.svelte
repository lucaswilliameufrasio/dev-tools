<script lang="ts" generics="T extends string | number">
	type Option = { value: T; label: string };
	type Props = { name: string; legend: string; options: Option[]; value: T };

	let { name, legend, options, value = $bindable() }: Props = $props();
</script>

<fieldset class="seg">
	<legend>{legend}</legend>
	<div class="seg-track">
		{#each options as option (option.value)}
			<label class:active={value === option.value}>
				<input type="radio" {name} value={option.value} bind:group={value} />
				<span>{option.label}</span>
			</label>
		{/each}
	</div>
</fieldset>
