(() => {
registrar({
  id: 'capacidade-de-entrega',
  nome: 'Capacidade de entrega',
  categoria: 'Entrega e Operação',
  termos: 'backlog velocidade do time throughput capacidade do time quando zera o backlog entrega por semana velocity sprint quantas semanas para entregar fila de demandas',
  descricao: 'Em quantas semanas o time entrega o backlog, e ele encolhe ou cresce com o ritmo atual de entrada?',
  campos: [
    { id: 'backlog', rotulo: 'Itens no backlog', valor: 120, dica: 'Itens ou pontos, na mesma unidade dos campos abaixo.' },
    { id: 'velocidade', rotulo: 'Entrega média por semana', valor: 10, dica: 'Média das últimas semanas, na mesma unidade do backlog.' },
    { id: 'entrada', rotulo: 'Novos itens que entram por semana', valor: 8 },
    { id: 'semanas', rotulo: 'Semanas do trimestre', valor: 13 },
  ],
  calcular(v) {
    const { num } = fmt;
    if (!(v.velocidade > 0)) {
      return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe a entrega média por semana para calcular a capacidade.' } };
    }
    const saldo = v.velocidade - v.entrada;
    const semSemEntrada = v.backlog / v.velocidade;
    const semComEntrada = saldo > 0 ? v.backlog / saldo : Infinity;
    const possiveis = v.velocidade * v.semanas;
    const fimTri = Math.max(0, v.backlog - saldo * v.semanas);
    const velNecessaria = v.semanas > 0 ? v.entrada + v.backlog / v.semanas : NaN;
    const vazio = v.backlog === 0;
    const horizonte = Math.min(v.semanas > 0 ? Math.ceil(v.semanas) : 13, 104);
    const serie = ritmo => { const p = []; for (let x = 0; x <= horizonte; x++) p.push({ x, y: Math.max(0, v.backlog - ritmo * x) }); return p; };
    const sinal = x => (x >= 0 ? '+' : '') + num(x);
    let tipo;
    if (vazio) tipo = saldo >= 0 ? 'good' : 'warn';
    else if (saldo <= 0) tipo = 'bad';
    else tipo = v.semanas > 0 && semComEntrada <= v.semanas ? 'good' : 'warn';
    const situacao = saldo > 0 ? 'Encolhe' : saldo === 0 ? 'Estável' : 'Cresce';
    const pontos = [];
    if (vazio) pontos.push('O backlog está vazio. Se entra mais do que sai (' + num(v.entrada) + ' contra ' + num(v.velocidade) + ' por semana), ele volta a crescer.');
    else if (saldo <= 0) {
      pontos.push(`Entram ${num(v.entrada)} itens por semana e o time entrega ${num(v.velocidade)}. O backlog não zera nunca: ele ${saldo === 0 ? 'fica parado em' : 'cresce ' + num(-saldo) + ' itens por semana a partir de'} ${num(v.backlog, 0)}.`);
      pontos.push(`Se nada novo entrasse, o backlog acabaria em ${num(semSemEntrada)} semanas. Esse número só vale em pausa de demanda.`);
    } else {
      pontos.push(`O backlog encolhe ${num(saldo)} itens por semana e zera em ${num(semComEntrada)} semanas, com a entrada atual. Sem nenhuma entrada nova, seriam ${num(semSemEntrada)} semanas.`);
    }
    if (!vazio && v.semanas > 0) {
      pontos.push(`No trimestre o time entrega até ${num(possiveis, 0)} itens, dos quais ${num(Math.min(possiveis, v.entrada * v.semanas), 0)} só absorvem o que entra. Backlog projetado no fim: ${num(fimTri, 0)} itens.`);
      if (isFinite(velNecessaria) && velNecessaria > v.velocidade) pontos.push(`Para zerar o backlog dentro do trimestre seria preciso entregar ${num(velNecessaria)} por semana, ${num(velNecessaria - v.velocidade)} a mais que hoje. Onde agir primeiro: reduzir a entrada (priorizar, dizer não, cobrar por pedido) e cortar o que trava a entrega.`);
    }
    if (!vazio && saldo <= 0) pontos.push(`Para começar a reduzir, é preciso que a entrega passe de ${num(v.entrada)} por semana, ou que a entrada caia abaixo de ${num(v.velocidade)}.`);
    return {
      kpis: [
        { nome: 'Semanas para zerar o backlog', valor: vazio ? '0' : saldo > 0 ? num(semComEntrada) + ' semanas' : 'nunca', nota: 'com a entrada atual', selo: tipo === 'good' ? ['good', 'cabe no trimestre'] : tipo === 'warn' ? ['warn', 'passa do trimestre'] : ['bad', 'não zera'] },
        { nome: 'Semanas sem novas entradas', valor: num(semSemEntrada) + ' semanas', nota: 'backlog ÷ entrega semanal' },
        { nome: 'Saldo semanal', valor: sinal(saldo) + ' itens', nota: 'entrega − entrada' },
        { nome: 'Situação do backlog', valor: situacao, nota: saldo > 0 ? 'sai mais do que entra' : saldo === 0 ? 'sai o mesmo que entra' : 'entra mais do que sai' },
        { nome: 'Entregas possíveis no trimestre', valor: num(possiveis, 0) + ' itens', nota: `${num(v.velocidade)} por semana × ${num(v.semanas, 0)} semanas` },
        { nome: 'Backlog no fim do trimestre', valor: num(fimTri, 0) + ' itens', nota: 'projeção linear, com entrada atual' },
      ],
      paineis: [
        { tipo: 'linha', titulo: 'Backlog semana a semana', formato: 'int', eixoX: 'semanas',
          series: [{ nome: 'Com a entrada atual', pontos: serie(saldo) }, { nome: 'Sem novas entradas', pontos: serie(v.velocidade) }] },
        { tipo: 'barras', titulo: 'O que entra e o que sai no trimestre', formato: 'int',
          dados: [{ rotulo: 'Backlog hoje', valor: v.backlog, tom: 'cinza' }, { rotulo: 'Entregas possíveis', valor: possiveis, tom: 'cheio' }, { rotulo: 'Novos itens que entram', valor: v.entrada * v.semanas, tom: 'hachurado' }, { rotulo: 'Backlog no fim', valor: fimTri, tom: 'vazado' }] },
      ],
      diagnostico: {
        tipo,
        titulo: vazio ? 'Backlog zerado' : saldo > 0 ? (tipo === 'good' ? 'O backlog zera dentro do trimestre' : 'O backlog encolhe, mas não zera neste trimestre') : 'O backlog nunca zera no ritmo atual',
        texto: saldo > 0 || vazio
          ? 'Conta direta: o que sobra da entrega depois de absorver a entrada nova é o que reduz o backlog.'
          : 'Conta direta: se entra mais do que o time entrega, o backlog só cresce, por mais que todos trabalhem. A saída é mexer na entrada ou na capacidade, não no esforço.',
        pontos,
      },
    };
  },
});
})();
