---
name: nova-calculadora
description: Cria uma calculadora, KPI ou métrica nova na plataforma seguindo o contrato do projeto, de modo que ela apareça sozinha no dashboard e na landing. Use quando pedirem "cria uma calculadora de X", "adiciona a métrica Y" ou equivalente.
---

# Nova calculadora

Toda calculadora é **um arquivo** em `js/calculadoras/<id>.js` + **uma linha** em `js/manifest.js`.
Não mexa em `app.js`, `index.html` ou CSS: dashboard, formulário, diagnóstico, KPIs e PDF vêm do contrato.

## Passos

1. Escolha o `id` (kebab-case, igual ao nome do arquivo) e a `categoria`, que é uma das 8 áreas do DNA EXPX (o validador recusa outra): **Posicionamento, Aquisição, Conversão, Entrega e Operação, Finanças, Retenção e Expansão, Produtos e Inovação, Tecnologia e IA**. Desempate: a área dona do número que muda se a calculadora der certo. Tecnologia e IA quase nunca é a dona: o veredito deve terminar em margem, custo, capacidade ou receita.
2. Crie `js/calculadoras/<id>.js` a partir do modelo abaixo. Leia `churn.js` ou `ponto-equilibrio.js` como referência de tom e tamanho.
3. Adicione `'<id>'` ao array em `js/manifest.js`, no grupo da sua área.
4. Rode `node scripts/validar.mjs <id>` (só o seu arquivo) e depois `node scripts/validar.mjs` (tudo). Corrija até passar. Ele testa o contrato com os valores padrão e com tudo zerado.
5. (Opcional) Abra `app.html` por um servidor local (`python3 -m http.server`) e confira a tela.

## Contrato

```js
registrar({
  id: 'meu-kpi',                 // igual ao nome do arquivo
  nome: 'Título na tela',
  categoria: 'Finanças',
  descricao: 'Uma frase: que pergunta esta calculadora responde.',
  campos: [
    // number: { id, rotulo, valor (padrão realista), prefixo?: 'R$', sufixo?: '%', max?: 100, dica?, opcional? }
    // checkbox: { id, rotulo, tipo: 'checkbox', valor: false }
    // condicional: { ..., mostrarSe: '<id de um checkbox>' }
  ],
  calcular(v) {                  // v[id]: número >= 0 (checkbox = boolean). Já vem limitado por max.
    const { brl, num, pct } = fmt;   // brl(v, casas?), num(v, casas?), pct(fração, casas?)
    return {
      kpis: [{ nome, valor: 'string formatada', nota: 'como se calcula', selo: ['good'|'warn'|'bad', 'texto'] }],
      diagnostico: { tipo: 'good'|'warn'|'bad', titulo, texto, pontos: ['leitura acionável', ...] },
      extra: '<section class="card">…</section>', // opcional: gráfico SVG, tabela
    };
  },
});
```

## Regras

- Envolva o arquivo inteiro em `(() => { ... })();` para que funções auxiliares (gráficos, tabelas) não colidam com as de outras calculadoras: todos os arquivos compartilham o escopo global.
- Cada área deve ter pelo menos 5 calculadoras.
- Nunca invente benchmark ou fonte: limiar só se for matemática pura ou regra de bolso atribuível, dita como tal no texto. Preços de terceiros (IA, nuvem) sempre vêm de campo preenchido pelo usuário.
- `valor` dos KPIs é **string já formatada** (use `fmt`). Nunca deixe aparecer `NaN`, `undefined` ou `Infinity`: trate divisão por zero e devolva `—` ou um diagnóstico "Faltam dados".
- O **diagnóstico é obrigatório** e é o motivo da plataforma existir: diga o que o número significa e onde agir, com números do usuário nos `pontos`. Benchmarks só se forem amplamente aceitos, e diga de onde vêm no `texto`.
- Semáforo: `good` saudável, `warn` atenção/no limite, `bad` destrói valor ou prejuízo.
- Sem estado: nada de `localStorage`, rede ou banco. Tudo é função pura de `v`.
- Textos em português do Brasil, campos com padrão realista (a tela já abre com diagnóstico).
- Conteúdo de `extra` entra como HTML: só use dados numéricos formatados por `fmt`, nunca texto digitado pelo usuário.
- O PDF é gerado pela impressão da página: use `.card`, `.kpi`, `.diag` (já tratados) e evite elementos com altura fixa ou scroll que escondam conteúdo.
