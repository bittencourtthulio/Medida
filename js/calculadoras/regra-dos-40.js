(() => {
registrar({
  id: 'regra-dos-40',
  nome: 'Regra dos 40%',
  categoria: 'Finanças',
  descricao: 'Seu crescimento e sua margem fecham 40? Some os dois e veja quanto falta de cada lado.',
  campos: [
    { id: 'cresc', rotulo: 'Crescimento anual da receita', sufixo: '%', valor: 30, dica: 'Receita recorrente de hoje contra a de 12 meses atrás.' },
    { id: 'crescNeg', rotulo: 'A receita encolheu no ano?', tipo: 'checkbox', valor: false, dica: 'Marque para tratar o crescimento como negativo.' },
    { id: 'margem', rotulo: 'Margem de lucro', sufixo: '%', valor: 5, dica: 'EBITDA ou fluxo de caixa livre como % da receita. Use sempre a mesma base.' },
    { id: 'margemNeg', rotulo: 'A empresa opera no prejuízo?', tipo: 'checkbox', valor: false, dica: 'Marque para tratar a margem como negativa.' },
  ],
  calcular(v) {
    const { num } = fmt;
    const g = v.crescNeg ? -v.cresc : v.cresc;
    const m = v.margemNeg ? -v.margem : v.margem;
    if (v.cresc === 0 && v.margem === 0) {
      return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe o crescimento anual da receita e a margem de lucro.' } };
    }
    const soma = g + m;
    const dist = 40 - soma;
    const ok = soma >= 40;
    const tipo = ok ? 'good' : soma > 0 ? 'warn' : 'bad';
    const sinal = x => (x > 0 ? '+' : '') + num(x) + '%';

    const pontos = [`${sinal(g)} de crescimento ${m < 0 ? '−' : '+'} ${num(Math.abs(m))}% de margem = ${num(soma)} pontos.`];
    if (ok) {
      pontos.push(`Você passa da linha em ${num(soma - 40)} pontos: pode trocar essa folga por crescimento (investir mais) ou por margem, conforme o momento.`);
    } else {
      pontos.push(`Faltam ${num(dist)} pontos. Ou o crescimento vai de ${num(g)}% para ${num(g + dist)}%, mantendo a margem, ou a margem vai de ${num(m)}% para ${num(m + dist)}%, mantendo o crescimento.`);
      pontos.push(`Meio a meio, seria ${num(g + dist / 2)}% de crescimento e ${num(m + dist / 2)}% de margem.`);
    }
    if (m < 0 && g > 0) pontos.push(`Você compra crescimento com caixa: a margem de ${num(m)}% é o custo dos ${num(g)}% de crescimento. Confira o runway antes de acelerar.`);
    if (g <= 0 && m > 0) pontos.push('A margem positiva está segurando a soma, mas sem crescimento a receita só diminui de valor com o tempo. Priorize o que destrava novas vendas.');
    if (g < 0) pontos.push(`Com a receita encolhendo ${num(-g)}%, atacar churn costuma ser o caminho mais curto para voltar a crescer.`);

    return {
      kpis: [
        { nome: 'Regra dos 40%', valor: num(soma) + ' pontos', nota: 'crescimento + margem', selo: ok ? ['good', 'fecha 40'] : soma > 0 ? ['warn', 'abaixo de 40'] : ['bad', 'soma zero ou negativa'] },
        { nome: ok ? 'Folga sobre 40' : 'Distância para 40', valor: num(Math.abs(dist)) + ' pontos', nota: ok ? 'quanto passou da linha' : 'quanto falta na soma' },
        ...(!ok ? [
          { nome: 'Crescimento necessário', valor: num(g + dist) + '%', nota: `mantendo a margem de ${num(m)}%` },
          { nome: 'Margem necessária', valor: num(m + dist) + '%', nota: `mantendo o crescimento de ${num(g)}%` },
        ] : []),
      ],
      diagnostico: {
        tipo,
        titulo: { good: 'Você fecha os 40%', warn: 'Abaixo dos 40%, mas positivo', bad: 'Crescimento e margem não se sustentam' }[tipo],
        texto: 'A Regra dos 40% é uma regra de bolso de investidores de SaaS: crescimento mais margem deveria passar de 40. Empresas pequenas e jovens costumam ser julgadas mais pelo crescimento, e a regra pesa mais quanto maior e mais madura a operação.',
        pontos,
      },
    };
  },
});
})();
