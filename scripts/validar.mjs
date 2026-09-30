// Valida o contrato das calculadoras.
//   node scripts/validar.mjs              valida tudo que está no manifesto
//   node scripts/validar.mjs id1 id2      valida só esses arquivos (útil antes de entrarem no manifesto)
import { readFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';

const ctx = { window: {}, document: {} };
ctx.window = ctx; vm.createContext(ctx);
const rodar = (f) => vm.runInContext(readFileSync(f, 'utf8'), ctx, { filename: f });

rodar('js/core.js');
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
  if (!ctx.TERMOS[c.id]) erro(id, 'falta a linha em js/termos.js (palavras e perguntas que levam a esta calculadora)');
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
    for (const k of r.kpis || []) if (!k.nome || typeof k.valor !== 'string') erro(id, `kpi inválido: ${JSON.stringify(k)}`);
  }
}
if (erros.length) { console.error('✗ Contrato violado:\n' + erros.join('\n')); process.exit(1); }
console.log(`✓ ${ctx.CALCULADORAS.length} calculadoras válidas: ${ctx.CALCULADORAS.map(c => c.id).join(', ')}`);
