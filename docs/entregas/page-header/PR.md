## feat(header): PageHeader com badge do usuário e toggle claro/escuro

**Objetivo:** cabeçalho do `.main` com badge e nome do usuário, botão Sair e alternância de tema claro/escuro persistida.

**O que mudou**
- `js/page-header.js` (novo): aplica o tema salvo no boot (`localStorage['medida-theme']`; sem valor, segue o sistema) e expõe `window.initPageHeader`.
- `css/style.css`: override `html[data-theme=light|dark]` e estilos `.page-header`; oculto em impressão e no modo consultor.
- `app.html` / `js/app.js`: `.bar` vira `#pageHeader`, montado em `rota()` após o login. Menu lateral e `#sair` seguem funcionando.

**Como testar:** veja `docs/entregas/page-header/QA-PACOTE.md`.

**Verificação:** `node --check` ok em `page-header.js` e `app.js`. A revisão t-2 testou no Chrome real com Auth mockado (toggle, persistência, 390×844, Sair). Aprovado, sem bloqueios.

**Ressalvas**
- Pode haver flash de tema no boot (script `defer`).
- A tela de login não tem toggle de tema.
- O login real do Firebase não foi testado.

Revisão: ver `docs/entregas/page-header/ATENCAO.md`.
