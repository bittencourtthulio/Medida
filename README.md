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
| `js/config.js` | Nome da plataforma e chaves do Firebase |
| `scripts/validar.mjs` | Valida o contrato das calculadoras |
| `.claude/skills/nova-calculadora` | Skill para o Claude Code criar calculadoras novas |

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

## Calculadoras incluídas (40, em 8 áreas do DNA EXPX)

| Área | Calculadoras |
|---|---|
| Posicionamento | Prêmio de preço sobre o mercado · Concentração de receita por nicho · Teste das cinco marcas · Desconto e percepção de valor · Múltiplo de valor para o cliente |
| Aquisição | ROI de aquisição SaaS · Funil de tráfego pago · CAC por canal · Cobertura de pipeline · Custo da prospecção outbound |
| Conversão | Preço do plano e margem · Velocidade de vendas · Meta de vendas e leads necessários · Impacto do desconto no volume · Forecast ponderado |
| Entrega e Operação | Margem por projeto · Retrabalho e escopo aberto · Utilização do time · Capacidade de entrega · Custo de implantação |
| Finanças | Ponto de equilíbrio · Runway e burn · Regra dos 40% · Burn multiple · Projeção de MRR |
| Retenção e Expansão | Churn e retenção · NRR e GRR · SaaS Quick Ratio · NPS e saúde da base · Renovação de contratos |
| Produtos e Inovação | Serviço vs produto · Investimento em produto novo · Retorno de funcionalidade · Priorização RICE · Tamanho de mercado (TAM/SAM/SOM) |
| Tecnologia e IA | Infraestrutura por cliente · Custo de IA por cliente · ROI de automação e agentes · Custo da dívida técnica · Construir ou comprar |

Nenhuma usa benchmark inventado: limiares são matemática ou "regra de bolso" dita como tal no veredito. Preços de IA e nuvem vêm sempre de campos preenchidos pelo usuário.

## PDF

O botão "Salvar PDF" usa a impressão do navegador (escolha "Salvar como PDF"). O relatório sai com as premissas usadas, o diagnóstico e os indicadores.

## Stack

HTML, CSS e JavaScript puros. Tema claro e escuro automático.
