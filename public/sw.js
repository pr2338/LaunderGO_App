
// Basic service worker
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  // Add caching for essential assets here if needed for offline capabilities
  // event.waitUntil(
  //   caches.open('easyliftdrop-cache-v1').then((cache) => {
  //     return cache.addAll([
  //       '/',
  //       // Add other paths to cache here, e.g., '/index.html', '/styles.css', '/script.js'
  //       // Be careful with caching dynamic Next.js pages by default
  //     ]);
  //   })
  // );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  // Clean up old caches here
  // event.waitUntil(
  //   caches.keys().then((cacheNames) => {
  //     return Promise.all(
  //       cacheNames.map((cacheName) => {
  //         if (cacheName !== 'easyliftdrop-cache-v1') { // Replace with your current cache name
  //           return caches.delete(cacheName);
  //         }
  //       })
  //     );
  //   })
  // );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // console.log('Service Worker: Fetching ', event.request.url);
  // Implement caching strategies here (e.g., cache-first, network-first)
  // For a basic PWA, you might not need to intercept fetch initially,
  // or you might want to serve cached assets for offline support.
  // Example: Cache-first for assets
  // event.respondWith(
  //   caches.match(event.request).then((response) => {
  //     return response || fetch(event.request);
  //   })
  // );
});
