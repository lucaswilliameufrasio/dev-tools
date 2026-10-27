<script lang="ts">
	import { i18n, t, type MessageKey } from '#lib/i18n/index.svelte.js';
	import CopyButton from '#lib/ui/CopyButton.svelte';
	import Notice from '#lib/ui/Notice.svelte';
	import Segmented from '#lib/ui/Segmented.svelte';
	import {
		SUBNET_LIST_LIMIT,
		containsAddress,
		describeNetwork,
		formatBigInt,
		formatNetwork,
		parseCidr,
		splitNetwork,
		type Ipv4Info,
		type Ipv4Kind,
		type Ipv6Kind,
		type NetworkInfo
	} from './cidr';

	type Mode = 'calc' | 'split' | 'contains';
	type Row = { label: MessageKey; value: string };

	const EXAMPLES = ['10.0.0.0/24', '192.168.1.10/255.255.255.0', '172.16.5.9/20', '2001:db8::/32'];

	const KIND4: Record<Ipv4Kind, MessageKey> = {
		'this-network': 'cidr.kind4.this-network',
		private: 'cidr.kind4.private',
		loopback: 'cidr.kind4.loopback',
		'link-local': 'cidr.kind4.link-local',
		cgnat: 'cidr.kind4.cgnat',
		multicast: 'cidr.kind4.multicast',
		documentation: 'cidr.kind4.documentation',
		reserved: 'cidr.kind4.reserved',
		broadcast: 'cidr.kind4.broadcast',
		public: 'cidr.kind4.public'
	};
	const KIND6: Record<Ipv6Kind, MessageKey> = {
		unspecified: 'cidr.kind6.unspecified',
		loopback: 'cidr.kind6.loopback',
		'link-local': 'cidr.kind6.link-local',
		ula: 'cidr.kind6.ula',
		multicast: 'cidr.kind6.multicast',
		documentation: 'cidr.kind6.documentation',
		'ipv4-mapped': 'cidr.kind6.ipv4-mapped',
		global: 'cidr.kind6.global',
		reserved: 'cidr.kind6.reserved'
	};
	const CLASS_KEY: Record<Ipv4Info['ipClass'], MessageKey> = {
		A: 'cidr.class.A',
		B: 'cidr.class.B',
		C: 'cidr.class.C',
		D: 'cidr.class.D',
		E: 'cidr.class.E'
	};

	let mode = $state<Mode>('calc');
	let input = $state('192.168.1.0/24');
	let newPrefixText = $state('26');
	let ipText = $state('192.168.1.77');

	const separator = $derived(i18n.locale === 'pt' ? '.' : ',');
	const parsed = $derived(parseCidr(input));
	const parseError = $derived.by((): MessageKey | undefined => {
		if (parsed.ok) {
			return undefined;
		}
		switch (parsed.reason) {
			case 'empty':
				return 'cidr.err.empty';
			case 'address':
				return 'cidr.err.address';
			case 'prefix':
				return 'cidr.err.prefix';
			case 'mask':
				return 'cidr.err.mask';
		}
	});
	const info = $derived<NetworkInfo | undefined>(parsed.ok ? describeNetwork(parsed.network) : undefined);

	function fmt(value: bigint): string {
		return formatBigInt(value, separator);
	}

	const rows = $derived.by((): Row[] => {
		if (info === undefined) {
			return [];
		}
		if (info.version === 4) {
			return [
				{ label: 'cidr.network', value: `${info.network}/${info.prefix}` },
				{ label: 'cidr.netmask', value: info.netmask },
				{ label: 'cidr.wildcard', value: info.wildcard },
				{ label: 'cidr.broadcast', value: info.broadcast },
				{ label: 'cidr.firstHost', value: info.firstHost },
				{ label: 'cidr.lastHost', value: info.lastHost },
				{ label: 'cidr.total', value: fmt(info.total) },
				{ label: 'cidr.usable', value: fmt(info.usable) },
				{ label: 'cidr.binaryMask', value: info.binaryMask },
				{ label: 'cidr.class', value: t(CLASS_KEY[info.ipClass]) },
				{ label: 'cidr.type', value: t(KIND4[info.kind]) }
			];
		}
		return [
			{ label: 'cidr.network', value: `${info.network}/${info.prefix}` },
			{ label: 'cidr.expanded', value: info.networkExpanded },
			{ label: 'cidr.prefix', value: `/${info.prefix}` },
			{ label: 'cidr.firstAddress', value: info.first },
			{ label: 'cidr.lastAddress', value: info.last },
			{ label: 'cidr.total', value: fmt(info.total) },
			{ label: 'cidr.type', value: t(KIND6[info.kind]) }
		];
	});

	const note = $derived.by((): MessageKey | undefined => {
		if (info === undefined || info.version !== 4) {
			return undefined;
		}
		if (info.prefix === 31) {
			return 'cidr.note31';
		}
		if (info.prefix === 32) {
			return 'cidr.note32';
		}
		return undefined;
	});

	const newPrefix = $derived(/^\d{1,3}$/.test(newPrefixText.trim()) ? Number(newPrefixText.trim()) : NaN);
	const split = $derived(parsed.ok ? splitNetwork(parsed.network, newPrefix) : undefined);
	const maxPrefix = $derived(parsed.ok && parsed.network.version === 6 ? 128 : 32);

	const contains = $derived(parsed.ok ? containsAddress(parsed.network, ipText) : undefined);
	const containsError = $derived.by((): MessageKey | undefined => {
		if (contains === undefined || contains.ok) {
			return undefined;
		}
		switch (contains.reason) {
			case 'empty':
				return 'cidr.contains.empty';
			case 'address':
				return 'cidr.err.ip';
			case 'version':
				return 'cidr.err.version';
		}
	});
	const networkLabel = $derived(parsed.ok ? formatNetwork(parsed.network) : '');
