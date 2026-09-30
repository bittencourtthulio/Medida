(() => {
registrar({
  id: 'priorizacao-rice',
  nome: 'Priorização RICE',
  categoria: 'Produtos e Inovação',
  descricao: 'Qual ideia de roadmap vem primeiro? Pontue três ideias pelo método RICE: alcance × impacto × confiança ÷ esforço.',
  campos: [
    { id: 'a1', rotulo: 'Ideia 1: alcance (clientes por trimestre)', valor: 800 },
    { id: 'i1', rotulo: 'Ideia 1: impacto', valor: 1, max: 3, dica: 'Escala RICE: 0,25 mínimo, 0,5 baixo, 1 médio, 2 alto, 3 massivo.' },
    { id: 'c1', rotulo: 'Ideia 1: confiança', sufixo: '%', max: 100, valor: 80 },
    { id: 'e1', rotulo: 'Ideia 1: esforço (pessoas-mês)', valor: 2 },
    { id: 'a2', rotulo: 'Ideia 2: alcance (clientes por trimestre)', valor: 2000 },
    { id: 'i2', rotulo: 'Ideia 2: impacto', valor: 0.5, max: 3, dica: 'Escala RICE: 0,25 mínimo, 0,5 baixo, 1 médio, 2 alto, 3 massivo.' },
    { id: 'c2', rotulo: 'Ideia 2: confiança', sufixo: '%', max: 100, valor: 70 },
    { id: 'e2', rotulo: 'Ideia 2: esforço (pessoas-mês)', valor: 3 },
    { id: 'a3', rotulo: 'Ideia 3: alcance (clientes por trimestre)', valor: 300 },
    { id: 'i3', rotulo: 'Ideia 3: impacto', valor: 3, max: 3, dica: 'Escala RICE: 0,25 mínimo, 0,5 baixo, 1 médio, 2 alto, 3 massivo.' },
    { id: 'c3', rotulo: 'Ideia 3: confiança', sufixo: '%', max: 100, valor: 50 },
    { id: 'e3', rotulo: 'Ideia 3: esforço (pessoas-mês)', valor: 4 },
  ],
  calcular(v) {
    const { num, pct } = fmt;
    const ideias = [1, 2, 3].map(n => {
      const a = v['a' + n], i = v['i' + n], c = v['c' + n] / 100, e = v['e' + n];
      const ok = a > 0 && i > 0 && c > 0 && e > 0;
      return { n, nome: 'Ideia ' + n, a, i, c, e, ok, score: ok ? a * i * c / e : NaN };
    });
    const validas = ideias.filter(x => x.ok).sort((x, y) => y.score - x.score);
    if (!validas.length) {
      return {
        kpis: [],
        diagnostico: { tipo: 'warn', titulo: 'Faltam dados', texto: 'Preencha alcance, impacto, confiança e esforço (maior que zero) de pelo menos uma ideia para calcular o RICE.' },
      };
    }
    const top = validas[0], seg = validas[1];
    const lider = seg ? top.score / seg.score - 1 : NaN;
    const pontos = [`${top.nome} lidera com ${num(top.score, 1)} pontos: ${num(top.a, 0)} clientes × impacto ${num(top.i, 2)} × confiança ${pct(top.c, 0)} ÷ ${num(top.e, 1)} pessoas-mês.`];
    let tipo = 'good';
    if (seg) {
      if (lider < 0.1) {
        tipo = 'warn';
        pontos.push(`A vantagem sobre ${seg.nome} é de só ${pct(lider)}. Como regra de bolso, diferenças abaixo de 10% ficam dentro do erro das estimativas: desempate por estratégia, não pela nota.`);
      } else {
        pontos.push(`${top.nome} fica ${pct(lider)} à frente de ${seg.nome} (${num(seg.score, 1)} pontos).`);
      }
      // Confiança que a segunda precisaria para passar a primeira.
      const cNec = top.score * seg.e / (seg.a * seg.i);
      pontos.push(cNec <= 1
        ? `Para ${seg.nome} passar na frente, a confiança nela teria de subir de ${pct(seg.c, 0)} para ${pct(cNec, 0)}. Se você consegue validar essa ideia com clientes, vale testar antes de decidir.`
        : `Mesmo com 100% de confiança, ${seg.nome} não passa ${top.nome}: a liderança é robusta a esse ajuste.`);
    }
    const caro = validas.length > 1 ? validas.slice().sort((x, y) => (y.e / y.score) - (x.e / x.score))[0] : null;
    const barato = validas.slice().sort((x, y) => (x.e / x.score) - (y.e / y.score))[0];
    if (caro && caro.n !== barato.n) {
      pontos.push(`Esforço por ponto: ${barato.nome} custa ${num(barato.e / barato.score, 3)} pessoa-mês por ponto, enquanto ${caro.nome} custa ${num(caro.e / caro.score, 3)}. É a ideia em que cada ponto de RICE sai mais caro.`);
    }
    const baixa = validas.filter(x => x.c < 0.5);
    if (baixa.length) pontos.push(`${baixa.map(x => x.nome).join(' e ')} tem confiança abaixo de 50%: a nota depende de achismo. Conversar com clientes antes de construir é a forma mais barata de subir essa confiança.`);
    const fora = ideias.filter(x => !x.ok);
    if (fora.length) pontos.push(`${fora.map(x => x.nome).join(' e ')} ficou fora do ranking por ter algum campo zerado.`);
    pontos.push('O RICE ordena a fila, não decide por você. A nota só vale o quanto suas entradas forem honestas: confiança baixa derruba o score de propósito.');
    const linhas = validas.map((x, k) => [`${k + 1}º`, x.nome, num(x.score, 1), num(x.e, 1), num(x.score / x.e, 1)]);
    return {
      kpis: [
        ...ideias.map(x => ({ nome: 'RICE da ' + x.nome, valor: x.ok ? num(x.score, 1) : '—', nota: x.ok ? `${num(x.a, 0)} × ${num(x.i, 2)} × ${pct(x.c, 0)} ÷ ${num(x.e, 1)}` : 'campo zerado' })),
        { nome: 'Primeira colocada', valor: top.nome, nota: seg ? `lidera ${seg.nome} em ${pct(lider)}` : 'única ideia válida', selo: seg ? (lider < 0.1 ? ['warn', 'vantagem pequena'] : ['good', 'liderança clara']) : undefined },
      ],
      diagnostico: {
        tipo,
        titulo: seg && lider < 0.1 ? `${top.nome} e ${seg.nome} estão praticamente empatadas` : `${top.nome} vem primeiro`,
        texto: 'Método RICE (Intercom): alcance × impacto × confiança ÷ esforço. Quanto maior a nota, mais valor por pessoa-mês investida.',
        pontos,
      },
      paineis: [
        { tipo: 'barras', titulo: 'Score RICE por ideia', formato: 'num', dados: validas.map((x, i) => ({ rotulo: x.nome, valor: x.score, tom: i === 0 ? 'cheio' : 'hachurado' })) },
        { tipo: 'barras', titulo: 'Esforço por ideia, em pessoas-mês', formato: 'num', dados: validas.map((x, i) => ({ rotulo: x.nome, valor: x.e, tom: i === 0 ? 'cheio' : 'hachurado' })) },
        { tipo: 'tabela', titulo: 'Ranking', colunas: ['Posição', 'Ideia', 'Score RICE', 'Esforço (pessoas-mês)', 'Pontos por pessoa-mês'], linhas },
      ],
    };
  },
});
})();
