import { error } from '@sveltejs/kit';
import { findTool, TOOLS } from '#lib/tools/registry.js';
import type { EntryGenerator, PageLoad } from './$types';

export const prerender = true;

export const entries: EntryGenerator = () => {
	return TOOLS.map((tool) => ({ id: tool.id }));
};

export const load: PageLoad = ({ params }) => {
	if (!findTool(params.id)) {
		error(404, 'Not found');
	}
	return { id: params.id };
};
