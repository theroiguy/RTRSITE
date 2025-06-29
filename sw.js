const CACHE_NAME = 'rtrsite-cache-v3';
const ASSETS = [
  './index.html',
  './gallery.html',
  './testimonials.html',
  './reviews.html',
  './contact.html',
  './quote-form.html',
  './thank-you.html',
  './style.min.css',
  './script.min.js',
  './images/logo.png',
  './facebook-icon.png',
  './instagram-icon.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request))
  );
});
