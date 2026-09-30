(() => {
registrar({
  id: 'uptime-e-indisponibilidade',
  nome: 'Custo da indisponibilidade',
  categoria: 'Tecnologia e IA',
  descricao: 'Quanto custa a indisponibilidade do seu produto hoje e quanto você economiza ao chegar na disponibilidade-alvo?',
  termos: 'uptime downtime indisponibilidade disponibilidade sla sla de disponibilidade nove noves 99,9 99,5 sistema fora do ar queda instabilidade credito de sla reembolso cliente quanto custa o sistema cair minutos fora do ar incidente',
  campos: [
    { id: 'atual', rotulo: 'Disponibilidade atual', sufixo: '%', valor: 99.5, max: 100, dica: 'Média medida nos últimos meses, em porcentagem do tempo no ar. Ex.: 99,5.' },
    { id: 'alvo', rotulo: 'Disponibilidade-alvo', sufixo: '%', valor: 99.9, max: 100, dica: 'A meta interna ou o SLA que você promete aos clientes.' },
    { id: 'receita', rotulo: 'Receita mensal', prefixo: 'R$', valor: 150000 },
    { id: 'credito', rotulo: 'Crédito de SLA por violação', sufixo: '% da mensalidade', valor: 10, max: 100, opcional: true, dica: 'Quanto da mensalidade você devolve ao cliente quando quebra o SLA. Deixe em 0 se não há crédito.' },
    { id: 'pedem', rotulo: 'Clientes que pedem o crédito', sufixo: '%', valor: 30, max: 100, opcional: true, dica: 'Parte da base que realmente cobra o crédito quando há violação.' },
  ],
  calcular(v) {
    const { brl, num, pct } = fmt;
    if (!(v.receita > 0) || !(v.atual > 0) || !(v.alvo > 0)) {
      return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe a disponibilidade atual, a disponibilidade-alvo e a receita mensal para calcular o custo da indisponibilidade.' } };
    }
    const MIN_MES = 730 * 60;
    const minAtual = (1 - v.atual / 100) * MIN_MES;
    const minAlvo = (1 - v.alvo / 100) * MIN_MES;
    const anoAtual = minAtual * 12, anoAlvo = minAlvo * 12;
    const horaOff = v.receita / 730;
    const custoOffAtual = minAtual / 60 * horaOff;
    const custoOffAlvo = minAlvo / 60 * horaOff;
    const viola = v.atual < v.alvo;
    const credito = viola ? v.receita * v.credito / 100 * v.pedem / 100 : 0;
    const custoAtual = custoOffAtual + credito;
    const custoAlvo = custoOffAlvo;
    const economia = Math.max(0, custoAtual - custoAlvo);
    const reduz = minAtual > 0 ? 1 - minAlvo / minAtual : 0;
    const tipo = !viola ? 'good' : (minAlvo > 0 ? minAtual >= 10 * minAlvo : true) ? 'bad' : 'warn';
    const hm = m => m >= 120 ? num(m / 60, 1) + ' h' : num(m, 0) + ' min';
    const pontos = [
      `A ${num(v.atual, 3)}% de disponibilidade, o produto fica fora do ar ${hm(minAtual)} por mês (${num(anoAtual / 60, 1)} horas por ano). Na meta de ${num(v.alvo, 3)}%, seriam ${hm(minAlvo)} por mês.`,
      `Cada hora fora do ar corresponde a ${brl(horaOff)} de receita (receita mensal ÷ 730 horas): estimativa proporcional, que não inclui cancelamentos nem desgaste com clientes.`,
    ];
    if (viola) {
      pontos.push(`Hoje a indisponibilidade custa cerca de ${brl(custoAtual)} por mês: ${brl(custoOffAtual)} de receita proporcional ao tempo fora do ar${credito > 0 ? ` e ${brl(credito)} de créditos de SLA (${num(v.credito, 0)}% da mensalidade para ${num(v.pedem, 0)}% dos clientes)` : ''}.`);
      pontos.push(`Chegar à meta corta ${pct(reduz, 0)} do tempo fora do ar e economiza ${brl(economia)} por mês, ${brl(economia * 12)} por ano. Esse é o teto do que vale gastar em confiabilidade por mês para empatar.`);
      pontos.push('Premissa: como a disponibilidade atual está abaixo da meta, a conta assume uma violação de SLA em todos os meses. Se os clientes só acionam o crédito em incidentes graves, o custo real de créditos é menor.');
    } else {
      pontos.push(`Você já está na meta ou acima dela: o tempo fora do ar custa ${brl(custoOffAtual)} por mês e não há crédito de SLA a pagar.`);
      pontos.push('Cada "nove" a mais divide o tempo fora do ar por dez e costuma custar bem mais em infraestrutura e plantão. Confira na tabela abaixo se o próximo nível compensa.');
    }
    return {
      kpis: [
        { nome: 'Fora do ar por mês (atual)', valor: hm(minAtual), nota: `(1 − ${num(v.atual, 3)}%) × 730 horas`, selo: viola ? [tipo, tipo === 'bad' ? 'longe da meta' : 'abaixo da meta'] : ['good', 'na meta'] },
        { nome: 'Fora do ar por mês (meta)', valor: hm(minAlvo), nota: `a ${num(v.alvo, 3)}% de disponibilidade` },
        { nome: 'Fora do ar por ano (atual)', valor: num(anoAtual / 60, 1) + ' h', nota: `${num(anoAtual, 0)} minutos; na meta: ${num(anoAlvo / 60, 1)} h` },
        { nome: 'Receita por hora fora do ar', valor: brl(horaOff), nota: 'receita mensal ÷ 730 horas' },
        { nome: 'Custo mensal da indisponibilidade', valor: brl(custoAtual), nota: credito > 0 ? `${brl(custoOffAtual)} proporcional + ${brl(credito)} de créditos` : 'receita proporcional ao tempo fora do ar' },
        { nome: 'Economia mensal ao chegar na meta', valor: brl(economia), nota: `${brl(economia * 12)} por ano` },
      ],
      diagnostico: {
        tipo,
        titulo: { good: 'Disponibilidade dentro da meta', warn: 'Disponibilidade abaixo da meta', bad: 'Disponibilidade muito abaixo da meta' }[tipo],
        texto: viola
          ? `A disponibilidade de ${num(v.atual, 3)}% deixa o produto ${hm(minAtual)} por mês fora do ar, contra ${hm(minAlvo)} na meta de ${num(v.alvo, 3)}%. Os minutos são matemática pura; o custo em reais é uma estimativa proporcional à receita.`
          : `A disponibilidade de ${num(v.atual, 3)}% atende a meta de ${num(v.alvo, 3)}%. O foco passa a ser manter o nível sem gastar mais do que o tempo fora do ar custa.`,
        pontos,
      },
      paineis: [
        { tipo: 'barras', titulo: 'Minutos fora do ar por mês', formato: 'num',
          dados: [{ rotulo: 'Atual', valor: minAtual, tom: 'cheio' }, { rotulo: 'Meta', valor: minAlvo, tom: 'hachurado' }] },
        { tipo: 'tabela', titulo: 'O que cada nível de disponibilidade permite', largo: true,
          colunas: ['Disponibilidade', 'Minutos fora por mês', 'Horas fora por ano', 'Custo mensal proporcional'],
          linhas: [99, 99.5, 99.9, 99.95, 99.99, 99.999].map(d => {
            const m = (1 - d / 100) * MIN_MES;
            return [num(d, 3) + '%', num(m, 1), num(m * 12 / 60, 2), brl(m / 60 * horaOff)];
          }) },
      ],
    };
  },
});
})();
