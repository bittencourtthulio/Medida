---
schema: expx-schema v1
kind: qa-pacote
slug: page-header
---
# Pacote de QA — PageHeader

**O que mudou (produto):** o topo do app ganhou a inicial e o nome do usuário, o botão Sair e um botão sol/lua que troca entre tema claro e escuro.

## Ambiente
1. `python3 -m http.server 8765 --directory /Users/thuliobittencourt/orca/projects/calculadora-roi-invest-saas--avulso-qjcpfgy0-t-1`
2. Abra `http://localhost:8765/app.html`. Se o login do Firebase não funcionar localmente, pare no passo 1 e peça uma sessão ou um mock.

## Roteiro
1. Entre com uma conta de teste. Esperado: no topo aparecem a inicial do nome, o nome, "Sair" e o botão de tema.
2. Clique no botão de tema. Esperado: as cores trocam na hora; o ícone vira sol no escuro e lua no claro.
3. Recarregue a página (F5). Esperado: o tema escolhido continua.
4. Redimensione para 390×844. Esperado: nome e "Sair" somem; "Menu" e o botão de tema continuam visíveis; não há rolagem horizontal. O Menu abre a lateral.
5. Clique em "Sair" no topo. Esperado: a sessão encerra como no "Sair" da lateral.

## Colaterais
- Nenhum texto preto sobre fundo preto (ou branco sobre branco) em nenhum tema.
- Buscar e a paleta funcionam. O modo apresentação esconde o header. A impressão não mostra o header.

## Aprovação
Passos 1 a 5 conforme o esperado, nos dois temas.

## Ressalvas conhecidas
Flash de tema ao carregar; a tela de login não tem toggle.
