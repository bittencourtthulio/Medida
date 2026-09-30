// Formatadores, registro de calculadoras e carregador do manifesto.
window.fmt = {
  brl: (v, d = 0) => isFinite(v) ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: d }) : '—',
  num: (v, d = 1) => isFinite(v) ? v.toLocaleString('pt-BR', { maximumFractionDigits: d }) : '—',
  meses: v => { const n = fmt.num(v); return n === '1' ? '1 mês' : n + ' meses'; },
  pct: (v, d = 1) => isFinite(v) ? (v * 100).toLocaleString('pt-BR', { maximumFractionDigits: d }) + '%' : '—',
};

/*
 * CONTRATO DE CALCULADORA (detalhes em .claude/skills/nova-calculadora/SKILL.md)
 *   arquivo: js/calculadoras/<id>.js + uma linha em js/manifest.js
 *   registrar({
 *     id, nome, categoria, descricao,
 *     campos: [{ id, rotulo, valor, prefixo?, sufixo?, max?, dica?, opcional?, tipo?: 'checkbox', mostrarSe?: '<id de checkbox>' }],
 *     calcular(v) -> {
 *       kpis: [{ nome, valor, nota, selo?: ['good'|'warn'|'bad', 'texto'] }],
 *       diagnostico: { tipo: 'good'|'warn'|'bad', titulo, texto, pontos?: [] },
 *       extra?: 'html'   // gráficos e tabelas opcionais
 *     }
 *   })
 * v traz os valores já numéricos (checkbox = boolean), nunca negativos.
 */
window.CALCULADORAS = [];
window.registrar = c => window.CALCULADORAS.push(c);

// Lê os valores do formulário (ou os padrões, se não houver formulário).
window.lerValores = (c, leitor) => {
  const v = {};
  for (const f of c.campos) {
    if (f.tipo === 'checkbox') { v[f.id] = leitor ? leitor(f).checked : !!f.valor; continue; }
    const bruto = leitor ? parseFloat(leitor(f).value) : f.valor;
    let n = Math.max(0, isFinite(bruto) ? bruto : 0);
    if (f.max != null) n = Math.min(n, f.max);
    v[f.id] = n;
  }
  return v;
};

// Carrega, em ordem, os arquivos listados em js/manifest.js.
window.carregarCalculadoras = () => window.CALCULADORAS_ARQUIVOS.reduce((p, id) => p.then(() => new Promise((ok, erro) => {
  const s = document.createElement('script');
  s.src = `js/calculadoras/${id}.js`;
  s.onload = ok;
  s.onerror = () => erro(new Error('Falha ao carregar calculadora ' + id));
  document.head.appendChild(s);
})), Promise.resolve());
