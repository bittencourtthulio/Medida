(() => {
registrar({
  id: 'comissao-de-vendas',
  nome: 'Custo do time comercial e comissão',
  categoria: 'Conversão',
  descricao: 'Quanto custa vender? Custo do time por cliente fechado, peso sobre o novo MRR e payback de vendas.',
  termos: 'comissão de vendas custo do time comercial quanto custa vender cac de vendas custo por cliente vendedor salário fixo variável sdr closer payback folha comercial custo de aquisição time de vendas remuneração',
  campos: [
    { id: 'vendedores', rotulo: 'Vendedores', valor: 3 },
    { id: 'salario', rotulo: 'Salário base por vendedor (mês)', prefixo: 'R$', valor: 4000, dica: 'Inclua encargos se quiser o custo real.' },
    { id: 'comissao', rotulo: 'Comissão sobre o 1º ano do contrato', sufixo: '%', valor: 10, max: 100, dica: 'Percentual aplicado sobre 12 mensalidades de cada cliente fechado. Se a sua comissão é sobre uma única mensalidade, divida o percentual por 12 (ex.: 100% de 1 mensalidade = 8,3%).' },
    { id: 'mensalidade', rotulo: 'Mensalidade por cliente', prefixo: 'R$', valor: 500 },
    { id: 'fechamentos', rotulo: 'Clientes fechados por vendedor (mês)', valor: 4 },
    { id: 'outros', rotulo: 'Outros custos do time comercial (mês)', prefixo: 'R$', valor: 3000, opcional: true, dica: 'Ferramentas, gestor, viagens. Custo do time todo.' },
    { id: 'margem', rotulo: 'Margem bruta do produto', sufixo: '%', valor: 75, max: 100, dica: 'Usada no payback: quanto de cada mensalidade sobra depois do custo de entregar.' },
  ],
  calcular(v) {
    const { brl, num, pct } = fmt;
    const clientes = v.vendedores * v.fechamentos;
    if (!(clientes > 0) || !(v.mensalidade > 0)) {
      return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe vendedores, clientes fechados por vendedor e a mensalidade, maiores que zero.' } };
    }
    const fixo = v.vendedores * v.salario;
    const variavel = clientes * v.mensalidade * 12 * v.comissao / 100;
    const total = fixo + variavel + v.outros;
    const cac = total / clientes;
    const novoMrr = clientes * v.mensalidade;
    const peso = total / novoMrr;
    const m = v.margem / 100;
    const margemMensal = v.mensalidade * m;
    const payback = margemMensal > 0 ? cac / margemMensal : Infinity;
    const margemAno = margemMensal * 12;
    const tipo = !isFinite(payback) || payback > 18 ? 'bad' : payback > 12 ? 'warn' : 'good';
    const pontos = [
      `O time custa ${brl(total)} por mês: ${brl(fixo)} de salário base, ${brl(variavel)} de comissão e ${brl(v.outros)} de outros custos.`,
      `Cada cliente fechado custa ${brl(cac)} em vendas (${brl(total)} ÷ ${num(clientes, 0)} clientes) e traz ${brl(v.mensalidade)} de mensalidade.`,
      `O time gasta ${pct(peso, 0)} do novo MRR que entra por mês: para cada R$ 1 de mensalidade nova, R$ ${num(peso, 2)} vão para o custo de vender.`,
      isFinite(payback)
        ? `Com ${pct(m, 0)} de margem bruta, o cliente devolve o custo de vendas em ${num(payback)} meses (${brl(cac)} ÷ ${brl(margemMensal, 2)} por mês).`
        : 'Sem margem bruta informada, o custo de vendas nunca é devolvido.',
    ];
    if (isFinite(payback)) pontos.push('Regra de bolso: payback de vendas até 12 meses é considerado saudável em SaaS; acima de 18 meses o caixa trava o crescimento. Este cálculo inclui só o custo comercial, não o de marketing.');
    if (cac > margemAno) pontos.push(`O custo de vender é maior que a margem do 1º ano (${brl(margemAno)}): o cliente só dá lucro se ficar mais de 12 meses.`);
    return {
      kpis: [
        { nome: 'Custo total do time', valor: brl(total), nota: 'fixo + comissão + outros, por mês' },
        { nome: 'Custo de vendas por cliente', valor: brl(cac), nota: 'custo do time ÷ clientes fechados' },
        { nome: 'Custo do time sobre o novo MRR', valor: pct(peso, 0), nota: `${brl(total)} ÷ ${brl(novoMrr)} de novo MRR` },
        { nome: 'Payback de vendas', valor: isFinite(payback) ? num(payback) + ' meses' : '∞', nota: 'custo por cliente ÷ margem bruta mensal', selo: tipo === 'good' ? ['good', 'até 12 meses'] : tipo === 'warn' ? ['warn', 'entre 12 e 18'] : ['bad', 'acima de 18'] },
        { nome: 'Novo MRR por mês', valor: brl(novoMrr), nota: `${num(clientes, 0)} clientes × ${brl(v.mensalidade)}` },
      ],
      paineis: [
        { tipo: 'composicao', titulo: 'Do que é feito o custo do time, por mês', formato: 'brl',
          partes: [{ rotulo: 'Salário base', valor: fixo, tom: 'cheio' }, { rotulo: 'Comissão', valor: variavel, tom: 'hachurado' }, { rotulo: 'Outros custos', valor: v.outros, tom: 'pontilhado' }] },
        { tipo: 'barras', titulo: 'Custo de vender um cliente contra a margem do 1º ano', formato: 'brl',
          dados: [{ rotulo: 'Custo de vendas', valor: cac, tom: 'vazado' }, { rotulo: 'Margem do 1º ano', valor: margemAno, tom: 'cheio' }] },
      ],
      diagnostico: {
        tipo,
        titulo: { good: 'Vender se paga rápido', warn: 'Payback de vendas longo', bad: 'Vender custa caro demais para a margem' }[tipo],
        texto: 'Compara o custo do time comercial com o que cada cliente devolve de margem. O payback considera só vendas, sem marketing.',
        pontos,
      },
    };
  },
});
})();
