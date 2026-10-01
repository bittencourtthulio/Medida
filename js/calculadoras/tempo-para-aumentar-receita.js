(() => {
registrar({
  id: 'tempo-para-aumentar-receita',
  nome: 'Tempo para aumentar a receita',
  categoria: 'Finanças',
  descricao: 'Em quantos meses a receita recorrente sobe R$ X, medida na base bruta e na base líquida, no ritmo de crescimento atual?',
  termos: 'tempo para aumentar a receita quantos meses para subir mrr receita bruta receita liquida recorrencia saas crescimento mensal meta de faturamento quando a receita cresce X',
  campos: [
    { id: 'receitaBruta', rotulo: 'Receita bruta mensal atual', prefixo: 'R$', valor: 80000, dica: 'MRR bruto, antes de imposto, taxa e comissão.' },
    { id: 'deducoes', rotulo: 'Deduções da receita', sufixo: '%', max: 100, valor: 18, dica: 'Impostos, gateway e comissões. Líquida = bruta × (1 − alíquota).' },
    { id: 'crescimento', rotulo: 'Crescimento mensal da receita', sufixo: '%', max: 100, valor: 5, dica: 'Ritmo composto, igual para bruta e líquida.' },
    { id: 'aumento', rotulo: 'Aumento desejado (X)', prefixo: 'R$', valor: 40000, dica: 'Os mesmos reais a mais por mês, medidos em cada base.' },
  ],
  calcular(v) {
    const { brl, num, pct } = fmt;
    const g = v.crescimento / 100;
    const aliq = v.deducoes / 100;
    const X = v.aumento;
    const bruta = v.receitaBruta;
    const liquida = bruta * (1 - aliq);

    // meses até a base subir X; null quando não chega (ou base inválida)
    const meses = (base, gg = g) => {
      if (!(base > 0) || !(X >= 0)) return null;
      if (X === 0) return 0;
      if (!(gg > 0)) return null;
      const m = Math.log((base + X) / base) / Math.log(1 + gg);
      return Number.isFinite(m) && m >= 0 ? m : null;
    };
    // primeiro mês inteiro em que o aumento acumulado alcança X
    const cruza = (base) => {
      if (!(base > 0) || !(X >= 0)) return null;
      if (X === 0) return 0;
      if (!(g > 0)) return null;
      for (let k = 1; k <= 1200; k++) if (base * Math.pow(1 + g, k) - base >= X - 1e-9) return k;
      return null;
    };
    const mB = meses(bruta);
    const mL = meses(liquida);
    const fm = m => (m == null ? '—' : num(m, 1) + (Math.round(m * 10) / 10 === 1 ? ' mês' : ' meses'));

    const finitos = [mB, mL].filter(m => m != null);
    const maxPrazo = finitos.length ? Math.max(...finitos) : null;
    const N = maxPrazo != null ? Math.max(1, Math.min(36, Math.ceil(maxPrazo))) : 12;
    const cB = cruza(bruta), cL = cruza(liquida);
    const valor = (base, k) => (base > 0 ? base * Math.pow(1 + g, k) : 0);

    const paineis = [];
    paineis.push(finitos.length
      ? { tipo: 'barras', titulo: 'Meses para subir o valor X', formato: 'mes',
          dados: [mB != null && { rotulo: 'Bruta', valor: mB, tom: 'cheio' }, mL != null && { rotulo: 'Líquida', valor: mL, tom: 'hachurado' }].filter(Boolean) }
      : { tipo: 'barras', titulo: 'Receita atual, bruta e líquida', formato: 'brl',
          dados: [{ rotulo: 'Bruta', valor: Math.max(0, bruta), tom: 'cheio' }, { rotulo: 'Líquida', valor: Math.max(0, liquida), tom: 'hachurado' }] });

    const ser = (nome, base) => ({ nome, pontos: Array.from({ length: N + 1 }, (_, k) => ({ x: k, y: valor(base, k) })) });
    const marcas = [];
    if (cB != null && cB <= N) marcas.push({ x: cB, y: valor(bruta, cB), rotulo: 'Bruta' });
    if (cL != null && cL <= N) marcas.push({ x: cL, y: valor(liquida, cL), rotulo: 'Líquida' });
    paineis.push({ tipo: 'linha', titulo: 'Receita mensal mês a mês', formato: 'brl', eixoX: 'meses', linhaZero: false,
      series: [ser('Bruta', bruta), ser('Líquida', liquida)], marcas });

    const M = Math.min(23, maxPrazo != null ? Math.ceil(maxPrazo) + 1 : 11);
    const linhas = [];
    for (let k = 0; k <= M; k++) {
      const b = valor(bruta, k), l = valor(liquida, k);
      const tb = k === cB ? 'cheio' : '', tl = k === cL ? 'hachurado' : '';
      linhas.push([
        String(k),
        { v: brl(b), tom: tb },
        { v: bruta > 0 ? brl(b - bruta) : '—', tom: tb },
        { v: brl(l), tom: tl },
        { v: liquida > 0 ? brl(l - liquida) : '—', tom: tl },
      ]);
    }
    paineis.push({ tipo: 'tabela', titulo: 'Mês a mês: receita e aumento nas duas bases',
      nota: 'Cheio: mês em que a bruta alcança o aumento X. Hachurado: o mesmo para a líquida.',
      colunas: ['Mês', 'Bruta', 'Aumento bruto', 'Líquida', 'Aumento líquido'], linhas });

    const nota = 'meses = ln((base + X) ÷ base) ÷ ln(1 + crescimento), com X em reais a mais por mês em cada base';
    const kpis = [
      { nome: 'Meses até a bruta subir R$ X', valor: fm(mB), nota },
      { nome: 'Meses até a líquida subir R$ X', valor: fm(mL), nota },
      { nome: 'Receita bruta ao chegar', valor: bruta > 0 ? brl(bruta + X) : '—', nota: 'bruta atual + X' },
      { nome: 'Receita líquida ao chegar', valor: liquida > 0 ? brl(liquida + X) : '—', nota: 'líquida atual + X' },
    ];

    let tipo;
    if (mB == null || mL == null) tipo = 'bad';
    else if (mB > 0 && mL >= 2 * mB) tipo = 'warn';
    else tipo = 'good';
    const selo = { bad: ['bad', 'não chega neste ritmo'], warn: ['warn', 'líquida leva o dobro ou mais'], good: ['good', 'as duas chegam'] }[tipo];
    kpis[0].selo = selo;

    if (!(bruta > 0)) {
      return { kpis, paineis, diagnostico: { tipo: 'bad', titulo: 'Faltam dados', texto: 'Informe a receita bruta mensal atual, maior que zero, para calcular em quantos meses ela sobe R$ X.', pontos: [] } };
    }
    if (X > 0 && !(g > 0)) {
      return { kpis, paineis, diagnostico: { tipo: 'bad', titulo: 'Neste ritmo a receita não sobe',
        texto: `Com crescimento de ${pct(g)} ao mês, a receita de ${brl(bruta)} não chega a ${brl(bruta + X)}. Sem crescimento positivo não há prazo para subir ${brl(X)}.`,
        pontos: [`Informe um crescimento mensal acima de 0% para ver em quantos meses a bruta e a líquida sobem ${brl(X)}.`] } };
    }
    if (mL == null) {
      return { kpis, paineis, diagnostico: { tipo: 'bad', titulo: 'A líquida não existe com essa dedução',
        texto: `Com deduções de ${pct(aliq)}, a receita líquida é ${brl(Math.max(0, liquida))} e não há base para medir o aumento. A bruta sobe ${brl(X)} em ${fm(mB)}.`,
        pontos: ['Confira o percentual de deduções: impostos, gateway e comissões somados não costumam consumir toda a receita.'] } };
    }

    const pontos = [
      `Bruta: de ${brl(bruta)} para ${brl(bruta + X)} em ${fm(mB)}, crescendo ${pct(g)} ao mês.`,
      `Líquida: de ${brl(liquida)} para ${brl(liquida + X)} em ${fm(mL)}. Os mesmos ${brl(X)} pesam mais numa base menor, por isso a líquida demora mais.`,
    ];
    if (X > 0) {
      pontos.push(`A diferença é de ${num(mL - mB, 1)} ${Math.round((mL - mB) * 10) / 10 === 1 ? 'mês' : 'meses'}, causada só pela alíquota de ${pct(aliq)}.`);
      const mG = meses(liquida, g + 0.01);
      if (mG != null) pontos.push(`Subir o crescimento de ${pct(g)} para ${pct(g + 0.01)} ao mês reduz o prazo da líquida de ${fm(mL)} para ${fm(mG)}.`);
      if (aliq > 0) {
        const lMenos = bruta * (1 - Math.max(0, aliq - 0.05));
        const mD = meses(lMenos);
        if (mD != null) pontos.push(`Reduzir a dedução em 5 pontos percentuais (de ${pct(aliq)} para ${pct(Math.max(0, aliq - 0.05))}) leva a líquida a ${brl(lMenos)} e o prazo a ${fm(mD)}.`);
      }
    }
    pontos.push('Meta de prazo para a líquida: some ao crescimento ou à margem da receita, não só ao número bruto.');

    return { kpis, paineis, diagnostico: {
      tipo,
      titulo: tipo === 'warn' ? 'A líquida leva o dobro do prazo da bruta' : 'As duas bases chegam à meta',
      texto: `Subir ${brl(X)} por mês na receita leva ${fm(mB)} na bruta e ${fm(mL)} na líquida, com crescimento composto de ${pct(g)} ao mês. A líquida demora mais porque a base é menor: a alíquota de ${pct(aliq)} tira receita do ponto de partida. Leitura da própria conta, sem comparação com mercado.`,
      pontos,
    } };
  },
});
})();
