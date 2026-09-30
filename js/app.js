(function () {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let modo = 'entrar';
  let atual = null;

  document.title = APP_CONFIG.NOME;
  $('nome').textContent = APP_CONFIG.NOME;

  /* ---------- acesso ---------- */
  let usuario = null;
  function msg(tipo, txt) { const m = $('authMsg'); m.hidden = !txt; m.className = 'msg ' + tipo; m.textContent = txt || ''; }

  function setModo(m) {
    modo = m;
    $('tabEntrar').classList.toggle('on', m === 'entrar');
    $('tabCadastro').classList.toggle('on', m === 'cadastro');
    $('authBtn').textContent = m === 'entrar' ? 'Entrar' : 'Criar conta';
    $('senhaDica').hidden = m === 'entrar';
    $('senha').autocomplete = m === 'entrar' ? 'current-password' : 'new-password';
    msg('', '');
  }
  $('tabEntrar').onclick = () => setModo('entrar');
  $('tabCadastro').onclick = () => setModo('cadastro');

  async function tenta(fn) {
    if (!Auth.configurado) return msg('bad', 'Login ainda não configurado.');
    $('authBtn').disabled = $('google').disabled = true; msg('', '');
    try { await fn(); } catch (err) { msg('bad', err.message); }
    $('authBtn').disabled = $('google').disabled = false;
  }
  $('google').onclick = () => tenta(() => Auth.google());
  $('authForm').onsubmit = e => {
    e.preventDefault();
    tenta(async () => { await (modo === 'entrar' ? Auth.entrar : Auth.cadastrar)($('email').value, $('senha').value); $('senha').value = ''; });
  };
  $('esqueci').onclick = e => {
    e.preventDefault();
    if (!$('email').value) return msg('bad', 'Digite seu e-mail acima e clique de novo.');
    tenta(async () => { await Auth.recuperar($('email').value); msg('good', 'Se existir uma conta com esse e-mail, enviamos um link para redefinir a senha.'); });
  };
  $('sair').onclick = () => { Auth.sair(); location.hash = ''; };

  /* ---------- dashboard ---------- */
  function catalogo() {
    const porCat = {};
    CALCULADORAS.forEach(c => (porCat[c.categoria] = porCat[c.categoria] || []).push(c));
    $('catalogo').innerHTML = Object.entries(porCat).map(([cat, cs]) =>
      `<div class="cat">${esc(cat)}</div><div class="list">` + cs.map(c =>
        `<a class="item" href="#/calc/${esc(c.id)}"><b>${esc(c.nome)}</b><span class="d">${esc(c.descricao)}</span></a>`).join('') + '</div>').join('');
  }

  /* ---------- calculadora ---------- */
  function abrir(c) {
    atual = c;
    $('cNome').textContent = c.nome;
    $('cDesc').textContent = c.descricao;
    $('form').innerHTML = c.campos.map(f => {
      if (f.tipo === 'checkbox') {
        return `<div class="field" data-mostrar="${esc(f.mostrarSe || '')}"><label class="check"><input id="c_${esc(f.id)}" type="checkbox" ${f.valor ? 'checked' : ''}> ${esc(f.rotulo)}</label>${f.dica ? `<div class="hint">${esc(f.dica)}</div>` : ''}</div>`;
      }
      return `<div class="field" data-mostrar="${esc(f.mostrarSe || '')}"><label for="c_${esc(f.id)}">${esc(f.rotulo)}${f.opcional ? ' <span class="opt">(opcional)</span>' : ''}</label>
        <div class="inp">${f.prefixo ? `<span>${esc(f.prefixo)}</span>` : ''}<input id="c_${esc(f.id)}" type="number" min="0" ${f.max != null ? `max="${f.max}"` : ''} step="any" value="${f.valor}">${f.sufixo ? `<span>${esc(f.sufixo)}</span>` : ''}</div>
        ${f.dica ? `<div class="hint">${esc(f.dica)}</div>` : ''}</div>`;
    }).join('');
    $('form').querySelectorAll('input').forEach(i => i.addEventListener('input', renderizar));
    renderizar();
    revelar();
  }

  // revelação única ao abrir a calculadora (não repete a cada número digitado)
  function revelar() {
    ['diag', 'kpis'].forEach(id => { $(id).classList.remove('reveal'); void $(id).offsetWidth; $(id).classList.add('reveal'); });
    clearTimeout(revelar.t);
    revelar.t = setTimeout(() => ['diag', 'kpis'].forEach(id => $(id).classList.remove('reveal')), 1800);
  }

  const leitor = f => $('c_' + f.id);

  function renderizar() {
    const c = atual;
    $('form').querySelectorAll('[data-mostrar]').forEach(el => {
      const dep = el.dataset.mostrar;
      el.hidden = !!dep && !$('c_' + dep).checked;
    });
    const v = lerValores(c, leitor);
    const r = c.calcular(v);
    const d = r.diagnostico;
    $('diag').innerHTML = `<div class="diag ${d.tipo}"><h3>${esc(d.titulo)}</h3><p>${esc(d.texto)}</p>${d.pontos ? '<ul>' + d.pontos.map(p => `<li>${esc(p)}</li>`).join('') + '</ul>' : ''}</div>`;
    $('kpis').innerHTML = r.kpis.map((k, i) =>
      `<div class="kpi" style="--i:${i}"><div class="name">${esc(k.nome)}</div><div class="val">${esc(k.valor)}</div><div class="note">${esc(k.nota || '')} ${k.selo ? `<span class="badge ${k.selo[0]}">${esc(k.selo[1])}</span>` : ''}</div></div>`).join('');
    $('extra').innerHTML = r.extra || '';
    $('pTitulo').textContent = 'Premissas informadas';
    $('pUrl').textContent = location.host + location.pathname.replace(/app\.html$/, '');
    $('pData').textContent = 'Relatório de ' + new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    $('resumo').innerHTML = c.campos.filter(f => !f.mostrarSe || v[f.mostrarSe]).map(f => {
      const x = v[f.id];
      const txt = f.tipo === 'checkbox' ? (x ? 'Sim' : 'Não') : `${f.prefixo ? f.prefixo + ' ' : ''}${fmt.num(x, 2)}${f.sufixo ? ' ' + f.sufixo : ''}`;
      return `<li><span>${esc(f.rotulo)}</span><b>${esc(txt)}</b></li>`;
    }).join('');
  }

  // PDF: o diálogo de impressão do navegador tem "Salvar como PDF"; o título vira o nome do arquivo.
  $('pdf').onclick = () => {
    const antes = document.title;
    document.title = `${atual.nome} - ${new Date().toISOString().slice(0, 10)}`;
    window.print();
    document.title = antes;
  };

  // tela de carregamento: some quando o login terminou de ser verificado (mínimo 700 ms para a animação ser vista)
  const t0 = Date.now();
  function fechaBoot() { setTimeout(() => $('boot').classList.add('out'), Math.max(0, 700 - (Date.now() - t0))); }

  /* ---------- rotas ---------- */
  function rota() {
    const logado = usuario && usuario.nome;
    $('user').hidden = $('sair').hidden = !logado;
    if (logado) $('user').textContent = logado;
    $('auth').hidden = !!logado;
    $('authSetup').hidden = Auth.configurado;
    $('home').hidden = $('calc').hidden = true;
    if (!logado) { setModo(location.hash === '#cadastro' ? 'cadastro' : 'entrar'); return; }
    const m = location.hash.match(/^#\/calc\/([\w-]+)/);
    const c = m && CALCULADORAS.find(x => x.id === m[1]);
    if (c) { $('calc').hidden = false; abrir(c); window.scrollTo(0, 0); }
    else { $('home').hidden = false; }
  }
  window.addEventListener('hashchange', rota);

  carregarCalculadoras().then(() => { catalogo(); Auth.iniciar(u => { usuario = u; rota(); fechaBoot(); }); })
    .catch(e => { fechaBoot(); document.querySelector('main').innerHTML = `<div class="msg bad">${esc(e.message)}</div>`; });
})();
