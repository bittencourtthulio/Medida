// Service Worker — estratégia mista: network-first para navegações, stale-while-revalidate para assets same-origin.

// Constantes de cache
const CACHE = 'medida-shell-v1';
const RUNTIME = 'medida-runtime-v1';

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

  // Same-origin (assets): stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      // Dispara atualização em background sem bloquear a resposta
      const networkFetch = fetch(request)
        .then((response) => {
          // Atualiza o cache runtime com a versão fresca
          const clone = response.clone();
          caches.open(RUNTIME).then((c) => c.put(request, clone));
          return response;
        })
        .catch(() => {
          // Sem rede e sem cache: deixa o erro subir
          throw new Error('Network error and no cache available');
        });

      // Devolve cache imediatamente se houver, senão espera a rede
      return cached || networkFetch;
    })
  );
});