</script>

<div class="stack">
	<Segmented
		name="cidr-mode"
		legend={t('cidr.mode')}
		options={[
			{ value: 'calc', label: t('cidr.mode.calc') },
			{ value: 'split', label: t('cidr.mode.split') },
			{ value: 'contains', label: t('cidr.mode.contains') }
		]}
		bind:value={mode}
	/>

	<div class="panel">
		<div class="field">
			<label for="cidr-input">{t('cidr.input')}</label>
			<input
				id="cidr-input"
				class="input mono"
				type="text"
				bind:value={input}
				spellcheck="false"
				autocomplete="off"
				autocapitalize="off"
				placeholder={t('cidr.inputHint')}
				aria-invalid={parseError !== undefined}
			/>
		</div>
		<div class="row tight examples">
			<span class="muted small-text">{t('cidr.example')}</span>
			{#each EXAMPLES as example (example)}
				<button type="button" class="btn small mono" onclick={() => (input = example)}>{example}</button>
			{/each}
		</div>
	</div>

	{#if parseError !== undefined}
		<Notice tone="error">{t(parseError)}</Notice>
	{:else if mode === 'calc'}
		<div class="panel">
			<ul class="results">
				{#each rows as row (row.label)}
					<li>
						<span class="results-label">{t(row.label)}</span>
						<code class="results-value">{row.value}</code>
						<CopyButton value={row.value} />
					</li>
				{/each}
			</ul>
		</div>
		{#if note !== undefined}
			<Notice tone="info">{t(note)}</Notice>
		{/if}
	{:else if mode === 'split'}
		<div class="panel">
			<div class="field">
				<label for="cidr-newprefix">{t('cidr.newPrefix')}</label>
				<input
					id="cidr-newprefix"
					class="input mono"
					type="text"
					inputmode="numeric"
					bind:value={newPrefixText}
					autocomplete="off"
					aria-invalid={split !== undefined && !split.ok}
				/>
			</div>
		</div>
		{#if split !== undefined && !split.ok && parsed.ok}
			<Notice tone="error">
				{t('cidr.err.newPrefix', { min: parsed.network.prefix, max: maxPrefix })}
			</Notice>
		{:else if split !== undefined && split.ok}
			<p class="small-text" role="status">
				{t('cidr.splitCount', { count: fmt(split.count), prefix: newPrefix })}
			</p>
			{#if split.truncated}
				<Notice tone="info">
					{t('cidr.splitCapped', { limit: SUBNET_LIST_LIMIT, count: fmt(split.count) })}
				</Notice>
			{/if}
			<div class="panel table-wrap">
				<table>
					<thead>
						<tr>
							<th>{t('cidr.colSubnet')}</th>
							<th>{t('cidr.colFirst')}</th>
							<th>{t('cidr.colLast')}</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{#each split.rows as row (row.cidr)}
							<tr>
								<td class="mono">{row.cidr}</td>
								<td class="mono">{row.first}</td>
								<td class="mono">{row.last}</td>
								<td><CopyButton value={row.cidr} /></td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{:else}
		<div class="panel">
			<div class="field">
				<label for="cidr-ip">{t('cidr.ipLabel')}</label>
				<input
					id="cidr-ip"
					class="input mono"
					type="text"
					bind:value={ipText}
					spellcheck="false"
					autocomplete="off"
					placeholder={t('cidr.ipHint')}
					aria-invalid={containsError !== undefined && ipText.trim() !== ''}
				/>
			</div>
		</div>
		{#if containsError !== undefined}
			<Notice tone={ipText.trim() === '' ? 'info' : 'error'}>{t(containsError)}</Notice>
		{:else if contains !== undefined && contains.ok}
			<p class="verdict">
				<span class="pill" class:bad={!contains.contains}>
					{contains.contains ? '✓' : '✗'}
				</span>
				<span role="status">
					{t(contains.contains ? 'cidr.contains.yes' : 'cidr.contains.no', {
						ip: ipText.trim(),
						network: networkLabel
					})}
				</span>
			</p>
		{/if}
	{/if}
</div>

<style>
	.examples {
		margin-top: 8px;
		flex-wrap: wrap;
	}
	.verdict {
		display: flex;
		align-items: center;
		gap: 10px;
		margin: 0;
	}
</style>
