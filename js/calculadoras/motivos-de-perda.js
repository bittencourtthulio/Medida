(() => {
registrar({
  id: 'motivos-de-perda',
  nome: 'Motivos de perda de negócios',
  categoria: 'Conversão',
  descricao: 'Por que você perde negócios? Win rate, peso de cada motivo e quanto de MRR seria recuperável.',
  termos: 'motivos de perda negócios perdidos por que perco vendas win rate taxa de ganho loss reason perdi para concorrente preço caro timing sem decisão oportunidades perdidas recuperar mrr perdido pipeline perdido',
  campos: [
    { id: 'preco', rotulo: 'Perdidas por preço', valor: 14 },
    { id: 'concorrente', rotulo: 'Perdidas para concorrente', valor: 10 },
    { id: 'timing', rotulo: 'Perdidas por timing', valor: 8, dica: 'O cliente não tinha urgência ou orçamento naquele momento.' },
    { id: 'semDecisao', rotulo: 'Perdidas por falta de decisão', valor: 12, dica: 'O cliente sumiu ou ficou parado, sem dizer não.' },
    { id: 'produto', rotulo: 'Perdidas por produto ou funcionalidade', valor: 6 },
    { id: 'outro', rotulo: 'Perdidas por outro motivo', valor: 3 },
    { id: 'ganhas', rotulo: 'Oportunidades ganhas no período', valor: 18 },
    { id: 'mensalidade', rotulo: 'Mensalidade média por cliente', prefixo: 'R$', valor: 600 },
    { id: 'rec', rotulo: 'Recuperação possível em cada motivo', sufixo: '%', valor: 10, max: 100, dica: 'Hipótese sua: que parte das perdas de cada motivo voltaria com uma ação de reativação. Vale o mesmo percentual para todos os motivos.' },
  ],
  calcular(v) {
    const { brl, num, pct } = fmt;
    const motivos = [
      { nome: 'Preço', n: v.preco }, { nome: 'Concorrente', n: v.concorrente }, { nome: 'Timing', n: v.timing },
      { nome: 'Sem decisão', n: v.semDecisao }, { nome: 'Produto', n: v.produto }, { nome: 'Outro', n: v.outro },
    ];
    const perdidas = motivos.reduce((s, m) => s + m.n, 0);
    if (!(perdidas > 0)) {
      return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe quantas oportunidades você perdeu em pelo menos um motivo.' } };
    }
    const r = v.rec / 100;
    const win = v.ganhas / (v.ganhas + perdidas);
    motivos.forEach(m => { m.parte = m.n / perdidas; m.mrr = m.n * v.mensalidade; m.recup = m.mrr * r; });
    const mrrPerdido = perdidas * v.mensalidade;
    const recuperavel = mrrPerdido * r;
    const top = motivos.reduce((m, x) => (x.n > m.n ? x : m), motivos[0]);
    const tipo = top.parte >= 0.35 ? 'warn' : 'good';
    const pontos = [
      `Você perdeu ${num(perdidas, 0)} oportunidades e ganhou ${num(v.ganhas, 0)}: win rate de ${pct(win)} (ganhas ÷ (ganhas + perdidas)).`,
      `${top.nome} é o motivo mais frequente: ${num(top.n, 0)} perdas, ${pct(top.parte, 0)} do total${v.mensalidade > 0 ? `, ${brl(top.mrr)} de MRR` : ''}.`,
    ];
    if (v.mensalidade > 0) pontos.push(`O MRR perdido soma ${brl(mrrPerdido)}. Com ${pct(r, 0)} de recuperação, dá para trazer de volta ${brl(recuperavel)} de MRR (${brl(recuperavel * 12)} em 12 meses).`);
    const timingSem = v.timing + v.semDecisao;
    if (timingSem > 0) pontos.push(`Timing e falta de decisão juntos são ${num(timingSem, 0)} perdas (${pct(timingSem / perdidas, 0)}): são as que mais tendem a voltar com reativação e follow-up, porque o cliente não disse não ao produto.`);
    pontos.push('Regra de bolso: o motivo registrado pelo vendedor costuma ser o mais cômodo, não o real. Confirme os principais com uma ligação curta a alguns clientes perdidos antes de mudar preço ou produto.');
    return {
      kpis: [
        { nome: 'Oportunidades perdidas', valor: num(perdidas, 0), nota: 'soma dos seis motivos' },
        { nome: 'Win rate', valor: pct(win), nota: `${num(v.ganhas, 0)} ganhas ÷ ${num(v.ganhas + perdidas, 0)} decididas` },
        { nome: 'Motivo mais frequente', valor: top.nome, nota: `${pct(top.parte, 0)} das perdas`, selo: tipo === 'warn' ? ['warn', 'concentrado'] : ['good', 'pulverizado'] },
        { nome: 'MRR perdido', valor: brl(mrrPerdido), nota: `${num(perdidas, 0)} × ${brl(v.mensalidade)}` },
        { nome: 'MRR recuperável', valor: brl(recuperavel), nota: `${pct(r, 0)} do MRR perdido` },
      ],
      paineis: [
        { tipo: 'barras', titulo: 'Oportunidades perdidas por motivo', formato: 'int', dados: motivos.map((m, i) => ({ rotulo: m.nome, valor: m.n, tom: m === top ? 'cheio' : 'hachurado' })) },
        { tipo: 'composicao', titulo: 'Como o MRR perdido se divide por motivo', formato: 'brl', partes: motivos.map(m => ({ rotulo: m.nome, valor: m.mrr })) },
        { tipo: 'barras', titulo: 'MRR recuperável por motivo', formato: 'brl', dados: motivos.map(m => ({ rotulo: m.nome, valor: m.recup, tom: 'pontilhado' })) },
      ],
      diagnostico: {
        tipo,
        titulo: tipo === 'warn' ? `${top.nome} concentra as perdas` : 'Perdas espalhadas entre vários motivos',
        texto: tipo === 'warn' ? 'Um único motivo explica mais de um terço das perdas (regra de bolso): atacar esse motivo rende mais que ajustes soltos.' : 'Nenhum motivo passa de um terço das perdas (regra de bolso): não há uma causa única, o ganho vem de melhorar o processo como um todo.',
        pontos,
      },
    };
  },
});
})();
