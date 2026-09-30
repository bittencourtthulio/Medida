(() => {
registrar({
  id: 'runway-e-burn',
  nome: 'Runway e burn',
  categoria: 'Finanças',
  descricao: 'Quantos meses de caixa você tem, em que mês ele acaba e quanto de receita falta para parar de queimar.',
  campos: [
    { id: 'caixa', rotulo: 'Caixa atual', prefixo: 'R$', valor: 400000, dica: 'Saldo disponível em conta e aplicações de resgate imediato.' },
    { id: 'receita', rotulo: 'Receita mensal (recebida)', prefixo: 'R$', valor: 120000, dica: 'O que entra de fato no caixa por mês, não o faturado a receber.' },
    { id: 'custos', rotulo: 'Custos mensais totais', prefixo: 'R$', valor: 160000, dica: 'Folha, infra, marketing, impostos, ferramentas e tudo que sai por mês.' },
  ],
  calcular(v) {
    const { brl, num } = fmt;
    if (!(v.caixa > 0) && !(v.custos > 0)) {
      return {
        kpis: [],
        diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe o caixa atual e os custos mensais para calcular o runway.' },
      };
    }
    const burn = Math.max(0, v.custos - v.receita);
    const lucra = v.custos - v.receita <= 0;
    const sobra = Math.max(0, v.receita - v.custos);

    if (lucra) {
      const crescimento = Array.from({ length: 13 }, (_, t) => ({ x: t, y: v.caixa + sobra * t }));
      return {
        paineis: [
          { tipo: 'linha', titulo: 'Caixa nos próximos 12 meses, se nada mudar', formato: 'brl', eixoX: 'meses', largo: true, series: [{ nome: 'Caixa', pontos: crescimento }] },
          { tipo: 'barras', titulo: 'Receita contra custos, por mês', formato: 'brl', dados: [{ rotulo: 'Receita', valor: v.receita, tom: 'cheio' }, { rotulo: 'Custos', valor: v.custos, tom: 'hachurado' }] },
        ],
        kpis: [
          { nome: 'Burn líquido mensal', valor: brl(0), nota: 'custos − receita, quando positivo', selo: ['good', 'sem queima'] },
          { nome: 'Runway', valor: 'caixa cresce', nota: `sobram ${brl(sobra)} por mês` },
          { nome: 'Caixa em 12 meses', valor: brl(v.caixa + sobra * 12), nota: 'caixa atual + sobra mensal × 12, se nada mudar' },
        ],
        diagnostico: {
          tipo: 'good',
          titulo: 'Seu caixa cresce todo mês',
          texto: 'A receita recebida cobre os custos, então não há prazo de fim do caixa. O risco agora é a receita cair, não o caixa acabar.',
          pontos: [
            `Sobram ${brl(sobra)} por mês, o que leva o caixa de ${brl(v.caixa)} para ${brl(v.caixa + sobra * 12)} em 12 meses, se nada mudar.`,
            v.custos > 0
              ? `Sua receita pode cair ${num((sobra / v.receita) * 100)}% antes de voltar a queimar caixa.`
              : 'Informe os custos mensais para saber quanto a receita pode cair antes de voltar a queimar.',
            'Decida o que fazer com a sobra: reserva, reinvestimento em crescimento ou distribuição.',
          ],
        },
      };
    }

    const runway = v.caixa / burn;
    const meses = Math.floor(runway);
    const fim = new Date();
    fim.setTime(fim.getTime() + runway * 30.4375 * 24 * 3600 * 1000);
    const dataFim = fim.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const tipo = runway >= 12 ? 'good' : runway >= 6 ? 'warn' : 'bad';
    const meta12 = burn * 12;
    const faltaCaixa12 = Math.max(0, meta12 - v.caixa);
    const corteNec = v.custos > 0 ? burn / v.custos : NaN;
    const cortar12 = runway < 12 ? Math.max(0, burn - v.caixa / 12) : 0;

    const pontos = [
      `Você queima ${brl(burn)} por mês (custos ${brl(v.custos)} − receita ${brl(v.receita)}). Com ${brl(v.caixa)} em caixa, isso dá ${fmt.meses(runway)}, até cerca de ${dataFim}.`,
      `Para parar de queimar, faltam ${brl(burn)} de receita mensal, ou cortar o mesmo valor de custos (${num(corteNec * 100)}% dos custos).`,
    ];
    if (runway < 12) {
      pontos.push(`Para chegar a 12 meses sem captar, o burn precisa cair de ${brl(burn)} para ${brl(v.caixa / 12)}: são ${brl(cortar12)} por mês entre corte de custo e receita nova.`);
      pontos.push(`Como regra de bolso, captação ou corte levam meses para dar efeito: comece agora, com ${meses} ${meses === 1 ? 'mês' : 'meses'} de folga.`);
    } else if (runway < 18) {
      pontos.push('Você está dentro da faixa de 12 a 18 meses da regra de bolso. Use esse tempo para aumentar receita antes de precisar captar.');
    } else {
      pontos.push('Você está acima de 18 meses, o topo da regra de bolso. O foco passa a ser converter caixa em crescimento com eficiência.');
    }
    if (v.receita > 0) pontos.push(`Receita adicional de ${brl(burn)} por mês equivale a ${num((burn / v.receita) * 100)}% sobre os ${brl(v.receita)} de hoje.`);

    const ate = Math.min(Math.ceil(runway), 36);
    const pontosCaixa = [];
    for (let t = 0; t <= ate; t++) if (t < runway) pontosCaixa.push({ x: t, y: v.caixa - burn * t });
    if (runway <= 36) pontosCaixa.push({ x: runway, y: 0 });
    return {
      paineis: [
        { tipo: 'linha', titulo: runway > 36 ? 'Caixa nos próximos 36 meses, com o burn de hoje' : 'Caixa mês a mês até zerar, com o burn de hoje', formato: 'brl', eixoX: 'meses', largo: true,
          series: [{ nome: 'Caixa', pontos: pontosCaixa }], marcas: runway <= 36 ? [{ x: runway, y: 0, rotulo: `zera em ${num(runway)} m` }] : [] },
        { tipo: 'barras', titulo: 'Receita contra custos, por mês', formato: 'brl', dados: [{ rotulo: 'Receita', valor: v.receita, tom: 'cheio' }, { rotulo: 'Custos', valor: v.custos, tom: 'hachurado' }],
          nota: `A diferença de ${brl(burn)} por mês é o burn.` },
      ],
      kpis: [
        { nome: 'Burn líquido mensal', valor: brl(burn), nota: 'custos − receita, quando positivo' },
        { nome: 'Runway', valor: fmt.meses(runway), nota: 'caixa ÷ burn líquido', selo: tipo === 'good' ? ['good', 'na regra de bolso (12+ meses)'] : tipo === 'warn' ? ['warn', 'abaixo de 12 meses'] : ['bad', 'abaixo de 6 meses'] },
        { nome: 'Fim estimado do caixa', valor: dataFim, nota: 'a partir de hoje, com burn constante' },
        { nome: 'Receita extra para empatar', valor: brl(burn), nota: 'por mês, sem mexer nos custos' },
        { nome: 'Caixa para 12 meses de runway', valor: faltaCaixa12 > 0 ? brl(faltaCaixa12) : 'já tem', nota: faltaCaixa12 > 0 ? `faltam ${brl(faltaCaixa12)} sobre o caixa de hoje` : `${brl(meta12)} seria o necessário` },
      ],
      diagnostico: {
        tipo,
        titulo: { good: 'Runway confortável', warn: 'Runway abaixo da regra de bolso', bad: 'Runway curto: aja agora' }[tipo],
        texto: 'Regra de bolso de quem capta: manter de 12 a 18 meses de runway. É uma referência de mercado, não uma lei; o que vale é o tempo que você precisa para mudar o rumo.',
        pontos,
      },
    };
  },
});
})();
