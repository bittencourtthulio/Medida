(() => {
registrar({
  id: 'previsibilidade-de-entrega',
  nome: 'Previsibilidade de entrega',
  categoria: 'Entrega e Operação',
  descricao: 'Você cumpre o que planeja? Compare o planejado com o entregue em seis ciclos e veja quanto prometer ao cliente.',
  termos: 'previsibilidade cumprimento do planejado planejado vs entregue sprint velocity commitment quanto prometer ao cliente prazo confiável estimativa desvio padrão variação de entrega cumprir sprint time cumpre o que promete',
  campos: [
    { id: 'p1', rotulo: 'Ciclo 1: planejado', valor: 40, dica: 'Pontos ou itens, sempre na mesma unidade.' },
    { id: 'e1', rotulo: 'Ciclo 1: entregue', valor: 34 },
    { id: 'p2', rotulo: 'Ciclo 2: planejado', valor: 42 },
    { id: 'e2', rotulo: 'Ciclo 2: entregue', valor: 41 },
    { id: 'p3', rotulo: 'Ciclo 3: planejado', valor: 40 },
    { id: 'e3', rotulo: 'Ciclo 3: entregue', valor: 30 },
    { id: 'p4', rotulo: 'Ciclo 4: planejado', valor: 45 },
    { id: 'e4', rotulo: 'Ciclo 4: entregue', valor: 38 },
    { id: 'p5', rotulo: 'Ciclo 5: planejado', valor: 40 },
    { id: 'e5', rotulo: 'Ciclo 5: entregue', valor: 36 },
    { id: 'p6', rotulo: 'Ciclo 6: planejado', valor: 44 },
    { id: 'e6', rotulo: 'Ciclo 6: entregue', valor: 43 },
                                                  ],
  calcular(v) {
    const { num, pct } = fmt;
    const ciclos = [1, 2, 3, 4, 5, 6].map(i => ({ n: i, p: v['p' + i], e: v['e' + i] })).filter(c => c.p > 0 || c.e > 0);
    const comPlano = ciclos.filter(c => c.p > 0);
    if (!comPlano.length) {
      return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe o planejado e o entregue de pelo menos um ciclo.' } };
    }
    const n = ciclos.length;
    const media = ciclos.reduce((s, c) => s + c.e, 0) / n;
    const dp = n > 1 ? Math.sqrt(ciclos.reduce((s, c) => s + (c.e - media) ** 2, 0) / (n - 1)) : 0;
    const cv = media > 0 ? dp / media : NaN;
    const confiavel = Math.max(0, media - dp);
    const taxas = comPlano.map(c => ({ ...c, t: c.e / c.p }));
    const taxaMedia = taxas.reduce((s, c) => s + c.t, 0) / taxas.length;
    const pior = taxas.reduce((a, b) => (b.t < a.t ? b : a));
    const melhor = taxas.reduce((a, b) => (b.t > a.t ? b : a));
    const planMedio = comPlano.reduce((s, c) => s + c.p, 0) / comPlano.length;
    const tipo = taxaMedia >= 0.85 ? 'good' : taxaMedia >= 0.7 ? 'warn' : 'bad';
    const pontos = [
      `Em média o time entrega ${pct(taxaMedia, 0)} do que planeja. O pior ciclo foi o ${pior.n} (${pct(pior.t, 0)}) e o melhor o ${melhor.n} (${pct(melhor.t, 0)}).`,
      `O entregue varia ${num(dp)} ao redor da média de ${num(media)} por ciclo${isFinite(cv) ? ` (coeficiente de variação de ${pct(cv, 0)})` : ''}.`,
      `Capacidade confiável: ${num(confiavel)} por ciclo (média menos um desvio). Prometa isso ao cliente; o que passar é bônus.`,
    ];
    if (planMedio > confiavel) pontos.push(`Você planeja ${num(planMedio)} por ciclo em média, ${num(planMedio - confiavel)} acima da capacidade confiável. Onde agir primeiro: planejar pela capacidade confiável e deixar o excedente como opcional.`);
    else pontos.push('O plano médio cabe na capacidade confiável. Mantenha o planejamento por esse nível e acompanhe a variação.');
    return {
      kpis: [
        { nome: 'Taxa de cumprimento média', valor: pct(taxaMedia, 0), nota: 'média de entregue ÷ planejado por ciclo', selo: tipo === 'good' ? ['good', 'cumpre'] : tipo === 'warn' ? ['warn', 'atenção'] : ['bad', 'não cumpre'] },
        { nome: 'Pior ciclo', valor: pct(pior.t, 0), nota: `ciclo ${pior.n}` },
        { nome: 'Melhor ciclo', valor: pct(melhor.t, 0), nota: `ciclo ${melhor.n}` },
        { nome: 'Desvio padrão do entregue', valor: num(dp), nota: `média de ${num(media)} por ciclo` },
        { nome: 'Coeficiente de variação', valor: isFinite(cv) ? pct(cv, 0) : '—', nota: 'desvio ÷ média do entregue' },
        { nome: 'Capacidade confiável', valor: num(confiavel), nota: 'média − 1 desvio, mínimo zero' },
        { nome: 'Quanto prometer por ciclo', valor: num(confiavel), nota: 'a capacidade confiável' },
      ],
      paineis: [
        { tipo: 'linha', titulo: 'Planejado e entregue por ciclo', formato: 'num', eixoX: 'ciclo',
          series: [{ nome: 'Planejado', pontos: ciclos.map(c => ({ x: c.n, y: c.p })) }, { nome: 'Entregue', pontos: ciclos.map(c => ({ x: c.n, y: c.e })) }] },
        { tipo: 'barras', titulo: 'Cumprimento por ciclo', formato: 'pct',
          dados: taxas.map(c => ({ rotulo: 'Ciclo ' + c.n, valor: c.t, tom: c.t >= 1 ? 'cheio' : 'hachurado' })), meta: { rotulo: 'Cumprimento total', valor: 1 } },
        { tipo: 'tabela', titulo: 'Ciclo a ciclo', colunas: ['Ciclo', 'Planejado', 'Entregue', 'Cumprimento', 'Diferença'],
          linhas: ciclos.map(c => [String(c.n), num(c.p), num(c.e), c.p > 0 ? pct(c.e / c.p, 0) : '—', { v: (c.e - c.p >= 0 ? '+' : '') + num(c.e - c.p), tom: c.e - c.p >= 0 ? 'pos' : 'neg' }]) },
      ],
      diagnostico: {
        tipo,
        titulo: { good: 'O time cumpre o que planeja', warn: 'O time entrega menos do que planeja', bad: 'O plano e a entrega estão distantes' }[tipo],
        texto: `Regra de bolso, não meta: cumprir pelo menos 85% do planejado em média indica plano realista. Hoje são ${pct(taxaMedia, 0)}. A capacidade confiável usa a variação dos seus próprios ciclos.`,
        pontos,
      },
    };
  },
});
})();
