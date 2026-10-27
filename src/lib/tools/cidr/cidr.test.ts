import { describe, expect, it } from 'vitest';
import {
	compressIpv6,
	containsAddress,
	describeNetwork,
	expandIpv6,
	parseCidr,
	parseIpv6,
	splitNetwork,
	type Network
} from './cidr';

function net(text: string): Network {
	const result = parseCidr(text);
	if (!result.ok) {
		throw new Error(`invalid ${text}`);
	}
	return result.network;
}

function v4(text: string) {
	const info = describeNetwork(net(text));
	if (info.version !== 4) {
		throw new Error('not v4');
	}
	return info;
}

describe('IPv4', () => {
	it('10.0.0.0/8', () => {
		const info = v4('10.0.0.0/8');
		expect(info.broadcast).toBe('10.255.255.255');
		expect(info.netmask).toBe('255.0.0.0');
		expect(info.wildcard).toBe('0.255.255.255');
		expect(info.firstHost).toBe('10.0.0.1');
		expect(info.lastHost).toBe('10.255.255.254');
		expect(info.total).toBe(16777216n);
		expect(info.usable).toBe(16777214n);
		expect(info.kind).toBe('private');
		expect(info.ipClass).toBe('A');
	});

	it('192.168.1.0/24 and mask form', () => {
		const info = v4('192.168.1.10/255.255.255.0');
		expect(info.network).toBe('192.168.1.0');
		expect(info.prefix).toBe(24);
		expect(info.broadcast).toBe('192.168.1.255');
		expect(info.usable).toBe(254n);
		expect(info.binaryMask).toBe('11111111.11111111.11111111.00000000');
		expect(info.ipClass).toBe('C');
	});

	it('172.16.5.9/20', () => {
		const info = v4('172.16.5.9/20');
		expect(info.network).toBe('172.16.0.0');
		expect(info.broadcast).toBe('172.16.15.255');
		expect(info.netmask).toBe('255.255.240.0');
		expect(info.usable).toBe(4094n);
		expect(info.ipClass).toBe('B');
	});

	it('/31 uses both addresses (RFC 3021)', () => {
		const info = v4('10.0.0.4/31');
		expect(info.firstHost).toBe('10.0.0.4');
		expect(info.lastHost).toBe('10.0.0.5');
		expect(info.usable).toBe(2n);
	});

	it('/32 is a single host', () => {
		const info = v4('8.8.8.8/32');
		expect(info.firstHost).toBe('8.8.8.8');
		expect(info.lastHost).toBe('8.8.8.8');
		expect(info.usable).toBe(1n);
		expect(info.total).toBe(1n);
		expect(info.kind).toBe('public');
	});

	it('/0 covers everything', () => {
		const info = v4('0.0.0.0/0');
		expect(info.total).toBe(4294967296n);
		expect(info.broadcast).toBe('255.255.255.255');
		expect(info.netmask).toBe('0.0.0.0');
	});

	it('classifies special ranges', () => {
		expect(v4('127.0.0.1').kind).toBe('loopback');
		expect(v4('169.254.1.1').kind).toBe('link-local');
		expect(v4('100.64.0.0/10').kind).toBe('cgnat');
		expect(v4('224.0.0.1').kind).toBe('multicast');
		expect(v4('203.0.113.5').kind).toBe('documentation');
		expect(v4('172.32.0.1').kind).toBe('public');
		expect(v4('172.31.0.1').kind).toBe('private');
	});

	it('rejects invalid input', () => {
		expect(parseCidr('')).toEqual({ ok: false, reason: 'empty' });
		expect(parseCidr('300.1.1.1/8')).toEqual({ ok: false, reason: 'address' });
		expect(parseCidr('1.2.3/8')).toEqual({ ok: false, reason: 'address' });
		expect(parseCidr('10.0.0.0/33')).toEqual({ ok: false, reason: 'prefix' });
		expect(parseCidr('10.0.0.0/abc')).toEqual({ ok: false, reason: 'prefix' });
		expect(parseCidr('10.0.0.0/255.0.255.0')).toEqual({ ok: false, reason: 'mask' });
	});
});

