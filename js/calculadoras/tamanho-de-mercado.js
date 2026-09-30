(() => {
registrar({
  id: 'tamanho-de-mercado',
  nome: 'Tamanho de mercado (TAM, SAM, SOM)',
  categoria: 'Produtos e Inovação',
  descricao: 'Quanto de receita seu mercado comporta, e dá para chegar à meta de ARR com a fatia que você consegue conquistar?',
  campos: [
    { id: 'tam', rotulo: 'Empresas no mercado total (TAM)', valor: 50000, dica: 'Todas as empresas que poderiam usar o produto. Número seu, de fonte que você confia.' },
    { id: 'samPct', rotulo: 'Que se encaixam no seu perfil (SAM)', sufixo: '%', max: 100, valor: 20, dica: 'Porte, setor, região e necessidade que você atende hoje.' },
    { id: 'somPct', rotulo: 'Que você conquista em 3 anos (SOM)', sufixo: '%', max: 100, valor: 3, dica: 'Percentual do SAM que vira cliente.' },
    { id: 'preco', rotulo: 'Mensalidade média', prefixo: 'R$', valor: 600 },
    { id: 'meses', rotulo: 'Meses de cobrança por ano', max: 12, valor: 12 },
    { id: 'meta', rotulo: 'Meta de ARR em 3 anos', prefixo: 'R$', valor: 3000000, opcional: true },
  ],
  calcular(v) {
    const { brl, num, pct } = fmt;
    const anual = v.preco * v.meses;
    if (!(v.tam > 0) || !(anual > 0)) {
      return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe o número de empresas do mercado, a mensalidade e os meses de cobrança para calcular o tamanho do mercado.' } };
    }
    const sam = v.tam * v.samPct / 100;
    const som = sam * v.somPct / 100;
    const arr = x => x * anual;
    const mrrSom = som * v.preco;
    const temMeta = v.meta > 0;
    const somNec = temMeta ? v.meta / anual : NaN;
    const samNecPct = temMeta && sam > 0 ? somNec / sam : NaN;
    const bate = temMeta && arr(som) >= v.meta;
    let tipo = 'warn';
    if (temMeta) tipo = bate ? 'good' : samNecPct > 1 || !isFinite(samNecPct) ? 'bad' : 'warn';
    const pontos = [
      `Os números de mercado são seus, não dados da Medida: o resultado vale o quanto suas estimativas de TAM e SAM forem sólidas.`,
      `Das ${num(v.tam, 0)} empresas do TAM, ${num(sam, 0)} se encaixam no seu perfil. Capturando ${pct(v.somPct / 100)} do SAM, você teria ${num(som, 0)} clientes e ${brl(mrrSom)} de MRR.`,
    ];
    if (!temMeta) {
      pontos.push('Informe uma meta de ARR em 3 anos para saber se a fatia que você consegue conquistar sustenta o objetivo.');
    } else if (bate) {
      pontos.push(`O SOM gera ${brl(arr(som))} de ARR, acima da meta de ${brl(v.meta)}. A meta exige ${num(Math.ceil(somNec), 0)} clientes, ou ${pct(samNecPct)} do SAM.`);
    } else if (isFinite(samNecPct) && samNecPct <= 1) {
      pontos.push(`O SOM gera ${brl(arr(som))} de ARR e a meta é ${brl(v.meta)}. Para chegar lá é preciso conquistar ${pct(samNecPct)} do SAM (${num(Math.ceil(somNec), 0)} clientes), contra ${pct(v.somPct / 100)} hoje.`);
      pontos.push('Antes de apostar em conquistar uma fatia maior do SAM, pergunte se há espaço em três frentes: mensalidade mais alta, SAM maior (novo perfil de cliente) ou prazo além de 3 anos.');
    } else {
      pontos.push(`A meta de ${brl(v.meta)} exige ${num(Math.ceil(somNec), 0)} clientes, mais do que todo o SAM (${num(sam, 0)}). Nesse mercado e preço, a meta não cabe: amplie o perfil atendido ou aumente o ticket.`);
    }
    pontos.push(`Com a mensalidade atual, cada ${brl(anual)} de ARR depende de um cliente: duplicar o preço médio reduz pela metade os clientes necessários para o mesmo ARR.`);
    const linha = (nome, n) => `<tr><td>${nome}</td><td>${num(n, 0)}</td><td>${brl(arr(n))}</td></tr>`;
    return {
      kpis: [
        { nome: 'TAM', valor: brl(arr(v.tam)), nota: `${num(v.tam, 0)} empresas × ${brl(anual)} por ano` },
        { nome: 'SAM', valor: brl(arr(sam)), nota: `${num(sam, 0)} empresas (${pct(v.samPct / 100)} do TAM)` },
        { nome: 'SOM (ARR em 3 anos)', valor: brl(arr(som)), nota: `${num(som, 0)} empresas (${pct(v.somPct / 100)} do SAM)` },
        { nome: 'Clientes do SOM', valor: num(som, 0), nota: 'SAM × percentual conquistado' },
        { nome: 'MRR do SOM', valor: brl(mrrSom), nota: `${num(som, 0)} clientes × ${brl(v.preco)}` },
        ...(temMeta ? [{ nome: 'SAM necessário para a meta', valor: isFinite(samNecPct) ? pct(samNecPct) : '—', nota: `${num(Math.ceil(somNec), 0)} clientes`, selo: bate ? ['good', 'meta coberta'] : samNecPct > 1 || !isFinite(samNecPct) ? ['bad', 'não cabe no SAM'] : ['warn', 'acima do SOM'] }] : []),
      ],
      diagnostico: {
        tipo,
        titulo: !temMeta ? 'Mercado calculado, falta a meta' : bate ? 'O SOM sustenta a meta de ARR' : tipo === 'bad' ? 'A meta não cabe no mercado atendível' : 'O SOM não chega à meta',
        texto: 'TAM é o mercado total, SAM a parte que você atende e SOM a fatia que você consegue conquistar no prazo.',
        pontos,
      },
      extra: `<section class="card"><h3>Mercado em camadas</h3><table><thead><tr><th>Camada</th><th>Empresas</th><th>ARR</th></tr></thead><tbody>${linha('TAM', v.tam)}${linha('SAM', sam)}${linha('SOM', som)}</tbody></table></section>`,
    };
  },
});
})();
