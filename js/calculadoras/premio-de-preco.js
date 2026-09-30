(() => {
registrar({
  id: 'premio-de-preco',
  nome: 'Prêmio de preço sobre o mercado',
  categoria: 'Posicionamento',
  descricao: 'Seu preço tem prêmio sobre o mercado, e o churn mostra que o cliente enxerga esse valor?',
  campos: [
    { id: 'preco', rotulo: 'Mensalidade média que você cobra', prefixo: 'R$', valor: 349 },
    { id: 'mercado', rotulo: 'Mensalidade média dos concorrentes diretos', prefixo: 'R$', valor: 320, dica: 'Média dos 3 a 5 concorrentes que aparecem nas mesmas disputas, em planos equivalentes ao seu.' },
    { id: 'clientes', rotulo: 'Clientes pagantes', valor: 300 },
    { id: 'churn', rotulo: 'Churn mensal atual', sufixo: '%', valor: 2.5, max: 100, dica: 'Clientes perdidos no mês ÷ clientes no início do mês.' },
  ],
  calcular(v) {
    const { brl, num, pct } = fmt;
    if (!(v.preco > 0) || !(v.mercado > 0)) return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe a sua mensalidade média e a dos concorrentes diretos.' } };
    const premio = v.preco / v.mercado - 1;
    const difMrr = v.clientes * (v.preco - v.mercado);
    const churn = v.churn / 100;
    const churnBaixo = churn <= 0.03;
    const faixa = 0.05; // tolerância para considerar "em linha"
    let tipo, titulo, texto;
    const pontos = [];
    if (premio > faixa) {
      if (churnBaixo) {
        tipo = 'good'; titulo = 'Prêmio sustentado: o cliente vê valor';
        texto = 'Você cobra acima do mercado e mesmo assim o cliente fica. É o sinal de que a percepção de valor justifica o preço. Churn até 3% ao mês é regra de bolso para PME, não meta.';
        pontos.push(`O prêmio de ${pct(premio)} rende ${brl(difMrr)} de MRR a mais do que cobrar ${brl(v.mercado)}.`);
        pontos.push('Descubra por que eles ficam (resultado, marca, atendimento) e use isso na venda, em vez de dar desconto para fechar.');
      } else {
        tipo = 'bad'; titulo = 'Cobra mais, mas o cliente sai';
        texto = 'O preço está acima do mercado e o churn está alto pela regra de bolso (acima de 3% ao mês). O cliente paga mais do que enxerga em valor.';
        pontos.push(`O prêmio de ${pct(premio)} gera ${brl(difMrr)} de MRR, mas com churn de ${num(v.churn)}% parte disso vaza todo mês.`);
        pontos.push('Antes de baixar o preço, ouça quem cancelou: se o motivo é valor percebido, o problema é posicionamento e prova de resultado, não a tabela.');
      }
    } else if (premio >= -faixa) {
      tipo = churnBaixo ? 'good' : 'warn'; titulo = 'Preço em linha com o mercado';
      texto = 'Sua mensalidade é praticamente igual à dos concorrentes (diferença de até 5%). Isso não é ruim, mas significa que o preço não sinaliza nenhuma diferença de valor.';
      pontos.push(`Diferença de ${pct(premio)} sobre o mercado: ${brl(difMrr)} de MRR versus cobrar ${brl(v.mercado)}.`);
      pontos.push(churnBaixo
        ? 'Com churn baixo, há espaço para testar um reajuste em clientes novos e observar se o fechamento cai.'
        : `Churn de ${num(v.churn)}% com preço de mercado indica que o cliente não vê motivo forte para ficar: trabalhe diferenciação antes de mexer em preço.`);
    } else {
      tipo = churnBaixo ? 'warn' : 'bad'; titulo = 'Preço abaixo do mercado: sintoma de commodity';
      texto = churnBaixo
        ? 'Você cobra menos que a concorrência e o cliente fica. Isso sugere que há valor não cobrado: a percepção de valor está à frente do preço.'
        : 'Você cobra menos que a concorrência e mesmo assim perde clientes. Preço baixo sem retenção é o retrato de quem é visto como commodity: escolhido pelo preço, trocado pelo preço.';
      pontos.push(`Você deixa ${brl(-difMrr)} de MRR por mês na mesa em relação ao preço de mercado (${brl(-difMrr * 12)} por ano).`);
      pontos.push(churnBaixo
        ? 'Teste reajuste gradual em clientes novos antes de mexer na base atual.'
        : 'Reduzir preço não resolveu o churn: o caminho é nicho, proposta de valor e prova de resultado.');
    }
    if (v.churn === 0) pontos.push('Churn informado como 0%: confira o número, porque ele sustenta a leitura acima.');
    return {
      kpis: [
        { nome: 'Prêmio sobre o mercado', valor: (premio > 0 ? '+' : '') + pct(premio), nota: `${brl(v.preco)} vs ${brl(v.mercado)}`, selo: tipo === 'good' ? ['good', 'valor percebido'] : tipo === 'warn' ? ['warn', 'atenção'] : ['bad', 'crítico'] },
        { nome: 'MRR vs preço de mercado', valor: (difMrr > 0 ? '+' : '') + brl(difMrr), nota: `${num(v.clientes, 0)} clientes × (seu preço − mercado)` },
        { nome: 'Diferença por ano', valor: (difMrr > 0 ? '+' : '') + brl(difMrr * 12), nota: 'MRR vs mercado × 12' },
        { nome: 'Churn mensal', valor: num(v.churn) + '%', nota: 'informado por você' },
      ],
      diagnostico: { tipo, titulo, texto, pontos },
    };
  },
});
})();
