# Medida

Plataforma simples de calculadoras, KPIs e métricas com **diagnóstico**. A pessoa cria uma conta, entra, escolhe uma calculadora, informa os números e recebe o diagnóstico, com opção de **salvar em PDF**. Nada do que ela digita é guardado.

Site estático (HTML, CSS e JavaScript puros, sem build) publicado no **GitHub Pages**. O login é feito pelo **Firebase Authentication** (Google e e-mail/senha), que guarda as contas para você. A plataforma em si não tem banco: nada que a pessoa digita nas calculadoras é salvo.

## Estrutura

| Arquivo | Papel |
|---|---|
| `index.html` | Landing page (lista as calculadoras automaticamente) |
| `app.html` | Plataforma: login, dashboard e calculadora |
| `js/calculadoras/*.js` | Uma calculadora por arquivo |
| `js/manifest.js` | Lista de calculadoras ativas |
| `js/areas.js` | As 8 áreas do DNA EXPX (menu lateral e categorias) |
| `js/termos.js` | Palavras e perguntas que levam a cada calculadora (busca e chat) |
| `js/config.js` | Nome da plataforma e chaves do Firebase |
| `scripts/validar.mjs` | Valida o contrato das calculadoras |
| `.claude/skills/nova-calculadora` | Skill para o Claude Code criar calculadoras novas |

## Busca e chat

O app tem menu lateral por área, busca rápida (Ctrl/⌘ K) e, no início, um chat em que a pessoa escreve a dúvida ("meu caixa está acabando") e vê à direita as calculadoras mais indicadas. Não usa IA: é uma busca por palavras-chave com radicais e pesos (nome da calculadora, `js/termos.js`, descrição, campos e área). Para melhorar as respostas, enriqueça `js/termos.js`.

## Quadro branco

Em `#/quadro` (menu lateral): caixas, notas, círculos e textos que se arrastam e se ligam com setas, mais três modelos prontos (funil, unit economics, receita recorrente). Duplo clique edita, Delete apaga, Ctrl/⌘ Z desfaz, Ctrl/⌘ + rolagem dá zoom. O desenho fica só no `localStorage` do navegador. Código em `js/quadro.js`.

## Configurar o login (uma vez, uns 5 minutos)

