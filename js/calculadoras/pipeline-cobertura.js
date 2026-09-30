(() => {
registrar({
  id: 'pipeline-cobertura',
  nome: 'Cobertura de pipeline',
  categoria: 'Aquisição',
  descricao: 'Seu pipeline cobre a meta do trimestre? Compare a cobertura atual com a necessária pela sua taxa de fechamento.',
  campos: [
    { id: 'meta', rotulo: 'Meta do período (novo MRR ou receita)', prefixo: 'R$', valor: 60000, dica: 'Use a mesma unidade do pipeline. Se a meta é novo MRR do trimestre, informe o pipeline também em mensalidade.' },
    { id: 'ticket', rotulo: 'Ticket médio por negócio', prefixo: 'R$', valor: 1500, dica: 'Na mesma unidade da meta (mensalidade, se a meta for MRR).' },
    { id: 'pipeline', rotulo: 'Valor do pipeline aberto', prefixo: 'R$', valor: 180000, dica: 'Soma das oportunidades abertas que podem fechar dentro do período.' },
    { id: 'taxa', rotulo: 'Taxa de fechamento histórica', sufixo: '%', valor: 25, max: 100, dica: 'Oportunidades ganhas ÷ oportunidades que entraram no pipeline, olhando seus últimos trimestres.' },
  ],
  calcular(v) {
    const { brl, num, pct } = fmt;
    if (!(v.meta > 0)) return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe a meta do período.' } };
    if (!(v.taxa > 0)) return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe a taxa de fechamento histórica (maior que zero) para calcular a cobertura necessária.' } };
    const taxa = v.taxa / 100;
    const cob = v.pipeline / v.meta;
    const nec = 1 / taxa;
    const pipNec = v.meta * nec;
    const delta = v.pipeline - pipNec; // negativo = déficit
    const temTicket = v.ticket > 0;
    const oppsNec = temTicket ? pipNec / v.ticket : NaN;
    const oppsTem = temTicket ? v.pipeline / v.ticket : NaN;
    const deltaOpps = temTicket ? oppsTem - oppsNec : NaN;
    const esperado = v.pipeline * taxa;
    const convNec = v.pipeline > 0 ? v.meta / v.pipeline : NaN;
    const negociosMeta = temTicket ? v.meta / v.ticket : NaN;

    const tipo = cob >= nec ? 'good' : cob >= 1 ? 'warn' : 'bad';
    const falta = delta < 0;

    const pontos = [
      `Para fechar ${brl(v.meta)} com ${pct(taxa, 0)} de fechamento, o pipeline precisa ter ${brl(pipNec)} (${num(nec, 1)}x a meta). Hoje tem ${brl(v.pipeline)} (${num(cob, 1)}x).`,
      `Mantida a taxa histórica, o pipeline atual deve render cerca de ${brl(esperado)}, ou ${pct(esperado / v.meta, 0)} da meta.`,
    ];
    if (falta) {
      pontos.push(`Faltam ${brl(-delta)} em pipeline${temTicket ? `, cerca de ${num(-deltaOpps, 0)} oportunidades no ticket médio de ${brl(v.ticket)}` : ''}.`);
      if (isFinite(convNec)) pontos.push(`Sem pipeline novo, a meta só sai se você fechar ${pct(convNec, 0)} do que está aberto, contra ${pct(taxa, 0)} do seu histórico. Isso depende de conversão acima do que você já entregou.`);
      if (cob < 1) pontos.push('A cobertura está abaixo de 1x: mesmo fechando todas as oportunidades abertas, a meta não é atingida.');
      pontos.push('Onde agir primeiro: gerar pipeline agora, não apertar o comercial. Aumentar a taxa de fechamento leva tempo; novas oportunidades qualificadas entram no trimestre se chegarem cedo no ciclo de venda.');
    } else {
      pontos.push(`Sobram ${brl(delta)} em pipeline${temTicket ? `, cerca de ${num(deltaOpps, 0)} oportunidades a mais que o necessário` : ''}. A meta não depende de conversão acima do histórico.`);
      pontos.push('Acompanhe a qualidade do pipeline: oportunidades paradas ou sem próximo passo inflam a cobertura sem aumentar a chance de fechar.');
    }
    if (temTicket) pontos.push(`A meta equivale a cerca de ${num(negociosMeta, 0)} negócios no ticket médio; isso pede ${num(oppsNec, 0)} oportunidades no pipeline, e você tem ${num(oppsTem, 0)}.`);

    const paineis = [
      { tipo: 'barras', titulo: 'Pipeline atual contra o necessário', formato: 'brl', nota: 'O marcador é a meta do período.',
        dados: [{ rotulo: 'Pipeline atual', valor: v.pipeline, tom: 'cheio' }, { rotulo: 'Pipeline necessário', valor: pipNec, tom: 'hachurado' }],
        meta: { rotulo: 'Meta do período', valor: v.meta } },
      { tipo: 'cascata', titulo: falta ? 'Do pipeline atual ao necessário' : 'Do pipeline necessário à sobra', formato: 'brl',
        passos: falta
          ? [{ rotulo: 'Pipeline atual', valor: v.pipeline, total: true }, { rotulo: 'Déficit', valor: -delta }, { rotulo: 'Necessário', valor: pipNec, total: true }]
          : [{ rotulo: 'Necessário', valor: pipNec, total: true }, { rotulo: 'Sobra', valor: delta }, { rotulo: 'Pipeline atual', valor: v.pipeline, total: true }] },
    ];
    return {
      paineis,
      kpis: [
        { nome: 'Cobertura atual', valor: num(cob, 1) + 'x', nota: `${brl(v.pipeline)} ÷ ${brl(v.meta)}`, selo: tipo === 'good' ? ['good', 'cobre a meta'] : tipo === 'warn' ? ['warn', 'abaixo do necessário'] : ['bad', 'abaixo de 1x'] },
        { nome: 'Cobertura necessária', valor: num(nec, 1) + 'x', nota: `1 ÷ ${pct(taxa, 0)} de fechamento` },
        { nome: falta ? 'Déficit de pipeline' : 'Sobra de pipeline', valor: brl(Math.abs(delta)), nota: `pipeline necessário: ${brl(pipNec)}` },
        { nome: falta ? 'Oportunidades a gerar' : 'Oportunidades de folga', valor: temTicket ? num(Math.abs(deltaOpps), 0) : '—', nota: temTicket ? `no ticket médio de ${brl(v.ticket)}` : 'informe o ticket médio' },
        { nome: 'Receita esperada do pipeline', valor: brl(esperado), nota: `${pct(esperado / v.meta, 0)} da meta, à taxa histórica` },
        { nome: 'Fechamento necessário', valor: pct(convNec, 0), nota: `para bater a meta só com o pipeline atual (histórico: ${pct(taxa, 0)})` },
      ],
      diagnostico: {
        tipo,
        titulo: { good: 'Pipeline cobre a meta', warn: 'Pipeline abaixo da cobertura necessária', bad: 'Pipeline menor que a meta' }[tipo],
        texto: falta
          ? `Sua cobertura é ${num(cob, 1)}x e sua taxa de fechamento pede ${num(nec, 1)}x. A meta só fecha se a conversão ficar acima do seu histórico. Isso é conta, não benchmark: pipeline ÷ meta contra 1 ÷ taxa de fechamento.`
          : `Sua cobertura de ${num(cob, 1)}x passa dos ${num(nec, 1)}x que a sua taxa de fechamento exige. A meta é atingível com a conversão que você já tem.`,
        pontos,
      },
    };
  },
});
})();
