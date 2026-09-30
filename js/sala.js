// Sala ao vivo do quadro (Firebase Realtime Database, dados temporários).
//  - anfitrião (logado): publica o quadro inteiro e recebe os traços do tablet;
//  - turma (link "ao vivo"): entra como anônimo e só lê o quadro;
//  - tablet: entra como anônimo e só escreve traços, na sua própria pasta (protegida por uma chave no link).
// Regras em database.rules.json: só o dono escreve o quadro; quem não tem a chave do tablet não escreve nada.
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  getDatabase, ref, set, get, push, remove, onValue, onChildAdded, onChildChanged, onChildRemoved,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js';

const cfg = APP_CONFIG.FIREBASE || {};
const disponivel = !!(cfg.apiKey && cfg.projectId && cfg.databaseURL);
const app = disponivel ? (getApps()[0] || initializeApp(cfg)) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getDatabase(app, cfg.databaseURL) : null;

const CHAVE_LOCAL = 'medida_sala_v1';
const sorteia = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => (b % 36).toString(36)).join('');
const aguardaUsuario = () => new Promise(ok => { const off = onAuthStateChanged(auth, u => { off(); ok(u); }); });
async function anonimo() {
  let u = auth.currentUser || await aguardaUsuario();
  if (!u) u = (await signInAnonymously(auth)).user;
  return u;
}
const erro = e => new Error(e && /operation-not-allowed/.test(e.code || '') ? 'O login anônimo ainda não foi ativado no Firebase.' : (e && e.message) || 'Sem conexão com a sala.');
const caminho = (sala, resto) => ref(db, `salas/${sala}/${resto}`);
const pasta = location.pathname.replace(/[^/]*$/, '');
const base = location.origin + pasta;

window.Sala = {
  disponivel,
  links: s => ({ tablet: `${base}tablet.html#s=${s.id}&k=${s.chave}`, turma: `${base}ao-vivo.html#s=${s.id}` }),
  salva: () => { try { return JSON.parse(localStorage.getItem(CHAVE_LOCAL)); } catch (e) { return null; } },

  /* anfitrião */
  async abrir() {
    if (!disponivel) throw new Error('Sala ao vivo não configurada (databaseURL em js/config.js).');
    const u = auth.currentUser || await aguardaUsuario();
    if (!u || u.isAnonymous) throw new Error('Entre com a sua conta para compartilhar o quadro.');
    let s = this.salva();
    if (!s || s.uid !== u.uid) s = { id: sorteia(12), chave: sorteia(20), uid: u.uid };
    try {
      await set(caminho(s.id, 'dono'), u.uid);
      await set(caminho(s.id, 'chave'), s.chave);
    } catch (e) { throw erro(e); }
    try { localStorage.setItem(CHAVE_LOCAL, JSON.stringify(s)); } catch (e) { /* sem cache */ }
    return s;
  },
  publicar(s, estado) { return set(caminho(s.id, 'quadro'), { j: JSON.stringify(estado), t: Date.now() }).catch(() => {}); },
  publicarVista(s, v) { return set(caminho(s.id, 'vista'), v).catch(() => {}); },
  // traços vindos do tablet: add(id, {p, w}) e del(id)
  ouvirTablet(s, add, del) {
    const r = caminho(s.id, `tablet/${s.chave}/tracos`);
    const up = x => { const v = x.val(); if (v) add(x.key, v); };
    const a = onChildAdded(r, up), c = onChildChanged(r, up);
    const b = onChildRemoved(r, x => del(x.key));
    return () => { a(); b(); c(); };
  },
  async encerrar(s) { try { await remove(ref(db, `salas/${s.id}`)); } catch (e) { /* já removida */ } try { localStorage.removeItem(CHAVE_LOCAL); } catch (e) { /* ok */ } },

  /* turma e tablet (anônimos) */
  async ouvirQuadro(id, cb, st) {
    try { await anonimo(); } catch (e) { return st && st(erro(e).message); }
    return onValue(caminho(id, 'quadro'), x => {
      const v = x.val();
      if (!v) return st && st('A sala ainda não tem nada (ou foi encerrada).');
      try { cb(JSON.parse(v.j)); st && st(''); } catch (e) { st && st('Não foi possível ler o quadro.'); }
    }, e => st && st(erro(e).message));
  },
  async tablet(id, chave) {
    try { await anonimo(); } catch (e) { throw erro(e); }
    const tr = caminho(id, `tablet/${chave}/tracos`);
    return {
      vista: async () => { const x = await get(caminho(id, 'vista')); return x.val(); },
      novaChave: () => push(tr).key,
      gravar: (key, t) => set(ref(db, `salas/${id}/tablet/${chave}/tracos/${key}`), { p: JSON.stringify(t.p), w: t.w }),
      apagar: key => remove(ref(db, `salas/${id}/tablet/${chave}/tracos/${key}`)),
      limpar: () => remove(tr),
      aoVivo: cb => onValue(caminho(id, 'vista'), x => cb(x.val())),
    };
  },
};
