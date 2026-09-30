(() => {
registrar({
  id: 'burn-multiple',
  nome: 'Burn multiple',
  categoria: 'Finanças',
  descricao: 'Quanto você queima para cada R$ 1 de receita recorrente nova?',
  campos: [
    { id: 'burn', rotulo: 'Burn líquido do período', prefixo: 'R$', valor: 450000, dica: 'Caixa consumido no período: custos − receita recebida, somado no total.' },
    { id: 'mrrIni', rotulo: 'MRR no início do período', prefixo: 'R$', valor: 100000 },
    { id: 'mrrFim', rotulo: 'MRR no fim do período', prefixo: 'R$', valor: 125000 },
    { id: 'meses', rotulo: 'Meses do período', sufixo: 'meses', valor: 6, dica: 'Duração que o burn e a variação de MRR cobrem.' },
  ],
  calcular(v) {
    const { brl, num } = fmt;
    if (!(v.mrrIni > 0) && !(v.mrrFim > 0)) {
      return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe o MRR no início e no fim do período, e o burn líquido, para calcular o burn multiple.' } };
    }
    const dMrr = v.mrrFim - v.mrrIni;
    const arrNovo = dMrr * 12;
    const burnMes = v.meses > 0 ? v.burn / v.meses : NaN;
    const cascataMrr = { tipo: 'cascata', titulo: 'Do MRR inicial ao final do período', formato: 'brl',
      passos: [{ rotulo: 'MRR início', valor: v.mrrIni, total: true }, { rotulo: 'Variação', valor: dMrr }, { rotulo: 'MRR fim', valor: v.mrrFim, total: true }] };
    const barrasBurn = { tipo: 'barras', titulo: 'Burn contra ARR novo líquido', formato: 'brl', nota: 'ARR novo líquido = variação do MRR × 12, já descontado o churn.',
      dados: [{ rotulo: 'Burn do período', valor: v.burn, tom: 'vazado' }, { rotulo: 'ARR novo líquido', valor: Math.max(0, arrNovo), tom: 'cheio' }], meta: { rotulo: 'Linha de 1x (ARR novo = burn)', valor: v.burn } };

    if (arrNovo <= 0) {
      const semBurn = !(v.burn > 0);
      return {
        paineis: [barrasBurn, cascataMrr],
        kpis: [
          { nome: 'Novo ARR líquido', valor: brl(arrNovo), nota: `(${brl(v.mrrFim)} − ${brl(v.mrrIni)}) × 12` },
          { nome: 'Burn multiple', valor: '—', nota: 'sem ARR líquido novo, não há divisão com sentido', selo: semBurn ? ['warn', 'sem crescimento'] : ['bad', 'queima sem crescer'] },
          { nome: 'Burn líquido do período', valor: brl(v.burn), nota: isFinite(burnMes) ? `${brl(burnMes)} por mês` : 'informe os meses' },
        ],
        diagnostico: {
          tipo: semBurn ? 'warn' : 'bad',
          titulo: semBurn ? 'Sem queima, mas sem crescimento' : 'O burn não está gerando crescimento',
          texto: semBurn
            ? 'O MRR não subiu no período. Não houve queima de caixa, mas também não houve receita recorrente nova líquida.'
            : `Você queimou ${brl(v.burn)} e o MRR ${dMrr < 0 ? 'caiu ' + brl(-dMrr) : 'ficou parado'}. O ARR novo líquido é zero ou negativo, então o caixa foi gasto sem aumentar a receita.`,
          pontos: [
            'O ARR líquido já desconta o churn: o que você vendeu de novo não cobriu o que saiu.',
            'Antes de gastar mais em aquisição, meça o churn e a expansão do período: é mais barato estancar a perda do que vender para compensá-la.',
            ...(v.burn > 0 && isFinite(burnMes) ? [`Cada mês assim consome ${brl(burnMes)} sem mover o MRR.`] : []),
          ],
        },
      };
    }

    if (!(v.burn > 0)) {
      return {
        paineis: [cascataMrr],
        kpis: [
          { nome: 'Novo ARR líquido', valor: brl(arrNovo), nota: `(${brl(v.mrrFim)} − ${brl(v.mrrIni)}) × 12` },
          { nome: 'Burn multiple', valor: num(0, 2) + 'x', nota: 'burn líquido ÷ novo ARR líquido', selo: ['good', 'cresceu sem queimar'] },
        ],
        diagnostico: {
          tipo: 'good',
          titulo: 'Crescimento sem queimar caixa',
          texto: `O MRR subiu ${brl(dMrr)} no período sem consumir caixa. Não há custo de crescimento a comparar.`,
          pontos: ['Com essa eficiência, o limite de crescer é a capacidade de vender e entregar, não o caixa.', 'Se reinvestir parte do caixa em aquisição, acompanhe o burn multiple para ver se a eficiência se mantém.'],
        },
      };
    }

    const mult = v.burn / arrNovo;
    const inv = arrNovo / v.burn;
    const tipo = mult <= 1 ? 'good' : 'warn';
    const burnPorMrr = v.burn / dMrr;
    const pontos = [
      `Você queimou ${brl(v.burn)} para somar ${brl(arrNovo)} de ARR líquido: burn multiple de ${num(mult, 2)}x.`,
      `Ao contrário: cada R$ 1 queimado trouxe R$ ${num(inv, 2)} de ARR novo líquido.`,
      `Cada R$ 1 de MRR novo custou ${brl(burnPorMrr, 2)} de caixa.`,
    ];
    if (mult > 1) {
      pontos.push(`Para chegar a 1x no mesmo burn, o ARR líquido precisaria ser ${brl(v.burn)}, ou seja, o MRR subir ${brl(v.burn / 12)} em vez de ${brl(dMrr)}.`);
      pontos.push('As duas pontas para melhorar: gastar menos para o mesmo crescimento, ou crescer mais com o mesmo gasto (menos churn conta tanto quanto mais vendas).');
    } else {
      pontos.push('Cada real queimado rendeu ao menos um real de ARR novo líquido. Se mantiver o ritmo, dá para aumentar o investimento e acompanhar se o multiple sobe.');
    }
    if (isFinite(burnMes)) pontos.push(`Isso dá ${brl(burnMes)} de burn por mês e ${brl(dMrr / v.meses)} de MRR novo líquido por mês, em ${num(v.meses, 1)} meses.`);

    return {
      paineis: [barrasBurn, cascataMrr],
      kpis: [
        { nome: 'Novo ARR líquido', valor: brl(arrNovo), nota: `(${brl(v.mrrFim)} − ${brl(v.mrrIni)}) × 12` },
        { nome: 'Burn multiple', valor: num(mult, 2) + 'x', nota: 'burn líquido ÷ novo ARR líquido: quanto menor, mais eficiente', selo: mult <= 1 ? ['good', 'ARR novo cobre o burn'] : ['warn', 'queima mais do que cria de ARR'] },
        { nome: 'ARR novo por R$ 1 queimado', valor: brl(inv, 2), nota: 'o inverso do burn multiple' },
        { nome: 'Burn por R$ 1 de MRR novo', valor: brl(burnPorMrr, 2), nota: 'burn ÷ variação do MRR' },
      ],
      diagnostico: {
        tipo,
        titulo: tipo === 'good' ? 'Cada real queimado cria mais de um real de ARR' : 'Você queima mais do que cria de ARR',
        texto: 'Não há faixa oficial a seguir: quanto menor o burn multiple, mais eficiente é o crescimento. A única linha aritmética é 1x, quando o ARR novo líquido iguala o burn. O melhor uso é comparar o período atual com o anterior.',
        pontos,
      },
    };
  },
});
})();
