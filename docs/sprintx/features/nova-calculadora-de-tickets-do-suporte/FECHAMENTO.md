---
expx_schema: 1
expx_tool: sprintx
kind: fechamento
trabalho_id: nova-calculadora-de-tickets-do-suporte
titulo: Nivel de demanda do suporte
tipo_trabalho: feature
fechado_em: '2026-10-04'
modulo_afetado:
- calculadoras
- js
- scripts
- raiz
arquivos_alterados:
- README.md
- js/calculadoras/nivel-de-demanda-do-suporte.js
- js/manifest.js
- scripts/testar-demanda-suporte.mjs
palavras_chave:
- suporte
- demanda
- ocupacao
- wip
- capacidade
- contratacao
resumo: Calculadora de demanda do suporte integrada ao catalogo com ocupacao, media por atendente e contratacoes minimas.
decisao_principal: WIP por atendente e TMA como duracao ocupando vaga, incluindo esperas; capacidade teorica com paralelismo sustentavel
risco_residual: Modelo teorico depende de paralelismo sustentavel; inspecao visual em navegador indisponivel nesta sessao; autenticacao e PDF real nao exercitados.
testes_adicionados: 37
---
# Fechamento

Calculadora de demanda do suporte integrada ao catalogo com ocupacao, media por atendente e contratacoes minimas.

Decisao principal: WIP por atendente e TMA como duracao ocupando vaga, incluindo esperas; capacidade teorica com paralelismo sustentavel.

Risco residual: Modelo teorico depende de paralelismo sustentavel; inspecao visual em navegador indisponivel nesta sessao; autenticacao e PDF real nao exercitados.

37 testes passaram; 73 calculadoras validas; regressao do service worker passou. Execucao e auditoria ocorreram no worktree isolado; arquivos finais integrados ao checkout principal sem commit ou deploy. Relatorio completo: [RELATORIO.md](RELATORIO.md).
