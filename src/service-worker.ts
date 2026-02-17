/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;

const CACHE_NAME = `cache-${version}`;

const PRECACHE_ASSETS = [
	...build,
	...files
];

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE_NAME)
			.then((cache) => cache.addAll(PRECACHE_ASSETS))
			.then(() => sw.skipWaiting())
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then(async (keys) => {
			for (const key of keys) {
				if (key !== CACHE_NAME) {
					await caches.delete(key);
				}
			}
			await sw.clients.claim();
		})
	);
});

sw.addEventListener('fetch', (event) => {
	const { request } = event;
	const url = new URL(request.url);

	if (request.method !== 'GET') return;

	// Skip Firebase/Google API requests — Firestore handles its own offline cache
	if (
		url.hostname.includes('googleapis.com') ||
		url.hostname.includes('firebaseio.com') ||
		url.hostname.includes('firestore.googleapis.com') ||
		url.hostname.includes('google.com') ||
		url.hostname.includes('gstatic.com')
	) {
		return;
	}

	// Skip chrome-extension and non-http(s)
	if (!url.protocol.startsWith('http')) return;

	// For navigation requests (HTML pages): network-first, fall back to cache
	if (request.mode === 'navigate') {
		event.respondWith(
			fetch(request)
				.then((response) => {
					const clone = response.clone();
					caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
					return response;
				})
				.catch(() => caches.match(request).then((r) => r || caches.match('/index.html')))
				.then((r) => r || new Response('Offline', { status: 503 }))
		);
		return;
	}

	// For assets: cache-first, fall back to network
	event.respondWith(
		caches.match(request).then((cached) => {
			if (cached) return cached;

			return fetch(request).then((response) => {
				// Only cache successful same-origin or CDN responses
				if (response.ok && (url.origin === self.location.origin || url.hostname.includes('fonts'))) {
					const clone = response.clone();
					caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
				}
				return response;
			});
		})
	);
});
