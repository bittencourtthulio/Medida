(() => {
registrar({
  id: 'cac-por-canal',
  nome: 'CAC por canal',
  categoria: 'Aquisição',
  descricao: 'Qual canal traz cliente mais barato? CAC e payback de cada canal, o blended e onde a verba rende menos.',
  campos: [
    { id: 'inv1', rotulo: 'Canal 1: investimento ou custo no mês', prefixo: 'R$', valor: 12000, dica: 'Use o canal que quiser comparar, por exemplo Google Ads. Inclua verba e custo direto do canal (agência, ferramenta, time dedicado).' },
    { id: 'cli1', rotulo: 'Canal 1: clientes fechados no mês', valor: 20 },
    { id: 'inv2', rotulo: 'Canal 2: investimento ou custo no mês', prefixo: 'R$', valor: 9000, dica: 'Por exemplo LinkedIn Ads, outbound ou eventos.' },
    { id: 'cli2', rotulo: 'Canal 2: clientes fechados no mês', valor: 8 },
    { id: 'inv3', rotulo: 'Canal 3: investimento ou custo no mês', prefixo: 'R$', valor: 2000, dica: 'Por exemplo Indicação, parcerias ou conteúdo orgânico. Se não tem custo, deixe 0.' },
    { id: 'cli3', rotulo: 'Canal 3: clientes fechados no mês', valor: 10 },
    { id: 'ticket', rotulo: 'Mensalidade média por cliente', prefixo: 'R$', valor: 497, dica: 'Vale para os três canais.' },
    { id: 'margem', rotulo: 'Margem sobre a mensalidade', sufixo: '%', valor: 80, max: 100, dica: 'O que sobra da mensalidade depois de infra, gateway, impostos e suporte.' },
  ],
  calcular(v) {
    const { brl, num, pct, meses } = fmt;
    const canais = [1, 2, 3].map(i => ({ n: i, nome: 'Canal ' + i, inv: v['inv' + i], cli: v['cli' + i] }));
    const ativos = canais.filter(c => c.inv > 0 || c.cli > 0);
    if (!ativos.length) return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe o investimento e os clientes fechados de pelo menos um canal.' } };

    const margemMensal = v.ticket * (v.margem / 100);
    canais.forEach(c => {
      c.cac = c.cli > 0 ? c.inv / c.cli : NaN;
      c.payback = c.cli > 0 && margemMensal > 0 ? c.cac / margemMensal : NaN;
    });
    const totalInv = ativos.reduce((s, c) => s + c.inv, 0);
    const totalCli = ativos.reduce((s, c) => s + c.cli, 0);
    const blended = totalCli > 0 ? totalInv / totalCli : NaN;
    const comCliente = ativos.filter(c => c.cli > 0);
    const semCliente = ativos.filter(c => c.cli === 0 && c.inv > 0);
    const ordenados = [...comCliente].sort((a, b) => a.cac - b.cac);
    const melhor = ordenados[0];
    const pior = ordenados[ordenados.length - 1];
    const paybackBlended = totalCli > 0 && margemMensal > 0 ? blended / margemMensal : NaN;

    const kpis = canais.map(c => {
      if (!(c.inv > 0 || c.cli > 0)) return { nome: `CAC do ${c.nome}`, valor: '—', nota: 'canal sem dados' };
      const nota = c.cli > 0
        ? `payback ${isFinite(c.payback) ? meses(c.payback) : '—'} · ${num(c.cli, 0)} clientes`
        : `${brl(c.inv)} investidos, nenhum cliente`;
      const k = { nome: `CAC do ${c.nome}`, valor: brl(c.cac), nota };
      if (melhor && comCliente.length > 1) {
        if (c === melhor) k.selo = ['good', 'mais barato'];
        else if (c === pior) k.selo = ['warn', 'mais caro'];
      }
      if (c.cli === 0 && c.inv > 0) k.selo = ['bad', 'sem retorno'];
      return k;
    });
    kpis.push({ nome: 'CAC blended', valor: brl(blended), nota: `${brl(totalInv)} ÷ ${num(totalCli, 0)} clientes` });
    kpis.push({ nome: 'Payback blended', valor: isFinite(paybackBlended) ? meses(paybackBlended) : '—', nota: `CAC ÷ (${brl(v.ticket)} × ${num(v.margem, 0)}%)` });

    if (!comCliente.length) {
      return {
        kpis,
        diagnostico: {
          tipo: 'bad',
          titulo: 'Nenhum canal fechou cliente',
          texto: `Você investiu ${brl(totalInv)} no mês e não fechou nenhum cliente. Sem cliente não há CAC para comparar.`,
          pontos: ['Confirme se os fechamentos foram atribuídos ao canal certo no CRM antes de concluir que o canal não funciona.', 'Se a atribuição estiver certa, o problema está no funil do canal, não na comparação entre canais.'],
        },
      };
    }

    const razao = comCliente.length > 1 && melhor.cac > 0 ? pior.cac / melhor.cac : NaN;
    const difRs = comCliente.length > 1 ? pior.cac - melhor.cac : 0;
    const tipo = semCliente.length ? 'bad' : (isFinite(razao) && razao >= 2) || (comCliente.length > 1 && melhor.cac === 0 && pior.cac > 0) ? 'warn' : 'good';

    const pontos = [];
    if (comCliente.length > 1) {
      pontos.push(`${melhor.nome} é o mais barato, com CAC de ${brl(melhor.cac)}. ${pior.nome} é o mais caro, com ${brl(pior.cac)}${isFinite(razao) ? ` (${num(razao, 1)}x o melhor)` : ''}.`);
      const invPior = pior.inv, cliPior = pior.cli;
      const shareInv = totalInv > 0 ? invPior / totalInv : NaN;
      const shareCli = totalCli > 0 ? cliPior / totalCli : NaN;
      pontos.push(`${pior.nome} consome ${pct(shareInv, 0)} da verba e entrega ${pct(shareCli, 0)} dos clientes.`);
      if (isFinite(razao) && razao > 1 && invPior > 0 && melhor.cac > 0) {
        const mover = invPior * 0.2;
        const ganho = mover / melhor.cac - mover / pior.cac;
        pontos.push(`Onde testar primeiro: mover 20% da verba do ${pior.nome} (${brl(mover)}) para o ${melhor.nome}. Se o CAC do melhor se mantivesse, seriam cerca de ${num(ganho, 1)} clientes a mais por mês. É uma conta de médias: o CAC costuma subir conforme a verba cresce, então teste em etapas e acompanhe.`);
      }
    } else {
      pontos.push(`Só o ${melhor.nome} fechou cliente, com CAC de ${brl(melhor.cac)}. Sem um segundo canal com resultado, não há comparação.`);
    }
    if (semCliente.length) pontos.unshift(`${semCliente.map(c => c.nome).join(' e ')} gastou ${brl(semCliente.reduce((s, c) => s + c.inv, 0))} e não fechou cliente no mês. Antes de realocar, confirme atribuição e ciclo de venda: se o ciclo é maior que um mês, o cliente pode fechar só no mês seguinte.`);
    if (isFinite(paybackBlended)) {
      pontos.push(`No blended, cada cliente devolve o CAC em ${meses(paybackBlended)}. ${isFinite(pior.payback) && comCliente.length > 1 ? `No ${pior.nome} esse prazo é de ${meses(pior.payback)}.` : ''}`.trim());
    } else if (!(margemMensal > 0)) {
      pontos.push('Informe mensalidade e margem para calcular o payback.');
    }
    if (comCliente.length > 1 && melhor.cac === 0) pontos.push(`O CAC de ${melhor.nome} é zero porque não há custo informado. Se existe custo de tempo ou comissão, inclua para a comparação ser justa.`);

    const titulo = {
      good: 'Canais com custo parecido',
      warn: 'Um canal custa bem mais que outro',
      bad: 'Há canal gastando sem trazer cliente',
    }[tipo];
    const texto = comCliente.length > 1
      ? `O canal mais caro custa ${brl(difRs)} a mais por cliente que o mais barato. O CAC blended de ${brl(blended)} esconde essa diferença: olhe canal a canal antes de decidir onde colocar a próxima verba.`
      : `O CAC blended é ${brl(blended)}. Com um único canal com resultado, use esse número como base e compare com outros canais nos próximos meses.`;
    return { kpis, diagnostico: { tipo, titulo, texto, pontos } };
  },
});
})();
