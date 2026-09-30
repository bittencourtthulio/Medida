(() => {
registrar({
  id: 'valuation-por-arr',
  nome: 'Valuation por múltiplo de ARR',
  categoria: 'Finanças',
  descricao: 'Quanto a empresa pode valer, em uma faixa de múltiplos de ARR que você define, e quanto vale a fatia que você vender.',
  termos: 'valuation avaliacao valor da empresa quanto vale minha empresa multiplo de arr multiplo de receita vender participacao equity rodada captacao investidor exit quanto posso vender',
  campos: [
    { id: 'arr', rotulo: 'ARR atual', prefixo: 'R$', valor: 2400000, dica: 'Receita recorrente anual: MRR × 12.' },
    { id: 'multMin', rotulo: 'Múltiplo de ARR mínimo', sufixo: 'x', valor: 3, dica: 'Use o que o seu mercado ou os investidores praticam; a Medida não fornece múltiplos.' },
    { id: 'multBase', rotulo: 'Múltiplo de ARR base', sufixo: 'x', valor: 5, dica: 'O cenário que você considera mais provável.' },
    { id: 'multMax', rotulo: 'Múltiplo de ARR máximo', sufixo: 'x', valor: 8 },
    { id: 'venda', rotulo: 'Participação a vender', sufixo: '%', valor: 10, max: 100, opcional: true },
  ],
  calcular(v) {
    const { brl, num, pct } = fmt;
    if (!(v.arr > 0) || !(v.multBase > 0)) {
      return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe o ARR atual e ao menos o múltiplo base para estimar o valor da empresa.' } };
    }
    const [mMin, , mMax] = [v.multMin, v.multBase, v.multMax].sort((a, b) => a - b);
    const minV = v.arr * mMin, baseV = v.arr * v.multBase, maxV = v.arr * mMax;
    const fatia = v.venda / 100;
    const valorFatia = baseV * fatia;
    const arrDobro = baseV * 2 / v.multBase;
    const passos = Array.from({ length: 6 }, (_, i) => mMin + (mMax - mMin) * i / 5);

    const pontos = [
      `Com ${brl(v.arr)} de ARR, a faixa vai de ${brl(minV)} (${num(mMin, 2)}x) a ${brl(maxV)} (${num(mMax, 2)}x), com base em ${brl(baseV)} (${num(v.multBase, 2)}x).`,
      `Cada 1x de múltiplo vale ${brl(v.arr)} no valor da empresa: a escolha do múltiplo pesa mais do que qualquer ajuste no ARR.`,
    ];
    if (v.venda > 0) pontos.push(`Vender ${pct(fatia)} no valor base equivale a ${brl(valorFatia)}, e você fica com ${pct(1 - fatia)} da empresa.`);
    pontos.push(`Para dobrar o valor base para ${brl(baseV * 2)} mantendo o múltiplo de ${num(v.multBase, 2)}x, o ARR precisa ir a ${brl(arrDobro)}.`);
    pontos.push('Múltiplos variam com crescimento, margem, retenção, porte e momento do mercado. Use esta faixa como ponto de partida para negociar, não como preço.');

    return {
      paineis: [
        { tipo: 'barras', titulo: 'Valor da empresa nos três cenários', formato: 'brl',
          dados: [{ rotulo: `Mínimo (${num(mMin, 2)}x)`, valor: minV, tom: 'hachurado' }, { rotulo: `Base (${num(v.multBase, 2)}x)`, valor: baseV, tom: 'cheio' }, { rotulo: `Máximo (${num(mMax, 2)}x)`, valor: maxV, tom: 'pontilhado' }] },
        { tipo: 'linha', titulo: 'Valor da empresa conforme o múltiplo', formato: 'brl', eixoX: 'múltiplo de ARR (x)',
          series: [{ nome: 'Valor da empresa', pontos: passos.map(x => ({ x: Math.round(x * 100) / 100, y: v.arr * x })) }],
          marcas: [{ x: v.multBase, y: baseV, rotulo: 'base' }] },
      ],
      kpis: [
        { nome: 'Valor mínimo', valor: brl(minV), nota: `${brl(v.arr)} × ${num(mMin, 2)}x` },
        { nome: 'Valor base', valor: brl(baseV), nota: `${brl(v.arr)} × ${num(v.multBase, 2)}x` },
        { nome: 'Valor máximo', valor: brl(maxV), nota: `${brl(v.arr)} × ${num(mMax, 2)}x` },
        ...(v.venda > 0 ? [{ nome: 'Valor da participação vendida', valor: brl(valorFatia), nota: `${pct(fatia)} do valor base` }] : []),
        { nome: 'ARR para dobrar o valor base', valor: brl(arrDobro), nota: 'com o múltiplo base constante' },
      ],
      diagnostico: {
        tipo: 'warn',
        titulo: 'Uma faixa de valor, não um preço',
        texto: 'A conta é ARR vezes o múltiplo que você escolheu. Os múltiplos são seus: a Medida não fornece múltiplos de mercado, e eles mudam com crescimento, margem e momento do mercado.',
        pontos,
      },
    };
  },
});
})();