describe('IPv6', () => {
	it('compression round trips', () => {
		const samples = [
			'::',
			'::1',
			'2001:db8::',
			'2001:db8::1',
			'fe80::1:2',
			'2001:db8:0:1:1:1:1:1',
			'1:0:0:2::3',
			'ff02::1'
		];
		for (const sample of samples) {
			const value = parseIpv6(sample);
			if (value === undefined) {
				throw new Error(sample);
			}
			expect(compressIpv6(value)).toBe(sample);
			expect(parseIpv6(expandIpv6(value))).toBe(value);
		}
	});

	it('does not compress a single zero group, picks the longest run', () => {
		expect(compressIpv6(parseIpv6('2001:db8:0:1:1:1:1:1') ?? 0n)).toBe('2001:db8:0:1:1:1:1:1');
		expect(compressIpv6(parseIpv6('1:0:0:2:0:0:0:3') ?? 0n)).toBe('1:0:0:2::3');
	});

	it('expands and parses IPv4 tail', () => {
		const value = parseIpv6('::ffff:192.0.2.128');
		expect(value).toBe(0xffffc0000280n);
		expect(expandIpv6(value ?? 0n)).toBe('0000:0000:0000:0000:0000:ffff:c000:0280');
		expect(parseIpv6('64:ff9b::1.2.3.4')).toBeDefined();
	});

	it('rejects malformed addresses', () => {
		for (const bad of ['1::2::3', '12345::', '1:2:3:4:5:6:7', '1:2:3:4:5:6:7:8:9', 'g::1', ':1:2', '::1.2.3']) {
			expect(parseIpv6(bad)).toBeUndefined();
		}
	});

	it('2001:db8::/32 range', () => {
		const info = describeNetwork(net('2001:db8::/32'));
		if (info.version !== 6) {
			throw new Error('not v6');
		}
		expect(info.network).toBe('2001:db8::');
		expect(info.first).toBe('2001:db8::');
		expect(info.last).toBe('2001:db8:ffff:ffff:ffff:ffff:ffff:ffff');
		expect(info.total).toBe(1n << 96n);
		expect(info.kind).toBe('documentation');
	});

	it('classifies types', () => {
		const kind = (text: string) => describeNetwork(net(text)).kind;
		expect(kind('::1')).toBe('loopback');
		expect(kind('fe80::1/64')).toBe('link-local');
		expect(kind('fd00::/8')).toBe('ula');
		expect(kind('ff02::1')).toBe('multicast');
		expect(kind('2606:4700::/32')).toBe('global');
	});

	it('rejects prefix above 128 and mask form', () => {
		expect(parseCidr('::/129')).toEqual({ ok: false, reason: 'prefix' });
		expect(parseCidr('::/255.0.0.0')).toEqual({ ok: false, reason: 'prefix' });
	});
});

describe('split', () => {
	it('splits /24 into four /26', () => {
		const result = splitNetwork(net('192.168.1.0/24'), 26);
		expect(result.ok && result.rows.map((row) => row.cidr)).toEqual([
			'192.168.1.0/26',
			'192.168.1.64/26',
			'192.168.1.128/26',
			'192.168.1.192/26'
		]);
	});

	it('caps the list at 256 rows', () => {
		const result = splitNetwork(net('10.0.0.0/8'), 24);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.count).toBe(65536n);
			expect(result.rows).toHaveLength(256);
			expect(result.truncated).toBe(true);
		}
	});

	it('handles IPv6 and invalid prefixes', () => {
		const result = splitNetwork(net('2001:db8::/32'), 34);
		expect(result.ok && result.rows[1].cidr).toBe('2001:db8:4000::/34');
		expect(splitNetwork(net('10.0.0.0/24'), 16).ok).toBe(false);
		expect(splitNetwork(net('10.0.0.0/24'), 33).ok).toBe(false);
	});
});

describe('contains', () => {
	it('checks membership', () => {
		expect(containsAddress(net('10.0.0.0/24'), '10.0.0.200')).toEqual({ ok: true, contains: true });
		expect(containsAddress(net('10.0.0.0/24'), '10.0.1.1')).toEqual({ ok: true, contains: false });
		expect(containsAddress(net('2001:db8::/32'), '2001:db8:1::1')).toEqual({ ok: true, contains: true });
	});

	it('reports errors', () => {
		expect(containsAddress(net('10.0.0.0/24'), 'x')).toEqual({ ok: false, reason: 'address' });
		expect(containsAddress(net('10.0.0.0/24'), '::1')).toEqual({ ok: false, reason: 'version' });
		expect(containsAddress(net('10.0.0.0/24'), '')).toEqual({ ok: false, reason: 'empty' });
	});
});
