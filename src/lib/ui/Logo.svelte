<script lang="ts">
	type Props = { size?: number };

	let { size = 28 }: Props = $props();
</script>

<svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true" focusable="false">
	<rect width="512" height="512" rx="112" fill="#2447e0" />
	<g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="40">
		<polyline points="168,166 92,256 168,346" stroke="#ffffff" />
		<polyline points="344,166 420,256 344,346" stroke="#ffffff" />
		<line x1="222" y1="352" x2="290" y2="352" stroke="#ffb020" />
	</g>
</svg>
