(() => {
registrar({
  id: 'custo-do-atraso',
  nome: 'Custo do atraso',
  categoria: 'Entrega e Operação',
  descricao: 'Quanto custa atrasar uma entrega: a receita que deixa de entrar mais o time parado esperando.',
  termos: 'custo do atraso cost of delay atraso de entrega quanto custa atrasar entrega atrasada prazo estourado receita adiada oportunidade perdida time de atraso cronograma atrasou lançamento',
  campos: [
    { id: 'receita', rotulo: 'Receita mensal que a entrega destravaria', prefixo: 'R$', valor: 40000, dica: 'MRR novo ou retido que depende desta entrega.' },
    { id: 'semanas', rotulo: 'Semanas de atraso', valor: 6 },
    { id: 'custoSemana', rotulo: 'Custo semanal do time alocado', prefixo: 'R$', valor: 12000, dica: 'Custo das pessoas ligadas à entrega, por semana.' },
    { id: 'clientes', rotulo: 'Clientes impactados', valor: 0, opcional: true, dica: 'Opcional. Com 0, o custo por cliente não aparece.' },
  ],
  calcular(v) {
    const { brl, num } = fmt;
    if (!(v.semanas > 0) || !(v.receita > 0 || v.custoSemana > 0)) {
      return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe as semanas de atraso e a receita mensal ou o custo semanal do time.' } };
    }
    const FS = 4.345;
    const opSem = v.receita / FS;
    const oport = opSem * v.semanas;
    const time = v.custoSemana * v.semanas;
    const total = oport + time;
    const porSem = opSem + v.custoSemana;
    const tipo = v.semanas > FS ? 'bad' : 'warn';
    const pontos = [
      `${num(v.semanas)} semanas de atraso custam ${brl(total)}: ${brl(oport)} de receita que não entrou e ${brl(time)} de time ocupado sem gerar entrega.`,
      `Cada semana a mais custa ${brl(porSem)}. Essa é a régua para decidir se vale pagar mais (horas extras, corte de escopo) para entregar antes.`,
    ];
    if (v.clientes > 0) pontos.push(`Com ${num(v.clientes, 0)} clientes impactados, o atraso custa cerca de ${brl(total / v.clientes)} por cliente.`);
    if (opSem > v.custoSemana) pontos.push('A receita adiada pesa mais que o time parado: vale cortar escopo para entregar o núcleo antes.');
    else pontos.push('O custo do time pesa mais que a receita adiada: reveja se a equipe alocada é do tamanho que a entrega pede.');
    const serie = f => { const s = []; const passo = Math.max(1, Math.ceil(v.semanas / 52)); for (let x = 0; x < v.semanas; x += passo) s.push({ x, y: f(x) }); s.push({ x: v.semanas, y: f(v.semanas) }); return s; };
    return {
      kpis: [
        { nome: 'Custo total do atraso', valor: brl(total), nota: 'oportunidade + time', selo: tipo === 'bad' ? ['bad', 'mais de um mês'] : ['warn', 'menos de um mês'] },
        { nome: 'Custo de oportunidade', valor: brl(oport), nota: `receita mensal × ${num(v.semanas)} semanas ÷ 4,345` },
        { nome: 'Custo do time no atraso', valor: brl(time), nota: `${brl(v.custoSemana)} × ${num(v.semanas)} semanas` },
        { nome: 'Custo por semana adicional', valor: brl(porSem), nota: 'oportunidade + time, por semana' },
        ...(v.clientes > 0 ? [{ nome: 'Custo por cliente impactado', valor: brl(total / v.clientes), nota: `${num(v.clientes, 0)} clientes` }] : []),
      ],
      paineis: [
        { tipo: 'linha', titulo: 'Custo acumulado semana a semana', formato: 'brl', eixoX: 'semanas de atraso',
          series: [{ nome: 'Total', pontos: serie(x => x * porSem) }, { nome: 'Receita que não entrou', pontos: serie(x => x * opSem) }, { nome: 'Time', pontos: serie(x => x * v.custoSemana) }] },
        { tipo: 'composicao', titulo: 'De que é feito o custo do atraso', formato: 'brl',
          partes: [{ rotulo: 'Oportunidade (receita adiada)', valor: oport, tom: 'cheio' }, { rotulo: 'Time alocado', valor: time, tom: 'hachurado' }] },
        { tipo: 'barras', titulo: 'Custo de cada semana adicional', formato: 'brl',
          dados: [{ rotulo: 'Oportunidade', valor: opSem, tom: 'cheio' }, { rotulo: 'Time', valor: v.custoSemana, tom: 'hachurado' }, { rotulo: 'Total por semana', valor: porSem, tom: 'vazado' }] },
      ],
      diagnostico: {
        tipo,
        titulo: tipo === 'bad' ? 'O atraso já passou de um mês de receita' : 'O atraso já tem custo mensurável',
        texto: 'Conta direta com os seus números: receita mensal dividida por 4,345 semanas dá a receita adiada por semana; soma-se o custo do time. Não inclui churn ou perda de confiança, que são reais mas difíceis de medir.',
        pontos,
      },
    };
  },
});
})();
