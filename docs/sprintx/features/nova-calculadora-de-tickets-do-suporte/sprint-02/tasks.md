---
expx_schema: 1
expx_tool: sprintx
kind: plano
trabalho_id: nova-calculadora-de-tickets-do-suporte
sprint_id: sprint-02
atualizado_em: '2026-10-04'
sprint:
  titulo: Demanda do suporte
  status: concluido
  criterio_saida: Calculadora registrada, testes funcionais e de integracao passam, suite existente verde.
  riscos:
  - Interpretar duracao do ticket como esforco ativo superestima capacidade.
  fora_de_escopo:
  - Deploy
  - Alterar autenticacao
  - Simulacao de filas e SLA
fases:
- id: F-02.1
  titulo: Demanda do suporte
  status: concluido
  criterio_saida: Calculadora registrada, testes funcionais e de integracao passam, suite existente verde.
  paralelizavel: false
  paralela_com: []
  tasks:
  - T-02.01
  - T-02.02
tasks:
- id: T-02.01
  titulo: Calcular demanda do suporte
  fase: F-02.1
  status: concluida
  objetivo: Entregar capacidade, ocupacao, media e contratacao com premissas explicitas
  arquivos:
    cria:
    - js/calculadoras/nivel-de-demanda-do-suporte.js
    altera:
    - scripts/testar-demanda-suporte.mjs
  teste_integracao: Carregar o modulo com core e renderPaineis e verificar os tres paineis e metadados de entrada.
  teste_funcional: Com 5 pessoas, WIP 2, 150 tickets, TMA 30 e 6h, retorna 125%, media 30, equipe 7 e contratar 2.
  criterio_aceite: Testes de zero, folga, limite, deficit, WIP, TMA, horas, fracoes, equipe zero, dados invalidos e overflow passam.
  depende_de:
  - T-01.01
  paralelizavel: false
  concluida_em: '2026-10-04'
  suite: parcial
- id: T-02.02
  titulo: Integrar catalogo e documentar
  fase: F-02.1
  status: concluida
  objetivo: Expor a calculadora pela busca, catalogo e carregador existentes
  arquivos:
    cria: []
    altera:
    - js/manifest.js
    - README.md
    - scripts/testar-demanda-suporte.mjs
  teste_integracao: Carregar o manifesto completo e exigir um unico registro nivel-de-demanda-do-suporte em Entrega e Operacao com termos suporte, wip e contratar.
  teste_funcional: O registro tem os cinco IDs colaboradores/wip/ticketsDia/tempoMedio/horasDia com unidades e dicas explicitas e KPIs de ocupacao, media e contratacoes.
  criterio_aceite: Teste de registro passa, node scripts/validar.mjs passa e README lista a calculadora e suas premissas.
  depende_de:
  - T-02.01
  paralelizavel: false
  concluida_em: '2026-10-04'
  suite: parcial
---
# Demanda do suporte

Objetivo: entregar os resultados pedidos no contrato existente.

Criterio de saida: Calculadora registrada, testes funcionais e de integracao passam, suite existente verde.

Paralelismo de escrita: nenhum. Revisores de leitura independentes podem ajudar o executor.

## T-02.01 — Calcular demanda do suporte

Entregar capacidade, ocupacao, media e contratacao com premissas explicitas

Integracao: Carregar o modulo com core e renderPaineis e verificar os tres paineis e metadados de entrada.

Funcional: Com 5 pessoas, WIP 2, 150 tickets, TMA 30 e 6h, retorna 125%, media 30, equipe 7 e contratar 2.

Aceite: Testes de zero, folga, limite, deficit, WIP, TMA, horas, fracoes, equipe zero, dados invalidos e overflow passam.

Status: concluida. Dependencias: T-01.01. Arquivos: js/calculadoras/nivel-de-demanda-do-suporte.js, scripts/testar-demanda-suporte.mjs.

## T-02.02 — Integrar catalogo e documentar

Expor a calculadora pela busca, catalogo e carregador existentes

Integracao: Carregar o manifesto completo e exigir um unico registro nivel-de-demanda-do-suporte em Entrega e Operacao com termos suporte, wip e contratar.

Funcional: O registro tem os cinco IDs colaboradores/wip/ticketsDia/tempoMedio/horasDia com unidades e dicas explicitas e KPIs de ocupacao, media e contratacoes.

Aceite: Teste de registro passa, node scripts/validar.mjs passa e README lista a calculadora e suas premissas.

Status: concluida. Dependencias: T-02.01. Arquivos: js/manifest.js, README.md, scripts/testar-demanda-suporte.mjs.

Registro T-02.01: 2026-10-04 — 34 testes passaram; regressao adicional de inteiro grande passou; contrato individual valido; revisao de testes solida. Esforco focado nao medido; duracao observada no rastro.

Registro T-02.02: 2026-10-04 — Testes de catalogo: 2 passaram apos 2 falhas antes do registro. Revisor de testes solido e auditor de aceite aprovou. Esforco focado nao medido; duracao observada no rastro.

## Saida da suite completa

