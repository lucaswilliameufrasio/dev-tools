export type IpVersion = 4 | 6;

export type Network = { version: IpVersion; address: bigint; prefix: number };

export type ParseCidrResult =
	| { ok: true; network: Network }
	| { ok: false; reason: 'empty' | 'address' | 'prefix' | 'mask' };

export type Ipv4Kind =
	| 'this-network'
	| 'private'
	| 'loopback'
	| 'link-local'
	| 'cgnat'
	| 'multicast'
	| 'documentation'
	| 'reserved'
	| 'broadcast'
	| 'public';

export type Ipv6Kind =
	| 'unspecified'
	| 'loopback'
	| 'link-local'
	| 'ula'
	| 'multicast'
	| 'documentation'
	| 'ipv4-mapped'
	| 'global'
	| 'reserved';

export type Ipv4Info = {
	version: 4;
	network: string;
	broadcast: string;
	netmask: string;
	wildcard: string;
	firstHost: string;
	lastHost: string;
	prefix: number;
	total: bigint;
	usable: bigint;
	binaryMask: string;
	ipClass: 'A' | 'B' | 'C' | 'D' | 'E';
	kind: Ipv4Kind;
};

export type Ipv6Info = {
	version: 6;
	network: string;
	networkExpanded: string;
	prefix: number;
	first: string;
	last: string;
	total: bigint;
	kind: Ipv6Kind;
};

export type NetworkInfo = Ipv4Info | Ipv6Info;

const IPV4_BITS = 32;
const IPV6_BITS = 128;
export const SUBNET_LIST_LIMIT = 256;

function bitsOf(version: IpVersion): number {
	return version === 4 ? IPV4_BITS : IPV6_BITS;
}

function allOnes(bits: number): bigint {
	return (1n << BigInt(bits)) - 1n;
}

function hostMask(version: IpVersion, prefix: number): bigint {
	return allOnes(bitsOf(version) - prefix);
}

function netMask(version: IpVersion, prefix: number): bigint {
	return allOnes(bitsOf(version)) ^ hostMask(version, prefix);
}

export function parseIpv4(text: string): bigint | undefined {
	const parts = text.split('.');
	if (parts.length !== 4) {
		return undefined;
	}
	let value = 0n;
	for (const part of parts) {
		if (!/^\d{1,3}$/.test(part)) {
			return undefined;
		}
		if (part.length > 1 && part.startsWith('0')) {
			return undefined;
		}
		const octet = Number(part);
		if (octet > 255) {
			return undefined;
		}
		value = (value << 8n) | BigInt(octet);
	}
	return value;
}

export function formatIpv4(value: bigint): string {
	const octets: string[] = [];
	for (let shift = 24n; shift >= 0n; shift -= 8n) {
		octets.push(String((value >> shift) & 255n));
	}
	return octets.join('.');
}

function parseHexGroups(text: string): number[] | undefined {
	if (text === '') {
		return [];
	}
	const groups: number[] = [];
	for (const part of text.split(':')) {
		if (!/^[0-9a-fA-F]{1,4}$/.test(part)) {
			return undefined;
		}
		groups.push(parseInt(part, 16));
	}
	return groups;
}

export function parseIpv6(input: string): bigint | undefined {
	let text = input;
	if (text.includes('%') || text === '') {
		return undefined;
	}
	let tail: number[] = [];
	const lastColon = text.lastIndexOf(':');
	if (lastColon >= 0 && text.slice(lastColon + 1).includes('.')) {
		const v4 = parseIpv4(text.slice(lastColon + 1));
		if (v4 === undefined) {
			return undefined;
		}
		tail = [Number(v4 >> 16n), Number(v4 & 0xffffn)];
		text = text.slice(0, lastColon + 1);
		if (text.endsWith('::')) {
			// keeps "::" intact
		} else {
			text = text.slice(0, -1);
		}
	}
	const doubleAt = text.indexOf('::');
	let groups: number[];
	if (doubleAt >= 0) {
		if (text.indexOf('::', doubleAt + 1) >= 0) {
			return undefined;
		}
		const head = parseHexGroups(text.slice(0, doubleAt));
		const rest = parseHexGroups(text.slice(doubleAt + 2));
		if (head === undefined || rest === undefined) {
			return undefined;
		}
		const missing = 8 - head.length - rest.length - tail.length;
		if (missing < 1) {
			return undefined;
		}
		groups = [...head, ...new Array<number>(missing).fill(0), ...rest, ...tail];
	} else {
		const all = parseHexGroups(text);
		if (all === undefined) {
			return undefined;
		}
		groups = [...all, ...tail];
		if (groups.length !== 8) {
			return undefined;
		}
	}
	let value = 0n;
	for (const group of groups) {
		value = (value << 16n) | BigInt(group);
	}
	return value;
}

