(() => {
registrar({
  id: 'deflexao-de-suporte-com-ia',
  nome: 'IA no atendimento se paga?',
  categoria: 'Tecnologia e IA',
  descricao: 'Quanto a IA no suporte economiza por mês, em quanto tempo paga a implantação e quantas horas de atendimento libera?',
  termos: 'deflexao deflexao de tickets suporte atendimento chatbot bot ia no suporte agente de ia autoatendimento resolucao automatica custo por ticket help desk central de ajuda vale a pena colocar ia no atendimento economia suporte payback chat',
  campos: [
    { id: 'tickets', rotulo: 'Tickets por mês', valor: 2000 },
    { id: 'custoHum', rotulo: 'Custo por ticket atendido por humano', prefixo: 'R$', valor: 8, dica: 'Custo mensal do time de suporte ÷ tickets resolvidos por ele.' },
    { id: 'resolve', rotulo: 'Tickets resolvidos pela IA sem humano', sufixo: '%', valor: 35, max: 100, dica: 'Hipótese sua: meça em um piloto com uma parte dos tickets, não na demonstração do fornecedor.' },
    { id: 'custoIa', rotulo: 'Custo por conversa da IA', prefixo: 'R$', valor: 1.2, dica: 'Consumo de IA ou preço por resolução cobrado pela ferramenta. Confira na fatura ou no contrato.' },
    { id: 'fixo', rotulo: 'Custo mensal fixo da ferramenta', prefixo: 'R$', valor: 1500, opcional: true },
    { id: 'impl', rotulo: 'Custo de implantação (uma vez)', prefixo: 'R$', valor: 10000, opcional: true, dica: 'Configuração, base de conhecimento, integrações e treinamento do time.' },
    { id: 'minutos', rotulo: 'Minutos de atendimento por ticket', valor: 10, opcional: true, dica: 'Tempo médio humano por ticket. Com 0, o painel de horas fica de fora.' },
  ],
  calcular(v) {
    const { brl, num, pct, meses } = fmt;
    if (!(v.tickets > 0) || !(v.custoHum > 0)) {
      return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe os tickets por mês e o custo por ticket humano para calcular a economia com IA.' } };
    }
    const p = v.resolve / 100;
    const res = v.tickets * p;
    const humanos = v.tickets - res;
    const atual = v.tickets * v.custoHum;
    const iaVar = v.tickets * v.custoIa;
    const comIa = humanos * v.custoHum + iaVar + v.fixo;
    const liquida = atual - comIa;
    const payback = liquida > 0 ? v.impl / liquida : Infinity;
    const em12 = liquida * 12 - v.impl;
    const horas = res * v.minutos / 60;
    const minimo = v.custoHum > 0 ? (v.custoIa + v.fixo / v.tickets) / v.custoHum : NaN;
    const tipo = liquida <= 0 ? 'bad' : (em12 <= 0 || payback > 12) ? 'warn' : payback <= 6 ? 'good' : 'warn';
    const pontos = [
      `Com ${pct(p, 0)} dos tickets resolvidos pela IA, ${num(res, 0)} dos ${num(v.tickets, 0)} tickets saem do time humano e ${num(humanos, 0)} continuam com ele.`,
      `O atendimento custa ${brl(atual)} por mês hoje e ${brl(comIa)} com a IA (${brl(iaVar)} de conversas + ${brl(v.fixo)} fixos + ${brl(humanos * v.custoHum)} dos tickets humanos). A conta assume que toda conversa passa primeiro pela IA, inclusive as que ela não resolve.`,
    ];
    if (liquida <= 0) {
      pontos.push(`A IA custa mais do que economiza. Ela só se paga se resolver pelo menos ${pct(minimo, 0)} dos tickets (hoje a hipótese é ${pct(p, 0)}), ou se o custo por conversa e o custo fixo caírem.`);
    } else {
      pontos.push(`A economia líquida é ${brl(liquida)} por mês. ${v.impl > 0 ? `A implantação de ${brl(v.impl)} se paga em ${meses(payback)} e o saldo em 12 meses é ${brl(em12)}.` : `Em 12 meses a economia acumulada é ${brl(em12)}.`}`);
      pontos.push(`Ponto de virada: abaixo de ${pct(minimo, 0)} de resolução pela IA a economia líquida zera.`);
    }
    if (v.minutos > 0) pontos.push(`São ${num(horas, 0)} horas de atendimento liberadas por mês. Elas só viram dinheiro se o time absorver crescimento sem contratar ou migrar para trabalho de maior valor, como retenção e onboarding.`);
    pontos.push('O percentual de resolução pela IA é uma hipótese sua, não um resultado medido. Teste com parte dos tickets e acompanhe também a satisfação: um ticket "resolvido" que volta como reclamação custa duas vezes.');
    const serie = [{ x: 0, y: -v.impl }];
    for (let t = 1; t <= 12; t++) serie.push({ x: t, y: liquida * t - v.impl });
    const paineis = [
      { tipo: 'barras', titulo: 'Custo mensal do atendimento', formato: 'brl',
        dados: [{ rotulo: 'Hoje, só humanos', valor: atual, tom: 'cheio' }, { rotulo: 'Com IA', valor: comIa, tom: 'hachurado' }] },
      { tipo: 'composicao', titulo: 'Quem resolve os tickets', formato: 'int',
        partes: [{ rotulo: 'IA sem humano', valor: res, tom: 'cheio' }, { rotulo: 'Time humano', valor: humanos, tom: 'vazado' }] },
      { tipo: 'linha', titulo: 'Economia acumulada em 12 meses, já descontada a implantação', formato: 'brl', eixoX: 'meses', largo: true,
        series: [{ nome: 'Saldo acumulado', pontos: serie }],
        marcas: isFinite(payback) && payback > 0 && payback <= 12 ? [{ x: payback, y: 0, rotulo: `payback em ${num(payback)} m` }] : [] },
    ];
    return {
      kpis: [
        { nome: 'Tickets resolvidos pela IA', valor: num(res, 0), nota: `${pct(p, 0)} de ${num(v.tickets, 0)} tickets (hipótese sua)` },
        { nome: 'Custo mensal hoje', valor: brl(atual), nota: `${num(v.tickets, 0)} × ${brl(v.custoHum, 2)}` },
        { nome: 'Custo mensal com IA', valor: brl(comIa), nota: 'tickets humanos + conversas da IA + custo fixo' },
        { nome: 'Economia líquida por mês', valor: brl(liquida), nota: 'custo de hoje − custo com IA', selo: liquida > 0 ? ['good', 'positiva'] : ['bad', 'não se paga'] },
        { nome: 'Payback da implantação', valor: v.impl <= 0 ? 'imediato' : isFinite(payback) ? meses(payback) : 'não se paga', nota: `${brl(v.impl)} ÷ economia líquida` },
        { nome: 'Saldo em 12 meses', valor: brl(em12), nota: 'economia líquida × 12 − implantação' },
        ...(v.minutos > 0 ? [{ nome: 'Horas de atendimento liberadas', valor: num(horas, 0) + ' h', nota: `por mês: ${num(res, 0)} tickets × ${num(v.minutos, 0)} min ÷ 60` }] : []),
      ],
      diagnostico: {
        tipo,
        titulo: liquida <= 0 ? 'A IA não se paga no atendimento' : tipo === 'good' ? 'IA no atendimento se paga rápido' : em12 <= 0 ? 'IA não recupera o investimento em 12 meses' : 'IA se paga, mas com prazo longo',
        texto: liquida <= 0
          ? 'Com essa taxa de resolução, o custo da IA supera o que ela poupa. Antes de implantar, renegocie o custo por conversa, reduza o custo fixo ou confirme em piloto que a resolução é maior.'
          : `A economia de ${brl(liquida)} por mês depende da resolução de ${pct(p, 0)}, que é hipótese sua. Regra de bolso: investimentos que se pagam em até 6 meses costumam ser fáceis de aprovar; acima de 12, pedem outra razão além do custo.`,
        pontos,
      },
      paineis,
    };
  },
});
})();
