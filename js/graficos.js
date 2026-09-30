// Biblioteca de painéis do dashboard (preto e branco). As calculadoras só descrevem os dados;
// aqui eles viram gráficos. Tipos: barras, composicao, funil, linha, cascata, tabela.
// Quem distingue as séries é a forma (cheio, hachurado, pontilhado, vazado), nunca a cor.
(function () {
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const F = {
    brl: v => fmt.brl(v), brl2: v => fmt.brl(v, 2), num: v => fmt.num(v), int: v => fmt.num(v, 0),
    pct: v => fmt.pct(v), x: v => fmt.num(v, 2) + 'x', mes: v => fmt.num(v) + ' m', sem: v => fmt.num(v) + ' sem', h: v => fmt.num(v) + ' h',
  };
  const f = nome => F[nome] || F.num;
  const TONS = ['cheio', 'hachurado', 'pontilhado', 'vazado', 'cinza'];
  const tom = (d, i) => d.tom || TONS[i % TONS.length];

  // número curto para eixos: 1,2 mi · 35 mil
  function curto(nome, v) {
    const pre = nome === 'brl' || nome === 'brl2' ? 'R$ ' : '';
    const a = Math.abs(v), s = v < 0 ? '−' : '';
    if (nome === 'pct') return fmt.pct(v, 0);
    if (a >= 1e6) return `${s}${pre}${fmt.num(a / 1e6, 1)} mi`;
    if (a >= 1e3) return `${s}${pre}${fmt.num(a / 1e3, a >= 1e4 ? 0 : 1)} mil`;
    return `${s}${pre}${fmt.num(a, a < 10 ? 1 : 0)}`;
  }

  function barras(p) {
    const fm = f(p.formato);
    const max = Math.max(...p.dados.map(d => Math.abs(d.valor)), p.meta ? Math.abs(p.meta.valor) : 0, 1e-9);
    const meta = p.meta ? `<u class="meta" style="left:${(Math.abs(p.meta.valor) / max * 100).toFixed(1)}%"></u>` : '';
    return '<div class="bars">' + p.dados.map((d, i) =>
      `<div class="br"><span class="bl">${esc(d.rotulo)}</span><div class="bt"><i class="b ${d.tom || (i === 0 ? 'cheio' : 'hachurado')}" style="width:${Math.max(1.5, Math.abs(d.valor) / max * 100).toFixed(1)}%"></i>${meta}</div><b class="bv">${esc(fm(d.valor))}</b></div>`).join('') +
      (p.meta ? `<div class="bleg"><u class="meta inl"></u> ${esc(p.meta.rotulo)}: ${esc(fm(p.meta.valor))}</div>` : '') + '</div>';
  }

  function composicao(p) {
    const fm = f(p.formato);
    const tot = p.partes.reduce((s, x) => s + Math.max(0, x.valor), 0) || 1;
    return '<div class="comp-bar">' + p.partes.map((x, i) => `<i class="seg ${tom(x, i)}" style="flex:${Math.max(0, x.valor) / tot}" title="${esc(x.rotulo)}"></i>`).join('') + '</div>' +
      '<ul class="leg">' + p.partes.map((x, i) => `<li><i class="sw ${tom(x, i)}"></i><span>${esc(x.rotulo)}</span><b>${esc(fm(x.valor))}</b><small>${fmt.pct(Math.max(0, x.valor) / tot, 0)}</small></li>`).join('') + '</ul>';
  }

  function funil(p) {
    const fm = f(p.formato);
    const max = Math.max(...p.etapas.map(e => e.valor), 1e-9);
    return '<div class="fun">' + p.etapas.map((e, i) => {
      const ant = i ? p.etapas[i - 1].valor : 0;
      const conv = i && ant > 0 ? `<div class="fc">${esc(fmt.pct(e.valor / ant))} avançam</div>` : '';
      return conv + `<div class="fr"><span class="fl">${esc(e.rotulo)}</span><div class="ft"><i class="b ${i === p.etapas.length - 1 ? 'cheio' : 'hachurado'}" style="width:${Math.max(3, e.valor / max * 100).toFixed(1)}%"></i></div><b class="bv">${esc(fm(e.valor))}</b></div>`;
    }).join('') + '</div>';
  }

  function linha(p) {
    const W = 640, H = 270, m = { l: 62, r: 16, t: 14, b: 32 };
    const pts = p.series.flatMap(s => s.pontos);
    const xs = pts.map(q => q.x), ys = pts.map(q => q.y);
    let x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    if (p.linhaZero !== false) { y0 = Math.min(y0, 0); y1 = Math.max(y1, 0); }
    if (y0 === y1) y1 = y0 + 1; if (x0 === x1) x1 = x0 + 1;
    const X = v => m.l + (v - x0) / (x1 - x0) * (W - m.l - m.r);
    const Y = v => m.t + (1 - (v - y0) / (y1 - y0)) * (H - m.t - m.b);
    const grade = [0, 1, 2, 3].map(i => y0 + (y1 - y0) * i / 3).map(v =>
      `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" class="gl"/><text x="${m.l - 8}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end" class="ax">${esc(curto(p.formato, v))}</text>`).join('');
    const passo = Math.max(1, Math.ceil((x1 - x0) / 8));
    const eixoX = []; for (let v = Math.ceil(x0); v <= x1; v += passo) eixoX.push(`<text x="${X(v).toFixed(1)}" y="${H - 10}" text-anchor="middle" class="ax">${esc(v)}</text>`);
    const zero = (p.linhaZero !== false && y0 < 0 && y1 > 0) ? `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(0).toFixed(1)}" y2="${Y(0).toFixed(1)}" class="zl"/>` : '';
    const ESTILOS = ['', 'dash', 'dot'];
    const caminhos = p.series.map((s, i) => `<path class="ln ${ESTILOS[i % 3]}" d="${s.pontos.map((q, k) => (k ? 'L' : 'M') + X(q.x).toFixed(1) + ',' + Y(q.y).toFixed(1)).join(' ')}"/>`).join('');
    const marcas = (p.marcas || []).map(q => `<circle cx="${X(q.x).toFixed(1)}" cy="${Y(q.y).toFixed(1)}" r="5.5" class="mk"/>` + (q.rotulo ? `<text x="${X(q.x).toFixed(1)}" y="${(Y(q.y) - 12).toFixed(1)}" text-anchor="middle" class="mt">${esc(q.rotulo)}</text>` : '')).join('');
    const leg = p.series.length > 1 ? '<ul class="leg h">' + p.series.map((s, i) => `<li><svg width="30" height="8" aria-hidden="true"><line x1="0" x2="30" y1="4" y2="4" class="ln ${ESTILOS[i % 3]}" style="stroke-width:3"/></svg><span>${esc(s.nome)}</span></li>`).join('') + '</ul>' : '';
    return leg + `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(p.titulo || 'Gráfico')}">${grade}${zero}${eixoX.join('')}${caminhos}${marcas}</svg>` +
      (p.eixoX ? `<div class="eixo-x">${esc(p.eixoX)}</div>` : '');
  }

  function cascata(p) {
    const fm = f(p.formato);
    let run = 0; const barras = p.passos.map(s => { const ini = s.total ? 0 : run; const fim = s.total ? s.valor : run + s.valor; run = fim; return { ...s, ini, fim }; });
    const W = 640, H = 270, m = { l: 12, r: 12, t: 26, b: 44 };
    const y0 = Math.min(0, ...barras.flatMap(b => [b.ini, b.fim])), y1 = Math.max(0, ...barras.flatMap(b => [b.ini, b.fim])) || 1;
    const Y = v => m.t + (1 - (v - y0) / ((y1 - y0) || 1)) * (H - m.t - m.b);
    const n = barras.length, larg = (W - m.l - m.r) / n, bw = Math.min(70, larg * 0.62);
    const corpo = barras.map((b, i) => {
      const cx = m.l + larg * i + larg / 2, top = Y(Math.max(b.ini, b.fim)), h = Math.max(2, Math.abs(Y(b.ini) - Y(b.fim)));
      const cls = b.total ? 'cheio' : b.valor >= 0 ? 'hachurado' : 'vazado';
      const rot = String(b.rotulo).length > 13 ? String(b.rotulo).slice(0, 12) + '…' : b.rotulo;
      const con = i < n - 1 ? `<line x1="${(cx + bw / 2).toFixed(1)}" x2="${(cx + larg - bw / 2).toFixed(1)}" y1="${Y(b.fim).toFixed(1)}" y2="${Y(b.fim).toFixed(1)}" class="cn"/>` : '';
      return `<rect x="${(cx - bw / 2).toFixed(1)}" y="${top.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" class="cb ${cls}" rx="3"/>${con}` +
        `<text x="${cx.toFixed(1)}" y="${(top - 7).toFixed(1)}" text-anchor="middle" class="mt">${esc((b.valor > 0 && !b.total ? '+' : '') + fm(b.valor))}</text>` +
        `<text x="${cx.toFixed(1)}" y="${H - 18}" text-anchor="middle" class="ax">${esc(rot)}</text>`;
    }).join('');
    const z = y0 < 0 ? `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(0).toFixed(1)}" y2="${Y(0).toFixed(1)}" class="zl"/>` : '';
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(p.titulo || 'Gráfico')}">${z}${corpo}</svg>`;
  }

  function tabela(p) {
    const cel = c => (c && typeof c === 'object') ? `<td class="${c.tom || ''}">${esc(c.v)}</td>` : `<td>${esc(c)}</td>`;
    return `<div class="tw"><table><thead><tr>${p.colunas.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${p.linhas.map(l => '<tr>' + l.map(cel).join('') + '</tr>').join('')}</tbody></table></div>`;
  }

  const R = { barras, composicao, funil, linha, cascata, tabela };
  window.TIPOS_PAINEL = Object.keys(R);
  window.renderPaineis = ps => (ps || []).map(p => {
    const fn = R[p.tipo];
    if (!fn) return '';
    const largo = p.largo != null ? p.largo : (p.tipo === 'tabela');
    return `<section class="pc${largo ? ' largo' : ''}"><h2>${esc(p.titulo || '')}</h2>${p.nota ? `<p class="pn">${esc(p.nota)}</p>` : ''}${fn(p)}</section>`;
  }).join('');
})();
