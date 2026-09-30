(() => {
registrar({
  id: 'custo-de-implantacao',
  nome: 'Custo de implantação',
  categoria: 'Entrega e Operação',
  termos: 'implantação onboarding setup fee taxa de implantação custo de onboarding cobrar implantação payback da implantação time to value integração treinamento cliente novo',
  descricao: 'A implantação se paga ou custa para entrar o cliente? Veja o lucro por cliente, o custo mensal e o payback.',
  campos: [
    { id: 'horas', rotulo: 'Horas de implantação por cliente', valor: 40, dica: 'Onboarding, configuração, integração e treinamento.' },
    { id: 'custoHora', rotulo: 'Custo da hora', prefixo: 'R$', valor: 90 },
    { id: 'cobrado', rotulo: 'Valor cobrado pela implantação', prefixo: 'R$', valor: 2500, dica: 'Por cliente. Zero se a implantação é gratuita.' },
    { id: 'novos', rotulo: 'Clientes novos por mês', valor: 10 },
    { id: 'mensalidade', rotulo: 'Mensalidade', prefixo: 'R$', valor: 600 },
    { id: 'margemVar', rotulo: 'Margem variável da mensalidade', sufixo: '%', valor: 75, max: 100, dica: 'O que sobra da mensalidade depois de infra, suporte e impostos.' },
    { id: 'dias', rotulo: 'Dias até o cliente estar usando', valor: 30, dica: 'Do fechamento até o cliente ativo e usando o produto.' },
  ],
  calcular(v) {
    const { brl, num, pct } = fmt;
    if (!(v.horas > 0) || !(v.custoHora > 0)) {
      return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe as horas de implantação por cliente e o custo da hora.' } };
    }
    const custo = v.horas * v.custoHora;
    const lucro = v.cobrado - custo;
    const margem = v.cobrado > 0 ? lucro / v.cobrado : NaN;
    const custoMes = custo * v.novos;
    const resultadoMes = lucro * v.novos;
    const mcMensal = v.mensalidade * (v.margemVar / 100);
    const payback = lucro < 0 ? (mcMensal > 0 ? -lucro / mcMensal : Infinity) : 0;
    const paradoCli = v.mensalidade * v.dias / 30;
    const paradoMes = paradoCli * v.novos;
    const diaValor = v.mensalidade / 30;
    let tipo;
    if (lucro >= 0) tipo = 'good';
    else tipo = payback <= 3 ? 'warn' : 'bad';
    const pontos = [
      lucro >= 0
        ? `Cada implantação custa ${brl(custo)} e devolve ${brl(v.cobrado)}: sobram ${brl(lucro)} por cliente, ${brl(resultadoMes)} por mês com ${num(v.novos, 0)} clientes novos. A implantação ajuda a pagar a aquisição.`
        : `Cada implantação custa ${brl(custo)} e você cobra ${brl(v.cobrado)}: o cliente entra com ${brl(-lucro)} de prejuízo. Com ${num(v.novos, 0)} clientes novos, são ${brl(-resultadoMes)} por mês.`,
    ];
    if (lucro < 0) {
      pontos.push(isFinite(payback)
        ? `A margem da mensalidade (${brl(mcMensal)} por mês) repõe esse prejuízo em ${num(payback)} meses. Até lá o cliente ainda não deu retorno.`
        : 'A mensalidade não deixa margem: o prejuízo da implantação nunca volta.');
      pontos.push(`Para empatar, cobre ${brl(custo)} por implantação, ou reduza para ${num(v.cobrado / v.custoHora, 0)} horas de trabalho por cliente.`);
    }
    if (v.dias > 0 && v.mensalidade > 0) pontos.push(`Sinal de atenção, não perda contábil: durante os ${num(v.dias, 0)} dias até o uso, ${brl(paradoCli)} de mensalidade por cliente ficam com valor ainda não percebido, ${brl(paradoMes)} por mês de novos clientes. Cada dia a menos de implantação tira cerca de ${brl(diaValor)} por cliente dessa zona, e reduz o risco de cancelar antes de usar.`);
    pontos.push(lucro < 0 ? 'Onde agir primeiro: padronizar a implantação para reduzir horas e cobrar por ela, antes de mexer no prazo.' : 'Onde agir primeiro: encurtar o prazo até o uso sem aumentar as horas, e acompanhar se o valor cobrado acompanha o custo real.');
    return {
      kpis: [
        { nome: lucro >= 0 ? 'Lucro da implantação' : 'Prejuízo da implantação', valor: brl(lucro), nota: 'por cliente: cobrado − custo', selo: tipo === 'good' ? ['good', 'se paga'] : tipo === 'warn' ? ['warn', 'payback curto'] : ['bad', 'custa para entrar'] },
        { nome: 'Custo por cliente', valor: brl(custo), nota: `${num(v.horas, 0)} h × ${brl(v.custoHora)}` },
        { nome: 'Margem da implantação', valor: pct(margem), nota: v.cobrado > 0 ? 'lucro ÷ valor cobrado' : 'implantação sem cobrança' },
        { nome: 'Custo total por mês', valor: brl(custoMes), nota: `${num(v.novos, 0)} clientes novos` },
        { nome: 'Resultado da implantação no mês', valor: brl(resultadoMes), nota: 'lucro por cliente × clientes novos' },
        ...(lucro < 0 ? [{ nome: 'Payback da implantação', valor: isFinite(payback) ? num(payback) + ' meses' : 'nunca', nota: 'prejuízo ÷ margem da mensalidade' }] : []),
        { nome: 'MRR em implantação', valor: brl(paradoMes), nota: `mensalidade × ${num(v.dias, 0)}/30 dias × novos: valor ainda não percebido pelo cliente` },
      ],
      paineis: [
        { tipo: 'barras', titulo: 'Valor cobrado contra custo, por cliente', formato: 'brl',
          dados: [{ rotulo: 'Cobrado', valor: v.cobrado, tom: 'cheio' }, { rotulo: 'Custo da implantação', valor: custo, tom: 'hachurado' }] },
        { tipo: 'cascata', titulo: 'Lucro da implantação por cliente', formato: 'brl',
          passos: [{ rotulo: 'Cobrado', valor: v.cobrado, total: true }, { rotulo: 'Custo das horas', valor: -custo }, { rotulo: 'Resultado', valor: lucro, total: true }] },
      ],
      diagnostico: {
        tipo,
        titulo: lucro >= 0 ? 'A implantação se paga' : tipo === 'warn' ? 'A implantação custa, mas a mensalidade repõe rápido' : 'O cliente entra com prejuízo e demora para compensar',
        texto: lucro >= 0
          ? 'O valor cobrado cobre as horas gastas. O que sobrar reduz o custo de aquisição.'
          : 'O valor cobrado não cobre as horas gastas. Regra de bolso: se a margem da mensalidade leva mais de 3 meses para repor, a implantação pesa no CAC e o cliente precisa ficar tempo demais para valer a pena.',
        pontos,
      },
    };
  },
});
})();
