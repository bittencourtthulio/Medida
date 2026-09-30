(() => {
registrar({
  id: 'utilizacao-do-time',
  nome: 'Utilização do time',
  categoria: 'Entrega e Operação',
  descricao: 'Seu time está vendendo as horas que tem? Veja a utilização, a receita deixada na mesa e a margem do time.',
  campos: [
    { id: 'pessoas', rotulo: 'Pessoas alocáveis', valor: 8, dica: 'Quem pode ser vendido em projeto. Gestão e comercial ficam de fora.' },
    { id: 'horasDisp', rotulo: 'Horas disponíveis por pessoa no mês', valor: 140, dica: 'Horas produtivas, já sem férias, feriados e reuniões internas.' },
    { id: 'horasFat', rotulo: 'Horas faturadas no mês', valor: 784, dica: 'Horas vendidas e cobradas do cliente.' },
    { id: 'valorHora', rotulo: 'Valor médio da hora vendida', prefixo: 'R$', valor: 180 },
    { id: 'custoHora', rotulo: 'Custo médio da hora', prefixo: 'R$', valor: 95, dica: 'Custo total do time ÷ horas disponíveis.' },
  ],
  calcular(v) {
    const { brl, num, pct } = fmt;
    const capacidade = v.pessoas * v.horasDisp;
    if (!(capacidade > 0) || !(v.valorHora > 0)) {
      return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe pessoas, horas disponíveis e o valor da hora vendida.' } };
    }
    const util = v.horasFat / capacidade;
    const equilibrio = v.custoHora / v.valorHora;
    const receita = v.horasFat * v.valorHora;
    const custoTime = capacidade * v.custoHora;
    const margem = receita - custoTime;
    const margemPct = receita > 0 ? margem / receita : NaN;
    const ociosas = Math.max(0, capacidade - v.horasFat);
    const perdida = ociosas * v.valorHora;
    const folga = util - equilibrio;
    const horasEquilibrio = equilibrio * capacidade;
    const pp = x => (x >= 0 ? '+' : '') + num(x * 100) + ' p.p.';
    const tipo = folga < 0 ? 'bad' : folga < 0.10 ? 'warn' : 'good';
    const pontos = [
      `A utilização de equilíbrio é ${pct(equilibrio)} (custo da hora ${brl(v.custoHora)} ÷ valor da hora ${brl(v.valorHora)}): abaixo disso o time não cobre o próprio custo. Você está em ${pct(util)}, ${pp(folga)} do equilíbrio.`,
      `O custo do time (${brl(custoTime)}) é pago vendendo ou não. Equilíbrio exige ${num(horasEquilibrio, 0)} h faturadas; você faturou ${num(v.horasFat, 0)} h.`,
      ociosas > 0
        ? `${num(ociosas, 0)} horas ficaram sem venda. A ${brl(v.valorHora)} por hora, isso é ${brl(perdida)} por mês que o time poderia ter faturado.`
        : 'Todas as horas disponíveis foram vendidas. Se passa de 100%, o time está em hora extra: confira se a capacidade informada está correta.',
    ];
    if (folga < 0) pontos.push('Onde agir primeiro: o time custa mais do que vende. Preencha a ociosidade com projeto vendido antes de pensar em contratar.');
    else if (tipo === 'warn') pontos.push(`Margem de segurança curta. Regra de bolso: menos de 10 pontos acima do equilíbrio deixa o mês vulnerável a qualquer projeto atrasado ou cliente perdido. Cada 1 ponto de utilização vale cerca de ${brl(capacidade * 0.01 * v.valorHora)} por mês.`);
    else pontos.push(`Há folga sobre o equilíbrio. Antes de contratar, confira se a demanda sustenta mais capacidade; cada 1 ponto de utilização vale cerca de ${brl(capacidade * 0.01 * v.valorHora)} por mês.`);
    return {
      kpis: [
        { nome: 'Utilização', valor: pct(util), nota: `${num(v.horasFat, 0)} h ÷ ${num(capacidade, 0)} h disponíveis`, selo: tipo === 'good' ? ['good', 'acima do equilíbrio'] : tipo === 'warn' ? ['warn', 'folga curta'] : ['bad', 'abaixo do equilíbrio'] },
        { nome: 'Utilização de equilíbrio', valor: pct(equilibrio), nota: 'custo da hora ÷ valor da hora' },
        { nome: 'Receita mensal do time', valor: brl(receita), nota: 'horas faturadas × valor da hora' },
        { nome: 'Receita perdida pela ociosidade', valor: brl(perdida), nota: `${num(ociosas, 0)} h não faturadas × valor da hora` },
        { nome: 'Margem de contribuição do time', valor: brl(margem), nota: isFinite(margemPct) ? `${pct(margemPct)} da receita, depois do custo de todas as horas` : 'receita − custo do time' },
      ],
      diagnostico: {
        tipo,
        titulo: { good: 'O time cobre o custo com folga', warn: 'O time cobre o custo, mas com pouca folga', bad: 'O time não cobre o próprio custo' }[tipo],
        texto: 'Compara a utilização real com o ponto em que o time paga a si mesmo, calculado com os seus números de custo e preço da hora.',
        pontos,
      },
    };
  },
});
})();
