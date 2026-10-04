# Validação e modelos existentes de capacidade e suporte

## Contrato de entrada

O comando `node scripts/validar.mjs` carrega o manifesto completo. Com identificadores como argumentos, valida somente os arquivos indicados, inclusive antes de registrá-los no manifesto. Fontes: `scripts/validar.mjs:1-3`, `scripts/validar.mjs:19-26`.

O script usa `node:vm` para carregar core, gráficos, áreas, termos, manifesto e calculadoras. Não depende de navegador para os checks estruturais. Fontes: `scripts/validar.mjs:4-15`, `scripts/validar.mjs:26`.

Referências de negócio existentes recebem: itens em andamento e entregas por semana na calculadora de lead time; pessoas e horas mensais disponíveis/faturadas na utilização; tickets mensais e custos no suporte. Fontes: `js/calculadoras/lead-time-e-wip.js:8-12`, `js/calculadoras/utilizacao-do-time.js:8-14`, `js/calculadoras/custo-do-suporte-por-cliente.js:8-14`.

## Contrato de saída

O validador acumula violações identificadas por calculadora; em caso de falha encerra com código 1 (`scripts/validar.mjs:69`). Em sucesso imprime a lista de calculadoras válidas (`scripts/validar.mjs:70`).

Os modelos existentes calculam lead time como WIP dividido por throughput (`js/calculadoras/lead-time-e-wip.js:18`), capacidade como pessoas multiplicadas pelas horas disponíveis e utilização como horas faturadas divididas pela capacidade (`js/calculadoras/utilizacao-do-time.js:17-21`). O custo de suporte calcula custo por ticket, custo por cliente e tickets por cliente (`js/calculadoras/custo-do-suporte-por-cliente.js:18-20`). Essas fórmulas são fatos do código existente, não definições confirmadas para a nova feature.

## Limites e cotas

O validador executa 2 cenários por calculadora: padrões e entradas todas zeradas (`scripts/validar.mjs:41`). Exige painel no cenário padrão, enquanto a skill determina de 2 a 3 painéis (`scripts/validar.mjs:65`; `.claude/skills/nova-calculadora/SKILL.md:45`).

O script confere categoria, termos, identidade, textos obrigatórios, campos, IDs duplicados e referências condicionais. Analisa tipo, título, estrutura e finitude dos painéis; também renderiza os painéis e procura strings inválidas. Fontes: `scripts/validar.mjs:29-40`, `scripts/validar.mjs:45-66`.

Testes de correção matemática específicos da nova calculadora no validador genérico: NÃO DOCUMENTADO; os cenários e verificações presentes estão em `scripts/validar.mjs:41-66`.

## Erros conhecidos e tratamento

Falha de carregamento, ausência de registro e exceção em `calcular` são capturadas e adicionadas à lista de erros. Fontes: `scripts/validar.mjs:26-28`, `scripts/validar.mjs:44`.

Retornos com diagnóstico incompleto, KPI sem nome ou valor string, números não finitos em painéis e renderização inválida reprovam. Fontes: `scripts/validar.mjs:45-66`.

As calculadoras relacionadas retornam diagnóstico `warn` de dados ausentes para denominadores obrigatórios não positivos; esses retornos podem trazer KPIs vazios e omitir painéis. Fontes: `js/calculadoras/lead-time-e-wip.js:15-16`, `js/calculadoras/utilizacao-do-time.js:18-19`, `js/calculadoras/custo-do-suporte-por-cliente.js:17`.

## Riscos para a nossa implementação

Passar no contrato genérico não demonstra a correção de ocupação ou contratação: o script valida estrutura e cenários de entrada, sem asserções matemáticas desse novo domínio (`scripts/validar.mjs:41-66`).

A referência de WIP existente afirma que reduzir WIP encurta a espera sem aumentar, por si só, o total entregue; ela não documenta WIP como multiplicador de capacidade humana. Fonte: `js/calculadoras/lead-time-e-wip.js:25-30`. Transportar o significado de WIP para a nova calculadora sem definição do usuário seria uma decisão de negócio, não fato ingerido.

A referência de utilização trabalha por mês; a solicitação nova menciona carga diária. A referência de custo de suporte também usa tickets mensais. Essas unidades não estabelecem automaticamente o período da quantidade de tickets da nova feature. Fontes: `js/calculadoras/utilizacao-do-time.js:10-11`, `js/calculadoras/custo-do-suporte-por-cliente.js:9` e solicitação do usuário nesta conversa.

O índice de memória foi consultado e não possui entradas por arquivo ou módulo para as fontes investigadas. Não foi identificado histórico relevante a incorporar; isso não constitui lacuna de negócio. Fonte: `.expx/memoria/indice.json`.

## Fonte

- `scripts/validar.mjs:1-70` — acessado em 2026-10-04.
- `.claude/skills/nova-calculadora/SKILL.md:16`, `.claude/skills/nova-calculadora/SKILL.md:45` — acessado em 2026-10-04.
- `js/calculadoras/lead-time-e-wip.js:8-30` — acessado em 2026-10-04.
- `js/calculadoras/utilizacao-do-time.js:8-21` — acessado em 2026-10-04.
- `js/calculadoras/custo-do-suporte-por-cliente.js:8-20` — acessado em 2026-10-04.
- `.expx/memoria/indice.json` — acessado em 2026-10-04.
- Solicitação do usuário nesta conversa — acessada em 2026-10-04; caminho no repositório: NÃO DOCUMENTADO.
