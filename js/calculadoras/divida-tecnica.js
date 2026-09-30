(() => {
registrar({
  id: 'divida-tecnica',
  nome: 'Custo da dívida técnica',
  categoria: 'Tecnologia e IA',
  descricao: 'Quanto a dívida técnica custa por mês e quanta capacidade de entrega voltaria se o time chegasse na meta?',
  campos: [
    { id: 'eng', rotulo: 'Engenheiros', valor: 10 },
    { id: 'custo', rotulo: 'Custo mensal médio por engenheiro (total)', prefixo: 'R$', valor: 18000, dica: 'Salário ou pró-labore mais encargos, benefícios e ferramentas.' },
    { id: 'naoPlan', rotulo: 'Tempo em bugs, correções e manutenção não planejada', sufixo: '%', max: 100, valor: 35, dica: 'Fatia do tempo do time que vai para apagar incêndio em vez de entregar. Estime pelo histórico de tarefas.' },
    { id: 'aceitavel', rotulo: 'Percentual que você considera aceitável', sufixo: '%', max: 100, valor: 20, dica: 'Defina a sua meta. Todo sistema precisa de alguma manutenção; o número certo depende do seu produto.' },
    { id: 'entregas', rotulo: 'Entregas de valor por engenheiro/mês', valor: 4, opcional: true, dica: 'Funcionalidades, melhorias ou tarefas concluídas que chegam ao cliente. Deixe em 0 se não medir.' },
  ],
  calcular(v) {
    const { brl, num, pct } = fmt;
    if (!(v.eng > 0) || !(v.custo > 0)) {
      return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe o número de engenheiros e o custo mensal médio de cada um.' } };
    }
    const folha = v.eng * v.custo;
    const p = v.naoPlan / 100;
    const meta = v.aceitavel / 100;
    const custoMes = folha * p;
    const custoAno = custoMes * 12;
    const exc = Math.max(0, p - meta);
    const excRs = folha * exc;
    const engEq = v.eng * exc;
    const entregasExtra = engEq * v.entregas;
    const tipo = p <= meta ? 'good' : p - meta <= 0.1 ? 'warn' : 'bad';
    const pontos = [
      `Com ${pct(p, 0)} do tempo em trabalho não planejado, ${brl(custoMes)} da folha de ${brl(folha)} vão para consertar e manter, não para entregar: ${brl(custoAno)} por ano.`,
    ];
    if (exc > 0) {
      pontos.push(`Sua meta é ${pct(meta, 0)}. O que passa dela custa ${brl(excRs)} por mês, o equivalente a ${num(engEq, 1)} engenheiros trabalhando só em dívida.`);
      pontos.push(v.entregas > 0
        ? `Chegando na meta, cerca de ${num(entregasExtra, 1)} entregas a mais por mês voltam a chegar ao cliente (${num(engEq, 1)} engenheiros × ${num(v.entregas, 1)} entregas).`
        : `Chegando na meta, a capacidade de ${num(engEq, 1)} engenheiros volta para o roadmap sem contratar ninguém. Informe as entregas por engenheiro para ver quantas viram entregas.`);
      pontos.push(`Onde agir primeiro: levante quais áreas do código geram mais bugs e retrabalho e reserve uma parte fixa de cada ciclo para elas. Reduzir ${num(Math.min(exc, 0.05) * 100, 0)} pontos percentuais já devolve ${brl(folha * Math.min(exc, 0.05))} por mês.`);
      pontos.push('O custo de oportunidade é maior que o da folha: cada entrega que atrasa é receita, retenção ou diferencial que o cliente não recebe.');
    } else {
      pontos.push(`Você está dentro da meta de ${pct(meta, 0)}. Mantenha o acompanhamento: a dívida costuma crescer devagar e só aparece quando a capacidade de entrega já caiu.`);
    }
    return {
      kpis: [
        { nome: 'Custo mensal do tempo não planejado', valor: brl(custoMes), nota: `${pct(p, 0)} de ${brl(folha)} de folha`, selo: tipo === 'good' ? ['good', 'na meta'] : tipo === 'warn' ? ['warn', 'acima da meta'] : ['bad', 'muito acima'] },
        { nome: 'Custo anual', valor: brl(custoAno), nota: 'custo mensal × 12' },
        { nome: 'Excedente sobre a meta', valor: brl(excRs), nota: `por mês, acima de ${pct(meta, 0)}` },
        { nome: 'Engenheiros equivalentes', valor: num(engEq, 1), nota: 'capacidade que volta se chegar na meta' },
        ...(v.entregas > 0 ? [{ nome: 'Entregas a mais por mês', valor: num(entregasExtra, 1), nota: 'engenheiros equivalentes × entregas por engenheiro' }] : []),
      ],
      diagnostico: {
        tipo,
        titulo: { good: 'Dívida técnica dentro da meta', warn: 'Dívida técnica acima da meta', bad: 'Dívida técnica consome a capacidade do time' }[tipo],
        texto: `${pct(p, 0)} do tempo do time vai para o que não estava planejado. A comparação é com a meta que você definiu (${pct(meta, 0)}), não com um número universal. Dívida técnica é custo de capacidade: menos entregas, roadmap mais lento e, no fim, menos receita e retenção.`,
        pontos,
      },
    };
  },
});
})();
