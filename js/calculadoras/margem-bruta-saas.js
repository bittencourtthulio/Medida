(() => {
registrar({
  id: 'margem-bruta-saas',
  nome: 'Margem bruta do SaaS',
  categoria: 'Finanças',
  descricao: 'Quanto sobra de cada real de receita depois dos custos diretos de entregar o produto?',
  termos: 'margem bruta gross margin cogs custo direto custo de entrega quanto sobra de cada real hospedagem infra suporte licencas terceiros implantacao onboarding margem saas lucro bruto',
  campos: [
    { id: 'receita', rotulo: 'Receita mensal', prefixo: 'R$', valor: 120000 },
    { id: 'infra', rotulo: 'Hospedagem e infra', prefixo: 'R$', valor: 14000, dica: 'Nuvem, banco, CDN, monitoramento.' },
    { id: 'suporte', rotulo: 'Suporte ao cliente', prefixo: 'R$', valor: 12000, dica: 'Time de suporte e ferramentas de atendimento.' },
    { id: 'licencas', rotulo: 'Licenças e terceiros', prefixo: 'R$', valor: 6000, dica: 'APIs, gateway de pagamento, e-mail, dados de terceiros usados no produto.' },
    { id: 'impl', rotulo: 'Implantação e onboarding', prefixo: 'R$', valor: 5000 },
    { id: 'outros', rotulo: 'Outros custos diretos', prefixo: 'R$', valor: 3000, opcional: true },
    { id: 'clientes', rotulo: 'Clientes ativos', valor: 250, opcional: true, dica: 'Preenchido, mostra o custo direto por cliente.' },
  ],
  calcular(v) {
    const { brl, num, pct } = fmt;
    if (!(v.receita > 0)) {
      return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe a receita mensal e os custos diretos para calcular a margem bruta.' } };
    }
    const itens = [
      { rotulo: 'Hospedagem e infra', valor: v.infra }, { rotulo: 'Suporte', valor: v.suporte }, { rotulo: 'Licenças e terceiros', valor: v.licencas },
      { rotulo: 'Implantação e onboarding', valor: v.impl }, { rotulo: 'Outros custos diretos', valor: v.outros },
    ];
    const custo = itens.reduce((s, x) => s + x.valor, 0);
    const bruto = v.receita - custo;
    const margem = bruto / v.receita;
    const maior = itens.reduce((a, b) => (b.valor > a.valor ? b : a), itens[0]);
    const margem10 = (bruto + maior.valor * 0.1) / v.receita;
    const porCliente = v.clientes > 0 ? custo / v.clientes : NaN;
    const tipo = margem < 0.5 ? 'bad' : margem < 0.7 ? 'warn' : 'good';

    const pontos = [`De cada R$ 1 de receita, ${brl(custo / v.receita, 2)} vai para custo direto e ${brl(Math.max(margem, 0), 2)} sobra para pagar time, vendas, marketing e lucro.`];
    if (custo > 0) pontos.push(`O maior custo direto é ${maior.rotulo.toLowerCase()}: ${brl(maior.valor)} por mês, ${pct(maior.valor / v.receita)} da receita.`);
    if (maior.valor > 0) pontos.push(`Cortar 10% desse custo (${brl(maior.valor * 0.1)} por mês) leva a margem de ${pct(margem)} para ${pct(margem10)}.`);
    if (isFinite(porCliente)) pontos.push(`Cada cliente custa ${brl(porCliente)} por mês para ser atendido, com ${num(v.clientes, 0)} clientes ativos.`);
    if (margem < 0.7) pontos.push('Regra de bolso de quem avalia SaaS: margem bruta de 70% ou mais. Abaixo disso, suporte, infra e implantação pesam como serviço, não como software.');
    if (v.impl > 0 && v.impl / v.receita > 0.05) pontos.push(`Implantação consome ${pct(v.impl / v.receita)} da receita: cobre-a à parte ou automatize o onboarding.`);

    const paineis = [
      { tipo: 'composicao', titulo: 'Para onde vai cada real de receita', formato: 'brl',
        partes: [...itens.filter(x => x.valor > 0).map((x, i) => ({ rotulo: x.rotulo, valor: x.valor, tom: ['hachurado', 'pontilhado', 'vazado', 'cinza', 'hachurado'][i % 5] })), { rotulo: 'Margem bruta', valor: Math.max(bruto, 0), tom: 'cheio' }] },
      { tipo: 'barras', titulo: 'Custos diretos por mês', formato: 'brl', dados: [...itens].sort((a, b) => b.valor - a.valor).map((x, i) => ({ rotulo: x.rotulo, valor: x.valor, tom: i === 0 ? 'cheio' : 'hachurado' })) },
    ];
    return {
      paineis,
      kpis: [
        { nome: 'Margem bruta', valor: pct(margem), nota: `${brl(bruto)} sobram de ${brl(v.receita)}`, selo: tipo === 'good' ? ['good', 'acima de 70%'] : tipo === 'warn' ? ['warn', 'abaixo de 70%'] : ['bad', 'abaixo de 50%'] },
        { nome: 'Custo direto total', valor: brl(custo), nota: `${pct(custo / v.receita)} da receita` },
        { nome: 'Custo direto por cliente', valor: isFinite(porCliente) ? brl(porCliente) : '—', nota: isFinite(porCliente) ? `${brl(custo)} ÷ ${num(v.clientes, 0)} clientes` : 'informe os clientes ativos' },
        { nome: 'Maior custo direto', valor: custo > 0 ? maior.rotulo : '—', nota: custo > 0 ? `${brl(maior.valor)} por mês (${pct(maior.valor / v.receita)} da receita)` : 'sem custos informados' },
        { nome: 'Margem se o maior custo cair 10%', valor: pct(margem10), nota: `ganho de ${num((margem10 - margem) * 100)} pontos` },
      ],
      diagnostico: {
        tipo,
        titulo: { good: 'Margem bruta saudável', warn: 'Margem bruta abaixo da regra de bolso', bad: 'Margem bruta baixa: a entrega consome a receita' }[tipo],
        texto: 'Margem bruta é o que sobra da receita depois dos custos diretos de entregar o produto. A regra de bolso de 70% ou mais é uma referência de quem avalia SaaS, não uma lei: serviço e implantação pesada puxam a margem para baixo.',
        pontos,
      },
    };
  },
});
})();
