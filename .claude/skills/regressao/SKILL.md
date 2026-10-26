---
name: regressao
description: Roda a regressão dos harnesses do Catimba FC! e resume o resultado. Use antes de abrir PR, depois de mexer no motor/economia/save, ou quando o Dart pedir "roda os testes".
argument-hint: "[termos separados por vírgula | --completa]"
allowed-tools: Bash(node tools/regressao.mjs*) Bash(node tools/injetar.mjs*) Read
---

Rode a regressão do jogo.

- Sem argumento: `node tools/regressao.mjs` (rápida, ~5 min).
- Com termos (ex.: `mando,leilao`): `node tools/regressao.mjs --so $ARGUMENTS`.
- Com `--completa`: inclui a carreira longa (12 temporadas).

Se o runner reclamar que o HTML está diferente do `app.js`, rode `node tools/injetar.mjs` e repita.

Para cada harness que falhar:
1. Leia o log em `.regressao/<nome>.log`.
2. Decida se é **bug do jogo** (o comportamento mudou) ou **bug do teste** (fila de modais fora de ordem, sorteio sem margem, seletor que mudou). Rode de novo só esse (`--so <nome>`) 2–3 vezes pra ver se é instável.
3. Diga ao Dart, em poucas linhas: quantos verdes, quais falharam, a causa provável de cada um e o que você propõe. Não "conserte" o teste pra passar sem entender a causa.
