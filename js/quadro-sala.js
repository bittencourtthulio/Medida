// Painel "Tablet e turma" do quadro: abre a sala ao vivo, mostra o QR code do tablet e o link da turma.
const $ = id => document.getElementById(id);
let sessao = null, parar = null, abrindo = null;

const qr = url => { const q = qrcode(0, 'M'); q.addData(url); q.make(); return q.createSvgTag(4, 2); };
const msg = t => { $('qsStatus').textContent = t; $('qsStatus').hidden = !t; };

async function iniciar() {
  if (sessao) return;
  if (abrindo) return abrindo;
  abrindo = (async () => {
    msg('Conectando…'); $('qsCorpo').hidden = true;
    try {
      if (!Sala.disponivel) throw new Error('Sala ao vivo não configurada (databaseURL em js/config.js).');
      sessao = await Sala.abrir();
    } catch (e) { msg(e.message); return; }
    const l = Sala.links(sessao);
    $('qsTabletQr').innerHTML = qr(l.tablet);
    $('qsTabletLink').value = l.tablet;
    $('qsTurmaLink').value = l.turma;
    Quadro.aoMudar = est => Sala.publicar(sessao, est);
    Quadro.aoVista = v => Sala.publicarVista(sessao, v);
    parar = Sala.ouvirTablet(sessao, (id, t) => { try { Quadro.addTraco(id, { p: JSON.parse(t.p), w: t.w, cor: t.cor, pagina: t.pagina }); } catch (e) { /* traço inválido */ } }, id => Quadro.delTraco(id));
    Quadro.aoApagar = ids => ids.forEach(id => Sala.apagarTraco(sessao, id));
    const parar2 = Sala.ouvirApagar(sessao, v => { try { const p = JSON.parse(v.p); for (let i = 0; i < p.length; i += 2) Quadro.apagaTraco(p[i], p[i + 1], v.r, v.pagina || Quadro.primeiraPagina()); } catch (e) { /* comando inválido */ } });
    const parar1 = parar; parar = () => { parar1(); parar2(); };
    Sala.publicar(sessao, Quadro.estado());
    Sala.publicarVista(sessao, Quadro.vista());
    msg(''); $('qsCorpo').hidden = false;
    $('qSalaBtn').textContent = '📱 Ao vivo';
  })();
  await abrindo; abrindo = null;
}

async function encerrar() {
  if (!sessao) return;
  if (parar) parar();
  Quadro.aoMudar = Quadro.aoVista = Quadro.aoApagar = null;
  await Sala.encerrar(sessao);
  sessao = parar = null;
  $('qsCorpo').hidden = true; $('qSala').hidden = true;
  $('qSalaBtn').textContent = '📱 Tablet e turma';
}

$('qSalaBtn').onclick = () => { $('qSala').hidden = !$('qSala').hidden; if (!$('qSala').hidden) iniciar(); };
$('qsFechar').onclick = () => { $('qSala').hidden = true; };
$('qsEncerrar').onclick = () => { if (confirm('Encerrar a sessão? Os links deixam de funcionar.')) encerrar(); };
document.querySelectorAll('[data-copia]').forEach(b => {
  b.onclick = async () => {
    const el = $(b.dataset.copia);
    try { await navigator.clipboard.writeText(el.value); b.textContent = '✓ Copiado'; } catch (e) { el.select(); b.textContent = 'Ctrl+C'; }
    setTimeout(() => { b.textContent = 'Copiar'; }, 1800);
  };
});

// ao voltar para o quadro com uma sessão já aberta neste navegador, retoma sem abrir o painel
window.QuadroSala = { retomar() { if (Sala.disponivel && Sala.salva() && !sessao) iniciar(); } };
