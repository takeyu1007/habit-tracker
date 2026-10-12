/**
 * Service Worker: ネットワーク優先 + オフライン時はキャッシュ。
 *
 * 方針: AI で頻繁に更新するため「キャッシュ優先」は使わない（古い版が残り続けるのを防ぐ）。
 * ルール: ファイルを追加・改名したら APP_SHELL を更新し、CACHE_VERSION を上げること。
 */

const CACHE_VERSION = 'v3';
const CACHE_NAME = `habit-tracker-${CACHE_VERSION}`;

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './styles/tokens.css',
  './styles/app.css',
  './fonts/outfit-latin.woff2',
  './src/main.js',
  './src/model.js',
  './src/calc.js',
  './src/format.js',
  './src/storage.js',
  './src/store.js',
  './src/ui/dashboard.js',
  './src/ui/habitForm.js',
  './src/ui/resetModal.js',
  './src/ui/cravingModal.js',
  './src/ui/history.js',
  './src/ui/settings.js',
  './src/ui/tabs.js',
  './src/ui/installHint.js',
  './src/ui/toast.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k.startsWith('habit-tracker-') && k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      try {
        // no-cache: HTTP キャッシュがあっても必ずサーバーに更新確認する（変更がなければ 304 で軽量）
        const response = await fetch(request, { cache: 'no-cache' });
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, response.clone());
        }
        return response;
      } catch {
        const cached = await caches.match(request, { ignoreSearch: true });
        if (cached) return cached;
        if (request.mode === 'navigate') {
          const shell = await caches.match('./index.html');
          if (shell) return shell;
        }
        return Response.error();
      }
    })(),
  );
});
