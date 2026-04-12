/* ═══════════════════════════════════════════════════════════
   STRATIX — Service Worker v2.0
   Strategy:
     • App shell (HTML/manifest)  → Network-first, cache fallback
     • Static assets (icons, JS)  → Cache-first, background revalidate
     • CDN fonts/libs             → Cache-first, long TTL
     • Firebase / Razorpay APIs   → Network-only (never cache)
     • Offline page               → Pre-cached fallback
   ════════════════════════════════════════════════════════════ */

const APP_VERSION    = 'stratix-v2.0';
const CACHE_STATIC   = APP_VERSION + ':static';
const CACHE_CDN      = APP_VERSION + ':cdn';
const OFFLINE_URL    = '/index.html';

/* ── Assets pre-cached at install time ── */
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/sw.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
];

/* ── External CDN origins that get cached on first use ── */
const CDN_ORIGINS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdnjs.cloudflare.com',
];

/* ── Origins that MUST NEVER be cached ── */
const BYPASS_ORIGINS = [
  'firebaseio.com',
  'googleapis.com',
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'razorpay.com',
  'checkout.razorpay.com',
];

/* ════════════════════════════════════════════
   INSTALL — pre-cache app shell
   ════════════════════════════════════════════ */
self.addEventListener('install', function (event) {
  console.log('[SW] Installing', APP_VERSION);
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then(function (cache) {
        return cache.addAll(PRECACHE_URLS).catch(function (err) {
          console.warn('[SW] Pre-cache partial failure (ok in dev):', err);
        });
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

/* ════════════════════════════════════════════
   ACTIVATE — evict old caches
   ════════════════════════════════════════════ */
self.addEventListener('activate', function (event) {
  console.log('[SW] Activating', APP_VERSION);
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (k) {
              return k !== CACHE_STATIC && k !== CACHE_CDN;
            })
            .map(function (k) {
              console.log('[SW] Deleting old cache:', k);
              return caches.delete(k);
            })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

/* ════════════════════════════════════════════
   FETCH — tiered strategy
   ════════════════════════════════════════════ */
self.addEventListener('fetch', function (event) {
  var req = event.request;
  var url;

  /* Only handle GET */
  if (req.method !== 'GET') return;

  try {
    url = new URL(req.url);
  } catch (e) {
    return;
  }

  /* Skip non-http(s) schemes */
  if (!url.protocol.startsWith('http')) return;

  /* ── 1. Bypass: Firebase, Razorpay, Google APIs ── */
  if (BYPASS_ORIGINS.some(function (o) { return url.hostname.includes(o); })) {
    return; /* pass through to network unmodified */
  }

  /* ── 2. HTML navigation: Network-first → cache fallback ── */
  if (req.mode === 'navigate') {
    event.respondWith(networkFirstWithFallback(req));
    return;
  }

  /* ── 3. CDN assets: Cache-first, background revalidate ── */
  if (CDN_ORIGINS.some(function (o) { return url.hostname.includes(o); })) {
    event.respondWith(cacheFirstWithUpdate(req, CACHE_CDN));
    return;
  }

  /* ── 4. Same-origin static assets: Cache-first ── */
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirstWithUpdate(req, CACHE_STATIC));
    return;
  }
});

/* ════════════════════════════════════════════
   STRATEGY: Network-first, cache on success, offline fallback
   ════════════════════════════════════════════ */
function networkFirstWithFallback(req) {
  return fetch(req)
    .then(function (res) {
      if (res && res.status === 200) {
        var clone = res.clone();
        caches.open(CACHE_STATIC).then(function (c) { c.put(req, clone); });
      }
      return res;
    })
    .catch(function () {
      return caches.match(req)
        .then(function (cached) {
          return cached || caches.match(OFFLINE_URL);
        });
    });
}

/* ════════════════════════════════════════════
   STRATEGY: Cache-first, background network update (stale-while-revalidate)
   ════════════════════════════════════════════ */
function cacheFirstWithUpdate(req, cacheName) {
  return caches.open(cacheName).then(function (cache) {
    return cache.match(req).then(function (cached) {
      var networkFetch = fetch(req).then(function (res) {
        if (res && res.status === 200) {
          cache.put(req, res.clone());
        }
        return res;
      }).catch(function () { /* offline — return cached if available */ });

      return cached || networkFetch;
    });
  });
}

/* ════════════════════════════════════════════
   PUSH NOTIFICATIONS (future use)
   ════════════════════════════════════════════ */
self.addEventListener('push', function (event) {
  if (!event.data) return;
  var data = {};
  try { data = event.data.json(); } catch (e) { data = { title: 'Stratix', body: event.data.text() }; }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Stratix', {
      body:    data.body    || '',
      icon:    '/icons/icon-192.png',
      badge:   '/icons/icon-96.png',
      tag:     data.tag     || 'stratix-notification',
      data:    data.url     || '/',
      actions: data.actions || [],
      vibrate: [100, 50, 100],
    })
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var targetUrl = event.notification.data || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(function (windowClients) {
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

/* ════════════════════════════════════════════
   BACKGROUND SYNC (deferred saves when offline)
   ════════════════════════════════════════════ */
self.addEventListener('sync', function (event) {
  if (event.tag === 'sync-transactions') {
    event.waitUntil(syncPendingTransactions());
  }
});

function syncPendingTransactions() {
  /* Placeholder — implement with IndexedDB queue in main app */
  console.log('[SW] Background sync: sync-transactions triggered');
  return Promise.resolve();
}

/* ════════════════════════════════════════════
   MESSAGE: force skip-waiting from app UI
   ════════════════════════════════════════════ */
self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
