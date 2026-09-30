(() => {
registrar({
  id: 'churn',
  nome: 'Churn e retenção',
  categoria: 'Retenção e Expansão',
  descricao: 'Quanto da base vaza por mês, quanto custa em MRR e se os novos clientes cobrem o buraco.',
  campos: [
    { id: 'inicio', rotulo: 'Clientes no início do mês', valor: 400 },
    { id: 'novos', rotulo: 'Clientes novos no mês', valor: 30 },
    { id: 'perdidos', rotulo: 'Clientes perdidos no mês', valor: 16, dica: 'Cancelamentos e inadimplentes que saíram da base.' },
    { id: 'ticket', rotulo: 'Ticket médio (mensalidade)', prefixo: 'R$', valor: 297 },
  ],
  calcular(v) {
    const { brl, num, pct } = fmt;
    if (!(v.inicio > 0)) return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe os clientes no início do mês.' } };
    const churn = v.perdidos / v.inicio;
    const retencao = 1 - churn;
    const vida = churn > 0 ? 1 / churn : Infinity;
    const churnAnual = 1 - Math.pow(1 - Math.min(churn, 1), 12);
    const liquido = v.novos - v.perdidos;
    const fim = v.inicio + liquido;
    const mrrPerdido = v.perdidos * v.ticket;
    const mrrNovo = v.novos * v.ticket;
    const tipo = churn <= 0.02 ? 'good' : churn <= 0.05 ? 'warn' : 'bad';
    const pontos = [
      `Perder ${pct(churn)} por mês equivale a perder ${pct(churnAnual)} da base em um ano.`,
      `O churn consome ${brl(mrrPerdido)} de MRR por mês; os novos clientes trazem ${brl(mrrNovo)}.`,
      liquido >= 0
        ? `A base cresce ${num(liquido, 0)} clientes no mês (${pct(liquido / v.inicio)}).`
        : `A base encolhe ${num(-liquido, 0)} clientes no mês: a aquisição não cobre os cancelamentos.`,
    ];
    if (churn > 0.02) pontos.push(`Cada ponto percentual de churn a menos preserva cerca de ${brl(v.inicio * 0.01 * v.ticket)} de MRR por mês.`);
    return {
      kpis: [
        { nome: 'Churn mensal de clientes', valor: pct(churn), nota: `${num(v.perdidos, 0)} de ${num(v.inicio, 0)} clientes`, selo: tipo === 'good' ? ['good', 'excelente'] : tipo === 'warn' ? ['warn', 'atenção'] : ['bad', 'crítico'] },
        { nome: 'Retenção mensal', valor: pct(retencao), nota: 'clientes que ficaram' },
        { nome: 'Vida média do cliente', valor: isFinite(vida) ? num(vida) + ' meses' : '∞', nota: '1 ÷ churn mensal' },
        { nome: 'Churn anualizado', valor: pct(churnAnual), nota: 'mantido o ritmo atual' },
        { nome: 'MRR perdido', valor: brl(mrrPerdido), nota: 'por mês, só com cancelamentos' },
        { nome: 'Crescimento líquido', valor: (liquido >= 0 ? '+' : '') + num(liquido, 0), nota: `base final: ${num(fim, 0)} clientes` },
      ],
      diagnostico: {
        tipo,
        titulo: { good: 'Retenção forte', warn: 'Churn em zona de atenção', bad: 'Churn alto: a base está vazando' }[tipo],
        texto: 'Regra de bolso, não meta: David Skok (For Entrepreneurs) vê churn de receita acima de 2% ao mês como sinal de problema. Entre 2% e 5% é comum em SaaS para PME, mas pede atenção. Varia com porte e ticket.',
        pontos,
      },
    };
  },
});
})();
