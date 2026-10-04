(() => {
registrar({
  id: 'nivel-de-demanda-do-suporte',
  nome: 'Nível de demanda do suporte',
  categoria: 'Entrega e Operação',
  descricao: 'Compare tickets por dia com a capacidade do suporte e estime ocupação, demanda por atendente e contratações.',
  termos: 'demanda suporte atendimento atendentes colaboradores tickets chamados WIP simultâneo ocupação capacidade dimensionamento equipe contratar contratação quantas pessoas preciso sobrecarga tempo médio TMA carga horária',
  campos: [
    { id: 'colaboradores', rotulo: 'Colaboradores no suporte', valor: 5, dica: 'Quantidade inteira de atendentes. Zero permite dimensionar uma equipe nova.' },
    { id: 'wip', rotulo: 'WIP permitido por atendente', valor: 2, dica: 'Número inteiro de tickets simultâneos por pessoa. Use 1 para atendimento sequencial.' },
    { id: 'ticketsDia', rotulo: 'Quantidade média de tickets por dia', valor: 150, dica: 'Demanda diária do time. Use a média dos dias de atendimento; pode ser fracionária.' },
    { id: 'tempoMedio', rotulo: 'Tempo médio de atendimento', valor: 30, sufixo: 'min', dica: 'Duração em que cada ticket ocupa uma vaga de WIP, incluindo esperas, não minutos de esforço ativo. O modelo supõe paralelismo sem aumentar essa duração.' },
    { id: 'horasDia', rotulo: 'Horas de atendimento por pessoa por dia', valor: 6, sufixo: 'h', max: 24, dica: 'Tempo disponível para atender, descontando pausas, reuniões e outras tarefas. Maior que zero e até 24 horas.' },
  ],
  calcular(v) {
    const { num, pct } = fmt;
    const faltamDados = () => ({
      kpis: [],
      diagnostico: { tipo: 'warn', titulo: 'Faltam dados válidos', texto: 'Informe colaboradores inteiros a partir de zero, WIP inteiro positivo, tickets por dia a partir de zero, tempo médio positivo e horas maiores que zero e até 24. Use valores que permitam calcular uma capacidade finita.' },
    });
    const { colaboradores, wip, ticketsDia, tempoMedio, horasDia } = v;
    if (![colaboradores, wip, ticketsDia, tempoMedio, horasDia].every(Number.isFinite)
      || !Number.isSafeInteger(colaboradores) || colaboradores < 0
      || !Number.isSafeInteger(wip) || wip <= 0 || ticketsDia < 0
      || tempoMedio <= 0 || horasDia <= 0 || horasDia > 24) return faltamDados();

    const capacidadePessoa = wip * horasDia * 60 / tempoMedio;
    const capacidadeTime = capacidadePessoa * colaboradores;
    const wipTotal = wip * colaboradores;
    const pessoasExatas = ticketsDia / capacidadePessoa;
    const ocupacao = colaboradores > 0 ? ticketsDia / capacidadeTime : 0;
    const media = colaboradores > 0 ? ticketsDia / colaboradores : 0;
    if (!(capacidadePessoa > 0)
      || ![capacidadePessoa, capacidadeTime, wipTotal, pessoasExatas, ocupacao, media].every(Number.isFinite)) return faltamDados();

    // Absorve somente erro de ponto flutuante perto de uma quantidade inteira.
    const tolerancia = Math.min(1e-9, Number.EPSILON * 8 * Math.max(1, pessoasExatas));
    const inteiroProximo = Math.round(pessoasExatas);
    const teto = Math.abs(pessoasExatas - inteiroProximo) <= tolerancia ? inteiroProximo : Math.ceil(pessoasExatas);
    const necessarios = ticketsDia > 0 ? Math.max(1, teto) : 0;
    if (!Number.isSafeInteger(necessarios) || !Number.isFinite(ocupacao * 100)) return faltamDados();
    const contratar = Math.max(0, necessarios - colaboradores);
    const noLimite = colaboradores > 0 && Math.abs(ocupacao - 1) <= Number.EPSILON * 8;
    const tipo = ticketsDia === 0 ? 'good' : colaboradores === 0 ? 'bad' : noLimite ? 'warn' : ocupacao > 1 ? 'bad' : 'good';
    const deficit = Math.max(0, ticketsDia - capacidadeTime);
    const folga = Math.max(0, capacidadeTime - ticketsDia);
    const pontos = [
      `${num(wip, 0)} tickets simultâneos × ${num(horasDia)} horas × 60 ÷ ${num(tempoMedio)} minutos = ${num(capacidadePessoa)} tickets por atendente por dia.`,
      colaboradores > 0
        ? `A demanda média é de ${num(media)} tickets por atendente por dia; a capacidade teórica do time é ${num(capacidadeTime)} tickets por dia.`
        : `Sem colaboradores, não há capacidade atual nem média por atendente. A demanda de ${num(ticketsDia)} tickets por dia exige ${num(necessarios, 0)} pessoas neste modelo.`,
      tipo === 'bad'
        ? `A demanda supera a capacidade em ${num(deficit)} tickets por dia. Para cobrir esse volume, estime contratar ${num(contratar, 0)} pessoas, chegando a ${num(necessarios, 0)} atendentes.`
        : noLimite
          ? 'A capacidade cobre exatamente a demanda: não há folga para variações. O mínimo calculado não exige contratar mais pessoas.'
          : `Não é necessário contratar para o volume informado. A capacidade disponível supera a demanda em ${num(folga)} tickets por dia.`,
      'O mínimo calculado cobre a média diária, sem reserva para picos, ausências ou metas de prazo. Confirme se o WIP é sustentado na prática antes de decidir a contratação.',
    ];
    return {
      kpis: [
        { nome: 'Ocupação teórica do time', valor: colaboradores > 0 ? pct(noLimite ? 1 : ocupacao) : '—', nota: 'demanda diária ÷ capacidade teórica', selo: [tipo, { good: 'demanda coberta', warn: 'sem folga', bad: 'acima da capacidade' }[tipo]] },
        { nome: 'Média de tickets por atendente', valor: colaboradores > 0 ? num(media) : '—', nota: 'demanda por pessoa por dia; não é produção medida' },
        { nome: 'Capacidade teórica do time', valor: num(capacidadeTime), nota: 'tickets por dia com o WIP informado' },
        { nome: 'Atendentes necessários', valor: num(necessarios, 0), nota: 'mínimo inteiro para cobrir a média diária' },
        { nome: 'Pessoas a contratar', valor: num(contratar, 0), nota: 'necessários menos equipe atual, mínimo zero' },
        { nome: 'WIP total permitido', valor: num(wipTotal, 0), nota: 'tickets simultâneos em toda a equipe' },
        { nome: 'Capacidade por atendente', valor: num(capacidadePessoa), nota: 'tickets por pessoa por dia' },
      ],
      paineis: [
        { tipo: 'barras', titulo: 'Demanda e capacidade, em tickets por dia', formato: 'num',
          dados: [{ rotulo: 'Demanda diária', valor: ticketsDia, tom: 'cheio' }, { rotulo: 'Capacidade teórica', valor: capacidadeTime, tom: 'vazado' }] },
        { tipo: 'barras', titulo: 'Dimensionamento da equipe, em pessoas', formato: 'int',
          dados: [{ rotulo: 'Equipe atual', valor: colaboradores, tom: 'cheio' }, { rotulo: 'Mínimo necessário', valor: necessarios, tom: 'vazado' }, { rotulo: 'A contratar', valor: contratar, tom: 'hachurado' }] },
        { tipo: 'tabela', titulo: 'Como a capacidade foi calculada', colunas: ['Medida', 'Resultado'],
          linhas: [
            ['WIP por atendente', num(wip, 0) + ' tickets simultâneos'],
            ['Horas disponíveis por pessoa por dia', num(horasDia) + ' h'],
            ['Duração média ocupando uma vaga', num(tempoMedio) + ' min'],
            ['Capacidade por pessoa: WIP × horas × 60 ÷ duração', num(capacidadePessoa) + ' tickets/dia'],
            ['Capacidade do time: capacidade por pessoa × colaboradores', num(capacidadeTime) + ' tickets/dia'],
            ['Pessoas necessárias: demanda ÷ capacidade por pessoa, arredondada para cima', num(necessarios, 0)],
          ] },
      ],
      diagnostico: {
        tipo,
        titulo: { good: 'O volume informado cabe na capacidade', warn: 'Time no limite: 100% de ocupação', bad: 'A demanda exige ampliar a capacidade' }[tipo],
        texto: 'Estimativa teórica: cada pessoa sustenta o WIP informado em paralelo sem aumentar a duração média do ticket. O tempo informado mede a ocupação de uma vaga de WIP, não esforço ativo. Para atendimentos sequenciais, use WIP igual a 1.',
        pontos,
      },
    };
  },
});
})();
