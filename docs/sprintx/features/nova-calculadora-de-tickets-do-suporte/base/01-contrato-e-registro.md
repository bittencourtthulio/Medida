# Contrato e registro de calculadoras

## Contrato de entrada

Cada calculadora fornece a `registrar` um objeto com `id`, `nome`, `categoria`, `descricao`, `campos`, `termos` e função `calcular(v)`. O identificador coincide com o nome do arquivo em `js/calculadoras/`; o manifesto lista os identificadores carregados. Fontes: `js/core.js:10-25`, `js/manifest.js:1-3` e `.claude/skills/nova-calculadora/SKILL.md:21-40`.

Campos possuem `id`, `rotulo`, `valor` e podem declarar `prefixo`, `sufixo`, `max`, `dica`, `opcional`, `tipo: 'checkbox'` ou `mostrarSe`. `lerValores` usa `parseFloat`, converte valores não finitos em zero e limita números ao intervalo entre zero e `max`, quando este existe; os limites inferiores e o valor substituto estão em `js/core.js:31-35`. Não há arredondamento para inteiros nessa leitura. Checkboxes chegam como booleanos. Fontes: `js/core.js:14`, `js/core.js:28-37`.

O manifesto tem um grupo existente `Entrega e Operação`, contendo calculadoras de capacidade, WIP e utilização. Isso descreve a organização atual, sem decidir a categoria da nova feature. Fonte: `js/manifest.js:35-43`.

## Contrato de saída

`calcular(v)` devolve `kpis`, `diagnostico` e `paineis`. KPIs trazem `nome`, `valor` como string formatada, `nota` e selo opcional. O diagnóstico possui `tipo` entre `good`, `warn` e `bad`, `titulo`, `texto` e pontos acionáveis. Painéis são dados consumidos pelo renderizador. Fontes: `js/core.js:15-19`, `.claude/skills/nova-calculadora/SKILL.md:35-37`.

`fmt` oferece moeda, número, meses e percentual em português brasileiro; o formatador percentual recebe uma fração e aplica a conversão definida em `js/core.js:6`. Valores não finitos são apresentados como travessão. Fonte: `js/core.js:2-7`.

## Limites e cotas

O contrato pede de 2 a 3 painéis por calculadora (`.claude/skills/nova-calculadora/SKILL.md:45`). Os números exibidos devem vir das entradas e benchmarks não podem ser inventados. A calculadora é função pura, sem estado local, rede ou banco. Fontes: `.claude/skills/nova-calculadora/SKILL.md:45`, `.claude/skills/nova-calculadora/SKILL.md:49-55`.

O contrato determina encapsulamento em IIFE para evitar colisões no escopo global e restringe a extensão ao módulo de calculadora e registro no manifesto, sem modificar app, página inicial ou CSS. Fontes: `.claude/skills/nova-calculadora/SKILL.md:8-9`, `.claude/skills/nova-calculadora/SKILL.md:47`.

Cotas de serviço remoto não se aplicam ao cálculo puro descrito. Limite geral de magnitude das entradas: NÃO DOCUMENTADO; a leitura aplica apenas o `max` individual quando declarado (`js/core.js:33-35`).

## Erros conhecidos e tratamento

O contrato exige tratar divisão por zero, usando travessão ou diagnóstico de dados ausentes, sem expor `NaN`, `undefined` ou `Infinity`. Fonte: `.claude/skills/nova-calculadora/SKILL.md:50`.

Falha de carregamento de módulo rejeita a promessa com mensagem identificando a calculadora; o app exibe essa mensagem escapada. Fontes: `js/core.js:41-46`, `js/app.js:402-403`.

## Riscos para a nossa implementação

Entradas de colaboradores e WIP podem conter frações porque o leitor não exige inteiros; uma regra de negócio para essas entradas não pode ser atribuída ao leitor existente (`js/core.js:28-37`).

O passo inicial da skill menciona edição de `js/termos.js`, mas a regra específica posterior determina colocar `termos` no próprio registro. O app e o validador aceitam o campo no registro e têm fallback para o arquivo legado. Fontes: `.claude/skills/nova-calculadora/SKILL.md:15`, `.claude/skills/nova-calculadora/SKILL.md:46`, `js/app.js:62`, `scripts/validar.mjs:30`.

Um módulo fora do manifesto não entra no carregamento do dashboard. A presença no disco não basta. Fontes: `js/core.js:40-47`, `scripts/validar.mjs:20-21`.

## Fonte

- `js/core.js:1-47` — acessado em 2026-10-04.
- `js/manifest.js:1-84` — acessado em 2026-10-04.
- `.claude/skills/nova-calculadora/SKILL.md:8-56` — acessado em 2026-10-04.
- `js/app.js:59-64`, `js/app.js:402-403` — acessado em 2026-10-04.
- `scripts/validar.mjs:20-30` — acessado em 2026-10-04.
