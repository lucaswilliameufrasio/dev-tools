import { resolve } from '$app/paths';
import type { ToolId } from './registry.js';

/** Path of a tool page, honouring the configured base path. */
export function toolHref(id: ToolId): string {
	return `${resolve('/').replace(/\/$/, '')}/${id}`;
}
