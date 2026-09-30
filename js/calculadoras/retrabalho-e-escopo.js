(() => {
registrar({
  id: 'retrabalho-e-escopo',
  nome: 'Retrabalho e escopo aberto',
  categoria: 'Entrega e Operação',
  descricao: 'Quanto o retrabalho e o escopo aberto custam por mês, e quantas horas voltam para o time se você cortar pela metade.',
  campos: [
    { id: 'horas', rotulo: 'Horas totais do time de desenvolvimento no mês', valor: 1200, dica: 'Horas pagas do time que produz: por exemplo, 8 pessoas × 150 h.' },
    { id: 'retrabalho', rotulo: 'Horas em retrabalho e correção de bug', sufixo: '%', valor: 12, max: 100, dica: 'Bugs de entrega anterior, refazer o que o cliente rejeitou, correção de erro de requisito.' },
    { id: 'escopo', rotulo: 'Horas em mudança de escopo não cobrada', sufixo: '%', valor: 8, max: 100, dica: 'Pedidos extras atendidos sem aditivo, ajuste de escopo sem cobrança.' },
    { id: 'custoHora', rotulo: 'Custo médio da hora', prefixo: 'R$', valor: 90 },
  ],
  calcular(v) {
    const { brl, num, pct } = fmt;
    if (!(v.horas > 0)) {
      return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe as horas totais do time no mês.' } };
    }
    const fr = v.retrabalho / 100, fe = v.escopo / 100;
    const fracao = Math.min(1, fr + fe);
    const hRet = v.horas * fr, hEsc = v.horas * fe;
    const hPerdidas = Math.min(v.horas, hRet + hEsc);
    const custoMes = hPerdidas * v.custoHora;
    const custoAno = custoMes * 12;
    const hRecup = hPerdidas / 2;
    const tipo = fracao <= 0.10 ? 'good' : fracao <= 0.20 ? 'warn' : 'bad';
    const maior = hRet >= hEsc ? 'retrabalho' : 'escopo';
    const pontos = [
      `${num(hPerdidas, 0)} horas por mês não viram entrega nova nem receita: são ${brl(custoMes)} por mês e ${brl(custoAno)} por ano.`,
      `Retrabalho: ${num(hRet, 0)} h (${brl(hRet * v.custoHora)}). Escopo não cobrado: ${num(hEsc, 0)} h (${brl(hEsc * v.custoHora)}).`,
    ];
    if (hPerdidas > 0) pontos.push(
      maior === 'retrabalho'
        ? 'O retrabalho pesa mais. Onde agir primeiro: defina o que é "pronto" antes de começar, revise requisitos com o cliente e trate a causa dos bugs que voltam.'
        : 'O escopo aberto pesa mais. Onde agir primeiro: cobrar aditivo por pedido fora do combinado, ou registrar e negociar cada mudança antes de executar.');
    pontos.push(`Cortar pela metade devolve ${num(hRecup, 0)} horas por mês (${brl(hRecup * v.custoHora)}), que podem virar entrega faturável ou prazo menor.`);
    return {
      kpis: [
        { nome: 'Capacidade consumida', valor: pct(fracao), nota: 'retrabalho + escopo não cobrado', selo: tipo === 'good' ? ['good', 'baixo'] : tipo === 'warn' ? ['warn', 'atenção'] : ['bad', 'alto'] },
        { nome: 'Horas perdidas por mês', valor: num(hPerdidas, 0) + ' h', nota: `de ${num(v.horas, 0)} h do time` },
        { nome: 'Custo por mês', valor: brl(custoMes), nota: 'horas perdidas × custo da hora' },
        { nome: 'Custo por ano', valor: brl(custoAno), nota: 'mantido o ritmo atual' },
        { nome: 'Horas recuperáveis', valor: num(hRecup, 0) + ' h/mês', nota: 'se o desperdício cair pela metade' },
        { nome: 'R$ recuperáveis', valor: brl(hRecup * v.custoHora), nota: 'por mês, na mesma hipótese' },
      ],
      diagnostico: {
        tipo,
        titulo: { good: 'Desperdício sob controle', warn: 'Uma parte relevante da capacidade some', bad: 'O time gasta muita energia sem entregar valor novo' }[tipo],
        texto: `Regra de bolso, não meta: até 10% das horas em retrabalho e escopo aberto é tolerável; acima de 20% o time passa a trabalhar para compensar o próprio desperdício. Hoje são ${pct(fracao)}.`,
        pontos,
      },
    };
  },
});
})();
