const CACHE_NAME = 'sliit-timetable-v1';
const urlsToCache = [
  './',
  './home.html',
  './manifest.json',
  './images/android-chrome-512x512.png'
];

// Install the service worker and cache files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Fetch files from cache if offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
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