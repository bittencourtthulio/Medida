(() => {
registrar({
  id: 'financiar-crescimento-com-caixa',
  nome: 'Financiar crescimento com caixa',
  categoria: 'Finanças',
  descricao: 'Quanto do caixa dá para colocar em aquisição sem ficar abaixo do runway mínimo, e o que isso devolve em 18 meses?',
  termos: 'financiar crescimento com caixa quanto investir em aquisicao orcamento de marketing usar o caixa para crescer runway minimo reserva de caixa queimar caixa para crescer investir em vendas payback caixa projetado',
  campos: [
    { id: 'caixa', rotulo: 'Caixa atual', prefixo: 'R$', valor: 600000 },
    { id: 'burn', rotulo: 'Burn mensal atual', prefixo: 'R$', valor: 25000, dica: 'Custos menos receita recebida, por mês. Use 0 se a empresa não queima.' },
    { id: 'runwayMin', rotulo: 'Runway mínimo a manter', sufixo: 'meses', valor: 9, dica: 'Reserva que você não aceita tocar, em meses de burn.' },
    { id: 'cac', rotulo: 'CAC', prefixo: 'R$', valor: 4000 },
    { id: 'mens', rotulo: 'Mensalidade', prefixo: 'R$', valor: 500 },
    { id: 'margem', rotulo: 'Margem', sufixo: '%', valor: 75, max: 100, dica: 'Receita menos custos diretos de atender o cliente.' },
    { id: 'churn', rotulo: 'Churn mensal', sufixo: '%', valor: 3, max: 100 },
  ],
  calcular(v) {
    const { brl, num } = fmt;
    if (!(v.caixa > 0) || !(v.cac > 0) || !(v.mens > 0) || !(v.margem > 0)) {
      return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe caixa, CAC, mensalidade e margem para calcular quanto do caixa dá para colocar em aquisição.' } };
    }
    const ch = v.churn / 100, contribCli = v.mens * v.margem / 100;
    const reserva = v.runwayMin * v.burn;
    const orcamento = Math.max(0, v.caixa - reserva);
    const clientes = Math.floor(orcamento / v.cac);
    const gasto = clientes * v.cac;
    const mrrNovo = clientes * v.mens;
    const payback = contribCli > 0 ? v.cac / contribCli : NaN;
    const H = 18;
    const sem = [{ x: 0, y: v.caixa }], com = [{ x: 0, y: v.caixa - gasto }];
    let cs = v.caixa, cc = v.caixa - gasto, ativos = clientes;
    for (let t = 1; t <= H; t++) {
      cs -= v.burn;
      cc += -v.burn + ativos * contribCli;
      ativos *= 1 - ch;
      sem.push({ x: t, y: cs }); com.push({ x: t, y: cc });
    }
    const dif = cc - cs;
    const tipo = orcamento <= 0 || clientes < 1 ? 'bad' : cc < 0 ? 'bad' : dif >= 0 ? 'good' : 'warn';

    const pontos = [];
    if (orcamento <= 0) pontos.push(`O caixa de ${brl(v.caixa)} não cobre nem a reserva de ${num(v.runwayMin, 1)} meses de burn (${brl(reserva)}): não há orçamento de aquisição sem ficar abaixo do runway mínimo.`);
    else if (clientes < 1) pontos.push(`O orçamento de ${brl(orcamento)} não compra nem um cliente ao CAC de ${brl(v.cac)}.`);
    else {
      pontos.push(`Caixa de ${brl(v.caixa)} menos a reserva de ${brl(reserva)} (${num(v.runwayMin, 1)} meses de burn) deixa ${brl(orcamento)} para aquisição: ${num(clientes, 0)} clientes ao CAC de ${brl(v.cac)}, somando ${brl(mrrNovo)} de MRR novo.`);
      pontos.push(isFinite(payback) ? `Cada cliente devolve ${brl(contribCli)} de margem por mês, então o CAC volta em ${fmt.meses(payback)}, sem contar o churn.` : 'Sem margem por cliente, o CAC não volta.');
      pontos.push(`Em ${H} meses o caixa chega a ${brl(cc)} com o investimento, contra ${brl(cs)} sem ele: ${dif >= 0 ? 'uma diferença de +' : 'uma diferença de −'}${brl(Math.abs(dif))}.`);
      if (cc < 0) pontos.push('Mesmo com o investimento, o caixa zera antes de 18 meses: reduza o orçamento ou o burn.');
      else if (dif < 0) pontos.push('Em 18 meses o investimento ainda não se pagou: o retorno vem depois, e a reserva precisa aguentar até lá.');
    }
    pontos.push('A conta supõe que todos os clientes entram no início, com CAC, margem e churn constantes, e que o burn atual não muda.');

    return {
      paineis: [
        { tipo: 'linha', titulo: 'Caixa projetado em 18 meses', formato: 'brl', eixoX: 'meses', largo: true,
          series: [{ nome: 'Com o investimento em aquisição', pontos: com }, { nome: 'Sem o investimento', pontos: sem }] },
        { tipo: 'barras', titulo: 'Orçamento de aquisição contra o caixa', formato: 'brl',
          dados: [{ rotulo: 'Caixa atual', valor: v.caixa, tom: 'cheio' }, { rotulo: 'Reserva do runway mínimo', valor: reserva, tom: 'cinza' }, { rotulo: 'Orçamento de aquisição', valor: orcamento, tom: 'hachurado' }, { rotulo: 'Gasto efetivo (clientes × CAC)', valor: gasto, tom: 'pontilhado' }] },
      ],
      kpis: [
        { nome: 'Orçamento de aquisição', valor: brl(orcamento), nota: `${brl(v.caixa)} − ${num(v.runwayMin, 1)} meses × ${brl(v.burn)}`, selo: orcamento > 0 ? null : ['bad', 'sem folga sobre o runway mínimo'] },
        { nome: 'Clientes possíveis', valor: num(clientes, 0), nota: `orçamento ÷ CAC de ${brl(v.cac)}` },
        { nome: 'MRR novo', valor: brl(mrrNovo), nota: `${num(clientes, 0)} clientes × ${brl(v.mens)}` },
        { nome: 'Payback do CAC', valor: isFinite(payback) ? fmt.meses(payback) : '—', nota: 'CAC ÷ margem mensal por cliente, sem churn' },
        { nome: 'Caixa em 18 meses, com investimento', valor: brl(cc), nota: `sem investimento: ${brl(cs)}`, selo: cc < 0 ? ['bad', 'zera antes de 18 meses'] : dif >= 0 ? ['good', 'acima do cenário sem investir'] : ['warn', 'abaixo do cenário sem investir'] },
      ],
      diagnostico: {
        tipo,
        titulo: { good: 'O investimento se paga em 18 meses', warn: 'O retorno vem depois dos 18 meses', bad: orcamento <= 0 ? 'Sem folga de caixa para investir' : clientes < 1 ? 'O orçamento não compra um cliente' : 'O caixa não sustenta o investimento' }[tipo],
        texto: 'O orçamento é o que sobra do caixa depois de separar a reserva de runway mínimo. A projeção compara o caixa com e sem esse investimento, somando a margem dos clientes novos, descontado o churn.',
        pontos,
      },
    };
  },
});
})();
