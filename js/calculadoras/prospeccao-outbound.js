(() => {
registrar({
  id: 'prospeccao-outbound',
  nome: 'Custo da prospecção outbound',
  categoria: 'Aquisição',
  descricao: 'Quanto custa uma reunião de prospecção outbound? Do contato ao cliente, com custo por reunião, CAC e o gargalo do funil.',
  campos: [
    { id: 'custo', rotulo: 'Custo mensal do SDR', prefixo: 'R$', valor: 9000, dica: 'Salário, encargos, ferramentas (CRM, automação, base de contatos) e comissão, se houver.' },
    { id: 'contatos', rotulo: 'Contatos abordados por mês', valor: 600, dica: 'Pessoas ou contas que receberam ao menos uma abordagem.' },
    { id: 'resp', rotulo: 'Taxa de resposta', sufixo: '%', valor: 8, max: 100, dica: 'Respostas ÷ contatos abordados.' },
    { id: 'reuniao', rotulo: 'Taxa de reunião agendada sobre respostas', sufixo: '%', valor: 30, max: 100 },
    { id: 'compar', rotulo: 'Taxa de comparecimento', sufixo: '%', valor: 70, max: 100, opcional: true, dica: 'Reuniões realizadas ÷ agendadas. Em branco ou 0, considera 100%.' },
    { id: 'fecha', rotulo: 'Taxa de fechamento das reuniões realizadas', sufixo: '%', valor: 20, max: 100 },
    { id: 'ticket', rotulo: 'Mensalidade média por cliente', prefixo: 'R$', valor: 600 },
  ],
  calcular(v) {
    const { brl, num, pct, meses } = fmt;
    if (!(v.custo > 0)) return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe o custo mensal do SDR.' } };
    if (!(v.contatos > 0)) return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe quantos contatos são abordados por mês.' } };

    const informouCompar = v.compar > 0;
    const t = {
      resp: v.resp / 100,
      reuniao: v.reuniao / 100,
      compar: informouCompar ? v.compar / 100 : 1,
      fecha: v.fecha / 100,
    };
    const calc = x => {
      const respostas = v.contatos * x.resp;
      const agendadas = respostas * x.reuniao;
      const realizadas = agendadas * x.compar;
      const clientes = realizadas * x.fecha;
      return { respostas, agendadas, realizadas, clientes };
    };
    const r = calc(t);
    const cpReuniao = r.realizadas > 0 ? v.custo / r.realizadas : NaN;
    const cpAgendada = r.agendadas > 0 ? v.custo / r.agendadas : NaN;
    const cac = r.clientes > 0 ? v.custo / r.clientes : NaN;
    const payback = isFinite(cac) && v.ticket > 0 ? cac / v.ticket : NaN;

    // Gargalo: etapa de menor taxa. Somar os mesmos 5 pontos percentuais em cada etapa rende mais na de menor taxa.
    const etapas = [
      { k: 'resp', nome: 'resposta', de: 'contatos abordados' },
      { k: 'reuniao', nome: 'agendamento de reunião', de: 'respostas' },
      ...(informouCompar ? [{ k: 'compar', nome: 'comparecimento', de: 'reuniões agendadas' }] : []),
      { k: 'fecha', nome: 'fechamento', de: 'reuniões realizadas' },
    ];
    const menor = etapas.reduce((a, b) => (t[b.k] < t[a.k] ? b : a));
    const passo = Math.min(0.05, 1 - t[menor.k]);
    const melhorado = calc({ ...t, [menor.k]: t[menor.k] + passo });
    const cacMelhor = melhorado.clientes > 0 ? v.custo / melhorado.clientes : NaN;

    const tipo = !(r.clientes > 0) ? 'bad' : !isFinite(payback) ? 'warn' : payback <= 12 ? 'good' : payback <= 18 ? 'warn' : 'bad';

    const pontos = [];
    pontos.push(`De ${num(v.contatos, 0)} contatos saem ${num(r.respostas, 1)} respostas, ${num(r.agendadas, 1)} reuniões agendadas${informouCompar ? `, ${num(r.realizadas, 1)} realizadas` : ''} e ${num(r.clientes, 1)} clientes por mês.`);
    if (r.clientes > 0) {
      pontos.push(`Cada reunião realizada custa ${brl(cpReuniao)} e cada cliente custa ${brl(cac)} em prospecção${informouCompar ? `; a reunião agendada custa ${brl(cpAgendada)}` : ''}.`);
      pontos.push(isFinite(payback)
        ? `Com mensalidade de ${brl(v.ticket)}, o CAC volta em ${meses(payback)} de receita, sem descontar margem nem churn. Regra de bolso: payback até 12 meses é confortável; o seu, com margem menor, fica mais longo.`
        : 'Informe a mensalidade para calcular o payback.');
    } else {
      pontos.push('Com essas taxas o funil não gera cliente: o custo do SDR fica sem retorno. Revise as taxas informadas, uma delas está zerada.');
    }
    if (t[menor.k] < 1 && etapas.length > 1) {
      const txt = `O gargalo é ${menor.nome}: só ${pct(t[menor.k], 0)} dos ${menor.de} avançam, a menor taxa do funil, enquanto as outras etapas estão em ${etapas.filter(e => e !== menor).map(e => `${pct(t[e.k], 0)} (${e.nome})`).join(', ')}.`;
      pontos.push(txt);
      if (passo > 0 && isFinite(cacMelhor) && r.clientes > 0) pontos.push(`Somar ${num(passo * 100, 0)} pontos percentuais nessa etapa levaria a ${num(melhorado.clientes, 1)} clientes por mês e CAC de ${brl(cacMelhor)}, sem custo a mais. Como as taxas se multiplicam, o mesmo ganho em pontos rende mais onde a taxa é menor. Compare com a sua própria série de meses, não com médias de mercado.`);
    }
    if (r.clientes > 0 && r.clientes < 1) pontos.push(`Em média o SDR fecha menos de 1 cliente por mês (${num(r.clientes, 2)}): o resultado varia muito de um mês para outro. Avalie o custo em janelas de 3 meses.`);

    const paineis = [
      { tipo: 'funil', titulo: 'Do contato ao cliente, por mês', formato: 'num',
        etapas: [{ rotulo: 'Contatos', valor: v.contatos }, { rotulo: 'Respostas', valor: r.respostas }, { rotulo: 'Reuniões agendadas', valor: r.agendadas }, ...(informouCompar ? [{ rotulo: 'Reuniões realizadas', valor: r.realizadas }] : []), { rotulo: 'Clientes', valor: r.clientes }] },
    ];
    if (r.clientes > 0) paineis.push({ tipo: 'barras', titulo: 'Custo de cada resultado da prospecção', formato: 'brl',
      nota: 'O custo mensal do SDR dividido pelo que ele produziu em cada etapa.',
      dados: [{ rotulo: 'Por resposta', valor: v.custo / r.respostas, tom: 'pontilhado' }, { rotulo: 'Por reunião agendada', valor: v.custo / r.agendadas, tom: 'hachurado' }, ...(informouCompar ? [{ rotulo: 'Por reunião realizada', valor: cpReuniao, tom: 'hachurado' }] : []), { rotulo: 'Por cliente (CAC)', valor: cac, tom: 'cheio' }] });
    return {
      paineis,
      kpis: [
        { nome: 'Custo por reunião realizada', valor: brl(cpReuniao), nota: `${brl(v.custo)} ÷ ${num(r.realizadas, 1)} reuniões`, selo: undefined },
        { nome: 'CAC outbound', valor: brl(cac), nota: `${brl(v.custo)} ÷ ${num(r.clientes, 1)} clientes`, selo: tipo === 'good' ? ['good', 'payback confortável'] : tipo === 'warn' ? ['warn', 'atenção'] : ['bad', 'crítico'] },
        { nome: 'Payback simples', valor: isFinite(payback) ? meses(payback) : '—', nota: 'CAC ÷ mensalidade, sem margem nem churn' },
        { nome: 'Respostas por mês', valor: num(r.respostas, 1), nota: `${pct(t.resp, 1)} de ${num(v.contatos, 0)} contatos` },
        { nome: 'Reuniões realizadas', valor: num(r.realizadas, 1), nota: `${num(r.agendadas, 1)} agendadas${informouCompar ? ` × ${pct(t.compar, 0)} de comparecimento` : ''}` },
        { nome: 'Clientes por mês', valor: num(r.clientes, 1), nota: `${pct(t.fecha, 0)} das reuniões realizadas` },
        { nome: 'Gargalo do funil', valor: t[menor.k] < 1 ? menor.nome : '—', nota: `menor taxa: ${pct(t[menor.k], 0)}` },
      ].map(k => { if (!k.selo) delete k.selo; return k; }),
      diagnostico: {
        tipo,
        titulo: { good: 'Prospecção se paga rápido', warn: 'Prospecção com payback longo', bad: r.clientes > 0 ? 'Prospecção cara para o retorno' : 'Prospecção sem cliente' }[tipo],
        texto: r.clientes > 0
          ? `Uma reunião realizada custa ${brl(cpReuniao)} e um cliente, ${brl(cac)}. O ponto de maior alavanca está na etapa de ${menor.nome}, a de menor taxa do funil. Payback de até 12 meses é regra de bolso, não meta universal.`
          : 'Sem clientes, o custo do SDR não retorna. Preencha as taxas do funil para ver o custo por reunião e o gargalo.',
        pontos,
      },
    };
  },
});
})();
