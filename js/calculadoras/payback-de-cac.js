(() => {
registrar({
  id: 'payback-de-cac',
  nome: 'Payback do CAC por cliente',
  categoria: 'Aquisição',
  descricao: 'Em quantos meses um cliente devolve o CAC? Payback simples e ajustado pelo churn, com a margem acumulada esperada.',
  termos: 'payback cac payback do cac em quantos meses o cliente paga o cac tempo de retorno recuperar cac retorno do cliente ltv cac margem acumulada payback ajustado churn meses para pagar o cac custo de aquisição por cliente',
  campos: [
    { id: 'cac', rotulo: 'CAC', prefixo: 'R$', valor: 2500 },
    { id: 'ticket', rotulo: 'Mensalidade', prefixo: 'R$', valor: 497 },
    { id: 'margem', rotulo: 'Margem bruta', sufixo: '%', valor: 80, max: 100 },
    { id: 'churn', rotulo: 'Churn mensal', sufixo: '%', valor: 4, max: 100 },
  ],
  calcular(v) {
    const { brl, num, meses } = fmt;
    const mc = v.ticket * (v.margem / 100), c = v.churn / 100;
    if (!(v.cac > 0) || !(mc > 0)) return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe CAC, mensalidade e margem maiores que zero.' } };
    const acumN = n => c === 0 ? mc * n : mc * (1 - Math.pow(1 - c, n)) / c; // margem esperada nos n primeiros meses
    const simples = v.cac / mc;
    let ajustado = NaN;
    if (c === 0) ajustado = simples;
    else if (c >= 1) ajustado = v.cac <= mc ? v.cac / mc : NaN;
    else { const r = v.cac * c / mc; if (r < 1) ajustado = Math.log(1 - r) / Math.log(1 - c); }
    const ltv = c > 0 ? mc / c : Infinity;
    const ltvCac = ltv / v.cac;
    const m24 = acumN(24);
    const tipo = isNaN(ajustado) || ltvCac < 1 ? 'bad' : ajustado <= 12 ? 'good' : ajustado <= 18 ? 'warn' : 'bad';
    const pontos = [
      `Um cliente devolve ${brl(mc)} de margem por mês. Sem churn, o CAC de ${brl(v.cac)} volta em ${meses(simples)}.`,
      isNaN(ajustado)
        ? `Com churn de ${num(v.churn)}% por mês, a margem esperada de um cliente soma no máximo ${brl(ltv)}, abaixo do CAC: o cliente médio nunca paga o que custou.`
        : `Com o churn, parte dos clientes sai antes: o retorno esperado vem em ${meses(ajustado)}, ${num(ajustado - simples)} a mais que o simples.`,
      `Em 24 meses, a margem acumulada esperada por cliente é ${brl(m24)}, ${m24 >= v.cac ? `${brl(m24 - v.cac)} acima` : `${brl(v.cac - m24)} abaixo`} do CAC.`,
    ];
    if (tipo !== 'good') pontos.push('Alavancas: CAC menor, mensalidade ou margem maiores, ou churn menor. Com churn alto, cada mês que o cliente fica vale menos que o anterior.');
    const serie = []; for (let t = 0; t <= 24; t++) serie.push({ x: t, y: acumN(t) });
    return {
      kpis: [
        { nome: 'Payback simples', valor: meses(simples), nota: `${brl(v.cac)} ÷ ${brl(mc)} de margem mensal` },
        { nome: 'Payback ajustado pelo churn', valor: isNaN(ajustado) ? 'não paga' : meses(ajustado), nota: 'mês em que a margem esperada cobre o CAC', selo: isNaN(ajustado) ? ['bad', 'nunca paga'] : ajustado <= 12 ? ['good', 'até 12m'] : ajustado <= 18 ? ['warn', 'até 18m'] : ['bad', 'lento'] },
        { nome: 'LTV / CAC', valor: isFinite(ltvCac) ? num(ltvCac, 2) + 'x' : '∞', nota: 'regra de bolso: 3x ou mais', selo: ltvCac >= 3 ? ['good', 'saudável'] : ltvCac >= 1 ? ['warn', 'apertado'] : ['bad', 'destrói valor'] },
        { nome: 'Margem esperada em 24 meses', valor: brl(m24), nota: 'por cliente, já considerando o churn' },
      ],
      paineis: [
        { tipo: 'linha', titulo: 'Margem acumulada esperada de um cliente contra o CAC', formato: 'brl', eixoX: 'meses', largo: true,
          series: [{ nome: 'Margem acumulada esperada', pontos: serie }, { nome: 'CAC', pontos: serie.map(p => ({ x: p.x, y: v.cac })) }],
          marcas: (!isNaN(ajustado) && ajustado <= 24) ? [{ x: ajustado, y: v.cac, rotulo: `paga em ${num(ajustado)} m` }] : [] },
        { tipo: 'barras', titulo: 'Payback simples contra ajustado', formato: 'mes',
          dados: [{ rotulo: 'Simples', valor: simples, tom: 'hachurado' }, ...(isNaN(ajustado) ? [] : [{ rotulo: 'Ajustado pelo churn', valor: ajustado, tom: 'cheio' }])] },
      ],
      diagnostico: {
        tipo,
        titulo: { good: 'O CAC volta rápido', warn: 'O CAC volta, mas devagar', bad: isNaN(ajustado) ? 'O cliente médio não paga o CAC' : 'Payback longo demais' }[tipo],
        texto: 'Regra de bolso: payback de até 12 meses é confortável e até 18 pede caixa. O ajustado é o que vale, porque conta só a margem que os clientes ainda ativos entregam.',
        pontos,
      },
    };
  },
});
})();
