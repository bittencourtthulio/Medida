(() => {
registrar({
  id: 'custo-por-colaborador',
  nome: 'Custo por colaborador',
  categoria: 'Finanças',
  descricao: 'Quanto custa por mês manter cada pessoa quando salários, encargos, benefícios e ferramentas entram como valores do mês?',
  termos: 'custo por colaborador custo por funcionario custo por pessoa custo mensal headcount folha do mes encargos beneficios custo carregado quanto custa cada pessoa do time custo de um funcionario salario mais encargos',
  campos: [
    { id: 'colaboradores', rotulo: 'Pessoas no time', valor: 8, dica: 'Quem está na folha neste mês, inclusive sócios que trabalham.' },
    { id: 'salarios', rotulo: 'Salários brutos do mês', prefixo: 'R$', valor: 48000, dica: 'Soma dos brutos, sem encargos nem benefícios.' },
    { id: 'encargos', rotulo: 'Encargos do mês', prefixo: 'R$', valor: 19200, dica: 'O que já se paga ou provisiona no mês (INSS patronal, FGTS, 13º, férias). A calculadora não estima alíquota.' },
    { id: 'beneficios', rotulo: 'Benefícios do mês', prefixo: 'R$', valor: 6400, dica: 'VR, VT, plano de saúde e similares, no total do mês.' },
    { id: 'ferramentas', rotulo: 'Ferramentas do mês', prefixo: 'R$', valor: 2400, dica: 'Software, equipamento e outros custos do mês por causa do time.' },
  ],
  calcular(v) {
    const { brl, num, pct } = fmt;
    const total = v.salarios + v.encargos + v.beneficios + v.ferramentas;
    if (!(v.colaboradores > 0) || !(total > 0)) {
      return {
        kpis: [
          { nome: 'Custo por colaborador', valor: '—', nota: 'faltam pessoas ou valores do mês' },
          { nome: 'Em doze meses', valor: '—', nota: 'faltam pessoas ou valores do mês' },
          { nome: 'Custo total do mês', valor: '—', nota: 'faltam valores do mês' },
          { nome: 'Vezes o salário', valor: '—', nota: 'faltam salários do mês' },
        ],
        diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe quantas pessoas há no time e pelo menos um valor do mês (salários, encargos, benefícios ou ferramentas) para calcular o custo por colaborador.' },
      };
    }
    const extras = v.encargos + v.beneficios + v.ferramentas;
    const pp = total / v.colaboradores;
    const anual = pp * 12;
    const vezes = v.salarios > 0 ? total / v.salarios : null;
    const tipo = extras <= v.salarios ? 'good' : 'warn';
    const pessoas = num(v.colaboradores, 0);

    const origens = [
      ['Salários', v.salarios, 'cheio'],
      ['Encargos', v.encargos, 'hachurado'],
      ['Benefícios', v.beneficios, 'pontilhado'],
      ['Ferramentas', v.ferramentas, 'vazado'],
    ];

    const pontos = [
      `Cada pessoa custa ${brl(pp)} por mês: ${brl(total)} do mês divididos por ${pessoas} ${v.colaboradores === 1 ? 'pessoa' : 'pessoas'}.`,
      `Repetindo o mesmo mês doze vezes, sem reajuste, são ${brl(anual)} por pessoa e ${brl(total * 12)} no ano para o time todo.`,
      `Salários são ${pct(v.salarios / total)} do custo; o que não é salário (encargos, benefícios e ferramentas) soma ${brl(extras)}, ${pct(extras / total)} do total.`,
    ];
    if (vezes != null) pontos.push(`Para cada R$ 1,00 de salário bruto, o time custa ${brl(vezes)}: ${num(vezes, 2)} vezes o salário.`);
    if (tipo === 'warn') pontos.push(`O que não é salário (${brl(extras)}) passa da folha de salários (${brl(v.salarios)}). É uma leitura da própria conta, não uma meta de mercado: vale conferir qual das três linhas pesa mais.`);
    else pontos.push(`O que não é salário (${brl(extras)}) cabe dentro da folha de salários (${brl(v.salarios)}). É uma leitura da própria conta, não uma meta de mercado.`);
    pontos.push('Use este número ao pesar uma contratação: o salário combinado não é o custo da pessoa. Confira se os encargos informados são o que se paga ou provisiona de fato no mês.');

    return {
      paineis: [
        { tipo: 'composicao', titulo: 'Para onde vai o custo do mês', formato: 'brl',
          partes: origens.map(([rotulo, valor, tom]) => ({ rotulo, valor, tom })) },
        { tipo: 'barras', titulo: 'Custo do mês por pessoa', formato: 'brl',
          dados: origens.map(([rotulo, valor, tom]) => ({ rotulo, valor: valor / v.colaboradores, tom })) },
        { tipo: 'tabela', titulo: 'Origem do custo, no mês e por pessoa', colunas: ['Origem', 'No mês', 'Por pessoa'],
          linhas: origens.map(([rotulo, valor]) => [rotulo, brl(valor), brl(valor / v.colaboradores)]).concat([['Custo total', brl(total), brl(pp)]]) },
      ],
      kpis: [
        { nome: 'Custo por colaborador', valor: brl(pp), nota: `${brl(total)} ÷ ${pessoas} ${v.colaboradores === 1 ? 'pessoa' : 'pessoas'}, por mês`, selo: tipo === 'good' ? ['good', 'extras cabem na folha'] : ['warn', 'extras passam da folha'] },
        { nome: 'Em doze meses', valor: brl(anual), nota: 'o mesmo mês repetido doze vezes, sem reajuste' },
        { nome: 'Custo total do mês', valor: brl(total), nota: 'salários + encargos + benefícios + ferramentas' },
        { nome: 'Vezes o salário', valor: vezes != null ? `${num(vezes, 2)} ×` : '—', nota: vezes != null ? 'custo total ÷ salários brutos' : 'informe os salários para calcular' },
      ],
      diagnostico: {
        tipo,
        titulo: tipo === 'good' ? 'O custo extra cabe dentro da folha' : 'O que não é salário passa da folha',
        texto: 'Custo por colaborador mostra quanto cada pessoa pesa no mês quando entram encargos, benefícios e ferramentas, não só o salário. A conta usa os valores que você informou, sem estimar alíquota nem comparar com mercado.',
        pontos,
      },
    };
  },
});
})();