1. Acesse [console.firebase.google.com](https://console.firebase.google.com), crie um projeto (pode desativar o Google Analytics).
2. **Build → Authentication → Começar → Método de login**: ative **Google** (escolha o e-mail de suporte e salve) e **E-mail/senha**.
3. **Authentication → Configurações → Domínios autorizados**: adicione o domínio onde o site vai ficar (ex.: `bittencourtthulio.github.io`). `localhost` já vem liberado.
4. **Configurações do projeto (engrenagem) → Seus apps → Web (`</>`)**: registre o app e copie o `firebaseConfig`.
5. Cole `apiKey`, `authDomain`, `projectId` e `appId` em `js/config.js`.

A `apiKey` do Firebase é pública por desenho; quem protege é a lista de domínios autorizados. As contas criadas aparecem em **Authentication → Usuários**. O plano gratuito cobre dezenas de milhares de logins por mês.

## Publicar

**Settings → Pages → Deploy from a branch → `main` / root.** Para testar localmente: `python3 -m http.server` e abra `http://localhost:8000` (módulos e login não funcionam em `file://`).

## Criar uma calculadora nova

Peça ao Claude Code ("cria uma calculadora de X"): a skill `nova-calculadora` segue o contrato, registra em `js/manifest.js` e valida. Manualmente: crie `js/calculadoras/<id>.js`, adicione `'<id>'` ao manifesto e rode `node scripts/validar.mjs`. O contrato completo está em `.claude/skills/nova-calculadora/SKILL.md`.

## Calculadoras incluídas (73, em 8 áreas do DNA EXPX)

| Área | Calculadoras |
|---|---|
| Posicionamento (7) | Concentração de receita por nicho · Desconto e percepção de valor · Múltiplo de valor para o cliente · Prêmio de preço sobre o mercado · Teste das cinco marcas · Subir o preço compensa? · Contra quem você perde? |
| Aquisição (12) | CAC por canal · Custo por lead qualificado · Dependência de uma origem de clientes · Funil de tráfego pago · Magic number · Parcerias e afiliados · Payback do CAC por cliente · Cobertura de pipeline · Custo da prospecção outbound · ROI de conteúdo · ROI de aquisição SaaS · Teste A/B de conversão |
| Conversão (9) | Capacidade comercial: quantos vendedores · Custo do time comercial e comissão · Forecast ponderado do pipeline · Impacto do desconto no volume · Meta de vendas e leads necessários · Mix de planos: qual plano sustenta a receita · Motivos de perda de negócios · Preço do plano e margem · Velocidade de vendas |
| Entrega e Operação (9) | Capacidade de entrega · Custo de implantação · Custo do atraso · Lead time e trabalho em andamento · Margem por projeto · Nível de demanda do suporte · Previsibilidade de entrega · Retrabalho e escopo aberto · Utilização do time |
| Finanças (13) | Burn multiple · Custo por colaborador · DSO e inadimplência · Financiar crescimento com caixa · Margem bruta do SaaS · Plano anual contra mensal · Ponto de equilíbrio · Projeção de MRR · Receita por funcionário · Regra dos 40% · Runway e burn · Tempo para aumentar receita · Valuation por múltiplo de ARR |
| Retenção e Expansão (10) | Churn e retenção · Concentração de clientes · Custo do suporte por cliente · Expansão por upsell · Saúde da base · NPS e saúde da base · NRR e GRR · SaaS Quick Ratio · Renovação de contratos · Retenção por coorte |
| Produtos e Inovação (6) | Adoção de funcionalidade e churn · Investimento em produto novo · Priorização RICE · Retorno de funcionalidade · Serviço vs produto · Tamanho de mercado (TAM, SAM, SOM) |
| Tecnologia e IA (7) | Construir ou comprar tecnologia · Custo de IA por cliente · IA no atendimento se paga? · Custo da dívida técnica · Infraestrutura por cliente · ROI de automação e agentes de IA · Custo da indisponibilidade |

Cada uma devolve um veredito, indicadores e um dashboard (gráficos e tabelas). Nenhuma usa benchmark inventado: limiares são matemática ou "regra de bolso" dita como tal no veredito. Preços de IA e nuvem vêm sempre de campos preenchidos pelo usuário.

## Nível de demanda do suporte

Em **Entrega e Operação**, acesse `app.html#/calc/nivel-de-demanda-do-suporte`. Informe colaboradores, WIP simultâneo por atendente, média de tickets por dia, duração média do ticket em minutos e horas líquidas de atendimento por pessoa por dia.

A duração mede quanto tempo o ticket ocupa uma vaga de WIP, incluindo esperas. O modelo pressupõe que o atendente sustenta o paralelismo informado sem aumentar essa duração; para trabalho sequencial, use WIP 1. Não use minutos de esforço ativo como duração de tickets paralelos.

- Capacidade por pessoa/dia = WIP × horas × 60 ÷ duração média.
- Ocupação = tickets/dia ÷ capacidade total; pode ultrapassar 100%.
- Média por atendente = tickets/dia ÷ colaboradores (demanda, não produção medida).
- Equipe mínima = demanda ÷ capacidade individual, arredondada para cima.
- Contratações = máximo entre zero e equipe mínima menos colaboradores atuais.

Aos 100% o time está sem folga; acima disso falta capacidade. A recomendação cobre a média informada, sem reserva para picos, ausências ou SLA. Equipe zero permite dimensionar contratações, com ocupação e média indisponíveis. Demanda zero é válida; colaboradores e WIP fracionários ou denominadores inválidos não geram recomendação.

Exemplo: 5 colaboradores, WIP 2, 150 tickets/dia, 30 minutos e 6 horas/dia resultam em **125% de ocupação**, **30 tickets por atendente/dia**, **7 pessoas necessárias** e **2 contratações**.

Testes: `node --test scripts/testar-demanda-suporte.mjs`. Validação do catálogo: `node scripts/validar.mjs`.

## PDF

O botão "Salvar PDF" usa a impressão do navegador (escolha "Salvar como PDF"). O relatório sai com as premissas usadas, o diagnóstico e os indicadores.

## Stack

HTML, CSS e JavaScript puros. Tema claro e escuro automático.
