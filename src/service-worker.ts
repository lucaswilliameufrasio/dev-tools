/// <reference lib="webworker" />
import { version } from '$app/env';
import { assets, immutable, prerendered } from '$app/manifest';
import { self } from '$app/service-worker';

const CACHE_NAME = `dev-tools-${version}`;

const PRECACHE_PATHS: string[] = [
	...immutable.map((entry) => entry.path as string),
	...assets.map((entry) => entry.path as string),
	...prerendered.map((entry) => entry.path as string)
];
const PRECACHED = new Set(PRECACHE_PATHS);

self.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE_NAME);
			await cache.addAll(PRECACHE_PATHS);
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
		const cached = (await cache.match(request)) ?? (await cache.match(url.pathname));
		if (cached) {
			return cached;
		}
		const home = await cache.match('/');
		if (home) {
			return home;
		}
		throw error;
	}
}

async function cacheFirst(request: Request): Promise<Response> {
	const cache = await caches.open(CACHE_NAME);
	const cached = await cache.match(request);
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
	if (PRECACHED.has(url.pathname)) {
		event.respondWith(cacheFirst(request));
	}
});
