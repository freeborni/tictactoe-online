const CACHE_NAME = 'tic-tac-toe-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/custom.css',
    '/script.js',
    '/socket-client.js',
    '/favicon.svg',
    '/manifest.json',
    '/icons/manifest-icon-192.maskable.png',
    '/icons/manifest-icon-512.maskable.png',
    '/icons/apple-icon-180.png'
];

// Install service worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache)
                    .catch(error => {
                        console.error('Cache addAll failed:', error);
                        // Continue with installation even if caching fails
                        return Promise.resolve();
                    });
            })
    );
});

// Activate service worker
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Fetch event handler
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached version or fetch from network
                return response || fetch(event.request)
                    .catch(error => {
                        console.error('Fetch failed:', error);
                        // Return a fallback response if both cache and network fail
                        return new Response('Offline mode is not available for this resource');
                    });
            })
    );
}); 