(() => {
registrar({
  id: 'nps-e-saude',
  nome: 'NPS e saúde da base',
  categoria: 'Retenção e Expansão',
  descricao: 'Quantos clientes promovem e quantos ameaçam ir embora? Transforme as respostas do NPS em risco de receita.',
  campos: [
    { id: 'promotores', rotulo: 'Promotores (notas 9 e 10)', valor: 120 },
    { id: 'neutros', rotulo: 'Neutros (notas 7 e 8)', valor: 60 },
    { id: 'detratores', rotulo: 'Detratores (notas 0 a 6)', valor: 40 },
    { id: 'base', rotulo: 'Clientes na base', valor: 400, dica: 'Total de clientes ativos, não só quem respondeu.' },
    { id: 'ticket', rotulo: 'Ticket médio (mensalidade)', prefixo: 'R$', valor: 297 },
    { id: 'churn', rotulo: 'Churn mensal atual', sufixo: '%', valor: 2.5, max: 100 },
  ],
  calcular(v) {
    const { brl, num, pct } = fmt;
    const total = v.promotores + v.neutros + v.detratores;
    if (!(total > 0)) return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe quantas respostas você recebeu em cada grupo.' } };
    const pp = v.promotores / total, pn = v.neutros / total, pd = v.detratores / total;
    const nps = (pp - pd) * 100;
    const temBase = v.base > 0 && v.ticket > 0;
    const exposto = temBase ? v.base * pd : 0;
    const mrrRisco = exposto * v.ticket;
    const mrrBase = v.base * v.ticket;
    const churnMrr = mrrBase * (v.churn / 100);
    const cobertura = v.base > 0 ? total / v.base : NaN;
    const tipo = nps < 0 ? 'bad' : pd >= 0.2 ? 'warn' : 'good';
    const pontos = [];
    if (v.detratores > v.promotores) {
      pontos.push(`Há mais detratores (${num(v.detratores, 0)}) do que promotores (${num(v.promotores, 0)}): mais gente ameaça sair do que recomenda o produto.`);
    } else {
      pontos.push(`Promotores (${pct(pp, 0)}) superam detratores (${pct(pd, 0)}), mas ${num(v.detratores, 0)} clientes deram nota 6 ou menos e merecem contato.`);
    }
    pontos.push(`${pct(pn, 0)} das respostas são neutras. Esses clientes não reclamam nem recomendam e costumam ser os mais fáceis de perder para um concorrente ou de converter em promotores.`);
    if (temBase) {
      pontos.push(`Se a proporção de detratores da amostra valesse para toda a base, ${num(exposto, 0)} clientes estariam insatisfeitos, ou ${brl(mrrRisco)} de MRR exposto. É uma estimativa proporcional, não uma previsão de cancelamento.`);
      if (v.churn > 0) pontos.push(`Para comparar: o churn atual de ${num(v.churn, 1)}% ao mês tira cerca de ${brl(churnMrr)} de MRR por mês. O MRR exposto equivale a ${num(churnMrr > 0 ? mrrRisco / churnMrr : 0, 1)} meses desse ritmo.`);
    } else {
      pontos.push('Informe a base de clientes e o ticket para estimar o MRR exposto.');
    }
    if (isFinite(cobertura)) pontos.push(`Você ouviu ${pct(Math.min(cobertura, 1), 0)} da base (${num(total, 0)} de ${num(v.base, 0)}). Quem não respondeu não entra na conta, e o silêncio também é um dado.`);
    pontos.push('Primeira ação: ligar para os detratores, entender o motivo e agrupar as causas. Um motivo repetido vale mais que dez casos isolados.');
    return {
      kpis: [
        { nome: 'NPS', valor: num(nps, 0), nota: '% promotores − % detratores (escala de -100 a 100)', selo: nps < 0 ? ['bad', 'mais detratores'] : nps === 0 ? ['warn', 'empate'] : ['good', 'mais promotores'] },
        { nome: 'Respostas', valor: num(total, 0), nota: isFinite(cobertura) ? `${pct(Math.min(cobertura, 1), 0)} da base` : 'total respondido' },
        { nome: 'Promotores', valor: pct(pp), nota: `${num(v.promotores, 0)} respostas` },
        { nome: 'Neutros', valor: pct(pn), nota: `${num(v.neutros, 0)} respostas` },
        { nome: 'Detratores', valor: pct(pd), nota: `${num(v.detratores, 0)} respostas` },
        { nome: 'MRR exposto (estimativa)', valor: temBase ? brl(mrrRisco) : '—', nota: 'base × % detratores × ticket; proporcional à amostra, não previsão' },
      ],
      paineis: [
        { tipo: 'composicao', titulo: 'Como as respostas se dividem', formato: 'int',
          partes: [{ rotulo: 'Promotores', valor: v.promotores, tom: 'cheio' }, { rotulo: 'Neutros', valor: v.neutros, tom: 'pontilhado' }, { rotulo: 'Detratores', valor: v.detratores, tom: 'vazado' }] },
        ...(temBase ? [{ tipo: 'barras', titulo: 'MRR por grupo, se a amostra valesse para a base', nota: 'Estimativa proporcional, não previsão de cancelamento.', formato: 'brl',
          dados: [{ rotulo: 'Promotores', valor: v.base * pp * v.ticket, tom: 'cheio' }, { rotulo: 'Neutros', valor: v.base * pn * v.ticket, tom: 'pontilhado' }, { rotulo: 'Detratores (exposto)', valor: mrrRisco, tom: 'vazado' }] }] : []),
      ],
      diagnostico: {
        tipo,
        titulo: nps < 0 ? 'Mais detratores que promotores' : tipo === 'warn' ? 'Promotores na frente, mas com muitos detratores' : 'Promotores na frente',
        texto: `O NPS vai de -100 (só detratores) a 100 (só promotores). O seu é ${num(nps, 0)}. Não comparamos com benchmark externo: o que importa é a tendência, medida com a mesma pergunta e o mesmo público a cada rodada. O corte de atenção usado aqui (detratores a partir de 20% das respostas) é critério desta calculadora, não referência de mercado.`,
        pontos,
      },
    };
  },
});
})();
