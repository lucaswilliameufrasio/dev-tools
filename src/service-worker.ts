/// <reference lib="webworker" />
import { version } from '$app/env';
import { assets, immutable, prerendered } from '$app/manifest';
import { self } from '$app/service-worker';

const CACHE_NAME = `dev-tools-${version}`;

// Manifest paths are relative to the base path and have no leading slash
// (the home page is an empty string), so resolve them against the scope.
// `_headers` is read by Cloudflare and never served, and addAll() rejects
// the whole install if any single request fails.
// Module scripts are fetched with an Origin header, so servers that reply with
// `Vary: Origin` would never match what addAll() stored without this.
const MATCH_OPTIONS: CacheQueryOptions = { ignoreVary: true };

const NOT_SERVED = new Set(['_headers']);

const PRECACHE_URLS: string[] = [
	...immutable.map((entry) => entry.path),
	...assets.map((entry) => entry.path),
	...prerendered.map((entry) => entry.path)
]
	.filter((path) => !NOT_SERVED.has(path))
	.map((path) => new URL(path, self.registration.scope).href);
const PRECACHED_PATHNAMES = new Set(PRECACHE_URLS.map((href) => new URL(href).pathname));

self.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE_NAME);
			await cache.addAll(PRECACHE_URLS);
			await self.skipWaiting();
		})()
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			const names = await caches.keys();
			for (const name of names) {
				if (name !== CACHE_NAME) {
					await caches.delete(name);
				}
			}
			await self.clients.claim();
		})()
	);
});

async function networkFirst(request: Request): Promise<Response> {
	const cache = await caches.open(CACHE_NAME);
	try {
		const response = await fetch(request);
		if (response.ok) {
			await cache.put(request, response.clone());
		}
		return response;
	} catch (error) {
		const url = new URL(request.url);
		const cached = (await cache.match(request, MATCH_OPTIONS)) ?? (await cache.match(url.pathname, MATCH_OPTIONS));
		if (cached) {
			return cached;
		}
		const home = await cache.match('/', MATCH_OPTIONS);
		if (home) {
			return home;
		}
		throw error;
	}
}

async function cacheFirst(request: Request): Promise<Response> {
	const cache = await caches.open(CACHE_NAME);
	const cached = await cache.match(request, MATCH_OPTIONS);
	if (cached) {
		return cached;
	}
	return fetch(request);
}

self.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') {
		return;
	}
	const url = new URL(request.url);
	if (url.origin !== self.location.origin) {
		return;
	}
	if (request.mode === 'navigate') {
		event.respondWith(networkFirst(request));
		return;
	}
	if (PRECACHED_PATHNAMES.has(url.pathname)) {
		event.respondWith(cacheFirst(request));
	}
});
