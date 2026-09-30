(() => {
registrar({
  id: 'health-score',
  nome: 'Saúde da base',
  categoria: 'Retenção e Expansão',
  descricao: 'Quanto da receita está em risco na base? Distribua clientes e MRR por faixa de saúde e estime a perda esperada.',
  termos: 'health score saúde do cliente saúde da base clientes em risco receita em risco mrr em risco churn esperado faixa de saúde atenção saudável semáforo customer success cs previsão de churn quanto vou perder',
  campos: [
    { id: 'cSaud', rotulo: 'Clientes saudáveis', valor: 240 },
    { id: 'mSaud', rotulo: 'MRR dos saudáveis', prefixo: 'R$', valor: 72000 },
    { id: 'cAt', rotulo: 'Clientes em atenção', valor: 100 },
    { id: 'mAt', rotulo: 'MRR dos clientes em atenção', prefixo: 'R$', valor: 29700 },
    { id: 'cRisco', rotulo: 'Clientes em risco', valor: 60 },
    { id: 'mRisco', rotulo: 'MRR dos clientes em risco', prefixo: 'R$', valor: 17820 },
    { id: 'pAt', rotulo: 'Perda esperada em atenção (hipótese)', sufixo: '%', valor: 10, max: 100, dica: 'Hipótese sua: que parte do MRR em atenção você espera perder.' },
    { id: 'pRisco', rotulo: 'Perda esperada em risco (hipótese)', sufixo: '%', valor: 40, max: 100, dica: 'Hipótese sua: que parte do MRR em risco você espera perder.' },
  ],
  calcular(v) {
    const { brl, num, pct } = fmt;
    const cli = v.cSaud + v.cAt + v.cRisco;
    const mrr = v.mSaud + v.mAt + v.mRisco;
    if (!(mrr > 0) || !(cli > 0)) return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe clientes e MRR em pelo menos uma faixa de saúde.' } };
    const perdAt = v.mAt * v.pAt / 100, perdRisco = v.mRisco * v.pRisco / 100;
    const perda = perdAt + perdRisco;
    const esperado = mrr - perda;
    const pRiscoMrr = v.mRisco / mrr, pAtMrr = v.mAt / mrr;
    const tipo = pRiscoMrr >= 0.15 ? 'bad' : pRiscoMrr >= 0.05 || pAtMrr >= 0.3 ? 'warn' : 'good';
    const pontos = [
      `${pct(v.mRisco / mrr)} do MRR (${brl(v.mRisco)}) está em ${num(v.cRisco, 0)} clientes em risco; em atenção há mais ${brl(v.mAt)} (${pct(pAtMrr)}).`,
      `Com as suas hipóteses (${num(v.pAt, 0)}% de perda em atenção, ${num(v.pRisco, 0)}% em risco), o churn esperado é ${brl(perda)} de MRR, ${pct(perda / mrr)} da base. O MRR ponderado esperado fica em ${brl(esperado)}.`,
      `Quase toda a perda esperada vem de ${perdRisco >= perdAt ? 'clientes em risco' : 'clientes em atenção'}: ${brl(Math.max(perdAt, perdRisco))}.`,
    ];
    if (v.cRisco > 0) pontos.push(`O MRR médio por cliente em risco é ${brl(v.mRisco / v.cRisco)}, contra ${v.cSaud > 0 ? brl(v.mSaud / v.cSaud) : '—'} nos saudáveis.`);
    pontos.push(`Cada ponto percentual de atenção que volta a saudável protege cerca de ${brl(v.mAt * 0.01)} de MRR. As hipóteses de perda são suas, não uma previsão.`);
    return {
      kpis: [
        { nome: 'MRR em risco', valor: brl(v.mRisco), nota: `${pct(pRiscoMrr)} do MRR total`, selo: tipo === 'good' ? ['good', 'risco baixo'] : tipo === 'warn' ? ['warn', 'atenção'] : ['bad', 'risco alto'] },
        { nome: 'Churn esperado em MRR', valor: brl(perda), nota: `${pct(perda / mrr)} do MRR, pelas suas hipóteses` },
        { nome: 'MRR ponderado esperado', valor: brl(esperado), nota: 'MRR total − perda esperada' },
        { nome: 'Clientes saudáveis', valor: pct(v.cSaud / cli), nota: `${pct(v.mSaud / mrr)} do MRR` },
        { nome: 'Clientes em atenção', valor: pct(v.cAt / cli), nota: `${pct(pAtMrr)} do MRR` },
        { nome: 'Clientes em risco', valor: pct(v.cRisco / cli), nota: `${pct(pRiscoMrr)} do MRR` },
      ],
      paineis: [
        { tipo: 'composicao', titulo: 'Como o MRR se divide por faixa', formato: 'brl', partes: [{ rotulo: 'Saudáveis', valor: v.mSaud, tom: 'cheio' }, { rotulo: 'Atenção', valor: v.mAt, tom: 'pontilhado' }, { rotulo: 'Em risco', valor: v.mRisco, tom: 'vazado' }] },
        { tipo: 'barras', titulo: 'Clientes por faixa', formato: 'int', dados: [{ rotulo: 'Saudáveis', valor: v.cSaud, tom: 'cheio' }, { rotulo: 'Atenção', valor: v.cAt, tom: 'pontilhado' }, { rotulo: 'Em risco', valor: v.cRisco, tom: 'vazado' }] },
        { tipo: 'barras', titulo: 'MRR esperado perdido por faixa', nota: 'Usa as hipóteses de perda que você informou.', formato: 'brl', dados: [{ rotulo: 'Atenção', valor: perdAt, tom: 'pontilhado' }, { rotulo: 'Em risco', valor: perdRisco, tom: 'vazado' }, { rotulo: 'Total', valor: perda, tom: 'cheio' }] },
      ],
      diagnostico: {
        tipo,
        titulo: tipo === 'good' ? 'A receita está concentrada em clientes saudáveis' : tipo === 'warn' ? 'Parte relevante da receita pede acompanhamento' : 'Muita receita está em clientes em risco',
        texto: `Você tem ${pct(pRiscoMrr)} do MRR em risco e ${pct(pAtMrr)} em atenção. Os cortes de alerta (5% do MRR em risco, 15% para crítico, 30% em atenção) são critério desta calculadora, não benchmark de mercado. A perda esperada depende das hipóteses que você informou.`,
        pontos,
      },
    };
  },
});
})();
