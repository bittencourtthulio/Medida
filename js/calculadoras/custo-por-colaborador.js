(() => {
registrar({
  id: 'custo-por-colaborador',
  nome: 'Custo por colaborador',
  categoria: 'Finanças',
  descricao: 'Divida a receita mensal pelo total de colaboradores e veja se o resultado está ruim, OK ou bom.',
  termos: 'custo por colaborador custo por funcionario custo por pessoa receita mensal por colaborador faturamento por colaborador receita por pessoa produtividade do time headcount eficiencia do time quinze mil vinte e cinco mil',
  campos: [
    { id: 'receita', rotulo: 'Receita mensal', prefixo: 'R$', valor: 160000, dica: 'Receita total da empresa no mês.' },
    { id: 'colaboradores', rotulo: 'Total de colaboradores', valor: 8, dica: 'Número inteiro de pessoas no time, incluindo sócios que trabalham na empresa.' },
  ],
  calcular(v) {
    const { brl, num } = fmt;
    if (!Number.isFinite(v.receita) || v.receita < 0 || !Number.isSafeInteger(v.colaboradores) || v.colaboradores <= 0) {
      return {
        kpis: [{ nome: 'Receita por colaborador', valor: '—', nota: 'receita mensal ÷ total de colaboradores' }],
        diagnostico: {
          tipo: 'warn',
          titulo: 'Confira os dados',
          texto: 'Informe uma receita mensal igual ou maior que zero e um total inteiro de pelo menos um colaborador.',
        },
      };
    }
    const porColaborador = v.receita / v.colaboradores;
    const tipo = porColaborador < 15000 ? 'bad' : porColaborador <= 25000 ? 'warn' : 'good';
    const classificacao = { bad: 'Ruim', warn: 'OK', good: 'Bom' }[tipo];
    const leitura = {
      bad: `O resultado está abaixo de ${brl(15000)} por colaborador. Para chegar à faixa OK com o mesmo time, a receita mensal precisa alcançar ${brl(15000 * v.colaboradores, 2)}.`,
      warn: `O resultado está entre ${brl(15000)} e ${brl(25000)} por colaborador, inclusive. Para entrar na faixa Bom com o mesmo time, a receita mensal precisa superar ${brl(25000 * v.colaboradores, 2)}.`,
      good: `O resultado supera ${brl(25000)} por colaborador. Acompanhe a relação entre receita e tamanho do time para manter essa faixa.`,
    }[tipo];

    return {
      kpis: [
        {
          nome: 'Receita por colaborador',
          valor: brl(porColaborador, 2),
          nota: `${brl(v.receita, 2)} ÷ ${num(v.colaboradores, 0)} ${v.colaboradores === 1 ? 'colaborador' : 'colaboradores'}, por mês`,
          selo: [tipo, classificacao],
        },
      ],
      diagnostico: {
        tipo,
        titulo: `${classificacao}: ${brl(porColaborador, 2)} por colaborador`,
        texto: 'Receita mensal ÷ total de colaboradores. Regra de bolso desta calculadora: abaixo de R$ 15 mil é Ruim; de R$ 15 mil a R$ 25 mil é OK; acima de R$ 25 mil é Bom.',
        pontos: [leitura],
      },
      paineis: [
        {
          tipo: 'barras',
          titulo: 'Receita por colaborador e faixas de referência',
          formato: 'brl',
          nota: 'Valores mensais por colaborador. A faixa Bom começa acima de R$ 25 mil.',
          dados: [
            { rotulo: 'Seu resultado', valor: porColaborador, tom: 'cheio' },
            { rotulo: 'Entrada na faixa OK', valor: 15000, tom: 'hachurado' },
            { rotulo: 'Limite superior da faixa OK', valor: 25000, tom: 'pontilhado' },
          ],
        },
        {
          tipo: 'tabela',
          titulo: 'Como o resultado é classificado',
          colunas: ['Classificação', 'Receita mensal por colaborador'],
          linhas: [
            [tipo === 'bad' ? 'Ruim · seu resultado' : 'Ruim', 'Abaixo de R$ 15.000'],
            [tipo === 'warn' ? 'OK · seu resultado' : 'OK', 'De R$ 15.000 a R$ 25.000, inclusive'],
            [tipo === 'good' ? 'Bom · seu resultado' : 'Bom', 'Acima de R$ 25.000'],
          ],
        },
      ],
    };
  },
});
})();
