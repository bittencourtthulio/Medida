/* Quadro branco: caixas, notas, círculos e textos que se arrastam e se ligam com setas.
   Sem servidor: o desenho fica só no localStorage do navegador. */
(function () {
  const CHAVE = 'medida_quadro_v1';
  const $ = id => document.getElementById(id);
  const vazia = () => ({ id: uid(), nos: [], setas: [], tracos: [], vista: { x: 0, y: 0, k: 1 } });
  let est, paginas = [], historicos = new Map(), finalizaArrasto = null;
  let sel = null;            // { tipo: 'no' | 'seta', id }
  let desfazer = [];
  let pronto = false, salvaT, caneta = false, borracha = false;
  let corCaneta = 'inherit';
  let conectando = false, conexaoPendente = null;

  const uid = () => Math.random().toString(36).slice(2, 9);
  const mundo = () => $('qMundo');
  est = vazia(); paginas = [est];

  /* ---------- estado ---------- */
  function carregar() {
    try {
      const s = JSON.parse(localStorage.getItem(CHAVE));
      const valida = p => p && Array.isArray(p.nos) && Array.isArray(p.setas);
      if (s && Array.isArray(s.paginas) && s.paginas.length && s.paginas.every(valida)) {
        paginas = s.paginas.map(p => ({ ...vazia(), ...p }));
        est = paginas.find(p => p.id === s.ativa) || paginas[0];
      } else if (valida(s)) { est = { ...vazia(), ...s }; paginas = [est]; }
    } catch (e) { /* sem cache: começa vazio */ }
  }
  function guardaAtual() { const i = paginas.findIndex(p => p.id === est.id); if (i >= 0) paginas[i] = est; }
  function persistir() {
    guardaAtual();
    try {
      localStorage.setItem(CHAVE, JSON.stringify({ versao: 2, ativa: est.id, paginas }));
      if ($('qSalvo')) $('qSalvo').textContent = 'Salvo neste navegador';
    } catch (e) {
      if ($('qSalvo')) $('qSalvo').textContent = 'Não foi possível salvar no navegador. Baixe as páginas para guardar seus desenhos.';
    }
  }
  function publico() { return { ...est, pagina: est.id, numeroPagina: paginas.findIndex(p => p.id === est.id) + 1, totalPaginas: paginas.length, area: visivel() }; }
  // transmite o quadro para a sala ao vivo (se houver), no máximo ~8 vezes por segundo
  let emT = 0, emP = false, vistaT;
  function emite() {
    if (!window.Quadro || !Quadro.aoMudar) return;
    const agora = Date.now();
    if (agora - emT > 120) { emT = agora; Quadro.aoMudar(publico()); }
    else if (!emP) { emP = true; setTimeout(() => { emP = false; emT = Date.now(); Quadro.aoMudar && Quadro.aoMudar(publico()); }, 130); }
  }
  function salvar() {
    emite();
    clearTimeout(salvaT);
    if ($('qSalvo')) $('qSalvo').textContent = 'Salvando…';
    salvaT = setTimeout(persistir, 250);
  }
  function foto() { desfazer.push(JSON.stringify(est)); if (desfazer.length > 50) desfazer.shift(); atualizaAcoes(); }
  function atualizaAcoes() {
    if ($('qDesfazer')) $('qDesfazer').disabled = !desfazer.length;
    if ($('qApagar')) $('qApagar').disabled = !sel;
    atualizaCores();
    atualizaFonte();
  }
  function volta() {
    fechaConexao();
    if (!desfazer.length) return;
    est = JSON.parse(desfazer.pop()); sel = null; desenhar(); salvar();
  }

  /* ---------- páginas ---------- */
  function controlesPaginas() {
    if (!$('qPagina')) return;
    const i = paginas.findIndex(p => p.id === est.id);
    $('qPagina').replaceChildren(...paginas.map((p, n) => new Option(`Pág. ${n + 1} / ${paginas.length}`, p.id, false, p.id === est.id)));
    $('qAnterior').disabled = i <= 0;
    $('qProxima').disabled = i >= paginas.length - 1;
  }
  function encerraEdicao() {
    const e = document.activeElement;
    if (e && e.isContentEditable) e.blur();
    if (finalizaArrasto) finalizaArrasto();
    fechaConexao();
  }
  function irPagina(id) {
    const destino = paginas.find(p => p.id === id);
    if (!destino || id === est.id) return;
    encerraEdicao(); guardaAtual(); historicos.set(est.id, desfazer);
    est = destino; desfazer = historicos.get(id) || []; sel = null;
    desenhar(); controlesPaginas(); salvar(); persistir();
    if (Quadro.aoVista) Quadro.aoVista(visivel());
  }
  function novaPagina() {
    encerraEdicao(); guardaAtual();
    const p = vazia(); paginas.push(p); irPagina(p.id);
  }
  async function exportar(todas) {
    encerraEdicao(); guardaAtual(); persistir();
    const botoes = [$('qExportarPagina'), $('qExportarTudo')], aviso = $('qExportStatus');
    botoes.forEach(b => { b.disabled = true; });
    const copia = JSON.parse(JSON.stringify(todas ? paginas : [est]));
    const inicio = todas ? 1 : paginas.findIndex(p => p.id === est.id) + 1;
    try {
      await QuadroExportar.baixar(copia, { todas, inicio, borda, progresso: t => { aviso.textContent = t; } });
      aviso.textContent = todas ? 'ZIP pronto: um JPEG por página.' : 'JPEG pronto.';
    } catch (e) { aviso.textContent = 'Não foi possível exportar. Tente novamente.'; }
    finally { botoes.forEach(b => { b.disabled = false; }); }
  }

  /* ---------- desenho ---------- */
  function aplicaVista() {
    const { x, y, k } = est.vista;
    mundo().style.transform = `translate(${x}px, ${y}px) scale(${k})`;
    if ($('qZoom')) $('qZoom').textContent = Math.round(k * 100) + '%';
    if ($('qGrade')) { $('qGrade').style.backgroundPosition = `${x}px ${y}px`; $('qGrade').style.backgroundSize = `${24 * k}px ${24 * k}px`; }
    clearTimeout(vistaT);
    vistaT = setTimeout(() => { if (window.Quadro && Quadro.aoVista) Quadro.aoVista(visivel()); }, 300);
  }
  // retângulo do mundo que aparece na tela (o tablet desenha dentro dele)
  function visivel() {
    const r = $('qTela').getBoundingClientRect(), v = est.vista;
    return { x: Math.round(-v.x / v.k), y: Math.round(-v.y / v.k), w: Math.round(r.width / v.k), h: Math.round(r.height / v.k), pagina: est.id };
  }

  /* ---------- traços à mão livre (caneta do quadro e do tablet) ---------- */
  function tinta() {
    const svg = $('qTinta'); if (!svg) return;
    svg.innerHTML = (est.tracos || []).map(t => {
      const p = t.p; if (!p || p.length < 2) return '';
      let d = `M${p[0]} ${p[1]}`;
      for (let i = 2; i < p.length; i += 2) d += `L${p[i]} ${p[i + 1]}`;
      if (p.length === 2) d += `L${p[0]} ${p[1]}`;
      const cor = /^#[0-9a-f]{6}$/i.test(t.cor) ? t.cor : 'inherit';
      return `<path d="${d}" color="${cor}" stroke-width="${t.w || 3}"/>`;
    }).join('');
  }
  // Borracha: remove o trecho do traço que fica dentro do raio `r` (mundo) em torno de (cx, cy), partindo o traço em dois se preciso.
  // Devolve os pedaços que sobram, ou null se o traço não foi tocado.
  function cortaTraco(p, cx, cy, r) {
    const q = [];
    for (let i = 0; i < p.length; i += 2) {
      if (i) {
        const dx = p[i] - p[i - 2], dy = p[i + 1] - p[i - 1], n = Math.ceil(Math.hypot(dx, dy) / (r / 4));
        for (let k = 1; k < n; k++) q.push(p[i - 2] + dx * k / n, p[i - 1] + dy * k / n);
      }
      q.push(p[i], p[i + 1]);
    }
    const dentro = i => Math.hypot(q[i] - cx, q[i + 1] - cy) <= r;
    let tocou = false; for (let i = 0; i < q.length; i += 2) if (dentro(i)) { tocou = true; break; }
    if (!tocou) return null;
    const partes = []; let at = [];
    for (let i = 0; i < q.length; i += 2) {
      if (dentro(i)) { if (at.length >= 4) partes.push(at); at = []; }
      else at.push(+q[i].toFixed(1), +q[i + 1].toFixed(1));
    }
    if (at.length >= 4) partes.push(at);
    return partes;
  }
  function apagaTraco(x, y, r, pagina) {
    const alvo = pagina ? (pagina === est.id ? est : paginas.find(p => p.id === pagina)) : est;
    if (!alvo || !alvo.tracos || !alvo.tracos.length) return false;
    const novos = [], tocados = [];
    alvo.tracos.forEach(t => {
      const partes = cortaTraco(t.p, x, y, r);
      if (!partes) return novos.push(t);
      tocados.push(t);
      partes.forEach(p => novos.push({ id: uid(), p, w: t.w, ...(t.cor ? { cor: t.cor } : {}) }));
    });
    if (!tocados.length) return false;
    alvo.tracos = novos; if (alvo === est) tinta(); salvar();
    const doTablet = tocados.filter(t => t.t).map(t => t.id);
    if (doTablet.length && Quadro.aoApagar) Quadro.aoApagar(doTablet);
    return true;
  }
  function apagando(ev) {
    foto();
    const r = 13 / est.vista.k, passo = e => { const q = ponto(e); apagaTraco(q.x, q.y, r); };
    passo(ev);
    arrasta(ev, passo, salvar);
  }

  function traco(ev) {
    foto();
    if (!est.tracos) est.tracos = [];
    const t = { id: uid(), p: [], w: +(3 / est.vista.k).toFixed(1), cor: corCaneta };
    est.tracos.push(t);
    const ponta = e => {
      const q = ponto(e), x = +q.x.toFixed(1), y = +q.y.toFixed(1), n = t.p.length;
      if (n >= 2 && Math.hypot(x - t.p[n - 2], y - t.p[n - 1]) * est.vista.k < 2) return;
      t.p.push(x, y); tinta(); emite();
    };
    ponta(ev);
    arrasta(ev, ponta, salvar);
  }

  const FORMAS = { losango: '50,0 100,50 50,100 0,50', triangulo: '50,0 100,100 0,100' };
  const TAMANHO = { caixa: [160, 60], nota: [170, 110], circulo: [140, 140], losango: [180, 120], triangulo: [170, 140] };
  const LADOS = { topo: [0, -1], direita: [1, 0], baixo: [0, 1], esquerda: [-1, 0] };
  // O fundo usa a cor exata; o texto recebe a cor com maior contraste.
  function coresNo(n) {
    if (!/^#[0-9a-f]{6}$/i.test(n.cor)) return null;
    const rgb = n.cor.slice(1).match(/../g).map(h => parseInt(h, 16) / 255);
    const [r, g, b] = rgb.map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
    const luminancia = .2126 * r + .7152 * g + .0722 * b;
    const branco = 1.05 / (luminancia + .05), preto = (luminancia + .05) / (.00303527 + .05);
    return { fundo: n.cor.toLowerCase(), texto: branco >= preto ? '#ffffff' : '#0a0a0a' };
  }
  function noSelecionado() {
    return !caneta && !borracha && sel && sel.tipo === 'no' ? est.nos.find(n => n.id === sel.id) : null;
  }
  function atualizaCores() {
    const grupo = $('quadro')?.querySelector('.q-cores');
    if (!grupo) return;
    const n = noSelecionado(), ativa = n ? (coresNo(n)?.fundo || 'inherit') : corCaneta;
    grupo.setAttribute('aria-label', n ? 'Cor de fundo do elemento selecionado' : 'Cor da caneta');
    grupo.querySelectorAll('[data-cor]').forEach(b => {
      b.setAttribute('aria-pressed', String(b.dataset.cor === ativa));
      b.title = b.dataset.cor === 'inherit'
        ? (n ? 'Restaurar fundo padrão' : 'Caneta padrão (preta no tema claro, branca no escuro)')
        : `${n ? 'Fundo' : 'Caneta'}: ${b.getAttribute('aria-label')}`;
    });
  }
  function fonteNo(n) {
    return Number.isFinite(n.fonte) && n.fonte >= 8 && n.fonte <= 96 ? n.fonte : null;
  }
  function fonteAtual(n) {
    const texto = mundo().querySelector(`.qn[data-id="${n.id}"] .qt`);
    return texto ? parseFloat(getComputedStyle(texto).fontSize) : (fonteNo(n) || (n.tipo === 'texto' ? 22 : 15));
  }
  function atualizaFonte() {
    if (!$('qFonte')) return;
    const n = noSelecionado(), fonte = n ? fonteAtual(n) : null;
    $('qFonte').disabled = !n; $('qFonte').value = n ? Math.round(fonte) : '';
    $('qFonteMenos').disabled = !n || fonte <= 8;
    $('qFonteMais').disabled = !n || fonte >= 96;
  }
  function alteraFonte(valor) {
    const n = noSelecionado();
    if (!n || !Number.isFinite(valor)) return atualizaFonte();
    const fonte = Math.max(8, Math.min(96, Math.round(valor)));
    encerraEdicao();
    if (fonte === fonteAtual(n)) return atualizaFonte();
    foto(); n.fonte = fonte;
    const e = mundo().querySelector(`.qn[data-id="${n.id}"]`);
    e.style.setProperty('--q-fonte', fonte + 'px');
    // Conserva o espaço já dimensionado e aumenta a altura se o texto precisar.
    if (n.tipo !== 'texto' || n.h) {
      const t = e.querySelector('.qt'), css = getComputedStyle(e), texto = getComputedStyle(t);
      const extra = ['paddingTop', 'paddingBottom', 'borderTopWidth', 'borderBottomWidth'].reduce((s, k) => s + parseFloat(css[k]), 0)
        + parseFloat(texto.marginTop) + parseFloat(texto.marginBottom);
      n.h = Math.max(e.offsetHeight, Math.ceil(t.scrollHeight + extra));
      tamanho(e, n);
    }
    setas(); salvar();
  }
  function tamanho(e, n) {
    if (n.w) { e.style.width = n.w + 'px'; e.style.minWidth = '0'; e.style.maxWidth = 'none'; }
    if (n.h) { e.style.height = n.h + 'px'; e.style.minHeight = '0'; }
  }

  function desenhar() {
    const m = mundo();
    m.querySelectorAll('.qn').forEach(e => e.remove());
    est.nos.forEach(n => {
      const e = document.createElement('div');
      e.className = `qn ${n.tipo}${sel && sel.tipo === 'no' && sel.id === n.id ? ' sel' : ''}`;
      e.dataset.id = n.id;
      e.style.left = n.x + 'px'; e.style.top = n.y + 'px';
      const cores = coresNo(n);
      if (cores) { e.style.setProperty('--q-fundo', cores.fundo); e.style.setProperty('--q-texto', cores.texto); }
      const fonte = fonteNo(n);
      if (fonte) e.style.setProperty('--q-fonte', fonte + 'px');
      if (FORMAS[n.tipo]) e.insertAdjacentHTML('afterbegin', `<svg class="qf" viewBox="0 0 100 100" preserveAspectRatio="none"><polygon points="${FORMAS[n.tipo]}"/></svg>`);
      tamanho(e, n);
      const t = document.createElement('div');
      t.className = 'qt'; t.textContent = n.texto;
      e.appendChild(t);
      Object.keys(LADOS).forEach(lado => {
        const h = document.createElement('span');
        h.className = 'qh'; h.dataset.lado = lado;
        h.title = `Conectar (${lado}): arraste até um elemento ou espaço vazio`;
        e.appendChild(h);
      });
      if (n.tipo !== 'texto') { const r = document.createElement('span'); r.className = 'qr'; r.title = 'Arraste para redimensionar'; e.appendChild(r); }
      m.appendChild(e);
    });
    aplicaVista();
    setas();
    tinta();
  }

  // ponto onde a reta do centro de `a` para o centro de `b` cruza o contorno de `a` (retângulo, elipse, losango ou triângulo)
  function borda(a, b, lado) {
    const hw = a.w / 2, hh = a.h / 2, ax = a.x + hw, ay = a.y + hh;
    const [dx, dy] = LADOS[lado] || [b.x + b.w / 2 - ax, b.y + b.h / 2 - ay];
    if (!dx && !dy) return { x: ax, y: ay };
    let t;
    if (a.tipo === 'circulo') t = 1 / Math.hypot(dx / hw, dy / hh);
    else if (a.tipo === 'losango') t = 1 / (Math.abs(dx) / hw + Math.abs(dy) / hh);
    else if (a.tipo === 'triangulo') {
      const P = [[0, -hh], [hw, hh], [-hw, hh]], cz = (u, v) => u[0] * v[1] - u[1] * v[0];
      t = Infinity;
      for (let i = 0; i < 3; i++) {
        const p = P[i], q = P[(i + 1) % 3], e = [q[0] - p[0], q[1] - p[1]], den = cz([dx, dy], e);
        if (!den) continue;
        const tt = cz(p, e) / den, u = cz(p, [dx, dy]) / den;
        if (tt > 0 && u >= 0 && u <= 1 && tt < t) t = tt;
      }
    } else t = Math.min(dx ? hw / Math.abs(dx) : Infinity, dy ? hh / Math.abs(dy) : Infinity);
    return { x: ax + dx * t, y: ay + dy * t };
  }
  function caixa(n) {
    const e = mundo().querySelector(`.qn[data-id="${n.id}"]`);
    return e ? { tipo: n.tipo, x: n.x, y: n.y, w: e.offsetWidth, h: e.offsetHeight } : null;
  }

  function setas() {
    atualizaAcoes();
    const svg = $('qSetas');
    const linhas = est.setas.map(s => {
      const A = est.nos.find(n => n.id === s.a), B = est.nos.find(n => n.id === s.b);
      const a = A && caixa(A), b = B && caixa(B);
      if (!a || !b) return '';
      const p = borda(a, b, s.ladoA), q = borda(b, a, s.ladoB);
      const on = sel && sel.tipo === 'seta' && sel.id === s.id;
      return `<g data-seta="${s.id}" class="qs${on ? ' sel' : ''}"><line class="hit" x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}"/><line class="vis" x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" marker-end="url(#qPonta)"/></g>`;
    }).join('');
    svg.innerHTML = `<defs><marker id="qPonta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs>${linhas}<line id="qTemp" class="qtemp" marker-end="url(#qPonta)" hidden/>`;
  }

  /* ---------- operações ---------- */
  function centro() {
    const r = $('qTela').getBoundingClientRect(), v = est.vista;
    return { x: (r.width / 2 - v.x) / v.k, y: (r.height / 2 - v.y) / v.k };
  }
  function novo(tipo, texto, x, y) {
    const n = { id: uid(), tipo, texto: texto || { caixa: 'Caixa', nota: 'Nota', circulo: 'Círculo', losango: 'Losango', triangulo: 'Triângulo', texto: 'Texto' }[tipo], x, y };
    if (TAMANHO[tipo]) [n.w, n.h] = TAMANHO[tipo];
    est.nos.push(n); return n;
  }
  function adiciona(tipo) {
    foto();
    const c = centro(), j = est.nos.length % 6 * 18;
    const n = novo(tipo, null, c.x - 80 + j, c.y - 40 + j);
    sel = { tipo: 'no', id: n.id }; desenhar(); salvar();
    editar(n.id);
  }
  function apaga() {
    fechaConexao();
    if (!sel) return;
    foto();
    if (sel.tipo === 'no') { est.nos = est.nos.filter(n => n.id !== sel.id); est.setas = est.setas.filter(s => s.a !== sel.id && s.b !== sel.id); }
    else est.setas = est.setas.filter(s => s.id !== sel.id);
    sel = null; desenhar(); salvar();
  }
  function liga(a, b, ladoA, ladoB) {
    if (a === b || est.setas.some(s => s.a === a && s.b === b)) return;
    foto(); est.setas.push({ id: uid(), a, b, ladoA, ladoB }); setas(); salvar();
  }

  /* ---------- criar um elemento ao soltar uma conexão no espaço vazio ---------- */
  function fechaConexao(focar = false) {
    if (conectando && finalizaArrasto) finalizaArrasto();
    conexaoPendente = null;
    if ($('qConexao')) $('qConexao').hidden = true;
    $('qTemp')?.setAttribute('hidden', '');
    mundo()?.querySelectorAll('.q-alvo').forEach(e => e.classList.remove('q-alvo'));
    if (focar) $('qTela').focus({ preventScroll: true });
  }
  function abreMenuConexao(ev, deId, ladoA) {
    conexaoPendente = { pagina: est.id, deId, ladoA, ponto: ponto(ev) };
    const menu = $('qConexao');
    menu.style.setProperty('--q-menu-x', '12px'); menu.style.setProperty('--q-menu-y', '12px');
    menu.hidden = false;
    const r = menu.getBoundingClientRect();
    menu.style.setProperty('--q-menu-x', Math.max(12, Math.min(ev.clientX, innerWidth - r.width - 12)) + 'px');
    menu.style.setProperty('--q-menu-y', Math.max(12, Math.min(ev.clientY, innerHeight - r.height - 12)) + 'px');
    menu.querySelector('button').focus({ preventScroll: true });
  }
  function criaConectado(tipo) {
    const c = conexaoPendente;
    fechaConexao();
    if (!c || c.pagina !== est.id || !est.nos.some(n => n.id === c.deId)) return;
    foto();
    const n = novo(tipo, null, c.ponto.x, c.ponto.y);
    sel = { tipo: 'no', id: n.id }; desenhar();
    const e = mundo().querySelector(`.qn[data-id="${n.id}"]`);
    n.x -= e.offsetWidth / 2; n.y -= e.offsetHeight / 2;
    e.style.left = n.x + 'px'; e.style.top = n.y + 'px';
    const a = caixa(est.nos.find(x => x.id === c.deId)), b = caixa(n);
    const origem = borda(a, b, c.ladoA);
    est.setas.push({ id: uid(), a: c.deId, b: n.id, ladoA: c.ladoA, ladoB: ladoVoltadoPara(b, origem) });
    setas(); salvar(); editar(n.id);
  }
  function montaMenuConexao() {
    const menu = document.createElement('div');
    menu.id = 'qConexao'; menu.className = 'q-menu-painel q-conexao'; menu.hidden = true;
    menu.setAttribute('role', 'menu'); menu.setAttribute('aria-label', 'Criar elemento conectado');
    const titulo = document.createElement('p'); titulo.className = 'q-menu-titulo'; titulo.textContent = 'Criar e conectar';
    const formas = $('qInserirMenu').querySelector('.q-formas').cloneNode(true);
    formas.querySelectorAll('[data-add]').forEach(b => {
      const tipo = b.dataset.add; delete b.dataset.add;
      b.setAttribute('role', 'menuitem'); b.onclick = () => criaConectado(tipo);
    });
    const cancelar = document.createElement('button'); cancelar.type = 'button';
    cancelar.setAttribute('role', 'menuitem'); cancelar.textContent = 'Cancelar · Esc'; cancelar.onclick = () => fechaConexao(true);
    menu.append(titulo, formas, cancelar); $('quadro').append(menu);
    menu.addEventListener('keydown', ev => {
      if (!['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(ev.key)) return;
      ev.preventDefault();
      const botoes = [...menu.querySelectorAll('button')], i = botoes.indexOf(document.activeElement);
      const prox = ev.key === 'Home' ? 0 : ev.key === 'End' ? botoes.length - 1 : (i + (['ArrowDown', 'ArrowRight'].includes(ev.key) ? 1 : -1) + botoes.length) % botoes.length;
      botoes[prox].focus();
    });
  }

  function editar(id) {
    const e = mundo().querySelector(`.qn[data-id="${id}"] .qt`);
    if (!e) return;
    e.contentEditable = 'plaintext-only';
    if (e.contentEditable !== 'plaintext-only') e.contentEditable = 'true';
    e.focus();
    const r = document.createRange(); r.selectNodeContents(e);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    const fim = () => {
      e.removeEventListener('blur', fim);
      e.contentEditable = 'false';
      const n = est.nos.find(x => x.id === id), t = e.textContent.trim();
      if (n && t !== n.texto) { foto(); n.texto = t; }
      setas(); salvar();
    };
    e.addEventListener('blur', fim);
  }

  // modelos prontos: lista de textos ligados em sequência
  const MODELOS = {
    funil: { titulo: 'Funil de vendas', nos: ['Lead', 'Oportunidade', 'Proposta', 'Cliente'] },
    unit: { titulo: 'Unit economics', nos: ['CAC', 'Payback', 'LTV', 'LTV / CAC'] },
    retencao: { titulo: 'Receita recorrente', nos: ['Clientes novos', 'Base de clientes', 'Churn', 'MRR'] },
  };
  function modelo(chave) {
    const m = MODELOS[chave]; if (!m) return;
    foto();
    const c = centro(), x0 = c.x - (m.nos.length * 190) / 2;
    const ns = m.nos.map((t, i) => novo('caixa', t, x0 + i * 190, c.y - 25));
    ns.slice(1).forEach((n, i) => est.setas.push({ id: uid(), a: ns[i].id, b: n.id }));
    sel = null; desenhar(); salvar();
  }

  /* ---------- ponteiro ---------- */
  function ponto(ev) {
    const r = $('qTela').getBoundingClientRect(), v = est.vista;
    return { x: (ev.clientX - r.left - v.x) / v.k, y: (ev.clientY - r.top - v.y) / v.k };
  }

  function aoPressionar(ev) {
    if (ev.button !== 0 && ev.pointerType === 'mouse') return;
    const alvo = ev.target;
    if (alvo.closest('.qt[contenteditable="true"], .qt[contenteditable="plaintext-only"]')) return;
    if (caneta) return traco(ev);
    if (borracha) return apagando(ev);
    const h = alvo.closest('.qh'), no = alvo.closest('.qn'), seta = alvo.closest('[data-seta]');
    if (h && no) return ligando(ev, no.dataset.id, h.dataset.lado);

    if (alvo.closest('.qr') && no) {
      const n = est.nos.find(x => x.id === no.dataset.id);
      sel = { tipo: 'no', id: n.id };
      const p0 = ponto(ev), w0 = no.offsetWidth, h0 = no.offsetHeight;
      foto();
      return arrasta(ev, e => {
        const p = ponto(e);
        n.w = Math.max(50, Math.round(w0 + p.x - p0.x)); n.h = Math.max(40, Math.round(h0 + p.y - p0.y));
        tamanho(no, n); setas(); emite();
      }, salvar);
    }

    if (no) {
      const n = est.nos.find(x => x.id === no.dataset.id);
      const mudou = !(sel && sel.tipo === 'no' && sel.id === n.id);
      sel = { tipo: 'no', id: n.id };
      if (mudou) { mundo().querySelectorAll('.qn.sel').forEach(e => e.classList.remove('sel')); no.classList.add('sel'); }
      setas();
      const p0 = ponto(ev), x0 = n.x, y0 = n.y; let moveu = false;
      const mv = e => {
        const p = ponto(e);
        if (!moveu && Math.hypot(p.x - p0.x, p.y - p0.y) * est.vista.k < 3) return;
        if (!moveu) { foto(); moveu = true; }
        n.x = x0 + p.x - p0.x; n.y = y0 + p.y - p0.y;
        no.style.left = n.x + 'px'; no.style.top = n.y + 'px'; setas(); emite();
      };
      return arrasta(ev, mv, () => { if (moveu) salvar(); });
    }

    if (seta) {
      sel = { tipo: 'seta', id: seta.dataset.seta };
      mundo().querySelectorAll('.qn.sel').forEach(e => e.classList.remove('sel'));
      setas(); return;
    }

    // fundo: limpa a seleção e move a vista
    sel = null; mundo().querySelectorAll('.qn.sel').forEach(e => e.classList.remove('sel')); setas();
    const cx = ev.clientX, cy = ev.clientY, v0 = { ...est.vista };
    arrasta(ev, e => { est.vista.x = v0.x + e.clientX - cx; est.vista.y = v0.y + e.clientY - cy; aplicaVista(); }, salvar);
  }

  function arrasta(ev, mv, fim) {
    if (finalizaArrasto) finalizaArrasto();
    const up = e => {
      finalizaArrasto = null;
      removeEventListener('pointermove', mv);
      removeEventListener('pointerup', up);
      removeEventListener('pointercancel', up);
      fim && fim(e || ev);
    };
    addEventListener('pointermove', mv);
    addEventListener('pointerup', up);
    addEventListener('pointercancel', up);
    finalizaArrasto = up;
  }

  function ladoVoltadoPara(a, p) {
    const dx = (p.x - a.x - a.w / 2) / a.w, dy = (p.y - a.y - a.h / 2) / a.h;
    return Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 'esquerda' : 'direita') : (dy < 0 ? 'topo' : 'baixo');
  }
  function ligando(ev, deId, ladoA) {
    ev.preventDefault(); encerraEdicao();
    $('quadro').querySelectorAll('.q-menu').forEach(m => { m.open = false; });
    sel = { tipo: 'no', id: deId };
    mundo().querySelectorAll('.qn').forEach(e => e.classList.toggle('sel', e.dataset.id === deId));
    setas();
    const a = caixa(est.nos.find(n => n.id === deId)), origem = borda(a, a, ladoA), t = $('qTemp');
    let alvo = null;
    conectando = true; t.removeAttribute('hidden');
    const mv = e => {
      const sobre = document.elementFromPoint(e.clientX, e.clientY), no = sobre?.closest('.qn');
      mundo().querySelectorAll('.q-alvo').forEach(e => e.classList.remove('q-alvo'));
      let p = ponto(e); alvo = null;
      if (no && no.dataset.id !== deId) {
        const b = caixa(est.nos.find(n => n.id === no.dataset.id));
        const ladoB = sobre.closest('.qh')?.dataset.lado || ladoVoltadoPara(b, origem);
        alvo = { id: no.dataset.id, ladoB }; p = borda(b, a, ladoB); no.classList.add('q-alvo');
      }
      t.setAttribute('x1', origem.x); t.setAttribute('y1', origem.y); t.setAttribute('x2', p.x); t.setAttribute('y2', p.y);
    };
    mv(ev);
    arrasta(ev, mv, e => {
      conectando = false;
      if (e.type !== 'pointerup' || Math.hypot(e.clientX - ev.clientX, e.clientY - ev.clientY) < 3) return fechaConexao();
      mv(e);
      if (alvo) { fechaConexao(); liga(deId, alvo.id, ladoA, alvo.ladoB); return; }
      const sobre = document.elementFromPoint(e.clientX, e.clientY);
      if (sobre && $('qTela').contains(sobre) && !sobre.closest('.qn')) abreMenuConexao(e, deId, ladoA);
      else fechaConexao();
    });
  }

  function aoRolar(ev) {
    ev.preventDefault();
    fechaConexao();
    const v = est.vista, r = $('qTela').getBoundingClientRect();
    if (ev.ctrlKey || ev.metaKey) {
      // zoom em torno do cursor (pinça do trackpad ou Ctrl/⌘ + rolagem); rolagem simples move a vista
      const k = Math.min(2.5, Math.max(0.25, v.k * Math.exp(-ev.deltaY * 0.0015)));
      const px = ev.clientX - r.left, py = ev.clientY - r.top;
      v.x = px - (px - v.x) * (k / v.k); v.y = py - (py - v.y) * (k / v.k); v.k = k;
    } else { v.x -= ev.deltaX; v.y -= ev.deltaY; }
    aplicaVista(); salvar();
  }

  function aoTeclar(ev) {
    if ($('quadro').hidden) return;
    if (ev.key === 'Escape' && (conectando || conexaoPendente)) { ev.preventDefault(); fechaConexao(true); return; }
    if (ev.target.closest?.('#qConexao')) return;
    const menuAberto = $('quadro').querySelector('.q-menu[open]');
    if (ev.key === 'Escape' && menuAberto) {
      ev.preventDefault(); menuAberto.open = false; menuAberto.querySelector('summary').focus(); return;
    }
    if (ev.key === 'Escape' && document.body.classList.contains('q-foco')) {
      ev.preventDefault(); foco(false); return;
    }
    if (ev.target.closest && ev.target.closest('[contenteditable="true"], [contenteditable="plaintext-only"], input, textarea')) return;
    if (ev.key === 'PageDown' || ev.key === 'PageUp') {
      ev.preventDefault();
      const i = paginas.findIndex(p => p.id === est.id), p = paginas[i + (ev.key === 'PageDown' ? 1 : -1)];
      if (p) irPagina(p.id);
      return;
    }
    if ((ev.key === 'Delete' || ev.key === 'Backspace') && sel) { ev.preventDefault(); apaga(); }
    else if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'z') { ev.preventDefault(); volta(); }
    else if (ev.key === 'Enter' && sel && sel.tipo === 'no') { ev.preventDefault(); editar(sel.id); }
  }

  function zoom(f) {
    const v = est.vista, r = $('qTela').getBoundingClientRect();
    const k = Math.min(2.5, Math.max(0.25, v.k * f));
    const px = r.width / 2, py = r.height / 2;
    v.x = px - (px - v.x) * (k / v.k); v.y = py - (py - v.y) * (k / v.k); v.k = k;
    aplicaVista(); salvar();
  }

  /* ---------- só a área de escrita ---------- */
  function barraFixa(fixa) {
    document.body.classList.toggle('q-barra', fixa);
    $('qFixar').setAttribute('aria-pressed', String(fixa));
    $('qFixar').title = fixa ? 'Ocultar barra de ações' : 'Mostrar barra de ações';
    $('qFixar').setAttribute('aria-label', fixa ? 'Ocultar barra de ações' : 'Fixar barra de ações no topo');
    aplicaVista();
  }

  function foco(ativo, devolverFoco = true) {
    if (document.body.classList.contains('q-foco') === ativo) return;
    fechaConexao();
    document.body.classList.toggle('q-foco', ativo);
    $('qFoco').setAttribute('aria-pressed', String(ativo));
    if (ativo) {
      $('quadro').querySelectorAll('.q-menu').forEach(m => { m.open = false; });
      $('qSala').hidden = true;
      $('qTela').focus({ preventScroll: true });
    } else if (devolverFoco) $('qFoco').focus({ preventScroll: true });
    aplicaVista(); // informa ao tablet o novo tamanho da área visível
  }

  /* ---------- montagem (uma vez) ---------- */
  function montar() {
    if (pronto) return; pronto = true;
    const tela = $('qTela');
    tela.addEventListener('pointerdown', aoPressionar);
    tela.addEventListener('dblclick', ev => { const no = ev.target.closest('.qn'); if (no) { sel = { tipo: 'no', id: no.dataset.id }; editar(no.dataset.id); } });
    tela.addEventListener('wheel', aoRolar, { passive: false });
    document.addEventListener('keydown', aoTeclar);
    $('qFoco').onclick = () => foco(!document.body.classList.contains('q-foco'));
    $('qFixar').onclick = () => barraFixa(!document.body.classList.contains('q-barra'));
    $('qPagina').onchange = e => irPagina(e.target.value);
    $('qAnterior').onclick = () => { const i = paginas.findIndex(p => p.id === est.id); if (i > 0) irPagina(paginas[i - 1].id); };
    $('qProxima').onclick = () => { const i = paginas.findIndex(p => p.id === est.id); if (i < paginas.length - 1) irPagina(paginas[i + 1].id); };
    $('qNovaPagina').onclick = novaPagina;
    $('qExportarPagina').onclick = () => exportar(false);
    $('qExportarTudo').onclick = () => exportar(true);
    addEventListener('pagehide', () => { encerraEdicao(); persistir(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) { encerraEdicao(); persistir(); } });
    new ResizeObserver(() => { if (!$('quadro').hidden) aplicaVista(); }).observe(tela);
    const menus = $('quadro').querySelectorAll('.q-menu');
    const fechaMenus = () => menus.forEach(m => { m.open = false; });
    const posicionaMenu = m => {
      const r = m.querySelector('summary').getBoundingClientRect(), painel = m.querySelector('.q-menu-painel');
      const w = Math.min(240, innerWidth - 24);
      painel.style.setProperty('--q-menu-x', Math.max(12, Math.min(r.left, innerWidth - w - 12)) + 'px');
      painel.style.setProperty('--q-menu-y', r.bottom + 8 + 'px');
    };
    menus.forEach(m => {
      m.addEventListener('toggle', () => { if (m.open) { menus.forEach(outro => { if (outro !== m) outro.open = false; }); posicionaMenu(m); } });
      m.addEventListener('click', e => { if (e.target.closest('button')) m.open = false; });
    });
    montaMenuConexao();
    document.addEventListener('pointerdown', e => {
      if (!e.target.closest('#quadro .q-menu')) fechaMenus();
      if (conexaoPendente && !e.target.closest('#qConexao')) fechaConexao();
    });
    $('quadro').querySelector('.q-comandos').addEventListener('scroll', () => menus.forEach(m => { if (m.open) posicionaMenu(m); }));
    addEventListener('resize', () => { fechaMenus(); fechaConexao(); });
    $('quadro').querySelectorAll('[data-add]').forEach(b => { b.onclick = () => { modo('selecionar'); adiciona(b.dataset.add); }; });
    $('qModelo').onchange = e => { modo('selecionar'); modelo(e.target.value); e.target.value = ''; fechaMenus(); };
    const modo = qual => {
      fechaConexao();
      caneta = qual === 'caneta'; borracha = qual === 'borracha';
      [['qSelecionar', !caneta && !borracha], ['qCaneta', caneta], ['qBorracha', borracha]].forEach(([id, ativo]) => {
        $(id).classList.toggle('on', ativo); $(id).setAttribute('aria-pressed', String(ativo));
      });
      tela.classList.toggle('caneta', caneta); tela.classList.toggle('borracha', borracha);
      atualizaCores();
      atualizaFonte();
    };
    $('qCaneta').onclick = () => modo('caneta');
    $('qSelecionar').onclick = () => modo('selecionar');
    const cores = $('quadro').querySelectorAll('[data-cor]');
    cores.forEach(b => { b.onclick = () => {
      const n = noSelecionado();
      if (n) {
        const cor = b.dataset.cor;
        if ((coresNo(n)?.fundo || 'inherit') === cor) return;
        foto();
        if (cor === 'inherit') delete n.cor; else n.cor = cor;
        desenhar(); salvar(); return;
      }
      corCaneta = b.dataset.cor;
      modo('caneta');
    }; });
    $('qBorracha').onclick = () => modo('borracha');
    $('qFonteMenos').onclick = () => { const n = noSelecionado(); if (n) alteraFonte(fonteAtual(n) - 2); };
    $('qFonteMais').onclick = () => { const n = noSelecionado(); if (n) alteraFonte(fonteAtual(n) + 2); };
    $('qFonte').onchange = () => alteraFonte($('qFonte').value === '' ? NaN : Number($('qFonte').value));
    $('qFonte').addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); $('qFonte').blur(); } });
    $('qApagar').onclick = apaga;
    $('qDesfazer').onclick = volta;
    $('qMais').onclick = () => zoom(1.2);
    $('qMenos').onclick = () => zoom(1 / 1.2);
    $('qLimpar').onclick = () => { if ((est.nos.length || (est.tracos || []).length) && confirm('Limpar apenas esta página? As outras páginas serão mantidas.')) { foto(); const doTablet = (est.tracos || []).filter(t => t.t).map(t => t.id); if (doTablet.length && Quadro.aoApagar) Quadro.aoApagar(doTablet); est = { ...vazia(), id: est.id }; sel = null; desenhar(); salvar(); } };
  }

  /* ---------- sala ao vivo: entradas e saídas ---------- */
  // ajusta a vista para caber tudo (usado por quem só assiste)
  function ajusta() {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    est.nos.forEach(n => { const c = caixa(n); if (c) { x0 = Math.min(x0, c.x); y0 = Math.min(y0, c.y); x1 = Math.max(x1, c.x + c.w); y1 = Math.max(y1, c.y + c.h); } });
    (est.tracos || []).forEach(t => { for (let i = 0; i < t.p.length; i += 2) { x0 = Math.min(x0, t.p[i]); x1 = Math.max(x1, t.p[i]); y0 = Math.min(y0, t.p[i + 1]); y1 = Math.max(y1, t.p[i + 1]); } });
    const r = $('qTela').getBoundingClientRect();
    if (!isFinite(x0)) { est.vista = { x: r.width / 2, y: r.height / 2, k: 1 }; return aplicaVista(); }
    const m = 48, bw = Math.max(1, x1 - x0), bh = Math.max(1, y1 - y0);
    const k = Math.min(1.6, Math.max(0.1, Math.min((r.width - 2 * m) / bw, (r.height - 2 * m) / bh)));
    est.vista = { k, x: (r.width - bw * k) / 2 - x0 * k, y: (r.height - bh * k) / 2 - y0 * k };
    aplicaVista();
  }

  window.Quadro = {
    aoMudar: null, aoVista: null, aoApagar: null,
    sairFoco: () => foco(false, false),
    coresNo,
    fonteNo,
    apagaTraco,
    abrir() {
      montar();
      if (!this.carregado) { carregar(); this.carregado = true; }
      desenhar();
      controlesPaginas();
    },
    estado: publico,
    primeiraPagina: () => paginas[0].id,
    vista: visivel,
    // traço vindo do tablet (cria ou atualiza) ou apagado por lá
    addTraco(id, t) {
      guardaAtual();
      const alvo = t.pagina ? paginas.find(p => p.id === t.pagina) : (paginas.find(p => p.tracos.some(x => x.id === id)) || paginas[0]);
      if (!alvo) return;
      const i = alvo.tracos.findIndex(x => x.id === id);
      const cor = /^#[0-9a-f]{6}$/i.test(t.cor) ? t.cor : 'inherit';
      if (i >= 0) { alvo.tracos[i].p = t.p; alvo.tracos[i].w = t.w; alvo.tracos[i].cor = cor; } else alvo.tracos.push({ id, p: t.p, w: t.w, cor, t: 1 });
      if (alvo === est) tinta(); salvar();
    },
    delTraco(id) { guardaAtual(); paginas.forEach(p => { p.tracos = p.tracos.filter(x => x.id !== id); }); tinta(); salvar(); },
    // tablet: mostra o quadro de fundo, na mesma região (V) que aparece no computador; `ocultos` são traços que o tablet já desenha por conta própria
    verVista(novo, V, ocultos) {
      est = { nos: [], setas: [], tracos: [], ...novo, vista: { x: 0, y: 0, k: 1 } };
      if (ocultos) est.tracos = est.tracos.filter(t => !ocultos.has(t.id));
      const r = $('qTela').getBoundingClientRect(), u = Math.min(r.width / V.w, r.height / V.h);
      est.vista = { k: u, x: (r.width - V.w * u) / 2 - V.x * u, y: (r.height - V.h * u) / 2 - V.y * u };
      desenhar();
    },
    // só leitura: recebe o quadro inteiro do anfitrião e desenha
    ver(novo) {
      est = { nos: [], setas: [], tracos: [], ...novo, vista: { x: 0, y: 0, k: 1 } };
      desenhar(); ajusta();
      if (!this.lendo) { this.lendo = true; addEventListener('resize', () => ajusta()); }
    },
  };
})();
