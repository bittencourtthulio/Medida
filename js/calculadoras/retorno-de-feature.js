(() => {
registrar({
  id: 'retorno-de-feature',
  nome: 'Retorno de funcionalidade',
  categoria: 'Produtos e Inovação',
  descricao: 'Essa funcionalidade se paga? Compare o custo de construir e manter com o ganho que você espera.',
  campos: [
    { id: 'horas', rotulo: 'Horas para construir', valor: 240 },
    { id: 'custoHora', rotulo: 'Custo da hora', prefixo: 'R$', valor: 120 },
    { id: 'manut', rotulo: 'Custo mensal de manter', prefixo: 'R$', valor: 600, dica: 'Suporte, correções e infra adicional.' },
    { id: 'usuarios', rotulo: 'Clientes que usariam', valor: 150 },
    { id: 'ganho', rotulo: 'Receita adicional por cliente/mês', prefixo: 'R$', valor: 20, dica: 'Aumento de mensalidade ou de conversão, por cliente que usa. Hipótese sua.' },
    { id: 'base', rotulo: 'Clientes na base', valor: 600, opcional: true },
    { id: 'ticket', rotulo: 'Ticket mensal médio', prefixo: 'R$', valor: 400, opcional: true },
    { id: 'reducaoChurn', rotulo: 'Redução de churn esperada', sufixo: 'p.p.', max: 100, valor: 0.5, opcional: true, dica: 'Pontos percentuais por mês. Ex.: de 3% para 2,5% = 0,5.' },
  ],
  calcular(v) {
    const { brl, num, pct } = fmt;
    const custo = v.horas * v.custoHora;
    const adicional = v.usuarios * v.ganho;
    const preservada = v.base * (v.reducaoChurn / 100) * v.ticket;
    const bruto = adicional + preservada;
    if (!(custo > 0) || !(bruto > 0)) {
      return {
        kpis: [{ nome: 'Custo de construir', valor: brl(custo), nota: 'horas × custo da hora' }],
        diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe as horas e o custo da hora, além de algum ganho esperado (receita adicional por cliente ou redução de churn) para calcular o retorno.' },
      };
    }
    const liquido = bruto - v.manut;
    const payback = liquido > 0 ? custo / liquido : NaN;
    const retorno12 = liquido * 12 - custo;
    const tipo = liquido <= 0 ? 'bad' : payback <= 12 ? 'good' : payback <= 24 ? 'warn' : 'bad';
    // Ganho mínimo por cliente (além do churn) para pagar em 12 meses.
    const minimo = v.usuarios > 0 ? (custo / 12 + v.manut - preservada) / v.usuarios : NaN;
    const pontos = [
      `Construir custa ${brl(custo)} (${num(v.horas, 0)} h × ${brl(v.custoHora)}) e manter custa ${brl(v.manut)} por mês. Os ganhos abaixo são hipóteses suas: a Medida não mede se os clientes vão pagar ou ficar por causa disso.`,
      `Receita adicional: ${num(v.usuarios, 0)} clientes × ${brl(v.ganho)} = ${brl(adicional)} por mês.`,
    ];
    if (preservada > 0) pontos.push(`Receita preservada: ${num(v.base, 0)} clientes × ${num(v.reducaoChurn, 2)} p.p. × ${brl(v.ticket)} = ${brl(preservada)} por mês. A conta conta só o efeito de um mês, sem acumular, para não inflar o retorno.`);
    if (liquido <= 0) {
      pontos.push(`Com esses números o ganho (${brl(bruto)}) não cobre nem a manutenção (${brl(v.manut)}): a funcionalidade custa mais do que rende.`);
    } else {
      pontos.push(`Ganho líquido de ${brl(liquido)} por mês: o custo de construir se paga em ${fmt.meses(payback)}. Em 12 meses o retorno é ${brl(retorno12)}.`);
    }
    if (isFinite(minimo)) {
      pontos.push(minimo <= 0
        ? 'A redução de churn sozinha já paga a funcionalidade em 12 meses, sem precisar de receita adicional por cliente.'
        : `Para pagar em 12 meses, cada cliente que usa precisa gerar pelo menos ${brl(minimo)} a mais por mês (hoje: ${brl(v.ganho)}). Pergunte a clientes reais se esse valor é plausível antes de construir.`);
    }
    pontos.push(v.usuarios > 0
      ? `Teste de estresse: se só metade dos ${num(v.usuarios, 0)} clientes usar, a receita adicional cai para ${brl(adicional / 2)} por mês.`
      : 'Sem clientes que usariam, o ganho vem só da redução de churn: valide se ela é realista.');
    return {
      kpis: [
        { nome: 'Custo de construir', valor: brl(custo), nota: 'horas × custo da hora' },
        { nome: 'Receita adicional', valor: brl(adicional), nota: `${num(v.usuarios, 0)} clientes × ${brl(v.ganho)} por mês` },
        { nome: 'Receita preservada', valor: brl(preservada), nota: 'base × pontos de churn × ticket, por mês' },
        { nome: 'Payback', valor: liquido > 0 ? fmt.meses(payback) : '—', nota: 'custo ÷ (ganho − manutenção)', selo: tipo === 'good' ? ['good', 'até 12 meses'] : tipo === 'warn' ? ['warn', '13 a 24 meses'] : ['bad', liquido <= 0 ? 'não se paga' : 'mais de 24 meses'] },
        { nome: 'Retorno em 12 meses', valor: brl(retorno12), nota: '12 × ganho líquido − custo de construir' },
        { nome: 'Ganho mínimo por cliente', valor: isFinite(minimo) ? (minimo <= 0 ? 'R$ 0' : brl(minimo, 2)) : '—', nota: 'por mês, para pagar em 12 meses' },
      ],
      diagnostico: {
        tipo,
        titulo: liquido <= 0 ? 'A funcionalidade não cobre o próprio custo' : tipo === 'good' ? 'A funcionalidade se paga em até 12 meses' : tipo === 'warn' ? 'Se paga, mas devagar' : 'Retorno distante demais',
        texto: 'Compara o custo de construir e manter com o ganho que você espera em receita adicional e em churn evitado.',
        pontos,
      },
    };
  },
});
})();
