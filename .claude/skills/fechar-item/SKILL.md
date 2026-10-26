---
name: fechar-item
description: Marca um item do roadmap_singleplayer.md como feito, no padrão do documento.
argument-hint: "<número ou nome do item>"
disable-model-invocation: true
---

Feche o item **$ARGUMENTS** no `roadmap_singleplayer.md`.

1. Ache o item (pelo número em §6.1/§6.4 ou pelo nome). Leia o texto atual inteiro.
2. Troque o marcador (🅿️/🟡/⬜) por **✅ FEITO (dd/mm/aaaa)**, com a data de hoje.
3. Logo abaixo, acrescente 1 a 3 linhas de **"Como ficou"**: o que mudou pro jogador, decisões tomadas no caminho e números medidos (se houver). Mantenha o texto original do pedido; não apague histórico.
4. Cite o **gate** (`harness_X` N/N) e confirme rodando-o agora.
5. Se surgiu bug ou pendência no caminho, registre como sub-item ou no "Estado dos testes" da §0.
6. Se mudou o "Onde estamos na rota" (§3) ou a lista "O que ainda NÃO existe" (§0), atualize também.
7. Mostre ao Dart o diff do roadmap antes de commitar.
