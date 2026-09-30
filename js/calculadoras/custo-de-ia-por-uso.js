(() => {
registrar({
  id: 'custo-de-ia-por-uso',
  nome: 'Custo de IA por cliente',
  categoria: 'Tecnologia e IA',
  descricao: 'Quanto a IA custa por requisição, por cliente e no mês, e qual mensalidade mínima mantém esse custo dentro do seu teto?',
  campos: [
    { id: 'reqs', rotulo: 'Requisições de IA por cliente/mês', valor: 400, dica: 'Média de chamadas ao modelo que um cliente gera por mês. Veja nos logs do seu provedor.' },
    { id: 'tokIn', rotulo: 'Tokens médios de entrada por requisição', valor: 1500, dica: 'Prompt, contexto e histórico enviados. O painel do provedor mostra o consumo médio.' },
    { id: 'tokOut', rotulo: 'Tokens médios de saída por requisição', valor: 500, dica: 'Tamanho médio da resposta gerada.' },
    { id: 'precoIn', rotulo: 'Preço por 1 milhão de tokens de entrada', prefixo: 'R$', valor: 15, dica: 'Veja a página de preços do provedor e converta para reais; valor padrão é apenas exemplo.' },
    { id: 'precoOut', rotulo: 'Preço por 1 milhão de tokens de saída', prefixo: 'R$', valor: 60, dica: 'Veja a página de preços do provedor e converta para reais; valor padrão é apenas exemplo.' },
    { id: 'clientes', rotulo: 'Clientes ativos', valor: 200 },
    { id: 'ticket', rotulo: 'Mensalidade', prefixo: 'R$', valor: 297 },
    { id: 'teto', rotulo: 'Teto da IA sobre o preço', sufixo: '%', max: 100, valor: 20, dica: 'Quanto da mensalidade você aceita gastar com IA. Defina o seu; 20% é só exemplo de regra de bolso.' },
  ],
  calcular(v) {
    const { brl, num, pct } = fmt;
    const custoReq = (v.tokIn * v.precoIn + v.tokOut * v.precoOut) / 1e6;
    const custoCli = custoReq * v.reqs;
    if (!(v.ticket > 0) || !(v.clientes > 0) || !(custoCli > 0)) {
      return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe requisições, tokens, preços por milhão de tokens, clientes e mensalidade para calcular o custo da IA.' } };
    }
    const total = custoCli * v.clientes;
    const receita = v.clientes * v.ticket;
    const peso = custoCli / v.ticket;
    const teto = v.teto / 100;
    const minimo = teto > 0 ? custoCli / teto : NaN;
    const tetoReq = v.reqs > 0 ? teto * v.ticket / v.reqs : NaN;
    const margemIa = 1 - peso;
    const tipo = teto <= 0 ? (peso > 0 ? 'bad' : 'good') : peso <= teto ? 'good' : peso <= teto * 1.5 ? 'warn' : 'bad';
    const pontos = [
      `Cada requisição custa ${brl(custoReq, 4)}; com ${num(v.reqs, 0)} requisições por cliente, são ${brl(custoCli, 2)} por cliente e ${brl(total)} no mês para ${num(v.clientes, 0)} clientes.`,
      `A IA ocupa ${pct(peso)} da mensalidade de ${brl(v.ticket)}. Sobram ${brl(v.ticket - custoCli, 2)} por cliente antes de infraestrutura, time e impostos.`,
    ];
    if (teto > 0 && peso > teto) {
      pontos.push(`Para respeitar o teto de ${pct(teto, 0)}, a mensalidade precisa ser de pelo menos ${brl(minimo)}: ${pct(minimo / v.ticket - 1, 0)} acima da atual.`);
      pontos.push(`Sem mexer no preço, a requisição teria de custar no máximo ${brl(tetoReq, 4)}, ou seja ${pct(1 - tetoReq / custoReq, 0)} menos que hoje. Caminhos: encurtar o contexto enviado, usar um modelo mais barato nas tarefas simples, guardar respostas repetidas em cache ou limitar requisições por plano.`);
    } else if (teto > 0) {
      pontos.push(`Você está dentro do teto de ${pct(teto, 0)}. A mensalidade mínima para esse teto seria ${brl(minimo)}, e você cobra ${brl(v.ticket)}.`);
      pontos.push(`Há folga para o uso crescer: a IA pode custar até ${brl(v.ticket * teto, 2)} por cliente antes de passar do teto, cerca de ${num(v.ticket * teto / custoCli, 1)} vezes o consumo atual.`);
    }
    pontos.push(`Cada 100 tokens a menos de saída por requisição economizam ${brl(100 * v.precoOut / 1e6 * v.reqs * v.clientes)} por mês; cada 100 a menos de entrada, ${brl(100 * v.precoIn / 1e6 * v.reqs * v.clientes)}.`);
    return {
      kpis: [
        { nome: 'Custo de IA por requisição', valor: brl(custoReq, 4), nota: '(entrada × preço entrada + saída × preço saída) ÷ 1 milhão' },
        { nome: 'Custo de IA por cliente', valor: brl(custoCli, 2), nota: `${num(v.reqs, 0)} requisições por mês` },
        { nome: 'Custo de IA total no mês', valor: brl(total), nota: `${pct(total / receita)} da receita de ${brl(receita)}` },
        { nome: 'IA sobre a mensalidade', valor: pct(peso), nota: `teto definido: ${pct(teto, 0)}`, selo: tipo === 'good' ? ['good', 'dentro do teto'] : tipo === 'warn' ? ['warn', 'acima do teto'] : ['bad', 'muito acima'] },
        { nome: 'Mensalidade mínima para o teto', valor: teto > 0 ? brl(minimo) : '—', nota: `custo de IA por cliente ÷ ${pct(teto, 0)}` },
        { nome: 'Margem após IA', valor: pct(margemIa), nota: 'mensalidade − IA, antes dos demais custos' },
      ],
      diagnostico: {
        tipo,
        titulo: { good: 'IA cabe no preço', warn: 'IA acima do teto definido', bad: 'IA come a mensalidade' }[tipo],
        texto: `A IA custa ${brl(custoCli, 2)} por cliente, ${pct(peso)} da mensalidade, contra um teto de ${pct(teto, 0)} que você mesmo definiu. Os preços vêm dos campos que você preencheu: confira com a página de preços do provedor. Se o custo de IA crescer mais rápido que a receita, é a margem do produto que paga a conta.`,
        pontos,
      },
    };
  },
});
})();
