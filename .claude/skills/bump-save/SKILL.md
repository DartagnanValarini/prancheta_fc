---
name: bump-save
description: Muda o formato do save do Catimba FC! com segurança (sobe SCHEMA_VERSION, mantém retrocompatibilidade e cobre com harness). Use quando um campo novo/alterado precisar ir pro snapshot.
argument-hint: "<o que muda no save>"
---

Mudança no save: $ARGUMENTS

Saves dos testers são dado do jogador: **nenhum save existente pode deixar de carregar**.

1. **Precisa mesmo subir a versão?** Campo novo e opcional, com padrão seguro na leitura, não precisa. Mudança de formato ou significado de um campo existente precisa. Em dúvida, suba.
2. No `app.js`, dentro de `App`:
   - `SCHEMA_VERSION`: some 1 e acrescente `· vN: <o que mudou>` no comentário da linha.
   - Snapshot (onde monta `schemaVersion:this.SCHEMA_VERSION`): grave o campo novo.
   - Load: leia o campo novo quando `sv >= N` e mantenha o caminho antigo pra `sv < N`, com o valor derivado ou o padrão.
   - `validateSnapshot`: valide o campo novo como dado **não confiável** (faixa, tipo, tamanho), já que o save pode vir de arquivo importado.
   - Se o campo entra na assinatura HMAC (`_canonical`), confira que saves antigos ficam "não assinados" e não "inválidos".
3. **Harness:** acrescente um caso em `harness_save_enxuto.js` ou crie um com `/novo-harness`. Ele precisa cobrir: ida e volta do save novo (salva → carrega → igual); um save da versão anterior carregando com o padrão certo; tamanho do save não explodindo.
4. Rode `node tools/regressao.mjs --so save,itens_carreira,carreira` e depois a rápida inteira.
5. Registre no `roadmap_singleplayer.md`, na seção do item, que o save passou a vN e por quê.
