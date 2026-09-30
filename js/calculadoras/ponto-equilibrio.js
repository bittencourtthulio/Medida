(() => {
registrar({
  id: 'ponto-equilibrio',
  nome: 'Ponto de equilíbrio',
  categoria: 'Finanças',
  descricao: 'Quantos clientes pagantes cobrem a estrutura do mês e quantos faltam para a meta de lucro.',
  campos: [
    { id: 'fixos', rotulo: 'Custos fixos (mês)', prefixo: 'R$', valor: 60000, dica: 'Time, infra base, ferramentas e marketing fixo.' },
    { id: 'preco', rotulo: 'Mensalidade por cliente', prefixo: 'R$', valor: 400 },
    { id: 'variavel', rotulo: 'Custo variável por cliente (mês)', prefixo: 'R$', valor: 100, dica: 'Infra por cliente, gateway, impostos e suporte.' },
    { id: 'vendas', rotulo: 'Clientes pagantes hoje', valor: 250, opcional: true },
    { id: 'meta', rotulo: 'Meta de lucro (mês)', prefixo: 'R$', valor: 15000, opcional: true },
  ],
  calcular(v) {
    const { brl, num, pct } = fmt;
    const mc = v.preco - v.variavel;
    if (!(mc > 0)) {
      return { kpis: [{ nome: 'Margem de contribuição', valor: brl(mc), nota: 'mensalidade − custo variável' }],
        diagnostico: { tipo: 'bad', titulo: 'Cada cliente perde dinheiro', texto: 'O custo variável por cliente é maior ou igual à mensalidade. Nenhum volume resolve isso: revise preço ou custo.' } };
    }
    const mcPct = mc / v.preco;
    const pe = v.fixos / mc;
    const peMrr = pe * v.preco;
    const peMeta = (v.fixos + v.meta) / mc;
    const temBase = v.vendas > 0;
    const lucro = v.vendas * mc - v.fixos;
    const seguranca = temBase ? (v.vendas - pe) / v.vendas : NaN;
    const tipo = !temBase ? 'warn' : seguranca < 0 ? 'bad' : seguranca < 0.2 ? 'warn' : 'good';
    const pontos = [`Você precisa de ${num(Math.ceil(pe), 0)} clientes pagantes (${brl(peMrr)} de MRR) só para cobrir a estrutura.`];
    if (temBase) {
      pontos.push(seguranca < 0
        ? `Hoje você tem ${num(v.vendas, 0)}: faltam ${num(Math.ceil(pe - v.vendas), 0)} clientes para empatar.`
        : `Sua base está ${pct(seguranca)} acima do equilíbrio: pode perder clientes até esse ponto antes de dar prejuízo.`);
    }
    if (v.meta > 0) pontos.push(`Para lucrar ${brl(v.meta)} por mês, são ${num(Math.ceil(peMeta), 0)} clientes.`);
    const N = Math.max(2, Math.ceil(Math.max(pe * 1.6, v.vendas * 1.2, peMeta * 1.1)));
    const pontosLinha = f => Array.from({ length: 7 }, (_, i) => { const x = Math.round(N * i / 6); return { x, y: f(x) }; });
    const paineis = [
      { tipo: 'linha', titulo: 'Receita contra custo total, por número de clientes', formato: 'brl', eixoX: 'clientes pagantes', largo: true,
        series: [{ nome: 'Receita', pontos: pontosLinha(x => x * v.preco) }, { nome: 'Custo total (fixos + variáveis)', pontos: pontosLinha(x => v.fixos + x * v.variavel) }],
        marcas: [{ x: pe, y: pe * v.preco, rotulo: `equilíbrio: ${num(Math.ceil(pe), 0)} clientes` }] },
      { tipo: 'composicao', titulo: 'Para onde vai cada mensalidade', formato: 'brl',
        partes: [{ rotulo: 'Custo variável', valor: v.variavel, tom: 'hachurado' }, { rotulo: 'Margem de contribuição (paga os fixos e o lucro)', valor: mc, tom: 'cheio' }] },
    ];
    return {
      paineis,
      kpis: [
        { nome: 'Ponto de equilíbrio', valor: num(Math.ceil(pe), 0) + ' clientes', nota: `${brl(peMrr)} de MRR` },
        { nome: 'Margem de contribuição', valor: brl(mc), nota: `${pct(mcPct)} da mensalidade, por cliente` },
        ...(v.meta > 0 ? [{ nome: 'Clientes para a meta', valor: num(Math.ceil(peMeta), 0), nota: `${brl(peMeta * v.preco)} de MRR` }] : []),
        ...(temBase ? [
          { nome: 'Lucro mensal atual', valor: brl(lucro), nota: `${num(v.vendas, 0)} clientes × ${brl(mc)} − fixos` },
          { nome: 'Margem de segurança', valor: pct(seguranca), nota: 'queda de base suportável', selo: tipo === 'good' ? ['good', 'confortável'] : tipo === 'warn' ? ['warn', 'curta'] : ['bad', 'abaixo do equilíbrio'] },
        ] : []),
      ],
      diagnostico: {
        tipo,
        titulo: { good: 'Base acima do equilíbrio', warn: temBase ? 'Margem de segurança curta' : 'Equilíbrio calculado', bad: 'Operando abaixo do equilíbrio' }[tipo],
        texto: temBase ? 'Compara sua base de clientes com o mínimo para cobrir os custos fixos.' : 'Informe os clientes pagantes de hoje para saber a margem de segurança.',
        pontos,
      },
    };
  },
});
})();
