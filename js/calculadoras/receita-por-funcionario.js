(() => {
registrar({
  id: 'receita-por-funcionario',
  nome: 'Receita por funcionário',
  categoria: 'Finanças',
  descricao: 'Quanto cada pessoa do time gera de receita, custa e deixa de lucro?',
  termos: 'receita por funcionario receita por pessoa produtividade do time custo de pessoal folha headcount lucro por pessoa time enxuto quanto cada pessoa gera eficiencia do time',
  campos: [
    { id: 'receita', rotulo: 'Receita anual', prefixo: 'R$', valor: 6000000 },
    { id: 'pessoas', rotulo: 'Número de pessoas', valor: 40, dica: 'Time todo, incluindo sócios que trabalham na empresa.' },
    { id: 'pessoal', rotulo: 'Custo anual de pessoal', prefixo: 'R$', valor: 4200000, dica: 'Salários, encargos, benefícios e prestadores fixos.' },
    { id: 'outros', rotulo: 'Outros custos anuais', prefixo: 'R$', valor: 900000, dica: 'Infra, marketing, ferramentas, impostos, aluguel.' },
  ],
  calcular(v) {
    const { brl, num, pct } = fmt;
    if (!(v.receita > 0) || !(v.pessoas > 0)) {
      return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe a receita anual e o número de pessoas para calcular a receita por funcionário.' } };
    }
    const recPP = v.receita / v.pessoas, pessPP = v.pessoal / v.pessoas;
    const lucro = v.receita - v.pessoal - v.outros;
    const lucroPP = lucro / v.pessoas, margem = lucro / v.receita;
    const pPess = v.pessoal / v.receita;
    const alvoPessoas = v.pessoas * 0.9;
    const totPP = (v.pessoal + v.outros) / v.pessoas;
    const tipo = lucro < 0 ? 'bad' : margem < 0.1 ? 'warn' : 'good';

    const pontos = [
      `Cada pessoa gera ${brl(recPP)} por ano e custa ${brl(pessPP)} só de pessoal (${pct(pPess)} da receita).`,
      lucro >= 0 ? `Sobram ${brl(lucroPP)} de lucro por pessoa, ${pct(margem)} da receita.` : `Cada pessoa gera ${brl(-lucroPP)} de prejuízo por ano: pessoal e outros custos somam mais do que a receita.`,
    ];
    if (v.pessoal > 0) pontos.push(`Se o custo de pessoal fosse 10% menor, ${pct(pPess * 0.9)} da receita, a mesma receita seria entregue por ${num(alvoPessoas, 1)} pessoas, mantido o custo por pessoa de ${brl(pessPP)}.`);
    if (lucro >= 0 && margem < 0.1) pontos.push('Regra de bolso: margem abaixo de 10% deixa pouca folga para um ano ruim. Some receita sem contratar, ou revise os custos não ligados ao time.');
    pontos.push('Receita por pessoa depende do modelo: produto puro e serviço com time grande têm perfis diferentes. Compare com você mesmo ao longo do tempo.');

    return {
      paineis: [
        { tipo: 'composicao', titulo: 'Como a receita anual se divide', formato: 'brl',
          partes: [{ rotulo: 'Custo de pessoal', valor: v.pessoal, tom: 'hachurado' }, { rotulo: 'Outros custos', valor: v.outros, tom: 'pontilhado' }, { rotulo: 'Lucro', valor: Math.max(lucro, 0), tom: 'cheio' }] },
        { tipo: 'barras', titulo: 'Receita contra custo, por pessoa e por ano', formato: 'brl',
          dados: [{ rotulo: 'Receita por pessoa', valor: recPP, tom: 'cheio' }, { rotulo: 'Custo total por pessoa', valor: totPP, tom: 'hachurado' }, { rotulo: 'Custo de pessoal por pessoa', valor: pessPP, tom: 'pontilhado' }] },
      ],
      kpis: [
        { nome: 'Receita por pessoa', valor: brl(recPP), nota: `${brl(v.receita)} ÷ ${num(v.pessoas, 0)} pessoas, por ano` },
        { nome: 'Custo de pessoal por pessoa', valor: brl(pessPP), nota: `${pct(pPess)} da receita` },
        { nome: 'Lucro por pessoa', valor: brl(lucroPP), nota: `margem de ${pct(margem)}`, selo: tipo === 'good' ? ['good', 'lucro com folga'] : tipo === 'warn' ? ['warn', 'margem abaixo de 10%'] : ['bad', 'prejuízo'] },
        { nome: 'Pessoas com custo de pessoal 10% menor', valor: num(alvoPessoas, 1), nota: `mesma receita, custo por pessoa de ${brl(pessPP)}; hoje ${num(v.pessoas, 0)}` },
      ],
      diagnostico: {
        tipo,
        titulo: { good: 'O time gera lucro', warn: 'Lucro por pessoa com pouca folga', bad: 'O time custa mais do que a receita que gera' }[tipo],
        texto: 'Receita por funcionário mede a produtividade do time em reais. O que importa é quanto dela sobra depois do custo de pessoal e dos demais custos.',
        pontos,
      },
    };
  },
});
})();
