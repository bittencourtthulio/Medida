# 📈 Calculadora de ROI para SaaS

Calculadora simples, em uma única página, para medir a performance de aquisição de um produto SaaS com **receita recorrente**. Você informa o investimento em tráfego, o ticket, a margem e o churn, e ela devolve os KPIs que importam.

**➡️ [Abrir a calculadora](https://bittencourtthulio.github.io/calculadora-roi-invest-saas/)**

## O que ela calcula

| Indicador | Como é calculado |
|---|---|
| **CAC** | (tráfego + outros custos de aquisição) ÷ novos clientes |
| **LTV** | ticket × margem variável ÷ churn mensal |
| **LTV / CAC** | LTV ÷ CAC (meta: 3x ou mais) |
| **Break-even da coorte** | mês em que o lucro acumulado da coorte cobre o investimento, com churn mês a mês |
| **Payback do CAC** | CAC ÷ margem mensal por cliente (sem churn) |
| **ROI no horizonte** | (lucro acumulado − custo) ÷ custo, no prazo escolhido |
| **ROI no LTV** | retorno total da coorte sobre o custo de aquisição |
| **Novo MRR / ARR** | novos clientes × ticket (× 12 para o ARR) |
| **ROAS (1º mês)** | novo MRR ÷ investimento em tráfego |
| **CAC máximo saudável** | LTV ÷ 3 |
| **CPL e conversão** | opcional, se você informar os leads |

Também traz um gráfico do lucro acumulado, com o ponto de break-even marcado, e uma tabela mês a mês.

## Premissas

- O LTV usa a **margem**, não a receita bruta.
- A simulação acompanha **uma coorte** (os clientes de um mês de investimento) com churn constante.
- Com churn zero, o LTV aparece como ∞.
- O break-even é buscado em até 60 meses.

## Como usar

Abra o [link acima](https://bittencourtthulio.github.io/calculadora-roi-invest-saas/) ou baixe o `index.html` e abra no navegador. Não tem dependências, build nem backend. Nada do que você digita sai do seu computador.

## Stack

HTML, CSS e JavaScript puros, em um único arquivo. Tema claro e escuro automático.
