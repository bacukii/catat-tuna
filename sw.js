const CACHE_NAME = 'catat-tuna-v13'; // Naikkan versi cache

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  // WAJIB: Pre-cache file font agar ikon tetap tampil utuh saat offline murni
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/webfonts/fa-solid-900.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdn-icons-png.flaticon.com/512/3050/3050525.png'
];

// 1. Tahap Install: Simpan aset awal ke dalam cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Pre-caching offline assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  // Memaksa SW yang baru untuk langsung aktif tanpa menunggu halaman ditutup
  self.skipWaiting();
});


// 2. Tahap Activate: Bersihkan cache versi lama saat ada pembaruan
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Menghapus cache lama:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Segera ambil alih kontrol client/browser
  self.clients.claim();
});

// 3. Tahap Fetch: Strategi Stale-While-Revalidate
self.addEventListener('fetch', (event) => {
  // SWR hanya optimal untuk request GET (mengambil aset statis)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        
        // Lakukan fetch ke network di latar belakang
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          // Jika sukses ambil dari network (status 200), simpan versi terbarunya ke cache
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch((err) => {
          // Jika gagal fetch (karena sedang offline di pelabuhan), abaikan errornya
          console.log('Mode offline aktif untuk:', event.request.url);
        });

        // Langsung kembalikan cache jika ada (agar loading instan), 
        // atau tunggu fetch jaringan jika belum ada di cache sama sekali
        return cachedResponse || fetchPromise;
      });
    })
  );
});

