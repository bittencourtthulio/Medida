---
expx_schema: 1
expx_tool: sprintx
kind: decisoes
trabalho_id: nova-calculadora-de-tickets-do-suporte
densidade: padrao
modo_construcao: autonomo
atualizado_em: '2026-10-04'
decisoes:
- id: D-00
  decisao: Densidade padrao e construcao autonoma com agentes
  alternativa_descartada: null
  motivo: 'Usuario delegou todas as decisoes: VC RESOLVE TUDO.'
  status: fechada
  bloqueante: false
- id: D-01
  decisao: Entregar os cinco campos pedidos, ocupacao, media por atendente e necessidade de contratar
  alternativa_descartada: null
  motivo: Pedido original do usuario.
  status: fechada
  bloqueante: false
- id: D-02
  decisao: WIP por atendente e TMA como duracao ocupando vaga, incluindo esperas; capacidade teorica com paralelismo sustentavel
  alternativa_descartada: null
  motivo: (HIPOTESE) WIP simultaneo permite modelo com cinco entradas; revisao independente alertou que esforco ativo nao pode ser multiplicado por WIP.
  status: fechada
  bloqueante: false
- id: D-03
  decisao: Tickets por dia e horas liquidas por atendente por dia; TMA em minutos
  alternativa_descartada: null
  motivo: (HIPOTESE) A carga solicitada e diaria; unidades explicitas evitam misturar meses e dias.
  status: fechada
  bloqueante: false
- id: D-04
  decisao: Colaboradores inteiros >=0, WIP inteiro >0, tickets >=0, TMA >0 e horas >0 ate 24
  alternativa_descartada: null
  motivo: (HIPOTESE) Core permite zero e fracoes; validar no modulo. Com equipe zero estimar contratacoes e mostrar tracos em ocupacao/media.
  status: fechada
  bloqueante: false
- id: D-05
  decisao: Equipe necessaria pelo teto da demanda/capacidade individual; sem margem de seguranca arbitraria
  alternativa_descartada: null
  motivo: (HIPOTESE) Contrato proibe benchmarks inventados; 100% e limite matematico e >100% e deficit.
  status: fechada
  bloqueante: false
- id: D-06
  decisao: Modulo puro em Entrega e Operacao reutiliza formulario, graficos, busca, URL e PDF existentes
  alternativa_descartada: null
  motivo: (HIPOTESE) base/01-contrato-e-registro.md e base/02-interface-e-paineis.md documentam extensao pelo registro.
  status: fechada
  bloqueante: false
- id: D-07
  decisao: Sem persistencia, telemetria, dependencias ou novos segredos; mesmo ambiente estatico e login existentes
  alternativa_descartada: null
  motivo: (HIPOTESE) Contrato do projeto exige funcao pura; js/core.js e README.md sustentam execucao local no navegador.
  status: fechada
  bloqueante: false
- id: D-08
  decisao: Entrada invalida ou overflow retorna diagnostico de dados insuficientes, sem recomendacao de contratacao
  alternativa_descartada: null
  motivo: (HIPOTESE) js/app.js chama calcular sem captura e scripts/validar.mjs proibe resultados nao finitos.
  status: fechada
  bloqueante: false
- id: D-09
  decisao: Pronto quando cenarios matematicos, registro, renderizacao de paineis e suite existente passarem
  alternativa_descartada: null
  motivo: (HIPOTESE) Cobertura dos resultados solicitados com verificacao independente; publicar ou alterar login fica fora do escopo.
  status: fechada
  bloqueante: false
---
# Decisoes

D-00 | Densidade padrao e construcao autonoma com agentes | Usuario delegou todas as decisoes: VC RESOLVE TUDO.

D-01 | Entregar os cinco campos pedidos, ocupacao, media por atendente e necessidade de contratar | Pedido original do usuario.

D-02 | WIP por atendente e TMA como duracao ocupando vaga, incluindo esperas; capacidade teorica com paralelismo sustentavel | (HIPOTESE) WIP simultaneo permite modelo com cinco entradas; revisao independente alertou que esforco ativo nao pode ser multiplicado por WIP.

D-03 | Tickets por dia e horas liquidas por atendente por dia; TMA em minutos | (HIPOTESE) A carga solicitada e diaria; unidades explicitas evitam misturar meses e dias.

D-04 | Colaboradores inteiros >=0, WIP inteiro >0, tickets >=0, TMA >0 e horas >0 ate 24 | (HIPOTESE) Core permite zero e fracoes; validar no modulo. Com equipe zero estimar contratacoes e mostrar tracos em ocupacao/media.

D-05 | Equipe necessaria pelo teto da demanda/capacidade individual; sem margem de seguranca arbitraria | (HIPOTESE) Contrato proibe benchmarks inventados; 100% e limite matematico e >100% e deficit.

D-06 | Modulo puro em Entrega e Operacao reutiliza formulario, graficos, busca, URL e PDF existentes | (HIPOTESE) base/01-contrato-e-registro.md e base/02-interface-e-paineis.md documentam extensao pelo registro.

D-07 | Sem persistencia, telemetria, dependencias ou novos segredos; mesmo ambiente estatico e login existentes | (HIPOTESE) Contrato do projeto exige funcao pura; js/core.js e README.md sustentam execucao local no navegador.

D-08 | Entrada invalida ou overflow retorna diagnostico de dados insuficientes, sem recomendacao de contratacao | (HIPOTESE) js/app.js chama calcular sem captura e scripts/validar.mjs proibe resultados nao finitos.

D-09 | Pronto quando cenarios matematicos, registro, renderizacao de paineis e suite existente passarem | (HIPOTESE) Cobertura dos resultados solicitados com verificacao independente; publicar ou alterar login fica fora do escopo.

Sem pendencias. Os sete eixos estao cobertos: escopo D-01; arquitetura D-06; dados D-02 a D-05; observabilidade e ambiente D-07; erros D-08; pronto D-09. Decisoes por hipotese tomadas sob delegacao explicita do usuario.
