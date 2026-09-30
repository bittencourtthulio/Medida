(() => {
registrar({
  id: 'mix-de-planos',
  nome: 'Mix de planos: qual plano sustenta a receita',
  categoria: 'Conversão',
  descricao: 'Qual plano sustenta sua receita? Participação de cada plano no MRR e nos clientes, e o ganho se parte da base migrar para o plano acima.',
  termos: 'mix planos plano mais vendido qual plano sustenta receita mrr por plano arpa ticket médio upgrade migração downgrade starter pro enterprise concentração de receita tabela de preços pacotes tiers',
  campos: [
    { id: 'p1', rotulo: 'Plano 1 (mais barato): mensalidade', prefixo: 'R$', valor: 149 },
    { id: 'c1', rotulo: 'Plano 1: clientes', valor: 220 },
    { id: 'p2', rotulo: 'Plano 2 (intermediário): mensalidade', prefixo: 'R$', valor: 349 },
    { id: 'c2', rotulo: 'Plano 2: clientes', valor: 90 },
    { id: 'p3', rotulo: 'Plano 3 (mais caro): mensalidade', prefixo: 'R$', valor: 899 },
    { id: 'c3', rotulo: 'Plano 3: clientes', valor: 18 },
    { id: 'mig', rotulo: 'Clientes do Plano 1 que migrariam para o Plano 2', sufixo: '%', valor: 10, max: 100, opcional: true, dica: 'Hipótese sua, para simular uma campanha de upgrade. Zero = não simular.' },
  ],
  calcular(v) {
    const { brl, num, pct } = fmt;
    const planos = [1, 2, 3].map(i => ({ nome: 'Plano ' + i, preco: v['p' + i], clientes: v['c' + i], mrr: v['p' + i] * v['c' + i] }));
    const mrr = planos.reduce((s, p) => s + p.mrr, 0);
    const clientes = planos.reduce((s, p) => s + p.clientes, 0);
    if (!(mrr > 0) || !(clientes > 0)) {
      return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe preço e número de clientes de pelo menos um plano.' } };
    }
    const arpa = mrr / clientes;
    planos.forEach(p => { p.parteMrr = p.mrr / mrr; p.parteCli = p.clientes / clientes; });
    const top = planos.reduce((m, p) => (p.mrr > m.mrr ? p : m), planos[0]);
    const maisClientes = planos.reduce((m, p) => (p.clientes > m.clientes ? p : m), planos[0]);
    const migrados = v.c1 * v.mig / 100;
    const ganho = migrados * (v.p2 - v.p1);
    const tipo = top.parteMrr <= 0.5 ? 'good' : top.parteMrr <= 0.7 ? 'warn' : 'bad';
    const pontos = [
      `${top.nome} sustenta ${pct(top.parteMrr, 0)} do MRR (${brl(top.mrr)} de ${brl(mrr)}) com ${pct(top.parteCli, 0)} dos clientes.`,
      `O ARPA é ${brl(arpa, 2)}: MRR ${brl(mrr)} ÷ ${num(clientes, 0)} clientes.`,
    ];
    if (maisClientes !== top) pontos.push(`${maisClientes.nome} tem mais clientes (${num(maisClientes.clientes, 0)}), mas gera só ${pct(maisClientes.parteMrr, 0)} do MRR: o volume não é o que paga a conta.`);
    if (v.mig > 0 && v.c1 > 0) {
      pontos.push(v.p2 > v.p1
        ? `Se ${pct(v.mig / 100, 0)} do Plano 1 (${num(migrados, 1)} clientes) migrar para o Plano 2, o MRR sobe ${brl(ganho)} por mês (${pct(ganho / mrr)}), ${brl(ganho * 12)} em 12 meses.`
        : 'O Plano 2 custa o mesmo ou menos que o Plano 1: a migração não gera receita. Reveja a tabela de preços.');
    }
    if (!(v.p1 < v.p2 && v.p2 < v.p3)) pontos.push('Os preços não estão em ordem crescente (Plano 1 < Plano 2 < Plano 3): confira se os planos estão na ordem certa.');
    pontos.push(top.parteMrr > 0.7
      ? 'Regra de bolso: mais de 70% do MRR num único plano é concentração. Uma mudança de preço ou um concorrente nesse plano mexe na receita inteira.'
      : 'Regra de bolso: quando nenhum plano passa de 50% do MRR, a receita não depende de uma única oferta.');
    return {
      kpis: [
        { nome: 'MRR total', valor: brl(mrr), nota: 'soma de preço × clientes de cada plano' },
        { nome: 'ARPA', valor: brl(arpa, 2), nota: 'MRR ÷ clientes' },
        { nome: 'Plano que mais sustenta o MRR', valor: top.nome, nota: `${pct(top.parteMrr, 0)} do MRR`, selo: tipo === 'good' ? ['good', 'diversificado'] : tipo === 'warn' ? ['warn', 'concentrado'] : ['bad', 'muito concentrado'] },
        ...planos.map(p => ({ nome: `${p.nome}: parte do MRR`, valor: pct(p.parteMrr, 0), nota: `${pct(p.parteCli, 0)} dos clientes` })),
        ...(v.mig > 0 && v.p2 > v.p1 ? [{ nome: 'MRR adicional com a migração', valor: brl(ganho), nota: `${num(migrados, 1)} clientes × (${brl(v.p2)} − ${brl(v.p1)})` }] : []),
      ],
      paineis: [
        { tipo: 'composicao', titulo: 'Como o MRR se divide entre os planos', formato: 'brl', partes: planos.map(p => ({ rotulo: p.nome, valor: p.mrr })) },
        { tipo: 'barras', titulo: 'Clientes por plano', formato: 'int', dados: planos.map(p => ({ rotulo: p.nome, valor: p.clientes })) },
        { tipo: 'tabela', titulo: 'Detalhe por plano', colunas: ['Plano', 'Clientes', 'Preço', 'MRR', '% do MRR'],
          linhas: [...planos.map(p => [p.nome, num(p.clientes, 0), brl(p.preco), brl(p.mrr), pct(p.parteMrr, 0)]), ['Total', num(clientes, 0), brl(arpa, 2) + ' (ARPA)', brl(mrr), '100%']] },
      ],
      diagnostico: {
        tipo,
        titulo: { good: 'Receita distribuída entre os planos', warn: `${top.nome} carrega boa parte do MRR`, bad: `A receita depende do ${top.nome}` }[tipo],
        texto: 'Mostra onde está o dinheiro: o plano com mais clientes nem sempre é o que mais paga.',
        pontos,
      },
    };
  },
});
})();
