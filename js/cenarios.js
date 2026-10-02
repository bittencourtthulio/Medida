// Cenários salvos no localStorage: nome + valores por calculadora. Só salva ao clicar.
(function () {
  const KEY = 'medida:cenarios:v1';
  let ctx = null;
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function ler() {
    try { const o = JSON.parse(localStorage.getItem(KEY) || '{}'); return o && typeof o === 'object' && !Array.isArray(o) ? o : {}; }
    catch { return {}; }
  }
  function gravar(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); return true; } catch { return false; } }

  function listar(calcId) {
    const o = ler();
    return Object.keys(o).filter(id => !calcId || o[id].calcId === calcId)
      .map(id => ({ id, ...o[id] }))
      .sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
  }

  function salvar(nome) {
    if (!ctx) return null;
    const c = ctx.getAtual();
    nome = String(nome || '').trim();
    if (!c || !nome) return null;
    const o = ler();
    const id = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    o[id] = { calcId: c.id, nome: nome.slice(0, 80), valores: ctx.getValores(), savedAt: new Date().toISOString() };
    return gravar(o) ? id : null;
  }

  function abrir(id) {
    const s = ler()[id];
    if (!ctx || !s) return false;
    const c = ctx.getAtual();
    if (!c || c.id !== s.calcId) return false;
    c.campos.forEach(f => {
      const el = $('c_' + f.id), v = s.valores[f.id];
      if (!el || v === undefined) return;
      if (f.tipo === 'checkbox') el.checked = !!v;
      else if (isFinite(Number(v))) el.value = v;
    });
    ctx.renderizar();
    return true;
  }

  function remover(id) {
    const o = ler();
    if (!(id in o)) return false;
    delete o[id];
    return gravar(o);
  }

  function ativo(calcId) {
    if (!ctx) return null;
    const c = ctx.getAtual();
    if (!c || c.id !== calcId) return null;
    const v = ctx.getValores();
    const igual = s => Object.keys(v).every(k => s.valores[k] === undefined || s.valores[k] === v[k]);
    const m = listar(calcId).find(igual);
    return m ? { id: m.id, nome: m.nome } : null;
  }

  function limpar() { try { localStorage.removeItem(KEY); } catch {} }

  function relativo(iso) {
    const t = Date.parse(iso);
    if (!isFinite(t)) return '';
    const m = Math.max(0, Math.floor((Date.now() - t) / 60000));
    if (m < 1) return 'agora há pouco';
    if (m < 60) return `há ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `há ${h} h`;
    const d = Math.floor(h / 24);
    if (d < 30) return `há ${d} ${d === 1 ? 'dia' : 'dias'}`;
    const mes = Math.floor(d / 30);
    if (mes < 12) return `há ${mes} ${mes === 1 ? 'mês' : 'meses'}`;
    const a = Math.floor(d / 365);
    return `há ${a} ${a === 1 ? 'ano' : 'anos'}`;
  }

  function nomeCalc(calcId) {
    const c = ctx && ctx.getAtual();
    return c && c.id === calcId ? c.nome : calcId;
  }

  function desenhar() {
    const lista = $('cenarioLista');
    const todos = listar();
    if (!todos.length) { lista.innerHTML = '<p class="cenario-vazio">Nenhum cenário salvo ainda.</p>'; $('cenarioLimpar').hidden = true; return; }
    $('cenarioLimpar').hidden = false;
    const atualId = ctx && ctx.getAtual() ? ctx.getAtual().id : null;
    const grupos = {};
    todos.forEach(s => { (grupos[s.calcId] = grupos[s.calcId] || []).push(s); });
    const ordem = Object.keys(grupos).sort((a, b) => (b === atualId) - (a === atualId));
    lista.innerHTML = ordem.map(cid => `<div class="cenario-grupo"><h3>${esc(nomeCalc(cid))}</h3>` +
      grupos[cid].map(s => `<div class="cenario-item"><div class="cenario-info"><strong>${esc(s.nome)}</strong><span>${esc(relativo(s.savedAt))}</span></div>` +
        `<button class="btn ghost sm" type="button" data-cen-abrir="${esc(s.id)}"${cid === atualId ? '' : ' disabled title="Abra essa calculadora para carregar"'}>Carregar</button>` +
        `<button class="btn ghost sm" type="button" data-cen-rem="${esc(s.id)}" aria-label="Remover cenário ${esc(s.nome)}">🗑</button></div>`).join('') + '</div>').join('');
  }

  function fechar() { $('cenarioModal').hidden = true; }

  function salvarDoInput() {
    const i = $('cenarioNome');
    if (!i.value.trim()) { i.focus(); return; }
    if (salvar(i.value)) { i.value = ''; desenhar(); }
  }

  function abrirModal() {
    if (!$('cenarioModal')) return;
    $('cenarioModal').hidden = false;
    desenhar();
    $('cenarioNome').focus();
  }

  function init(c) {
    ctx = c;
    const m = $('cenarioModal');
    if (!m || m.dataset.pronto) return;
    m.dataset.pronto = '1';
    $('cenarioFecha').onclick = fechar;
    m.onclick = e => { if (e.target === m) fechar(); };
    $('cenarioSalvar').onclick = salvarDoInput;
    $('cenarioNome').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); salvarDoInput(); } };
    $('cenarioLimpar').onclick = () => { if (confirm('Apagar todos os cenários salvos neste navegador?')) { limpar(); desenhar(); } };
    $('cenarioLista').onclick = e => {
      const a = e.target.closest('[data-cen-abrir]'), r = e.target.closest('[data-cen-rem]');
      if (a) { if (abrir(a.dataset.cenAbrir)) fechar(); }
      else if (r) { remover(r.dataset.cenRem); desenhar(); }
    };
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !m.hidden) fechar(); });
  }

  window.Cenarios = { KEY, init, abrirModal, listar, salvar, abrir, remover, ativo, limpar };
})();
