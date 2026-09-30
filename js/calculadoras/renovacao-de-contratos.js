(() => {
registrar({
  id: 'renovacao-de-contratos',
  nome: 'Renovação de contratos',
  categoria: 'Retenção e Expansão',
  descricao: 'Quanto da receita que vence neste período você renova? Compare a renovação em clientes com a renovação em valor.',
  campos: [
    { id: 'vencem', rotulo: 'Contratos que vencem no período', valor: 50 },
    { id: 'igual', rotulo: 'Renovaram sem mudança', valor: 30 },
    { id: 'aumento', rotulo: 'Renovaram com aumento', valor: 10 },
    { id: 'desconto', rotulo: 'Renovaram com desconto', valor: 5 },
    { id: 'valor', rotulo: 'Valor médio anual do contrato', prefixo: 'R$', valor: 18000 },
    { id: 'pctAumento', rotulo: 'Aumento médio nos que subiram', sufixo: '%', valor: 8, max: 1000 },
    { id: 'pctDesconto', rotulo: 'Desconto médio nos que pediram', sufixo: '%', valor: 10, max: 100 },
  ],
  calcular(v) {
    const { brl, num, pct } = fmt;
    if (!(v.vencem > 0) || !(v.valor > 0)) return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe quantos contratos vencem e o valor médio anual deles.' } };
    const renovados = v.igual + v.aumento + v.desconto;
    if (renovados > v.vencem) return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Os números não fecham', texto: `Você informou ${num(renovados, 0)} renovações, mas só ${num(v.vencem, 0)} contratos vencem. Revise os três campos de renovação.` } };
    const perdidos = v.vencem - renovados;
    const taxaLogo = renovados / v.vencem;
    const vencia = v.vencem * v.valor;
    const aumentoR = v.aumento * v.valor * (v.pctAumento / 100);
    const descontoR = v.desconto * v.valor * (v.pctDesconto / 100);
    const renovadaR = renovados * v.valor + aumentoR - descontoR;
    const perdidaR = perdidos * v.valor;
    const taxaValor = renovadaR / vencia;
    const efeito = aumentoR - descontoR;
    const s = x => (x >= 0 ? '+' : '-') + brl(Math.abs(x));
    const tipo = taxaValor >= 1 ? 'good' : perdidos > 0 ? 'bad' : 'warn';
    const pontos = [];
    pontos.push(`Dos ${brl(vencia)} que venciam, ${brl(renovadaR)} foram renovados: ${pct(taxaValor)} em valor contra ${pct(taxaLogo)} em contratos.`);
    if (perdidos > 0) pontos.push(`${num(perdidos, 0)} contratos não renovaram, o que são ${brl(perdidaR)} de receita anual perdida (${pct(perdidaR / vencia)} do que vencia).`);
    pontos.push(`Reajustes somam ${brl(aumentoR)} e descontos custam ${brl(descontoR)}: efeito líquido de ${s(efeito)}.`);
    if (efeito >= perdidaR && perdidaR > 0) pontos.push('Os reajustes compensam a receita dos contratos perdidos. Confirme se o aumento não está empurrando clientes para o cancelamento no próximo ciclo.');
    else if (perdidos > 0 && v.aumento > 0) pontos.push(`Para cobrir a perda só com reajuste, seria preciso ${brl(perdidaR - efeito)} a mais; isso equivale a cerca de ${num((perdidaR - efeito) / v.valor, 1)} contratos renovados a mais.`);
    if (v.desconto > 0) pontos.push(`${num(v.desconto, 0)} renovações vieram com desconto. Se o desconto é o que segura o cliente, vale descobrir o motivo real: preço, uso baixo ou concorrente.`);
    const puxa = perdidaR >= descontoR ? 'a perda de contratos' : 'os descontos';
    pontos.push(taxaValor < 1 ? `O que mais puxa a renovação em valor para baixo é ${puxa}: ${brl(Math.max(perdidaR, descontoR))}.` : `Sem reajuste, a renovação em valor seria ${pct((renovados * v.valor - descontoR) / vencia)}; o aumento é o que leva o número acima de 100%.`);
    return {
      kpis: [
        { nome: 'Taxa de renovação (contratos)', valor: pct(taxaLogo), nota: `${num(renovados, 0)} de ${num(v.vencem, 0)} contratos` },
        { nome: 'Renovação em valor', valor: pct(taxaValor), nota: 'receita renovada ÷ receita que vencia', selo: taxaValor >= 1 ? ['good', 'acima de 100%'] : ['warn', 'abaixo de 100%'] },
        { nome: 'Receita que vencia', valor: brl(vencia), nota: 'contratos × valor médio anual' },
        { nome: 'Receita renovada', valor: brl(renovadaR), nota: 'já com reajustes e descontos' },
        { nome: 'Receita perdida', valor: brl(perdidaR), nota: `${num(perdidos, 0)} contratos não renovados` },
        { nome: 'Efeito líquido de preço', valor: s(efeito), nota: 'reajustes − descontos' },
      ],
      paineis: [
        { tipo: 'funil', titulo: 'Dos contratos que vencem aos que renovam com aumento', formato: 'int',
          etapas: [{ rotulo: 'Vencem', valor: v.vencem }, { rotulo: 'Renovam', valor: renovados }, { rotulo: 'Com aumento', valor: v.aumento }] },
        { tipo: 'barras', titulo: 'Receita que vencia, renovada e perdida', formato: 'brl',
          dados: [{ rotulo: 'Vencia', valor: vencia, tom: 'cheio' }, { rotulo: 'Renovada', valor: renovadaR, tom: 'hachurado' }, { rotulo: 'Perdida', valor: perdidaR, tom: 'vazado' }] },
      ],
      diagnostico: {
        tipo,
        titulo: taxaValor >= 1 ? 'Você renova mais receita do que vencia' : perdidos > 0 ? 'A renovação perde receita' : 'Todos renovam, mas os descontos reduzem a receita',
        texto: taxaValor >= 1
          ? `Renovação em valor acima de 100% é matemática: os contratos que ficaram e os reajustes superam o que saiu. Sua taxa é ${pct(taxaValor)}.`
          : `Renovação em valor abaixo de 100% significa que a carteira que vence rende menos no ciclo seguinte. Sua taxa é ${pct(taxaValor)}, contra ${pct(taxaLogo)} em contratos.`,
        pontos,
      },
    };
  },
});
})();
