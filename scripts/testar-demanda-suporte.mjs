import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';

function carregar(ids) {
  const ctx = vm.createContext({});
  ctx.window = ctx;
  const rodar = caminho => vm.runInContext(readFileSync(new URL('../' + caminho, import.meta.url), 'utf8'), ctx, { filename: caminho });
  for (const arquivo of ['core', 'graficos', 'manifest']) rodar('js/' + arquivo + '.js');
  for (const id of ids ?? ctx.CALCULADORAS_ARQUIVOS) rodar('js/calculadoras/' + id + '.js');
  return ctx;
}

// Harness real: carrega o mesmo core e renderizador usados pelo navegador.
test('harness: carrega registro e campos de uma calculadora existente', () => {
  const ctx = carregar(['custo-do-suporte-por-cliente']);
  assert.equal(ctx.CALCULADORAS.length, 1);
  assert.equal(ctx.CALCULADORAS[0].id, 'custo-do-suporte-por-cliente');
  assert.equal(ctx.CALCULADORAS[0].campos.length, 5);
});

test('harness: executa padroes e renderiza titulo e resultado conhecidos', () => {
  const ctx = carregar(['custo-do-suporte-por-cliente']);
  const c = ctx.CALCULADORAS[0];
  const r = c.calcular(ctx.lerValores(c));
  assert.equal(r.kpis[0].valor.replace(/\s/g, ' '), 'R$ 55,00');
  const html = ctx.renderPaineis(r.paineis);
  assert.ok(html.length > 0);
  assert.match(html, /Custo de suporte por cliente, por mês/);
  assert.match(html, /R\$\s*55,00/);
  assert.doesNotMatch(html, /NaN|Infinity|undefined/);
});

const ID = 'nivel-de-demanda-do-suporte';
const entrada = { colaboradores: 5, wip: 2, ticketsDia: 150, tempoMedio: 30, horasDia: 6 };
function calcular(alteracoes = {}) {
  const ctx = carregar([ID]);
  const c = ctx.CALCULADORAS[0];
  return { ctx, c, r: c.calcular({ ...entrada, ...alteracoes }) };
}
function kpi(r, trecho) {
  const encontrado = r.kpis.find(k => k.nome.toLocaleLowerCase('pt-BR').includes(trecho));
  assert.ok(encontrado, 'KPI esperado: ' + trecho);
  return encontrado.valor;
}
function numero(valor) {
  assert.match(valor, /\d/, 'KPI numerico nao pode ser vazio ou travessao');
  return Number(valor.replace(/\./g, '').replace(',', '.').replace(/[^\d.eE+-]/g, ''));
}
function conferir(alteracoes, esperado) {
  const { r } = calcular(alteracoes);
  assert.equal(numero(kpi(r, 'ocupação')), esperado.ocupacao);
  assert.equal(numero(kpi(r, 'média')), esperado.media);
  assert.equal(numero(kpi(r, 'necessári')), esperado.necessarios);
  assert.equal(numero(kpi(r, 'contrata')), esperado.contratar);
  assert.equal(r.diagnostico.tipo, esperado.tipo);
  return r;
}

