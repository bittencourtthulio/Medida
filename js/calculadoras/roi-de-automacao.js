(() => {
registrar({
  id: 'roi-de-automacao',
  nome: 'ROI de automação e agentes de IA',
  categoria: 'Tecnologia e IA',
  descricao: 'Essa automação ou agente de IA se paga, e em quantos meses recupera o que foi investido?',
  campos: [
    { id: 'tarefas', rotulo: 'Tarefas por mês', valor: 600, dica: 'Quantas vezes a tarefa acontece por mês (tickets, propostas, conciliações, cadastros).' },
    { id: 'minutos', rotulo: 'Minutos por tarefa hoje', valor: 15 },
    { id: 'auto', rotulo: 'Parte da tarefa que a automação resolve sozinha', sufixo: '%', max: 100, valor: 60, dica: 'Seja conservador: meça em um piloto, não na demonstração do fornecedor.' },
    { id: 'horaCusto', rotulo: 'Custo da hora de quem faz', prefixo: 'R$', valor: 45, dica: 'Salário mais encargos e benefícios, dividido pelas horas produtivas.' },
    { id: 'ferramenta', rotulo: 'Custo mensal da ferramenta ou da IA', prefixo: 'R$', valor: 800, dica: 'Licença, consumo de IA, hospedagem e a manutenção que ela exige.' },
    { id: 'implantacao', rotulo: 'Custo de implantação (uma vez)', prefixo: 'R$', valor: 6000, dica: 'Horas de desenvolvimento ou consultoria, configuração e treinamento do time.' },
  ],
  calcular(v) {
    const { brl, num, pct, meses } = fmt;
    const horasHoje = v.tarefas * v.minutos / 60;
    const horas = horasHoje * v.auto / 100;
    if (!(horas > 0) || !(v.horaCusto > 0)) {
      return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe tarefas por mês, minutos por tarefa, a parte automatizada e o custo da hora para calcular a economia.' } };
    }
    const bruta = horas * v.horaCusto;
    const liquida = bruta - v.ferramenta;
    const payback = liquida > 0 ? v.implantacao / liquida : Infinity;
    const em12 = liquida * 12 - v.implantacao;
    const minimoPct = horasHoje * v.horaCusto > 0 ? v.ferramenta / (horasHoje * v.horaCusto) : NaN;
    const tipo = liquida <= 0 ? 'bad' : em12 <= 0 || payback > 12 ? 'warn' : payback <= 6 ? 'good' : 'warn';
    const pontos = [
      `A automação devolve ${num(horas, 0)} horas por mês (${num(v.tarefas * v.minutos / 60 * v.auto / 100 / 160, 1)} pessoa em jornada de 160 horas) e isso vale ${brl(bruta)} no custo da hora de quem faz.`,
      `Descontando ${brl(v.ferramenta)} da ferramenta, a economia líquida é ${brl(liquida)} por mês.`,
    ];
    if (liquida <= 0) {
      pontos.push(`A ferramenta custa mais do que o tempo que poupa. Ela só se paga se resolver pelo menos ${pct(minimoPct, 0)} da tarefa (hoje resolve ${pct(v.auto / 100, 0)}) ou se o volume de tarefas crescer.`);
    } else {
      pontos.push(`A implantação de ${brl(v.implantacao)} se paga em ${meses(payback)}. Em 12 meses o saldo é ${brl(em12)}.`);
      pontos.push(`Ponto de virada: abaixo de ${pct(minimoPct, 0)} de resolução automática a economia líquida zera.`);
    }
    pontos.push('As horas economizadas só viram dinheiro se forem realocadas para trabalho faturável (vender, entregar, atender mais clientes) ou se evitarem uma contratação. Se o time simplesmente trabalha menos tempo nessa tarefa e nada muda, a economia existe no papel e não no caixa.');
    return {
      kpis: [
        { nome: 'Horas economizadas por mês', valor: num(horas, 0) + ' h', nota: `${num(v.tarefas, 0)} tarefas × ${num(v.minutos, 0)} min × ${pct(v.auto / 100, 0)} ÷ 60` },
        { nome: 'Economia bruta por mês', valor: brl(bruta), nota: 'horas economizadas × custo da hora' },
        { nome: 'Economia líquida por mês', valor: brl(liquida), nota: `− ${brl(v.ferramenta)} da ferramenta`, selo: liquida > 0 ? ['good', 'positiva'] : ['bad', 'não se paga'] },
        { nome: 'Payback da implantação', valor: isFinite(payback) ? meses(payback) : 'não se paga', nota: `${brl(v.implantacao)} ÷ economia líquida` },
        { nome: 'Saldo em 12 meses', valor: brl(em12), nota: 'economia líquida × 12 − implantação' },
        { nome: 'Horas devolvidas ao time em 12 meses', valor: num(horas * 12, 0) + ' h', nota: 'capacidade liberada para outro trabalho' },
      ],
      diagnostico: {
        tipo,
        titulo: liquida <= 0 ? 'A automação não se paga' : tipo === 'good' ? 'Automação se paga rápido' : em12 <= 0 ? 'Automação não recupera o investimento em 12 meses' : 'Automação se paga, mas com prazo longo',
        texto: liquida <= 0
          ? 'A economia de tempo não cobre o custo mensal da ferramenta. Antes de implantar, renegocie o custo, aumente a parte automatizada ou escolha uma tarefa de maior volume.'
          : `O payback de ${meses(payback)} considera só o custo das horas. Regra de bolso: investimentos que se pagam em até 6 meses costumam ser fáceis de aprovar; acima de 12, pedem uma razão além da economia. O ganho real depende de para onde o time leva as horas liberadas.`,
        pontos,
      },
    };
  },
});
})();
