(() => {
registrar({
  id: 'precificacao',
  nome: 'Preço do plano e margem',
  categoria: 'Conversão',
  descricao: 'Seu plano paga a margem que você quer? Preço mínimo da mensalidade e margem real do preço atual.',
  campos: [
    { id: 'custo', rotulo: 'Custo por cliente (mês)', prefixo: 'R$', valor: 60, dica: 'Infra, suporte, licenças e tudo que cresce com cada cliente.' },
    { id: 'impostos', rotulo: 'Impostos e taxas sobre a mensalidade', sufixo: '%', valor: 15, max: 100, dica: 'Impostos, gateway, comissão: tudo que é percentual do preço.' },
    { id: 'alvo', rotulo: 'Margem desejada', sufixo: '%', valor: 70, max: 100 },
    { id: 'atual', rotulo: 'Mensalidade praticada hoje', prefixo: 'R$', valor: 297, opcional: true },
  ],
  calcular(v) {
    const { brl, pct } = fmt;
    const imp = v.impostos / 100, alvo = v.alvo / 100;
    const divisor = 1 - imp - alvo;
    if (!(v.custo > 0) || divisor <= 0) {
      return { kpis: [], diagnostico: { tipo: 'bad', titulo: 'Não fecha a conta', texto: divisor <= 0 ? 'Impostos mais margem desejada somam 100% ou mais da mensalidade. Reduza um dos dois.' : 'Informe o custo por cliente.' } };
    }
    const sugerido = v.custo / divisor;
    const markup = sugerido / v.custo - 1;
    const temAtual = v.atual > 0;
    const lucroAtual = v.atual * (1 - imp) - v.custo;
    const margemAtual = temAtual ? lucroAtual / v.atual : NaN;
    const tipo = !temAtual ? 'warn' : margemAtual >= alvo ? 'good' : margemAtual >= 0 ? 'warn' : 'bad';
    const pontos = [`Para ${pct(alvo, 0)} de margem depois de ${pct(imp, 0)} de impostos e taxas, a mensalidade mínima é ${brl(sugerido, 2)} (markup de ${pct(markup, 0)} sobre o custo).`];
    if (temAtual) {
      pontos.push(margemAtual >= alvo
        ? `Sua mensalidade de ${brl(v.atual, 2)} entrega ${pct(margemAtual)} de margem, acima da meta.`
        : `Sua mensalidade de ${brl(v.atual, 2)} entrega ${pct(margemAtual)} de margem. Faltam ${brl(sugerido - v.atual, 2)} por cliente ao mês para a meta.`);
    }
    return {
      kpis: [
        { nome: 'Mensalidade mínima', valor: brl(sugerido, 2), nota: 'custo ÷ (1 − impostos − margem)' },
        { nome: 'Markup necessário', valor: pct(markup, 0), nota: 'acréscimo sobre o custo por cliente' },
        { nome: 'Lucro por cliente', valor: brl(sugerido * alvo, 2), nota: 'por mês, na mensalidade mínima' },
        ...(temAtual ? [
          { nome: 'Margem na mensalidade atual', valor: pct(margemAtual), nota: `lucro de ${brl(lucroAtual, 2)} por cliente ao mês`, selo: tipo === 'good' ? ['good', 'na meta'] : tipo === 'warn' ? ['warn', 'abaixo da meta'] : ['bad', 'prejuízo'] },
        ] : []),
      ],
      diagnostico: {
        tipo,
        titulo: { good: 'Preço na meta', warn: temAtual ? 'Preço abaixo da margem desejada' : 'Mensalidade mínima calculada', bad: 'A mensalidade atual dá prejuízo' }[tipo],
        texto: temAtual ? 'Compara a mensalidade praticada com a margem que você quer ter.' : 'Informe a mensalidade praticada para comparar com a meta.',
        pontos,
      },
    };
  },
});
})();
