(() => {
registrar({
  id: 'magic-number',
  nome: 'Magic number',
  categoria: 'Aquisição',
  descricao: 'Quanto crescimento cada real de vendas e marketing compra? Magic number a partir de dois trimestres de receita.',
  termos: 'magic number número mágico numero magico eficiência de vendas eficiencia de vendas eficiência de go to market gtm vendas e marketing s&m sales and marketing quanto cresce cada real gasto em vendas vale a pena investir mais em vendas receita recorrente nova por real gasto crescimento trimestre',
  campos: [
    { id: 'atual', rotulo: 'Receita recorrente do trimestre atual', prefixo: 'R$', valor: 1350000, dica: 'Receita do trimestre (por exemplo, a soma do MRR dos três meses).' },
    { id: 'ant', rotulo: 'Receita recorrente do trimestre anterior', prefixo: 'R$', valor: 1200000 },
    { id: 'sm', rotulo: 'Gasto em vendas e marketing do trimestre anterior', prefixo: 'R$', valor: 650000, dica: 'Time, comissão, mídia e ferramentas de vendas e marketing.' },
  ],
  calcular(v) {
    const { brl, num, pct } = fmt;
    if (!(v.sm > 0)) return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe o gasto em vendas e marketing do trimestre anterior.' } };
    const cresc = v.atual - v.ant;
    const novaAnual = cresc * 4;
    const magic = novaAnual / v.sm;
    const tipo = magic >= 0.75 ? 'good' : magic >= 0.5 ? 'warn' : 'bad';
    const pontos = [
      `A receita do trimestre ${cresc >= 0 ? 'cresceu' : 'caiu'} ${brl(Math.abs(cresc))}${v.ant > 0 ? ` (${pct(cresc / v.ant, 1)})` : ''}. Anualizado, são ${brl(novaAnual)} de receita recorrente ${cresc >= 0 ? 'nova' : 'a menos'}.`,
      `Cada R$ 1 gasto em vendas e marketing no trimestre anterior ${cresc >= 0 ? 'comprou' : 'devolveu'} R$ ${num(Math.abs(magic), 2)} de receita recorrente anualizada.`,
    ];
    if (tipo === 'good') pontos.push('Pela regra de bolso, acima de 0,75 costuma justificar investir mais em vendas e marketing. Confirme com CAC, payback e churn antes de escalar.');
    else if (tipo === 'warn') pontos.push('Entre 0,5 e 0,75: dá retorno, sem folga clara para escalar. Melhorar conversão e churn antes de subir a verba costuma render mais.');
    else pontos.push('Abaixo de 0,5, a regra de bolso pede revisar a eficiência antes de gastar mais: funil, canais e retenção.');
    pontos.push('Limite da conta: ela mistura clientes novos, expansão e churn no mesmo número, e não separa efeito de preço. Olhe o CAC por canal para saber onde está a perda.');
    return {
      kpis: [
        { nome: 'Magic number', valor: num(magic, 2), nota: '(receita atual − anterior) × 4 ÷ gasto S&M anterior', selo: tipo === 'good' ? ['good', 'acima de 0,75'] : tipo === 'warn' ? ['warn', 'entre 0,5 e 0,75'] : ['bad', 'abaixo de 0,5'] },
        { nome: 'Receita anualizada nova', valor: brl(novaAnual), nota: `${brl(cresc)} de variação × 4` },
        { nome: 'Receita nova por R$ 1 gasto', valor: 'R$ ' + num(magic, 2), nota: 'receita recorrente anualizada por real de S&M' },
        { nome: 'Crescimento trimestral', valor: v.ant > 0 ? pct(cresc / v.ant, 1) : '—', nota: `${brl(v.ant)} para ${brl(v.atual)}` },
      ],
      paineis: [
        { tipo: 'cascata', titulo: 'Da receita anterior à atual', formato: 'brl',
          passos: [{ rotulo: 'Trimestre anterior', valor: v.ant, total: true }, { rotulo: cresc >= 0 ? 'Crescimento' : 'Queda', valor: cresc }, { rotulo: 'Trimestre atual', valor: v.atual, total: true }] },
        { tipo: 'barras', titulo: 'Receita anualizada nova contra o gasto em vendas e marketing', formato: 'brl',
          dados: [{ rotulo: 'Receita anualizada nova', valor: Math.abs(novaAnual), tom: cresc >= 0 ? 'cheio' : 'vazado' }, { rotulo: 'Gasto S&M', valor: v.sm, tom: 'hachurado' }] },
      ],
      diagnostico: {
        tipo,
        titulo: { good: 'Vendas e marketing rendem bem', warn: 'Retorno de vendas e marketing na média', bad: cresc >= 0 ? 'Crescimento caro para o que entrega' : 'A receita recuou apesar do gasto' }[tipo],
        texto: 'Regra de bolso amplamente usada em SaaS: magic number acima de 0,75 costuma justificar investir mais, e abaixo de 0,5 pede revisar a eficiência. É referência de conversa, não meta universal.',
        pontos,
      },
    };
  },
});
})();
