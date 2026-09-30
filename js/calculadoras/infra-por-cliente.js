(() => {
registrar({
  id: 'infra-por-cliente',
  nome: 'Infraestrutura por cliente',
  categoria: 'Tecnologia e IA',
  descricao: 'Quanto da sua margem a infraestrutura consome hoje e o que muda daqui a 12 meses se parte dela diluir com o crescimento?',
  campos: [
    { id: 'infra', rotulo: 'Custo mensal de infraestrutura', prefixo: 'R$', valor: 12000, dica: 'Nuvem, bancos, CDN, monitoramento, filas e armazenamento. Some as faturas do mês.' },
    { id: 'clientes', rotulo: 'Clientes ativos', valor: 300 },
    { id: 'ticket', rotulo: 'Mensalidade média', prefixo: 'R$', valor: 297 },
    { id: 'variavel', rotulo: 'Outros custos variáveis', sufixo: '%', max: 100, valor: 5, dica: 'Percentual da receita: gateway de pagamento, e-mail transacional, SMS e similares.' },
    { id: 'crescimento', rotulo: 'Crescimento esperado de clientes', sufixo: '% ao mês', valor: 6, opcional: true, dica: 'Crescimento líquido da base. Deixe em 0 para ver só a situação de hoje.' },
    { id: 'fixa', rotulo: 'Parte fixa da infraestrutura', sufixo: '%', max: 100, valor: 40, dica: 'Quanto da conta não cresce com os clientes (ambientes, monitoramento, bancos mínimos). Padrão de exemplo: ajuste com a sua fatura.' },
  ],
  calcular(v) {
    const { brl, num, pct } = fmt;
    const receita = v.clientes * v.ticket;
    if (!(v.clientes > 0) || !(v.ticket > 0)) {
      return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe os clientes ativos e a mensalidade média para calcular o peso da infraestrutura.' } };
    }
    const infraCli = v.infra / v.clientes;
    const infraPct = v.infra / receita;
    const varPct = v.variavel / 100;
    const margem = 1 - infraPct - varPct;
    const margemRs = receita * margem;
    const fixa = v.fixa / 100;
    const fator = Math.pow(1 + v.crescimento / 100, 12);
    const clientes12 = v.clientes * fator;
    const receita12 = clientes12 * v.ticket;
    const infraProp = v.infra * fator;
    const infraEscala = v.infra * (fixa + (1 - fixa) * fator);
    const pctProp = infraProp / receita12;
    const pctEscala = infraEscala / receita12;
    const margemEscala = 1 - pctEscala - varPct;
    const tipo = margem < 0.5 ? 'bad' : infraPct <= 0.1 ? 'good' : infraPct <= 0.2 ? 'warn' : 'bad';
    const cresce = v.crescimento > 0;
    const pontos = [
      `Cada cliente custa ${brl(infraCli, 2)} de infraestrutura por mês contra ${brl(v.ticket)} de mensalidade: a infraestrutura leva ${pct(infraPct)} da receita.`,
      `Depois de infraestrutura e de ${pct(varPct)} de custos variáveis, sobram ${pct(margem)} de margem bruta (${brl(margemRs)} por mês).`,
    ];
    if (cresce) {
      pontos.push(`Em 12 meses a base chega a ${num(clientes12, 0)} clientes. Se a infraestrutura crescer junto com eles, ela continua em ${pct(pctProp)} da receita e custa ${brl(infraProp)} por mês.`);
      pontos.push(`Com ${pct(fixa, 0)} da conta fixa, ela custa ${brl(infraEscala)} por mês e cai para ${pct(pctEscala)} da receita: a margem bruta vai de ${pct(margem)} para ${pct(margemEscala)}, um ganho de ${num((margemEscala - margem) * 100)} pontos percentuais.`);
    } else {
      pontos.push('Sem crescimento informado, não há diluição a medir. Preencha o crescimento mensal para ver o efeito da parte fixa no mês 12.');
    }
    if (infraPct > 0.1) pontos.push(`Onde agir primeiro: cortar 20% da conta de infraestrutura devolve ${brl(v.infra * 0.2)} por mês e sobe a margem em ${num(infraPct * 0.2 * 100)} pontos percentuais. Comece pelo item mais caro da fatura.`);
    if (v.fixa < 100 && infraPct > 0.1) pontos.push(`A parte variável (${brl(v.infra * (1 - fixa))} por mês) é a que escala com clientes: monitorar custo por cliente ajuda a achar quem consome mais do que paga.`);
    return {
      kpis: [
        { nome: 'Infraestrutura por cliente', valor: brl(infraCli, 2), nota: 'custo de infraestrutura ÷ clientes ativos' },
        { nome: 'Infraestrutura sobre a receita', valor: pct(infraPct), nota: `${brl(v.infra)} de ${brl(receita)} de receita`, selo: tipo === 'good' ? ['good', 'leve'] : tipo === 'warn' ? ['warn', 'pesada'] : ['bad', 'consome a margem'] },
        { nome: 'Margem bruta após infraestrutura', valor: pct(margem), nota: `receita − infraestrutura − ${pct(varPct)} de variáveis` },
        { nome: 'Margem bruta em R$', valor: brl(margemRs), nota: 'por mês, hoje' },
        ...(cresce ? [
          { nome: 'Infraestrutura no mês 12 (proporcional)', valor: brl(infraProp), nota: `${pct(pctProp)} da receita: tudo cresce com os clientes` },
          { nome: 'Infraestrutura no mês 12 (com escala)', valor: brl(infraEscala), nota: `${pct(pctEscala)} da receita: ${pct(fixa, 0)} da conta fixa` },
        ] : []),
      ],
      diagnostico: {
        tipo,
        titulo: { good: 'Infraestrutura leve para a receita', warn: 'Infraestrutura pesando na margem', bad: 'Infraestrutura consome margem demais' }[tipo],
        texto: `A infraestrutura leva ${pct(infraPct)} da receita e a margem bruta fica em ${pct(margem)}. Regra de bolso, não meta: até 10% da receita costuma ser confortável, acima de 20% pede revisão; depende do tipo de produto. O que interessa é a margem que sobra para pagar time, aquisição e lucro.`,
        pontos,
      },
    };
  },
});
})();
