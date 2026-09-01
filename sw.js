/* 考研学习计划助手 - Service Worker：离线缓存 */
/* 升级应用时请把 CACHE 版本号 +1（如 kaoyan-v6） */
var CACHE = 'kaoyan-v5';
var ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './schools-data.js',
  './manifest.webmanifest',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      // 逐个缓存：单个资源失败不影响整体安装
      return Promise.all(ASSETS.map(function (a) {
        return c.add(a).catch(function () { return null; });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  if (e.request.cache === 'only-if-cached') return;
  // 网络优先：在线永远取最新版本，失败时回退缓存（离线可用）
  e.respondWith(
    fetch(e.request).then(function (res) {
      if (res.ok && (res.type === 'basic' || res.type === 'default')) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(e.request).then(function (m) {
        return m || caches.match('./index.html');
      });
    })
  );
});
