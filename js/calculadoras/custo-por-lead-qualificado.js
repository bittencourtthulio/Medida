(() => {
registrar({
  id: 'custo-por-lead-qualificado',
  nome: 'Custo por lead qualificado',
  categoria: 'Aquisição',
  descricao: 'Quanto custa cada etapa do funil de geração? Custo por lead, MQL, SQL e cliente, e onde o custo mais infla.',
  termos: 'custo por lead cpl custo por mql custo por sql mql sql lead qualificado funil de geração de demanda quanto custa cada etapa do funil onde o custo infla cac taxa de qualificação marketing qualified lead sales qualified lead qualificação de leads',
  campos: [
    { id: 'invest', rotulo: 'Investimento em geração de leads (mês)', prefixo: 'R$', valor: 20000, dica: 'Mídia, time de marketing, ferramentas e conteúdo.' },
    { id: 'leads', rotulo: 'Leads gerados (mês)', valor: 800 },
    { id: 'mql', rotulo: 'Leads que viram MQL', sufixo: '%', valor: 30, max: 100 },
    { id: 'sql', rotulo: 'MQL que viram SQL', sufixo: '%', valor: 35, max: 100 },
    { id: 'fecha', rotulo: 'SQL que fecham', sufixo: '%', valor: 20, max: 100 },
    { id: 'ticket', rotulo: 'Mensalidade média', prefixo: 'R$', valor: 497 },
  ],
  calcular(v) {
    const { brl, num, pct } = fmt;
    if (!(v.invest > 0) || !(v.leads > 0)) return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe o investimento e os leads gerados no mês.' } };
    const mql = v.leads * v.mql / 100, sql = mql * v.sql / 100, cli = sql * v.fecha / 100;
    const cpl = v.invest / v.leads;
    const cMql = mql > 0 ? v.invest / mql : NaN, cSql = sql > 0 ? v.invest / sql : NaN, cac = cli > 0 ? v.invest / cli : NaN;
    const etapas = [
      { nome: 'de lead para MQL', taxa: v.mql / 100, mult: v.mql > 0 ? 100 / v.mql : NaN },
      { nome: 'de MQL para SQL', taxa: v.sql / 100, mult: v.sql > 0 ? 100 / v.sql : NaN },
      { nome: 'de SQL para cliente', taxa: v.fecha / 100, mult: v.fecha > 0 ? 100 / v.fecha : NaN },
    ];
    const validas = etapas.filter(e => isFinite(e.mult));
    const inflado = etapas.find(e => !isFinite(e.mult)) || validas.reduce((a, b) => (b.mult > a.mult ? b : a));
    const nMens = isFinite(cac) && v.ticket > 0 ? cac / v.ticket : NaN;
    const tipo = !(cli > 0) ? 'bad' : !isFinite(nMens) ? 'warn' : nMens <= 12 ? 'good' : nMens <= 18 ? 'warn' : 'bad';
    const pontos = [];
    pontos.push(`De ${num(v.leads, 0)} leads saem ${num(mql, 1)} MQL, ${num(sql, 1)} SQL e ${num(cli, 2)} clientes por mês.`);
    if (cli > 0) {
      pontos.push(`O custo sobe a cada etapa: ${brl(cpl)} por lead, ${brl(cMql)} por MQL, ${brl(cSql)} por SQL e ${brl(cac)} por cliente.`);
      pontos.push(`Onde mais infla: ${inflado.nome}, em que só ${pct(inflado.taxa, 0)} avançam e o custo se multiplica por ${num(inflado.mult, 1)}. É a etapa de maior alavanca para baixar o CAC.`);
      if (isFinite(nMens)) pontos.push(`O CAC equivale a ${num(nMens, 1)} mensalidades de receita, antes de margem e churn. Regra de bolso: até 12 é confortável.`);
    } else {
      pontos.push(`Uma das taxas está zerada, então o funil não chega a cliente. Etapa parada: ${inflado.nome}.`);
    }
    return {
      kpis: [
        { nome: 'Custo por lead (CPL)', valor: brl(cpl), nota: `${brl(v.invest)} ÷ ${num(v.leads, 0)} leads` },
        { nome: 'MQL por mês', valor: num(mql, 1), nota: `${pct(v.mql / 100, 0)} dos leads` },
        { nome: 'Custo por MQL', valor: brl(cMql), nota: `${brl(v.invest)} ÷ ${num(mql, 1)}` },
        { nome: 'SQL por mês', valor: num(sql, 1), nota: `${pct(v.sql / 100, 0)} dos MQL` },
        { nome: 'Custo por SQL', valor: brl(cSql), nota: `${brl(v.invest)} ÷ ${num(sql, 1)}` },
        { nome: 'Clientes por mês', valor: num(cli, 2), nota: `${pct(v.fecha / 100, 0)} dos SQL` },
        { nome: 'CAC', valor: brl(cac), nota: `${brl(v.invest)} ÷ ${num(cli, 2)}`, selo: isFinite(nMens) ? (nMens <= 12 ? ['good', 'até 12 mensalidades'] : nMens <= 18 ? ['warn', 'até 18 mensalidades'] : ['bad', 'acima de 18 mensalidades']) : undefined },
        { nome: 'Etapa onde o custo mais infla', valor: inflado.nome, nota: `só ${pct(inflado.taxa, 0)} avançam` },
      ].map(k => { if (!k.selo) delete k.selo; return k; }),
      paineis: [
        { tipo: 'funil', titulo: 'Leads até clientes, por mês', formato: 'num',
          etapas: [{ rotulo: 'Leads', valor: v.leads }, { rotulo: 'MQL', valor: mql }, { rotulo: 'SQL', valor: sql }, { rotulo: 'Clientes', valor: cli }] },
        { tipo: 'barras', titulo: 'Custo em cada etapa do funil', formato: 'brl',
          dados: [{ rotulo: 'Por lead', valor: cpl, tom: 'pontilhado' }, ...(isFinite(cMql) ? [{ rotulo: 'Por MQL', valor: cMql, tom: 'hachurado' }] : []), ...(isFinite(cSql) ? [{ rotulo: 'Por SQL', valor: cSql, tom: 'hachurado' }] : []), ...(isFinite(cac) ? [{ rotulo: 'Por cliente (CAC)', valor: cac, tom: 'cheio' }] : [])] },
      ],
      diagnostico: {
        tipo,
        titulo: { good: 'Funil de geração eficiente', warn: 'Custo por cliente já pesa', bad: cli > 0 ? 'O custo infla demais ao longo do funil' : 'O funil não gera cliente' }[tipo],
        texto: cli > 0
          ? `Cada lead custa ${brl(cpl)}, mas cada cliente custa ${brl(cac)}: o custo é multiplicado pelas taxas de conversão. Barateia mais melhorar a etapa ${inflado.nome} do que comprar lead mais barato.`
          : 'Sem cliente, o investimento não retorna. Revise as taxas de cada etapa, uma delas está zerada.',
        pontos,
      },
    };
  },
});
})();
