// Regressão: o service worker não pode servir CSS/JS antigos do cache quando a rede tem versão nova.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const origin = 'https://medida.cloud';
const store = new Map(); // `${cacheName}|${url}` -> Response
const handlers = {};
const sw = {
  location: { origin },
  skipWaiting() {},
  clients: { claim: async () => {} },
  addEventListener: (t, fn) => { handlers[t] = fn; },
};
const caches = {
  open: async (name) => ({
    put: async (req, res) => { store.set(`${name}|${req.url || req}`, res); },
    addAll: async () => {},
  }),
  match: async (req) => {
    for (const [k, v] of store) if (k.endsWith('|' + (req.url || req))) return v.clone();
    return undefined;
  },
  keys: async () => [...new Set([...store.keys()].map((k) => k.split('|')[0]))],
  delete: async (name) => { for (const k of [...store.keys()]) if (k.startsWith(name + '|')) store.delete(k); return true; },
};
const rede = { 'css/style.css': 'NOVO' };
const ctx = vm.createContext({
  self: sw, caches, URL, Response, console,
  fetch: async (req) => new Response(rede[new URL(req.url).pathname.slice(1)] ?? 'x'),
});
vm.runInContext(readFileSync(new URL('../sw.js', import.meta.url), 'utf8'), ctx);

async function ativar() {
  await new Promise((ok) => handlers.activate({ waitUntil: (p) => p.then(ok) }));
}
async function buscar(path) {
  let resp;
  handlers.fetch({ request: { method: 'GET', mode: 'no-cors', url: origin + path }, respondWith: (p) => { resp = p; } });
  return (await resp).text();
}

// navegador que instalou a versão antiga (v1) do PWA e guardou o CSS velho
store.set('medida-shell-v1|' + origin + '/css/style.css', new Response('VELHO'));
store.set('medida-runtime-v1|' + origin + '/css/style.css', new Response('VELHO'));
await ativar();
const texto = await buscar('/css/style.css');
if (texto !== 'NOVO') { console.error(`FALHOU: servido "${texto}", esperado "NOVO"`); process.exit(1); }
console.log('OK: CSS atualizado servido ao navegador com cache antigo');
