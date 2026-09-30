(() => {
registrar({
  id: 'projecao-mrr',
  nome: 'Projeção de MRR',
  categoria: 'Finanças',
  descricao: 'Onde seu MRR estará em 12 meses, e para que valor ele converge com o novo MRR e o churn de hoje?',
  campos: [
    { id: 'mrr', rotulo: 'MRR atual', prefixo: 'R$', valor: 50000 },
    { id: 'novo', rotulo: 'Novo MRR por mês', prefixo: 'R$', valor: 6000, dica: 'Novos clientes por mês × ticket médio.' },
    { id: 'churn', rotulo: 'Churn mensal do MRR', sufixo: '%', valor: 3, max: 100, dica: '% do MRR que sai por mês com cancelamentos e downgrades.' },
    { id: 'exp', rotulo: 'Expansão mensal do MRR', sufixo: '%', valor: 1, max: 100, opcional: true, dica: 'Upgrades e vendas adicionais, como % do MRR. Deixe 0 se não souber.' },
  ],
  calcular(v) {
    const { brl, num, pct } = fmt;
    if (!(v.mrr > 0) && !(v.novo > 0)) {
      return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe o MRR atual e o novo MRR por mês para projetar.' } };
    }
    const ch = v.churn / 100, ex = v.exp / 100;
    const linhas = [];
    let m = v.mrr;
    for (let t = 1; t <= 12; t++) {
      const sai = m * ch, expande = m * ex;
      const fim = Math.max(0, m - sai + expande + v.novo);
      linhas.push({ t, novo: v.novo, expande, sai, fim });
      m = fim;
    }
    const m6 = linhas[5].fim, m12 = linhas[11].fim;
    const cresc = v.mrr > 0 ? m12 / v.mrr - 1 : NaN;
    const liquido = ch - ex;
    const temTeto = liquido > 0;
    const teto = temTeto ? v.novo / liquido : NaN;
    const churnRs = v.mrr * ch, expRs = v.mrr * ex;
    const saldoHoje = v.novo + expRs - churnRs;
    const tipo = m12 < v.mrr ? 'bad' : temTeto ? 'warn' : 'good';

    const pontos = [
      `Hoje entram ${brl(v.novo)}${ex > 0 ? ' + ' + brl(expRs) + ' de expansão' : ''} e saem ${brl(churnRs)} de churn por mês: o saldo é ${saldoHoje >= 0 ? '+' : '−'}${brl(Math.abs(saldoHoje))}.`,
    ];
    if (temTeto) {
      pontos.push(`O MRR converge para ${brl(teto)} (novo MRR ÷ (churn − expansão)). Em 12 meses você chega a ${brl(m12)}, ${num((m12 / teto) * 100)}% desse teto.`);
      if (v.mrr > teto) pontos.push(`Seu MRR atual já está acima do teto: sem aumentar o novo MRR ou cortar o churn, ele tende a cair para ${brl(teto)}.`);
      if (liquido > 0.01) {
        const teto2 = v.novo / (liquido - 0.01);
        pontos.push(`Reduzir o churn em 1 ponto (de ${num(v.churn)}% para ${num(v.churn - 1)}%) sobe o teto de ${brl(teto)} para ${brl(teto2)}.`);
      } else {
        pontos.push(`Reduzir o churn para ${num(v.exp)}% ou menos elimina o teto: o MRR passa a crescer sem limite.`);
      }
      pontos.push(`Dobrar o novo MRR para ${brl(v.novo * 2)} dobra o teto para ${brl(teto * 2)}.`);
    } else {
      pontos.push('A expansão cobre o churn, então não há teto: cada novo real de MRR se soma à base.');
      pontos.push('Cuidado: essa conta supõe que a expansão se mantém. Se ela cair, o churn volta a limitar o crescimento.');
    }
    if (m12 < v.mrr) pontos.push(`Em 12 meses o MRR cai ${brl(v.mrr - m12)}: o que entra não repõe o que sai. Comece pelo churn.`);

    const titulo = {
      good: 'O MRR cresce sem teto',
      warn: 'O MRR cresce, mas converge para um teto',
      bad: 'O novo MRR não compensa o churn',
    }[tipo];
    const texto = {
      good: `Novo MRR e expansão superam o churn. Em 12 meses o MRR vai de ${brl(v.mrr)} para ${brl(m12)}.`,
      warn: `O novo MRR por mês compensa o churn hoje, mas o churn cresce junto com a base e o MRR tende a ${brl(teto)}. Crescer além disso exige mais novo MRR ou menos churn.`,
      bad: `Com ${num(v.churn)}% de churn, o MRR perde mais do que o novo MRR repõe${temTeto ? ` e tende a ${brl(teto)}` : ''}.`,
    }[tipo];

    return {
      kpis: [
        { nome: 'MRR em 6 meses', valor: brl(m6), nota: 'projeção mês a mês' },
        { nome: 'MRR em 12 meses', valor: brl(m12), nota: 'projeção mês a mês', selo: m12 >= v.mrr ? ['good', 'cresce'] : ['bad', 'cai'] },
        { nome: 'ARR projetado', valor: brl(m12 * 12), nota: 'MRR em 12 meses × 12' },
        { nome: 'Crescimento em 12 meses', valor: pct(cresc), nota: `de ${brl(v.mrr)} para ${brl(m12)}` },
        { nome: 'MRR de equilíbrio', valor: temTeto ? brl(teto) : 'sem teto', nota: temTeto ? 'onde novo + expansão = churn' : 'expansão ≥ churn: o MRR não trava' },
      ],
      diagnostico: { tipo, titulo, texto, pontos },
      extra: tabelaProjecaoMrr(linhas, v.mrr),
    };
  },
});

function tabelaProjecaoMrr(linhas, mrr0) {
  const { brl } = fmt;
  const corpo = linhas.map(l =>
    `<tr><td>${l.t}</td><td>${brl(l.novo)}</td><td>${brl(l.expande)}</td><td class="neg">${brl(l.sai)}</td><td>${brl(l.fim)}</td></tr>`).join('');
  return `<section class="card"><h2>Mês a mês (MRR atual ${brl(mrr0)})</h2><div class="scroll"><table>
    <tr><th>Mês</th><th>Novo MRR</th><th>Expansão</th><th>Churn</th><th>MRR no fim</th></tr>${corpo}</table></div></section>`;
}
})();
