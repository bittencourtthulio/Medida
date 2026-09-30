(() => {
registrar({
  id: 'expansao-por-upsell',
  nome: 'Expansão por upsell',
  categoria: 'Retenção e Expansão',
  descricao: 'O upsell compensa? Compare o custo de vender um add-on com o retorno que ele devolve em margem.',
  termos: 'upsell cross-sell add-on addon módulo adicional expansão de receita vender mais para a base compensa ltv do add-on cac do upsell payback upsell mrr de expansão plano superior',
  campos: [
    { id: 'base', rotulo: 'Clientes na base', valor: 400 },
    { id: 'pctCompra', rotulo: 'Clientes que compram o add-on', sufixo: '%', valor: 15, max: 100 },
    { id: 'receita', rotulo: 'Receita mensal do add-on por cliente', prefixo: 'R$', valor: 89 },
    { id: 'custoVenda', rotulo: 'Custo de vender por cliente convertido', prefixo: 'R$', valor: 150, dica: 'Tempo de CS/vendas, comissão e campanhas, dividido pelos clientes que converteram.' },
    { id: 'margem', rotulo: 'Margem do add-on', sufixo: '%', valor: 70, max: 100 },
    { id: 'churn', rotulo: 'Churn mensal do add-on', sufixo: '%', valor: 2, max: 100, dica: '0 = não informado.' },
    { id: 'mrrBase', rotulo: 'MRR atual da empresa, sem o add-on', prefixo: 'R$', valor: 120000, opcional: true, dica: '0 = não informado.' },
  ],
  calcular(v) {
    const { brl, num, pct } = fmt;
    if (!(v.base > 0) || !(v.pctCompra > 0) || !(v.receita > 0)) return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe a base de clientes, o percentual que compra o add-on e a receita mensal dele.' } };
    const conv = v.base * v.pctCompra / 100;
    const mrrExp = conv * v.receita;
    const temMrr = v.mrrBase > 0;
    const parte = temMrr ? mrrExp / (v.mrrBase + mrrExp) : NaN;
    const margemMes = v.receita * v.margem / 100;
    const cac = v.custoVenda;
    const payback = margemMes > 0 ? cac / margemMes : Infinity;
    const c = v.churn / 100;
    const ltv = c > 0 ? margemMes / c : Infinity;
    const razao = isFinite(ltv) ? (cac > 0 ? ltv / cac : Infinity) : NaN;
    const margem12 = margemMes * 12;
    let tipo;
    if (margemMes <= 0) tipo = 'bad';
    else if (isFinite(razao)) tipo = razao >= 3 ? 'good' : razao >= 1 ? 'warn' : 'bad';
    else tipo = payback <= 12 ? 'good' : 'warn';
    const custoTotal = conv * cac;
    const pontos = [
      `${num(conv, 0)} clientes compram o add-on e somam ${brl(mrrExp)} de MRR de expansão${temMrr ? `, ${pct(parte)} do MRR total` : ''}.`,
      isFinite(payback) ? `Cada venda custa ${brl(cac)} e devolve ${brl(margemMes)} de margem por mês: o custo volta em ${num(payback)} meses.` : 'Com margem zero, o custo de venda nunca volta.',
    ];
    if (isFinite(ltv)) pontos.push(`Com churn de ${num(v.churn, 1)}% ao mês, o add-on vale ${brl(ltv)} de margem por cliente ao longo da vida, ${num(razao, 1)}x o custo de vender.`);
    else pontos.push(`Sem churn informado o LTV não se calcula; em 12 meses o add-on devolve ${brl(margem12)} de margem por cliente contra ${brl(cac)} de custo.`);
    pontos.push(`O programa inteiro custa ${brl(custoTotal)} para converter ${num(conv, 0)} clientes.`);
    if (tipo === 'bad' && margemMes > 0) pontos.push(`Para chegar a 3x, o custo de vender teria de cair para ${brl(ltv / 3)} por cliente ou a margem subir.`);
    return {
      kpis: [
        { nome: 'MRR de expansão', valor: brl(mrrExp), nota: 'clientes convertidos × receita do add-on', selo: tipo === 'good' ? ['good', 'compensa'] : tipo === 'warn' ? ['warn', 'retorno curto'] : ['bad', 'não compensa'] },
        { nome: '% do MRR total', valor: temMrr ? pct(parte) : '—', nota: temMrr ? 'expansão ÷ (MRR sem o add-on + expansão)' : 'informe o MRR atual' },
        { nome: 'CAC do upsell', valor: brl(cac), nota: 'custo por cliente convertido' },
        { nome: 'Payback do upsell', valor: isFinite(payback) ? num(payback) + ' meses' : '—', nota: 'CAC ÷ margem mensal do add-on' },
        { nome: 'LTV do add-on', valor: isFinite(ltv) ? brl(ltv) : '—', nota: 'margem mensal ÷ churn mensal' },
        { nome: 'LTV ÷ CAC', valor: isFinite(razao) ? num(razao, 1) + 'x' : '—', nota: 'retorno por real investido' },
      ],
      paineis: [
        temMrr
          ? { tipo: 'composicao', titulo: 'MRR da empresa: base e expansão', formato: 'brl', partes: [{ rotulo: 'MRR sem o add-on', valor: v.mrrBase, tom: 'cheio' }, { rotulo: 'Expansão do add-on', valor: mrrExp, tom: 'hachurado' }] }
          : { tipo: 'barras', titulo: 'Por cliente convertido, por mês', formato: 'brl', dados: [{ rotulo: 'Receita do add-on', valor: v.receita, tom: 'cheio' }, { rotulo: 'Margem do add-on', valor: margemMes, tom: 'hachurado' }] },
        { tipo: 'barras', titulo: 'O que custa vender contra o que o add-on devolve', nota: 'Valores por cliente convertido.', formato: 'brl',
          dados: [{ rotulo: 'CAC do upsell', valor: cac, tom: 'vazado' }, { rotulo: 'Margem em 12 meses', valor: margem12, tom: 'hachurado' }, ...(isFinite(ltv) ? [{ rotulo: 'LTV do add-on', valor: ltv, tom: 'cheio' }] : [])] },
      ],
      diagnostico: {
        tipo,
        titulo: tipo === 'good' ? 'O upsell compensa' : tipo === 'warn' ? 'O upsell se paga, com retorno curto' : 'O upsell custa mais do que devolve',
        texto: isFinite(razao)
          ? `Seu LTV do add-on é ${num(razao, 1)}x o custo de vender. Regra de bolso de SaaS, não meta: LTV ÷ CAC de 3 ou mais indica retorno saudável; abaixo de 1 o add-on destrói valor.`
          : 'Sem churn do add-on informado, avaliamos pelo payback: até 12 meses é bom como regra de bolso. Preencha o churn para calcular o LTV.',
        pontos,
      },
    };
  },
});
})();
