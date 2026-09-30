(() => {
registrar({
  id: 'dependencia-de-indicacao',
  nome: 'Dependência de uma origem de clientes',
  categoria: 'Aquisição',
  descricao: 'De onde vêm seus clientes novos? Mostra a participação de cada origem e o que acontece se a maior delas cair.',
  termos: 'indicação indicacao dependência dependencia concentração concentracao origem de clientes canal de aquisição canais depende de um canal só previsibilidade inbound orgânico organico outbound pago parcerias e se a indicação cair de onde vêm meus clientes risco de canal',
  campos: [
    { id: 'ind', rotulo: 'Clientes novos por indicação (mês)', valor: 14 },
    { id: 'inb', rotulo: 'Clientes novos por inbound e orgânico (mês)', valor: 6 },
    { id: 'out', rotulo: 'Clientes novos por outbound (mês)', valor: 4 },
    { id: 'pago', rotulo: 'Clientes novos por mídia paga (mês)', valor: 5 },
    { id: 'parc', rotulo: 'Clientes novos por parcerias (mês)', valor: 1 },
    { id: 'queda', rotulo: 'Queda simulada na maior origem', sufixo: '%', valor: 30, max: 100, dica: 'Quanto você perderia dessa origem num cenário ruim.' },
  ],
  calcular(v) {
    const { num, pct } = fmt;
    const origens = [
      { nome: 'Indicação', n: v.ind }, { nome: 'Inbound e orgânico', n: v.inb }, { nome: 'Outbound', n: v.out },
      { nome: 'Mídia paga', n: v.pago }, { nome: 'Parcerias', n: v.parc },
    ];
    const total = origens.reduce((s, o) => s + o.n, 0);
    if (!(total > 0)) return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe os clientes novos de pelo menos uma origem.' } };
    origens.forEach(o => { o.p = o.n / total; });
    const maior = origens.reduce((a, b) => (b.n > a.n ? b : a));
    const acima = origens.filter(o => o.p > 0.10).length;
    const q = v.queda / 100;
    const perdidos = maior.n * q;
    const cenario = total - perdidos;
    const controlavel = (v.out + v.pago) / total;

    const tipo = maior.p >= 0.6 ? 'bad' : maior.p >= 0.4 ? 'warn' : 'good';
    const pontos = [
      `${maior.nome} traz ${num(maior.n, 0)} de ${num(total, 0)} clientes por mês (${pct(maior.p, 0)}). Se cair ${num(v.queda, 0)}%, você perde ${num(perdidos, 1)} clientes por mês e o total vai para ${num(cenario, 1)}.`,
      `${pct(controlavel, 0)} dos clientes vêm de canais que você liga e desliga (outbound e mídia paga). O resto depende de demanda que você não controla.`,
      `${acima} de 5 origens passam de 10% do total (convenção deste cálculo).`,
    ];
    if (maior.p >= 0.4) pontos.push(`Onde agir: transformar ${num(Math.min(3, Math.ceil(total * 0.1)), 0)} ou mais clientes por mês em outra origem reduz o peso de ${maior.nome} sem mexer no que já funciona.`);
    if (controlavel < 0.3) pontos.push('Pouca previsibilidade: um canal controlável, como outbound, serve de piso quando a origem principal oscilar.');
    return {
      kpis: [
        { nome: 'Maior origem', valor: pct(maior.p, 0), nota: maior.nome, selo: tipo === 'good' ? ['good', 'diversificado'] : tipo === 'warn' ? ['warn', 'concentrado'] : ['bad', 'muito concentrado'] },
        { nome: 'Origens acima de 10%', valor: `${acima} de 5`, nota: 'convenção do cálculo' },
        { nome: `Clientes perdidos se ${maior.nome} cair ${num(v.queda, 0)}%`, valor: num(perdidos, 1) + ' por mês', nota: `total cai para ${num(cenario, 1)} por mês` },
        { nome: 'Previsibilidade', valor: pct(controlavel, 0), nota: 'parte que vem de outbound e mídia paga' },
        { nome: 'Clientes novos por mês', valor: num(total, 1), nota: 'soma das cinco origens' },
      ],
      paineis: [
        { tipo: 'composicao', titulo: 'De onde vêm os clientes novos', formato: 'num', partes: origens.filter(o => o.n > 0).map(o => ({ rotulo: o.nome, valor: o.n })) },
        { tipo: 'barras', titulo: 'Clientes novos por mês, hoje e no cenário de queda', formato: 'num',
          dados: [{ rotulo: 'Hoje', valor: total, tom: 'cheio' }, { rotulo: `${maior.nome} em queda de ${num(v.queda, 0)}%`, valor: cenario, tom: 'vazado' }] },
      ],
      diagnostico: {
        tipo,
        titulo: { good: 'Clientes bem distribuídos', warn: 'Uma origem pesa demais', bad: 'Você depende de uma origem só' }[tipo],
        texto: `${maior.nome} responde por ${pct(maior.p, 0)} dos clientes novos. Regra de bolso: quando uma origem passa de cerca de 40% do total, a oscilação dela vira oscilação da empresa.`,
        pontos,
      },
    };
  },
});
})();
