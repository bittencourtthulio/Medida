(() => {
registrar({
  id: 'funil-trafego',
  nome: 'Funil de tráfego pago',
  categoria: 'Aquisição',
  descricao: 'Seu tráfego dá lucro? CPL, CPA e ROAS do clique ao cliente, contra o ROAS de equilíbrio.',
  campos: [
    { id: 'invest', rotulo: 'Investimento no período', prefixo: 'R$', valor: 10000 },
    { id: 'cliques', rotulo: 'Cliques', valor: 5000 },
    { id: 'leads', rotulo: 'Leads', valor: 400 },
    { id: 'vendas', rotulo: 'Clientes fechados', valor: 20 },
    { id: 'ticket', rotulo: 'Receita por cliente (1º pagamento)', prefixo: 'R$', valor: 1500 },
    { id: 'margem', rotulo: 'Margem de contribuição', sufixo: '%', valor: 60, max: 100, dica: 'O que sobra da mensalidade depois dos custos variáveis (infra por cliente, impostos, gateway, suporte).' },
  ],
  calcular(v) {
    const { brl, num, pct } = fmt;
    if (!(v.invest > 0)) return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe o investimento.' } };
    const m = v.margem / 100;
    const receita = v.vendas * v.ticket;
    const lucro = receita * m - v.invest;
    const roas = receita / v.invest;
    const roasEq = m > 0 ? 1 / m : Infinity;
    const cpa = v.vendas > 0 ? v.invest / v.vendas : NaN;
    const cpaMax = v.ticket * m;
    const txLead = v.cliques > 0 ? v.leads / v.cliques : NaN;
    const txVenda = v.leads > 0 ? v.vendas / v.leads : NaN;
    const tipo = roas >= roasEq * 1.5 ? 'good' : roas >= roasEq ? 'warn' : 'bad';
    const pontos = [
      `O ROAS de equilíbrio é ${isFinite(roasEq) ? num(roasEq, 2) + 'x' : '∞'} (1 ÷ margem); o seu está em ${num(roas, 2)}x.`,
      isNaN(cpa) ? 'Sem clientes fechados no período, não há CPA para avaliar.' : `Você paga ${brl(cpa)} por cliente e o teto sem prejuízo é ${brl(cpaMax)}.`,
    ];
    if (txVenda > 0) pontos.push(`Aumentar a conversão lead → cliente em 20% reduziria o CPA para ${brl(cpa / 1.2)}.`);
    if (tipo === 'bad') pontos.push('Antes de aumentar verba, conserte o funil: escalar com ROAS abaixo do equilíbrio aumenta o prejuízo.');
    return {
      kpis: [
        { nome: 'ROAS', valor: num(roas, 2) + 'x', nota: `equilíbrio em ${isFinite(roasEq) ? num(roasEq, 2) + 'x' : '∞'}`, selo: tipo === 'good' ? ['good', 'lucrativo'] : tipo === 'warn' ? ['warn', 'no limite'] : ['bad', 'prejuízo'] },
        { nome: 'Lucro do período', valor: brl(lucro), nota: 'margem de contribuição − investimento' },
        { nome: 'Receita', valor: brl(receita), nota: `${num(v.vendas, 0)} clientes × ${brl(v.ticket)}` },
        { nome: 'CPA (custo por cliente)', valor: brl(cpa), nota: `teto: ${brl(cpaMax)}` },
        { nome: 'CPL (custo por lead)', valor: brl(v.leads > 0 ? v.invest / v.leads : NaN), nota: `${num(v.leads, 0)} leads` },
        { nome: 'CPC (custo por clique)', valor: brl(v.cliques > 0 ? v.invest / v.cliques : NaN, 2), nota: `${num(v.cliques, 0)} cliques` },
        { nome: 'Clique → lead', valor: pct(txLead), nota: 'conversão da página' },
        { nome: 'Lead → cliente', valor: pct(txVenda), nota: 'conversão do comercial' },
      ],
      paineis: [
        { tipo: 'funil', titulo: 'Do clique ao cliente', formato: 'int',
          etapas: [{ rotulo: 'Cliques', valor: v.cliques }, { rotulo: 'Leads', valor: v.leads }, { rotulo: 'Clientes', valor: v.vendas }] },
        { tipo: 'barras', titulo: 'CPA contra o teto sem prejuízo', formato: 'brl',
          dados: isNaN(cpa) ? [{ rotulo: 'Teto de CPA', valor: cpaMax, tom: 'hachurado' }] : [{ rotulo: 'Seu CPA', valor: cpa, tom: 'cheio' }, { rotulo: 'Teto de CPA', valor: cpaMax, tom: 'hachurado' }] },
        { tipo: 'composicao', titulo: 'Para onde vai a receita', formato: 'brl',
          partes: [{ rotulo: 'Investimento em tráfego', valor: v.invest }, { rotulo: 'Custos variáveis', valor: Math.max(0, receita * (1 - m)) }, { rotulo: 'Lucro', valor: Math.max(0, lucro) }] },
      ],
      diagnostico: {
        tipo,
        titulo: { good: 'Funil lucrativo', warn: 'Funil no limite do equilíbrio', bad: 'Funil dando prejuízo' }[tipo],
        texto: { good: 'Cada real investido volta com folga sobre o ponto de equilíbrio.', warn: 'Você empata ou lucra pouco; qualquer piora de conversão vira prejuízo.', bad: 'A margem não cobre o custo de aquisição.' }[tipo],
        pontos,
      },
    };
  },
});
})();
