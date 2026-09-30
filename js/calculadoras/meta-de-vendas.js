(() => {
registrar({
  id: 'meta-de-vendas',
  nome: 'Meta de vendas e leads necessários',
  categoria: 'Conversão',
  descricao: 'Quantos leads você precisa para bater a meta, e em qual etapa do funil está o maior vazamento?',
  campos: [
    { id: 'metaClientes', rotulo: 'Meta de novos clientes no período', valor: 20, dica: 'Se deixar em zero, o cálculo usa a meta de MRR abaixo.' },
    { id: 'metaMrr', rotulo: 'Ou meta de MRR novo no período', prefixo: 'R$', valor: 0, opcional: true, dica: 'Usada só se a meta de clientes estiver zerada.' },
    { id: 'ticket', rotulo: 'Ticket por cliente (MRR inicial)', prefixo: 'R$', valor: 1500, opcional: true },
    { id: 'leadReuniao', rotulo: 'Lead para reunião', sufixo: '%', valor: 20, max: 100 },
    { id: 'reuniaoProposta', rotulo: 'Reunião para proposta', sufixo: '%', valor: 50, max: 100 },
    { id: 'propostaFechamento', rotulo: 'Proposta para fechamento', sufixo: '%', valor: 25, max: 100 },
    { id: 'leadsAtuais', rotulo: 'Leads que você gera no período', valor: 600, opcional: true, dica: 'Para comparar com o que a meta exige.' },
  ],
  calcular(v) {
    const { brl, num, pct } = fmt;
    let clientes = v.metaClientes;
    if (!(clientes > 0) && v.metaMrr > 0 && v.ticket > 0) clientes = v.metaMrr / v.ticket;
    const a = v.leadReuniao / 100, b = v.reuniaoProposta / 100, c = v.propostaFechamento / 100;
    if (!(clientes > 0) || !(a > 0) || !(b > 0) || !(c > 0)) {
      return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe a meta (clientes, ou MRR com ticket) e as três taxas de conversão do funil, todas maiores que zero.' } };
    }
    const alvoClientes = Math.ceil(clientes - 1e-9);
    const total = a * b * c;
    const propostas = Math.ceil(alvoClientes / c - 1e-9);
    const reunioes = Math.ceil(alvoClientes / (b * c) - 1e-9);
    const leads = Math.ceil(alvoClientes / total - 1e-9);
    const etapas = [
      { nome: 'lead para reunião', taxa: a },
      { nome: 'reunião para proposta', taxa: b },
      { nome: 'proposta para fechamento', taxa: c },
    ];
    const pior = etapas.reduce((m, e) => (e.taxa < m.taxa ? e : m), etapas[0]);
    const melhor = Math.min(pior.taxa * 1.2, 1);
    const leadsMelhor = Math.ceil(alvoClientes / (total / pior.taxa * melhor) - 1e-9);
    const economia = leads - leadsMelhor;
    const mrr = v.ticket > 0 ? alvoClientes * v.ticket : NaN;
    const temAtual = v.leadsAtuais > 0;
    const cobertura = temAtual ? v.leadsAtuais / leads : NaN;
    const tipo = !temAtual ? 'warn' : cobertura >= 1 ? 'good' : cobertura >= 0.5 ? 'warn' : 'bad';
    const pontos = [
      `Para ${num(alvoClientes, 0)} clientes, o funil exige ${num(leads, 0)} leads, ${num(reunioes, 0)} reuniões e ${num(propostas, 0)} propostas. Só ${pct(total, 2)} dos leads chegam a cliente.`,
      `A etapa com menor conversão é ${pior.nome} (${pct(pior.taxa, 0)}): é onde o funil mais perde, proporcionalmente. Isso aponta onde olhar primeiro, mas não garante que seja a mais fácil de melhorar.`,
      economia > 0
        ? `Melhorar essa etapa em 20% (de ${pct(pior.taxa)} para ${pct(melhor)}) reduz os leads necessários de ${num(leads, 0)} para ${num(leadsMelhor, 0)}: ${num(economia, 0)} leads a menos.`
        : 'Essa etapa já está no teto de 100%: não há mais o que ganhar nela, olhe as outras.',
      'Melhorar 20% em qualquer etapa reduz os leads necessários na mesma proporção, porque as taxas se multiplicam. A escolha entre elas é operacional: onde o time consegue mexer mais rápido.',
    ];
    if (temAtual) pontos.push(cobertura >= 1
      ? `Você gera ${num(v.leadsAtuais, 0)} leads no período, ${pct(cobertura, 0)} do necessário: a meta cabe com as taxas de hoje.`
      : `Você gera ${num(v.leadsAtuais, 0)} leads, ${pct(cobertura, 0)} do necessário. Faltam ${num(leads - v.leadsAtuais, 0)} leads ou ganho de conversão equivalente para bater a meta.`);
    else pontos.push('Informe quantos leads você gera no período para saber se a meta cabe no volume atual.');
    return {
      kpis: [
        { nome: 'Leads necessários', valor: num(leads, 0), nota: `${num(alvoClientes, 0)} clientes ÷ ${pct(total, 2)} de conversão total` },
        { nome: 'Reuniões necessárias', valor: num(reunioes, 0), nota: 'clientes ÷ (reunião→proposta × proposta→fechamento)' },
        { nome: 'Propostas necessárias', valor: num(propostas, 0), nota: 'clientes ÷ proposta→fechamento' },
        { nome: 'Conversão lead para cliente', valor: pct(total, 2), nota: 'produto das três taxas' },
        { nome: 'Gargalo do funil', valor: pior.nome, nota: `${pct(pior.taxa, 0)} de conversão, a menor do funil` },
        { nome: 'Leads a menos com +20% no gargalo', valor: num(economia, 0), nota: `de ${num(leads, 0)} para ${num(leadsMelhor, 0)}` },
        ...(isFinite(mrr) ? [{ nome: 'MRR novo da meta', valor: brl(mrr), nota: `${num(alvoClientes, 0)} clientes × ${brl(v.ticket)}` }] : []),
        ...(temAtual ? [{ nome: 'Cobertura de leads', valor: pct(cobertura, 0), nota: `${num(v.leadsAtuais, 0)} gerados ÷ ${num(leads, 0)} necessários`, selo: tipo === 'good' ? ['good', 'meta cabe'] : tipo === 'warn' ? ['warn', 'falta volume'] : ['bad', 'menos da metade'] }] : []),
      ],
      diagnostico: {
        tipo,
        titulo: { good: 'O volume de leads cobre a meta', warn: temAtual ? 'Faltam leads para a meta' : 'Funil reverso calculado', bad: 'O volume atual está longe da meta' }[tipo],
        texto: temAtual ? 'Compara os leads que você gera com os que a meta exige, usando as taxas de conversão que você informou.' : 'Mostra quanto o topo do funil precisa entregar para a meta, com as taxas que você informou.',
        pontos,
      },
    };
  },
});
})();
