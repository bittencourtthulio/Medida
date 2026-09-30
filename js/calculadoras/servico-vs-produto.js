(() => {
registrar({
  id: 'servico-vs-produto',
  nome: 'Serviço vs produto',
  categoria: 'Produtos e Inovação',
  descricao: 'Quantos clientes de produto equivalem à sua receita de serviço, e o que muda quando o ganho deixa de depender de horas?',
  campos: [
    { id: 'receitaServ', rotulo: 'Receita mensal de serviços', prefixo: 'R$', valor: 80000, dica: 'Projetos e horas faturadas por mês.' },
    { id: 'margemServ', rotulo: 'Margem dos serviços', sufixo: '%', max: 100, valor: 40, dica: 'O que sobra da receita depois do custo direto do time.' },
    { id: 'horas', rotulo: 'Horas do time no serviço (mês)', valor: 800, dica: 'Horas dedicadas a entregar esses projetos.' },
    { id: 'preco', rotulo: 'Mensalidade do produto', prefixo: 'R$', valor: 500 },
    { id: 'margemProd', rotulo: 'Margem do produto', sufixo: '%', max: 100, valor: 80, dica: 'Depois de infra, gateway, impostos e suporte por cliente.' },
  ],
  calcular(v) {
    const { brl, num, pct } = fmt;
    const margemServ = v.receitaServ * v.margemServ / 100;
    const porCliente = v.preco * v.margemProd / 100;
    if (!(margemServ > 0) || !(porCliente > 0)) {
      return {
        kpis: [],
        diagnostico: {
          tipo: 'warn', titulo: 'Faltam dados',
          texto: 'Informe receita e margem dos serviços, além de mensalidade e margem do produto, para comparar as duas fontes de receita.',
        },
      };
    }
    const clientes = Math.ceil(margemServ / porCliente);
    const mrr = clientes * v.preco;
    const porHora = v.horas > 0 ? margemServ / v.horas : NaN;
    const produtoMaisEficiente = mrr <= v.receitaServ;
    const tipo = produtoMaisEficiente ? 'good' : 'warn';
    const pontos = [
      `Seus serviços deixam ${brl(margemServ)} de margem por mês. Cada cliente do produto deixa ${brl(porCliente)}, então ${num(clientes, 0)} clientes igualam essa margem.`,
      `Isso exige ${brl(mrr)} de MRR, contra ${brl(v.receitaServ)} de receita de serviço: ${produtoMaisEficiente
        ? 'o produto precisa faturar menos para entregar a mesma margem, porque a margem dele é maior.'
        : 'o produto precisa faturar mais para entregar a mesma margem, porque a margem dele é menor que a do serviço.'}`,
    ];
    if (v.horas > 0) {
      pontos.push(`Cada hora do time rende ${brl(porHora)} de margem no serviço. No produto, o cliente ${num(clientes + 1, 0)} soma ${brl(porCliente)} por mês sem exigir as horas de um novo projeto: esse é o ganho de escala.`);
    } else {
      pontos.push(`Cada cliente a mais soma ${brl(porCliente)} de margem por mês sem exigir as horas de um novo projeto: esse é o ganho de escala.`);
    }
    pontos.push('O produto não é melhor por definição: até chegar aos clientes acima, o serviço segue pagando a conta. Vale usar a margem do serviço para financiar o produto, sem abandonar o caixa atual.');
    pontos.push('A conta supõe que o suporte de cada cliente já está na margem do produto. Se cada cliente novo exigir horas de implantação sob medida, a margem real será menor.');
    return {
      kpis: [
        { nome: 'Margem do serviço', valor: brl(margemServ), nota: `${brl(v.receitaServ)} × ${pct(v.margemServ / 100)}` },
        { nome: 'Margem por hora de serviço', valor: v.horas > 0 ? brl(porHora) : '—', nota: 'margem do serviço ÷ horas do time' },
        { nome: 'Clientes que igualam o serviço', valor: num(clientes, 0), nota: `${brl(margemServ)} ÷ ${brl(porCliente)} por cliente` },
        { nome: 'MRR necessário', valor: brl(mrr), nota: `${num(clientes, 0)} clientes × ${brl(v.preco)}`, selo: produtoMaisEficiente ? ['good', 'abaixo da receita do serviço'] : ['warn', 'acima da receita do serviço'] },
        { nome: 'Margem por cliente adicional', valor: brl(porCliente), nota: 'por mês, sem horas proporcionais' },
      ],
      paineis: [
        { tipo: 'barras', titulo: 'Margem mensal: serviço contra produto', formato: 'brl',
          nota: 'O produto com a metade, o total e o dobro dos clientes que igualam o serviço.',
          dados: [
            { rotulo: 'Serviço', valor: margemServ, tom: 'cheio' },
            { rotulo: `Produto, ${num(Math.ceil(clientes / 2), 0)} clientes`, valor: Math.ceil(clientes / 2) * porCliente, tom: 'vazado' },
            { rotulo: `Produto, ${num(clientes, 0)} clientes`, valor: clientes * porCliente, tom: 'hachurado' },
            { rotulo: `Produto, ${num(clientes * 2, 0)} clientes`, valor: clientes * 2 * porCliente, tom: 'pontilhado' },
          ] },
        { tipo: 'linha', titulo: 'Margem do produto por número de clientes', formato: 'brl', eixoX: 'Clientes do produto',
          nota: 'A linha cheia é a margem do produto; a tracejada é a margem fixa do serviço.',
          series: [
            { nome: 'Margem do produto', pontos: Array.from({ length: 13 }, (_, i) => { const x = Math.round(clientes * 1.5 * i / 12); return { x, y: x * porCliente }; }) },
            { nome: 'Margem do serviço', pontos: [{ x: 0, y: margemServ }, { x: Math.max(1, Math.round(clientes * 1.5)), y: margemServ }] },
          ],
          marcas: [{ x: clientes, y: clientes * porCliente, rotulo: 'Empata' }] },
      ],
      diagnostico: {
        tipo,
        titulo: produtoMaisEficiente ? 'O produto entrega a mesma margem com menos receita' : 'O produto precisa de mais receita para igualar o serviço',
        texto: `Para substituir a margem de ${brl(margemServ)} do serviço, o produto precisa de ${num(clientes, 0)} clientes pagantes.`,
        pontos,
      },
    };
  },
});
})();
