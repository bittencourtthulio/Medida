(() => {
registrar({
  id: 'dso-e-inadimplencia',
  nome: 'DSO e inadimplência',
  categoria: 'Finanças',
  descricao: 'Em quantos dias você recebe o que fatura, quanto está vencido e quanto caixa um DSO menor libera?',
  termos: 'dso dias de recebimento prazo medio de recebimento inadimplencia atraso recebiveis contas a receber vencidos cobranca caixa em quantos dias eu recebo calote',
  campos: [
    { id: 'fat', rotulo: 'Faturamento do período', prefixo: 'R$', valor: 200000, dica: 'Total faturado no período informado abaixo.' },
    { id: 'aberto', rotulo: 'Recebíveis em aberto (total)', prefixo: 'R$', valor: 260000, dica: 'Tudo que foi faturado e ainda não entrou no caixa, em dia ou vencido.' },
    { id: 'v30', rotulo: 'Dos quais vencidos há mais de 30 dias', prefixo: 'R$', valor: 60000, dica: 'Faixas acumuladas: o valor de 60 dias já está dentro do de 30.' },
    { id: 'v60', rotulo: 'Dos quais vencidos há mais de 60 dias', prefixo: 'R$', valor: 30000 },
    { id: 'v90', rotulo: 'Dos quais vencidos há mais de 90 dias', prefixo: 'R$', valor: 15000 },
    { id: 'dias', rotulo: 'Dias do período', sufixo: 'dias', valor: 30, max: 366 },
    { id: 'prazo', rotulo: 'Prazo de pagamento combinado', sufixo: 'dias', valor: 30, opcional: true, dica: 'Serve de régua para o DSO. Deixe 0 se não houver prazo padrão.' },
  ],
  calcular(v) {
    const { brl, num, pct } = fmt;
    if (!(v.fat > 0) || !(v.aberto > 0) || !(v.dias > 0)) {
      return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe o faturamento do período, os recebíveis em aberto e os dias do período para calcular o DSO.' } };
    }
    const a30 = Math.min(v.v30, v.aberto), a60 = Math.min(v.v60, a30), a90 = Math.min(v.v90, a60);
    const emDia = v.aberto - a30;
    const dso = v.aberto / v.fat * v.dias;
    const diario = v.fat / v.dias;
    const diasMenos = Math.min(5, dso);
    const dsoMenos = dso - diasMenos;
    const liberado = diario * diasMenos;
    const pVenc = a30 / v.aberto, p90 = a90 / v.aberto;
    const razao = v.prazo > 0 ? dso / v.prazo : NaN;
    let tipo = !isFinite(razao) ? (p90 > 0.1 ? 'bad' : pVenc > 0.2 ? 'warn' : 'good') : razao <= 1.25 ? 'good' : razao <= 2 ? 'warn' : 'bad';
    if (tipo === 'good' && a90 > 0) tipo = 'warn';

    const pontos = [`Você leva em média ${num(dso, 0)} dias para receber: ${brl(v.aberto)} em aberto ÷ ${brl(v.fat)} faturados × ${num(v.dias, 0)} dias.`];
    if (isFinite(razao)) pontos.push(`O prazo combinado é de ${num(v.prazo, 0)} dias, então o DSO está em ${num(razao, 2)}x o prazo. Como regra de bolso, até 1,25x é normal; acima disso a cobrança está atrasando o caixa.`);
    if (a30 > 0) pontos.push(`${brl(a30)} (${pct(pVenc)} dos recebíveis) está vencido há mais de 30 dias; ${brl(a90)} (${pct(p90)}) há mais de 90.`);
    if (a90 > 0) pontos.push('Quanto mais antigo o atraso, menor a chance de receber. Priorize a cobrança da faixa acima de 90 dias e decida o que provisionar como perda.');
    pontos.push(`Cada dia a menos de DSO libera ${brl(diario)} de caixa. Cair ${num(diasMenos, 0)} dias, para ${num(dsoMenos, 0)}, libera ${brl(liberado)}.`);

    const paineis = [
      { tipo: 'composicao', titulo: 'Como os recebíveis se dividem por atraso', formato: 'brl',
        partes: [{ rotulo: 'Em dia ou vencido há até 30 dias', valor: emDia, tom: 'cheio' }, { rotulo: 'Vencido de 30 a 60 dias', valor: a30 - a60, tom: 'hachurado' }, { rotulo: 'Vencido de 60 a 90 dias', valor: a60 - a90, tom: 'pontilhado' }, { rotulo: 'Vencido há mais de 90 dias', valor: a90, tom: 'vazado' }] },
      { tipo: 'barras', titulo: 'DSO atual contra DSO cinco dias menor', formato: 'num', nota: 'Valores em dias.',
        dados: [{ rotulo: 'DSO atual', valor: dso, tom: 'cheio' }, { rotulo: `DSO com −${num(diasMenos, 0)} dias`, valor: dsoMenos, tom: 'hachurado' }],
        meta: v.prazo > 0 ? { rotulo: 'Prazo combinado', valor: v.prazo } : undefined },
    ];
    return {
      paineis,
      kpis: [
        { nome: 'DSO', valor: num(dso, 0) + ' dias', nota: 'recebíveis em aberto ÷ faturamento × dias do período', selo: isFinite(razao) ? (razao <= 1.25 ? ['good', 'perto do prazo'] : razao <= 2 ? ['warn', 'acima do prazo'] : ['bad', 'muito acima do prazo']) : null },
        { nome: 'Vencido há mais de 30 dias', valor: pct(pVenc), nota: `${brl(a30)} de ${brl(v.aberto)} em aberto` },
        { nome: 'Vencido há mais de 90 dias', valor: pct(p90), nota: `${brl(a90)} em aberto` },
        { nome: 'Caixa liberado com DSO −5 dias', valor: brl(liberado), nota: `faturamento diário de ${brl(diario)} × ${num(diasMenos, 0)} dias` },
      ],
      diagnostico: {
        tipo,
        titulo: { good: 'Você recebe perto do prazo', warn: 'Recebimento mais lento que o ideal', bad: 'O caixa está preso nos recebíveis' }[tipo],
        texto: 'DSO é o prazo médio, em dias, que a empresa leva para receber o que fatura. Quanto maior, mais caixa fica preso com clientes. A comparação com o seu prazo combinado é regra de bolso.',
        pontos,
      },
    };
  },
});
})();
