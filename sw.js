const CACHE_NAME = 'sliit-timetable-v1';
const urlsToCache = [
    './',
    './home.html',
    './manifest.json',
    './images/android-chrome-512x512.png'
];

// Fetch files from cache if offline
self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request) // Try the network first
            .then(response => {
                // If network works, update the cache and return the response
                return caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, response.clone());
                    return response;
                });
            })
            .catch(() => {
                // If network fails (offline), use the cache
                return caches.match(event.request);
            })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    // This deletes ALL old caches so the new modal code can load
                    return caches.delete(cache);
                })
            );
        })
    );
});

// Listen for notification clicks
self.addEventListener('notificationclick', event => {
    event.notification.close(); // Close the notification popup

    // Open the app when the notification is clicked
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            if (clientList.length > 0) {
                let client = clientList[0];
                if (client.focused) return client;
                return client.focus();
            }
            return clients.openWindow('/home.html');
        })
    );
});

self.addEventListener('install', event => {
    // This forces the new service worker to take over immediately
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});