test('demanda: sobrecarga indica 125%, 30 tickets/pessoa e duas contratacoes', () => {
  conferir({}, { ocupacao: 125, media: 30, necessarios: 7, contratar: 2, tipo: 'bad' });
});
test('demanda: folga nao pede contratar', () => {
  conferir({ ticketsDia: 96 }, { ocupacao: 80, media: 19.2, necessarios: 4, contratar: 0, tipo: 'good' });
});
test('demanda: 100% e limite sem folga, sem contratar a mais', () => {
  conferir({ ticketsDia: 120 }, { ocupacao: 100, media: 24, necessarios: 5, contratar: 0, tipo: 'warn' });
});
test('demanda: zero tickets e valido', () => {
  conferir({ ticketsDia: 0 }, { ocupacao: 0, media: 0, necessarios: 0, contratar: 0, tipo: 'good' });
});
test('demanda: WIP um reduz capacidade de atendimento paralelo', () => {
  conferir({ wip: 1, ticketsDia: 120 }, { ocupacao: 200, media: 24, necessarios: 10, contratar: 5, tipo: 'bad' });
});
test('demanda: dobrar TMA ou reduzir horas pela metade aumenta necessidade', () => {
  for (const valores of [{ tempoMedio: 60 }, { horasDia: 3 }]) {
    conferir(valores, { ocupacao: 250, media: 30, necessarios: 13, contratar: 8, tipo: 'bad' });
  }
});
test('demanda: horas e tickets fracionarios preservam media e teto', () => {
  conferir({ colaboradores: 2, wip: 1, ticketsDia: 15.5, tempoMedio: 30, horasDia: 2.5 }, { ocupacao: 155, media: 7.8, necessarios: 4, contratar: 2, tipo: 'bad' });
});
test('demanda: equipe zero permite estimar contratacao sem dividir por zero', () => {
  const { r, ctx } = calcular({ colaboradores: 0 });
  assert.equal(kpi(r, 'ocupação'), '—');
  assert.equal(kpi(r, 'média'), '—');
  assert.equal(numero(kpi(r, 'necessári')), 7);
  assert.equal(numero(kpi(r, 'contrata')), 7);
  assert.equal(r.diagnostico.tipo, 'bad');
  assert.doesNotMatch(JSON.stringify(r) + ctx.renderPaineis(r.paineis), /NaN|Infinity|undefined/);
});
test('demanda: equipe e demanda zero nao recomendam contratar', () => {
  const { r } = calcular({ colaboradores: 0, ticketsDia: 0 });
  assert.equal(numero(kpi(r, 'necessári')), 0);
  assert.equal(numero(kpi(r, 'contrata')), 0);
  assert.equal(r.diagnostico.tipo, 'good');
});
test('demanda: erros de ponto flutuante no limite nao criam contratacao extra', () => {
  conferir({ colaboradores: 1, wip: 1, ticketsDia: 30, tempoMedio: 0.2, horasDia: 0.1 }, { ocupacao: 100, media: 30, necessarios: 1, contratar: 0, tipo: 'warn' });
});
test('demanda: demanda positiva pequena exige pelo menos uma pessoa', () => {
  const { r } = calcular({ ticketsDia: 1e-10 });
  assert.equal(numero(kpi(r, 'necessári')), 1);
});
for (const [campo, valores] of Object.entries({
  colaboradores: [-1, 2.5, Infinity], wip: [0, -1, 1.5, Infinity],
  tempoMedio: [0, -1, NaN, Infinity], horasDia: [0, -1, 25, Infinity],
  ticketsDia: [-1, NaN, Infinity],
})) {
  for (const valor of valores) {
    test(`demanda: rejeita ${campo}=${valor}`, () => {
      const { r } = calcular({ [campo]: valor });
      assert.equal(r.diagnostico.tipo, 'warn');
      assert.equal(r.kpis.length, 0, 'Dados invalidos nao devem recomendar zero contratacoes');
      assert.doesNotMatch(JSON.stringify(r), /NaN|Infinity|undefined/);
    });
  }
}
test('demanda: overflow da capacidade ou necessidade nao vaza resultados invalidos', () => {
  for (const alteracoes of [{ tempoMedio: 1e-320 }, { ticketsDia: 1e308, tempoMedio: 1e308 }]) {
    const { r } = calcular(alteracoes);
    assert.equal(r.diagnostico.tipo, 'warn');
    assert.equal(r.kpis.length, 0);
    assert.doesNotMatch(JSON.stringify(r), /NaN|Infinity|undefined/);
  }
});
test('demanda: tres paineis reais incluem capacidade 120 e demanda 150', () => {
  const { r, ctx, c } = calcular();
  assert.equal(c.campos.length, 5);
  assert.equal(r.paineis.length, 3);
  const html = ctx.renderPaineis(r.paineis);
  for (const painel of r.paineis) assert.ok(html.includes(painel.titulo));
  const barras = r.paineis.filter(p => p.tipo === 'barras').flatMap(p => p.dados);
  assert.ok(barras.some(d => d.valor === 120));
  assert.ok(barras.some(d => d.valor === 150));
  assert.doesNotMatch(html, /NaN|Infinity|undefined/);
});

test('demanda: contagens fora da precisao segura nao geram contratacao imprecisa', () => {
  for (const valores of [{ colaboradores: 1e20 }, { wip: 1e20 }, { ticketsDia: 1e20, colaboradores: 1, wip: 1, horasDia: 1, tempoMedio: 60 }]) {
    const { r } = calcular(valores);
    assert.equal(r.diagnostico.tipo, 'warn');
    assert.equal(r.kpis.length, 0);
  }
});

test('demanda: quociente inteiro grande preserva todas as pessoas necessarias', () => {
  const { r } = calcular({ colaboradores: 0, wip: 1, ticketsDia: 1e15, tempoMedio: 60, horasDia: 1 });
  assert.equal(numero(kpi(r, 'necessári')), 1e15);
  assert.equal(numero(kpi(r, 'contrata')), 1e15);
});

test('catalogo: manifesto carrega a calculadora uma unica vez na area de operacao', () => {
  const ctx = carregar();
  assert.equal(ctx.CALCULADORAS_ARQUIVOS.filter(id => id === ID).length, 1);
  const registros = ctx.CALCULADORAS.filter(c => c.id === ID);
  assert.equal(registros.length, 1);
  const c = registros[0];
  assert.equal(c.categoria, 'Entrega e Operação');
  for (const termo of ['suporte', 'wip', 'contratar']) assert.ok(c.termos.toLowerCase().includes(termo));
});
test('catalogo: entradas e resultados expressam unidades e premissas do suporte', () => {
  const ctx = carregar();
  const c = ctx.CALCULADORAS.find(c => c.id === ID);
  assert.ok(c);
  assert.deepEqual(Array.from(c.campos, f => f.id), ['colaboradores', 'wip', 'ticketsDia', 'tempoMedio', 'horasDia']);
  const campos = Object.fromEntries(c.campos.map(f => [f.id, f]));
  assert.match(campos.wip.rotulo, /por atendente/);
  assert.match(campos.wip.dica, /simultâneos/);
  assert.match(campos.ticketsDia.rotulo, /por dia/);
  assert.equal(campos.tempoMedio.sufixo, 'min');
  assert.match(campos.tempoMedio.dica, /incluindo esperas/);
  assert.match(campos.horasDia.rotulo, /por pessoa por dia/);
  assert.equal(campos.horasDia.sufixo, 'h');
  assert.equal(campos.horasDia.max, 24);
  const r = c.calcular(ctx.lerValores(c));
  assert.equal(numero(kpi(r, 'ocupação')), 125);
  assert.equal(numero(kpi(r, 'média')), 30);
  assert.equal(numero(kpi(r, 'contrata')), 2);
  assert.match(r.diagnostico.texto, /paralelo/);
  assert.match(r.diagnostico.pontos.join(' '), /sem reserva para picos/);
});
