# 🎯 Prancheta FC! — Roadmap SINGLE-PLAYER (rota de lançamento)

> **📌 Fonte da verdade = este repositório GitHub** (`github.com/DartagnanValarini/prancheta_fc`, branch `main`). Decisão 09/2026: o roadmap e o contexto são mantidos AQUI, não mais no `dev_docs` do Supabase (aqueles ficam como arquivo histórico, congelados). Para retomar o projeto: ler este arquivo.

> **Decisão de rota:** foco 100% num **single-player LANÇÁVEL e BOM**. O modo online **sai da prioridade** (NÃO do futuro) — pode virar um produto separado, com motor próprio, *se* o single fizer sucesso. Este documento é a rota ativa; o `roadmap.md` antigo continua como referência viva da visão online, que ainda vamos usar mais pra frente.
>
> **Filosofia mantida:** profundidade sim, complexidade e tempo não. Partida rápida, "só mais uma rodada".
>
> **Cartas no single:** todas **iguais** (gestão por atributos, sem raridade/pacotes/coleção). Raridade era economia do *online* — fica reservada pra ele.
>
> **Decisões de negócio já cravadas (esta rota):**
> - **Rentabilização = anúncios + remover anúncios** (compra com dinheiro real). Só isso por enquanto; cosméticos (ex.: importar logo do clube) ficam pra depois, anotados mas fora do escopo atual.
> - **Anti-cheat = Via 1** (autoridade no servidor só nas operações sensíveis; jogo continua rodando no cliente). Suficiente **porque não vendemos vantagem-dentro-do-jogo** — vendemos *ausência de ads*, então trapaça no saldo do jogo não rouba receita.
> - **Ranking de treinadores = SINALIZAR, não barrar.** Cheater detectado continua na tabela, mas **marcado publicamente** ("⚠ suspeito"). O constrangimento social é a punição. Mais barato (não precisa recalcular pra derrubar) e mais divertido.

---

## 0. Onde estamos hoje (inventário real do código — auditado)

> **Varredura de 05/10/2026** (código + HTML + docs do repo e do Project, cruzados com este roadmap). `app.js` tem **~7.200 linhas** (monolito injetado no `prancheta_fc.html` — conferido: o script do HTML é **idêntico** ao `app.js`), `SCHEMA_VERSION` **13** (desde 05/10/2026), `GAME_VERSION` **0.9.0**.
> **Regressão completa verde:** 37 harnesses (2 novos em 05/10), nenhuma falha consistente (ver "Estado dos testes" no fim desta seção), **incluindo o gate de carreira longa** (12 temporadas, 13/13).

**Pronto e testado:**

- **Motor de partida** minuto-a-minuto calibrado (2,43 gols/jogo, mando percentual) + **assistências** (`Motor.assistente()`, save v10). Gates `harness_fase0`, `harness_calibracao`, `harness_assistencias`.
- **Camada `Rating`** unificada, **evolução** por potencial oculto, fator de posição (natural/treinada/improvisada 100/70/30%), seta de tendência do overall, **idade que avança + aposentadoria + garotos da base** (save v11).
- **Energia, lesões, suspensões**; escalação automática por **atribuição ótima** (`Escalacao`, também na IA).
- **Competição:** as **4 séries do Brasileiro (A/B/C/D)** data-driven (`FORMATO_DIVISOES`: A/B/C pontos corridos, D com 16 grupos de 6 → 2 por grupo → mata-mata de 32, desde 05/10), acesso/rebaixamento, **estadual de pré-temporada** opcional, premiação por fase na Série D. *Não existe copa nacional* (§6.1 item 16).
- **Finanças:** saldo, extrato, empréstimo, premiação por acesso, patrocínio, **bilheteria movida pelo humor da torcida**, contador de caixa.
- **Mercado:** filtros (cabe no caixa…), **negociação em 3 etapas**, propostas recebidas com modal de decisão, **leilão**, **renovação de contratos** na virada.
- **Gestão humana (Bloco A inteiro ✅):** Match Rating, estatísticas, objetivos por divisão, moral 0–100, forma recente (5 notas), **coletiva pós-jogo**, **reunião com a diretoria** + confiança explicada, **recado do presidente** a cada rodada, **balanço de fim de temporada**, **pedir demissão**.
- **Save:** `SaveSchema` **v12 enxuto** (~1,1 MB → 1,6 MB após 12 temporadas), checksum djb2 + **assinatura HMAC (C1)**, convidado comprimido no localStorage (~0,5 M caracteres) e logado no Supabase; 3 slots; backup/restore.
- **Bloco C ✅:** posse do remove-ads verificada no servidor, ranking com selo de suspeito.
- **Carreira nova zerada (05/10/2026):** 🐞 começar uma 2ª carreira na mesma sessão (Menu principal → slot vazio) herdava temporada, **títulos/acessos (inflando o score do ranking)**, histórico, leilões, propostas, extrato e diretoria da anterior. `zerarCarreira()` agora roda ao assumir o clube num slot novo (não na demissão, onde a carreira continua); opções do jogador ficam. Gate: `harness_itens_carreira`.
- **Bloco D ✅ inteiro:** D1 onboarding, D2 partida imersiva (painel *Seu jogo*), D3 estabilidade (save enxuto, gate de carreira longa, erros amigáveis), D4 áudio sintetizado.
- **UI:** página do clube (§6.2) com menu lateral / barra inferior no celular — **Formação · Rodada · Elenco · Mercado · Campeonatos · Finanças · Ranking · Dados** — todas as abas redesenhadas no padrão FLK, modal padrão (§6.3) sem nenhum `alert/confirm/prompt`, **⚙️ Configurações** (velocidade da partida 0,5×–3×, som, salvamento automático, anúncios / remover anúncios, coletiva e recado do presidente liga-desliga, rever tutorial, pedir demissão).

**O que ainda NÃO existe / está pela metade** (buracos entre "funciona" e "lançável e bom"):

- 🟡 **Bloco B só em stub:** `mostrarAnuncio()` mostra um modal placeholder ("o anúncio real entra com o empacotamento"); a compra remove-ads concede sem validar pagamento. Também **não feito**: detectar a superfície (web × app) dentro do `mostrarAnuncio()` (§5) e os outros bônus do B1 (energia, scout extra). *(O campo reservado de cosméticos no save foi feito em 05/10 — save v13.)*
- ✅ **Pré-teste (05/10/2026, noite):** balanceamento (§6.1 item 17 — achou e corrigiu o bug da **escalação da IA**), barra de pressão (item 20), **nota/energia/gols de quem sai de campo**, bônus ⚡ fisioterapia e 🔭 olheiro (B1).
- ✅ **Economia por série e mando decididos e feitos (06/10/2026):** preço pela força + potencial, salário pela força atual (e salvo — era bug), mando +30% no ataque e na defesa com a torcida mexendo no seu (§6.1 item 17). Carreira longa voltou a cobrir subir/cair de série.
- ⬜ **Hospedagem web pros testers:** arquivos prontos (`index.html`, manifest, ícones — instalável); falta **ligar o GitHub Pages** (§5 "Hospedagem").
- ⬜ **Pós-teste** (triado em 05/10/2026): Copa nacional com clubes das 4 séries (item 16 — torneio *paralelo* ao Brasileiro; as 4 séries em si já existem), ranking por período, fim de temporada ilustrado, banner de dica por aba, compartilhar, feedback por recompensa.
- ❌ **Ads e compra reais** (AdMob/AdSense, Play Billing) + **empacotamento** (Bloco E) — de propósito pra depois do teste com pessoas.

**Estado dos testes (06/10/2026):** 41 harnesses verdes + `harness_carreira_longa` **20/20** (12 temporadas, agora com o plano sobe/sobe/sobe/cai/sobe do meu time e o salário no teste de ida e volta do save). Novos: `harness_mando`; `harness_economia` ganhou a seção da economia por série. `harness_calibracao atual` mede a fórmula em vigor. **🐞 Achado pela regressão:** com os preços novos, o arredondamento fixo de R$ 100 mil travava os lances do leilão de jogador barato (+5% de R$ 400 mil voltava pro mesmo lance) e fazia a contraproposta cobrar até 25% a mais → `passoValor()`: R$ 10 mil abaixo de R$ 2 M, R$ 100 mil acima (leilão, contraproposta, propostas da IA). O `harness_leilao` instável era isso em parte: agora dá 85–87% estável.

**Estado dos testes (05/10/2026, noite):** 39 harnesses verdes + `harness_carreira_longa` 13/13 (~3,3 min). Novos: `harness_saida`, `harness_bonus`, `harness_pressao`, `harness_economia`. `harness_d2` passou a medir a posse só em jogos com ≥5% de diferença de força (com a IA completa, muitos jogos são parelhos). ~~⚠️ Cobertura perdida~~ (**resolvido em 06/10/2026**: a carreira longa segue um plano sobe/sobe/sobe/cai/sobe e confere série nova, liga ativa, tabela, jogos, prêmio de acesso, meta e patrocínio): com o balanceamento, a carreira longa (escalação automática, sem mercado) fica na Série D as 12 temporadas — antes subia até a A. Acessos/rebaixamentos da IA seguem exercitados todo ano, mas "o MEU time sobe de série" (troca de liga ativa, prêmio de acesso, meta nova) não é mais coberto por ela → adicionar um modo que force o acesso do meu time.

**Estado dos testes (05/10/2026, manhã):** os 34 harnesses da regressão rápida passaram (D1 31/31, layout 61/61, modais 30/30, estadual 31/31…) e `harness_carreira_longa` passou 13/13 em **~4,6 min** (não 40 min como estava anotado — o ambiente atual é mais rápido; continua fora da regressão rápida). ⚠️ **Teste instável:** `harness_leilao` [1] "o maior lance sobe na maioria dos leilões" falhou 1 vez em ~12 (59%, contra 85–89% normalmente; o corte é 60%). Não é bug de jogo confirmado, mas o teste depende do sorteio — fixar a semente ou investigar qual mundo derruba a taxa. ⚠️ `harness_estadual` [6] também falhava às vezes: o aviso de premiação podia vir **depois** de outro aviso na fila (proposta, desfalque…) — o teste agora percorre a fila (05/10). `harness_save_enxuto` aceita schema ≥ 12.

**05/10/2026 (tarde):** item 7 do §6.1 ✅ (`harness_impacto` 18/18), campo de cosméticos no save v13 + **bug da 2ª carreira** corrigido (`harness_itens_carreira` 13/13), arquivos de hospedagem/PWA prontos, triagem do §6.1 feita.

---

## 1. O que define "LANÇÁVEL e BOM" (critério de corte)

Pronto pra lançar = SIM às três perguntas:

1. **O jogador sabe o que fazer nos primeiros 3 minutos?** (onboarding + primeira partida sem fricção)
2. **Existe um loop que faz voltar amanhã?** (objetivo → jogo → recompensa → progresso visível)
3. **Dá pra jogar uma carreira inteira sem travar, quebrar save ou perder progresso?** (estabilidade)

"Bom" (acima de lançável): textura na partida, gestão humana (elenco com humor), razões de longo prazo (10+ temporadas).

---

## 2. AS ROTAS — 5 blocos até o lançamento

Ordem pensada pra que **cada bloco já deixe o jogo melhor**.

---

