(() => {
registrar({
  id: 'adocao-de-feature',
  nome: 'Adoção de funcionalidade e churn',
  categoria: 'Produtos e Inovação',
  descricao: 'Uma funcionalidade reduz o churn? Compare quem usa com quem não usa e veja quanto MRR ficaria se mais clientes a adotassem.',
  termos: 'adoção feature funcionalidade uso engajamento churn retenção quem usa cancela menos correlação ativação stickiness produto mrr preservado ltv usuários ativos migrar clientes para funcionalidade',
  campos: [
    { id: 'ativos', rotulo: 'Clientes ativos', valor: 600 },
    { id: 'usam', rotulo: 'Clientes que usam a funcionalidade', valor: 180 },
    { id: 'churnUsa', rotulo: 'Churn mensal de quem usa', sufixo: '%', max: 100, valor: 1.5 },
    { id: 'churnNao', rotulo: 'Churn mensal de quem não usa', sufixo: '%', max: 100, valor: 3.5 },
    { id: 'ticket', rotulo: 'Mensalidade média', prefixo: 'R$', valor: 400 },
    { id: 'pontos', rotulo: 'Pontos percentuais de adoção a ganhar', sufixo: 'p.p.', max: 100, valor: 10, dica: 'Quanto você acha que consegue subir a adoção com onboarding ou destaque na tela.' },
  ],
  calcular(v) {
    const { brl, num, pct } = fmt;
    if (!(v.ativos > 0) || !(v.usam > 0) || !(v.ticket > 0)) {
      return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe os clientes ativos, quantos usam a funcionalidade e a mensalidade.' } };
    }
    const usam = Math.min(v.usam, v.ativos);
    const nao = v.ativos - usam;
    const adocao = usam / v.ativos;
    const cu = v.churnUsa / 100, cn = v.churnNao / 100;
    const dif = cn - cu;
    const ltvU = cu > 0 ? v.ticket / cu : NaN;
    const ltvN = cn > 0 ? v.ticket / cn : NaN;
    const migrados = Math.min(nao, v.ativos * v.pontos / 100);
    const porMes = migrados * dif * v.ticket;
    const acum = Array.from({ length: 12 }, (_, i) => porMes * (i + 1));
    const tipo = dif <= 0 ? 'bad' : adocao < 0.3 && dif >= 0.01 ? 'warn' : 'good';
    const pontosTxt = [
      `${num(usam, 0)} de ${num(v.ativos, 0)} clientes usam a funcionalidade (${pct(adocao)}). Quem usa cancela ${pct(cu)} por mês; quem não usa, ${pct(cn)}.`,
      'Isto é correlação, não prova de causa: clientes mais engajados tendem a usar mais recursos e a ficar mais tempo. Teste com um grupo de controle antes de apostar a fila do produto nisso.',
    ];
    if (dif > 0) {
      pontosTxt.push(`Levar ${num(migrados, 0)} clientes (${num(v.pontos, 1)} p.p. de adoção) para o grupo que usa deixaria de perder ${brl(porMes)} de MRR por mês, se a diferença de churn fosse causada pela funcionalidade.`);
      pontosTxt.push(`Em 12 meses, isso soma ${brl(acum[11])} de MRR que deixaria de sair, em valor acumulado mês a mês.`);
      if (isFinite(ltvU) && isFinite(ltvN)) pontosTxt.push(`O LTV bruto de quem usa é ${brl(ltvU)}, contra ${brl(ltvN)} de quem não usa (mensalidade ÷ churn, sem margem).`);
    } else {
      pontosTxt.push('Quem usa não cancela menos do que quem não usa: pelos seus números, a adoção não protege a base. Empurrar mais gente para a funcionalidade não muda o churn.');
    }
    if (nao <= 0) pontosTxt.push('Toda a base já usa a funcionalidade: não há quem migrar.');
    return {
      kpis: [
        { nome: 'Adoção da funcionalidade', valor: pct(adocao), nota: `${num(usam, 0)} ÷ ${num(v.ativos, 0)} clientes` },
        { nome: 'Diferença de churn', valor: (dif >= 0 ? '' : '−') + num(Math.abs(dif) * 100) + ' p.p.', nota: 'churn de quem não usa − churn de quem usa', selo: dif > 0 ? ['good', 'quem usa cancela menos'] : ['bad', 'sem proteção'] },
        { nome: 'MRR preservado por mês', valor: brl(dif > 0 ? porMes : 0), nota: `${num(migrados, 0)} clientes migrados × diferença × ${brl(v.ticket)}` },
        { nome: 'MRR preservado em 12 meses', valor: brl(dif > 0 ? acum[11] : 0), nota: 'soma mês a mês, hipótese' },
        { nome: 'LTV de quem usa', valor: isFinite(ltvU) ? brl(ltvU) : '—', nota: 'mensalidade ÷ churn de quem usa' },
        { nome: 'LTV de quem não usa', valor: isFinite(ltvN) ? brl(ltvN) : '—', nota: 'mensalidade ÷ churn de quem não usa' },
      ],
      paineis: [
        { tipo: 'funil', titulo: 'Da base ativa a quem usa a funcionalidade', formato: 'int', etapas: [{ rotulo: 'Clientes ativos', valor: v.ativos }, { rotulo: 'Usam a funcionalidade', valor: usam }] },
        { tipo: 'barras', titulo: 'Churn mensal: quem usa contra quem não usa', formato: 'pct', dados: [{ rotulo: 'Usam', valor: cu, tom: 'cheio' }, { rotulo: 'Não usam', valor: cn, tom: 'vazado' }] },
        { tipo: 'barras', titulo: 'MRR preservado, acumulado em 12 meses', formato: 'brl', nota: 'Hipótese: supõe que a diferença de churn seja causada pela funcionalidade.',
          dados: [3, 6, 9, 12].map((m, i) => ({ rotulo: `Mês ${m}`, valor: dif > 0 ? acum[m - 1] : 0, tom: i === 3 ? 'cheio' : 'hachurado' })) },
      ],
      diagnostico: {
        tipo,
        titulo: dif <= 0 ? 'Quem usa não cancela menos' : tipo === 'warn' ? 'Quem usa fica mais, mas poucos usam' : 'Quem usa cancela bem menos',
        texto: 'Compara o churn de quem usa a funcionalidade com o de quem não usa. É correlação: serve para levantar uma hipótese, não para provar que a funcionalidade retém.',
        pontos: pontosTxt,
      },
    };
  },
});
})();
