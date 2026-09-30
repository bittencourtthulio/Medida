// Valida o contrato das calculadoras.
//   node scripts/validar.mjs              valida tudo que está no manifesto
//   node scripts/validar.mjs id1 id2      valida só esses arquivos (útil antes de entrarem no manifesto)
import { readFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';

const ctx = { window: {}, document: {} };
ctx.window = ctx; vm.createContext(ctx);
const rodar = (f) => vm.runInContext(readFileSync(f, 'utf8'), ctx, { filename: f });

rodar('js/core.js');
rodar('js/graficos.js');
rodar('js/areas.js');
rodar('js/termos.js');
rodar('js/manifest.js');

const erros = [];
const erro = (id, m) => erros.push(`[${id}] ${m}`);
const so = process.argv.slice(2);
const arquivos = so.length ? [] : readdirSync('js/calculadoras').filter(f => f.endsWith('.js') && !f.startsWith('_')).map(f => f.slice(0, -3));
for (const a of arquivos) if (!ctx.CALCULADORAS_ARQUIVOS.includes(a)) erro(a, 'arquivo existe mas não está em js/manifest.js (não aparece no dashboard)');

const AREAS = ctx.AREAS.map(a => a.nome);
for (const id of (so.length ? so : ctx.CALCULADORAS_ARQUIVOS)) {
  const antes = ctx.CALCULADORAS.length;
  try { rodar(`js/calculadoras/${id}.js`); } catch (e) { erro(id, 'falha ao carregar: ' + e.message); continue; }
  const c = ctx.CALCULADORAS[antes];
  if (!c) { erro(id, 'não chamou registrar()'); continue; }
  if (!AREAS.includes(c.categoria)) erro(id, `categoria "${c.categoria}" inválida; use uma de: ${AREAS.join(', ')}`);
  if (!(c.termos || ctx.TERMOS[c.id])) erro(id, 'faltam termos: campo `termos` na calculadora (ou linha em js/termos.js) com palavras e perguntas que levam a ela');
  if (c.id !== id) erro(id, `id "${c.id}" diferente do nome do arquivo`);
  for (const k of ['nome', 'categoria', 'descricao']) if (!c[k] || typeof c[k] !== 'string') erro(id, `falta "${k}"`);
  if (!Array.isArray(c.campos) || !c.campos.length) { erro(id, 'falta "campos"'); continue; }
  const ids = new Set();
  for (const f of c.campos) {
    if (!f.id || !f.rotulo) erro(id, 'campo sem id/rotulo');
    if (ids.has(f.id)) erro(id, `campo duplicado: ${f.id}`);
    ids.add(f.id);
    if (f.mostrarSe && !c.campos.some(x => x.id === f.mostrarSe && x.tipo === 'checkbox')) erro(id, `mostrarSe "${f.mostrarSe}" não é um checkbox existente`);
  }
  const testes = [ctx.lerValores(c), Object.fromEntries(c.campos.map(f => [f.id, f.tipo === 'checkbox' ? false : 0]))]; // padrão e tudo zerado
  for (const v of testes) {
    let r;
    try { r = c.calcular(v); } catch (e) { erro(id, 'calcular() lançou erro: ' + e.message); continue; }
    if (!Array.isArray(r.kpis)) erro(id, 'kpis deve ser array');
    const d = r.diagnostico;
    if (!d || !['good', 'warn', 'bad'].includes(d.tipo) || !d.titulo || !d.texto) erro(id, 'diagnostico precisa de tipo (good|warn|bad), titulo e texto');
    const txt = JSON.stringify(r);
    if (/NaN|undefined|Infinity/.test(txt)) erro(id, 'resultado contém NaN/undefined/Infinity: ' + (txt.match(/.{0,30}(NaN|undefined|Infinity).{0,10}/) || [''])[0]);
    const finitos = (o, caminho) => { if (typeof o === 'number' && !Number.isFinite(o)) erro(id, 'número não finito em ' + caminho); else if (o && typeof o === 'object') for (const k in o) finitos(o[k], caminho + '.' + k); };
    if (r.paineis) {
      if (!Array.isArray(r.paineis)) erro(id, 'paineis deve ser array');
      else r.paineis.forEach((p, i) => {
        const w = `paineis[${i}]`;
        if (!ctx.TIPOS_PAINEL.includes(p.tipo)) return erro(id, `${w}: tipo "${p.tipo}" inválido (${ctx.TIPOS_PAINEL.join(', ')})`);
        if (!p.titulo) erro(id, `${w}: falta titulo`);
        const ok = { barras: p.dados, composicao: p.partes, funil: p.etapas, cascata: p.passos, tabela: p.linhas, linha: p.series };
        if (!Array.isArray(ok[p.tipo]) || !ok[p.tipo].length) erro(id, `${w}: dados vazios para ${p.tipo}`);
        if (p.tipo === 'tabela' && !(Array.isArray(p.colunas) && p.colunas.length)) erro(id, `${w}: tabela sem colunas`);
        finitos(p, w);
      });
      const html = ctx.renderPaineis(r.paineis);
      if (/NaN|undefined|Infinity|null/.test(html)) erro(id, 'painel renderizado contém NaN/undefined/Infinity/null');
    }
    if (v === testes[0] && !(r.paineis && r.paineis.length)) erro(id, 'sem paineis: toda calculadora precisa de pelo menos um gráfico ou tabela');
    for (const k of r.kpis || []) if (!k.nome || typeof k.valor !== 'string') erro(id, `kpi inválido: ${JSON.stringify(k)}`);
  }
}
if (erros.length) { console.error('✗ Contrato violado:\n' + erros.join('\n')); process.exit(1); }
console.log(`✓ ${ctx.CALCULADORAS.length} calculadoras válidas: ${ctx.CALCULADORAS.map(c => c.id).join(', ')}`);
