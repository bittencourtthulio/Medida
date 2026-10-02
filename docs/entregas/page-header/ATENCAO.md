---
schema: expx-schema v1
kind: atencao
slug: page-header
base: main
branch: avulso/qjcpfgy0-t-1
---
# Atenção humana — page-header

## OLHO OBRIGATÓRIO
- `js/page-header.js` (novo, 71 linhas): controla o tema da UI inteira (`medida-theme`, `data-theme`) e monta o header via `innerHTML`. O nome vem escapado por `esc()` (conferir). Também recria os ids `#menu`, `#crumb` e `#abrirBusca2` — se `app.js` os ligar antes da recriação, o clique morre.
- `css/style.css` (override de tema + bloco `.page-header`): `html[data-theme]` precisa vencer o `@media (prefers-color-scheme)`. Erro aqui quebra contraste no app todo. Evidência: t-2 mediu fundo branco/texto escuro com SO em dark.

## LEITURA RÁPIDA
- `js/app.js` (+9/−2): `montaHeader()` em `rota()`, remoção dos bindings de `#menu`/`#abrirBusca2`; "Sair" do header dispara `#sair`. Conferir que o header é recriado a cada rota sem perder o breadcrumb.

## DISPENSÁVEL
- `app.html` (+2/−5): troca de `<header class="bar">` por `<header id="pageHeader">` e inclusão do script defer antes de `app.js`. Sem lógica.
