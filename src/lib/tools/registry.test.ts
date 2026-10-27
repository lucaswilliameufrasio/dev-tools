import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { extraEn, extraPt } from '../i18n/catalog';
import { en } from '../i18n/en';
import { pt } from '../i18n/pt';
import { GROUP_ORDER, TOOLS } from './registry';

describe('tool registry', () => {
	it('has unique ids and only known groups', () => {
		const ids = TOOLS.map((tool) => tool.id);
		expect(new Set(ids).size).toBe(ids.length);
		for (const tool of TOOLS) {
			expect(GROUP_ORDER, tool.id).toContain(tool.group);
		}
	});

	it('gives every tool a route that renders its component', () => {
		for (const tool of TOOLS) {
			const route = `src/routes/${tool.id}/+page.svelte`;
			expect(existsSync(route), `${route} is missing`).toBe(true);
			const source = readFileSync(route, 'utf-8');
			expect(source, route).toContain(`<ToolPage id="${tool.id}">`);
			const imported = /import Tool from '#lib\/tools\/([^']+)';/.exec(source);
			expect(imported, `${route} must import its tool component`).not.toBeNull();
			expect(existsSync(`src/lib/tools/${imported?.[1] ?? ''}`), route).toBe(true);
		}
	});

	it('has a name and description in both languages', () => {
		const portuguese: Record<string, string> = { ...pt, ...extraPt };
		const english: Record<string, string> = { ...en, ...extraEn };
		for (const tool of TOOLS) {
			for (const key of [`tool.${tool.id}.name`, `tool.${tool.id}.desc`]) {
				expect(portuguese[key], `pt ${key}`).toBeTruthy();
				expect(english[key], `en ${key}`).toBeTruthy();
			}
		}
	});
});