### 🟢 BLOCO A — O núcleo que engaja (o "bom" de verdade)
*O loop de recompensa. Roda 100% no cliente. Sem isto o jogo "funciona" mas não prende.*

**A1. Match Rating (nota 0–10 por jogo)** — a pedra angular.
- Nota por jogador derivada do que fez (gols, assistências, adequação de posição, resultado, minutos, `rendimento` real).
- Destrava em cascata: evolução por desempenho, artilharia, jogador da rodada, valorização/desvalorização de mercado, premiações por performance. **E é o insumo do score de ranking (Bloco C).**
- Barato (o motor já sabe gols e `rendimento`). Maior retorno/custo do roadmap.
- *Pronto quando:* toda partida gera nota por jogador; a nota alimenta ao menos evolução + artilharia.

**A2. Estatísticas e progressão visíveis.**
- Artilheiros e assistências **durante** a temporada, jogador da rodada, notas médias, gráfico de evolução do clube (saldo, valor do elenco, overall médio).
- *Pronto quando:* aba de estatísticas mostra artilharia/assistências ao vivo e a evolução do clube.

**A3. Objetivos e recompensas por divisão.**
- Objetivos por divisão (terminar no G-4, artilheiro do grupo, invicto em casa) que pagam dinheiro/reputação. Reaproveita `PREMIO_ACESSO`.
- Transforma "jogar rodada" em "perseguir meta". Motor do retorno diário — **e casa com os ads recompensados (Bloco B):** cumpriu objetivo → oferta de dobrar o prêmio vendo um ad.
- *Pronto quando:* lista de objetivos por divisão, com progresso e pagamento ao concluir.

**A4. Moral / forma / status de elenco.**
- Status por jogador (titular feliz, reserva insatisfeito, em ascensão, quer sair) conectando energia + confiança + potencial + minutos + Match Rating.
- Fecha o loop de **gestão humana**.
- *Pronto quando:* o elenco tem humor que reage a decisões e afeta rendimento/mercado.

---

### 🟡 BLOCO B — Rentabilização: anúncios + remover anúncios (DECIDIDO · 🟡 SÓ STUB — o real entra com o Bloco E)
*Como o jogo ganha dinheiro sem trair o jogador.*

> **Modelo cravado:** anúncios no jogo grátis **+** compra única (dinheiro real) que **remove os anúncios**. Nada de pay-to-win — e como o que se vende é *ausência de ads* (não vantagem no jogo), o modelo é limpo por construção.
>
> **Cosméticos ficam anotados pra depois** (ex.: importar um logo/escudo do clube). Fora do escopo atual, mas o save deve reservar um campo de "itens do usuário" pra não travar essa porta no futuro. *(✅ 05/10/2026: save **v13** tem `itensUsuario` = `{v:1, itens:[{id,tipo,origem,em}], equipados:{tipo:id}}`, tipos `escudo/tema/kit/placa`, saneado no load. Regra pra quando entrar: **posse de item pago mora no servidor** (como o remove-ads); o save guarda só o equipado na carreira e itens ganhos jogando.)*

**B1. Anúncios recompensados (opt-in) — o formato principal.**
- O jogador **escolhe** ver um ad pra ganhar bônus: **dobrar o prêmio** de um objetivo/rodada, acelerar recuperação de energia, um scout extra. Nunca forçado, **nunca no meio da partida nem entre rodadas** (mataria o "só mais uma rodada").
- Interstitial leve só em transição de temporada, se houver.
- *Pronto quando:* existe ao menos um ponto de "assistir ad → bônus" opt-in, e ele some pra quem comprou o remove-ads.
- **Estado (05/10/2026):** 🟡 três pontos de "assistir → bônus", todos opt-in e fora da partida: **dobrar prêmio** de objetivo, **⚡ Fisioterapia extra** (+10 de energia pro elenco, 1x por rodada, botão na Formação) e **🔭 Relatório do olheiro** (revela uma faixa de 5 pontos do **potencial oculto** de qualquer jogador — a faixa contém o real mas não é centrada nele; 3 por rodada; o revelado fica salvo no save v13 `bonus`). Quem tem `adFree` recebe direto. Falta: o `mostrarAnuncio()` ainda é **modal placeholder**, sem SDK e sem detectar web × app (§5). Gates: `harness_blocob`, `harness_bonus`.

**B2. Compra única "Remover anúncios".**
- Um pagamento (sem assinatura) desliga todos os ads. Modelo honesto, casa com público de manager clássico.
- **Flag de posse** guardada no servidor (não só no cliente) — senão o próprio remove-ads vira o primeiro alvo de cheat. É a compra que a Via 1 (Bloco C) precisa validar de fato.
- *Pronto quando:* comprar remove os ads e a posse persiste verificada pelo servidor.
- **Estado (05/10/2026):** 🟡 fluxo completo de ponta a ponta com **stub** (`comprarRemoverAnuncios` → Edge Function `entitlement` POST, que concede sem cobrar); a posse já é verificada no servidor no boot (C2). Falta a cobrança real (Play Billing / checkout web) — Bloco E.

**B3. Empacotamento (o que os ads/compra exigem).**
- Ads nativos + compra in-app exigem o jogo como **app**: PWA instalável no mínimo; **Capacitor/TWA** pra publicar na Play Store (onde ficam AdMob + Play Billing).
- Sem loja: sobra ad web (AdSense) + um checkout web simples. Recomendo mirar Play Store, caminho natural de rewarded ads + IAP pra este gênero.
- *Decisão de plataforma a confirmar antes do Bloco E (empacotar).*

---

### 🟠 BLOCO C — Anti-cheat Via 1 + Ranking que sinaliza (✅ CONCLUÍDO 09/2026)
*Autoridade estreita no servidor + ranking honesto que expõe, não expulsa.*

> **Via 1:** o jogo inteiro continua rodando no navegador (single-player, offline, diversão local). Só uma **fronteira estreita** passa a ser decidida/validada pelo servidor: (a) a **compra do remove-ads** e (b) o **score que sobe pro ranking**. O resto do save fica no cliente — e tudo bem, porque nada disso sozinho vira dinheiro real.
>
> **Verdade honesta:** nenhum anti-cheat client-side é à prova de atacante determinado (o segredo mora no arquivo que você entrega). Via 1 não tenta ser inquebrável — ela **protege o que dá receita** (o remove-ads, validado no servidor) e **mantém o ranking crível** (sinalizando o implausível). Isso basta pro modelo de negócio escolhido.

**C1. Assinar/ofuscar o save (barra o cheat trivial). — ✅ FEITO (09/2026)**
- `App.assinarSnapshot()`/`conferirAssinatura()`: **HMAC-SHA256 via Web Crypto** sobre o JSON **canônico** (chaves ordenadas, ignora `checksum`), com `SAVE_SECRET` embutido. O djb2 (`_checksum`) fica como detector de corrupção acidental; a assinatura é o anti-cheat.
- Envelope: no convidado a `sig` fica ao lado do `estado` no localStorage; no logado vai embutida como `estado._sig` (a coluna `estado` jsonb é o único container no `game_save`), separada antes de aplicar.
- `carregarSlot()` confere a assinatura e grava o veredito em **`App._saveAssinado`** — é o insumo que a submissão de ranking (C3) manda pro servidor.
- Testado: `smoke_c1` 5/5 (assinatura válida confere; adulterar `saldo` quebra; reordenar chaves não quebra; sig ausente = não-assinado). Regressão dos harnesses existentes intacta.
- **Falta ligar:** o veredito ainda não é *exibido* na UI (o save adulterado carrega, só fica marcado internamente). A visibilidade acontece via selo no ranking (C3).
- **🐞 Corrigido (29/09/2026):** o `_canonical` tratava **qualquer referência repetida** como ciclo (virava `null`). O snapshot reaproveita `fixtures`/`stats`/`grupos` no topo e dentro de `ligas`, então a assinatura só batia no objeto original — **todo save recarregado (convidado ou nuvem) era julgado não-assinado** e o treinador ia pro ranking carimbado como **suspeito**. Agora só ciclo de verdade vira `null`. Saves gravados antes da correção continuam não-assinados até serem salvos de novo. Gate: `harness_save_convidado`.

**C2. Posse de compra verificada no servidor. — ✅ FEITO (09/2026)**
- A flag "removeu ads" (B2) vive no servidor e é **checada lá**, não confiada ao cliente. É a única coisa comprável, então a única que *precisa* de autoridade real.
- Edge Function `entitlement` no ar (GET devolve posse; POST concede — hoje **stub**, sem SDK de loja: aceita e grava `source`+`purchase_ref` com idempotência, no lugar exato onde a validação Play/checkout web entra).
- Cliente: `App.hidratarEntitlement()` roda no `boot()` (depois do menu) e **sobrescreve `adFree` com a verdade do servidor** — forjar `adFree` no save local não sobrevive ao boot. `App.comprarRemoverAnuncios()` chama `registrarCompraRemoveAds()` (POST) em vez de simular local; convidado é barrado (posse fica na conta). `App.chamarFuncao()` centraliza as chamadas com o JWT da sessão.
- *Pronto quando:* forjar a flag no cliente não desliga os ads (o servidor manda a verdade). ✅
- *Falta pro modelo REAL (Bloco B/E):* a validação de compra de verdade (Play Billing / checkout web) no POST — hoje é stub que concede.

**C3. Ranking de treinadores que SINALIZA o suspeito. — ✅ FEITO (09/2026)**
- Score do treinador sobe pro servidor na virada de temporada (`novaTemporadaCompleta` → `submeterRanking`). Contadores de carreira (`App.carreira.titulos/acessos`) são incrementados na virada (campeão = mata-mata `campeao` ou 1º dos pontos corridos; acesso = subiu de divisão) e **persistidos no snapshot**. `scoreTreinador()`: títulos·1000 + acessos·400 + temporadas·100 + melhor-divisão·500.
- **Detector de plausibilidade server-side (Edge Function `ranking-submit`):** títulos/acessos ≤ temporadas; Série A exige ≥3 temporadas; teto de score por temporada; e **`assinado` (C1) confere?** (o cliente manda `assinado: App._saveAssinado`). Clampa faixas e carimba `suspeito`+`motivo`. Testado isolado: 8/8.
- **Aba Ranking** (nova, entre Finanças e Dados): `renderRanking()` lê a tabela pública (`App.lerRanking`), destaca o meu clube (lemon) e marca suspeitos com selo ⚠ + nome riscado + `motivo` no tooltip. Save implausível **aparece carimbado, não é removido**.
- *Pronto quando:* o ranking mostra todos, mas quem tem save implausível/não-assinado aparece visivelmente marcado como suspeito. ✅

**Infra desta rota (toda no Supabase — ZERO GCP novo): — ✅ NO AR (09/2026)**
- **Tabelas:** `entitlement` (posse do remove-ads por user; RLS: dono só LÊ, escrita só via service_role) + `ranking` (score + `suspeito` + `motivo_suspeita` + carimbo; leitura pública, escrita só via Edge Function). Migration `bloco_c_entitlement_ranking`.
- **Edge Functions:** `entitlement` (GET posse / POST concede) e `ranking-submit` (recebe score, roda plausibilidade, grava com selo). Ambas `verify_jwt=true`.
- **RLS + constraints:** cada user só LÊ a própria linha de posse; faixas válidas (`check`) no banco como segunda muralha; ninguém grava o próprio score direto.
- **Custo:** praticamente zero no plano grátis do Supabase. Sem VM, sem Cloud Run, sem IAM de GCP.

