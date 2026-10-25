importScripts('./js/offline-audio-manifest.js');

const VERSION = 'cikgu-ppki-v1.1.3';
const CACHE = `shell-${VERSION}`;
const AUDIO_CACHE = 'cikgu-yasmin-offline-v1';
const AUDIO_MANIFEST = self.CIKGU_OFFLINE_AUDIO || { clips: [], total: 0, bytes: 0 };
const AUDIO_URLS = (AUDIO_MANIFEST.clips || []).map(key => new URL(`./assets/audio/offline/${key}.mp3`, self.location.href).href);
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './js/app.js',
  './js/audio.js',
  './js/offline-audio-manifest.js',
  './js/speech-language.js',
  './js/speech-content.js',
  './js/content.js',
  './js/store.js',
  './js/teacher.js',
  './js/ui.js',
  './js/progress.js',
  './js/question-bank.js',
  './js/activity-engine.js',
  './js/activity-view.js',
  './js/student-views.js',
  './js/settings-view.js',
  './js/game-engine.js',
  './js/game-view.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/maskable-512.png',
  './assets/audio/contoh-suara.mp3'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('shell-') && key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function audioStatus() {
  const cache = await caches.open(AUDIO_CACHE);
  const keys = await cache.keys();
  const saved = new Set(keys.map(request => request.url));
  const done = AUDIO_URLS.filter(url => saved.has(url)).length;
  return {
    type: 'AUDIO_STATUS',
    done,
    total: AUDIO_URLS.length,
    bytes: AUDIO_MANIFEST.bytes || 0,
    version: AUDIO_MANIFEST.version || '',
    ready: AUDIO_URLS.length > 0 && done === AUDIO_URLS.length
  };
}

async function broadcast(message) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clients.forEach(client => client.postMessage(message));
}

let audioDownloadPromise = null;
async function downloadAudio() {
  if (audioDownloadPromise) return audioDownloadPromise;
  audioDownloadPromise = (async () => {
    if (!AUDIO_URLS.length) throw new Error('Peket audio belum tersedia dalam binaan ini.');
    const cache = await caches.open(AUDIO_CACHE);
    const saved = new Set((await cache.keys()).map(request => request.url));
    const missing = AUDIO_URLS.filter(url => !saved.has(url));
    let done = AUDIO_URLS.length - missing.length;
    await broadcast({ type: 'AUDIO_PROGRESS', done, total: AUDIO_URLS.length, bytes: AUDIO_MANIFEST.bytes || 0 });

    const batchSize = 10;
    for (let offset = 0; offset < missing.length; offset += batchSize) {
      const batch = missing.slice(offset, offset + batchSize);
      await Promise.all(batch.map(async url => {
        const response = await fetch(url, { cache: 'no-cache' });
        if (!response.ok) throw new Error(`Audio ${response.status} tidak dapat dimuat turun.`);
        await cache.put(url, response);
      }));
      done += batch.length;
      if (done % 50 < batchSize || done === AUDIO_URLS.length) {
        await broadcast({ type: 'AUDIO_PROGRESS', done, total: AUDIO_URLS.length, bytes: AUDIO_MANIFEST.bytes || 0 });
      }
    }
    // Buang audio daripada manifest lama hanya selepas semua klip baharu selamat.
    const expected = new Set(AUDIO_URLS);
    const stored = await cache.keys();
    await Promise.all(stored.filter(request => !expected.has(request.url)).map(request => cache.delete(request)));
    return audioStatus();
  })();
  try {
    return await audioDownloadPromise;
  } finally {
    audioDownloadPromise = null;
  }
}

self.addEventListener('message', event => {
  const type = event.data?.type;
  const port = event.ports?.[0];
  if (type === 'AUDIO_STATUS') {
    event.waitUntil(audioStatus().then(status => port?.postMessage(status)).catch(error => port?.postMessage({ type: 'AUDIO_ERROR', message: error.message })));
  }
  if (type === 'DOWNLOAD_AUDIO') {
    event.waitUntil(
      downloadAudio()
        .then(status => { port?.postMessage(status); broadcast({ ...status, type: 'AUDIO_COMPLETE' }); })
        .catch(error => {
          const message = { type: 'AUDIO_ERROR', message: error.message };
          port?.postMessage(message); broadcast(message);
        })
    );
  }
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.includes('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put('./index.html', copy));
          }
          return response;
        })
        .catch(async () => (await caches.match('./index.html')) || (await caches.match('./')))
    );
    return;
  }

  const isOfflineAudio = url.pathname.includes('/assets/audio/offline/');
  event.respondWith(
    caches.match(request).then(cached => {
      // Minta fail penuh untuk audio; Cache Storage tidak boleh menyimpan respons 206.
      const networkRequest = isOfflineAudio ? new Request(request.url, { credentials: 'same-origin' }) : request;
      const network = fetch(networkRequest).then(response => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(isOfflineAudio ? AUDIO_CACHE : CACHE).then(cache => cache.put(request, copy));
        }
        return response;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
