// Service Worker — network-first para navegações e assets same-origin (cache só como fallback offline).

// Constantes de cache
const CACHE = 'medida-shell-v2';
const RUNTIME = 'medida-runtime-v2';

// App shell — arquivos críticos pré-cacheados no install
const SHELL = [
  '/',
  '/index.html',
  '/app.html',
  '/tablet.html',
  '/ao-vivo.html',
  '/manifest.webmanifest',
  '/css/style.css',
  '/assets/marca.svg',
  '/assets/logo.svg',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/icons/icon-maskable-512.png',
  '/assets/icons/apple-touch-icon.png'
];

// Install — pré-cacheia o app shell e força este SW a se tornar ativo imediatamente
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL))
  );
});

// Activate — remove caches antigos que não pertencem às chaves atuais e assume controle dos clientes
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE && key !== RUNTIME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch — roteia conforme método, modo e origem
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Apenas GET é interceptado; POST/PUT/etc. vão direto pra rede
  if (request.method !== 'GET') return;

  // Navegações (HTML): tenta rede primeiro, cai pra cache, depois offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Salva uma cópia no cache runtime para uso offline futuro
          const clone = response.clone();
          caches.open(RUNTIME).then((c) => c.put(request, clone));
          return response;
        })
        .catch(() =>
          // Rede falhou — tenta páginas offline conhecidas
          caches.match('/index.html').then((r) => r || caches.match('/app.html'))
        )
        .then((cached) => {
          // Nenhum cache disponível: devolve erro offline
          return (
            cached ||
            new Response('Offline', {
              status: 503,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            })
          );
        })
    );
    return;
  }

  const url = new URL(request.url);

  // Recursos cross-origin: passthrough sem cache
  if (url.origin !== self.location.origin) return;

  // Same-origin (assets): rede primeiro, para nunca servir CSS/JS antigo com HTML novo; cache só offline
  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(RUNTIME).then((c) => c.put(request, clone));
        return response;
      })
      .catch(() => caches.match(request))
  );
});
