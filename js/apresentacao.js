/* Modo consultor/apresentação: foco no resultado, setas entre calculadoras da mesma categoria. */
(function () {
  const CHAVE = 'medida:consultor:v1';
  let cfg = null, rodape = null, faixa = null;

  const lerEstado = () => { try { return !!JSON.parse(localStorage.getItem(CHAVE) || '{}').ativo; } catch { return false; } };
  const gravar = ativo => { try { localStorage.setItem(CHAVE, JSON.stringify({ ativo })); } catch {} };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  function vizinhas() {
    const atual = cfg && cfg.getAtual();
    if (!atual) return null;
    const area = cfg.getAreaDe(atual);
    const lista = cfg.getCalculadoras().filter(c => !area || c.categoria === atual.categoria);
    const i = lista.findIndex(c => c.id === atual.id);
    if (i < 0 || lista.length < 2) return null;
    return { anterior: lista[(i - 1 + lista.length) % lista.length], proximo: lista[(i + 1) % lista.length] };
  }

  function garantirDom() {
    if (rodape) return;
    faixa = document.createElement('div');
    faixa.className = 'consultor-faixa';
    faixa.hidden = true;
    rodape = document.createElement('nav');
    rodape.className = 'consultor-rodape';
    rodape.setAttribute('aria-label', 'Navegação do modo consultor');
    rodape.hidden = true;
    document.body.append(faixa, rodape);
    rodape.addEventListener('click', e => {
      const b = e.target.closest('[data-dir]');
      if (b) api.irPara(b.dataset.dir);
    });
  }

  function botao() {
    const b = document.getElementById('consultorBtn');
    if (!b) return;
    b.textContent = api.ativo ? '🎤 Saindo do modo consultor' : '🎤 Modo consultor';
    b.classList.toggle('on', api.ativo);
    b.setAttribute('aria-pressed', api.ativo ? 'true' : 'false');
  }

  function aoTeclar(e) {
    if (!api.ativo || e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
    const k = e.key;
    if (k === 'Escape' || k === 'm' || k === 'M') { e.preventDefault(); api.desativar(); }
    else if (k === 'ArrowLeft') { e.preventDefault(); api.irPara('anterior'); }
    else if (k === 'ArrowRight') { e.preventDefault(); api.irPara('proximo'); }
    else if (k === 'f' || k === 'F') {
      e.preventDefault();
      try {
        if (document.fullscreenElement) document.exitFullscreen();
        else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
      } catch {}
    }
  }

  const api = {
    ativo: false,
    init(opcoes) {
      cfg = opcoes;
      garantirDom();
      document.addEventListener('keydown', aoTeclar);
      if (lerEstado()) api.ativar(true); else botao();
    },
    toggle() { api.ativo ? api.desativar() : api.ativar(); },
    ativar(semGravar) {
      api.ativo = true;
      document.body.classList.add('consultor-level');
      if (!semGravar) gravar(true);
      api.aplicar();
    },
    desativar() {
      api.ativo = false;
      document.body.classList.remove('consultor-level');
      gravar(false);
      if (rodape) { rodape.hidden = true; faixa.hidden = true; }
      if (document.fullscreenElement) { try { document.exitFullscreen(); } catch {} }
      botao();
    },
    aplicar() {
      if (!api.ativo || !cfg) return;
      garantirDom();
      botao();
      const atual = cfg.getAtual();
      const v = vizinhas();
      const nav = v
        ? `<button class="btn ghost sm" type="button" data-dir="anterior">← Anterior (${esc(v.anterior.nome)})</button><button class="btn ghost sm" type="button" data-dir="proximo">Próxima (${esc(v.proximo.nome)}) →</button>`
        : '';
      rodape.innerHTML = `<div class="consultor-nav">${nav}</div><div class="consultor-dica">M para sair · F para tela cheia</div>`;
      rodape.hidden = false;
      let nome = '';
      try { nome = (window.Cenarios && window.Cenarios.ativo && atual && window.Cenarios.ativo(atual.id) || {}).nome || ''; } catch {}
      faixa.hidden = !nome;
      faixa.textContent = nome ? 'Apresentando: ' + nome : '';
    },
    irPara(dir) {
      const v = vizinhas();
      if (!v) return;
      const alvo = (dir === 'anterior' || dir === 'prev') ? v.anterior : v.proximo;
      location.hash = '#/calc/' + alvo.id;
    },
  };
  window.Apresentacao = api;
})();
