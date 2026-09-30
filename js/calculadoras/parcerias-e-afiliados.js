(() => {
registrar({
  id: 'parcerias-e-afiliados',
  nome: 'Parcerias e afiliados',
  categoria: 'Aquisição',
  descricao: 'Vale pagar comissão a parceiros? CAC efetivo do programa, margem de vida do cliente e comparação com o CAC pago.',
  termos: 'parcerias afiliados afiliado parceiro comissão comissao programa de parceiros programa de afiliados revenda indicação paga comissão recorrente vale pagar comissão cac do parceiro canal de parcerias cac pago comparar referral partner',
  campos: [
    { id: 'com', rotulo: 'Comissão', sufixo: '% da mensalidade', valor: 20, max: 100 },
    { id: 'mesesCom', rotulo: 'Meses de comissão', valor: 12, max: 60, dica: '0 = comissão única, só no primeiro mês.' },
    { id: 'ticket', rotulo: 'Mensalidade média', prefixo: 'R$', valor: 497 },
    { id: 'margem', rotulo: 'Margem variável', sufixo: '%', valor: 80, max: 100 },
    { id: 'churn', rotulo: 'Churn mensal', sufixo: '%', valor: 4, max: 100 },
    { id: 'parceiros', rotulo: 'Parceiros ativos', valor: 10 },
    { id: 'cliPar', rotulo: 'Clientes por parceiro (mês)', valor: 1, dica: 'Média de clientes novos que cada parceiro traz por mês.' },
    { id: 'gestao', rotulo: 'Custo mensal de gestão do programa', prefixo: 'R$', valor: 4000, dica: 'Pessoa dedicada, materiais, plataforma de afiliados, eventos.' },
    { id: 'cacPago', rotulo: 'CAC do canal pago (para comparar)', prefixo: 'R$', valor: 1800, opcional: true, dica: 'Com 0, a comparação é omitida.' },
  ],
  calcular(v) {
    const { brl, num, pct, meses } = fmt;
    const clientes = v.parceiros * v.cliPar;
    const mc = v.ticket * (v.margem / 100), c = v.churn / 100;
    if (!(clientes > 0) || !(v.ticket > 0)) return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe parceiros, clientes por parceiro e mensalidade maiores que zero.' } };
    const pagamentos = Math.round(v.mesesCom) === 0 ? 1 : Array.from({ length: Math.round(v.mesesCom) }, (_, i) => Math.pow(1 - c, i)).reduce((s, x) => s + x, 0);
    const comissao = v.ticket * (v.com / 100) * pagamentos;
    const gestaoCli = v.gestao / clientes;
    const cac = comissao + gestaoCli;
    const L = c > 0 ? (1 - Math.pow(1 - c, 60)) / c : 60; // meses esperados de vida, horizonte de 60
    const receitaVida = v.ticket * L;
    const variavel = receitaVida * (1 - v.margem / 100);
    const ltv = mc * L;
    const ltvLiq = ltv - comissao;
    const lucro = ltvLiq - gestaoCli;
    const ltvCac = cac > 0 ? ltv / cac : NaN;
    const payback = mc > 0 ? cac / mc : NaN;
    const temPago = v.cacPago > 0;
    const dif = temPago ? v.cacPago - cac : NaN;
    const tipo = lucro <= 0 || ltvCac < 1 ? 'bad' : (temPago ? cac <= v.cacPago : true) && ltvCac >= 3 ? 'good' : 'warn';
    const pontos = [
      `Cada cliente traz ${brl(comissao)} de comissão ao parceiro (${num(v.com, 0)}% da mensalidade ${Math.round(v.mesesCom) === 0 ? 'uma única vez' : `por até ${num(v.mesesCom, 0)} meses, pagos só enquanto o cliente ficar`}) e mais ${brl(gestaoCli)} de gestão: CAC efetivo de ${brl(cac)}.`,
      `Ao longo da vida (horizonte de 60 meses), o cliente deixa ${brl(ltv)} de margem; depois da comissão e da gestão, sobra ${brl(lucro)} por cliente.`,
    ];
    if (temPago) pontos.push(dif >= 0 ? `O canal de parcerias custa ${brl(dif)} a menos por cliente que o canal pago (${brl(cac)} contra ${brl(v.cacPago)}).` : `O canal de parcerias custa ${brl(-dif)} a mais por cliente que o canal pago (${brl(cac)} contra ${brl(v.cacPago)}).`);
    if (gestaoCli > comissao) pontos.push(`A gestão pesa mais que a comissão (${brl(gestaoCli)} contra ${brl(comissao)} por cliente): o programa precisa de mais clientes por parceiro ou de menos custo fixo.`);
    else pontos.push(`Cada cliente a mais por mês no programa reduz a gestão por cliente; hoje são ${num(clientes, 1)} clientes por mês para ${brl(v.gestao)} de gestão.`);
    if (isFinite(payback)) pontos.push(`O CAC efetivo volta em ${meses(payback)} de margem, sem considerar churn.`);
    return {
      kpis: [
        { nome: 'Comissão total por cliente', valor: brl(comissao), nota: 'esperada, considerando o churn' },
        { nome: 'CAC efetivo do parceiro', valor: brl(cac), nota: `comissão ${brl(comissao)} + gestão ${brl(gestaoCli)} por cliente`, selo: temPago ? (cac <= v.cacPago ? ['good', 'abaixo do pago'] : ['warn', 'acima do pago']) : undefined },
        { nome: 'LTV líquido da comissão', valor: brl(ltvLiq), nota: `margem de vida ${brl(ltv)} − comissão` },
        { nome: 'LTV / CAC efetivo', valor: num(ltvCac, 2) + 'x', nota: 'regra de bolso: 3x ou mais', selo: ltvCac >= 3 ? ['good', 'saudável'] : ltvCac >= 1 ? ['warn', 'apertado'] : ['bad', 'destrói valor'] },
        { nome: 'Payback', valor: isFinite(payback) ? meses(payback) : '—', nota: 'CAC efetivo ÷ margem mensal, sem churn' },
        { nome: 'Clientes do programa por mês', valor: num(clientes, 1), nota: `${num(v.parceiros, 0)} parceiros × ${num(v.cliPar, 1)}` },
      ].map(k => { if (!k.selo) delete k.selo; return k; }),
      paineis: [
        ...(temPago ? [{ tipo: 'barras', titulo: 'CAC do parceiro contra o CAC pago', formato: 'brl',
          dados: [{ rotulo: 'Parceiros (efetivo)', valor: cac, tom: 'cheio' }, { rotulo: 'Canal pago', valor: v.cacPago, tom: 'hachurado' }] }] : []),
        { tipo: 'composicao', titulo: 'Para onde vai a receita de vida de um cliente', formato: 'brl', nota: 'Horizonte de 60 meses, já considerando o churn.',
          partes: [{ rotulo: 'Custo variável', valor: variavel }, { rotulo: 'Comissão do parceiro', valor: comissao }, { rotulo: 'Gestão do programa', valor: gestaoCli }, { rotulo: 'Lucro', valor: Math.max(0, lucro) }] },
      ],
      diagnostico: {
        tipo,
        titulo: { good: 'Vale pagar a comissão', warn: 'Comissão se paga, com ressalvas', bad: 'A comissão e a gestão comem o lucro' }[tipo],
        texto: temPago
          ? `O CAC efetivo do programa é ${brl(cac)}, contra ${brl(v.cacPago)} do canal pago. Compare também a qualidade: parceiros podem trazer clientes com churn diferente do pago.`
          : `O CAC efetivo do programa é ${brl(cac)}. Preencha o CAC do canal pago para comparar os dois canais.`,
        pontos,
      },
    };
  },
});
})();
