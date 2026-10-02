/* PageHeader: cabeçalho do .main (menu, breadcrumb, busca, usuário e tema). Sem dependências. */
(function () {
  const KEY = 'medida-theme'; // 'light' | 'dark' | ausente = sistema
  const mq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
  const root = document.documentElement;

  function lido() { try { const v = localStorage.getItem(KEY); return v === 'light' || v === 'dark' ? v : 'system'; } catch (e) { return 'system'; } }
  function efetivo(pref) { return pref === 'system' ? (mq && mq.matches ? 'dark' : 'light') : pref; }
  function aplica(pref) {
    if (pref === 'system') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', pref);
    sincroniza();
  }
  function atual() { return root.getAttribute('data-theme') || efetivo('system'); }

  const SOL = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6"/></svg>';
  const LUA = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/></svg>';

  function sincroniza() {
    const b = document.querySelector('.page-header__theme');
    if (!b) return;
    const escuro = atual() === 'dark';
    b.setAttribute('aria-pressed', escuro ? 'true' : 'false');
    b.innerHTML = escuro ? SOL : LUA; // mostra o destino da troca
    b.title = escuro ? 'Mudar para o modo claro' : 'Mudar para o modo escuro';
  }

  // boot: aplica o tema salvo; acompanha o sistema só enquanto não houver escolha manual
  aplica(lido());
  if (mq) {
    const onSys = () => { if (lido() === 'system') sincroniza(); };
    mq.addEventListener ? mq.addEventListener('change', onSys) : mq.addListener(onSys);
  }

  function alterna() {
    const prox = atual() === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(KEY, prox); } catch (e) {}
    aplica(prox);
  }

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Monta o header. O breadcrumb (#crumb) e os botões #menu/#abrirBusca2 são recriados com os mesmos ids.
  // opts: { user: {nome, email}, onSignOut, onMenu, onSearch, container }
  function initPageHeader(opts) {
    opts = opts || {};
    const el = opts.container || document.getElementById('pageHeader');
    if (!el) return;
    const crumb = el.querySelector('#crumb');
    const texto = crumb ? crumb.textContent : '';
    const u = opts.user || {};
    const nome = u.nome || u.email || '';
    el.innerHTML =
      '<button class="btn ghost sm page-header__menu" id="menu" type="button" aria-label="Abrir menu">Menu</button>' +
      '<span class="crumb page-header__crumb" id="crumb"></span>' +
      '<button class="btn ghost sm" id="abrirBusca2" type="button">Buscar</button>' +
      '<div class="page-header__user">' +
        '<span class="page-header__badge" title="' + esc(u.email || nome) + '" aria-hidden="true">' + esc(nome.trim().charAt(0).toUpperCase() || '·') + '</span>' +
        '<span class="page-header__name">' + esc(nome) + '</span>' +
        '<button class="btn ghost sm page-header__out" type="button">Sair</button>' +
        '<button class="page-header__theme" type="button" aria-label="Alternar tema" aria-pressed="false"></button>' +
      '</div>';
    el.querySelector('#crumb').textContent = texto;
    el.querySelector('.page-header__theme').onclick = alterna;
    el.querySelector('.page-header__out').onclick = () => { if (opts.onSignOut) opts.onSignOut(); };
    if (opts.onMenu) el.querySelector('#menu').onclick = opts.onMenu;
    if (opts.onSearch) el.querySelector('#abrirBusca2').onclick = opts.onSearch;
    sincroniza();
  }

  window.initPageHeader = initPageHeader;
})();
