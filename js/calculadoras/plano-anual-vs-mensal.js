(() => {
registrar({
  id: 'plano-anual-vs-mensal',
  nome: 'Plano anual contra mensal',
  categoria: 'Finanças',
  descricao: 'Vale dar desconto no plano anual? Compare o caixa antecipado com a receita que o cliente mensal ainda renderia.',
  termos: 'plano anual plano mensal desconto anual desconto no plano anual vale a pena pagamento antecipado caixa antecipado meses gratis cobrar anual migrar para anual churn anual precificacao anual',
  campos: [
    { id: 'mens', rotulo: 'Mensalidade', prefixo: 'R$', valor: 400 },
    { id: 'desc', rotulo: 'Desconto no plano anual', sufixo: '%', valor: 15, max: 100 },
    { id: 'migra', rotulo: 'Clientes que migrariam para o anual', sufixo: '%', valor: 30, max: 100 },
    { id: 'clientes', rotulo: 'Clientes atuais', valor: 300 },
    { id: 'churn', rotulo: 'Churn mensal', sufixo: '%', valor: 4, max: 100 },
  ],
  calcular(v) {
    const { brl, num, pct } = fmt;
    const migrados = v.clientes * v.migra / 100;
    if (!(v.mens > 0) || !(migrados > 0)) {
      return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe a mensalidade, os clientes atuais e o percentual que migraria para o plano anual.' } };
    }
    const ch = v.churn / 100, d = v.desc / 100;
    const anual = v.mens * 12 * (1 - d);
    const gratis = 12 * d;
    const antecipado = migrados * anual;
    const fator = ch > 0 ? (1 - Math.pow(1 - ch, 12)) / ch : 12;
    const esperadoMensal = v.mens * fator;
    const dif = anual - esperadoMensal;
    const descEq = Math.max(0, 1 - esperadoMensal / (v.mens * 12));
    const mrrCedido = migrados * v.mens * d;
    const sobrevivem = Math.pow(1 - ch, 12);
    const tipo = dif >= 0 ? 'good' : 'warn';

    const acumMensal = [];
    let acum = 0, vivo = 1;
    for (let t = 0; t <= 12; t++) { acumMensal.push({ x: t, y: acum }); acum += v.mens * vivo; vivo *= 1 - ch; }

    const pontos = [
      `O anual custa ${brl(anual)} por cliente, o equivalente a ${num(gratis, 1)} meses grátis em 12. Com ${num(migrados, 0)} clientes migrando, entram ${brl(antecipado)} no caixa de uma vez.`,
      `Um cliente mensal com ${num(v.churn)}% de churn rende ${brl(esperadoMensal)} esperados em 12 meses; o anual rende ${brl(anual)} garantidos. ${dif >= 0 ? `O anual rende ${brl(dif)} a mais.` : `O mensal rende ${brl(-dif)} a mais, em receita.`}`,
      `O anual elimina o churn por 12 meses: no mensal, ${pct(1 - sobrevivem)} dos clientes sairiam antes do fim do ano.`,
      `O desconto que empata as duas receitas é ${pct(descEq)}. ${v.desc / 100 > descEq ? 'Seu desconto passa dele: você troca receita por caixa antecipado.' : 'Seu desconto está abaixo dele: o anual rende mais, além de antecipar caixa.'}`,
      `Do lado do custo: migrar ${num(migrados, 0)} clientes com esse desconto reduz o MRR equivalente em ${brl(mrrCedido)} por mês.`,
    ];
    if (ch === 0) pontos.push('Com churn zero, o cliente mensal rende o ano inteiro e o desconto só perde receita; o ganho do anual fica no caixa antecipado.');

    return {
      paineis: [
        { tipo: 'linha', titulo: 'Caixa acumulado por cliente em 12 meses', formato: 'brl', eixoX: 'meses', largo: true,
          series: [{ nome: 'Plano mensal (esperado, com churn)', pontos: acumMensal }, { nome: 'Plano anual (pago na assinatura)', pontos: [{ x: 0, y: anual }, { x: 12, y: anual }] }] },
        { tipo: 'barras', titulo: `Caixa da base que migraria (${num(migrados, 0)} clientes)`, formato: 'brl',
          dados: [{ rotulo: 'Caixa no 1º mês, mensal', valor: migrados * v.mens, tom: 'hachurado' }, { rotulo: 'Caixa no 1º mês, anual', valor: antecipado, tom: 'cheio' }, { rotulo: 'Receita em 12 meses, mensal', valor: migrados * esperadoMensal, tom: 'pontilhado' }, { rotulo: 'Receita em 12 meses, anual', valor: antecipado, tom: 'cheio' }] },
      ],
      kpis: [
        { nome: 'Preço do plano anual', valor: brl(anual), nota: `${brl(v.mens)} × 12 com ${pct(d)} de desconto` },
        { nome: 'Meses grátis equivalentes', valor: num(gratis, 1) + ' meses', nota: '12 × desconto' },
        { nome: 'Caixa antecipado', valor: brl(antecipado), nota: `${num(migrados, 0)} clientes × ${brl(anual)}` },
        { nome: 'Receita em 12 meses, cliente mensal', valor: brl(esperadoMensal), nota: `esperada, com ${num(v.churn)}% de churn ao mês` },
        { nome: 'Receita em 12 meses, cliente anual', valor: brl(anual), nota: 'garantida, sem churn no período', selo: dif >= 0 ? ['good', 'rende mais que o mensal'] : ['warn', 'rende menos que o mensal'] },
        { nome: 'Desconto de equilíbrio', valor: pct(descEq), nota: 'desconto em que o anual iguala a receita esperada do mensal' },
        { nome: 'Efeito no churn', valor: pct(1 - sobrevivem), nota: 'parcela dos clientes mensais que sairia em 12 meses e que o anual segura' },
      ],
      diagnostico: {
        tipo,
        titulo: dif >= 0 ? 'O desconto se paga em receita e ainda antecipa caixa' : 'O desconto custa receita em troca de caixa antecipado',
        texto: 'A comparação é por cliente em 12 meses: a receita esperada do plano mensal, já descontado o churn, contra o valor do anual, pago na assinatura. Não considera o que acontece depois do primeiro ano.',
        pontos,
      },
    };
  },
});
})();
