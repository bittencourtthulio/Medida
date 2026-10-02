/* Compartilhar cenário por link: acrescenta o nome do cenário ativo (&n=) ao link da calculadora. */
(function () {
  let getAtual = null;
  const $ = id => document.getElementById(id);

  function gerarLink({ calc, valores, cenarioNome }) {
    const p = new URLSearchParams();
    calc.campos.forEach(f => {
      const x = valores[f.id];
      p.set(f.id, f.tipo === 'checkbox' ? (x ? '1' : '0') : String(x));
    });
    if (cenarioNome) p.set('n', cenarioNome);
    return `${location.origin}${location.pathname}#/calc/${calc.id}?${p}`;
  }

  function cenarioNome(calcId) {
    try {
      const c = window.Cenarios && typeof window.Cenarios.ativo === 'function' ? window.Cenarios.ativo(calcId) : null;
      return (c && c.nome) || null;
    } catch { return null; }
  }

  function parseCenarioNome(hash) {
    const q = String(hash || '').split('?')[1];
    if (!q) return null;
    const n = new URLSearchParams(q).get('n');
    return n && n.trim() ? n.trim().slice(0, 80) : null;
  }

  function idDaHash() {
    const m = location.hash.match(/^#\/calc\/([^?/]+)/);
    return m ? m[1] : null;
  }

  function atualizarBotao(calcId) {
    const b = $('cenarioLinkBtn'), bar = $('cenarioBar');
    if (bar && !parseCenarioNome(location.hash)) { bar.hidden = true; bar.textContent = ''; }
    if (!b) return;
    const nome = cenarioNome(calcId);
    b.hidden = !nome;
    if (nome) b.textContent = '🔗 Compartilhar "' + nome + '"';
  }

  // monta o link a partir dos inputs da tela (os mesmos c_<id> que o app.js usa)
  function linkDoBotao(nome) {
    const p = new URLSearchParams();
    document.querySelectorAll('#form input[id^="c_"]').forEach(el => {
      p.set(el.id.slice(2), el.type === 'checkbox' ? (el.checked ? '1' : '0') : el.value);
    });
    p.set('n', nome);
    return `${location.origin}${location.pathname}#/calc/${idDaHash()}?${p}`;
  }

  function init(opts) {
    getAtual = (opts && opts.getAtual) || null;
    const b = $('cenarioLinkBtn');
    if (!b) return;
    b.onclick = async () => {
      const id = idDaHash();
      const nome = id && cenarioNome(id);
      if (!nome) return;
      const url = linkDoBotao(nome), rot = b.textContent;
      try { await navigator.clipboard.writeText(url); b.textContent = '✓ Link copiado'; }
      catch { history.replaceState(null, '', url.slice(location.origin.length)); b.textContent = 'Copie o link na barra de endereço'; }
      clearTimeout(b.t); b.t = setTimeout(() => atualizarBotao(id), 2200);
    };
  }

  window.Compartilhar = { init, gerarLink, cenarioNome, parseCenarioNome, atualizarBotao };
  init();
})();
