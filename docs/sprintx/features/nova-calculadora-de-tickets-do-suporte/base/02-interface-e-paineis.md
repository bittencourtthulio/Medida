# Interface, resultados e painéis

## Contrato de entrada

O formulário é gerado diretamente de `campos`: números recebem rótulo, valor padrão, prefixo, sufixo e dica; campos condicionais apontam para checkbox. A restrição inferior do input é zero e o passo é `any`, conforme `js/app.js:224`. Alterações disparam `renderizar`, que lê os valores e chama a função da calculadora. Fontes: `js/app.js:219-229`, `js/app.js:284-291`.

A busca indexa nome, termos, descrição, categoria e rótulos de campos das calculadoras carregadas. O campo `termos` do registro tem precedência sobre `TERMOS[id]`. Fonte: `js/app.js:59-64`.

Painéis aceitos: barras (`dados`), composição (`partes`), funil (`etapas`), linha (`series` com `pontos`), cascata (`passos`) e tabela (`colunas`, `linhas`). Fontes: `js/graficos.js:24-99`, `scripts/validar.mjs:55-59`.

## Contrato de saída

A interface apresenta diagnóstico, KPIs, painéis e resumo das premissas. Textos do diagnóstico, KPI e premissas passam pelo escape do app; painéis fazem seu próprio escape. Fontes: `js/app.js:3`, `js/app.js:294-306`, `js/graficos.js:5`.

Barras usam itens com `rotulo`, `valor` e `tom` opcional; também aceitam meta. Composição usa partes com esses atributos. Tabelas recebem linhas de células simples ou objetos com `v` e `tom`. Painéis possuem `titulo`, `nota` e `largo` opcionais conforme o renderizador. Fontes: `js/graficos.js:24-38`, `js/graficos.js:92-104`.

Os formatos existentes são `brl`, `brl2`, `num`, `int`, `pct`, `x`, `mes`, `sem` e `h`; formato não reconhecido usa número. Fonte: `js/graficos.js:6-10`.

O compartilhamento lê e grava valores na rota `#/calc/<id>` e query do hash; a abertura restaura somente valores numéricos finitos e não negativos. Fontes: `js/app.js:234-261`. O PDF é produzido por `window.print()`, usando o nome da calculadora no título da impressão (`js/app.js:349-355`).

## Limites e cotas

Não há máximo geral de campos ou painéis no renderizador: NÃO DOCUMENTADO. O formulário aplica o `max` definido pelo campo quando houver (`js/app.js:224`, `js/core.js:34`).

A busca retorna no máximo 6 resultados (`js/app.js:81`). As barras usam largura visual mínima de 1,5%, inclusive quando o valor numérico é zero (`js/graficos.js:29`); o valor textual permanece formatado a partir do dado informado. Composição limita valores visuais negativos a zero (`js/graficos.js:35-37`).

## Erros conhecidos e tratamento

Tipo de painel desconhecido retorna texto vazio no renderizador; o validador acusa tipo inválido antes da integração. Fontes: `js/graficos.js:99-103`, `scripts/validar.mjs:55`.

A restauração de URL ignora valores vazios, não finitos ou negativos. Fonte: `js/app.js:243-244`. `renderizar` chama `calcular` diretamente, sem captura local de exceção (`js/app.js:284-308`).

## Riscos para a nossa implementação

Rótulos e dicas precisam carregar as unidades e premissas que serão vistas no formulário e relatório; o app reproduz os metadados do registro, sem acrescentar interpretação de negócio. Fontes: `js/app.js:223-225`, `js/app.js:302-306`.

Gráficos exigem dados numéricos compatíveis com seus formatos. O formato percentual opera com a convenção de fração de `fmt.pct`; enviar valor já convertido altera o resultado apresentado. Fontes: `js/graficos.js:8`, `js/core.js:6`.

Barras de valor zero ainda têm uma marca visível mínima; uma leitura apenas visual pode sugerir capacidade existente. Fonte: `js/graficos.js:29`. A calculadora precisa retornar diagnóstico válido inclusive em entradas incompletas porque a renderização o acessa diretamente (`js/app.js:293-297`).

## Fonte

- `js/app.js:3`, `js/app.js:59-81`, `js/app.js:211-308`, `js/app.js:349-355` — acessado em 2026-10-04.
- `js/graficos.js:1-105` — acessado em 2026-10-04.
- `js/core.js:2-7`, `js/core.js:28-37` — acessado em 2026-10-04.
- `scripts/validar.mjs:55-59` — acessado em 2026-10-04.
