(() => {
registrar({
  id: 'teste-das-cinco-marcas',
  nome: 'Teste das cinco marcas',
  categoria: 'Posicionamento',
  descricao: 'Sua marca entra na lista de quem o mercado lembra quando precisa escolher?',
  campos: [
    { id: 'pessoas', rotulo: 'Pessoas perguntadas', valor: 50, dica: 'Pergunte a potenciais compradores: "quais 5 marcas você lembra nesta categoria?". Não conte clientes seus.' },
    { id: 'minha', rotulo: 'Citaram a sua marca entre as 5', valor: 14 },
    { id: 'lider', rotulo: 'Citaram o concorrente mais lembrado', valor: 24 },
    { id: 'nenhuma', rotulo: 'Não citaram nenhuma marca da categoria', valor: 5, opcional: true },
  ],
  calcular(v) {
    const { num, pct } = fmt;
    if (!(v.pessoas > 0)) return { kpis: [], diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Informe quantas pessoas responderam ao teste.' } };
    const minha = Math.min(v.minha, v.pessoas);
    const lider = Math.min(v.lider, v.pessoas);
    const nenhuma = Math.min(v.nenhuma, v.pessoas);
    const share = minha / v.pessoas;
    const shareLider = lider / v.pessoas;
    const lidera = minha >= lider && minha > 0;
    const razao = lider > 0 ? minha / lider : NaN;
    let tipo, titulo, texto;
    if (minha === 0) {
      tipo = 'bad'; titulo = 'Sua marca não apareceu';
      texto = 'Ninguém citou sua marca entre as cinco. No momento da escolha, você não está na lista.';
    } else if (lidera) {
      tipo = 'good'; titulo = 'Você é a marca mais lembrada da amostra';
      texto = 'Sua marca foi citada tanto quanto ou mais que a do concorrente mais lembrado. É a posição de quem é considerada primeiro.';
    } else if (razao >= 0.5) {
      tipo = 'warn'; titulo = 'Na lista, mas atrás do líder';
      texto = 'Sua marca é lembrada, mas menos que a do líder. Regra de bolso: acima de metade do líder, você entra na disputa; ainda não é a escolha automática.';
    } else {
      tipo = 'bad'; titulo = 'Não é lembrada como escolha automática';
      texto = 'Regra de bolso: abaixo de metade do líder, sua marca raramente é lembrada quando alguém começa a procurar. Você depende de ser encontrada e comparada.';
    }
    const pontos = [`${num(minha, 0)} de ${num(v.pessoas, 0)} pessoas citaram sua marca (${pct(share)}).`];
    if (lider > 0 && !lidera) pontos.push(`O mais lembrado aparece em ${pct(shareLider)} das respostas; você tem ${pct(razao)} do que ele tem.`);
    if (lider > 0 && !lidera) pontos.push(`Para igualar o líder nesta amostra, faltariam ${num(lider - minha, 0)} citações.`);
    if (v.nenhuma > 0) pontos.push(`${pct(nenhuma / v.pessoas)} não lembraram nenhuma marca da categoria: parte do mercado ainda não tem referência, e quem se tornar a referência leva essa fatia.`);
    if (v.pessoas < 30) pontos.push('Amostra pequena (menos de 30 pessoas): leia como indício e repita o teste com mais gente antes de decidir investimento.');
    pontos.push('Se você não entra na lista, o trabalho é de autoridade e nicho (ser a referência de um tipo de cliente), não de mais anúncio.');
    return {
      kpis: [
        { nome: 'Share of mind', valor: pct(share), nota: `${num(minha, 0)} citações em ${num(v.pessoas, 0)} pessoas`, selo: tipo === 'good' ? ['good', 'na frente'] : tipo === 'warn' ? ['warn', 'atrás do líder'] : ['bad', 'fora da lista'] },
        { nome: 'Share do mais lembrado', valor: pct(shareLider), nota: `${num(lider, 0)} citações` },
        { nome: 'Razão vs o mais lembrado', valor: isFinite(razao) ? num(razao, 2) + 'x' : '—', nota: 'suas citações ÷ citações do líder' },
        ...(v.nenhuma > 0 ? [{ nome: 'Sem marca na cabeça', valor: pct(nenhuma / v.pessoas), nota: 'não citaram ninguém da categoria' }] : []),
      ],
      paineis: [
        { tipo: 'barras', titulo: 'Você contra o mais lembrado', formato: 'pct',
          dados: [{ rotulo: 'Você', valor: share, tom: 'cheio' }, { rotulo: 'Mais lembrado', valor: shareLider, tom: 'hachurado' }] },
        { tipo: 'funil', titulo: 'De quem respondeu a quem lembra de você', formato: 'int',
          etapas: [{ rotulo: 'Pessoas perguntadas', valor: v.pessoas }, { rotulo: 'Citaram alguma marca da categoria', valor: Math.max(v.pessoas - nenhuma, minha) }, { rotulo: 'Citaram a sua', valor: minha }] },
      ],
      diagnostico: { tipo, titulo, texto, pontos },
    };
  },
});
})();
