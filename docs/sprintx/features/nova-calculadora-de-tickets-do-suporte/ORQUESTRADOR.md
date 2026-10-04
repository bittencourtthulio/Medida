---
expx_schema: 1
expx_tool: sprintx
kind: orquestrador
trabalho_id: nova-calculadora-de-tickets-do-suporte
titulo: Nivel de demanda do suporte
tipo_trabalho: feature
tipo_ocorrencia: null
estagio: f6
status: concluido
criado_em: '2026-10-04'
atualizado_em: '2026-10-04'
concluido_em: '2026-10-04'
sprints:
- sprint-01
- sprint-02
caminho_critico:
- T-01.01
- T-02.01
- T-02.02
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
worktree: ../calculadora-roi-invest-saas--nova-calculadora-de-tickets-do-suporte
---
# Orquestrador — demanda do suporte

## 1. Objetivo

Adicionar a calculadora de demanda do suporte com cinco entradas e retorno de ocupacao, media por atendente e contratacoes minimas estimadas. Integrar ao catalogo existente, preservando o contrato visual e funcional.

## 2. Mapa e ordem de leitura

Leia ORQUESTRADOR.md, 00-DECISOES.md, base/00-INDICE.md e os tres recursos listados, base/00-LACUNAS.md, sprint-01/tasks.md, sprint-02/tasks.md, 00-BLOQUEIOS.md e 00-AUDITORIA.md. Ao terminar, consultar FECHAMENTO.md. Sprints condensadas conforme contrato kind plano.

## 3. Rota de execucao

Sprint-01 / F-01.1 / T-01.01 prepara o harness. Sprint-02 / F-02.1 executa T-02.01 e depois T-02.02. Caminho critico: T-01.01 → T-02.01 → T-02.02. Escritas sequenciais porque compartilham o arquivo de teste. Revisores independentes podem ler em paralelo. Nenhuma outra fase paralela.

## 4. Ferramentas

Node.js nativo e Python apenas para registros do metodo. Teste parcial: `node --test scripts/testar-demanda-suporte.mjs`. Contrato parcial: `node scripts/validar.mjs nivel-de-demanda-do-suporte`. Suite: `node --test scripts/testar-demanda-suporte.mjs`, `node scripts/validar.mjs`, `node scripts/testar-sw.mjs`. Sintaxe: `node --check js/calculadoras/nivel-de-demanda-do-suporte.js`. Lint e typecheck: NAO EXISTE NO PROJETO. Sem dependencia nova, API, segredo ou conexao externa; ambiente existente em `.env.local` nao e usado pelos testes. A interface usa Firebase ja configurado em `js/config.js`. Servidor opcional: `python3 -m http.server 8765`.

## 5. Agentes

Implementador escreve testes antes do codigo. Revisor de testes verifica se falhariam com implementacao errada. Auditor de aceite confere os resultados e criterios antes de encerrar. Agentes disponiveis neste trabalho assumem papeis separados; agente unico, se necessario, assume os tres sequencialmente. Investigador ja produziu a base. Auditor do plano le apenas os artefatos, sem corrigir.

## 6. Regras de autonomia

Nao perguntar nem pedir autorizacao sobre decisoes de produto ja delegadas. Teste antes do codigo; registrar o vermelho real e depois o verde. Duvida nova vai para 00-BLOQUEIOS.md: pular e seguir proxima task paralelizavel, se houver. Criterio nao atendido nao avanca. Atualizar status de tasks a cada transicao. Respeitar as permissoes de sistema; worktree isolado existente desta feature. Nao commitar nem publicar sem necessidade para esta entrega.

## 7. Definicao de pronto global

Os cinco campos exibem unidades e premissas. Ocupacao pode exceder 100%; media e tickets/dia por atendente; equipe necessaria e arredondada para cima. Equipe zero mantem contratacao estimavel e usa tracos nas divisoes sem denominador. Demanda zero e valida. Entradas invalidas nao geram recomendacao. Registro unico no manifesto, termos de busca presentes, tres paineis renderizam sem valores invalidos. Testes especificos e suite existente passam. README e FECHAMENTO documentam a entrega. O modelo considera duracao ocupando WIP, paralelismo sustentavel e horas liquidas, sem promessa de SLA ou reserva para picos.

## 8. Como retomar uma sessao interrompida

Ler este arquivo, ler os status em cada tasks.md, ler 00-BLOQUEIOS.md, e continuar da primeira task pendente ou em_andamento cujas dependencias estao concluida. Executar dentro do worktree informado no frontmatter, preservando trabalho alheio.
