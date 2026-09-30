(() => {
registrar({
  id: 'concentracao-de-nicho',
  nome: 'Concentração de receita por nicho',
  categoria: 'Posicionamento',
  descricao: 'Sua receita está focada em poucos nichos ou espalhada entre vários?',
  campos: [
    { id: 's1', rotulo: 'MRR do segmento 1', prefixo: 'R$', valor: 70000, dica: 'Use seus nichos reais: por exemplo, clínicas, varejo, logística, fintechs.' },
    { id: 's2', rotulo: 'MRR do segmento 2', prefixo: 'R$', valor: 35000 },
    { id: 's3', rotulo: 'MRR do segmento 3', prefixo: 'R$', valor: 20000 },
    { id: 's4', rotulo: 'MRR do segmento 4', prefixo: 'R$', valor: 10000, dica: 'Se tiver mais de 4 segmentos, junte os menores aqui.' },
  ],
  calcular(v) {
    const { brl, num, pct } = fmt;
    const valores = [v.s1, v.s2, v.s3, v.s4];
    const total = valores.reduce((a, b) => a + b, 0);
    if (!(total > 0)) return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe o MRR de pelo menos um segmento.' } };
    const part = valores.map(x => x / total).sort((a, b) => b - a);
    const n = part.filter(p => p > 0).length;
    const maior = part[0];
    const hhi = part.reduce((a, p) => a + (p * 100) * (p * 100), 0);
    const piso = 10000 / n;
    let acum = 0, para80 = 0;
    for (const p of part) { if (p <= 0) break; acum += p; para80++; if (acum >= 0.8 - 1e-9) break; }
    const faixa = hhi < 1500 ? 'pulverizado' : hhi <= 2500 ? 'moderado' : 'concentrado';
    const tipo = faixa === 'moderado' ? 'good' : 'warn';
    const titulo = { pulverizado: 'Receita espalhada entre segmentos', moderado: 'Concentração moderada', concentrado: 'Receita concentrada em poucos segmentos' }[faixa];
    const pontos = [
      `O maior segmento responde por ${pct(maior)} do MRR (${brl(maior * total)} de ${brl(total)}).`,
      `${num(para80, 0)} ${para80 === 1 ? 'segmento soma' : 'segmentos somam'} 80% da receita.`,
      `Índice HHI de ${num(hhi, 0)} em escala de 0 a 10.000.` + (n > 0 && n < 4 ? ` Com ${num(n, 0)} segmento(s) com receita, o menor valor possível é ${num(piso, 0)}.` : ' Com 4 segmentos, o menor valor possível é 2.500, então leia junto com o percentual do maior.'),
    ];
    if (maior >= 0.5) pontos.push('Mais da metade do MRR em um segmento é dependência: se esse nicho esfria ou um concorrente entra nele, o impacto é direto no caixa. Por outro lado, pode ser sua especialização mais forte.');
    if (faixa === 'pulverizado') pontos.push('Com receita bem distribuída, veja se existe uma mensagem que serve a todos ou se você está sendo generalista para cada um.');
    pontos.push('Compare margem, churn e ciclo de venda por segmento: o nicho certo para focar é o que vence nesses três, não só o que fatura mais.');
    return {
      kpis: [
        { nome: 'Maior segmento', valor: pct(maior), nota: `${brl(maior * total)} do MRR` },
        { nome: 'Índice HHI', valor: num(hhi, 0), nota: 'soma dos quadrados das participações (%)', selo: [tipo, faixa] },
        { nome: 'Segmentos para 80% do MRR', valor: num(para80, 0), nota: `de ${num(n, 0)} com receita` },
        { nome: 'MRR total', valor: brl(total), nota: 'soma dos segmentos informados' },
      ],
      paineis: [
        { tipo: 'barras', titulo: 'MRR por segmento', formato: 'brl',
          dados: valores.map((x, i) => ({ rotulo: 'Segmento ' + (i + 1), valor: x, tom: i === 0 ? 'cheio' : 'hachurado' })) },
        { tipo: 'composicao', titulo: 'Como o MRR se divide entre segmentos', formato: 'brl',
          partes: valores.map((x, i) => ({ rotulo: 'Segmento ' + (i + 1), valor: x })) },
      ],
      diagnostico: {
        tipo, titulo,
        texto: 'Convenção do índice HHI: abaixo de 1.500 é pulverizado, de 1.500 a 2.500 é moderado, acima de 2.500 é concentrado. Foco não é sempre melhor que dispersão: o índice é um sinal para você avaliar se a concentração é escolha ou acaso.',
        pontos,
      },
    };
  },
});
})();