function ipv6Groups(value: bigint): number[] {
	const groups: number[] = [];
	for (let index = 7; index >= 0; index -= 1) {
		groups.push(Number((value >> BigInt(index * 16)) & 0xffffn));
	}
	return groups;
}

/** Full form: eight four-digit groups. */
export function expandIpv6(value: bigint): string {
	return ipv6Groups(value)
		.map((group) => group.toString(16).padStart(4, '0'))
		.join(':');
}

/** RFC 5952 compressed form: longest run of two or more zero groups becomes "::". */
export function compressIpv6(value: bigint): string {
	const groups = ipv6Groups(value);
	let bestStart = -1;
	let bestLength = 0;
	let index = 0;
	while (index < 8) {
		if (groups[index] !== 0) {
			index += 1;
			continue;
		}
		let end = index;
		while (end < 8 && groups[end] === 0) {
			end += 1;
		}
		if (end - index > bestLength) {
			bestStart = index;
			bestLength = end - index;
		}
		index = end;
	}
	const hex = groups.map((group) => group.toString(16));
	if (bestLength < 2) {
		return hex.join(':');
	}
	const left = hex.slice(0, bestStart).join(':');
	const right = hex.slice(bestStart + bestLength).join(':');
	return `${left}::${right}`;
}

export function parseAddress(text: string): { version: IpVersion; address: bigint } | undefined {
	const trimmed = text.trim();
	if (trimmed.includes(':')) {
		const address = parseIpv6(trimmed);
		return address === undefined ? undefined : { version: 6, address };
	}
	const address = parseIpv4(trimmed);
	return address === undefined ? undefined : { version: 4, address };
}

function prefixFromMask(mask: bigint): number | undefined {
	let ones = 0;
	let seenZero = false;
	for (let bit = 31n; bit >= 0n; bit -= 1n) {
		if (((mask >> bit) & 1n) === 1n) {
			if (seenZero) {
				return undefined;
			}
			ones += 1;
		} else {
			seenZero = true;
		}
	}
	return ones;
}

export function parseCidr(input: string): ParseCidrResult {
	const text = input.trim();
	if (text === '') {
		return { ok: false, reason: 'empty' };
	}
	const slash = text.indexOf('/');
	const addressText = slash >= 0 ? text.slice(0, slash).trim() : text;
	const suffix = slash >= 0 ? text.slice(slash + 1).trim() : undefined;
	const parsed = parseAddress(addressText);
	if (parsed === undefined) {
		return { ok: false, reason: 'address' };
	}
	const bits = bitsOf(parsed.version);
	let prefix = bits;
	if (suffix !== undefined) {
		if (suffix.includes('.')) {
			if (parsed.version !== 4) {
				return { ok: false, reason: 'prefix' };
			}
			const mask = parseIpv4(suffix);
			const fromMask = mask === undefined ? undefined : prefixFromMask(mask);
			if (fromMask === undefined) {
				return { ok: false, reason: 'mask' };
			}
			prefix = fromMask;
		} else {
			if (!/^\d{1,3}$/.test(suffix)) {
				return { ok: false, reason: 'prefix' };
			}
			prefix = Number(suffix);
			if (prefix > bits) {
				return { ok: false, reason: 'prefix' };
			}
		}
	}
	return { ok: true, network: { version: parsed.version, address: parsed.address, prefix } };
}

function inRange(value: bigint, base: string, prefix: number): boolean {
	const baseValue = parseIpv4(base);
	if (baseValue === undefined) {
		return false;
	}
	const mask = netMask(4, prefix);
	return (value & mask) === (baseValue & mask);
}

export function classifyIpv4(value: bigint): Ipv4Kind {
	if (value === 0xffffffffn) {
		return 'broadcast';
	}
	if (inRange(value, '0.0.0.0', 8)) {
		return 'this-network';
	}
	if (inRange(value, '10.0.0.0', 8) || inRange(value, '172.16.0.0', 12) || inRange(value, '192.168.0.0', 16)) {
		return 'private';
	}
	if (inRange(value, '127.0.0.0', 8)) {
		return 'loopback';
	}
	if (inRange(value, '169.254.0.0', 16)) {
		return 'link-local';
	}
	if (inRange(value, '100.64.0.0', 10)) {
		return 'cgnat';
	}
	if (inRange(value, '224.0.0.0', 4)) {
		return 'multicast';
	}
	if (
		inRange(value, '192.0.2.0', 24) ||
		inRange(value, '198.51.100.0', 24) ||
		inRange(value, '203.0.113.0', 24)
	) {
		return 'documentation';
	}
	if (inRange(value, '240.0.0.0', 4)) {
		return 'reserved';
	}
	return 'public';
}

function inRange6(value: bigint, base: string, prefix: number): boolean {
	const baseValue = parseIpv6(base);
	if (baseValue === undefined) {
		return false;
	}
	const mask = netMask(6, prefix);
	return (value & mask) === (baseValue & mask);
}

