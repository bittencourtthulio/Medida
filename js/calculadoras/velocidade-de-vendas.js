(() => {
registrar({
  id: 'velocidade-de-vendas',
  nome: 'Velocidade de vendas',
  categoria: 'Conversão',
  descricao: 'Quanto de receita seu processo comercial gera por dia, e qual alavanca mexe mais nesse número?',
  campos: [
    { id: 'oportunidades', rotulo: 'Oportunidades qualificadas no pipeline', valor: 60, dica: 'Negociações abertas que já passaram pela qualificação.' },
    { id: 'fechamento', rotulo: 'Taxa de fechamento', sufixo: '%', valor: 25, max: 100, dica: 'Das oportunidades qualificadas, quantas viram contrato.' },
    { id: 'ticket', rotulo: 'Ticket por contrato fechado', prefixo: 'R$', valor: 1500, dica: 'MRR inicial (ou valor do projeto, se for software house).' },
    { id: 'ciclo', rotulo: 'Ciclo médio de venda', sufixo: 'dias', valor: 30, dica: 'Da oportunidade qualificada até o contrato assinado.' },
  ],
  calcular(v) {
    const { brl, num, pct } = fmt;
    if (!(v.oportunidades > 0) || !(v.fechamento > 0) || !(v.ticket > 0) || !(v.ciclo > 0)) {
      return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe oportunidades, taxa de fechamento, ticket e ciclo de venda (em dias) maiores que zero.' } };
    }
    const f = v.fechamento / 100;
    const calc = (o, tx, t, c) => (o * Math.min(tx, 1) * t) / c;
    const vel = calc(v.oportunidades, f, v.ticket, v.ciclo);
    const mes = vel * 30;
    const base = vel;
    const alavancas = [
      { nome: 'Oportunidades', acao: `${num(v.oportunidades, 0)} para ${num(v.oportunidades * 1.1, 1)}`, novo: calc(v.oportunidades * 1.1, f, v.ticket, v.ciclo) },
      { nome: 'Taxa de fechamento', acao: `${pct(f)} para ${pct(Math.min(f * 1.1, 1))}`, novo: calc(v.oportunidades, f * 1.1, v.ticket, v.ciclo) },
      { nome: 'Ticket', acao: `${brl(v.ticket)} para ${brl(v.ticket * 1.1)}`, novo: calc(v.oportunidades, f, v.ticket * 1.1, v.ciclo) },
      { nome: 'Ciclo de venda', acao: `${num(v.ciclo, 1)} para ${num(v.ciclo * 0.9, 1)} dias`, novo: calc(v.oportunidades, f, v.ticket, v.ciclo * 0.9) },
    ].map(a => ({ ...a, ganho: a.novo - base, rel: (a.novo - base) / base }));
    alavancas.sort((a, b) => b.ganho - a.ganho);
    const top = alavancas[0];
    const diaAMenos = v.ciclo > 1 ? calc(v.oportunidades, f, v.ticket, v.ciclo - 1) - vel : NaN;
    const linhas = alavancas.map(a => `<tr><td>${a.nome}</td><td>${a.acao}</td><td>+${brl(a.ganho)}/dia</td><td>+${brl(a.ganho * 30)}/mês</td><td>+${pct(a.rel)}</td></tr>`).join('');
    const pontos = [
      `Seu processo gera ${brl(vel)} por dia: ${num(v.oportunidades, 0)} oportunidades × ${pct(f)} de fechamento × ${brl(v.ticket)} ÷ ${num(v.ciclo, 0)} dias.`,
      `Melhorar 10% em cada alavanca é a mesma régua para as quatro. Para o ciclo, 10% significa encurtar de ${num(v.ciclo, 1)} para ${num(v.ciclo * 0.9, 1)} dias, o que rende ${pct(top.nome === 'Ciclo de venda' ? top.rel : 1 / 0.9 - 1)} porque o ciclo divide a fórmula.`,
      `Como as quatro alavancas se multiplicam, o número não diz qual é a mais viável. Escolha pela que seu time consegue mexer primeiro: mais oportunidades pede marketing e prospecção; fechamento pede diagnóstico e proposta; ticket pede preço e pacote; ciclo pede processo e follow-up.`,
    ];
    if (isFinite(diaAMenos)) pontos.push(`Cada dia a menos no ciclo vale cerca de ${brl(diaAMenos)} por dia de velocidade (${brl(diaAMenos * 30)} por mês).`);
    pontos.push('Ciclo e fechamento se mexem juntos: apertar a venda demais para encurtar o ciclo pode derrubar a taxa de fechamento. Meça os dois depois de cada mudança.');
    return {
      kpis: [
        { nome: 'Velocidade de vendas', valor: brl(vel) + '/dia', nota: 'oportunidades × fechamento × ticket ÷ ciclo' },
        { nome: 'Velocidade por mês', valor: brl(mes), nota: 'velocidade diária × 30 dias' },
        { nome: 'Maior efeito com 10%', valor: top.nome, nota: `+${pct(top.rel)} na velocidade` },
        { nome: 'Contratos por mês', valor: num(v.oportunidades * f / v.ciclo * 30, 1), nota: 'fechamentos no ritmo atual' },
      ],
      diagnostico: {
        tipo: 'good',
        titulo: `Seu processo gera ${brl(vel)} por dia`,
        texto: 'Não existe faixa certa de velocidade: o número serve para comparar você com você mesmo, mês a mês, e para ver qual alavanca vale testar primeiro.',
        pontos,
      },
      extra: `<section class="card"><h2>Efeito de melhorar cada alavanca em 10%, em ordem de impacto</h2><div class="scroll"><table>
        <tr><th>Alavanca</th><th>Mudança</th><th>Ganho por dia</th><th>Ganho por mês</th><th>Velocidade</th></tr>${linhas}</table></div></section>`,
    };
  },
});
})();
