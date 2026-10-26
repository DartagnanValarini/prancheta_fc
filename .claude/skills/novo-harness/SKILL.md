---
name: novo-harness
description: Cria um harness (teste) novo no padrão do Catimba FC! para um bug ou feature. Use sempre que corrigir um bug ou fechar um item do roadmap sem gate.
argument-hint: "<assunto> — o que precisa ser garantido"
---

Crie `harness_<assunto>.js` na raiz para garantir: $ARGUMENTS

1. **Escolha o tipo.**
   - Lógica pura (motor, rating, economia, save sem UI): use o sandbox `vm`. Copie o cabeçalho de `harness_fase0.js` (stubs de `window`/`document` + o `capture` que exporta os globais que você precisa).
   - Qualquer coisa com tela, modal, fluxo de rodada: use `require('./ui_test/abrir.js')` (Chromium + Supabase falso). Copie a estrutura de `harness_eliminacao.js`: abrir com `{seguro:true}`, marcar o tutorial como feito, `#btnJogarAgora` → `.clube-lin`, opções da carreira via `App.garantirOpcoes()`.
2. **Formato fixo:** helper `t(cond, msg)` que imprime `  ✅ msg` / `  ❌ msg`, seções `console.log('\n[1] …')`, final `=== N ok, M falhas ===` e `process.exit(falhas?1:0)`. Inclua a checagem "sem erros de JS" nos de UI. Aceite `--shots DIR` se fizer sentido.
3. **Fila de modais:** avisos pós-rodada chegam em fila. Percorra a fila clicando o botão principal até achar o modal que interessa.
4. **Sorteio:** se o resultado depende de aleatoriedade, meça em vários mundos/jogos e use um corte com margem. Rode o harness 5 vezes seguidas: tem que dar 5/5.
5. Comentário no topo: o que o harness garante, o bug/item do roadmap que originou (com data) e `Uso: node harness_<assunto>.js`.
6. Rode `node tools/regressao.mjs --so <assunto>` e mostre o resultado.
