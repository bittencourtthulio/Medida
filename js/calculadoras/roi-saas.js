(() => {
registrar({
  id: 'roi-saas',
  nome: 'ROI de aquisição SaaS',
  categoria: 'Aquisição',
  descricao: 'Seu tráfego se paga? CAC, LTV, payback e ROI da aquisição de clientes SaaS, com o veredito.',
  campos: [
    { id: 'invest', rotulo: 'Investimento em tráfego (mês)', prefixo: 'R$', valor: 10000 },
    { id: 'outros', rotulo: 'Outros custos de aquisição (mês)', prefixo: 'R$', valor: 0, dica: 'Comissão, time de vendas, ferramentas, criativos.' },
    { id: 'vendas', rotulo: 'Novos clientes (mês)', valor: 25 },
    { id: 'ticket', rotulo: 'Ticket médio (mensalidade por cliente)', prefixo: 'R$', valor: 497 },
    { id: 'margem', rotulo: 'Margem variável', sufixo: '%', valor: 80, max: 100, dica: 'Receita menos custos que variam por cliente: infra, gateway, impostos e suporte.' },
    { id: 'churn', rotulo: 'Churn mensal', sufixo: '%', valor: 4, max: 100 },
    { id: 'impl', rotulo: 'Cobra implantação (ativação)?', tipo: 'checkbox', valor: false, dica: 'O lucro da implantação abate o CAC.' },
    { id: 'implValor', rotulo: 'Valor da implantação (por cliente)', prefixo: 'R$', valor: 500, mostrarSe: 'impl' },
    { id: 'implMargem', rotulo: 'Margem de lucro da implantação', sufixo: '%', valor: 60, max: 100, mostrarSe: 'impl', dica: 'Valor menos o custo de entregar a implantação.' },
    { id: 'leads', rotulo: 'Leads gerados (mês)', valor: 0, opcional: true, dica: 'Preenchido, mostra CPL e conversão lead → cliente.' },
    { id: 'horizonte', rotulo: 'Horizonte de análise', sufixo: 'meses', valor: 12, max: 60 },
  ],

  calcular(v) {
    const { brl, num, pct } = fmt;
    const margem = v.margem / 100, churn = v.churn / 100;
    const H = Math.min(Math.max(Math.round(v.horizonte) || 12, 1), 60);
    const custoTotal = v.invest + v.outros;
    const implValor = v.impl ? v.implValor : 0;
    const lucroImpl = implValor * (v.implMargem / 100);
    const cacBruto = v.vendas > 0 ? custoTotal / v.vendas : NaN;
    const cac = v.vendas > 0 ? Math.max(0, cacBruto - lucroImpl) : NaN;
    const margemCliente = v.ticket * margem;
    const vida = churn > 0 ? 1 / churn : Infinity;
    const ltv = margemCliente * vida;
    const ltvCac = ltv / cac;
    const paybackSimples = margemCliente > 0 ? cac / margemCliente : NaN;
    const novoMrr = v.vendas * v.ticket;
    const roas = v.invest > 0 ? novoMrr / v.invest : NaN;
    const cacMax = ltv / 3;
    const beClientes = margemCliente + lucroImpl > 0 ? custoTotal / (margemCliente + lucroImpl) : NaN;

    // coorte mês a mês (até 60 meses para achar o break-even)
    const linhas = [];
    const acum0 = -custoTotal + v.vendas * lucroImpl;
    let acum = acum0, ativos = v.vendas, breakEven = acum0 >= 0 ? 0 : NaN, prev = acum;
    for (let t = 1; t <= 60; t++) {
      const mrr = ativos * v.ticket, contrib = mrr * margem;
      prev = acum; acum += contrib;
      if (isNaN(breakEven) && acum >= 0) breakEven = contrib > 0 ? (t - 1) + (0 - prev) / contrib : t;
      linhas.push({ t, ativos, mrr, contrib, acum });
      ativos *= 1 - churn;
    }
    const lucroH = linhas[H - 1].acum;
    const roiH = custoTotal > 0 ? lucroH / custoTotal : NaN;
    const roiVida = custoTotal > 0 && isFinite(ltv) ? (ltv * v.vendas + v.vendas * lucroImpl - custoTotal) / custoTotal : NaN;

    const sLtvCac = !isFinite(ltvCac) ? (ltvCac > 0 ? ['good', 'excelente'] : null)
      : ltvCac >= 3 ? ['good', 'saudável (≥ 3x)'] : ltvCac >= 1 ? ['warn', 'apertado (< 3x)'] : ['bad', 'destrói valor (< 1x)'];
    const sBe = isNaN(breakEven) ? ['bad', 'não paga em 60m']
      : breakEven <= 6 ? ['good', 'rápido'] : breakEven <= 12 ? ['warn', 'ok'] : ['bad', 'lento (> 12m)'];

    const kpis = [];
    kpis.push(lucroImpl > 0
      ? { nome: 'CAC líquido', valor: brl(cac), nota: `CAC bruto ${brl(cacBruto)} − lucro da implantação ${brl(lucroImpl)}` }
      : { nome: 'CAC', valor: brl(cac), nota: `${brl(custoTotal)} ÷ ${num(v.vendas)} clientes` });
    if (lucroImpl > 0) kpis.push({ nome: 'Lucro total da implantação', valor: brl(lucroImpl * v.vendas), nota: `${num(v.vendas)} clientes × ${brl(lucroImpl)}` });
    kpis.push(
      { nome: 'LTV (margem)', valor: isFinite(ltv) ? brl(ltv) : '∞', nota: `vida útil média: ${isFinite(vida) ? num(vida) + ' meses' : 'sem churn'}` },
      { nome: 'LTV / CAC', valor: isFinite(ltvCac) ? num(ltvCac, 2) + 'x' : '∞', nota: 'regra de bolso: 3x ou mais', selo: sLtvCac },
      { nome: 'Break-even da coorte', valor: isNaN(breakEven) ? '—' : fmt.meses(breakEven), nota: 'considera o churn mês a mês', selo: sBe },
      { nome: 'Payback do CAC (simples)', valor: isNaN(paybackSimples) ? '—' : fmt.meses(paybackSimples), nota: 'CAC líquido ÷ margem mensal por cliente, sem churn' },
      { nome: `ROI em ${H} meses`, valor: pct(roiH), nota: `lucro acumulado ${brl(lucroH)}`, selo: isNaN(roiH) ? null : roiH >= 0 ? ['good', 'positivo'] : ['bad', 'negativo'] },
      { nome: 'ROI no LTV (vida toda)', valor: pct(roiVida), nota: 'retorno total da coorte sobre o custo' },
      { nome: 'Novo MRR gerado', valor: brl(novoMrr), nota: `ARR: ${brl(novoMrr * 12)}` },
      { nome: 'ROAS (1º mês)', valor: isNaN(roas) ? '—' : num(roas, 2) + 'x', nota: 'novo MRR ÷ investimento em tráfego' },
      { nome: 'CAC máximo p/ LTV/CAC 3x', valor: isFinite(cacMax) ? brl(cacMax) : '∞', nota: 'teto de CAC para manter a operação saudável' },
      { nome: 'Clientes p/ pagar o custo no mês 1', valor: isNaN(beClientes) ? '—' : num(beClientes), nota: 'ponto de equilíbrio do primeiro mês' });
    if (v.leads > 0) kpis.push(
      { nome: 'CPL', valor: brl(v.invest / v.leads), nota: `${num(v.leads, 0)} leads no mês` },
      { nome: 'Conversão lead → cliente', valor: pct(v.vendas / v.leads), nota: `${num(v.vendas)} vendas` });

    // diagnóstico
    let diagnostico;
    if (!(v.vendas > 0) || !(custoTotal > 0)) {
      diagnostico = { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe o investimento e o número de novos clientes para ver o diagnóstico.' };
    } else {
      const tipo = (ltvCac < 1 || isNaN(breakEven)) ? 'bad' : (ltvCac < 3 || breakEven > 12) ? 'warn' : 'good';
      const pontos = [];
      pontos.push(isFinite(ltvCac)
        ? `Cada R$ 1 investido em aquisição devolve ${brl(ltvCac, 2).replace('R$', '').trim()} de margem ao longo da vida do cliente (LTV/CAC de ${num(ltvCac, 2)}x).`
        : 'Sem churn informado, o LTV é infinito; use um churn realista para uma leitura confiável.');
      pontos.push(isNaN(breakEven)
        ? 'A coorte não recupera o investimento em 60 meses.'
        : `O investimento volta em ${fmt.meses(breakEven)}${breakEven > 12 ? ', o que prende caixa por tempo demais' : ''}.`);
      if (isFinite(cacMax) && cac > cacMax) pontos.push(`Para chegar a 3x, o CAC precisa cair de ${brl(cac)} para ${brl(cacMax)}.`);
      if (churn > 0 && churn >= 0.03) {
        pontos.push(`Alavanca mais forte: cortar o churn de ${num(v.churn)}% para ${num(v.churn / 2)}% levaria o LTV/CAC para ${num(ltvCac * 2, 2)}x.`);
      }
      if (tipo === 'good') pontos.push('Há espaço para escalar o investimento mantendo o retorno, desde que o CAC não suba junto.');
      const titulos = { good: 'Operação saudável', warn: 'Dá retorno, mas está apertada', bad: 'A aquisição está destruindo valor' };
      const textos = {
        good: 'Os números sustentam crescimento: o cliente paga o custo de aquisição com folga.',
        warn: 'A operação se paga, mas com pouca margem de erro. Pequenas quedas na conversão ou altas no churn viram prejuízo.',
        bad: 'Do jeito que está, cada cliente novo custa mais do que devolve. Escalar só aumenta o prejuízo.',
      };
      diagnostico = { tipo, titulo: titulos[tipo], texto: textos[tipo], pontos };
    }

    return { kpis, diagnostico, extra: grafico(acum0, linhas, H, breakEven) + tabela(linhas, H) };
  },
});

function grafico(acum0, linhas, H, breakEven) {
  const { brl, num } = fmt;
  const W = 640, Hh = 240, m = { l: 64, r: 12, t: 12, b: 28 };
  const pts = [{ t: 0, acum: acum0 }, ...linhas.slice(0, H)];
  const ys = pts.map(p => p.acum);
  let min = Math.min(...ys, 0), max = Math.max(...ys, 0);
  if (min === max) max = min + 1;
  const x = t => m.l + (t / H) * (W - m.l - m.r);
  const y = v => m.t + (1 - (v - min) / (max - min)) * (Hh - m.t - m.b);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.acum).toFixed(1)}`).join(' ');
  const ticks = [min, min + (max - min) / 2, max].map(v =>
    `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${m.l - 6}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="var(--mute)">${brl(v)}</text>`).join('');
  const passo = Math.max(1, Math.ceil(H / 12));
  const xl = pts.filter(p => p.t % passo === 0).map(p =>
    `<text x="${x(p.t)}" y="${Hh - 8}" text-anchor="middle" font-size="11" fill="var(--mute)">${p.t}</text>`).join('');
  const be = (!isNaN(breakEven) && breakEven <= H)
    ? `<circle cx="${x(breakEven)}" cy="${y(0)}" r="5" fill="var(--ink)"/><text x="${x(breakEven)}" y="${y(0) - 10}" text-anchor="middle" font-size="11" font-weight="700" fill="var(--ink)">break-even ${num(breakEven)}m</text>` : '';
  return `<section class="card"><h2>Lucro acumulado da coorte (líquido do investimento)</h2>
    <svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Lucro acumulado por mês">${ticks}
    <line x1="${m.l}" x2="${W - m.r}" y1="${y(0)}" y2="${y(0)}" stroke="var(--mute)" stroke-dasharray="4 3"/>
    <path d="${path}" fill="none" stroke="var(--ink)" stroke-width="3"/>${be}${xl}</svg></section>`;
}

function tabela(linhas, H) {
  const { brl, num } = fmt;
  const corpo = linhas.slice(0, H).map(l =>
    `<tr><td>${l.t}</td><td>${num(l.ativos)}</td><td>${brl(l.mrr)}</td><td>${brl(l.contrib)}</td><td class="${l.acum >= 0 ? 'pos' : 'neg'}">${brl(l.acum)}</td></tr>`).join('');
  return `<section class="card"><h2>Mês a mês</h2><div class="scroll"><table>
    <tr><th>Mês</th><th>Clientes ativos</th><th>MRR</th><th>Margem</th><th>Acumulado</th></tr>${corpo}</table></div></section>`;
}
})();
