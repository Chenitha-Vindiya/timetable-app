const CACHE_NAME = 'sliit-timetable-v1';
const urlsToCache = [
  '/timetable-app/',
  '/timetable-app/home.html',
  '/timetable-app/manifest.json',
  '/timetable-app/images/android-chrome-512x512.png'
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