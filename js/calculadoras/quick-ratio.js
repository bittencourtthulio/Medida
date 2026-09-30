(() => {
registrar({
  id: 'quick-ratio',
  nome: 'SaaS Quick Ratio',
  categoria: 'Retenção e Expansão',
  descricao: 'Você ganha mais receita do que perde? Compare o MRR que entra (novos e expansão) com o que sai (churn e contração).',
  campos: [
    { id: 'novo', rotulo: 'MRR de clientes novos', prefixo: 'R$', valor: 30000, dica: 'MRR de clientes que entraram no período.' },
    { id: 'expansao', rotulo: 'MRR de expansão', prefixo: 'R$', valor: 10000, dica: 'Upsell e cross-sell em clientes existentes, no mesmo período.' },
    { id: 'churn', rotulo: 'MRR de churn', prefixo: 'R$', valor: 8000, dica: 'MRR dos cancelamentos, no mesmo período.' },
    { id: 'contracao', rotulo: 'MRR de contração', prefixo: 'R$', valor: 3000, dica: 'MRR perdido em downgrades, no mesmo período.' },
  ],
  calcular(v) {
    const { brl, num } = fmt;
    const ganho = v.novo + v.expansao;
    const perda = v.churn + v.contracao;
    if (!(ganho > 0) && !(perda > 0)) return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe o MRR que entrou e o que saiu no período.' } };
    const liquido = ganho - perda;
    const sinal = liquido >= 0 ? '+' : '-';
    const semPerda = !(perda > 0);
    const qr = semPerda ? Infinity : ganho / perda;
    const tipo = semPerda ? 'good' : qr >= 4 ? 'good' : qr > 1 ? 'warn' : 'bad';
    const pontos = [];
    pontos.push(`Entram ${brl(ganho)} (novos ${brl(v.novo)} + expansão ${brl(v.expansao)}) e saem ${brl(perda)} (churn ${brl(v.churn)} + contração ${brl(v.contracao)}).`);
    pontos.push(`O MRR líquido do período é ${sinal}${brl(Math.abs(liquido))}.`);
    if (!semPerda) {
      pontos.push(`Para cada R$ 1 perdido, você repõe R$ ${num(qr, 2)}.`);
      if (qr > 1 && qr < 4) pontos.push(`Para chegar a 4 (regra de bolso de SaaS), com a mesma perda seria preciso ganhar ${brl(perda * 4)}, ou seja, ${brl(perda * 4 - ganho)} a mais. Com o mesmo ganho, a perda teria de cair para ${brl(ganho / 4)}.`);
      if (qr <= 1) pontos.push(`Para parar de encolher, falta ganhar ${brl(perda - ganho)} ou reduzir a perda na mesma medida.`);
      const maiorPerda = v.churn >= v.contracao ? `cancelamentos (${brl(v.churn)})` : `downgrades (${brl(v.contracao)})`;
      pontos.push(`A maior parte da perda vem de ${maiorPerda}. Comece por aí.`);
    }
    if (ganho > 0) {
      const dep = v.novo / ganho;
      pontos.push(v.expansao > 0
        ? `${num(dep * 100, 0)}% do que entra vem de clientes novos e ${num((1 - dep) * 100, 0)}% da base existente. Quanto maior a parte da base, menos o crescimento depende de aquisição.`
        : 'Todo o ganho vem de clientes novos. Expansão da base ainda é alavanca sem uso.');
    }
    return {
      kpis: [
        { nome: 'Quick ratio', valor: semPerda ? '—' : num(qr, 2), nota: semPerda ? 'sem perdas no período' : '(novo + expansão) ÷ (churn + contração)', selo: tipo === 'good' ? ['good', semPerda ? 'sem perdas' : 'cresce forte'] : tipo === 'warn' ? ['warn', 'cresce, com folga curta'] : ['bad', 'encolhe'] },
        { nome: 'Crescimento líquido de MRR', valor: sinal + brl(Math.abs(liquido)), nota: 'ganho − perda no período' },
        { nome: 'Reposição de cada R$ 1 perdido', valor: semPerda ? '—' : 'R$ ' + num(qr, 2), nota: 'ganho ÷ perda' },
        { nome: 'MRR que entra', valor: brl(ganho), nota: 'novos + expansão' },
        { nome: 'MRR que sai', valor: brl(perda), nota: 'churn + contração' },
      ],
      diagnostico: {
        tipo,
        titulo: semPerda ? 'Sem perdas no período' : qr > 1 ? 'Você ganha mais do que perde' : qr === 1 ? 'Entra e sai na mesma medida' : 'Você perde mais do que ganha: o MRR encolhe',
        texto: semPerda
          ? 'Sem churn nem contração informados, o quick ratio não se calcula, mas o MRR só sobe. Confira se os números de perda foram preenchidos.'
          : qr > 1
            ? `Acima de 1, o MRR cresce, por matemática. Seu quick ratio é ${num(qr, 2)}. Regra de bolso conhecida em SaaS: 4 ou mais indica crescimento eficiente; é referência, não meta, e muda com estágio e mercado.`
            : `Abaixo de 1, o MRR encolhe, por matemática. Seu quick ratio é ${num(qr, 2)}: o que entra não cobre o que sai. A referência de bolso em SaaS é 4, e você está longe disso.`,
        pontos,
      },
    };
  },
});
})();
