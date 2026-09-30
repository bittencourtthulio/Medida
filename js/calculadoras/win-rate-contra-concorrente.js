(() => {
registrar({
  id: 'win-rate-contra-concorrente',
  nome: 'Contra quem você perde?',
  categoria: 'Posicionamento',
  descricao: 'Qual concorrente mais tira negócios de você, e quanto valeria ganhar mais dele?',
  termos: 'win rate taxa de vitória perdas concorrente concorrência perco negócios deals disputa contra quem perco battlecard competidor loss analysis quem me ganha taxa de ganho',
  campos: [
    { id: 'd1', rotulo: 'Concorrente 1: disputas', valor: 30, dica: 'Use o nome real do concorrente como referência. Conte negócios em que ele apareceu na decisão, no período que você analisa (por exemplo, 12 meses).' },
    { id: 'v1', rotulo: 'Concorrente 1: vitórias', valor: 12 },
    { id: 'd2', rotulo: 'Concorrente 2: disputas', valor: 22 },
    { id: 'v2', rotulo: 'Concorrente 2: vitórias', valor: 13 },
    { id: 'd3', rotulo: 'Concorrente 3: disputas', valor: 15 },
    { id: 'v3', rotulo: 'Concorrente 3: vitórias', valor: 9 },
    { id: 'do', rotulo: 'Sem concorrente identificado: disputas', valor: 18, opcional: true, dica: 'Negócios em que você não sabe quem era o rival (inclui "ficou com a planilha" e "não decidiu"). 0 = não informado.' },
    { id: 'vo', rotulo: 'Sem concorrente identificado: vitórias', valor: 11, opcional: true },
  ],
  calcular(v) {
    const { num, pct } = fmt;
    const linhas = [
      { nome: 'Concorrente 1', d: v.d1, v: Math.min(v.v1, v.d1) },
      { nome: 'Concorrente 2', d: v.d2, v: Math.min(v.v2, v.d2) },
      { nome: 'Concorrente 3', d: v.d3, v: Math.min(v.v3, v.d3) },
      { nome: 'Sem concorrente identificado', d: v.do, v: Math.min(v.vo, v.do) },
    ].filter(l => l.d > 0).map(l => ({ ...l, perdas: l.d - l.v, wr: l.v / l.d }));
    const disputas = linhas.reduce((a, l) => a + l.d, 0);
    if (!(disputas > 0)) return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe as disputas e vitórias de pelo menos um concorrente.' } };
    const vitorias = linhas.reduce((a, l) => a + l.v, 0);
    const perdas = disputas - vitorias;
    const wrGeral = vitorias / disputas;
    const nomeados = linhas.filter(l => l.nome !== 'Sem concorrente identificado');
    const base = nomeados.length ? nomeados : linhas;
    const custo = base.reduce((m, l) => (l.perdas > m.perdas ? l : m), base[0]);
    const pior = base.reduce((m, l) => (l.wr < m.wr ? l : m), base[0]);
    const ganhoExtra = Math.min(pior.d * 0.10, pior.perdas);
    const tipo = perdas === 0 ? 'good' : custo.perdas / perdas >= 0.4 ? 'warn' : 'good';
    const pontos = [
      `Você ganhou ${num(vitorias, 0)} de ${num(disputas, 0)} disputas (${pct(wrGeral)}) e perdeu ${num(perdas, 0)}.`,
      `${custo.nome} é quem mais custa negócios: ${num(custo.perdas, 0)} perdas (${pct(perdas > 0 ? custo.perdas / perdas : 0)} do total), com win rate de ${pct(custo.wr)}.`,
    ];
    if (pior.nome !== custo.nome) pontos.push(`Seu menor win rate é contra ${pior.nome}: ${pct(pior.wr)} em ${num(pior.d, 0)} disputas.`);
    pontos.push(`Subir 10 pontos percentuais contra ${pior.nome} (${pct(pior.wr)} para ${pct(Math.min(1, pior.wr + 0.1))}) daria cerca de ${num(ganhoExtra, 1)} vitórias a mais no mesmo volume de disputas.`);
    if (pior.d < 10) pontos.push(`${pior.nome} tem menos de 10 disputas: a amostra é pequena, leia como indício.`);
    pontos.push('Leia os motivos das perdas para o concorrente que mais custa (preço, funcionalidade, prova social, relacionamento) antes de mexer em preço ou produto. Ganhar de quem aparece mais vale mais que ganhar de quem aparece pouco.');
    const sel = tipo === 'good' ? ['good', 'perdas distribuídas'] : ['warn', 'perdas concentradas'];
    return {
      kpis: [
        { nome: 'Win rate geral', valor: pct(wrGeral), nota: `${num(vitorias, 0)} vitórias em ${num(disputas, 0)} disputas`, selo: sel },
        { nome: 'Perdas absolutas', valor: num(perdas, 0), nota: 'disputas menos vitórias' },
        { nome: 'Quem mais custa negócios', valor: custo.nome, nota: `${num(custo.perdas, 0)} perdas, win rate ${pct(custo.wr)}` },
        { nome: 'Vitórias a mais com +10 p.p.', valor: num(ganhoExtra, 1), nota: `contra ${pior.nome}, o menor win rate` },
      ],
      paineis: [
        { tipo: 'barras', titulo: 'Win rate por concorrente', formato: 'pct',
          dados: linhas.map((l, i) => ({ rotulo: l.nome, valor: l.wr, tom: i === 0 ? 'cheio' : 'hachurado' })), meta: { rotulo: 'Win rate geral', valor: wrGeral } },
        { tipo: 'barras', titulo: 'Negócios perdidos, em número', formato: 'int',
          dados: linhas.map(l => ({ rotulo: l.nome, valor: l.perdas, tom: l === custo ? 'cheio' : 'vazado' })) },
        { tipo: 'composicao', titulo: 'Vitórias e perdas no total', formato: 'int',
          partes: [{ rotulo: 'Vitórias', valor: vitorias, tom: 'cheio' }, { rotulo: 'Perdas', valor: perdas, tom: 'vazado' }] },
      ],
      diagnostico: {
        tipo,
        titulo: tipo === 'good' ? 'Perdas sem um vilão claro' : `As perdas se concentram em ${custo.nome}`,
        texto: 'Não há benchmark universal de win rate: o número certo depende de ticket, ciclo e mercado. O que importa é onde as perdas se concentram e se o padrão muda ao longo do tempo. Regra de bolso: um concorrente responsável por 40% ou mais das perdas merece uma resposta específica.',
        pontos,
      },
    };
  },
});
})();
