(() => {
registrar({
  id: 'impacto-do-desconto',
  nome: 'Impacto do desconto no volume',
  categoria: 'Conversão',
  descricao: 'Quanto volume você precisa vender a mais para compensar um desconto, e quando nenhum volume compensa?',
  campos: [
    { id: 'preco', rotulo: 'Preço por cliente ou contrato', prefixo: 'R$', valor: 500, dica: 'Preço de tabela, por mês ou por contrato, o mesmo período do volume.' },
    { id: 'margem', rotulo: 'Margem de contribuição', sufixo: '%', valor: 70, max: 100, dica: 'Sobre o preço: o que sobra depois de custo variável, impostos e taxas.' },
    { id: 'desconto', rotulo: 'Desconto', sufixo: '%', valor: 15, max: 100, dica: 'Sobre o preço de tabela.' },
    { id: 'volume', rotulo: 'Volume atual (clientes ou contratos por mês)', valor: 100 },
  ],
  calcular(v) {
    const { brl, num, pct } = fmt;
    const m = v.margem / 100, d = v.desconto / 100;
    if (!(v.preco > 0) || !(m > 0)) {
      return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe o preço e a margem de contribuição, maiores que zero.' } };
    }
    if (!(d > 0)) {
      return { kpis: [], diagnostico: { tipo: 'good', titulo: 'Sem desconto para compensar', texto: 'Informe o desconto que você pretende dar para ver o volume necessário.', pontos: [`Hoje cada venda deixa ${brl(v.preco * m, 2)} de contribuição (${pct(m, 0)} do preço).`] } };
    }
    const contribAtual = v.preco * m;
    const contribNova = v.preco * (m - d);
    const perdaUnit = v.preco * d;
    const temVolume = v.volume > 0;
    const perdaTotal = v.volume * perdaUnit;
    if (d >= m) {
      return {
        kpis: [
          { nome: 'Contribuição por venda após desconto', valor: brl(contribNova, 2), nota: 'preço × (margem − desconto)', selo: ['bad', d > m ? 'prejuízo' : 'zero'] },
          { nome: 'Aumento de volume necessário', valor: 'Impossível', nota: 'desconto ≥ margem' },
          ...(temVolume ? [{ nome: 'Contribuição perdida se o volume não sobe', valor: brl(perdaTotal), nota: `${num(v.volume, 0)} × ${brl(perdaUnit, 2)}, por mês` }] : []),
        ],
        diagnostico: {
          tipo: 'bad',
          titulo: 'Nenhum volume compensa esse desconto',
          texto: `O desconto de ${pct(d, 0)} é igual ou maior que a margem de contribuição de ${pct(m, 0)}. Cada venda nova deixa ${brl(contribNova, 2)}: vender mais só aumenta a perda.`,
          pontos: [
            `Para ter algum retorno, o desconto precisa ficar abaixo de ${pct(m, 0)}.`,
            'Em vez de baixar o preço, troque desconto por algo que custa pouco para você: prazo de contrato maior, pagamento anual antecipado ou menos usuários no plano.',
          ],
        },
      };
    }
    const extra = d / (m - d);
    const novoVolume = v.volume * (1 + extra);
    const unidades = v.volume * extra;
    const margemApos = (m - d) / (1 - d);
    const tipo = extra >= 1 ? 'bad' : 'warn';
    const pontos = [
      `Com ${pct(d, 0)} de desconto, cada venda deixa ${brl(contribNova, 2)} em vez de ${brl(contribAtual, 2)}. Para fechar a conta, o volume precisa subir ${pct(extra)}: desconto ÷ (margem − desconto) = ${pct(d, 1)} ÷ ${pct(m - d, 1)}.`,
    ];
    if (temVolume) {
      pontos.push(`Isso significa ${num(Math.ceil(novoVolume - 1e-9), 0)} vendas por mês em vez de ${num(v.volume, 0)}: ${num(Math.ceil(unidades - 1e-9), 0)} a mais só para voltar ao mesmo lucro de contribuição.`);
      pontos.push(`Se o volume ficar igual, você abre mão de ${brl(perdaTotal)} por mês, ${brl(perdaTotal * 12)} em 12 meses se o desconto for recorrente.`);
    }
    pontos.push(extra >= 1
      ? 'O volume teria de mais que dobrar. Desconto nessa faixa só faz sentido com uma razão clara de ganho que não seja compensar em volume.'
      : 'Só dê esse desconto se você tem motivo para esperar esse aumento de volume. Se ele serve para fechar uma negociação específica, o que vale é essa venda não acontecer sem ele.');
    pontos.push('Se a margem de contribuição estiver superestimada (custo variável esquecido), o volume necessário é ainda maior.');
    const faixa = Array.from(new Set([5, 10, 15, 20, 30, 40, v.desconto])).filter(x => x < v.margem).sort((x, y) => x - y);
    const linhas = faixa.map(x => `<tr${x === v.desconto ? ' style="font-weight:600"' : ''}><td>${num(x, 1)}%</td><td>${brl(v.preco * (m - x / 100), 2)}</td><td>+${pct((x / 100) / (m - x / 100))}</td></tr>`).join('');
    return {
      kpis: [
        { nome: 'Margem após o desconto', valor: pct(margemApos), nota: `sobre o preço com desconto (antes: ${pct(m, 0)})` },
        { nome: 'Contribuição por venda', valor: brl(contribNova, 2), nota: `antes do desconto: ${brl(contribAtual, 2)}` },
        { nome: 'Aumento de volume necessário', valor: '+' + pct(extra), nota: 'desconto ÷ (margem − desconto)', selo: tipo === 'bad' ? ['bad', 'mais que dobrar'] : ['warn', 'precisa compensar'] },
        ...(temVolume ? [
          { nome: 'Vendas a mais por mês', valor: num(Math.ceil(unidades - 1e-9), 0), nota: `de ${num(v.volume, 0)} para ${num(Math.ceil(novoVolume - 1e-9), 0)}` },
          { nome: 'Contribuição perdida se o volume não sobe', valor: brl(perdaTotal), nota: 'por mês' },
        ] : []),
      ],
      diagnostico: {
        tipo,
        titulo: tipo === 'bad' ? 'O volume precisaria mais que dobrar' : `Desconto de ${pct(d, 0)} exige ${pct(extra, 0)} mais volume`,
        texto: 'Desconto tira dinheiro direto da margem de contribuição, não do preço: por isso o volume necessário cresce mais rápido que o desconto.',
        pontos,
      },
      extra: `<section class="card"><h2>Volume necessário por tamanho de desconto, com sua margem de ${pct(m, 0)}</h2><div class="scroll"><table>
        <tr><th>Desconto</th><th>Contribuição por venda</th><th>Volume a mais</th></tr>${linhas}</table></div></section>`,
    };
  },
});
})();
