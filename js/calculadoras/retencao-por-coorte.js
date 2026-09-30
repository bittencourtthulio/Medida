(() => {
registrar({
  id: 'retencao-por-coorte',
  nome: 'Retenção por coorte',
  categoria: 'Retenção e Expansão',
  descricao: 'Quanto da coorte sobrevive? Veja a curva de retenção, onde os clientes saem mais e quanto MRR sobra no mês 12.',
  termos: 'coorte cohort curva de retenção sobrevivência sobrevive mês 1 mês 3 mês 6 mês 12 retenção por mês quando os clientes cancelam onde perco clientes vida média lifetime mrr remanescente queda de clientes primeiro mês',
  campos: [
    { id: 'r1', rotulo: 'Clientes que permanecem no mês 1', sufixo: '%', valor: 80, max: 100, dica: 'Mês 0 é 100%. Informe o percentual da coorte ainda ativo em cada marco.' },
    { id: 'r3', rotulo: 'Clientes que permanecem no mês 3', sufixo: '%', valor: 68, max: 100 },
    { id: 'r6', rotulo: 'Clientes que permanecem no mês 6', sufixo: '%', valor: 58, max: 100 },
    { id: 'r12', rotulo: 'Clientes que permanecem no mês 12', sufixo: '%', valor: 45, max: 100 },
    { id: 'mens', rotulo: 'Mensalidade média', prefixo: 'R$', valor: 297 },
    { id: 'clientes', rotulo: 'Clientes da coorte', valor: 200, dica: 'Quantos clientes entraram no mês 0.' },
  ],
  calcular(v) {
    const { brl, num, pct } = fmt;
    if (!(v.r1 > 0) || !(v.clientes > 0)) return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe os clientes da coorte e a retenção do mês 1 (maior que zero).' } };
    if (v.r1 < v.r3 || v.r3 < v.r6 || v.r6 < v.r12) return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Os números não fecham', texto: 'A retenção não pode subir com o tempo: o mês 1 deve ser igual ou maior que o 3, o 3 que o 6 e o 6 que o 12.' } };
    const r = [1, v.r1 / 100, v.r3 / 100, v.r6 / 100, v.r12 / 100];
    const meses = [0, 1, 3, 6, 12];
    const trechos = ['Mês 0 a 1', 'Mês 1 a 3', 'Mês 3 a 6', 'Mês 6 a 12'];
    const dur = [1, 2, 3, 6];
    const churnTrecho = trechos.map((_, i) => r[i] > 0 ? 1 - r[i + 1] / r[i] : 1);
    const churnMes = churnTrecho.map((c, i) => 1 - Math.pow(1 - c, 1 / dur[i]));
    const medio = 1 - Math.pow(r[4], 1 / 12);
    const mUlt = churnMes[3];
    let area = 0;
    for (let i = 0; i < 4; i++) area += (r[i] + r[i + 1]) / 2 * dur[i];
    const cauda = mUlt > 0 ? r[4] / mUlt : Infinity;
    const vida = area + cauda;
    const pior = churnMes.indexOf(Math.max(...churnMes));
    const mrrIni = v.clientes * v.mens;
    const cli = r.map(x => v.clientes * x);
    const mrr = cli.map(c => c * v.mens);
    const tipo = mUlt <= 0.02 ? 'good' : mUlt <= 0.05 ? 'warn' : 'bad';
    const pontos = [
      `A queda mais forte por mês está em ${trechos[pior].toLowerCase()}: ${pct(churnMes[pior])} ao mês (${pct(churnTrecho[pior])} no trecho).`,
      `Do mês 0 ao 12, a coorte perde ${pct(1 - r[4])} dos clientes e o MRR cai de ${brl(mrrIni)} para ${brl(mrr[4])}.`,
      `O churn médio mensal no ano é ${pct(medio)}; no último trecho (mês 6 a 12) é ${pct(mUlt)}.`,
    ];
    if (churnMes[0] > mUlt * 2 && churnMes[0] > 0) pontos.push(`O primeiro mês perde ${pct(churnMes[0])}, bem mais que o fim da curva. Onboarding e ativação são a alavanca mais barata.`);
    else if (mUlt >= churnMes[1] && mUlt > 0.02) pontos.push('A curva não achata: o churn do fim não cai em relação ao começo. O problema parece ser de valor percebido, não só de início.');
    if (isFinite(vida)) pontos.push(`Cada cliente da coorte fica em média cerca de ${num(vida)} meses, por estimativa. Premissa: área sob a curva por interpolação linear até o mês 12, mais uma cauda que segue o churn do último trecho (retenção do mês 12 ÷ churn mensal).`);
    return {
      kpis: [
        { nome: 'Retenção no mês 12', valor: pct(r[4]), nota: `${num(cli[4], 0)} de ${num(v.clientes, 0)} clientes`, selo: tipo === 'good' ? ['good', 'curva estável'] : tipo === 'warn' ? ['warn', 'atenção'] : ['bad', 'crítico'] },
        { nome: 'Churn médio mensal (12 meses)', valor: pct(medio), nota: '1 − retenção do mês 12 elevada a 1/12' },
        { nome: 'Churn mensal no mês 6 a 12', valor: pct(mUlt), nota: 'ritmo do último trecho' },
        { nome: 'Vida média estimada', valor: isFinite(vida) ? num(vida) + ' meses' : 'sem limite', nota: 'área da curva até o mês 12 + cauda pelo último churn' },
        { nome: 'MRR da coorte no mês 12', valor: brl(mrr[4]), nota: `de ${brl(mrrIni)} no mês 0` },
        { nome: 'Trecho de maior queda', valor: trechos[pior], nota: `${pct(churnMes[pior])} ao mês` },
      ],
      paineis: [
        { tipo: 'linha', titulo: 'Curva de retenção da coorte', formato: 'pct', eixoX: 'Meses desde a entrada',
          series: [{ nome: 'Clientes retidos', pontos: meses.map((x, i) => ({ x, y: r[i] })) }] },
        { tipo: 'barras', titulo: 'Churn em cada trecho da curva', nota: 'Percentual da coorte que sobrevivia no início do trecho e saiu até o fim dele.', formato: 'pct',
          dados: trechos.map((t, i) => ({ rotulo: t, valor: churnTrecho[i], tom: i === pior ? 'cheio' : 'hachurado' })) },
        { tipo: 'tabela', titulo: 'Coorte ao longo do tempo', colunas: ['Mês', 'Retenção', 'Clientes', 'MRR'],
          linhas: meses.map((m, i) => [String(m), pct(r[i]), num(cli[i], 0), brl(mrr[i])]) },
      ],
      diagnostico: {
        tipo,
        titulo: tipo === 'good' ? 'A curva achata: quem fica, tende a ficar' : tipo === 'warn' ? 'A coorte ainda vaza no segundo semestre' : 'A coorte continua vazando forte',
        texto: `Com churn mensal de ${pct(mUlt)} entre os meses 6 e 12, a coorte termina o ano com ${pct(r[4])} dos clientes. Regra de bolso, não meta: churn de até 2% ao mês é tratado como saudável e acima de 5% como problema em SaaS para PME. A vida média é estimativa e depende da cauda assumida.`,
        pontos,
      },
    };
  },
});
})();
