const CACHE = 'hextech-demo-v3';
const ASSETS = [
  './', './index.html', './style.css', './app.js', './data/data.js',
  './prototype/index.html', './prototype/style.css', './prototype/app.js'
];

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(CACHE).then(function (cache) {
    return cache.addAll(ASSETS);
  }).catch(function () {}));
});

self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; })
      .map(function (k) { return caches.delete(k); }));
  }));
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  // 在线直连上游接口属于跨源请求：不缓存、不拦截，让它直接走网络
  if (new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(event.request).then(function (hit) {
      return hit || fetch(event.request);
    })
  );
});
