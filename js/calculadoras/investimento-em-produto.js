(() => {
registrar({
  id: 'investimento-em-produto',
  nome: 'Investimento em produto novo',
  categoria: 'Produtos e Inovação',
  descricao: 'Quando um produto novo se paga, considerando o custo do MVP, a manutenção e o churn mês a mês?',
  campos: [
    { id: 'pessoas', rotulo: 'Pessoas no MVP', valor: 3 },
    { id: 'mesesMvp', rotulo: 'Meses para entregar o MVP', valor: 4 },
    { id: 'custoPessoa', rotulo: 'Custo mensal por pessoa', prefixo: 'R$', valor: 15000, dica: 'Salário, encargos e custo de alocação.' },
    { id: 'manut', rotulo: 'Manutenção e infra (mês)', prefixo: 'R$', valor: 8000, dica: 'Custo fixo do produto depois de lançado.' },
    { id: 'novos', rotulo: 'Clientes novos por mês', valor: 8, dica: 'Premissa sua: é o número mais incerto da conta.' },
    { id: 'preco', rotulo: 'Mensalidade', prefixo: 'R$', valor: 600 },
    { id: 'margem', rotulo: 'Margem por cliente', sufixo: '%', max: 100, valor: 75, dica: 'Depois de infra variável, gateway, impostos e suporte.' },
    { id: 'churn', rotulo: 'Churn mensal', sufixo: '%', max: 100, valor: 3 },
  ],
  calcular(v) {
    const { brl, num, pct } = fmt;
    const invest = v.pessoas * v.mesesMvp * v.custoPessoa;
    const m = v.margem / 100, ch = v.churn / 100;
    if (!(invest > 0) || !(v.novos > 0) || !(v.preco * m > 0)) {
      return {
        kpis: [{ nome: 'Investimento total', valor: brl(invest), nota: 'pessoas × meses × custo' }],
        diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe o custo do MVP, os clientes novos por mês, a mensalidade e a margem para simular o retorno.' },
      };
    }
    const MAX = 60;
    // Simulação por cliente novo unitário: soma de clientes-mês é linear em "novos".
    let base = 0, acum = -invest, payback = null, clientes24 = 0;
    const linhas = [];
    let clientesMeses24 = 0, clientesMeses24Unit = 0, unit = 0;
    const res = {};
    for (let t = 1; t <= MAX; t++) {
      base = base * (1 - ch) + v.novos;
      unit = unit * (1 - ch) + 1;
      const margemMes = base * v.preco * m - v.manut;
      acum += margemMes;
      if (payback === null && acum >= 0) payback = t;
      if (t <= 24) { clientesMeses24 += base; clientesMeses24Unit += unit; }
      res[t] = { clientes: base, mrr: base * v.preco, margemMes, acum };
    }
    const r12 = res[12], r24 = res[24];
    const roi24 = (r24.acum + invest) / invest - 1;
    const aposta = r24.acum >= 0;
    const tipo = payback !== null && payback <= 12 ? 'good' : payback !== null && payback <= 24 ? 'warn' : 'bad';
    // Mudanças necessárias para pagar em 24 meses (modelo linear em novos e em preço).
    const custo24 = invest + 24 * v.manut;
    const novosNec = custo24 / (clientesMeses24Unit * v.preco * m);
    const precoNec = custo24 / (clientesMeses24 * m);
    const pontos = [
      `O investimento total é ${brl(invest)} (${num(v.pessoas, 0)} pessoas × ${num(v.mesesMvp, 0)} meses × ${brl(v.custoPessoa)}). Os clientes esperados são premissa sua: a Medida não sabe se o mercado compra nesse ritmo.`,
      `Em 12 meses: ${num(r12.clientes, 0)} clientes e ${brl(r12.mrr)} de MRR. Em 24 meses: ${num(r24.clientes, 0)} clientes e ${brl(r24.mrr)} de MRR, já considerando ${pct(ch)} de churn por mês.`,
    ];
    if (payback !== null && payback <= 24) {
      pontos.push(`O produto devolve o investimento no mês ${payback}. Em 24 meses o retorno é ${pct(roi24)} sobre o que foi investido.`);
      pontos.push(`Teste de estresse: com metade dos clientes novos (${num(v.novos / 2, 1)} por mês) a conta deixa de fechar? Vale validar o ritmo de vendas com pré-venda antes de construir.`);
    } else {
      pontos.push(payback === null
        ? `Nessa trajetória o produto não se paga nem em ${MAX} meses: a margem mensal dos clientes não cobre a manutenção de ${brl(v.manut)} e o churn.`
        : `O produto só se paga no mês ${payback}, depois da janela de 24 meses. Em 24 meses o resultado acumulado é ${brl(r24.acum)}.`);
      pontos.push(`Para pagar em 24 meses com o mesmo preço, seriam necessários cerca de ${num(Math.ceil(novosNec), 0)} clientes novos por mês (hoje: ${num(v.novos, 0)}).`);
      pontos.push(`Ou, com o mesmo ritmo de vendas, uma mensalidade de cerca de ${brl(Math.ceil(precoNec))} (hoje: ${brl(v.preco)}).`);
    }
    if (ch > 0) pontos.push(`O churn importa: com ${pct(ch)} ao mês, a base tende a estabilizar perto de ${num(v.novos / ch, 0)} clientes, e o MRR não passa de ${brl(v.novos / ch * v.preco)} sem mais esforço de aquisição.`);
    const linhasHtml = [3, 6, 12, 18, 24].map(t => `<tr><td>Mês ${t}</td><td>${num(res[t].clientes, 0)}</td><td>${brl(res[t].mrr)}</td><td>${brl(res[t].margemMes)}</td><td>${brl(res[t].acum)}</td></tr>`).join('');
    const extra = `<section class="card"><h3>Trajetória do produto</h3><table><thead><tr><th>Mês</th><th>Clientes</th><th>MRR</th><th>Resultado do mês</th><th>Acumulado (já abatido o MVP)</th></tr></thead><tbody>${linhasHtml}</tbody></table></section>`;
    return {
      kpis: [
        { nome: 'Investimento total', valor: brl(invest), nota: 'pessoas × meses × custo mensal' },
        { nome: 'MRR em 12 meses', valor: brl(r12.mrr), nota: `${num(r12.clientes, 0)} clientes, margem líquida do mês ${brl(r12.margemMes)}` },
        { nome: 'MRR em 24 meses', valor: brl(r24.mrr), nota: `${num(r24.clientes, 0)} clientes, margem líquida do mês ${brl(r24.margemMes)}` },
        { nome: 'Payback', valor: payback === null ? 'além de ' + MAX + ' meses' : fmt.meses(payback), nota: 'mês em que o acumulado cobre o MVP', selo: tipo === 'good' ? ['good', 'no primeiro ano'] : tipo === 'warn' ? ['warn', 'no segundo ano'] : ['bad', 'fora de 24 meses'] },
        { nome: 'ROI em 24 meses', valor: pct(roi24), nota: '(resultado acumulado em 24 meses) ÷ investimento', selo: aposta ? ['good', 'positivo'] : ['bad', 'negativo'] },
      ],
      diagnostico: {
        tipo,
        titulo: tipo === 'good' ? 'O produto se paga no primeiro ano' : tipo === 'warn' ? 'O produto se paga, mas só no segundo ano' : 'O produto não se paga em 24 meses',
        texto: 'Simulação mês a mês: entram clientes novos, saem pelo churn, e a margem cobre a manutenção antes de abater o MVP.',
        pontos,
      },
      extra,
    };
  },
});
})();
