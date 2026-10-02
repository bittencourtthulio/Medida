(function () {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduzMovimento = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let modo = 'entrar';
  let atual = null;
  let ultimo = null;   // último cálculo (calculadora, valores e resultado), para montar o prompt
  let usuario = null;

  document.title = APP_CONFIG.NOME;

  /* ---------- acesso ---------- */
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
  $('sair').onclick = () => { Auth.sair(); conversa.length = 0; painelAtual = null; location.hash = ''; };

  /* ---------- busca por assunto (sem IA): palavras-chave, radicais e pesos ---------- */
  const STOP = new Set(('a o as os um uma uns umas de do da dos das em no na nos nas por para com sem que qual quais como meu minha meus minhas ' +
    'seu sua seus suas eu voce ser esta estao tem ter sao preciso precisar quero queria saber descobrir entender quanto quantos quantas onde ' +
    'quando vale pena e ou ao aos mais muito muita ja nao se me isso esse essa este desse dessa tenho estou fazer posso devo vou ver sobre ' +
    'nosso nossa nossos nossas vamos pode podem deve dos ate mas').split(' '));
  const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  // radical: tira o plural e corta (custo/custa/custos → cust; equipe ≠ equilíbrio → equip/equil)
  const stem = w => { if (w.length >= 5 && w.endsWith('s')) w = w.slice(0, -1); return w.length >= 6 ? w.slice(0, 5) : w.length === 5 ? w.slice(0, 4) : w; };
  const tokens = s => norm(s).split(' ').filter(w => w && !STOP.has(w) && (w.length >= 3 || w === 'ia'));
  const conjunto = s => new Set(tokens(s).map(stem));
  // palavras-chave com contagem: termo repetido nas palavras da calculadora pesa mais (até +2)
  function contagemTermos(t) { const m = new Map(); tokens(t).map(stem).forEach(w => m.set(w, (m.get(w) || 0) + 1)); return m; }
  const PESO = { nome: 8, termos: 4, desc: 2, cat: 2, campos: 1 };
  let indice = [];
  function indexar() {
    indice = CALCULADORAS.map(c => ({
      c, nomeNorm: norm(c.nome),
      nome: conjunto(c.nome), termos: contagemTermos(c.termos || TERMOS[c.id] || ''), desc: conjunto(c.descricao),
      cat: conjunto(c.categoria), campos: conjunto(c.campos.map(f => f.rotulo).join(' ')),
    }));
  }
  function buscar(q) {
    const qt = tokens(q);
    if (!qt.length) return [];
    const nq = norm(q);
    const r = indice.map(d => {
      let s = 0; const hit = [];
      for (const w of qt) {
        const st = stem(w); let m = 0;
        for (const k in PESO) if (d[k].has(st)) m = Math.max(m, PESO[k] + (k === 'termos' ? Math.min(2, d.termos.get(st) - 1) : 0));
        if (m) { s += m; hit.push(w); }
      }
      if (d.nomeNorm.length > 3 && nq.includes(d.nomeNorm)) s += 10;
      return { c: d.c, s, hit };
    }).filter(x => x.s > 0).sort((a, b) => b.s - a.s || b.hit.length - a.hit.length);
    const max = r.length ? r[0].s : 0;
    return r.filter(x => x.s >= Math.max(2, max * 0.5)).slice(0, 6);
  }

  const porId = id => CALCULADORAS.find(c => c.id === id);
  const areaDe = c => AREAS.find(a => a.nome === c.categoria);
  const contagem = a => CALCULADORAS.filter(c => c.categoria === a.nome).length;
  const COMECE = ['roi-saas', 'churn', 'runway-e-burn', 'precificacao', 'meta-de-vendas', 'margem-por-projeto'];
  const EXEMPLOS = ['Meu churn está alto', 'Quanto custa um cliente novo?', 'Quando acaba meu caixa?', 'Quanto devo cobrar pelo plano?', 'Meu projeto deu lucro?', 'Vale construir ou comprar?'];

  /* ---------- menu lateral ---------- */
  function navAreas() {
    $('navAreas').innerHTML = AREAS.map(a => `<a href="#/area/${a.slug}" data-nav="${a.slug}">${esc(a.nome)}<small>${contagem(a)}</small></a>`).join('');
  }
  function marcaNav(chave) {
    document.querySelectorAll('#side nav a').forEach(a => a.classList.toggle('on', a.dataset.nav === chave));
  }
  function menu(abrir) { $('side').classList.toggle('open', abrir); $('scrim').style.display = abrir ? 'block' : 'none'; }
  $('menu').onclick = () => menu(true);
  $('scrim').onclick = () => menu(false);
  $('scrim').style.cssText = 'position:fixed;inset:0;z-index:20;';
  $('scrim').style.display = 'none';

  /* ---------- cartões ---------- */
  const cartao = (c, i, melhor) => `<a class="sug" style="--i:${i}" href="#/calc/${esc(c.id)}">
      <span class="t">${melhor ? '<span class="badge good">Melhor resposta</span>' : ''}<span>${esc(c.categoria)}</span></span>
      <b>${esc(c.nome)}</b><span class="d">${esc(c.descricao)}</span></a>`;

  /* ---------- início: chat + sugestões ---------- */
  const conversa = [];      // [{quem:'u'|'a', html}]
  let painelAtual = null;   // {titulo, itens:[calc], melhor:boolean}

  function mensagemBoasVindas() {
    return `Me diga o que você quer entender sobre o seu SaaS e eu indico a calculadora certa. Por exemplo:` +
      `<div class="chips">${EXEMPLOS.map(e => `<button class="chip" type="button" data-q="${esc(e)}">${esc(e)}</button>`).join('')}</div>`;
  }

  function painelHtml() {
    const p = painelAtual || { titulo: 'Comece por aqui', itens: COMECE.map(porId).filter(Boolean), melhor: false };
    return `<h2>${esc(p.titulo)}</h2><div class="sugs">${p.itens.map((c, i) => cartao(c, i, p.melhor && i === 0)).join('')}</div>`;
  }

  function home() {
    $('home').innerHTML = `
      <div class="hello"><h1>O que você quer descobrir?</h1>
        <p>${CALCULADORAS.length} calculadoras em ${AREAS.length} áreas, cada uma com um veredito. Escreva sua dúvida ou explore pelas áreas.</p></div>
      <div class="home-grid">
        <div class="chat">
          <div class="thread" id="thread" aria-live="polite"></div>
          <form class="comp" id="comp"><textarea id="q" rows="1" placeholder="Ex.: meu caixa está acabando, quanto cobrar, churn alto..." aria-label="Sua dúvida"></textarea><button class="btn" type="submit">Enviar</button></form>
        </div>
        <aside class="painel" id="painel"></aside>
      </div>
      <h2 class="sec-h">Explorar por área</h2>
      <div class="areas">${AREAS.map(a => `<a class="acard" href="#/area/${a.slug}"><b>${esc(a.nome)}</b><span>${esc(a.resumo)}</span><small>${contagem(a)} calculadoras</small></a>`).join('')}</div>`;
    const th = $('thread');
    th.innerHTML = `<div class="m a">${mensagemBoasVindas()}</div>` + conversa.map(m => `<div class="m ${m.quem}">${m.html}</div>`).join('');
    $('painel').innerHTML = painelHtml();
    th.scrollTop = th.scrollHeight;
    $('comp').onsubmit = e => { e.preventDefault(); perguntar($('q').value); };
    $('q').onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); perguntar($('q').value); } };
    $('q').oninput = e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; };
    $('home').onclick = e => { const b = e.target.closest('.chip'); if (b) perguntar(b.dataset.q); };
  }

  function respostaPara(q, achados) {
    if (!achados.length) {
      painelAtual = { titulo: 'Explore as áreas', itens: COMECE.map(porId).filter(Boolean), melhor: false };
      return `Ainda não tenho uma calculadora que responda isso. Tente descrever o número que você quer melhorar, como churn, caixa, preço, tráfego ou prazo de entrega. Ou escolha uma destas:` +
        `<div class="chips">${EXEMPLOS.slice(0, 4).map(e => `<button class="chip" type="button" data-q="${esc(e)}">${esc(e)}</button>`).join('')}</div>`;
    }
    const [top, ...resto] = achados.map(a => a.c);
    painelAtual = { titulo: achados.length > 1 ? `${achados.length} calculadoras para isso` : 'Calculadora para isso', itens: achados.map(a => a.c), melhor: true };
    const outras = resto.slice(0, 2).map(c => `<a class="lk" href="#/calc/${esc(c.id)}">${esc(c.nome)}</a>`).join(' e ');
    return `Para isso eu começaria pela <b>${esc(top.nome)}</b>. ${esc(top.descricao)}` +
      (outras ? ` Também podem ajudar: ${outras}.` : '') +
      `<div class="acoes"><a class="btn sm" href="#/calc/${esc(top.id)}">Abrir ${esc(top.nome)}</a></div>`;
  }

  function perguntar(texto) {
    const q = (texto || '').trim();
    if (!q) return;
    const th = $('thread');
    conversa.push({ quem: 'u', html: esc(q) });
    th.insertAdjacentHTML('beforeend', `<div class="m u">${esc(q)}</div><div class="m a" id="digitando"><span class="dots"><i></i><i></i><i></i></span></div>`);
    $('q').value = ''; $('q').style.height = 'auto';
    th.scrollTop = th.scrollHeight;
    setTimeout(() => {
      const html = respostaPara(q, buscar(q));
      conversa.push({ quem: 'a', html });
      const d = $('digitando');
      if (d) { d.removeAttribute('id'); d.innerHTML = html; }
      $('painel').innerHTML = painelHtml();
      th.scrollTop = th.scrollHeight;
    }, reduzMovimento ? 0 : 550);
  }

  /* ---------- área ---------- */
  function paginaArea(a) {
    const cs = CALCULADORAS.filter(c => c.categoria === a.nome);
    $('area').innerHTML = `<div class="area-head"><h1>${esc(a.nome)}</h1><p class="sub">${esc(a.resumo)} ${cs.length} calculadoras.</p></div>
      <div class="grid-sugs">${cs.map((c, i) => cartao(c, i, false)).join('')}</div>`;
  }

  /* ---------- busca rápida (Ctrl/⌘ K) ---------- */
  let sel = 0, itensPaleta = [];
  function paleta(q) {
    const achados = q.trim() ? buscar(q).map(x => x.c) : COMECE.map(porId).filter(Boolean);
    itensPaleta = achados;
    sel = 0;
    $('pr').innerHTML = achados.length
      ? achados.map((c, i) => `<a class="pi${i === 0 ? ' on' : ''}" role="option" href="#/calc/${esc(c.id)}" data-i="${i}"><b>${esc(c.nome)}</b><small>${esc(c.categoria)}</small></a>`).join('')
      : `<div class="pvazio">Nada encontrado para "${esc(q)}". Tente outro assunto, como churn, caixa ou preço.</div>`;
  }
  function marcaPaleta() { document.querySelectorAll('#pr .pi').forEach((el, i) => el.classList.toggle('on', i === sel)); }
  function abrePaleta() { $('palette').hidden = false; $('pq').value = ''; paleta(''); $('pq').focus(); menu(false); }
  function fechaPaleta() { $('palette').hidden = true; }
  $('abrirBusca').onclick = $('abrirBusca2').onclick = abrePaleta;
  $('palette').onclick = e => { if (e.target === $('palette') || e.target.closest('.pi')) fechaPaleta(); };
  $('pq').oninput = e => paleta(e.target.value);
  $('pq').onkeydown = e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, itensPaleta.length - 1); marcaPaleta(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); marcaPaleta(); }
    else if (e.key === 'Enter' && itensPaleta[sel]) { e.preventDefault(); location.hash = '#/calc/' + itensPaleta[sel].id; fechaPaleta(); }
    else if (e.key === 'Escape') fechaPaleta();
  };
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && usuario) { e.preventDefault(); $('palette').hidden ? abrePaleta() : fechaPaleta(); }
    else if (e.key === 'Escape' && !$('palette').hidden) fechaPaleta();
    else if (e.key === 'Escape' && !$('promptModal').hidden) $('promptModal').hidden = true;
  });

  /* ---------- calculadora ---------- */
  function abrir(c) {
    atual = c;
    const a = areaDe(c);
    $('back').href = a ? '#/area/' + a.slug : '#/';
    $('back').textContent = '← ' + (a ? a.nome : 'Todas as calculadoras');
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
    aplicaLink(c);
    renderizar();
    revelar();
  }

  /* ---------- link compartilhável: #/calc/<id>?campo=valor&... (os números vão só na URL, nada é guardado) ---------- */
  function aplicaLink(c) {
    const q = location.hash.split('?')[1];
    if (!q) return;
    const p = new URLSearchParams(q);
    c.campos.forEach(f => {
      if (!p.has(f.id)) return;
      const el = $('c_' + f.id), x = p.get(f.id);
      if (f.tipo === 'checkbox') { el.checked = x === '1'; return; }
      const n = Number(x);
      if (x !== '' && isFinite(n) && n >= 0) el.value = f.max != null ? Math.min(n, f.max) : n;
    });
    if (window.Compartilhar) {
      const nome = Compartilhar.parseCenarioNome(location.hash);
      if (nome) {
        const bar = $('cenarioBar');
        if (bar) { bar.hidden = false; bar.textContent = 'Cenário compartilhado: ' + nome; }
      }
    }
  }

  function linkDaCalculadora() {
    if (window.Compartilhar) {
      return Compartilhar.gerarLink({ calc: atual, valores: lerValores(atual, leitor), cenarioNome: null });
    }
    const p = new URLSearchParams();
    atual.campos.forEach(f => { const el = $('c_' + f.id); p.set(f.id, f.tipo === 'checkbox' ? (el.checked ? '1' : '0') : el.value); });
    return `${location.origin}${location.pathname}#/calc/${atual.id}?${p}`;
  }

  $('link').onclick = async () => {
    const cenarioNome = window.Compartilhar ? Compartilhar.cenarioNome(atual.id) : null;
    const url = window.Compartilhar
      ? Compartilhar.gerarLink({ calc: atual, valores: lerValores(atual, leitor), cenarioNome })
      : linkDaCalculadora();
    const b = $('link');
    try { await navigator.clipboard.writeText(url); b.textContent = '✓ Link copiado'; }
    catch { history.replaceState(null, '', url.slice(location.origin.length)); b.textContent = 'Copie o link na barra de endereço'; }
    clearTimeout(b.t); b.t = setTimeout(() => { b.textContent = '🔗 Copiar link'; }, 2200);
  };

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
    ultimo = { c, v, r };
    const d = r.diagnostico;
    $('diag').innerHTML = `<div class="diag ${d.tipo}"><h3>${esc(d.titulo)}</h3><p>${esc(d.texto)}</p>${d.pontos ? '<ul>' + d.pontos.map(p => `<li>${esc(p)}</li>`).join('') + '</ul>' : ''}</div>`;
    $('kpis').innerHTML = r.kpis.map((k, i) =>
      `<div class="kpi" style="--i:${i}"><div class="name">${esc(k.nome)}</div><div class="val">${esc(k.valor)}</div><div class="note">${esc(k.nota || '')} ${k.selo ? `<span class="badge ${k.selo[0]}">${esc(k.selo[1])}</span>` : ''}</div></div>`).join('');
    $('paineis').innerHTML = renderPaineis(r.paineis);
    $('extra').innerHTML = r.extra || '';
    $('pTitulo').textContent = 'Premissas informadas';
    $('pUrl').textContent = location.host + location.pathname.replace(/app\.html$/, '');
    $('pData').textContent = 'Relatório de ' + new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    $('resumo').innerHTML = c.campos.filter(f => !f.mostrarSe || v[f.mostrarSe]).map(f => {
      const x = v[f.id];
      const txt = f.tipo === 'checkbox' ? (x ? 'Sim' : 'Não') : `${f.prefixo ? f.prefixo + ' ' : ''}${fmt.num(x, 2)}${f.sufixo ? ' ' + f.sufixo : ''}`;
      return `<li><span>${esc(f.rotulo)}</span><b>${esc(txt)}</b></li>`;
    }).join('');
    if (window.Compartilhar) Compartilhar.atualizarBotao(atual.id);
  }

  /* ---------- prompt pronto para colar na IA do usuário ---------- */
  function montaPrompt() {
    const { c, v, r } = ultimo, d = r.diagnostico;
    const valor = f => {
      const x = v[f.id];
      return f.tipo === 'checkbox' ? (x ? 'sim' : 'não') : `${f.prefixo ? f.prefixo + ' ' : ''}${fmt.num(x, 2)}${f.sufixo ? ' ' + f.sufixo : ''}`;
    };
    const premissas = c.campos.filter(f => !f.mostrarSe || v[f.mostrarSe]).map(f => `- ${f.rotulo}: ${valor(f)}`).join('\n');
    const kpis = r.kpis.map(k => `- ${k.nome}: ${k.valor}${k.nota ? ' (' + k.nota + ')' : ''}${k.selo ? ' [' + k.selo[1] + ']' : ''}`).join('\n');
    const leitura = { good: 'saudável', warn: 'atenção', bad: 'crítico' }[d.tipo] || d.tipo;
    const foco = { good: 'como sustentar esse resultado e onde ainda há ganho', warn: 'o que separa esse resultado de um bom resultado', bad: 'o que conter primeiro e o que está causando o problema' }[d.tipo] || 'o que fazer a partir daqui';
    return [
      `Você é um consultor sênior de ${c.categoria}, com experiência em empresas de SaaS e tecnologia. Analise o resultado abaixo, calculado na plataforma Medida, e me oriente.`,
      '',
      `## Calculadora\n${c.nome}: ${c.descricao}`,
      `## Premissas que informei\n${premissas}`,
      `## Resultados\n${kpis || '(sem indicadores: faltam dados)'}`,
      `## Diagnóstico da plataforma (${leitura})\n${d.titulo}. ${d.texto}${d.pontos && d.pontos.length ? '\n' + d.pontos.map(p => '- ' + p).join('\n') : ''}`,
      '',
      '## O que quero de você',
      '1. Interprete o que esses números dizem sobre o meu negócio, sem repetir o que já está acima.',
      `2. Diga ${foco}.`,
      '3. Aponte as 2 ou 3 alavancas de maior impacto e quanto cada uma moveria os indicadores.',
      '4. Monte um plano de ação para os próximos 30 dias, com passos concretos e o que medir em cada um.',
      '5. Liste o que você precisaria saber a mais (dados e contexto) para recomendar com segurança, e me faça essas perguntas.',
      '',
      'Seja direto, use os meus números e deixe claro quando uma conclusão for hipótese. As regras de bolso do diagnóstico são referências, não metas: questione se não se aplicarem ao meu caso.',
    ].join('\n').replace(/\n## /g, '\n\n## ').replace(/\n{3,}/g, '\n\n');
  }
  function abrePrompt() { $('promptTxt').value = montaPrompt(); $('promptModal').hidden = false; $('promptTxt').focus(); $('promptTxt').select(); }
  $('promptBtn').onclick = abrePrompt;
  $('promptFecha').onclick = () => { $('promptModal').hidden = true; };
  $('promptModal').onclick = e => { if (e.target === $('promptModal')) $('promptModal').hidden = true; };
  $('promptCopia').onclick = async () => {
    const b = $('promptCopia'), t = $('promptTxt');
    try { await navigator.clipboard.writeText(t.value); b.textContent = '✓ Copiado'; } catch (e) { t.select(); document.execCommand('copy'); b.textContent = '✓ Copiado'; }
    clearTimeout(b.t); b.t = setTimeout(() => { b.textContent = 'Copiar prompt'; }, 2000);
  };

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
    $('topAuth').hidden = $('authWrap').hidden = !!logado;
    $('shell').hidden = !logado;
    $('authSetup').hidden = Auth.configurado;
    $('auth').hidden = !!logado;
    ['home', 'area', 'calc', 'quadro'].forEach(id => { $(id).hidden = true; });
    menu(false);
    if (!logado) { setModo(location.hash === '#cadastro' ? 'cadastro' : 'entrar'); fechaPaleta(); return; }
    $('user').textContent = logado;

    const mc = location.hash.match(/^#\/calc\/([\w-]+)/);
    const ma = location.hash.match(/^#\/area\/([\w-]+)/);
    const c = mc && porId(mc[1]);
    const a = ma && AREAS.find(x => x.slug === ma[1]);
    const q = /^#\/quadro/.test(location.hash);
    document.querySelector('main.page').classList.toggle('larga', q);
    let crumb = 'Início';
    if (q) {
      $('quadro').hidden = false; Quadro.abrir(); if (window.QuadroSala) QuadroSala.retomar(); marcaNav('quadro'); crumb = 'Quadro branco';
    } else if (c) {
      const ar = areaDe(c);
      $('calc').hidden = false; abrir(c); marcaNav(ar ? ar.slug : 'home');
      crumb = `${ar ? ar.nome + ' / ' : ''}${c.nome}`;
    } else if (a) {
      $('area').hidden = false; paginaArea(a); marcaNav(a.slug); crumb = a.nome;
    } else {
      $('home').hidden = false; home(); marcaNav('home');
    }
    $('crumb').textContent = crumb;
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', rota);

  carregarCalculadoras().then(() => { indexar(); navAreas(); Auth.iniciar(u => { usuario = u; rota(); fechaBoot(); }); })
    .catch(e => { fechaBoot(); document.body.insertAdjacentHTML('afterbegin', `<div class="msg bad">${esc(e.message)}</div>`); });
})();