> **Bloco C fechado.** Falta só o que depende de outros blocos: a validação de compra REAL (Play Billing / checkout web) no POST do `entitlement` — hoje stub — que entra junto do empacotamento (Bloco B2 real + E). O ranking e o anti-cheat já estão de pé e testados. **Nota de teste manual:** as Edge Functions não puderam ser exercitadas por HTTP do meu ambiente (rede do sandbox bloqueia o host do Supabase); validei a lógica de plausibilidade isolada (8/8) e confirmei que ambas as funções estão ACTIVE com verify_jwt e o RLS correto. Vale um teste rápido no navegador: comprar remove-ads logado, recarregar (deve continuar sem ads), e terminar uma temporada pra aparecer no ranking.
>
> ~~**Próximo grande passo (rota):** quick wins do §6.1, assistências, D2–D4 e o empacotamento (E).~~ — **feito até o D4 em 29/09/2026.** Próximo passo atual: ver §3 "Onde estamos na rota".

---

### 🔵 BLOCO D — Polimento de lançamento (de "projeto" a "produto") — ✅ CONCLUÍDO (29/09/2026)
*Acabamento, não sistema novo. É o que faz o jogo parecer pronto.*

**D1. Onboarding / primeira sessão. — ✅ FEITO (28/09/2026)**
- Entrada limpa: escolher/gerar clube, escalar o primeiro time com dica, primeira partida guiada. **Matar as telas "Conecte o Supabase na aba Dados"** — o jogador nunca deveria ver isso. Maior alavanca de retenção.
- *Pronto quando:* um jogador novo chega à primeira partida sem instrução externa. ✅
- **Como ficou:**
  - **Entrada sem muro de login** (`Menu.telaEntrada`): "▶ Jogar agora" é a ação principal (entra como convidado); "Entrar" e "Criar conta" ficam como secundárias. Na **primeira vez** no aparelho (sem nenhum save), pula a tela de slots e vai direto pra escolha do clube (`Menu.jogarAgora`).
  - **Boas-vindas do presidente** (`Tutorial.boasVindas`) ao assumir o clube: divisão, **meta da diretoria** (objetivo principal do A3), caixa e confiança. Botões "Me mostra como funciona" / "Já sei jogar".
  - **Tour guiado** (coach-marks com spotlight, módulo `Tutorial`): 5 passos na Escalação (campo → elenco/coluna Posição → formação/⚡Escalar → diretoria/confiança → Jogar). Na 1ª partida, um aviso explica o "Pular ⏩". Depois do 1º resultado, 2 passos levam a Competições → 📊 Estatísticas → objetivos.
  - **Sempre pulável** ("Pular tutorial"). Estado por **aparelho** em `localStorage['prancheta_tutorial_v1']` (`null` → `jogo1` → `feito`) — é onboarding do jogador, não da carreira, então **não mexe no `SaveSchema`**. Segunda carreira não repete. **"Rever tutorial"** nas ⚙️ Configurações.
  - **Estados vazios**: as 6 telas "Conecte o Supabase" viraram `App.vazioHTML()` ("Nenhuma carreira aberta" + botão pro menu).
  - Token `--muted` (#8a8d84) definido no `:root` — era usado em vários lugares sem existir.
- **Gate:** `harness_d1_onboarding.js` (Playwright + Chromium, com `ui_test/fake_supabase.js` gerando ligas sintéticas offline): 31/31 — fluxo completo no desktop, saídas "Já sei jogar"/"Pular", 2ª carreira, "Rever tutorial", bolhas dentro da tela no celular (390×844) e nenhuma tela "Conecte o Supabase".
- **Pendências anotadas:** (1) ~~cor das bolinhas por nível absoluto~~ — resolvido no §6.2: no campo novo a borda do número indica **adequação à posição** (natural/treinada/improvisada). (2) ~~selo "SUPABASE" no cabeçalho~~ — removido com o cabeçalho novo; a aba Dados (ferramentas de dev) continua no menu.

**D2. Partida mais imersiva. — ✅ FEITO (29/09/2026)**
- Comentários dinâmicos por atributo ("golaço de fora" com `long_shots` alto; "de cabeça" com `heading`), feedback de fadiga (piscar vermelho < 40% energia), finalizações/escanteios/posse na tela.
- Sobe de "bom" pra "gostoso de assistir".
- **✅ FEITO (29/09/2026)**: painel **Seu jogo** no topo da Arena ao vivo: placar grande com escudos, barras de **posse / finalizações / no alvo / escanteios** (≈ 11 chutes, 5 no alvo e 4–5 escanteios por time; o mais forte tem mais posse em ~3 de 4 jogos; estilo ofensivo/defensivo mexe ±4 p.p.), **narração lance a lance** (gols, defesas, bolas na trave, cartões, trocas, escanteios, apito). O texto do gol depende de **quem fez**: cabeceador + cruzamento → de cabeça; bom de longe → de fora da área; driblador → driblou e bateu; velocista → arrancada. **Fadiga**: titular abaixo de 60% em amarelo, abaixo de 40% piscando em vermelho, com botão **Trocar**. É camada de TV: o motor de gols não muda. Gate: `harness_d2`.

**D3. Estabilidade e bordas. — ✅ FEITO (29/09/2026)**
- Carreira longa (10+ temporadas) sem quebra de save. Telas de vazio decentes, erro amigável. Novo harness "carreira longa" como gate de release, junto dos existentes.
- **✅ FEITO (29/09/2026)**:
  - **Save enxuto (v12)**: jogador do banco grava só o que **evoluiu** (`ev`: atributo por índice → valor decimal) + `an` (ancorado); teto, overall inicial e growth são **recalculados no load** a partir dos atributos do banco (mesma conta, determinística). Campos no valor padrão são omitidos. Garotos da base guardam os atributos de quando subiram (lista compacta) + evolução. **8,1 MB → 1,1 MB** no início; **1,6 MB após 12 temporadas**; convidado grava **0,5 M caracteres** comprimido. Saves ≤ v11 (formato completo) continuam carregando e são regravados enxutos. Gate: `harness_save_enxuto`.
  - **Gate de carreira longa**: `harness_carreira_longa` joga **12 temporadas** pelo fluxo real (rodadas → balanço → fim de carreira → renovações → virada) e confere a cada virada: ninguém em dois clubes, elencos ≥ 16, números finitos, séries com o mesmo tamanho, idade média estável (~27), save < 3 MB que volta **idêntico**, load < 3 s (~0,8 s); no fim salva como convidado, recarrega a página e confere tudo igual. Demorava ~40 min (em 05/10/2026 rodou em ~4,6 min, 13/13) — roda antes de release, fora da regressão rápida.
  - **Erros amigáveis** (`Erros`): erro inesperado → modal "😵 Opa, o jogo tropeçou" (carreira segura; Continuar / Salvar e ir ao menu / Copiar detalhes; no máximo 1 a cada 15 s); aba que falha ao desenhar vira cartão "Essa tela não abriu" com **Tentar de novo** e as outras seguem; falha de rede ao carregar explica em português com **Tentar de novo**. Últimos 20 erros ficam em `Erros.log`. Gate: `harness_erros`.
  - **Desempenho**: o Mercado (varre ~3 mil jogadores, ~300 ms) só desenha com a aba aberta — "pular" rodada ficou ~0,6 s mais rápido.

**D4. Áudio e identidade (alto impacto percebido, baixo custo). — ✅ FEITO (29/09/2026)**
- SFX mínimos (gol, apito), música de menu. Eleva muito a percepção de acabamento.
- **✅ FEITO (29/09/2026)**: módulo `Som`, tudo **sintetizado em WebAudio** (nenhum arquivo de áudio, zero peso no HTML): apito de início / intervalo (2) / fim (3), **gol** (torcida explodindo + arpejo), **gol sofrido** (lamento grave), **cartão** do meu time, **caixa** (venda, premiação por fase), **fanfarra** (título estadual, título da Série D, acesso), murmúrio de torcida em loop durante a partida e **música de menu** (loop Am–F–C–G, 96 bpm). Só o **meu jogo** faz som; "pular" não dispara rajada de gols. O contexto de áudio nasce no 1º toque (regra de autoplay). **Configurações → 🔊 Som**: efeitos e música em Mudo/Baixo/Médio/Alto, salvos **no aparelho** (não no save). Gate: `harness_som`.

---

### ⚪ BLOCO E — Empacotar e publicar
*O último passo: virar app instalável e subir na loja.*

- **PWA** (offline-first, já que roda local): ícone, splash, manifest, instalável.
- **Capacitor/TWA** pra Play Store se a decisão de B3 for loja (necessário pra AdMob + Play Billing nativos).
- Ficha da loja, política de privacidade (ads coletam dados → obrigatório), build assinado.
- *Pronto quando:* dá pra instalar, os ads aparecem, a compra remove-ads funciona de ponta a ponta.

---

## 3. Rota recomendada (ordem de ataque)

**Primeiro — provar que engaja (Bloco A):**
1. ✅ **Match Rating (A1)** — destrava tudo, dá dopamina imediata, e é o insumo do score de ranking.
2. ✅ **Estatísticas visíveis (A2)** — quase de graça depois do A1.
3. ✅ **Objetivos por divisão (A3)** — motor do retorno diário, e o gancho natural dos ads recompensados.
4. ✅ **Moral/forma (A4)** — fecha a gestão humana.

> **Checkpoint:** com A pronto, testar com 5–10 pessoas. Se **não** engajar aqui, nem ads nem ranking salvam — melhor descobrir agora, barato. *(Substituído em 09/2026: decidido fazer todo o roadmap, menos lançamento/empacotamento, **antes** do teste com pessoas, porque arrumar testers leva tempo.)*

**Segundo — o servidor mínimo + honestidade (Blocos B e C juntos, compartilham infra):**
5. ✅ **C1** (assinar o save) — barra o cheat trivial, custo baixo.
6. ✅ **Supabase:** tabelas `entitlement` + `ranking`, Edge Functions, RLS/constraints (a fronteira estreita da Via 1).
7. 🟡 **B2 + C2** (C2 ✅; B2 só stub) — (comprar remove-ads + posse verificada no servidor) — a única compra, a única coisa que precisa de autoridade real.
8. ✅ **C3** (ranking que sinaliza o suspeito) — plausibilidade server-side + selo público.
9. 🟡 **B1** (ads recompensados opt-in — gancho pronto, ad real não) — plugado nos objetivos do A3.

**Terceiro — virar produto (Blocos D e E):**
10. ✅ **Onboarding (D1)** — a maior alavanca de retenção.
11. ✅ **Imersão (D2)** + **estabilidade (D3)** + **áudio (D4)**.
12. ⬜ **Empacotar e publicar (E)** conforme a plataforma decidida.

**Onde estamos na rota (06/10/2026):** economia por série, mando e cobertura de acesso decididos e feitos. **Falta pro teste com pessoas:** só hospedar.

**Onde estamos na rota (05/10/2026, noite):** tudo de jogo que estava marcado pra antes do teste foi feito — item 7, cosméticos, triagem, balanceamento (17), barra de pressão (20), nota de quem sai substituído e bônus extras do B1. **Falta pro teste com pessoas:** hospedar (fora deste roadmap de jogo) e decidir se o redesenho da economia por série (§6.1 item 17) entra antes ou depois do teste.

---

## 4. O que fica FORA por agora (reservado, não descartado)

- 🅿️ **Modo online** — pirâmide de 10 divisões, PvP assíncrono, snapshot tático no servidor, RPCs de autoridade completa, transações atômicas de mercado, bots elásticos, catch-up. **Continua na visão** (`roadmap.md`); vira produto/decisão futura, possivelmente com motor separado, *se* o single fizer sucesso.
- 🅿️ **Cartas com raridade** (10 raridades, 9+2, pacotes, coleção) — economia do online. Reservada.
- 🅿️ **Cosméticos pagos** (importar logo do clube, temas, kits) — anotados; save reserva o campo, mas implementação fica pra depois do lançamento base.
- ❌ **Modularização ES6** — mantém o monolito injetado (o pipeline `diff app.js == HTML` funciona).
- ❌ **Motor estatístico profundo** (xG, posse real) — a fórmula arcade basta pro single.

---

## 5. Estratégia de distribuição e anúncios (DECIDIDO)

> **Um código-fonte (`prancheta_fc.html`), duas distribuições.** A rede de anúncios é escolhida automaticamente pela superfície onde o jogo roda. AdSense e AdMob **nunca** coexistem na mesma tela (proibido pelas políticas do Google).

**Versão WEB** — HTML hospedado (Netlify/Vercel/GitHub Pages), aberto no navegador.
- Rede: **Google AdSense** (banner/display). Exige aprovação do site + política de privacidade.
- Limitação: AdSense **não tem formato recompensado**. O "assista pra dobrar o prêmio" não existe igual aqui.
- Bom para: jogar no PC, divulgar por link, receita cedo sem depender de loja, funil web→app.

**Versão APP** — o mesmo HTML embrulhado com **Capacitor** (sem reescrever o jogo), publicado na Play Store.
- Rede: **Google AdMob** (recompensado opt-in + a compra "remover anúncios"). É o modelo completo do Bloco B.
- Custo: US$25 (conta de desenvolvedor Play, taxa única) + cadastro fiscal do AdMob (Brasil: tratado EUA-BR pra não reter imposto demais) + conta bancária. Pagamento do Google sai ao passar de US$100 acumulados.
- Bom para: o público natural (celular), receita real (recompensado + compra rendem muito mais que banner).

**Como o código decide:** `mostrarAnuncio()` já é o ponto único de integração. Ele detecta a superfície (navegador vs. dentro do app) e chama a rede certa: no app → AdMob recompensado; na web → AdSense (ou concede a recompensa de outra forma, já que banner não é recompensado). Troca cirúrgica num só lugar; o resto do jogo não muda.

**Decidido (09/2026):** na versão web, o bônus "dobrar prêmio" **continua existindo e é concedido sem anúncio** (opção b — web como vitrine generosa), já que o AdSense não tem formato recompensado. A alternativa descartada era deixar o bônus exclusivo do app, pra criar funil web→app.

**Hospedagem da versão web (05/10/2026 — arquivos prontos, falta ligar):**
- Repo público → **GitHub Pages** na branch `main`, pasta raiz. Link: `https://dartagnanvalarini.github.io/prancheta_fc/` (o `index.html` abre o `prancheta_fc.html`, mantendo `?query`/`#hash`).
- **PWA instalável:** `manifest.webmanifest` + `icons/` (192, 512, maskable, apple-touch), tags no `<head>`. Conferido no Chromium: zero erros de instalação/manifest. **Sem service worker de propósito** — o jogo precisa do Supabase pra carregar os clubes, e cache de HTML atrasaria correções pros testers.
- **Ligar (1 clique, a API de Pages não é acessível daqui):** GitHub → repo → Settings → Pages → *Deploy from a branch* → `main` / `/ (root)` → Save.
- **Supabase Auth:** quem criar conta recebe link de confirmação; o cadastro agora pede `emailRedirectTo` = endereço onde o jogo está. Adicionar o link do Pages em **Authentication → URL Configuration** (Site URL e/ou Redirect URLs), senão o link de confirmação cai no endereço padrão. Jogar como convidado não depende disso.
- `ui_test/abrir.js` agora serve os arquivos do repo (manifest, ícones) em vez de devolver o HTML pra tudo.

**Auditoria de segurança do banco (05/10/2026, noite):** RLS ligado nas 6 tabelas; nenhuma função exposta. Cliente só **lê** `team`/`player`/`ranking` e escreve apenas o próprio `game_save` (políticas de dono). Removidas as permissões de escrita que sobravam pro `anon`/`authenticated` (migration `hardening_revoke_escrita_cliente` — o RLS já barrava; é defesa em profundidade). Pendências: (1) **Auth → proteção contra senha vazada** desligada (aviso do Supabase); (2) a chave pública permite baixar a base de jogadores — inevitável pra jogo que roda no aparelho; (3) repo público expõe o código e o `SAVE_SECRET` → trocar o segredo e decidir se o repo fica privado; (4) projeto pausa sozinho no plano grátis após dias sem uso.

**O que vale pras DUAS versões:** o servidor (Bloco C) — a compra de "remover anúncios" precisa ser validada no servidor tanto na web quanto no app, senão é o primeiro alvo de cheat. Por isso o Bloco C vem antes do empacotamento: protege a compra e destrava o ranking, independente da superfície.

---

## 6. Melhorias e ajustes de UX (backlog — do teste de jogo)

Itens levantados testando o jogo. Não bloqueiam o loop principal, mas entram no polimento (Bloco D) ou como quick wins.

- **⚙️ Botão de Configurações — ✅ FEITO** (conferido no código em 05/10/2026): ⚙️ no menu lateral, com velocidade da partida (0,5×–3×), som, salvamento automático, anúncios / remover anúncios, coletiva e recado liga-desliga, rever tutorial e pedir demissão. *Pedido original:* — uma tela/aba de ajustes do jogador. Candidatos: velocidade da simulação (relógio da partida), frequência do save (auto-save a cada X rodadas / manual), talvez volume de áudio (quando entrar D4), e futuramente o toggle de "remover anúncios" (Bloco B). É o lar natural de várias preferências que hoje não têm onde morar. Baixo/médio esforço; alto valor percebido.
- **📊 Estabilidade da contagem de jogos/pontos na tabela** — investigar a fundo o relato de "2 jogos / 6 pontos após a rodada 1". O motor conta certo em teste isolado (1 jogo por rodada); suspeita principal é save criado com código antigo carregando valor já dobrado, ou caminho de UII específico. Já removida a soma condicional `+1` na exibição e adicionada guarda de idempotência em `encerrarRodada`. **Confirmar com jogo novo** e, se persistir, capturar o caminho exato. — **✅ Fechado (05/10/2026):** `harness_contagem` (2 rodadas = 2 jogos, pontos não dobram) passa, e a carreira longa (12 temporadas pelo fluxo real) confere a tabela a cada virada. Reabrir só se algum tester reproduzir.
- **🎯 Ficha/consistência do campo** — as posições das bolinhas no campo (vazio vs. escalado) já foram fixadas com altura de slot constante; validar em todas as formações no reteste. — **✅ Fechado:** `harness_layout` confere as 9 formações sem camisa fora do campo ou sobreposta, no desktop e a 390 px.
- **🖥️ Responsividade do sticky** — a barra de abas fixa foi calibrada pra colar abaixo do header; validar em telas estreitas (mobile) onde o header/abas podem quebrar em mais linhas e exigir ajuste dos offsets. *(A casca do §6.2 trocou as abas do topo por menu lateral / barra inferior — item provavelmente resolvido; confirmar no reteste.)* — **✅ Fechado:** a barra de abas fixa não existe mais; `harness_layout`/`harness_visual` conferem todas as abas sem rolagem lateral a 390 px.
- **🚪 Botão "Pedir demissão" — ✅ FEITO (29/09/2026)**: botão no card *Segurança no cargo* e em ⚙️ Configurações → modal padrão (clube, confiança, carreira) → "Pedir demissão" cai no fluxo de livre no mercado (propostas de clubes das séries de baixo, mesmo save); carreira (títulos/acessos) continua; bloqueado com partida em andamento. Decidido: **sem custo extra**. Gate: `harness_presidente`. *Pedido original:* — o treinador pode sair do clube por vontade própria. Confirmação no **modal padrão (§6.3)** mostrando clube, temporada, confiança e o que acontece depois; ao confirmar, cai no fluxo que já existe de "livre no mercado" (`procurarNovoClube`, mesmo slot). Onde colocar o botão: no card **Segurança no cargo** e/ou em ⚙️ Configurações. *A decidir:* se pedir demissão tem algum custo (ex.: pesa no ranking de treinadores ou só pode a partir de certa rodada).
- **🤵 Recado do presidente a cada rodada — ✅ FEITO (29/09/2026)**: último modal da fila pós-rodada (depois de desfalques, coletiva, reunião, propostas e leilões), no cartão das boas-vindas: próximo adversário, fala do presidente, meta da diretoria com a posição na tabela, caixa e confiança; "Ir para a formação ▸". Toda rodada por padrão, desliga em ⚙️ Configurações; não aparece no 1º jogo do tutorial nem com a temporada encerrada. Gate: `harness_presidente`. *Pedido original:* — um modal **no estilo das boas-vindas** (o mesmo cartão do §6.3) a cada rodada, que leva direto pra tela de **Formação**, com: **frase do presidente** (sobre o próximo jogo — já existe em `falaPresidenteAtual()`), **meta da diretoria** (objetivo principal do A3), **caixa** e **confiança**. Entra na **fila** de avisos pós-rodada (depois de desfalques e propostas), pra nunca empilhar dois modais. *A decidir:* aparecer antes de toda rodada ou só quando algo mudou; e se vale um "não mostrar de novo" nas Configurações pra quem joga rápido.

---

## 6.1 Mecânicas inspiradas nos concorrentes (backlog — 09/2026)

> Origem: temporadas jogadas no RetroFoot e no Browserfoot — ver `docs/concorrentes/analise_retrofoot_browserfoot.md` (prints em `docs/concorrentes/prints/`).
> Levantado contra o código atual: **já temos** confiança da diretoria ("HP do treinador") + fluxo de demissão, metas da diretoria por divisão, `fatorMoral` no rendimento, empréstimo, bilheteria, propostas/contrapropostas e substituições no intervalo — os itens abaixo **complementam** isso, não substituem.
> **Ordem sugerida:** 1 → 2 → 3 → 4 → 5 (baratos, reaproveitam o que existe), depois 6 e 8 (estruturais no mercado). O resto conforme couber.

### Encaixam no Bloco A (loop que engaja)
1. **Coletiva pós-jogo** *(A4)* — **✅ FEITO (29/09/2026)**: módulo `Coletiva` (3 perguntas — jogo / elenco [craque ou insatisfeito] / clube [tabela e meta]), repórter com veículo, respostas por perfil com **selos de efeito** (moral do elenco, moral do jogador citado, cargo) no modal padrão; nenhuma resposta domina as outras (troca real moral × cargo, cargo ≤ ±2 por resposta); "Pular a coletiva"; liga/desliga em ⚙️ Configurações (vai pro save). Entra na fila pós-rodada depois dos desfalques. Gate: `harness_coletiva`. *Ideia original:* — 3 perguntas de um repórter (o jogo / o elenco / o clube), 2–3 respostas por perfil (Protetor, Direto, Técnico…). Cada resposta mexe em **moral** e **confiança da diretoria**, com o efeito visível antes de escolher ("moral +4 · diretoria +2"). Pulável. Esforço baixo (textos + 2 variáveis que já existem).
2. **Reunião com a diretoria antes da demissão** *(A3/A4)* — **✅ FEITO (29/09/2026)**: quando a confiança cai até a **zona de alerta (corte + 15)**, o presidente chama uma reunião **obrigatória** antes da demissão, uma vez por crise. Pergunta 1 ("por que piorou?"): a diretoria **confere a desculpa contra os fatos** — força do elenco na chave/série, nota média recente do time — e mostra o fato antes de você responder (+4/+3 se for verdade, −3 se não; assumir a culpa +1). Pergunta 2 (o plano): **pedir 3 rodadas** (+6 agora, mas se no fim do prazo estiver abaixo do alerta é demissão), **pedir reforços** (verba de R$ 1–8 M por série, cargo −2) ou manter. **Fórmula visível:** toda mudança de confiança vai pro histórico com o motivo (`mudarConfianca`), e o card Segurança no cargo tem "ⓘ Entenda" com a tabela resultado × expectativa e as últimas mudanças. Histórico, ultimato e crise vão pro save. Gate: `harness_reuniao`. *Ideia original:* — quando a confiança cruza um limite, evento com 2 perguntas ("por que piorou?" / "qual o plano?"); a escolha dá fôlego ou piora. Mostrar a **fórmula da confiança** na tela (ex.: X% posição + Y% moral) pra o jogador saber o que corrigir. Hoje a demissão chega sem aviso.
3. **Contador na compra e na renovação** *(Mercado/Finanças)* — **✅ FEITO (29/09/2026)**: na compra (item 6) e na renovação (item 8, com "quantos meses o caixa dura"). — card com 3 números: **caixa depois**, **variação por rodada** e **projeção de fim de temporada**, + uma frase ("Cabe hoje, não cabe amanhã"). Não proíbe, só mostra a consequência. Só UI sobre números que já calculamos.
4. **Diagnóstico de fim de temporada** *(onboarding disfarçado)* — **✅ FEITO (29/09/2026)**: "Nova temporada" (na Rodada ou no pódio) abre o **📋 Balanço da temporada** antes de virar: campanha (pts, V/E/D, gols, posição), **3 lições tiradas dos números** (defesa/ataque vs média da tabela, energia do time titular, vestiário, idade dos titulares, caixa, expulsões, contratos vencendo, objetivos, destaque — ordenadas por gravidade; lição de gols só com ≥ 3 jogos) e **o que muda agora** (divisão seguinte, meta da diretoria com efeito no cargo e prêmio, folha, contratos vencendo). Gate: `harness_diagnostico` (temporada inteira + cenários forçados). *Ideia original:* — tela de fechamento com o resultado + 3 dicas tiradas da temporada ("a defesa levou 115 gols — reforce zaga e gol", "elenco terminou esgotado", "caiu cedo na copa") + bloco "O que muda agora" (divisão, folha, cargo).
5. **Forma recente: últimas 5 notas — jogador E time** *(A1/A2)* — **✅ FEITO (28/09/2026)**
   - *Como ficou:* módulo `Forma` (FIFO de 5). Jogador: `p._notas5`; time: `t._notas5` (média de quem recebeu nota na partida) e `t._forma5` (V/E/D). Save **v9** (`jogadoresById[pid].notas5` + `formaTimes`); save v8 carrega com listas vazias e dado adulterado é saneado (clamp 0–10, máx. 5). Aparece na coluna **Nota** do elenco (média das 5, com as notas no tooltip), nas camisas do campo e na **Forma** do cabeçalho. `harness_forma` 16/16.
   - *Limite conhecido:* quem é substituído (sai do campo) não recebe nota — herdado do Match Rating (A1), então também não entra na média do time.
   - **Jogador:** guardar as **5 últimas notas** (Match Rating) de cada jogador; exibir como forma recente (ex.: `7,0 · 5,6 · 6,4 · 8,1 · 6,9`) na ficha e na escalação.
   - **Time:** guardar as **5 últimas notas do time**, onde **nota do time na partida = média das notas dos jogadores que atuaram naquela partida** (titulares + quem entrou; quem ficou no banco não conta).
   - Janela deslizante (FIFO de 5), entra no save (`SaveSchema` → bump de versão + migração com lista vazia).
   - Destrava: indicador de fase do time no hub, argumento pra coletiva/diretoria, valorização de mercado por fase.

### Mercado
> **🐞 Corrigido (29/09/2026) — negociação de compra incoerente:** o clube só aceitava com **5% acima** do preço pedido; entre o preço e +5% a contraproposta (média entre oferta e preço) saía **abaixo** do que o jogador ofereceu (caso real: ofereceu R$ 9,0 M, ouviu "só sai por R$ 8,8 M"). Regra nova (`avaliarOfertaCompra`): oferta ≥ preço **fecha**; abaixo de 60% é recusada; no meio, contraproposta **sempre acima da oferta e no máximo o preço**, arredondada pra cima em R$ 100 mil. O clube **lembra a contraproposta na rodada**: oferecer esse valor fecha, e subir a oferta nunca faz ele pedir mais. Gate: `harness_mercado.js` (varre ~36 mil ofertas: oferecer mais nunca piora o resultado).
6. **Negociação em 3 etapas** — **✅ FEITO (29/09/2026)**: (1) **taxa** com o clube, com o preço pedido e o **piso explícito** (60% — abaixo recusa direto); contraproposta aparece na própria etapa e oferecer esse valor fecha; (2) **salário** com o jogador — ele diz um mínimo (salário atual + 10%), mas o real pode ser até 12% maior e o empresário contrapropõe; (3) **fechar** com resumo, **prazo do contrato (1–4 anos)** e **risco de aposentadoria** pra veteranos (33+: 10% → 85%). Em todas as etapas o **🧮 contador** projeta *caixa depois*, *por rodada* (patrocínio/4 + bilheteria/2 − folha/4 − parcela) e *fim da temporada*, com uma frase ("Cabe hoje, não cabe amanhã…"), atualizando ao digitar. O jogador chega com o salário e o prazo acertados. Gate: `harness_negociacao`. *Ideia original:* — (1) **taxa** com o clube, com piso ("abaixo de X eles recusam direto"); (2) **salário** com o jogador, que pode contrapropor; (3) **fechar**, com aviso de risco quando houver (ex.: chance de aposentadoria do veterano). Cada etapa com o card do contador (item 3).
7. **Impacto antes de aceitar proposta recebida** — **✅ FEITO (05/10/2026)**: os modais de **proposta recebida** e de **leilão** ganharam o bloco **Impacto no time** (`impactoVenda`/`impactoVendaHTML`): **força do setor** dele e **força do time** antes → depois (melhor escalação possível na formação atual, com e sem o jogador — a mesma conta da escalação automática, então vender nunca "melhora" o time), **folha depois** e **provável substituto** (quem entra no onze ideal, com "adaptado"/"improvisado" se for fora da posição; "não muda o onze" pra reserva; "sobra vaga" com elenco curto). Só leitura: não mexe na escalação. Gate: `harness_impacto` (inclui varredura de 800 vendas em 40 clubes e o modal a 390 px). *Antes:* oferta × valor, caixa depois e aviso de titular. — caixa depois, folha depois, quanto cai a força do setor, provável substituto no elenco.
8. **Renovação de contrato com pedido do jogador** — **✅ FEITO (29/09/2026)**: contratos agora **correm** (−12 meses a cada virada; a IA renova os dela com +24). Depois do balanço, quem está no **último ano** entra na **📝 Janela de renovações** (obrigatória): cada um pede salário e prazo conforme a temporada (nota ≥ 7 → +35%, ≥ 6,5 → +20%, ≥ 6 → +10%), idade (32+ aceita −10%, prazo 1 ano) e moral (insatisfeito +15% e *exigente*). Renovar pelo pedido, **contrapropor** (contente topa até −10%, exigente só −3%) ou **dispensar** (sai de graça pro clube da série com menor elenco). O **contador** mostra folha nova, saldo por mês e **quantos meses o caixa dura**. "Renovar todos pelo pedido" pra quem joga rápido. Gate: `harness_renovacao`. *Ideia original:* — no fim da temporada, cada contrato vencendo pede salário + prazo; aceitar / contrapropor / dispensar, com a projeção "o caixa dura ~X meses". (Hoje temos contrato, não temos renovação.)
9. **Aposentadoria de veteranos** — **✅ FEITO (29/09/2026)**: a **idade agora avança** (+1 por temporada, salva). Na virada, cada jogador de 33+ pode parar (10% aos 33, 25% aos 34, 45% aos 35, 65% aos 36, 85% aos 37+ — o mesmo risco mostrado na etapa 3 da compra). Os meus que vão parar são anunciados no **👴 Fim de carreira** antes da janela de renovações (e não entram nela), com os nomes fortes da liga que também param. Cada aposentado abre vaga pra um **🌱 garoto da base** do clube: 18–19 anos, mesmo setor, modelado num jogador da mesma série (−18% + ruído) com potencial acima — nenhum elenco encolhe. Garotos gerados vão **por inteiro** pro save (**v11**: `gerados` + `idade`), com pid negativo. Gate: `harness_aposentadoria`. *Ideia original:* — chance de parar por idade; renova os elencos da máquina e alimenta o risco do item 6.
10. **Filtro "cabe no caixa" / "até metade do caixa"** no mercado. — **✅ FEITO (29/09/2026)**: filtros de caixa (padrão "cabe no caixa"), setor, série, idade (até 23 / 24–29 / 30+) e ordenação (força, mais barato, custo-benefício, mais jovem); a coluna mostra o **preço que o clube pede** (`precoPedido` = valor × apego, o mesmo da negociação) colorido contra o seu caixa; até 60 resultados com contagem; mensagem quando não há resultado. Gate: `harness_mercado` [4].
11. **Leilão** quando vários clubes querem o mesmo jogador — **✅ FEITO (29/09/2026)**: quando 2+ clubes se interessam pelo mesmo jogador seu à venda (40% das vezes), abre um **🔨 leilão de 3 rodadas** com 2–4 clubes; a cada rodada eles cobrem (+5–12%, até 140% do valor e dentro do caixa deles) ou desistem. Aviso no fim da rodada (fila), painel **🔨 Leilões** no Mercado, modal com lances, caixa depois e aviso de titular: **vender pelo maior lance** a qualquer momento, **esperar** ou **recusar todos**; no fim do prazo, "Leilão encerrado — decida". Leilões **e propostas pendentes** agora vão pro save (antes a proposta sumia ao recarregar). Gate: `harness_leilao`.

### Calendário e ambiente
12. **Estadual como pré-temporada** — **✅ FEITO (29/09/2026)**: no início de cada carreira e de cada temporada abre um **🏆 estadual opcional** (banner na Formação): 8 clubes do seu estado (os 4 mais fortes + os de força parecida com a sua; se faltar, completa com a região e depois com o resto), mata-mata em **jogo único** (quartas → semi → final, empate nos pênaltis), sem gastar energia nem contar pra artilharia. Prêmios pela sua série (base A 1 M / B 500 mil / C 300 mil / D 200 mil): participação 1×, semifinal 1×, final 2×, título 4×. Título: torcida +8, confiança +4 e conta na carreira (`carreira.estaduais`). **Pular** a qualquer momento; se você começar o Brasileiro com ele em andamento, o resto é simulado. Nome pelo estado ("Campeonato Paranaense"…); cidade sem estado mapeado vira "Torneio de Pré-Temporada". Vai pro save (saneado). Gate: `harness_estadual`.
13. **Humor da torcida → bilheteria** — **✅ FEITO (29/09/2026)**: humor 0–100 (neutro 60): vitória +4, derrota −5, goleada ±2/3 a mais, **clássico (mesma cidade) vale o dobro**, volta 3%/rodada pro neutro. A ocupação do estádio passa a depender principalmente da torcida (±25 p.p.) e um pouco da confiança da diretoria. 5 estados (Eufórica 🔥 … Revoltada 🤬) no cabeçalho do clube; salvo; clube novo começa neutro. Gate: `harness_torcida`. *Ideia original:* — vitória +, derrota −, clássico perdido pesa mais; torcida eufórica aumenta e revoltada reduz a bilheteria.
14. **Botão "Selecionar descansados"** na escalação (escala priorizando energia). — **✅ FEITO (28/09/2026)** no §6.2: botão **🔋 Descansados** na Formação (e, desde 29/09, com a escalação por atribuição ótima).
15. **Premiação por fase** — **✅ FEITO (29/09/2026)** no mata-mata da **Série D** (não temos copa nacional ainda): classificar pra 2ª fase R$ 150 mil; passar da 2ª fase 200 mil, 3ª fase 300 mil, oitavas 400 mil, quartas 600 mil, semi 1 M, título 2 M. Aviso **💰 Premiação por fase** na fila do fim da rodada. Também vale no estadual (item 12). Gate: `harness_estadual` [6].
16. **Copa nacional com clubes das 4 séries** — 🅿️ **PÓS-TESTE** (triado em 05/10/2026). *Não confundir com as 4 séries do Brasileiro, que já existem:* é um mata-mata paralelo ao Brasileiro (datas no meio de semana, energia, premiação por fase igual ao item 15). Projeto à parte: mexe no calendário e na fadiga.

### Triadas em 05/10/2026 (vindas da análise de concorrentes, nunca tinham entrado aqui)
> **Decisão do Dart (05/10/2026):** **antes do teste com pessoas** entram o **17 (balanceamento econômico)** e o **20 (barra de pressão)**. **Depois do teste:** 16 (copa nacional), 18, 19, 21, 22 e 23. O 24 continua reservado junto dos escudos gerados.
> Estavam na tabela "Copiar/adaptar" e no §4 de `docs/concorrentes/analise_retrofoot_browserfoot.md`, mas não neste roadmap. Conferido no código: **nenhuma existe ainda**.
17. **✅ FEITO (05/10/2026) — Balanceamento** *(pedido original: harness de 10 temporadas com IA "gananciosa" medindo caixa e força; teto de preço coerente; craque recusando clube pequeno)*.
    - **Como foi medido:** 3 estratégias jogando até 10 temporadas pelo fluxo real — *passivo* (só escalação automática), *ganancioso* (pega empréstimo, compra o melhor que cabe, vende o excedente) e *arbitragem* (compra veterano barato e revende) — acompanhando caixa, força relativa na série e caixa da IA por série. Mais: temporadas inteiras com o clube **mais fraco** da Série A, correlação força × pontos e chance de acesso por faixa de força na Série D (150 temporadas simuladas).
    - **🐞 Bug grave achado — a IA não re-escalava:** a escalação dos times da IA era montada uma vez (`cfgInicial`) e **nunca refeita**; cada lesão/suspensão virava buraco (o time ia a campo com 9, 7, 4 jogadores e posições desalinhadas). Resultado: o clube **mais fraco da Série A, com escalação automática, era campeão com 90–104 pontos**, e um time passivo da Série D subia sozinho até a A. Correção: `escalarIA()` antes de cada jogo (refaz só se o onze está incompleto, com indisponível ou com alguém < 60% de energia — a IA também poupa). Força em campo da IA: 30–330 → ~700–780.
    - **Força pesa no placar (`Motor.EXP_FORCA = 3`):** a chance de gol usava a força linear — um time 16% mais fraco ficava com 46% das chances. Agora força³ (mando e estilo continuam por fora, mesmo peso): o 16% mais fraco cria ~60% das chances do forte; o time 12–20% mais fraco vence ~23% e empata ~25% dos jogos; **gols por jogo iguais (2,44)**. Vale também pras séries simuladas (`simularConfrontoReal`). `harness_calibracao forca` mostra k = 1…4.
    - **Interesse do jogador (craque recusa clube pequeno):** comprando de série MAIOR, o jogador compara a força dele com o nível da sua série (força média dos clubes): até +4 vem normal; +4 a +14 vem pedindo salário maior (+10% por ponto); acima de +14 **recusa** ("Não troco a Série A pela Série D"). Mercado marca "🚫 Recusa"; "Negociar ⚠️" quando pede mais. Comprar de série igual ou menor: sem restrição.
    - **Recém-contratado não é revendido por 8 rodadas** (ou até a virada): fechou a arbitragem compra-a-95% / revende-em-leilão-a-140% (dava +16 a +20 M por temporada a partir da 3ª). Trava salva no save (`chegou`).
    - **Série D: passam 2 por grupo (32), não 4 (64).** Com 4 mata-matas até o acesso e forças parelhas, subir era sorteio (o mais forte da D não subiu em 5 de 5; subiram o 95º, 87º e 82º mais fortes). Agora a fase de grupos vale e o acesso pede 3 mata-matas. Cruzamento generalizado (k-ésimo × (avançam−1−k)-ésimo do grupo espelho); 1ª fase do mata-mata segue chamada "Segunda Fase".
    - **Patrocínio da Série D 0,5 → 0,8 M/mês** (mantido com a economia nova de 06/10: a temporada da D tem só 5 "meses").
    - **Resultado (depois de tudo):** *passivo* fica na Série D (~27º de 96, caixa 4 → 10 M em 6 temporadas); *ganancioso* sobe **D → C → B → A em 4 temporadas** (uma por ano, com muita compra e venda); *arbitragem* dá prejuízo; o mais fraco da Série A termina no Z-4. Gate: `harness_economia` (IA sempre com 11, força pesa, interesse, trava de revenda, informativo da Série A).
    - **✅ DECIDIDO E FEITO (06/10/2026) — economia por série.** O problema medido: salário igual em todas as séries (~35 mil, do banco) e preço que não cabia na D (o mediano da D custava mais que o caixa de um clube da D). **Decisão do Dart: preço pela força + potencial; salário pela força atual.**
      - **Preço:** curva `VALOR_K·(força/100)^VALOR_N` com N 5,2 → **8,5** (52 → ~2 M · 70 → ~28 M · 80 → ~88 M · 90 → ~240 M). **Potencial:** em vez de somar a diferença em dinheiro (com a curva íngreme um garoto da D de potencial 65 valeria ~10 M), o preço usa uma **força efetiva = força + (potencial − força) × confiança da idade × 0,5**. Jovens promissores valem **2,3× a 5,9×** (mediana 3,3×) um jogador igual sem potencial.
      - **Salário:** `salarioMercado(p) = 220 mil × (força/70)^7,3` (52 → ~25 mil · 58 → ~55 · 64 → ~115 · 70 → 220 · 80 → ~580). Aplicado a todos ao montar a temporada; garoto da base ganha 70% do mercado; a IA renova pelo mercado; pedido de compra e de renovação partem de `max(salário atual, mercado)` (renovação: 90% do mercado × nota).
      - **🐞 Bug corrigido junto: o salário não ia pro save** — contratação e renovação voltavam ao salário do banco ao recarregar. Save **v14** guarda o salário; save ≤ v13 carrega com o salário da força.
      - **Resultado na base atual:**

        | Série | Preço mediano | % da receita anual | Salário mediano | Folha / receita |
        |---|---|---|---|---|
        | A | 23,3 M | 27% | 220 mil | 48% |
        | B | 10,2 M | 28% | 114 mil | 59% |
        | C | 4,7 M | 30% | 56 mil | 65% |
        | D | 1,9 M | 40% | 25 mil | 55% |

        Clube passivo da D junta 2–5 M por temporada; quem reforça passa a sentir a folha (o ganancioso foi de 1,4 a 4,9 M/mês).
      - **Acesso na Série D (medido, força EM CAMPO acima da mediana da D, 12 temporadas cada):** +10% → sobe 17% das vezes · +20% → 75% · +30% → 75%. Quem domina de verdade sobe; quem é só um pouco melhor depende de sorte (grupo de 10 jogos + 3 mata-matas). Atenção: força "no papel" (11 melhores) não é força em campo — o comprador ganancioso tinha +16% no papel mas jogadores fora de posição e sem rodízio, e não subiu em 6 temporadas. Se os testers acharem a D lenta, os botões são: mais acessos da D (precisa casar com o rebaixamento da C), grupos maiores, ou EXP_FORCA 4.
      - Gate: `harness_economia` [5] (preço cabe na D, salário escala, folha 35–75% da receita, potencial vale 1,5–10×, salário salvo).
    - **✅ DECIDIDO E FEITO (06/10/2026) — mando de campo:** era +7% só no ataque (mandante 37% × visitante 35%: jogar em casa quase não importava). **Decisão do Dart: +30% no ataque E na defesa do mandante, e a torcida mexe no mando do usuário.** `Motor.MANDO_PCT = 0,30`; `mandoDe(ti)`: IA sempre +30%; o meu time em casa vai de **+20% (torcida revoltada)** a **+40% (eufórica)**, neutra = +30% (`MANDO_TORCIDA = 0,10` a cada 40 pontos de humor). Medido no motor ao vivo: **mandante 44% · empate 26% · visitante 30%**, 2,38 gols/jogo, gols casa/fora 1,30× (Brasileirão ≈ 47/27/26). Séries simuladas e estadual usam o mesmo modelo (força³ × (1+M) na fatia do mandante: 45/27/29). Expectativa do jogo (confiança): entre iguais, em casa = "ligeiro favorito", fora = "azarão" (mando na escala de força média ≈ +8%). Card do adversário mostra "🏠 Em casa · mando +XX% 🔥". `harness_calibracao atual`. Gate: `harness_mando`.
    - **Observação — a IA não gasta:** caixa da IA só se move quando ela compra de você. Fica pra quando houver mercado entre clubes da IA.
18. **🅿️ PÓS-TESTE — Botão Compartilhar resultado** (Web Share API / copiar texto) — aquisição barata, casa com o teste com pessoas. *Esforço baixo.*
19. **🅿️ PÓS-TESTE — Ranking com recortes dia / semana / mês / sempre** — quem está começando aparece; evita o ranking que premia só volume. *Baixo (views no Supabase).*
20. **✅ FEITO (05/10/2026) — Barra de pressão** sob o placar do *Seu jogo*: índice −100…+100 que decai a cada minuto (×0,85) e sobe com o que aconteceu NAQUELE minuto (posse 6, finalização 14, no alvo 8, escanteio 8, gol 20). Mostra quem está em cima *agora* (a posse já mostra o jogo todo): "🔥 SEU TIME PRESSIONA" (lemon), "⚠️ ADVERSÁRIO PRESSIONA" (vermelho) ou "JOGO EQUILIBRADO" (limiar 25). Calibrado em jogos reais: ~74% dos minutos equilibrado, ~14 viradas de rótulo por jogo, quem venceu pressionou mais em ~65% dos jogos. Camada de TV: não mexe no motor. Gate: `harness_pressao`.
21. **🅿️ PÓS-TESTE — Feedback em troca de recompensa** (ex.: X dias sem anúncio por responder um questionário) — útil justamente no teste com pessoas. *Baixo.*
22. **🅿️ PÓS-TESTE — Fim de temporada ilustrado** (confete no título, clima pesado no rebaixamento) e **cerimônia de sorteio** — momentos em tela cheia. *Médio.*
23. **🅿️ PÓS-TESTE — Banner de dica por aba**, fechável (onboarding barato, do Browserfoot). *Baixo.*
24. **Clubes pelo apelido da torcida** — decisão de base de dados, não de código; avaliar junto dos escudos gerados (Reservado pra depois).

### Bug achado no caminho (05/10/2026) — quem sai de campo
- **Substituído ou expulso sumia da partida:** só o campo do apito final era processado. Quem saía **não recebia nota** (fora da forma e da média do time), **não gastava energia** (voltava descansado), se tinha **marcado o gol vazava pro jogo seguinte** dele, e a moral contava como se tivesse ficado no banco. Agora `registrarSaida()` guarda quem sai (energia, minutos, posição) e o fim da rodada processa campo + saídas. Expulso aos 30' recebe nota baixa por 30 minutos. Gate: `harness_saida`.

### Decidido NÃO fazer (por ora)
- **Futebol feminino** — fora do escopo por enquanto.
- Obrigar o jogador a assistir rodadas de competições que ele não disputa.
- Sorteio obrigatório de clube (manter escolha livre).
- Recalcular a força por divisão ao estilo RetroFoot — **mantemos a escala atual do Prancheta** (jogadores fictícios, sobreposição entre divisões já acontece).

### Reservado pra depois
- **Escudos e imagens dos cards gerados por API** (LLM/gerador de imagem, nada que exista de fato), gerados **uma vez** por time/jogador e gravados no Supabase Storage; gerar sob demanda ao incluir times/jogadores novos. Estilo fixo + semente derivada do ID pra manter consistência.
- Ideias de layout: `docs/concorrentes/analise_retrofoot_browserfoot.md` §4.

---

## 6.2 Layout da página do clube — DECIDIDO APLICAR (09/2026)

> Referência: RetroFoot, tela de Formação no desktop — `docs/concorrentes/prints/retrofoot/00_referencia_pagina_clube_desktop.png` (+ `11_hub_formacao.jpg`, `21_hub_semana6_forma.jpg`).
> **Regra:** copiar a **disposição** (onde cada coisa fica), **não** o visual. Tudo no design system FLK! — fundo `#111112`, neon lemon `#D2FF00`, Bungee + Space Mono, sombra dura, estética arcade.

### Estrutura (desktop)
- **Menu lateral esquerdo fixo**, recolhível ("Recolher menu"): escudo + nome do clube + divisão/temporada no topo; itens com ícone. Mapeamento das abas atuais (`data-tab`): **Formação** (`escala`, vira a tela inicial do clube) · **Mercado** (`mercado`) · **Elenco & Base** (`elenco`) · **Campeonatos** (`competicoes`) · **Finanças** (`financas`) · **Ranking** (`ranking`) · **Dados/Config** (`dados`) · Sair. A `arena` atual é absorvida pela Formação (card do adversário + botão de jogar) — revisar o que sobra dela.
- **Cabeçalho do clube** (faixa larga no topo do conteúdo): escudo grande, nome do clube, nome do treinador, país · divisão · **data** · **temporada**; à direita **caixa**, **forma (5 últimos V/E/D)** e botão **Salvar**.
- **Conteúdo em 2 colunas:**
  - **Esquerda — Elenco (tabela):** selo **T/R** (titular/reserva), posição, nome, nacionalidade, idade, **força**, **nota** (média das 5 últimas — ver §6.1 item 5), **barra de energia**, valor. Abaixo, cards **Moral do plantel** e **Confiança da diretoria / segurança no cargo**.
  - **Direita (em cima):** grade de **formações** em botões com mini-barras DEF/MEI/ATA + **Auto**, **11 melhores** e **Selecionar descansados** · ao lado, **card do próximo adversário** (escudo, casa/fora, rodada, mini-tabela comparativa J/V/D/gols/pts) com o **botão de ação contextual** (Jogar / Ver sorteio / Avançar).
  - **Direita (meio):** **faixa da semana** (DOM–SAB), dia do jogo destacado.
  - **Direita (embaixo):** **campo de escalação** (spec abaixo) com botão de tela cheia.
- (Opcional, avaliar) faixa superior com o ranking de treinadores e "a sua posição" — **sem** rolar o tempo todo.

### Campo de escalação (spec)
- **Campo vertical** (gol embaixo, ataque em cima), **com as marcações/áreas do campo desenhadas** (grande área, pequena área, meia-lua, círculo central, linha do meio).
- **Jogador = camisa** nas cores do clube (`cor1`/`cor2`) com o **número** na camisa; em volta: **selo da força** (canto), **nome** embaixo, **nota** (última ou média das 5) e **barra/valor de energia**.
- Borda/indicador por **adequação à posição** (natural / treinada / improvisada — motor já calcula 100/70/30%) e legenda de cor.
- Cabeçalho: "Tática 4-4-2 · onze 11/11 · T titular · R reserva".
- Troca: **toque no titular → toque no reserva** (celular) e **arrastar** (desktop). Banco com filtro por setor e ordenação por força/energia.
- **Placas em volta do gramado**: espaço de anúncio na versão web (`mostrarAnuncio()`) ou placas do próprio jogo/patrocinador fictício — **nunca** "ANUNCIE AQUI" vazio.

### Celular
- Menu lateral vira **barra inferior fixa** (Formação, Elenco, Mercado, Tabela, Mais) + **botão de ação principal** sempre visível no canto.
- Colunas empilham: cabeçalho → adversário + ação → formações → **campo** → elenco.

### Pronto quando
- Desktop mostra menu lateral + cabeçalho + 2 colunas com campo vertical de camisas; celular mostra barra inferior; todas as abas atuais acessíveis pelo menu; testado nas 6 formações (validar item "Ficha/consistência do campo" do §6). ✅

### ✅ FEITO (28/09/2026) — como ficou
- **🐞 Corrigido (29/09/2026) — escalação automática improvisava jogador fora da posição:** o Auto / 11 melhores preenchia a formação **vaga por vaga na ordem** (GK → defesa → meio → ataque), pegando o melhor disponível pra cada vaga. Um meia forte comprado (MC 78, DC 72) ia pra **zaga** porque a zaga era preenchida antes do meio. Agora o módulo `Escalacao` faz a **atribuição ótima do time inteiro** (algoritmo húngaro), maximizando *overall na vaga − penalidade* (posição natural 0 · mesmo setor −2 · outro setor −10). Vale pro **Auto**, **11 melhores**, **Descansados**, **troca de formação** (que agora pode puxar do banco um jogador da posição, preferindo manter quem já é titular) e **escalação dos times da IA**. Em 156 times × 9 formações: jogadores fora do setor natural **1.549 → 0**, custo de −0,18% na força em campo média. Gate: `harness_escalacao.js` (reproduz o caso reportado no algoritmo antigo).
- **Casca:** menu lateral fixo (Formação · Rodada · Elenco · Mercado · Campeonatos · Finanças · Ranking · Dados + Configurações, Menu principal, Recolher). "Recolher" deixa só ícones e é lembrado no aparelho. No celular (≤ 900px) vira **barra inferior** (Formação, Elenco, Mercado, Tabela, Mais) + **botão de ação principal** flutuante (Jogar / Ao vivo / Resultado / Temporada).
- **Cabeçalho do clube:** escudo, nome, treinador, país, divisão, dia da semana + dia, rodada, temporada; à direita caixa, **forma (5 últimos V/E/D)** e Salvar. O selo "SUPABASE" saiu.
- **Arena → "Rodada":** a partida ao vivo e as tabelas da rodada continuam lá (o jogo leva pra ela ao clicar em Jogar). A Formação virou a tela inicial do clube e tem o card do adversário com a ação.
- **Formação, coluna esquerda:** elenco com T/R, posição, nome (abre a ficha), idade, força, **nota (média das 5 últimas)**, barra de energia, valor e o seletor de posição (esconde idade/valor/posição no celular). Cards de **Moral do plantel** e **Segurança no cargo** (com a fala do presidente).
- **Formação, coluna direita:** grade das **9 formações** com mini-barras DEF/MEI/ATA; **⚡ Auto**, **★ 11 melhores** (testa todas e fica com a mais forte) e **🔋 Descansados** (pesa energia); estilo e marcação. Card do **adversário** (casa/fora, mini-tabela J/V/D/GM:GS/P, botão de ação e "+1 dia de descanso"). **Esta semana** (DOM–SAB, hoje em destaque). **Campo vertical** com marcações, camisas nas cores do clube com número, selo de força cuja cor mostra **natural/treinada/improvisada**, nome, nota e energia; **placas** do próprio jogo em volta (nunca "ANUNCIE AQUI"); banco com filtro por setor e ordem por força/energia; tela cheia.
- **Troca:** toque num jogador e depois em outro (campo, banco ou tabela) — titular↔reserva, titular↔titular; reserva↔reserva é recusado. No desktop também **arrasta**. Com um titular selecionado dá pra trocar a **função (role)**.
- **Tutorial** atualizado pros novos alvos. "Round" virou "Rodada" na tela da partida.
- **Gate:** `harness_layout.js` 61/61 — casca, cabeçalho, todas as abas sem rolagem horizontal (desktop e celular), 9 formações sem camisa fora do campo ou sobreposta (desktop e 390px), trocas por toque e arrasto, Auto/11 melhores/Descansados, ação principal, forma no cabeçalho, ordem de empilhamento no celular.
- **Fica pra depois:** faixa superior com o ranking de treinadores (opcional no spec); placas como espaço de anúncio na versão web (`mostrarAnuncio()`).
- **Redesenho das outras abas — ✅ FEITO (29/09/2026)**: **Rodada** ganhou o cartão *Próximo jogo* (escudos, mando, posição, força, forma) + *Último jogo*, e a *Última rodada* mostra só o seu grupo (botão "Ver todos os jogos"); **Elenco** com faixa de KPIs (força do 11, idade média, folha, desfalques, contratos no fim) e tabela completa (setor, titular, idade, forma, gols, contrato, força, energia) — clicar abre a ficha; **Mercado** trocou o cartão repetido do clube por KPIs (caixa, folha, à venda, propostas, leilões); **Finanças** abre com o saldo, quantos meses de folha ele paga, a balança entradas × saídas e o **contador** (fim da temporada); **Dados** virou "Sua carreira" (slot, onde fica salvo, Salvar agora / Baixar / Restaurar backup) e o que era de desenvolvimento (Supabase, trocar de time) foi pra "Avançado". Tudo sem rolagem lateral a 390 px. Gate: `harness_visual`.

---

## 6.3 Padrão de UI — decisões e avisos importantes (DECIDIDO E ADOTADO 29/09/2026)

> **Regra:** tudo que é **importante e pede resposta** do jogador aparece no **modal FLK** — o mesmo visual das boas-vindas do presidente. **Nunca** `alert`/`confirm`/`prompt` do navegador.

**Anatomia (sempre nesta ordem, só o que fizer sentido):**
1. **Título** em Bungee, neon lemon (ex.: "📨 Proposta recebida").
2. **Cabeçalho**: escudo + nome em destaque + linha de contexto (divisão, temporada, rodada).
3. **Fala** (itálico) quando há um personagem falando — presidente, clube comprador.
4. **Card de destaque** com borda lemon (ou **vermelha** quando é alerta): rótulo pequeno, título, descrição.
5. **KPIs** em caixinhas (caixa, confiança, oferta, caixa depois…) — 2 por linha quando são 2 ou 4.
6. **Aviso** em amarelo quando há consequência escondida (ex.: "é titular e sai da escalação").
7. **Botões**: secundários à esquerda (Recusar, Decidir depois, Cancelar), **ação principal lemon** ocupando o resto à direita.

**Comportamento (em `App.modalFLK` / `App.cartaoDecisao`):**
- **Fila:** vários avisos seguidos saem **um de cada vez** (`fila:true`); `aposFila(fn)` roda algo só quando o jogador respondeu tudo (ex.: o tutorial pós-1ª rodada).
- **Decisão obrigatória** (`fechavel:false`): sem ✕, Esc e clique fora não fecham — usado na demissão.
- **Modal dentro de modal**: um aviso aberto a partir de outro (ex.: "Saldo insuficiente" na compra) **fica na tela** — antes ele sumia na hora. Na compra, fechar o aviso volta pra negociação.
- Posição **fixa na tela** (antes era `absolute` e, com a página rolada, abria fora da vista — pior no celular); acima da barra inferior; rolagem interna se não couber.

**Já convertido:** boas-vindas · **venda** (aceitar no Mercado agora abre o modal de decisão com oferta, valor de mercado, caixa depois, % da oferta e aviso de titular) · **proposta recebida** (novo: aparece sozinha no fim da rodada com Aceitar / Recusar / Decidir depois — antes só aparecia se o jogador abrisse o Mercado) · **compra** (com "caixa depois" ao vivo enquanto digita) · contraproposta · empréstimo · **desfalques** (lista quem sai e por quê) · escalação incompleta · time desfalcado · **demissão** · apagar carreira · falha ao salvar.
**Fica como está (não é decisão):** ficha/card do jogador, pódio de fim de temporada, toasts do tutorial.
**Gate:** `harness_modais.js` 30/30 (inclui checagem de que o `app.js` não tem nenhum `alert`/`confirm`/`prompt`).

**🐞 Achado junto (29/09/2026) — save do convidado não cabia:** o snapshot tem **~8 MB** (atributos dos ~3 mil jogadores: `attrs`, `attrsDec`, `capAttr`) e a cota do localStorage é **~5 M caracteres**, então o save do convidado **falhava sempre, em silêncio**. Com o D1 isso virou o caminho padrão ("Jogar agora"). Correção: o convidado grava **comprimido** (gzip nativo do navegador + base64, campo `estadoZ`, ~1,7 M caracteres; envelope antigo com `estado` continua sendo lido) e uma falha de gravação agora **avisa** o jogador uma vez por sessão. Gate: `harness_save_convidado.js` 11/11.
- **~~Pendente (D3)~~ — ✅ resolvido pelo save enxuto v12 (D3, 29/09/2026: ~1,1–1,6 MB).** O save **logado** mandava os mesmos ~8 MB pro Supabase a cada auto-save. Funciona, mas é pesado — vale **enxugar o snapshot** (guardar só o que mudou em relação ao banco; `capAttr` e parte de `attrsDec` dá pra re-derivar) antes do lançamento. Não testado daqui se há limite de tamanho de requisição no Supabase.

---

## 6.4 Escala: mais campeonatos, categoria de base e dados (08/10/2026 — pós-teste)

> Conversa de 08/10/2026, com o jogo já no ar pro teste (GitHub Pages). Nada daqui entra antes do teste; é a fila do que vem depois, pensando a longo prazo (mais países, mais jogadores).

### Dados e save — ✅ DECIDIDO (fazer antes da categoria de base e antes do 2º país)
25. **Garotos gerados por SEMENTE (save v15).** Hoje `gerarJovem` usa `Math.random()` e o save grava o garoto inteiro (`gerados`: 45 atributos + nome, potencial, talento, físico, pés ≈ 300 caracteres cada). Passa a usar um **sorteador determinístico** (ex.: mulberry32): a mesma semente gera sempre o mesmo garoto. O save guarda só a **receita** — `{pid, semente, setor, série de origem, versão do gerador}` (≈ 30 caracteres) — e o que muda com o tempo vai igual ao jogador do banco (idade, contrato, salário, stats, `ev`).
    - **O gerador NÃO pode depender do banco.** Hoje o garoto copia um jogador-modelo (−18% + ruído); se o modelo for editado/removido numa atualização do banco, a semente geraria outro garoto e o save quebraria em silêncio. O novo gerador sorteia de uma **tabela de perfis por setor × série no código**, versionada (`GERADOR_V`). Mudou a tabela → sobe a versão; o save carrega a versão junto da semente.
    - Nome também sai da semente (gerador de nomes brasileiros: prenomes, sobrenomes, compostos, apelidos).
    - Migração: saves ≤ v14 com garotos no formato completo continuam carregando (mantém o leitor atual).
    - Ganho: 5 garotos/clube/ano em 100 clubes ≈ 15 KB no save, em vez de ~150 KB acumulando por temporada.
    - Gate: harness novo medindo tamanho do save antes/depois + regeneração idêntica após load.
26. **Atributos em LISTA no banco** (não JSONB-objeto). Medido em 08/10/2026: a linha do jogador tem ~1.080 caracteres e o download inicial ~3,3 MB (3.180 jogadores); **~75% disso são os nomes dos 45 atributos repetidos em cada linha**. Como objeto (`{"corners":12,…}`) são ~820 caracteres; como lista em ordem fixa (`ATTR_ORDEM`, coluna `smallint[]`) ~180. Migração no Supabase + leitor no `SupabaseProvider`. *JSONB como objeto não ajuda — o ganho vem da ordem fixa.*
27. **Carregar por país, sob demanda.** Com 50 mil jogadores o formato atual seria ~54 MB só pra abrir o jogo (~22 MB mesmo com a lista). Regra (casa com a decisão "outras ligas só resultado"): **país do usuário = jogadores completos**; **outros países = só times com força resumida** (ataque/meio/defesa) pra simular resultado; jogadores de outro país só baixam quando alguém abre a liga ou vai contratar.
28. **Arquivo estático por país** (`dados/br.json`, `ar.json`…) servido pelo próprio GitHub Pages com cache do navegador — os atributos do banco não mudam durante a temporada. Supabase fica pra login, saves e ranking (sem tráfego de banco a cada abertura do jogo). Gerado por script a partir do banco a cada atualização de dados.

### Atributos — 🟡 PROPOSTO
29. **Dar uso aos 8 atributos que hoje não entram em conta nenhuma.** Auditoria (08/10/2026): dos 45, 36 pesam no overall por posição, `rushing_out` só na role Goleiro-Líbero, e `corners`, `freekick`, `penalty`, `long_throws`, `throwing`, `determination`, `leadership`, `natural_fitness` são enfeite. Fora do overall, só assistência (passe/visão/cruzamento), tipo de gol (cabeceio/longe/drible/velocidade/finalização) e cartão (agressividade) leem atributos direto. Proposta: **pênalti** → cobrador e conversão; **falta/escanteio** → gol de bola parada; **liderança** → capitão e moral do elenco; **determinação** → velocidade de evolução; **condicionamento natural** → recuperação de energia entre rodadas. `long_throws` e `throwing` deixam de ir pro save dos gerados. *Manter o modelo de 45 atributos* — é ele que dá sentido a posição, role, improviso e evolução por posição.

### Competições — 🟡 PROPOSTO (ordem sugerida)
> Referência: calendário CBF 2026 — estaduais com 11 datas (jan–mar) e mais vagas diretas na Copa do Brasil (102); Copa do Brasil com 126 clubes (Série A entra na 5ª fase; campeões de Nordeste, Verde, Série C e D entram na 3ª; final em jogo único); Copa Sul-Sudeste nova (12 clubes), Copa do Nordeste com 20, Copa Verde dividida em Norte e Centro-Oeste; Série D com 96 clubes (16 grupos de 6, **avançam 4** — a nossa avança 2), seis acessos.
30. **Estadual com consequência:** fase de liga/grupos curta (6–8 rodadas) + mata-mata (ida e volta só na final), cabendo nas ~11 datas. **A campanha dá vaga na Copa do Brasil** (e na Série D pra quem está fora das séries) — hoje pular o estadual quase não custa nada. Decisão pendente: passa a **gastar energia** (vira gestão de elenco, como na vida real em que o Brasileirão começa antes do estadual acabar) ou continua pré-temporada leve? Só o estadual do usuário é jogado; os outros estados sorteiam campeão e classificados. Divisões estaduais (A1/A2) dependem de quantos clubes cada estado tem no banco.
31. **Copa do Brasil** = item 16, agora com origem dos classificados (estaduais + séries + regionais).
32. **Copas regionais** (Nordeste, Sul-Sudeste, Norte, Centro-Oeste) — só depois da Copa do Brasil, porque também classificam pra ela.
33. **Supercopa do Brasil** (campeão do Brasileiro × campeão da Copa do Brasil) — jogo único na abertura da temporada.
- Continentais (Libertadores/Sul-Americana) ficam pra quando entrarem outros países.

### Categoria de base — 🟡 PROPOSTO (depende do item 25)
34. Hoje a base é só **reposição** (cada aposentado abre vaga pra um garoto). Proposta:
    - **Revelação anual:** leva de 3–5 garotos (16–19 anos) no início da temporada; tamanho e qualidade pelo **nível da base** do clube (investível).
    - **Potencial em faixa** ("60–75") revelada pelo olheiro, que fecha conforme o garoto joga.
    - **Elenco sub-20 separado:** não pesa na folha cheia nem lota o profissional; decisões: promover, emprestar (evolui jogando fora), dispensar.
    - **Copinha** em janeiro, simulada só com o sub-20: quem se destaca revela potencial e ganha valor.
    - **A IA também revela**, na medida de aposentados + folga; quem sobra vira jogador livre (o mundo não envelhece nem encolhe).

---

## 7. Resumo em uma frase

> Um single-player **lançável** precisa do **loop de recompensa** (Match Rating → estatísticas → objetivos → moral) e do **acabamento de produto** (onboarding, imersão, empacotamento); rentabiliza com **ads recompensados opt-in + compra única que remove ads** (nunca pay-to-win, e como se vende *ausência de ads* o cheat não rouba receita); protege-se com **Via 1** — só a compra e o score de ranking passam pelo servidor (Supabase, zero GCP novo) — e mantém o ranking honesto **sinalizando** o cheater com um selo público em vez de expulsá-lo, deixando o vexame fazer o trabalho; com o **online reservado**, não descartado, pra quando o single provar que é bom.
