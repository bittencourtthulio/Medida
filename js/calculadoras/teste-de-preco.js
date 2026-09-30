(() => {
registrar({
  id: 'teste-de-preco',
  nome: 'Subir o preço compensa?',
  categoria: 'Posicionamento',
  descricao: 'Quanto a conversão pode cair com o preço novo antes de você perder receita?',
  termos: 'aumentar preço reajuste subir preço aumento de preço elasticidade conversão cai teste de preço preço novo compensa pricing ab test receita por visitante quanto posso cobrar',
  campos: [
    { id: 'atual', rotulo: 'Preço atual (mensalidade)', prefixo: 'R$', valor: 299 },
    { id: 'novo', rotulo: 'Preço novo (mensalidade)', prefixo: 'R$', valor: 349 },
    { id: 'visitantes', rotulo: 'Visitantes ou trials por mês', valor: 4000, dica: 'Quem chega ao ponto em que vê o preço. Use o mesmo número nos dois cenários.' },
    { id: 'conv', rotulo: 'Conversão atual', sufixo: '%', valor: 3, max: 100, dica: 'Clientes pagantes ÷ visitantes ou trials.' },
    { id: 'convNova', rotulo: 'Conversão esperada com o preço novo', sufixo: '%', valor: 2.7, max: 100, dica: 'É uma hipótese sua, não um dado. Só um teste A/B ou um período de teste mostra o valor real.' },
  ],
  calcular(v) {
    const { brl, num, pct } = fmt;
    if (!(v.atual > 0) || !(v.novo > 0) || !(v.conv > 0)) return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe o preço atual, o preço novo e a conversão atual.' } };
    const c0 = v.conv / 100, c1 = v.convNova / 100;
    const r0 = 1000 * c0 * v.atual, r1 = 1000 * c1 * v.novo;
    const varReceita = r1 / r0 - 1;
    const convMin = c0 * v.atual / v.novo;
    const varPreco = v.novo / v.atual - 1;
    const varConv = c1 / c0 - 1;
    const elast = varPreco !== 0 ? varConv / varPreco : NaN;
    const subiu = v.novo > v.atual;
    const tipo = r1 >= r0 * 1.0000001 ? (varReceita >= 0.05 ? 'good' : 'warn') : 'bad';
    const dif = (r1 - r0) * v.visitantes / 1000;
    const pontos = [
      `Com ${pct(c1, 2)} de conversão no preço de ${brl(v.novo)}, cada 1.000 visitantes rendem ${brl(r1)} de MRR novo contra ${brl(r0)} hoje (${varReceita > 0 ? '+' : ''}${pct(varReceita)}).`,
      `Para manter a receita, a conversão pode cair até ${pct(convMin, 2)} (de ${pct(c0, 2)}): ${pct(convMin / c0 - 1)} sobre a atual.`,
      `No volume de ${num(v.visitantes, 0)} visitantes por mês, a diferença é de ${dif > 0 ? '+' : ''}${brl(dif)} de MRR novo por mês.`,
    ];
    if (isFinite(elast)) pontos.push(`Elasticidade de ${num(elast, 2)}: para cada 1% de variação no preço, a conversão varia ${num(elast, 2)}%. Em módulo abaixo de 1, a conversão cai menos que o preço sobe e a receita de entrada aumenta.`);
    pontos.push('A conversão esperada é hipótese sua. Rode o preço novo em parte do tráfego por tempo suficiente para ter pelo menos algumas dezenas de vendas em cada grupo antes de decidir.');
    pontos.push('Esta conta olha só a entrada de clientes novos. Se o preço maior muda o churn, o resultado em receita ao longo do tempo muda junto.');
    const titulo = tipo === 'bad' ? (subiu ? 'Com essa queda de conversão, o aumento não compensa' : 'Com esse ganho de conversão, a redução não compensa') : tipo === 'warn' ? 'Compensa, por pouco' : 'Compensa na hipótese informada';
    const cenarios = [-0.3, -0.2, -0.1, 0, 0.1].map(x => {
      const c = Math.min(1, c0 * (1 + x)), r = 1000 * c * v.novo, d = r / r0 - 1;
      return [(x > 0 ? '+' : '') + pct(x, 0), pct(c, 2), brl(r), { v: (d > 0 ? '+' : '') + pct(d), tom: d >= 0 ? 'pos' : 'neg' }];
    });
    return {
      kpis: [
        { nome: 'Receita por 1.000 visitantes', valor: `${brl(r0)} → ${brl(r1)}`, nota: 'antes e depois, conversão × preço × 1.000', selo: tipo === 'good' ? ['good', 'compensa'] : tipo === 'warn' ? ['warn', 'margem curta'] : ['bad', 'perde receita'] },
        { nome: 'Variação da receita', valor: (varReceita > 0 ? '+' : '') + pct(varReceita), nota: 'na hipótese de conversão informada' },
        { nome: 'Conversão mínima para manter', valor: pct(convMin, 2), nota: 'conversão atual × preço atual ÷ preço novo' },
        { nome: 'Elasticidade', valor: isFinite(elast) ? num(elast, 2) : '—', nota: 'variação % da conversão ÷ variação % do preço' },
      ],
      paineis: [
        { tipo: 'barras', titulo: 'Receita por 1.000 visitantes, antes e depois', formato: 'brl',
          dados: [{ rotulo: 'Preço atual', valor: r0, tom: 'hachurado' }, { rotulo: 'Preço novo', valor: r1, tom: 'cheio' }] },
        { tipo: 'barras', titulo: 'Conversão esperada contra a mínima', formato: 'pct',
          nota: 'A conversão esperada é hipótese sua. A mínima é a que mantém a receita igual.',
          dados: [{ rotulo: 'Atual', valor: c0, tom: 'hachurado' }, { rotulo: 'Esperada (hipótese)', valor: c1, tom: 'cheio' }, { rotulo: 'Mínima para manter', valor: convMin, tom: 'vazado' }] },
        { tipo: 'tabela', titulo: 'E se a conversão cair mais (ou menos)? Preço novo, por 1.000 visitantes',
          nota: 'Cada linha aplica uma variação sobre a conversão atual e mostra a receita contra a de hoje.',
          colunas: ['Variação da conversão', 'Conversão', 'Receita', 'Contra hoje'], linhas: cenarios },
      ],
      diagnostico: {
        tipo, titulo,
        texto: 'A conta é aritmética: receita de entrada = visitantes × conversão × preço. O que decide o resultado é a conversão com o preço novo, que só o teste revela. Regra de bolso: se a queda esperada é menor que a mínima tolerada, o aumento compensa na entrada.',
        pontos,
      },
    };
  },
});
})();
