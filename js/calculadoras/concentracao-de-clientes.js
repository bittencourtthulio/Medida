(() => {
registrar({
  id: 'concentracao-de-clientes',
  nome: 'Concentração de clientes',
  categoria: 'Retenção e Expansão',
  descricao: 'Quanto da receita depende de poucos clientes? Veja o peso dos cinco maiores e o que acontece se o maior sair.',
  termos: 'concentração de clientes concentração de receita dependência de poucos clientes maior cliente top 5 clientes risco de concentração cliente grande saída do maior cliente curva abc princípio de pareto quanto depende do maior cliente',
  campos: [
    { id: 'c1', rotulo: 'MRR do 1º maior cliente', prefixo: 'R$', valor: 28000 },
    { id: 'c2', rotulo: 'MRR do 2º maior cliente', prefixo: 'R$', valor: 18000 },
    { id: 'c3', rotulo: 'MRR do 3º maior cliente', prefixo: 'R$', valor: 12000 },
    { id: 'c4', rotulo: 'MRR do 4º maior cliente', prefixo: 'R$', valor: 9000 },
    { id: 'c5', rotulo: 'MRR do 5º maior cliente', prefixo: 'R$', valor: 7000 },
    { id: 'total', rotulo: 'MRR total da empresa', prefixo: 'R$', valor: 150000 },
  ],
  calcular(v) {
    const { brl, num, pct } = fmt;
    const top = [v.c1, v.c2, v.c3, v.c4, v.c5].sort((a, b) => b - a);
    const soma = top.reduce((s, x) => s + x, 0);
    if (!(v.total > 0) || !(top[0] > 0)) return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe o MRR total e o MRR de pelo menos o maior cliente.' } };
    if (soma > v.total) return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Os números não fecham', texto: `Os cinco maiores somam ${brl(soma)}, mais que o MRR total de ${brl(v.total)}. Revise os valores.` } };
    const maior = top[0] / v.total, p5 = soma / v.total;
    const fora = v.total - soma;
    const resta = v.total - top[0];
    const tipo = maior >= 0.2 ? 'bad' : maior >= 0.1 ? 'warn' : 'good';
    const pontos = [
      `O maior cliente responde por ${pct(maior)} do MRR (${brl(top[0])}) e os cinco maiores por ${pct(p5)} (${brl(soma)}).`,
      `Se o maior sair, o MRR cai de ${brl(v.total)} para ${brl(resta)}, uma queda de ${pct(maior)}. Para repor, seria preciso conquistar ${brl(top[0])} de MRR novo.`,
      `Fora do top 5 ficam ${brl(fora)} (${pct(fora / v.total)} do MRR).`,
    ];
    if (top[0] > top[1] * 1.5 && top[1] > 0) pontos.push(`O maior cliente é ${num(top[0] / top[1], 1)}x o segundo: a dependência é de um nome, não de um grupo.`);
    if (maior >= 0.1) pontos.push('Proteja essa conta com contrato mais longo, um segundo contato no cliente e acompanhamento próximo de uso.');
    return {
      kpis: [
        { nome: 'Peso do maior cliente', valor: pct(maior), nota: 'MRR do maior ÷ MRR total', selo: tipo === 'good' ? ['good', 'diluído'] : tipo === 'warn' ? ['warn', 'atenção'] : ['bad', 'dependência alta'] },
        { nome: 'Peso dos 5 maiores', valor: pct(p5), nota: `${brl(soma)} de MRR` },
        { nome: 'MRR fora do top 5', valor: brl(fora), nota: `${pct(fora / v.total)} do total` },
        { nome: 'Queda se o maior sair', valor: brl(top[0]), nota: `${pct(maior)} do MRR` },
        { nome: 'MRR que sobra sem o maior', valor: brl(resta), nota: 'MRR total − maior cliente' },
      ],
      paineis: [
        { tipo: 'barras', titulo: 'Participação de cada um dos cinco maiores no MRR', formato: 'pct', dados: top.map((x, i) => ({ rotulo: i === 0 ? 'Maior cliente' : `${i + 1}º maior`, valor: x / v.total, tom: i === 0 ? 'cheio' : 'hachurado' })) },
        { tipo: 'composicao', titulo: 'Os cinco maiores contra o restante', formato: 'brl', partes: [{ rotulo: 'Top 5', valor: soma, tom: 'cheio' }, { rotulo: 'Restante', valor: fora, tom: 'pontilhado' }] },
        { tipo: 'cascata', titulo: 'Se o maior cliente sair', formato: 'brl', passos: [{ rotulo: 'MRR total', valor: v.total, total: true }, { rotulo: 'Saída do maior', valor: -top[0] }, { rotulo: 'MRR restante', valor: resta, total: true }] },
      ],
      diagnostico: {
        tipo,
        titulo: tipo === 'good' ? 'A receita está bem distribuída' : tipo === 'warn' ? 'Um cliente já pesa na receita' : 'A receita depende demais de um cliente',
        texto: `O maior cliente vale ${pct(maior)} do MRR. Regra de bolso, não meta: acima de 10% em um único cliente já é ponto de atenção e acima de 20% é dependência alta. Varia com porte da empresa e tipo de contrato.`,
        pontos,
      },
    };
  },
});
})();
