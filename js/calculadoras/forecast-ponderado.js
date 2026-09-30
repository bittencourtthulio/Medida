(() => {
registrar({
  id: 'forecast-ponderado',
  nome: 'Forecast ponderado do pipeline',
  categoria: 'Conversão',
  descricao: 'Quanto você deve realmente fechar este mês, dado o valor e a probabilidade de cada etapa do funil?',
  campos: [
    { id: 'v1', rotulo: 'Qualificação: valor em aberto', prefixo: 'R$', valor: 120000 },
    { id: 'p1', rotulo: 'Qualificação: probabilidade de fechar', sufixo: '%', valor: 10, max: 100 },
    { id: 'v2', rotulo: 'Proposta enviada: valor em aberto', prefixo: 'R$', valor: 80000 },
    { id: 'p2', rotulo: 'Proposta enviada: probabilidade de fechar', sufixo: '%', valor: 30, max: 100 },
    { id: 'v3', rotulo: 'Negociação: valor em aberto', prefixo: 'R$', valor: 50000 },
    { id: 'p3', rotulo: 'Negociação: probabilidade de fechar', sufixo: '%', valor: 60, max: 100 },
    { id: 'v4', rotulo: 'Contrato em assinatura: valor em aberto', prefixo: 'R$', valor: 20000 },
    { id: 'p4', rotulo: 'Contrato em assinatura: probabilidade de fechar', sufixo: '%', valor: 90, max: 100 },
    { id: 'meta', rotulo: 'Meta de vendas do período', prefixo: 'R$', valor: 100000 },
  ],
  calcular(v) {
    const { brl, pct } = fmt;
    const nomes = ['Qualificação', 'Proposta enviada', 'Negociação', 'Contrato em assinatura'];
    const etapas = nomes.map((nome, i) => ({ nome, valor: v['v' + (i + 1)], prob: v['p' + (i + 1)] / 100, pond: v['v' + (i + 1)] * v['p' + (i + 1)] / 100 }));
    const bruto = etapas.reduce((s, e) => s + e.valor, 0);
    const pond = etapas.reduce((s, e) => s + e.pond, 0);
    if (!(bruto > 0)) {
      return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe o valor em aberto de pelo menos uma etapa do funil.' } };
    }
    const mediaProb = pond / bruto;
    const maior = etapas.reduce((m, e) => (e.pond > m.pond ? e : m), etapas[0]);
    const fechando = etapas[2].pond + etapas[3].pond;
    const paineis = [
      { tipo: 'barras', titulo: 'Valor bruto e ponderado de cada etapa', formato: 'brl',
        dados: etapas.flatMap(e => [{ rotulo: e.nome + ' (bruto)', valor: e.valor, tom: 'vazado' }, { rotulo: e.nome + ' (ponderado)', valor: e.pond, tom: 'cheio' }]),
        ...(v.meta > 0 ? { meta: { rotulo: 'Meta', valor: v.meta } } : {}) },
      { tipo: 'composicao', titulo: 'Quanto cada etapa pesa no forecast', formato: 'brl',
        partes: etapas.map(e => ({ rotulo: e.nome, valor: e.pond })) },
      { tipo: 'tabela', titulo: 'Forecast por etapa', colunas: ['Etapa', 'Valor', 'Probabilidade', 'Ponderado', 'Parte do forecast'],
        linhas: [...etapas.map(e => [e.nome, brl(e.valor), pct(e.prob, 0), brl(e.pond), pct(pond > 0 ? e.pond / pond : 0, 0)]), ['Total', brl(bruto), pct(mediaProb, 0), brl(pond), '100%']] },
    ];
    const base = [
      { nome: 'Forecast ponderado', valor: brl(pond), nota: 'soma de valor × probabilidade de cada etapa' },
      { nome: 'Pipeline bruto', valor: brl(bruto), nota: 'soma dos valores, sem ponderar' },
      { nome: 'Probabilidade média do pipeline', valor: pct(mediaProb, 1), nota: 'ponderado ÷ bruto' },
    ];
    if (!(v.meta > 0)) {
      return {
        kpis: base,
        diagnostico: { tipo: 'warn', titulo: `Forecast de ${brl(pond)}, sem meta para comparar`, texto: 'Informe a meta do período para saber quanto dela o pipeline cobre.', pontos: [`A etapa que mais pesa é ${maior.nome}, com ${brl(maior.pond)} (${pct(maior.pond / pond, 0)} do forecast).`, 'As probabilidades são as que você digitou: se elas forem otimistas, o forecast também é.'] },
        paineis,
      };
    }
    const cob = pond / v.meta;
    const deficit = Math.max(v.meta - pond, 0);
    const brutoCobre = bruto >= v.meta;
    const tipo = cob >= 1 ? 'good' : brutoCobre ? 'warn' : 'bad';
    const pontos = [`O pipeline bruto é ${brl(bruto)} e o ponderado ${brl(pond)}: ${pct(cob, 0)} da meta de ${brl(v.meta)}.`];
    if (cob >= 1) {
      pontos.push(`O forecast passa a meta em ${brl(pond - v.meta)}. Esse colchão só existe se suas probabilidades estiverem certas: se todas caírem pela metade, o ponderado vira ${brl(pond / 2)}.`);
    } else if (brutoCobre) {
      const preciso = mediaProb > 0 ? deficit / mediaProb : Infinity;
      pontos.push(`Faltam ${brl(deficit)} para a meta. Com a probabilidade média de hoje (${pct(mediaProb, 0)}), isso pede ${isFinite(preciso) ? brl(preciso) : '—'} a mais de pipeline, ou subir a probabilidade das oportunidades que já existem.`);
    } else {
      pontos.push(`Mesmo se todo o pipeline fechasse, seriam ${brl(bruto)} contra uma meta de ${brl(v.meta)}: faltam ${brl(v.meta - bruto)} de pipeline. Nenhuma probabilidade resolve isso, só gerar mais oportunidades.`);
    }
    pontos.push(`As duas etapas finais (Negociação e Contrato em assinatura) somam ${brl(fechando)} ponderados, ${pct(fechando / v.meta, 0)} da meta. É a parte mais próxima de virar receita.`);
    pontos.push(`A etapa que mais pesa no forecast é ${maior.nome}, com ${brl(maior.pond)} (${pct(maior.pond / pond, 0)}). Revise primeiro a probabilidade dela: um erro ali mexe mais no resultado.`);
    pontos.push('As probabilidades são suas, não de mercado. Para calibrar, compare com o que realmente fechou nas mesmas etapas nos últimos meses.');
    return {
      kpis: [
        ...base,
        { nome: 'Cobertura da meta', valor: pct(cob, 0), nota: `${brl(pond)} ÷ ${brl(v.meta)}`, selo: tipo === 'good' ? ['good', 'meta coberta'] : tipo === 'warn' ? ['warn', 'abaixo da meta'] : ['bad', 'bruto não cobre'] },
        { nome: 'Déficit para a meta', valor: brl(deficit), nota: cob >= 1 ? 'meta coberta pelo ponderado' : 'meta − forecast ponderado' },
        { nome: 'Cobertura bruta da meta', valor: pct(bruto / v.meta, 0), nota: 'pipeline bruto ÷ meta' },
      ],
      diagnostico: {
        tipo,
        titulo: { good: 'O forecast cobre a meta', warn: 'Forecast abaixo da meta', bad: 'O pipeline nem cobre a meta' }[tipo],
        texto: tipo === 'good' ? 'O valor ponderado pelas suas probabilidades alcança a meta, mas depende da honestidade dessas probabilidades.' : tipo === 'warn' ? 'O pipeline bruto é maior que a meta, mas o valor ponderado fica abaixo dela.' : 'Somando todo o pipeline, sem ponderar, o valor é menor que a meta.',
        pontos,
      },
      paineis,
    };
  },
});
})();
