(() => {
registrar({
  id: 'margem-por-projeto',
  nome: 'Margem por projeto',
  categoria: 'Entrega e Operação',
  termos: 'margem projeto lucro projeto deu lucro estouro de horas horas orçadas orçamento software house margem real hora vendida prejuízo projeto fechado escopo fechado',
  descricao: 'Esse projeto deu lucro de verdade? Compare a margem que você orçou com a que sobrou depois das horas reais.',
  campos: [
    { id: 'valor', rotulo: 'Valor do projeto', prefixo: 'R$', valor: 80000, dica: 'O que foi cobrado do cliente, sem impostos se você os separa.' },
    { id: 'horasOrcadas', rotulo: 'Horas orçadas', valor: 400, dica: 'As horas que você previu ao precificar.' },
    { id: 'horasReais', rotulo: 'Horas reais gastas', valor: 480, dica: 'Horas apontadas por todo o time no projeto.' },
    { id: 'custoHora', rotulo: 'Custo médio da hora do time', prefixo: 'R$', valor: 90, dica: 'Salários, encargos e benefícios ÷ horas produtivas.' },
    { id: 'outros', rotulo: 'Outros custos diretos', prefixo: 'R$', valor: 3000, dica: 'Licenças, freelancers, infra e comissão ligados só a este projeto.' },
  ],
  calcular(v) {
    const { brl, num, pct } = fmt;
    if (!(v.valor > 0) || !(v.horasReais > 0)) {
      return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe o valor do projeto e as horas reais gastas para calcular a margem.' } };
    }
    const custoReal = v.horasReais * v.custoHora + v.outros;
    const lucro = v.valor - custoReal;
    const margem = lucro / v.valor;
    const temOrc = v.horasOrcadas > 0;
    const custoOrc = v.horasOrcadas * v.custoHora + v.outros;
    const margemOrc = (v.valor - custoOrc) / v.valor;
    const desvio = margem - margemOrc; // fração; pontos percentuais = desvio * 100
    const horaEfetiva = v.valor / v.horasReais;
    const horaVendida = temOrc ? v.valor / v.horasOrcadas : NaN;
    const custoHoraTotal = custoReal / v.horasReais;
    const estouro = v.horasReais - v.horasOrcadas;
    const custoEstouro = estouro > 0 ? estouro * v.custoHora : 0;
    const horasLimite = v.custoHora > 0 ? (v.valor - v.outros) / v.custoHora : NaN;
    const pp = x => (x >= 0 ? '+' : '') + num(x * 100) + ' p.p.';

    let tipo;
    if (margem <= 0) tipo = 'bad';
    else if (!temOrc) tipo = margem < 0.2 ? 'warn' : 'good';
    else tipo = desvio <= -0.10 ? 'bad' : desvio < -0.02 ? 'warn' : 'good';

    const titulo = margem <= 0 ? 'O projeto deu prejuízo'
      : tipo === 'bad' ? 'Lucrou, mas a margem real ficou bem abaixo do orçado'
      : tipo === 'warn' ? 'Margem abaixo do orçado'
      : 'Margem dentro do orçado';
    const texto = temOrc
      ? `Você orçou ${pct(margemOrc)} de margem e fechou com ${pct(margem)}: ${pp(desvio)}. Regra de bolso: perder mais de 10 pontos em um projeto é sinal de escopo ou estimativa fora de controle, não de azar pontual.`
      : `Sem horas orçadas não dá para medir o desvio. A margem real do projeto foi ${pct(margem)}.`;

    const pontos = [];
    if (temOrc && estouro > 0) pontos.push(`O time gastou ${num(estouro, 0)} horas além do orçado (${pct(estouro / v.horasOrcadas)} a mais). Só esse estouro custou ${brl(custoEstouro)} de lucro.`);
    else if (temOrc) pontos.push(`O projeto usou ${num(-estouro, 0)} horas a menos que o orçado: a estimativa estava folgada ou o escopo encolheu.`);
    if (temOrc) pontos.push(`Você vendeu a hora a ${brl(horaVendida)} e recebeu de fato ${brl(horaEfetiva)}. O custo da hora do time é ${brl(v.custoHora)}.`);
    else pontos.push(`Cada hora gasta rendeu ${brl(horaEfetiva)}, contra um custo de ${brl(v.custoHora)} por hora.`);
    if (isFinite(horasLimite) && horasLimite > 0) pontos.push(`O projeto zera a margem com ${num(horasLimite, 0)} horas; você usou ${num(v.horasReais, 0)} (${pct(v.horasReais / horasLimite, 0)} desse limite).`);
    if (tipo !== 'good') pontos.push('Onde agir primeiro: compare as horas por entrega com o que foi orçado, veja onde o escopo cresceu sem cobrança e corrija a estimativa dos próximos projetos parecidos.');
    else pontos.push('Registre o que funcionou na estimativa e no controle de escopo deste projeto e use como base para orçar os próximos.');

    return {
      kpis: [
        { nome: 'Margem real', valor: pct(margem), nota: 'lucro ÷ valor do projeto', selo: tipo === 'good' ? ['good', 'no orçado'] : tipo === 'warn' ? ['warn', 'atenção'] : ['bad', margem <= 0 ? 'prejuízo' : 'crítico'] },
        { nome: 'Lucro do projeto', valor: brl(lucro), nota: 'valor − custo real' },
        { nome: 'Custo real', valor: brl(custoReal), nota: `${num(v.horasReais, 0)} h × ${brl(v.custoHora)} + outros custos` },
        ...(temOrc ? [
          { nome: 'Margem orçada', valor: pct(margemOrc), nota: `${num(v.horasOrcadas, 0)} h orçadas` },
          { nome: 'Desvio de margem', valor: pp(desvio), nota: 'margem real − margem orçada' },
        ] : []),
        { nome: 'Valor efetivo da hora', valor: brl(horaEfetiva), nota: temOrc ? `vendida a ${brl(horaVendida)} na proposta` : 'valor ÷ horas reais' },
        { nome: 'Custo da hora', valor: brl(custoHoraTotal), nota: 'custo real total ÷ horas reais, com outros custos' },
      ],
      paineis: [
        { tipo: 'cascata', titulo: 'Do valor do projeto ao lucro', formato: 'brl',
          passos: [{ rotulo: 'Valor', valor: v.valor, total: true }, { rotulo: 'Horas do time', valor: -(v.horasReais * v.custoHora) }, { rotulo: 'Outros custos', valor: -v.outros }, { rotulo: 'Lucro', valor: lucro, total: true }] },
        { tipo: 'barras', titulo: temOrc ? 'Margem orçada contra margem real' : 'Margem real do projeto', formato: 'pct',
          dados: temOrc ? [{ rotulo: 'Orçada', valor: margemOrc, tom: 'hachurado' }, { rotulo: 'Real', valor: margem, tom: 'cheio' }] : [{ rotulo: 'Real', valor: margem, tom: 'cheio' }] },
      ],
      diagnostico: { tipo, titulo, texto, pontos },
    };
  },
});
})();
