---
expx_schema: 1
expx_tool: sprintx
kind: plano
trabalho_id: nova-calculadora-de-tickets-do-suporte
sprint_id: sprint-01
atualizado_em: '2026-10-04'
sprint:
  titulo: Fundacao de testes
  status: concluido
  criterio_saida: Harness e suite existente passam.
  riscos:
  - Interpretar duracao do ticket como esforco ativo superestima capacidade.
  fora_de_escopo:
  - Deploy
  - Alterar autenticacao
  - Simulacao de filas e SLA
fases:
- id: F-01.1
  titulo: Fundacao de testes
  status: concluido
  criterio_saida: Harness e suite existente passam.
  paralelizavel: false
  paralela_com: []
  tasks:
  - T-01.01
tasks:
- id: T-01.01
  titulo: Preparar harness de calculadoras
  fase: F-01.1
  status: concluida
  objetivo: Executar calculadoras e paineis em node:vm sem navegador
  arquivos:
    cria:
    - scripts/testar-demanda-suporte.mjs
    altera: []
  teste_integracao: Carregar core, graficos e custo-do-suporte-por-cliente, exigindo registro unico com id exato e cinco campos.
  teste_funcional: Os padroes da calculadora existente produzem HTML nao vazio contendo o titulo Custo de suporte por cliente, por mes e o valor calculado de R$ 55.
  criterio_aceite: node --test scripts/testar-demanda-suporte.mjs passa os testes do harness.
  depende_de: []
  paralelizavel: false
  concluida_em: '2026-10-04'
  suite: parcial
---
# Fundacao de testes

Objetivo: preparar capacidade de testar sem implementar negocio.

Criterio de saida: Harness e suite existente passam.

Paralelismo de escrita: nenhum. Revisores de leitura independentes podem ajudar o executor.

## T-01.01 — Preparar harness de calculadoras

Executar calculadoras e paineis em node:vm sem navegador

Integracao: Carregar core, graficos e custo-do-suporte-por-cliente, exigindo registro unico com id exato e cinco campos.

Funcional: Os padroes da calculadora existente produzem HTML nao vazio contendo o titulo Custo de suporte por cliente, por mes e o valor calculado de R$ 55.

Aceite: node --test scripts/testar-demanda-suporte.mjs passa os testes do harness.

Status: concluida. Dependencias: nenhuma. Arquivos: scripts/testar-demanda-suporte.mjs.

Registro T-01.01: 2026-10-04 — 2 testes passaram; revisor independente solido; TDD vermelho 2 falhas e verde 2/2. Esforco focado nao medido; somente duracao observada no rastro.

## Saida da suite completa

```text
ℹ tests 2
ℹ pass 2
ℹ fail 0
✓ 72 calculadoras válidas (lista integral exibida no terminal).
OK: CSS atualizado servido ao navegador com cache antigo
```
