(() => {
registrar({
  id: 'construir-ou-comprar',
  nome: 'Construir ou comprar tecnologia',
  categoria: 'Tecnologia e IA',
  descricao: 'Vale construir ou comprar esta tecnologia, e em que mês construir passa a ser mais barato?',
  campos: [
    { id: 'horas', rotulo: 'Horas para construir', valor: 800, dica: 'Estimativa do time, incluindo testes e implantação. Estimativas costumam ficar abaixo do real: considere uma margem.' },
    { id: 'horaCusto', rotulo: 'Custo da hora de desenvolvimento', prefixo: 'R$', valor: 120, dica: 'Custo total da hora do time (folha com encargos) ou o valor cobrado de clientes, se quiser incluir o que deixaria de faturar.' },
    { id: 'manut', rotulo: 'Manutenção mensal da versão própria', prefixo: 'R$', valor: 4000, dica: 'Correções, atualizações, suporte e infraestrutura da solução própria.' },
    { id: 'licenca', rotulo: 'Licença ou serviço externo por mês', prefixo: 'R$', valor: 9000, dica: 'Mensalidade do fornecedor para o seu volume de uso.' },
    { id: 'integracao', rotulo: 'Custo de integração do serviço externo (uma vez)', prefixo: 'R$', valor: 8000, dica: 'Horas para conectar, configurar e migrar dados.' },
    { id: 'horizonte', rotulo: 'Horizonte de análise', sufixo: 'meses', max: 120, valor: 36 },
  ],
  calcular(v) {
    const { brl, num, pct, meses } = fmt;
    const H = Math.floor(v.horizonte);
    const inicial = v.horas * v.horaCusto;
    const construir = inicial + v.manut * H;
    const comprar = v.integracao + v.licenca * H;
    if (!(H > 0) || !(construir > 0 || comprar > 0)) {
      return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe o horizonte em meses e os custos de construir e de comprar para comparar.' } };
    }
    const dif = comprar - construir;
    const construirGanha = dif > 0;
    const menor = Math.min(construir, comprar);
    const difPct = menor > 0 ? Math.abs(dif) / menor : NaN;
    // cruzamento: inicial + manut*t = integracao + licenca*t
    let cruz = NaN;
    let cruzTexto;
    if (inicial <= v.integracao && v.manut <= v.licenca) { cruz = 0; cruzTexto = 'desde o início'; }
    else if (v.licenca > v.manut) { cruz = (inicial - v.integracao) / (v.licenca - v.manut); cruzTexto = null; }
    else cruzTexto = 'nunca';
    const cruzMes = isFinite(cruz) && cruzTexto === null ? Math.ceil(cruz) : NaN;
    const dentro = cruzTexto === 'desde o início' || (isFinite(cruzMes) && cruzMes <= H);
    let cruzValor;
    if (cruzTexto === 'desde o início') cruzValor = 'desde o início';
    else if (cruzTexto === 'nunca') cruzValor = 'não cruza';
    else cruzValor = isFinite(cruzMes) ? (cruzMes <= H ? 'mês ' + num(cruzMes, 0) : 'mês ' + num(cruzMes, 0) + ' (fora do horizonte)') : '—';
    const tipo = construirGanha ? 'warn' : (difPct > 0.1 ? 'good' : 'warn');
    const pontos = [
      `Construir custa ${brl(construir)} em ${H} meses (${brl(inicial)} para fazer mais ${brl(v.manut)} por mês de manutenção). Comprar custa ${brl(comprar)} (${brl(v.integracao)} de integração mais ${brl(v.licenca)} por mês).`,
      construirGanha
        ? `Construir é ${brl(dif)} mais barato no horizonte (${pct(difPct, 0)} menos que comprar).`
        : `Comprar é ${brl(-dif)} mais barato no horizonte${isFinite(difPct) ? ` (${pct(difPct, 0)} menos que construir)` : ''}.`,
    ];
    if (cruzTexto === 'nunca') pontos.push('Construir nunca fica mais barato: a manutenção própria custa o mesmo ou mais que a licença, e ainda há o custo de construir.');
    else if (cruzTexto === 'desde o início') pontos.push('Construir custa menos que comprar desde o primeiro mês, tanto no início quanto na manutenção.');
    else if (dentro) pontos.push(`Construir passa a ser mais barato a partir do mês ${num(cruzMes, 0)}. Antes disso, comprar sai na frente.`);
    else pontos.push(`O cruzamento só acontece no mês ${num(cruzMes, 0)}, depois do seu horizonte de ${H} meses: dentro do prazo analisado, comprar é mais barato.`);
    pontos.push(`Custo de oportunidade: as ${num(v.horas, 0)} horas de construção saem do que o time faria no lugar, como produto, clientes ou outros projetos. Se essas horas teriam gerado mais que a diferença de ${brl(Math.abs(dif))}, comprar vale mais mesmo quando construir é mais barato.`);
    pontos.push('O cruzamento assume licença constante. Se o fornecedor reajustar o preço, o cálculo muda a favor de construir; esta conta ignora essa variação, bem como atrasos e estouros na construção.');
    const sC = [], sK = [];
    for (let t = 0; t <= H; t++) { sC.push({ x: t, y: inicial + v.manut * t }); sK.push({ x: t, y: v.integracao + v.licenca * t }); }
    const paineis = [
      { tipo: 'linha', titulo: 'Custo acumulado: construir contra comprar', formato: 'brl', eixoX: 'meses', largo: true,
        series: [{ nome: 'Construir', pontos: sC }, { nome: 'Comprar', pontos: sK }],
        marcas: (cruzTexto === null && isFinite(cruz) && cruz > 0 && cruz <= H) ? [{ x: cruz, y: inicial + v.manut * cruz, rotulo: `cruzam no mês ${num(cruzMes, 0)}` }] : [] },
      { tipo: 'barras', titulo: `Custo total em ${H} meses`, formato: 'brl',
        dados: [{ rotulo: 'Construir', valor: construir, tom: 'cheio' }, { rotulo: 'Comprar', valor: comprar, tom: 'hachurado' }] },
    ];
    return {
      kpis: [
        { nome: 'Custo total de construir', valor: brl(construir), nota: `${num(v.horas, 0)} h × ${brl(v.horaCusto)} + manutenção de ${H} meses` },
        { nome: 'Custo total de comprar', valor: brl(comprar), nota: `integração + licença de ${H} meses` },
        { nome: construirGanha ? 'Construir economiza' : 'Comprar economiza', valor: brl(Math.abs(dif)), nota: `no horizonte de ${meses(H)}`, selo: construirGanha ? ['warn', 'construir'] : ['good', 'comprar'] },
        { nome: 'Mês de cruzamento', valor: cruzValor, nota: 'quando construir fica mais barato que comprar' },
      ],
      diagnostico: {
        tipo,
        titulo: construirGanha ? 'Construir sai mais barato, com custo de oportunidade' : difPct > 0.1 ? 'Comprar sai mais barato no horizonte' : 'Custos parecidos: decida pelo que não está na conta',
        texto: construirGanha
          ? `Em ${meses(H)}, construir economiza ${brl(dif)} frente à licença. Antes de decidir, pese o que o time deixa de fazer durante a construção e quem mantém a solução no longo prazo.`
          : `Em ${meses(H)}, comprar custa ${brl(comprar)} contra ${brl(construir)} de construir. Comprar também libera o time para o que diferencia o seu produto, e o cálculo assume licença constante.`,
        pontos,
      },
      paineis,
    };
  },
});
})();
