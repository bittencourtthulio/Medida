(() => {
registrar({
  id: 'desconto-e-percepcao',
  nome: 'Desconto e percepção de valor',
  categoria: 'Posicionamento',
  descricao: 'Você vende por valor ou por desconto, e quanto isso custa em MRR por ano?',
  campos: [
    { id: 'tabela', rotulo: 'Mensalidade de tabela (preço cheio)', prefixo: 'R$', valor: 400 },
    { id: 'desc', rotulo: 'Desconto médio concedido', sufixo: '%', valor: 15, max: 100, dica: 'Média entre os contratos que receberam desconto.' },
    { id: 'frac', rotulo: 'Contratos fechados com desconto', sufixo: '%', valor: 40, max: 100 },
    { id: 'contratos', rotulo: 'Contratos novos por mês', valor: 25 },
    { id: 'churnCom', rotulo: 'Churn mensal de quem fechou com desconto', sufixo: '%', valor: 4, max: 100, opcional: true },
    { id: 'churnSem', rotulo: 'Churn mensal de quem pagou preço cheio', sufixo: '%', valor: 2.5, max: 100, opcional: true },
  ],
  calcular(v) {
    const { brl, num, pct } = fmt;
    if (!(v.tabela > 0) || !(v.contratos > 0)) return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe a mensalidade de tabela e quantos contratos novos você fecha por mês.' } };
    const d = v.desc / 100, f = v.frac / 100;
    const cedidoMes = v.contratos * f * v.tabela * d;
    const cedidoAno = cedidoMes * 12;
    const realizado = v.tabela * (1 - f * d);
    const realizadoDesc = v.tabela * (1 - d);
    const temChurn = v.churnCom > 0 && v.churnSem > 0;
    let tipo;
    if (f === 0 || d === 0) tipo = 'good';
    else if (f > 0.5 && d >= 0.15) tipo = 'bad';
    else if (f >= 0.3 || d >= 0.1) tipo = 'warn';
    else tipo = 'good';
    const titulo = { good: 'Você vende mais por valor que por desconto', warn: 'Desconto frequente: atenção à percepção de valor', bad: 'Desconto virou regra de venda' }[tipo];
    const pontos = [
      `${pct(f, 0)} dos contratos saem com ${pct(d, 0)} de desconto: cada mês de vendas entrega ${brl(cedidoMes)} a menos de MRR novo.`,
      `Em 12 meses de vendas nesse ritmo, o MRR acumulado deixa de ser ${brl(cedidoAno)} (sem considerar churn). O preço médio realizado é ${brl(realizado)} contra ${brl(v.tabela)} de tabela.`,
    ];
    if (f > 0 && d > 0) pontos.push(`Quem recebe desconto paga em média ${brl(realizadoDesc)}; o cliente que paga cheio sustenta o restante da margem.`);
    if (temChurn) {
      const dif = v.churnCom - v.churnSem;
      pontos.push(dif > 0
        ? `Quem fechou com desconto cancela mais: ${num(v.churnCom)}% contra ${num(v.churnSem)}% ao mês (${num(v.churnCom / v.churnSem, 1)}x). O desconto atrai cliente mais sensível a preço, não cliente mais fiel.`
        : `Quem fechou com desconto não cancela mais (${num(v.churnCom)}% contra ${num(v.churnSem)}%): o problema está no preço médio, não na qualidade dos clientes.`);
    }
    if (tipo !== 'good') pontos.push('Antes de dar desconto, exija contrapartida (contrato anual, pagamento adiantado, case) e registre o motivo: se o motivo é sempre "o concorrente é mais barato", o trabalho é de diferenciação.');
    return {
      kpis: [
        { nome: 'Receita cedida por mês', valor: brl(cedidoMes), nota: 'MRR novo que deixa de entrar por mês', selo: tipo === 'good' ? ['good', 'sob controle'] : tipo === 'warn' ? ['warn', 'atenção'] : ['bad', 'crítico'] },
        { nome: 'MRR cedido em 12 meses', valor: brl(cedidoAno), nota: 'cedido por mês × 12, sem churn' },
        { nome: 'Preço médio realizado', valor: brl(realizado), nota: `${pct(1 - realizado / v.tabela)} abaixo da tabela` },
        ...(temChurn ? [{ nome: 'Churn: desconto vs cheio', valor: `${num(v.churnCom)}% vs ${num(v.churnSem)}%`, nota: 'mensal, informado por você' }] : []),
      ],
      paineis: [
        { tipo: 'barras', titulo: 'Preço de tabela contra o realizado, por mês', formato: 'brl',
          dados: [{ rotulo: 'Tabela', valor: v.tabela, tom: 'cheio' }, { rotulo: 'Médio realizado', valor: realizado, tom: 'hachurado' }, { rotulo: 'Com desconto', valor: realizadoDesc, tom: 'vazado' }] },
        { tipo: 'cascata', titulo: 'MRR novo do mês: da tabela ao realizado', formato: 'brl',
          passos: [{ rotulo: 'A preço de tabela', valor: v.contratos * v.tabela, total: true }, { rotulo: 'Desconto', valor: -cedidoMes }, { rotulo: 'Realizado', valor: v.contratos * realizado, total: true }] },
      ],
      diagnostico: {
        tipo, titulo,
        texto: 'Regra de bolso, não meta: desconto em mais da metade dos contratos, com média de 15% ou mais, é sinal de que o preço de tabela não é defendido pela percepção de valor. O desconto ocasional faz parte da venda.',
        pontos,
      },
    };
  },
});
})();
