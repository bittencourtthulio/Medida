(() => {
registrar({
  id: 'nrr-grr',
  nome: 'NRR e GRR',
  categoria: 'Retenção e Expansão',
  descricao: 'Sua base cresce sozinha ou encolhe? Veja o que sobra do MRR de quem já era cliente, sem contar nenhum cliente novo.',
  campos: [
    { id: 'inicio', rotulo: 'MRR no início do período', prefixo: 'R$', valor: 200000, dica: 'Receita recorrente mensal da base no primeiro dia do período.' },
    { id: 'expansao', rotulo: 'MRR de expansão (upsell e cross-sell)', prefixo: 'R$', valor: 12000, dica: 'Aumento de MRR vindo de clientes que já estavam na base.' },
    { id: 'contracao', rotulo: 'MRR de contração (downgrades)', prefixo: 'R$', valor: 3000, dica: 'MRR perdido por clientes que reduziram o plano, mas continuam.' },
    { id: 'churn', rotulo: 'MRR de churn (cancelamentos)', prefixo: 'R$', valor: 8000, dica: 'MRR dos clientes que cancelaram no período.' },
  ],
  calcular(v) {
    const { brl, num, pct } = fmt;
    if (!(v.inicio > 0)) return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe o MRR no início do período para calcular NRR e GRR.' } };
    const perdas = v.contracao + v.churn;
    const finalBase = Math.max(0, v.inicio + v.expansao - perdas);
    const nrr = finalBase / v.inicio;
    const grr = Math.max(0, Math.min(1, (v.inicio - perdas) / v.inicio));
    const variacao = finalBase - v.inicio;
    const tipo = nrr >= 1 ? 'good' : grr >= 0.9 ? 'warn' : 'bad';
    const pontos = [];
    if (nrr >= 1) {
      pontos.push(`Só com quem já era cliente, o MRR foi de ${brl(v.inicio)} para ${brl(finalBase)} (${variacao >= 0 ? '+' : '-'}${brl(Math.abs(variacao))}). Todo cliente novo entra como ganho extra.`);
    } else {
      pontos.push(`A base antiga termina com ${brl(finalBase)}, ${brl(-variacao)} a menos que no início. A aquisição precisa repor esse valor só para o MRR ficar parado.`);
    }
    pontos.push(`Você perde ${brl(perdas)} (${pct(perdas / v.inicio)} do MRR inicial) entre churn e contração e recupera ${brl(v.expansao)} com expansão.`);
    if (perdas > 0) {
      const maior = v.churn >= v.contracao ? 'cancelamentos' : 'downgrades';
      const valorMaior = Math.max(v.churn, v.contracao);
      pontos.push(`O que mais pesa na perda são os ${maior}: ${brl(valorMaior)}, ${pct(valorMaior / perdas, 0)} do total perdido.`);
    }
    if (v.expansao > perdas) {
      pontos.push('A expansão sozinha já cobre tudo o que você perde. Proteja o que alimenta o upsell: produto, onboarding e relacionamento.');
    } else if (v.expansao > 0) {
      pontos.push(`A expansão cobre ${pct(v.expansao / perdas, 0)} das perdas. Faltam ${brl(perdas - v.expansao)} de expansão para a base parar de encolher por conta própria.`);
    } else {
      pontos.push('Sem expansão, toda a defesa da base depende de segurar cancelamentos e downgrades. Vale testar upsell e cross-sell nos clientes mais engajados.');
    }
    if (grr < 1) pontos.push(`O GRR de ${pct(grr)} mostra o limite do que dá para reter: mesmo com expansão zero, essa parte do MRR fica.`);
    return {
      kpis: [
        { nome: 'NRR (retenção líquida)', valor: pct(nrr), nota: '(início + expansão − contração − churn) ÷ início', selo: nrr >= 1 ? ['good', 'base cresce sozinha'] : ['warn', 'base encolhe sozinha'] },
        { nome: 'GRR (retenção bruta)', valor: pct(grr), nota: '(início − contração − churn) ÷ início, no máximo 100%' },
        { nome: 'MRR final da base antiga', valor: brl(finalBase), nota: 'sem contar clientes novos' },
        { nome: 'Variação da base antiga', valor: (variacao >= 0 ? '+' : '-') + brl(Math.abs(variacao)), nota: 'final menos início' },
        { nome: 'MRR perdido', valor: brl(perdas), nota: `churn ${brl(v.churn)} + contração ${brl(v.contracao)}` },
        { nome: 'Expansão sobre perdas', valor: perdas > 0 ? num(v.expansao / perdas, 2) + 'x' : '—', nota: 'quanto a expansão repõe do que sai' },
      ],
      paineis: [
        { tipo: 'cascata', titulo: 'Do MRR inicial ao final da base antiga', nota: 'Sem nenhum cliente novo.', formato: 'brl',
          passos: [{ rotulo: 'MRR inicial', valor: v.inicio, total: true }, { rotulo: 'Expansão', valor: v.expansao }, { rotulo: 'Contração', valor: -v.contracao }, { rotulo: 'Churn', valor: -v.churn }, { rotulo: 'MRR final', valor: finalBase, total: true }] },
        { tipo: 'barras', titulo: 'NRR e GRR contra 100%', formato: 'pct',
          dados: [{ rotulo: 'NRR', valor: nrr, tom: 'cheio' }, { rotulo: 'GRR', valor: grr, tom: 'hachurado' }], meta: { rotulo: 'MRR inicial (100%)', valor: 1 } },
      ],
      diagnostico: {
        tipo,
        titulo: nrr >= 1 ? 'A base cresce sem nenhum cliente novo' : 'A base encolhe: a aquisição precisa cobrir o buraco',
        texto: nrr >= 1
          ? `NRR acima de 100% é matemática: a expansão supera o que sai, então a receita de quem já é cliente aumenta sozinha. Seu NRR é ${pct(nrr)}.`
          : `NRR abaixo de 100% significa que a base antiga rende menos a cada período. Seu NRR é ${pct(nrr)}; cada real que falta precisa vir de clientes novos só para manter o MRR parado.`,
        pontos,
      },
    };
  },
});
})();
