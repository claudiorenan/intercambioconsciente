/**
 * Intercâmbio Consciente — Service Worker v3
 */

const CACHE_VERSION = 6;
const STATIC_CACHE = `ic-static-v${CACHE_VERSION}`;
const DYNAMIC_CACHE = `ic-dynamic-v${CACHE_VERSION}`;

// Derive base path from SW location (works on any subpath)
const BASE = new URL('./', self.location).pathname;

// Note: CSS is excluded because Vite hashes the filename at build time.
// It will be cached dynamically via stale-while-revalidate on first load.
const STATIC_ASSETS = [
    '',
    'index.html',
    'js/config.js',
    'js/supabase.js',
    'js/error-handler.js',
    'js/monitoring.js',
    'js/validation.js',
    'js/auth.js',
    'js/profile.js',
    'js/feed.js',
    'js/messages.js',
    'js/notifications.js',
    'js/search.js',
    'js/admin.js',
    'js/journeys.js',
    'js/diagnostic.js',
    'js/preparation.js',
    'js/connections.js',
    'js/app.js',
    'js/globe.js',
    'offline.html',
].map(path => BASE + path);

// Install: cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(k => k !== STATIC_CACHE && k !== DYNAMIC_CACHE)
                    .map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

// Fetch: stale-while-revalidate for static, network-first for API
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // API calls (Supabase): network-first
    if (url.hostname.includes('supabase')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    const clone = response.clone();
                    caches.open(DYNAMIC_CACHE).then(cache => cache.put(event.request, clone));
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // CDN resources (fonts, libraries): cache-first
    if (url.hostname !== location.hostname) {
        event.respondWith(
            caches.match(event.request).then(cached => {
                if (cached) return cached;
                return fetch(event.request).then(response => {
                    const clone = response.clone();
                    caches.open(DYNAMIC_CACHE).then(cache => cache.put(event.request, clone));
                    return response;
                });
            }).catch(() => null)
        );
        return;
    }

    // Local static assets: stale-while-revalidate
    event.respondWith(
        caches.match(event.request).then(cached => {
            const fetchPromise = fetch(event.request).then(response => {
                const clone = response.clone();
                caches.open(STATIC_CACHE).then(cache => cache.put(event.request, clone));
                return response;
            }).catch(() => null);

            return cached || fetchPromise || caches.match(BASE + 'offline.html');
        })
    );
});
