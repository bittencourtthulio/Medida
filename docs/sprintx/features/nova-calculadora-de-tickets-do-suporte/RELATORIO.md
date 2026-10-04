# Relatorio da entrega

## 1. Concluido por sprint

- Sprint 01: 1/1 task concluida; harness de registro, calculo e renderizacao.
- Sprint 02: 2/2 tasks concluidas; calculadora com cinco entradas, sete KPIs e tres paineis, integrada ao catalogo e documentada.

## 2. Bloqueios

Nenhum bloqueio de implementacao. Inspecao visual nao realizada: ferramenta informou navegador indisponivel e inventario de apps expirou. Renderizacao coberta pelo harness; login e impressao real nao exercitados.

## 3. Saida da suite

Saida integral dos comandos da ultima verificacao, sem reexecucao depois de aprovada:

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

## 4. Divergencias entre o plano e a realidade

- Revisao fortaleceu testes do harness e do catalogo antes da implementacao.
- Auditoria identificou risco de tolerancia numerica reduzir contagens inteiras grandes; corrigido com arredondamento para inteiro proximo e regressao de 10^15.
- Protecao adicional rejeita contagens fora da precisao inteira segura.
- Inspecao visual opcional indisponivel; fixture local temporaria de autenticacao simulada ficou somente no diretorio temporario de testes, sem alterar o produto.
- README ja trazia contagem antiga; contagem total e linha de Financas foram reconciliadas com o manifesto existente.
- F1 alterou .gitignore para os registros locais exigidos pelo metodo; esse arquivo nao integra as tasks de produto.
- Esforco humano focado nao foi medido; real permanece null e duracao_observada e registrada separadamente, sem inventar medida de esforco.
- Desenvolvimento isolado no worktree SprintX; artefatos finais trazidos ao checkout principal depois da validacao, sem tocar pesquisa-simulada.

FECHAMENTO.md gravado. Modulos: calculadoras, js, scripts e raiz.
