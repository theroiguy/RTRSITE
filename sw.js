const CACHE_NAME = 'rtrsite-cache-v3';
const ASSETS = [
  '/RTRSITE/index.html',
  '/RTRSITE/gallery.html',
  '/RTRSITE/testimonials.html',
  '/RTRSITE/reviews.html',
  '/RTRSITE/contact.html',
  '/RTRSITE/quote-form.html',
  '/RTRSITE/thank-you.html',
  '/RTRSITE/style.min.css',
  '/RTRSITE/script.min.js',
  '/RTRSITE/images/logo.png',
  '/RTRSITE/facebook-icon.png',
  '/RTRSITE/instagram-icon.png',
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
