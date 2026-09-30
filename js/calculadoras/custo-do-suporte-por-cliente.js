(() => {
registrar({
  id: 'custo-do-suporte-por-cliente',
  nome: 'Custo do suporte por cliente',
  categoria: 'Retenção e Expansão',
  descricao: 'Quanto o suporte custa por cliente e quanto sobra se os tickets evitáveis sumirem com documentação e autoatendimento.',
  termos: 'custo de suporte suporte por cliente tickets por cliente custo por ticket autoatendimento documentação base de conhecimento help center tickets evitáveis deflexão economia de suporte atendimento quanto gasto com suporte',
  campos: [
    { id: 'tickets', rotulo: 'Tickets por mês', valor: 900 },
    { id: 'custoTime', rotulo: 'Custo mensal do time de suporte', prefixo: 'R$', valor: 22000, dica: 'Salários, encargos e ferramentas. Usamos o custo total do time, e não um custo por ticket, porque é o número que o financeiro fecha.' },
    { id: 'clientes', rotulo: 'Clientes ativos', valor: 400 },
    { id: 'mensalidade', rotulo: 'Mensalidade média', prefixo: 'R$', valor: 297, opcional: true, dica: '0 = não informado.' },
    { id: 'evitaveis', rotulo: 'Tickets evitáveis com autoatendimento', sufixo: '%', valor: 20, max: 100, dica: 'Hipótese sua: parte dos tickets que um artigo ou fluxo de ajuda resolveria.' },
  ],
  calcular(v) {
    const { brl, num, pct } = fmt;
    if (!(v.tickets > 0) || !(v.custoTime > 0) || !(v.clientes > 0)) return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe tickets por mês, custo mensal do time e clientes ativos.' } };
    const porTicket = v.custoTime / v.tickets;
    const porCliente = v.custoTime / v.clientes;
    const tpc = v.tickets / v.clientes;
    const temMens = v.mensalidade > 0;
    const parte = temMens ? porCliente / v.mensalidade : NaN;
    const evit = v.tickets * v.evitaveis / 100;
    const economia = evit * porTicket;
    const depois = v.custoTime - economia;
    const depoisCli = depois / v.clientes;
    const tipo = !temMens ? 'warn' : parte <= 0.1 ? 'good' : parte <= 0.2 ? 'warn' : 'bad';
    const pontos = [
      `O suporte recebe ${num(tpc, 1)} tickets por cliente por mês e custa ${brl(porCliente, 2)} por cliente, ou ${brl(porTicket, 2)} por ticket.`,
      temMens ? `Isso consome ${pct(parte)} da mensalidade de ${brl(v.mensalidade)} antes de qualquer outro custo.` : 'Informe a mensalidade média para ver quanto do preço o suporte consome.',
      `Se os ${num(evit, 0)} tickets evitáveis (${num(v.evitaveis, 0)}%) sumissem, o custo cairia ${brl(economia)} por mês, ${brl(economia * 12)} por ano, para ${brl(depoisCli, 2)} por cliente.`,
      'Premissa: o custo do time cai na mesma proporção dos tickets. Na prática a economia só aparece se você reduzir horas, contratações ou ferramentas, ou se o time absorver crescimento sem contratar.',
    ];
    return {
      kpis: [
        { nome: 'Custo por cliente', valor: brl(porCliente, 2), nota: 'custo do time ÷ clientes ativos', selo: tipo === 'good' ? ['good', 'leve'] : tipo === 'warn' ? ['warn', temMens ? 'atenção' : 'falta a mensalidade'] : ['bad', 'pesado'] },
        { nome: 'Tickets por cliente', valor: num(tpc, 1), nota: 'por mês' },
        { nome: 'Custo por ticket', valor: brl(porTicket, 2), nota: 'custo do time ÷ tickets' },
        { nome: '% da mensalidade', valor: temMens ? pct(parte) : '—', nota: 'custo por cliente ÷ mensalidade' },
        { nome: 'Economia mensal possível', valor: brl(economia), nota: 'tickets evitáveis × custo por ticket' },
        { nome: 'Economia anual possível', valor: brl(economia * 12), nota: 'economia mensal × 12' },
      ],
      paineis: [
        { tipo: 'barras', titulo: 'Custo de suporte por cliente, por mês', formato: 'brl2', dados: [{ rotulo: 'Hoje', valor: porCliente, tom: 'cheio' }, { rotulo: 'Sem os evitáveis', valor: depoisCli, tom: 'hachurado' }] },
        { tipo: 'composicao', titulo: 'Tickets evitáveis e necessários', formato: 'int', partes: [{ rotulo: 'Necessários', valor: v.tickets - evit, tom: 'cheio' }, { rotulo: 'Evitáveis', valor: evit, tom: 'vazado' }] },
      ],
      diagnostico: {
        tipo,
        titulo: tipo === 'good' ? 'O suporte pesa pouco na mensalidade' : tipo === 'warn' ? (temMens ? 'O suporte pesa na mensalidade' : 'Informe a mensalidade para fechar o veredito') : 'O suporte consome uma fatia grande da mensalidade',
        texto: temMens
          ? `O suporte custa ${pct(parte)} da mensalidade. Os cortes (até 10% leve, acima de 20% pesado) são critério desta calculadora, não benchmark de mercado. A economia depende da sua hipótese de ${num(v.evitaveis, 0)}% de tickets evitáveis.`
          : 'Sem a mensalidade não dá para medir o peso do suporte no preço. O custo por cliente e a economia possível já estão calculados.',
        pontos,
      },
    };
  },
});
})();