export function classifyIpv6(value: bigint): Ipv6Kind {
	if (value === 0n) {
		return 'unspecified';
	}
	if (value === 1n) {
		return 'loopback';
	}
	if (inRange6(value, '::ffff:0:0', 96)) {
		return 'ipv4-mapped';
	}
	if (inRange6(value, 'fe80::', 10)) {
		return 'link-local';
	}
	if (inRange6(value, 'fc00::', 7)) {
		return 'ula';
	}
	if (inRange6(value, 'ff00::', 8)) {
		return 'multicast';
	}
	if (inRange6(value, '2001:db8::', 32)) {
		return 'documentation';
	}
	if (inRange6(value, '2000::', 3)) {
		return 'global';
	}
	return 'reserved';
}

function classOf(value: bigint): Ipv4Info['ipClass'] {
	const first = Number(value >> 24n);
	if (first < 128) {
		return 'A';
	}
	if (first < 192) {
		return 'B';
	}
	if (first < 224) {
		return 'C';
	}
	if (first < 240) {
		return 'D';
	}
	return 'E';
}

function binaryMask(prefix: number): string {
	const bits = '1'.repeat(prefix) + '0'.repeat(IPV4_BITS - prefix);
	return [bits.slice(0, 8), bits.slice(8, 16), bits.slice(16, 24), bits.slice(24)].join('.');
}

export function describeNetwork(network: Network): NetworkInfo {
	const { version, address, prefix } = network;
	const mask = netMask(version, prefix);
	const host = hostMask(version, prefix);
	const base = address & mask;
	const last = base | host;
	const total = 1n << BigInt(bitsOf(version) - prefix);
	if (version === 6) {
		return {
			version: 6,
			network: compressIpv6(base),
			networkExpanded: expandIpv6(base),
			prefix,
			first: compressIpv6(base),
			last: compressIpv6(last),
			total,
			kind: classifyIpv6(base)
		};
	}
	let firstHost = base + 1n;
	let lastHost = last - 1n;
	let usable = total - 2n;
	if (prefix === 32) {
		firstHost = base;
		lastHost = base;
		usable = 1n;
	} else if (prefix === 31) {
		firstHost = base;
		lastHost = last;
		usable = 2n;
	}
	return {
		version: 4,
		network: formatIpv4(base),
		broadcast: formatIpv4(last),
		netmask: formatIpv4(mask),
		wildcard: formatIpv4(host),
		firstHost: formatIpv4(firstHost),
		lastHost: formatIpv4(lastHost),
		prefix,
		total,
		usable,
		binaryMask: binaryMask(prefix),
		ipClass: classOf(base),
		kind: classifyIpv4(base)
	};
}

export function formatNetwork(network: Network): string {
	const base = network.address & netMask(network.version, network.prefix);
	const text = network.version === 4 ? formatIpv4(base) : compressIpv6(base);
	return `${text}/${network.prefix}`;
}

export function formatBigInt(value: bigint, separator: string): string {
	return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

export type SubnetRow = { cidr: string; first: string; last: string };

export type SplitResult =
	| { ok: true; count: bigint; rows: SubnetRow[]; truncated: boolean }
	| { ok: false; reason: 'prefix-range' };

export function splitNetwork(network: Network, newPrefix: number): SplitResult {
	const bits = bitsOf(network.version);
	if (!Number.isInteger(newPrefix) || newPrefix < network.prefix || newPrefix > bits) {
		return { ok: false, reason: 'prefix-range' };
	}
	const base = network.address & netMask(network.version, network.prefix);
	const count = 1n << BigInt(newPrefix - network.prefix);
	const size = 1n << BigInt(bits - newPrefix);
	const shown = count > BigInt(SUBNET_LIST_LIMIT) ? SUBNET_LIST_LIMIT : Number(count);
	const format = network.version === 4 ? formatIpv4 : compressIpv6;
	const rows: SubnetRow[] = [];
	for (let index = 0; index < shown; index += 1) {
		const start = base + BigInt(index) * size;
		rows.push({
			cidr: `${format(start)}/${newPrefix}`,
			first: format(start),
			last: format(start + size - 1n)
		});
	}
	return { ok: true, count, rows, truncated: count > BigInt(SUBNET_LIST_LIMIT) };
}

export type ContainsResult =
	| { ok: true; contains: boolean }
	| { ok: false; reason: 'empty' | 'address' | 'version' };

export function containsAddress(network: Network, text: string): ContainsResult {
	if (text.trim() === '') {
		return { ok: false, reason: 'empty' };
	}
	const parsed = parseAddress(text);
	if (parsed === undefined) {
		return { ok: false, reason: 'address' };
	}
	if (parsed.version !== network.version) {
		return { ok: false, reason: 'version' };
	}
	const mask = netMask(network.version, network.prefix);
	return { ok: true, contains: (parsed.address & mask) === (network.address & mask) };
}
