(() => {
registrar({
  id: 'multiplo-de-valor',
  nome: 'Múltiplo de valor para o cliente',
  categoria: 'Posicionamento',
  descricao: 'O cliente ganha quantas vezes o que paga, e há espaço para subir o preço?',
  campos: [
    { id: 'valor', rotulo: 'Valor gerado ao cliente por mês', prefixo: 'R$', valor: 3000, dica: 'Economia de custo + receita extra atribuída ao seu produto ou projeto. Use números que o cliente reconhece.' },
    { id: 'preco', rotulo: 'Mensalidade cobrada', prefixo: 'R$', valor: 600 },
    { id: 'horas', rotulo: 'Horas economizadas por mês', valor: 20, opcional: true, dica: 'Não repita horas já contadas no valor gerado acima.' },
    { id: 'custoHora', rotulo: 'Custo da hora do cliente', prefixo: 'R$', valor: 50, opcional: true },
  ],
  calcular(v) {
    const { brl, num, pct } = fmt;
    if (!(v.preco > 0)) return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe a mensalidade cobrada.' } };
    const valorHoras = v.horas * v.custoHora;
    const valor = v.valor + valorHoras;
    if (!(valor > 0)) return { kpis: [], diagnostico: { tipo: 'bad', titulo: 'Valor gerado não demonstrado', texto: 'Sem um valor em reais que o cliente ganha, a mensalidade só pode ser defendida por preço. Levante quanto ele economiza ou fatura a mais com você.' } };
    const mult = valor / v.preco;
    const capturado = v.preco / valor;
    const alvo = valor / 3; // regra de bolso: preço até 1/3 do valor gerado
    const folga = alvo - v.preco;
    const tipo = mult < 1 ? 'bad' : mult < 3 ? 'warn' : 'good';
    const titulo = { bad: 'O cliente paga mais do que ganha', warn: 'Ganho do cliente abaixo da regra de 3x', good: 'Espaço de preço sobre o valor entregue' }[tipo];
    const pontos = [
      `O cliente ganha ${brl(valor)} por mês e paga ${brl(v.preco)}: você captura ${pct(capturado)} do valor que gera.`,
    ];
    if (valorHoras > 0) pontos.push(`As horas economizadas valem ${brl(valorHoras)} por mês (${num(v.horas, 0)} h × ${brl(v.custoHora)}) e entram no valor gerado.`);
    if (mult < 1) pontos.push(`Mesmo que o ganho estimado esteja subavaliado, o número de hoje não sustenta a mensalidade. Reduza o preço ou, melhor, aumente e prove o resultado entregue.`);
    else if (folga > 0) pontos.push(`Regra de bolso: o cliente deve ficar com ao menos 3x o que paga. Esse limite corresponde a ${brl(alvo)} de mensalidade, ${brl(folga)} acima da atual (${pct(folga / v.preco, 0)} de espaço teórico).`);
    else pontos.push(`Regra de bolso: o cliente deve ficar com ao menos 3x o que paga. Para chegar lá, a mensalidade ficaria em ${brl(alvo)} (${brl(-folga)} abaixo da atual), ou o valor gerado precisa subir para ${brl(v.preco * 3)}.`);
    if (mult >= 3) pontos.push('O espaço é teórico: só vale se o cliente reconhece esse valor. Teste o reajuste em clientes novos e compare a taxa de fechamento antes de mexer na base.');
    else if (mult >= 1) pontos.push('O caminho é aumentar o valor percebido (resultado medido, relatório de ganho) antes de pensar em preço.');
    return {
      kpis: [
        { nome: 'Múltiplo de valor', valor: num(mult, 1) + 'x', nota: 'valor gerado ÷ mensalidade', selo: tipo === 'good' ? ['good', 'acima de 3x'] : tipo === 'warn' ? ['warn', 'entre 1x e 3x'] : ['bad', 'abaixo de 1x'] },
        { nome: 'Preço como % do valor', valor: pct(capturado), nota: 'quanto do ganho do cliente fica com você' },
        { nome: 'Preço que deixa o cliente com 3x', valor: brl(alvo), nota: 'valor gerado ÷ 3 (regra de bolso)' },
        { nome: 'Folga vs mensalidade atual', valor: (folga > 0 ? '+' : '') + brl(folga), nota: folga > 0 ? 'espaço teórico para subir' : 'acima do que a regra sugere' },
      ],
      diagnostico: {
        tipo, titulo,
        texto: 'Regra de bolso, não lei: o cliente tende a comprar com facilidade quando ganha cerca de 3 vezes o que paga. Abaixo de 1x ele perde dinheiro com você. O número depende de o valor gerado ser real e reconhecido por ele.',
        pontos,
      },
    };
  },
});
})();
