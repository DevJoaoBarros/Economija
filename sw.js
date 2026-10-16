// Service worker do Economijá
// Estratégia "rede primeiro": com internet, sempre busca a versão mais nova do app
// (é assim que as atualizações chegam ao iPhone); sem internet, usa a cópia guardada.
// Os DADOS não passam por aqui — ficam no localStorage de cada aparelho.

const CACHE = 'economija-app';
const ARQUIVOS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.webmanifest',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQUIVOS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then(resp => {
        if (resp.ok) {
          const copia = resp.clone();
          caches.open(CACHE).then(c => c.put(req, copia));
        }
        return resp;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html')))
  );
});
