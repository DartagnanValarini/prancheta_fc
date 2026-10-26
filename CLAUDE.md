# Catimba FC! — guia para o Claude Code

Jogo manager de futebol estilo Brasfoot/Elifoot, **single-player**, que roda 100% no navegador num **HTML único, sem build**. O nome antigo era Prancheta FC!, e o repositório continua `prancheta_fc`.
No ar em **https://catimbafc.com.br** (GitHub Pages, branch `main`, raiz).

Antes de qualquer trabalho de jogo, leia **`roadmap_singleplayer.md`**. Ele é a fonte da verdade da rota, das decisões e do estado dos testes. O `roadmap.md` é a visão antiga do modo online, guardada só como referência. Os `dev_docs` do Supabase estão congelados.

## ⚠️ Regras que não podem quebrar

1. **`app.js` é a fonte; `catimba_fc.html` é gerado.** O script do jogo dentro do HTML é uma cópia idêntica do `app.js`. Edite **só** o `app.js` e depois rode `node tools/injetar.mjs`. O hook do projeto já faz isso sozinho quando o Claude edita o `app.js`. Nunca edite o `<script>` do HTML na mão.
2. **Push na `main` publica pros testers na hora** (GitHub Pages). Trabalhe em branch e abra PR. O merge é o deploy. Nada vai pra `main` sem a regressão rápida verde.
3. **Save é dado do jogador.** Mudou o formato do snapshot de forma incompatível? Então suba `App.SCHEMA_VERSION`, mantenha o leitor das versões anteriores (saves antigos têm que continuar carregando) e cubra com harness. Use a skill `/bump-save`.
4. **Ordem dos times importa.** O save guarda os times pela **posição** (`composicao`, `saldos`, `divisoesTime`). Nunca ordene os times no exportador (`tools/exportar_dados.mjs`) nem no `SupabaseProvider`.
5. **Sem `alert/confirm/prompt`.** Tudo que pede resposta do jogador usa o modal padrão `App.modalFLK` / `cartaoDecisao` (§6.3 do roadmap). Avisos pós-rodada entram em **fila** (`{fila:true}`).
6. **Design system FLK!:** fontes Bungee + Space Mono, fundo `#111112`, neon lemon `#D2FF00`, estética arcade. A tela tem que funcionar a **390 px** de largura (celular).
7. Textos do jogo e comentários em **português do Brasil**.

## Comandos

```bash
node tools/injetar.mjs            # app.js → catimba_fc.html (só grava se mudou)
node tools/injetar.mjs --check    # confere se estão iguais (sai 1 se não)
node tools/regressao.mjs          # regressão rápida: todos os harnesses menos a carreira longa (~5 min)
node tools/regressao.mjs --so mando,leilao   # só os que contêm esses termos
node tools/regressao.mjs --completa          # inclui harness_carreira_longa (+3–5 min)
node harness_X.js --shots /tmp/shots         # harnesses de UI aceitam --shots pra tirar prints
node ui_test/abrir.js                        # prints do fluxo de entrada em ui_test/shots/
```

Os logs de cada harness ficam em `.regressao/<nome>.log` (ignorado pelo git).
Os harnesses de UI usam Playwright + Chromium (`npm i -g playwright && npx playwright install chromium`).

## Arquitetura (`app.js`, ~7.700 linhas, monolito de propósito)

Objetos globais, nesta ordem no arquivo:

- `MockProvider` / `SupabaseProvider`: carregam times e jogadores. O provider lê `dados/br.json` primeiro e, se der qualquer erro, cai no banco.
- `ATTR_ORDEM`, `ESQUEMAS`, `PESOS_POS`, `POS_*`, `ROLES_*`: atributos, formações e pesos de posição.
- `Motor`: partida minuto a minuto, força em campo (`EXP_FORCA`), mando (`MANDO_PCT`), gols e assistências.
- `Evolucao`, `Rating`: overall por posição, nota 0–10, evolução por potencial oculto.
- `Som`, `Erros`, `Menu`, `Tutorial`: áudio sintetizado, erros amigáveis, menu principal e onboarding.
- `FORMATO_DIVISOES`, `Competicao`, `Estadual`, `Objetivos`, `Escalacao`, `Forma`, `Coletiva`: Séries A/B/C/D (a D tem grupos + mata-mata), estadual, metas, escalação ótima, forma e coletiva.
- `App`: estado da carreira, UI (abas Formação · Rodada · Elenco · Mercado · Campeonatos · Finanças · Ranking · Dados), mercado, finanças, save (`SaveSchema`, assinatura HMAC), modais e boot (`App.boot()`).

Não modularize em ES6. Isso já foi decidido: o monolito injetado fica como está.

## Testes (harnesses)

- Ficam na raiz como `harness_<assunto>.js`. Cada um imprime `✅`/`❌` por verificação e sai com código ≠ 0 se algo falhar.
- **Harness de motor:** carrega o `app.js` num sandbox `vm` com `window`/`document` falsos (modelo: `harness_fase0.js`). É rápido e não usa navegador.
- **Harness de UI:** `require('./ui_test/abrir.js')` abre o HTML num Chromium headless com o Supabase falso (`ui_test/fake_supabase.js`, mundo sintético e offline). Modelo: `harness_eliminacao.js`.
- Avisos pós-rodada chegam em fila. O teste tem que **percorrer a fila** (desfalques, propostas, leilão…) até o modal que interessa, nunca assumir que ele vem primeiro.
- Harness que depende de sorteio precisa de margem e precisa ser estável. Se falhar 1 vez em 10, conserte o teste ou fixe a semente.
- Todo bug corrigido e toda feature nova ganham um gate num harness (novo ou existente). Use `/novo-harness`.

## Backend e infra

- **Supabase**, projeto "Prancheta FC" (`leysofvftpgocigqqgzi`): login (Auth, SMTP Brevo), `game_save`, `entitlement` (remove-ads) e `ranking`, além das Edge Functions `entitlement` e `ranking-submit`. O RLS está ligado em todas as tabelas, e o cliente só escreve o próprio `game_save`. A chave publicável no `app.js` é pública de propósito.
- O plano gratuito pausa o projeto depois de 7 dias sem uso. O workflow **Manter Supabase acordado** faz um ping a cada 3 dias.
- **Dados dos jogadores:** `dados/br.json` é gerado do banco pelo workflow **Exportar dados dos jogadores** (`tools/exportar_dados.mjs`). Não edite o JSON na mão.
- CI: o workflow **Regressão** roda `injetar --check` e a regressão rápida em todo PR e push.

## Fluxo de trabalho

1. Leia a seção do `roadmap_singleplayer.md` do item (ou a issue).
2. Branch → mudança no `app.js` → `node tools/regressao.mjs --so <assunto>` enquanto itera → regressão rápida completa antes do PR.
3. Mudou algo visível? Tire prints a 1280 px e a 390 px (`--shots`) e confira.
4. Ao fechar um item, atualize o roadmap com `/fechar-item`: marque ✅ com data, explique em 1–3 linhas como ficou e cite o gate.
5. Mudança de economia ou motor: rode `harness_economia` e `harness_calibracao` e compare com os números anotados no roadmap (§6.1 item 17).