```text
✔ harness: carrega registro e campos de uma calculadora existente (3.285333ms)
✔ harness: executa padroes e renderiza titulo e resultado conhecidos (17.471083ms)
✔ demanda: sobrecarga indica 125%, 30 tickets/pessoa e duas contratacoes (3.559792ms)
✔ demanda: folga nao pede contratar (1.922833ms)
✔ demanda: 100% e limite sem folga, sem contratar a mais (1.891292ms)
✔ demanda: zero tickets e valido (1.550833ms)
✔ demanda: WIP um reduz capacidade de atendimento paralelo (2.087458ms)
✔ demanda: dobrar TMA ou reduzir horas pela metade aumenta necessidade (2.968417ms)
✔ demanda: horas e tickets fracionarios preservam media e teto (1.368333ms)
✔ demanda: equipe zero permite estimar contratacao sem dividir por zero (2.182167ms)
✔ demanda: equipe e demanda zero nao recomendam contratar (1.327667ms)
✔ demanda: erros de ponto flutuante no limite nao criam contratacao extra (1.211625ms)
✔ demanda: demanda positiva pequena exige pelo menos uma pessoa (1.397125ms)
✔ demanda: rejeita colaboradores=-1 (0.923625ms)
✔ demanda: rejeita colaboradores=2.5 (0.693667ms)
✔ demanda: rejeita colaboradores=Infinity (0.61525ms)
✔ demanda: rejeita wip=0 (0.605709ms)
✔ demanda: rejeita wip=-1 (0.543083ms)
✔ demanda: rejeita wip=1.5 (2.38675ms)
✔ demanda: rejeita wip=Infinity (1.355375ms)
✔ demanda: rejeita tempoMedio=0 (0.958167ms)
✔ demanda: rejeita tempoMedio=-1 (0.717209ms)
✔ demanda: rejeita tempoMedio=NaN (0.7045ms)
✔ demanda: rejeita tempoMedio=Infinity (4.462959ms)
✔ demanda: rejeita horasDia=0 (2.708833ms)
✔ demanda: rejeita horasDia=-1 (1.040833ms)
✔ demanda: rejeita horasDia=25 (0.822958ms)
✔ demanda: rejeita horasDia=Infinity (1.403542ms)
✔ demanda: rejeita ticketsDia=-1 (1.155625ms)
✔ demanda: rejeita ticketsDia=NaN (0.752334ms)
✔ demanda: rejeita ticketsDia=Infinity (0.60825ms)
✔ demanda: overflow da capacidade ou necessidade nao vaza resultados invalidos (1.346666ms)
✔ demanda: tres paineis reais incluem capacidade 120 e demanda 150 (5.392334ms)
✔ demanda: contagens fora da precisao segura nao geram contratacao imprecisa (3.699833ms)
✔ demanda: quociente inteiro grande preserva todas as pessoas necessarias (1.508ms)
✔ catalogo: manifesto carrega a calculadora uma unica vez na area de operacao (13.875584ms)
✔ catalogo: entradas e resultados expressam unidades e premissas do suporte (10.154959ms)
ℹ tests 37
ℹ suites 0
ℹ pass 37
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 196.622542
✓ 73 calculadoras válidas: concentracao-de-nicho, desconto-e-percepcao, multiplo-de-valor, premio-de-preco, teste-das-cinco-marcas, teste-de-preco, win-rate-contra-concorrente, cac-por-canal, custo-por-lead-qualificado, dependencia-de-indicacao, funil-trafego, magic-number, parcerias-e-afiliados, payback-de-cac, pipeline-cobertura, prospeccao-outbound, roi-de-conteudo, roi-saas, teste-ab-de-conversao, capacidade-comercial, comissao-de-vendas, forecast-ponderado, impacto-do-desconto, meta-de-vendas, mix-de-planos, motivos-de-perda, precificacao, velocidade-de-vendas, capacidade-de-entrega, custo-de-implantacao, custo-do-atraso, lead-time-e-wip, margem-por-projeto, nivel-de-demanda-do-suporte, previsibilidade-de-entrega, retrabalho-e-escopo, utilizacao-do-time, burn-multiple, custo-por-colaborador, dso-e-inadimplencia, financiar-crescimento-com-caixa, margem-bruta-saas, plano-anual-vs-mensal, ponto-equilibrio, projecao-mrr, receita-por-funcionario, regra-dos-40, runway-e-burn, tempo-para-aumentar-receita, valuation-por-arr, churn, concentracao-de-clientes, custo-do-suporte-por-cliente, expansao-por-upsell, health-score, nps-e-saude, nrr-grr, quick-ratio, renovacao-de-contratos, retencao-por-coorte, adocao-de-feature, investimento-em-produto, priorizacao-rice, retorno-de-feature, servico-vs-produto, tamanho-de-mercado, construir-ou-comprar, custo-de-ia-por-uso, deflexao-de-suporte-com-ia, divida-tecnica, infra-por-cliente, roi-de-automacao, uptime-e-indisponibilidade
OK: CSS atualizado servido ao navegador com cache antigo
```
