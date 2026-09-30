(() => {
// Distribuição normal acumulada, com a aproximação de erf de Abramowitz e Stegun (7.1.26).
const erf = x => {
  const s = x < 0 ? -1 : 1; x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return s * y;
};
const cdf = z => 0.5 * (1 + erf(z / Math.SQRT2));

registrar({
  id: 'teste-ab-de-conversao',
  nome: 'Teste A/B de conversão',
  categoria: 'Aquisição',
  descricao: 'A variante B realmente converte mais? Teste z de duas proporções, p-valor e tamanho mínimo de amostra.',
  termos: 'teste ab teste a/b a b variante significância significancia estatística estatistica p valor p-valor uplift taxa de conversão converte mais landing page experimento amostra tamanho da amostra z teste duas proporções 95% confiança resultado do teste b é melhor que a',
  campos: [
    { id: 'visA', rotulo: 'Variante A: visitantes', valor: 5000 },
    { id: 'convA', rotulo: 'Variante A: conversões', valor: 200 },
    { id: 'visB', rotulo: 'Variante B: visitantes', valor: 5000 },
    { id: 'convB', rotulo: 'Variante B: conversões', valor: 245 },
  ],
  calcular(v) {
    const { num, pct } = fmt;
    if (!(v.visA > 0) || !(v.visB > 0)) return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe os visitantes das duas variantes.' } };
    const cA = Math.min(v.convA, v.visA), cB = Math.min(v.convB, v.visB);
    const pA = cA / v.visA, pB = cB / v.visB;
    const pool = (cA + cB) / (v.visA + v.visB);
    const se = Math.sqrt(pool * (1 - pool) * (1 / v.visA + 1 / v.visB));
    if (!(se > 0)) return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Com zero conversões (ou 100%) nas duas variantes não há o que comparar. Informe as conversões.' } };
    const z = (pB - pA) / se;
    const p = Math.min(1, Math.max(0, 2 * (1 - cdf(Math.abs(z)))));
    const sig = p < 0.05;
    const uplift = pA > 0 ? (pB - pA) / pA : NaN;
    const d = Math.abs(pB - pA), pm = (pA + pB) / 2;
    const nMin = d > 0 ? Math.ceil(2 * Math.pow(1.96 + 0.84, 2) * pm * (1 - pm) / (d * d)) : NaN;
    const pequena = cA < 30 || cB < 30;
    const bMelhor = pB > pA;
    const tipo = sig ? (bMelhor ? 'good' : 'bad') : 'warn';
    const pontos = [
      `A converte ${pct(pA, 2)} (${num(cA, 0)} de ${num(v.visA, 0)}) e B converte ${pct(pB, 2)} (${num(cB, 0)} de ${num(v.visB, 0)}).${isFinite(uplift) ? ` A diferença relativa de B sobre A é ${uplift >= 0 ? '+' : ''}${pct(uplift, 1)}.` : ''}`,
      `O p-valor é ${num(p, 4)}: se A e B fossem iguais, uma diferença deste tamanho ou maior apareceria por acaso em ${pct(p, 1)} dos testes. Significância a 95% é convenção estatística (p abaixo de 0,05), não garantia de resultado.`,
    ];
    if (!sig && isFinite(nMin)) pontos.push(`Para confirmar uma diferença deste tamanho, seriam necessários cerca de ${num(nMin, 0)} visitantes por variante (aproximação com 95% de confiança e 80% de poder, convenções estatísticas). Vocês têm ${num(Math.min(v.visA, v.visB), 0)} na menor.`);
    if (pequena) pontos.push('Amostra pequena engana: com menos de 30 conversões em uma variante (regra de bolso), uma conversão a mais ou a menos muda o resultado. Não decida com isso.');
    pontos.push('Decida o tamanho da amostra antes de começar e não pare o teste na primeira vez que o p-valor passar de 0,05: olhar várias vezes aumenta a chance de falso positivo.');
    return {
      kpis: [
        { nome: 'Taxa de A', valor: pct(pA, 2), nota: `${num(cA, 0)} de ${num(v.visA, 0)}` },
        { nome: 'Taxa de B', valor: pct(pB, 2), nota: `${num(cB, 0)} de ${num(v.visB, 0)}` },
        { nome: 'Uplift relativo de B', valor: isFinite(uplift) ? (uplift >= 0 ? '+' : '') + pct(uplift, 1) : '—', nota: '(taxa B − taxa A) ÷ taxa A' },
        { nome: 'Estatística z', valor: num(z, 2), nota: 'teste z de duas proporções' },
        { nome: 'p-valor (bilateral)', valor: num(p, 4), nota: 'chance de diferença igual ou maior por acaso' },
        { nome: 'Significância a 95%', valor: sig ? 'sim' : 'não', nota: 'convenção: p abaixo de 0,05', selo: sig ? (bMelhor ? ['good', 'B melhor'] : ['bad', 'A melhor']) : ['warn', 'inconclusivo'] },
        { nome: 'Amostra mínima por variante', valor: isFinite(nMin) ? num(nMin, 0) : '—', nota: 'aproximada, 80% de poder' },
      ],
      paineis: [
        { tipo: 'barras', titulo: 'Taxa de conversão das variantes', formato: 'pct',
          dados: [{ rotulo: 'Variante A', valor: pA, tom: 'hachurado' }, { rotulo: 'Variante B', valor: pB, tom: 'cheio' }] },
        { tipo: 'barras', titulo: 'p-valor contra o limite de 5%', formato: 'pct', nota: 'Em porcentagem: 3,2% equivale a p = 0,032. Barra abaixo do marcador indica diferença significativa.',
          dados: [{ rotulo: 'p-valor', valor: p, tom: sig ? 'cheio' : 'vazado' }], meta: { rotulo: 'Limite de 5% (convenção)', valor: 0.05 } },
        { tipo: 'tabela', titulo: 'Os números do teste', colunas: ['Medida', 'Variante A', 'Variante B'],
          linhas: [['Visitantes', num(v.visA, 0), num(v.visB, 0)], ['Conversões', num(cA, 0), num(cB, 0)], ['Taxa de conversão', pct(pA, 2), pct(pB, 2)],
            ['Uplift relativo', '—', isFinite(uplift) ? { v: (uplift >= 0 ? '+' : '') + pct(uplift, 1), tom: uplift >= 0 ? 'pos' : 'neg' } : '—'],
            ['z e p-valor', `z = ${num(z, 2)}`, `p = ${num(p, 4)}`]] },
      ],
      diagnostico: {
        tipo,
        titulo: sig ? (bMelhor ? 'B converte mais, com significância' : 'A converte mais, com significância') : 'Ainda não dá para dizer qual é melhor',
        texto: sig
          ? `A diferença passa do limite convencional de 95% (p de ${num(p, 4)}). Mesmo assim, significância mostra que a diferença provavelmente não é acaso, não que ela vá se repetir na mesma escala.`
          : `Com p de ${num(p, 4)}, a diferença observada pode ser acaso. Não troque a variante ainda: junte mais visitantes ou aceite que as duas rendem igual.`,
        pontos,
      },
    };
  },
});
})();
