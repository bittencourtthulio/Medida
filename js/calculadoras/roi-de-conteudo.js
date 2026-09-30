(() => {
registrar({
  id: 'roi-de-conteudo',
  nome: 'ROI de conteúdo',
  categoria: 'Aquisição',
  descricao: 'O conteúdo se paga? CPL, CAC e resultado acumulado em 18 meses, já descontando o tempo de maturação.',
  termos: 'conteúdo conteudo marketing de conteúdo blog seo orgânico organico retorno do conteúdo vale a pena produzir conteúdo cpl cac de conteúdo maturação maturacao payback de conteúdo youtube newsletter lead orgânico o conteúdo se paga quanto tempo demora o conteúdo para dar resultado',
  campos: [
    { id: 'custo', rotulo: 'Custo mensal de conteúdo', prefixo: 'R$', valor: 12000, dica: 'Time, ferramentas, freelancers e mídia que impulsiona o conteúdo.' },
    { id: 'leads', rotulo: 'Leads orgânicos por mês (em regime)', valor: 300, dica: 'Leads que o conteúdo gera quando já amadureceu.' },
    { id: 'conv', rotulo: 'Conversão lead para cliente', sufixo: '%', valor: 2, max: 100 },
    { id: 'ticket', rotulo: 'Mensalidade média', prefixo: 'R$', valor: 497 },
    { id: 'margem', rotulo: 'Margem variável', sufixo: '%', valor: 80, max: 100 },
    { id: 'churn', rotulo: 'Churn mensal', sufixo: '%', valor: 4, max: 100 },
    { id: 'mat', rotulo: 'Meses de maturação', valor: 6, max: 24, dica: 'Meses em que você paga o custo e ainda não colhe clientes.' },
  ],
  calcular(v) {
    const { brl, num, pct, meses } = fmt;
    if (!(v.custo > 0) || !(v.leads > 0)) return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe o custo mensal de conteúdo e os leads orgânicos por mês.' } };
    const conv = v.conv / 100, churn = v.churn / 100, mc = v.ticket * (v.margem / 100);
    const mat = Math.round(v.mat);
    const cli = v.leads * conv;
    const cpl = v.custo / v.leads;
    const cac = cli > 0 ? v.custo / cli : NaN;
    const ltv = churn > 0 ? mc / churn : Infinity;
    const ltvCac = isFinite(cac) && cac > 0 ? ltv / cac : NaN;

    // simulação mensal: custo todo mês; clientes só depois da maturação
    const H = 60;
    const linhas = []; let acum = 0, ativos = 0, payback = NaN, prev = 0;
    for (let t = 1; t <= H; t++) {
      ativos = ativos * (1 - churn) + (t > mat ? cli : 0);
      const margemMes = ativos * mc;
      prev = acum; acum += margemMes - v.custo;
      if (isNaN(payback) && acum >= 0 && t > 0) { const d = margemMes - v.custo; payback = d > 0 ? (t - 1) + (0 - prev) / d : t; }
      linhas.push({ t, ativos, margemMes, acum });
    }
    const a18 = linhas[17].acum;
    const tipo = (!(cli > 0) || isNaN(payback) || (isFinite(ltvCac) && ltvCac < 1)) ? 'bad' : (payback <= 18 && (!isFinite(ltvCac) || ltvCac >= 3)) ? 'good' : 'warn';
    const pontos = [];
    pontos.push(`O conteúdo gera ${num(cli, 1)} clientes por mês em regime: ${num(v.leads, 0)} leads a ${pct(conv, 1)} de conversão. Cada lead custa ${brl(cpl)} e cada cliente, ${brl(cac)}.`);
    pontos.push(`Nos ${num(mat, 0)} primeiros meses você investe ${brl(v.custo * mat)} sem cliente novo. É esse período que empurra o retorno para frente.`);
    pontos.push(isNaN(payback) ? 'O resultado acumulado não fica positivo em 60 meses com esses números.' : `O acumulado volta a zero em ${meses(payback)} e fecha os 18 meses em ${brl(a18)}.`);
    if (isFinite(ltvCac) && ltvCac < 3) pontos.push(`LTV/CAC de ${num(ltvCac, 2)}x: pela regra de bolso de 3x, falta eficiência. Reduzir o custo ou subir a conversão lead a cliente é o caminho.`);
    if (cli > 0 && isFinite(cac)) pontos.push(`Com o custo parado, cada ponto percentual a mais de conversão traz ${num(v.leads * 0.01, 1)} clientes por mês.`);
    const pontosX = [0, ...linhas.slice(0, 18).map(l => l.t)];
    return {
      kpis: [
        { nome: 'Clientes por mês (em regime)', valor: num(cli, 1), nota: `${num(v.leads, 0)} leads × ${pct(conv, 1)}` },
        { nome: 'CPL de conteúdo', valor: brl(cpl), nota: `${brl(v.custo)} ÷ ${num(v.leads, 0)} leads` },
        { nome: 'CAC de conteúdo', valor: brl(cac), nota: `${brl(v.custo)} ÷ ${num(cli, 1)} clientes` },
        { nome: 'LTV / CAC', valor: isFinite(ltvCac) ? num(ltvCac, 2) + 'x' : isNaN(ltvCac) ? '—' : '∞', nota: 'regra de bolso: 3x ou mais', selo: !isFinite(ltvCac) ? undefined : ltvCac >= 3 ? ['good', 'saudável'] : ltvCac >= 1 ? ['warn', 'apertado'] : ['bad', 'destrói valor'] },
        { nome: 'Payback do programa', valor: isNaN(payback) ? 'não paga' : meses(payback), nota: `inclui ${num(mat, 0)} meses de maturação`, selo: isNaN(payback) ? ['bad', 'não paga em 60m'] : payback <= 18 ? ['good', 'até 18m'] : ['warn', 'longo'] },
        { nome: 'Resultado acumulado em 18 meses', valor: brl(a18), nota: 'margem dos clientes menos o custo de conteúdo', selo: a18 >= 0 ? ['good', 'positivo'] : ['warn', 'ainda negativo'] },
      ].map(k => { if (!k.selo) delete k.selo; return k; }),
      paineis: [
        { tipo: 'linha', titulo: 'Resultado acumulado em 18 meses', formato: 'brl', eixoX: 'meses', largo: true,
          series: [{ nome: 'Resultado acumulado', pontos: [{ x: 0, y: 0 }, ...linhas.slice(0, 18).map(l => ({ x: l.t, y: l.acum }))] }],
          marcas: (!isNaN(payback) && payback <= 18) ? [{ x: payback, y: 0, rotulo: `payback em ${num(payback)} m` }] : [] },
        { tipo: 'barras', titulo: 'Custo por lead e custo por cliente', formato: 'brl',
          dados: [{ rotulo: 'CPL', valor: cpl, tom: 'hachurado' }, ...(isFinite(cac) ? [{ rotulo: 'CAC', valor: cac, tom: 'cheio' }] : [])] },
        { tipo: 'tabela', titulo: 'Mês a mês (primeiros 6, 12 e 18)', colunas: ['Mês', 'Clientes ativos', 'Margem do mês', 'Acumulado'],
          linhas: linhas.filter(l => l.t <= 6 || l.t === 12 || l.t === 18).map(l => [String(l.t), num(l.ativos), brl(l.margemMes), { v: brl(l.acum), tom: l.acum >= 0 ? 'pos' : 'neg' }]) },
      ],
      diagnostico: {
        tipo,
        titulo: { good: 'O conteúdo se paga', warn: 'O conteúdo se paga, mas devagar', bad: cli > 0 ? 'O conteúdo não se paga nesses números' : 'O conteúdo não gera cliente' }[tipo],
        texto: 'O custo de conteúdo é mensal desde o primeiro dia, e a receita só aparece depois da maturação. Por isso a conta é acumulada, não do mês: o conteúdo compete com mídia paga pelo retorno no tempo, não pelo CAC isolado.',
        pontos,
      },
    };
  },
});
})();
