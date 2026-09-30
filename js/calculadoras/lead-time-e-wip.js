(() => {
registrar({
  id: 'lead-time-e-wip',
  nome: 'Lead time e trabalho em andamento',
  categoria: 'Entrega e Operação',
  descricao: 'Por que as entregas demoram? Pela Lei de Little, quanto mais itens em andamento, mais cada um espera.',
  termos: 'lead time wip trabalho em andamento lei de little throughput por que as entregas demoram demora para entregar fila kanban limitar wip ciclo tempo de entrega prazo médio tudo em paralelo',
  campos: [
    { id: 'wip', rotulo: 'Itens em andamento (WIP)', valor: 24, dica: 'Tudo que foi começado e ainda não foi entregue, na mesma unidade do throughput.' },
    { id: 'throughput', rotulo: 'Entregas por semana (throughput)', valor: 6, dica: 'Média das últimas semanas de itens concluídos.' },
    { id: 'reducao', rotulo: 'Redução de WIP a simular', sufixo: '%', valor: 30, max: 100, dica: 'Quanto do trabalho em andamento você pararia de começar.' },
  ],
  calcular(v) {
    const { num } = fmt;
    if (!(v.wip > 0) || !(v.throughput > 0)) {
      return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe os itens em andamento e as entregas por semana.' } };
    }
    const lead = v.wip / v.throughput;
    const wipNovo = v.wip * (1 - v.reducao / 100);
    const leadNovo = wipNovo / v.throughput;
    const ganho = lead - leadNovo;
    const porTri = v.throughput * 13;
    const tipo = lead <= 2 ? 'good' : lead <= 4 ? 'warn' : 'bad';
    const pontos = [
      `Com ${num(v.wip, 0)} itens em andamento e ${num(v.throughput)} entregas por semana, cada item leva em média ${num(lead)} semanas do início à entrega (WIP ÷ throughput).`,
      v.reducao > 0
        ? `Começar menos: reduzir o WIP em ${num(v.reducao, 0)}% (para ${num(wipNovo)} itens) leva o lead time a ${num(leadNovo)} semanas, ${num(ganho)} a menos, sem ninguém trabalhar mais rápido.`
        : 'Informe uma redução de WIP para ver quanto o lead time cai.',
      `No ritmo atual o time conclui cerca de ${num(porTri, 0)} itens por trimestre (13 semanas). Reduzir WIP encurta a espera; não aumenta esse total por si só.`,
      'Onde agir primeiro: defina um limite de itens em andamento por pessoa ou por fila e só puxe trabalho novo quando algo for entregue.',
    ];
    const mk = [{ x: 100, y: lead, rotulo: 'hoje' }];
    if (v.reducao > 0 && v.reducao <= 50) mk.push({ x: 100 - v.reducao, y: leadNovo, rotulo: 'simulado' });
    const pts = []; for (let x = 50; x <= 150; x += 10) pts.push({ x, y: v.wip * x / 100 / v.throughput });
    return {
      kpis: [
        { nome: 'Lead time médio', valor: num(lead) + ' semanas', nota: 'WIP ÷ throughput (Lei de Little)', selo: tipo === 'good' ? ['good', 'rápido'] : tipo === 'warn' ? ['warn', 'atenção'] : ['bad', 'demorado'] },
        { nome: 'Lead time com WIP reduzido', valor: num(leadNovo) + ' semanas', nota: `WIP de ${num(wipNovo)} itens` },
        { nome: 'Ganho de prazo', valor: num(ganho) + ' semanas', nota: 'lead time atual − simulado' },
        { nome: 'Entregas por trimestre', valor: num(porTri, 0) + ' itens', nota: `${num(v.throughput)} por semana × 13 semanas` },
      ],
      paineis: [
        { tipo: 'barras', titulo: 'Lead time atual contra o simulado', formato: 'sem',
          dados: [{ rotulo: 'Atual', valor: lead, tom: 'cheio' }, { rotulo: 'Com WIP reduzido', valor: leadNovo, tom: 'hachurado' }] },
        { tipo: 'linha', titulo: 'Lead time conforme o WIP', formato: 'sem', eixoX: '% do WIP atual', nota: 'Throughput mantido constante.',
          series: [{ nome: 'Lead time', pontos: pts }], marcas: mk },
      ],
      diagnostico: {
        tipo,
        titulo: { good: 'Itens fluem rápido pela fila', warn: 'Os itens esperam mais do que trabalham', bad: 'Muito trabalho em paralelo: tudo demora' }[tipo],
        texto: `Lei de Little: lead time = WIP ÷ throughput. Regra de bolso, não meta: lead time acima de 4 semanas costuma indicar trabalho demais começado ao mesmo tempo. Hoje são ${num(lead)} semanas. A conta assume throughput estável.`,
        pontos,
      },
    };
  },
});
})();
