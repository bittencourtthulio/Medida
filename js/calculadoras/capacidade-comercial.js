(() => {
registrar({
  id: 'capacidade-comercial',
  nome: 'Capacidade comercial: quantos vendedores',
  categoria: 'Conversão',
  descricao: 'Quantos vendedores você precisa para a meta de novo MRR, e com quantos meses de antecedência contratar por causa da rampa.',
  termos: 'capacidade comercial quantos vendedores preciso contratar headcount time de vendas rampa onboarding vendedor novo produtividade cota meta de novo mrr dimensionar time déficit de vendedores quando contratar',
  campos: [
    { id: 'meta', rotulo: 'Meta de novo MRR por mês', prefixo: 'R$', valor: 20000 },
    { id: 'mensalidade', rotulo: 'Mensalidade por cliente', prefixo: 'R$', valor: 500 },
    { id: 'prod', rotulo: 'Clientes por vendedor (mês), em produtividade plena', valor: 4 },
    { id: 'rampa', rotulo: 'Meses de rampa até a produtividade plena', sufixo: 'meses', valor: 4, opcional: true, dica: 'Supõe produtividade linear: no mês 1 o vendedor novo entrega 1 ÷ rampa do pleno, e assim por diante. Zero = já começa pleno.' },
    { id: 'atuais', rotulo: 'Vendedores atuais', valor: 6, opcional: true, dica: 'Considerados já em produtividade plena.' },
  ],
  calcular(v) {
    const { brl, num, pct } = fmt;
    if (!(v.meta > 0) || !(v.mensalidade > 0) || !(v.prod > 0)) {
      return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe a meta de novo MRR, a mensalidade e os clientes por vendedor, maiores que zero.' } };
    }
    const clientes = Math.ceil(v.meta / v.mensalidade - 1e-9);
    const necessarios = Math.ceil(clientes / v.prod - 1e-9);
    const capAtual = v.atuais * v.prod;
    const saldo = v.atuais - necessarios;
    const contratar = Math.max(0, -saldo);
    const cobertura = capAtual / clientes;
    const tipo = saldo >= 0 ? 'good' : cobertura >= 0.8 ? 'warn' : 'bad';
    const rampa = Math.round(v.rampa);
    const pontos = [
      `A meta de ${brl(v.meta)} de novo MRR pede ${num(clientes, 0)} clientes por mês (${brl(v.meta)} ÷ ${brl(v.mensalidade)}), ou ${num(necessarios, 0)} vendedores com ${num(v.prod, 1)} clientes cada.`,
    ];
    if (saldo >= 0) pontos.push(`Você tem ${num(v.atuais, 0)} vendedores: folga de ${num(saldo, 0)}. A capacidade atual é de ${num(capAtual, 1)} clientes por mês, ${pct(cobertura, 0)} do necessário.`);
    else {
      pontos.push(`Você tem ${num(v.atuais, 0)} vendedores e precisa de ${num(necessarios, 0)}: faltam ${num(contratar, 0)}. A capacidade atual cobre ${pct(cobertura, 0)} da meta.`);
      if (rampa > 0) {
        const perda = v.prod * (rampa - 1) / 2;
        pontos.push(`Cada contratado leva ${num(rampa, 0)} meses para render o pleno. Para ter a capacidade plena no mês em que a meta vale, contrate ${num(rampa, 0)} meses antes. Se contratar só agora, a meta fica descoberta durante a rampa.`);
        if (rampa > 1) pontos.push(`Nos ${num(rampa, 0)} meses de rampa, cada vendedor novo fecha ${num(v.prod * (rampa + 1) / 2, 1)} clientes em vez de ${num(v.prod * rampa, 0)}: ${num(perda, 1)} clientes a menos por contratado.`);
      } else pontos.push('Sem rampa, o vendedor novo rende o pleno desde o primeiro mês: contrate quando o déficit aparecer.');
    }
    pontos.push('Este cálculo vê só a capacidade de fechar. Vendedor a mais sem leads suficientes só divide a mesma demanda: confirme que o funil entrega oportunidades para todos.');
    const pontosRampa = [];
    const fim = Math.max(rampa, 1) + 1;
    for (let m = 0; m <= fim; m++) pontosRampa.push({ x: m, y: rampa > 0 ? v.prod * Math.min(m / rampa, 1) : v.prod });
    return {
      kpis: [
        { nome: 'Clientes necessários por mês', valor: num(clientes, 0), nota: 'meta de MRR ÷ mensalidade, arredondado para cima' },
        { nome: 'Vendedores necessários', valor: num(necessarios, 0), nota: `${num(clientes, 0)} clientes ÷ ${num(v.prod, 1)} por vendedor` },
        { nome: saldo >= 0 ? 'Folga de vendedores' : 'Déficit de vendedores', valor: num(Math.abs(saldo), 0), nota: `${num(v.atuais, 0)} atuais contra ${num(necessarios, 0)} necessários`, selo: tipo === 'good' ? ['good', 'cobre a meta'] : tipo === 'warn' ? ['warn', 'quase lá'] : ['bad', 'faltam muitos'] },
        { nome: 'Contratações a fazer', valor: num(contratar, 0), nota: rampa > 0 && contratar > 0 ? `contratar ${num(rampa, 0)} meses antes do pleno` : 'para cobrir a meta' },
        { nome: 'Capacidade atual', valor: num(capAtual, 1) + ' clientes/mês', nota: `${pct(cobertura, 0)} do necessário` },
      ],
      paineis: [
        { tipo: 'barras', titulo: 'Capacidade atual contra a necessária, em clientes por mês', formato: 'num',
          dados: [{ rotulo: 'Capacidade atual', valor: capAtual, tom: 'hachurado' }, { rotulo: 'Necessária', valor: clientes, tom: 'cheio' }] },
        { tipo: 'linha', titulo: 'Clientes por mês de um vendedor novo durante a rampa', formato: 'num', eixoX: 'meses desde a contratação', linhaZero: true,
          series: [{ nome: 'Um vendedor novo', pontos: pontosRampa }], marcas: [{ x: rampa, y: v.prod, rotulo: 'pleno' }] },
      ],
      diagnostico: {
        tipo,
        titulo: { good: 'O time atual cobre a meta', warn: 'Faltam poucos vendedores', bad: 'O time atual não chega na meta' }[tipo],
        texto: 'Converte a meta de MRR em clientes e em vendedores, considerando que o vendedor novo leva meses para render o pleno.',
        pontos,
      },
    };
  },
});
})();
