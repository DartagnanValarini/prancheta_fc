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

O que **já existe e funciona** em `app.js` (~5.150 linhas, monolito injetado no `prancheta_fc.html`) — *inventário revisado em 28/09/2026*:

- **Motor de partida** minuto-a-minuto calibrado (2,43 gols/jogo, mando percentual). Harnesses de Node como rede (`harness_fase0`, `harness_calibracao`).
- **Camada `Rating`** unificada (`overallGlobal`/`overallPosicao`/`rendimento`).
- **Evolução** por potencial oculto (`growthFactor`, `potential`, âncora fixa) + fator de posição (natural/treinada/improvisada 100/70/30%).
- **Energia, lesões, suspensões** (`checarLesao`, `disp`, `indisponivel`, decremento de suspensão).
- **Competição** 4 séries A/B/C/D, config data-driven (`FORMATO_DIVISOES`, `formatoDe`), acesso/rebaixamento, mata-mata.
- **Finanças:** saldo, extrato, empréstimo com parcelas, premiação por acesso (`PREMIO_ACESSO`), receitas (patrocínio/bilheteria).
- **Mercado:** `tickMercado`, ofertas, `executarTransferencia` (valida saldo), valor de mercado, contratos.
- **Save robusto:** `SaveSchema` v9, `snapshot`/`validateSnapshot`/`aplicarSnapshot`, checksum djb2 (corrupção) **+ assinatura HMAC-SHA256 (C1, anti-cheat)**, export/import backup. **Dois modos:** convidado (localStorage, **comprimido** — ver §6.3) e logado (Supabase `game_save` por user+slot). 3 slots.
- **UI completa:** 8 abas (Arena, Escala, Elenco, Competições, Mercado, Finanças, Ranking, Dados) + overlay de substituição + tela de Configurações. Design system FLK! Studios.
- **Bloco A inteiro (✅):** Match Rating por jogo (`Rating.matchRating`, craque da rodada, média da temporada), estatísticas (artilharia ao vivo, histórico do clube com gráficos de saldo/overall), objetivos por divisão (`Objetivos`, principal + 3 secundários com prêmio) e moral 0–100 (`fatorMoral` no rendimento, força e valor; status na ficha). Harnesses `harness_matchrating`, `harness_a2/a3/a4`.
- **Bloco B parcial:** `mostrarAnuncio()` como ponto único (modal stub), gancho "dobrar prêmio" dos objetivos, compra remove-ads ligada ao `entitlement` (stub no servidor). `harness_blocob`.
- **Bloco C (✅):** assinatura HMAC do save, posse verificada no servidor e aba Ranking com selo de suspeito.
- **D1 Onboarding (✅ 28/09/2026):** entrada "Jogar agora", boas-vindas do presidente, tour guiado e fim das telas "Conecte o Supabase". Gate: `harness_d1_onboarding` (Playwright).
- **Página do clube §6.2 (✅ 28/09/2026):** menu lateral recolhível / barra inferior no celular, cabeçalho do clube, Formação em 2 colunas com campo vertical de camisas. Gate: `harness_layout` (Playwright).
- **Forma recente §6.1 item 5 (✅ 28/09/2026):** 5 últimas notas de jogador e time + 5 últimos resultados, no save v9. Gate: `harness_forma`.

O que **NÃO existe ainda** (buracos entre "funciona" e "lançável e bom"):

- ✅ **Assistências (29/09/2026)** — `Motor.assistente()`: ~78% dos gols têm passe, ponderado por posição (meias/pontas criam mais) e passe+visão+cruzamento; +0,8 na nota da partida; painel 🅰️ na aba Estatísticas, J/G/A na ficha, "🅰️" no lance ao vivo. Save **v10** (`assist`/`assistTemp`; v9 carrega zerado). Gate: `harness_assistencias`.
- ❌ **Partida imersiva** (D2: comentários por atributo, feedback de fadiga, escanteios/finalizações).
- ❌ **Carreira longa como gate** (D3) e **áudio** (D4).
- 🟡 **Layout das outras abas** (Elenco, Mercado, Campeonatos, Finanças) — cabem no celular sem rolagem horizontal, mas ainda não foram redesenhadas no padrão da página do clube.
- ❌ **Ads e compra reais** (AdMob/AdSense, Play Billing) + **empacotamento** (Bloco E).

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

### 🟡 BLOCO B — Rentabilização: anúncios + remover anúncios (DECIDIDO)
*Como o jogo ganha dinheiro sem trair o jogador.*

> **Modelo cravado:** anúncios no jogo grátis **+** compra única (dinheiro real) que **remove os anúncios**. Nada de pay-to-win — e como o que se vende é *ausência de ads* (não vantagem no jogo), o modelo é limpo por construção.
>
> **Cosméticos ficam anotados pra depois** (ex.: importar um logo/escudo do clube). Fora do escopo atual, mas o save deve reservar um campo de "itens do usuário" pra não travar essa porta no futuro.

**B1. Anúncios recompensados (opt-in) — o formato principal.**
- O jogador **escolhe** ver um ad pra ganhar bônus: **dobrar o prêmio** de um objetivo/rodada, acelerar recuperação de energia, um scout extra. Nunca forçado, **nunca no meio da partida nem entre rodadas** (mataria o "só mais uma rodada").
- Interstitial leve só em transição de temporada, se houver.
- *Pronto quando:* existe ao menos um ponto de "assistir ad → bônus" opt-in, e ele some pra quem comprou o remove-ads.

**B2. Compra única "Remover anúncios".**
- Um pagamento (sem assinatura) desliga todos os ads. Modelo honesto, casa com público de manager clássico.
- **Flag de posse** guardada no servidor (não só no cliente) — senão o próprio remove-ads vira o primeiro alvo de cheat. É a compra que a Via 1 (Bloco C) precisa validar de fato.
- *Pronto quando:* comprar remove os ads e a posse persiste verificada pelo servidor.

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
> **Próximo grande passo (rota):** com A, B (parcial), C, D1, §6.2 e a forma recente prontos, seguir pros quick wins do §6.1 (coletiva, reunião com a diretoria, contador de caixa, diagnóstico de fim de temporada) e **assistências**, depois D2–D4 e o empacotamento (E) que destrava a compra real.

---

### 🔵 BLOCO D — Polimento de lançamento (de "projeto" a "produto")
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

**D2. Partida mais imersiva.**
- Comentários dinâmicos por atributo ("golaço de fora" com `long_shots` alto; "de cabeça" com `heading`), feedback de fadiga (piscar vermelho < 40% energia), finalizações/escanteios/posse na tela.
- Sobe de "bom" pra "gostoso de assistir".

**D3. Estabilidade e bordas.**
- Carreira longa (10+ temporadas) sem quebra de save. Telas de vazio decentes, erro amigável. Novo harness "carreira longa" como gate de release, junto dos existentes.

**D4. Áudio e identidade (alto impacto percebido, baixo custo).**
- SFX mínimos (gol, apito), música de menu. Eleva muito a percepção de acabamento.

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
1. **Match Rating (A1)** — destrava tudo, dá dopamina imediata, e é o insumo do score de ranking.
2. **Estatísticas visíveis (A2)** — quase de graça depois do A1.
3. **Objetivos por divisão (A3)** — motor do retorno diário, e o gancho natural dos ads recompensados.
4. **Moral/forma (A4)** — fecha a gestão humana.

> **Checkpoint:** com A pronto, testar com 5–10 pessoas. Se **não** engajar aqui, nem ads nem ranking salvam — melhor descobrir agora, barato.

**Segundo — o servidor mínimo + honestidade (Blocos B e C juntos, compartilham infra):**
5. **C1** (assinar o save) — barra o cheat trivial, custo baixo.
6. **Supabase:** tabelas `entitlement` + `ranking`, Edge Functions, RLS/constraints (a fronteira estreita da Via 1).
7. **B2 + C2** (comprar remove-ads + posse verificada no servidor) — a única compra, a única coisa que precisa de autoridade real.
8. **C3** (ranking que sinaliza o suspeito) — plausibilidade server-side + selo público.
9. **B1** (ads recompensados opt-in) — plugado nos objetivos do A3.

**Terceiro — virar produto (Blocos D e E):**
10. **Onboarding (D1)** — a maior alavanca de retenção.
11. **Imersão (D2)** + **estabilidade (D3)** + **áudio (D4)**.
12. **Empacotar e publicar (E)** conforme a plataforma decidida.

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

**O que vale pras DUAS versões:** o servidor (Bloco C) — a compra de "remover anúncios" precisa ser validada no servidor tanto na web quanto no app, senão é o primeiro alvo de cheat. Por isso o Bloco C vem antes do empacotamento: protege a compra e destrava o ranking, independente da superfície.

---

## 6. Melhorias e ajustes de UX (backlog — do teste de jogo)

Itens levantados testando o jogo. Não bloqueiam o loop principal, mas entram no polimento (Bloco D) ou como quick wins.

- **⚙️ Botão de Configurações** — uma tela/aba de ajustes do jogador. Candidatos: velocidade da simulação (relógio da partida), frequência do save (auto-save a cada X rodadas / manual), talvez volume de áudio (quando entrar D4), e futuramente o toggle de "remover anúncios" (Bloco B). É o lar natural de várias preferências que hoje não têm onde morar. Baixo/médio esforço; alto valor percebido.
- **📊 Estabilidade da contagem de jogos/pontos na tabela** — investigar a fundo o relato de "2 jogos / 6 pontos após a rodada 1". O motor conta certo em teste isolado (1 jogo por rodada); suspeita principal é save criado com código antigo carregando valor já dobrado, ou caminho de UII específico. Já removida a soma condicional `+1` na exibição e adicionada guarda de idempotência em `encerrarRodada`. **Confirmar com jogo novo** e, se persistir, capturar o caminho exato.
- **🎯 Ficha/consistência do campo** — as posições das bolinhas no campo (vazio vs. escalado) já foram fixadas com altura de slot constante; validar em todas as formações no reteste.
- **🖥️ Responsividade do sticky** — a barra de abas fixa foi calibrada pra colar abaixo do header; validar em telas estreitas (mobile) onde o header/abas podem quebrar em mais linhas e exigir ajuste dos offsets. *(A casca do §6.2 trocou as abas do topo por menu lateral / barra inferior — item provavelmente resolvido; confirmar no reteste.)*
- **🚪 Botão "Pedir demissão" (pra depois — pedido 29/09/2026)** — o treinador pode sair do clube por vontade própria. Confirmação no **modal padrão (§6.3)** mostrando clube, temporada, confiança e o que acontece depois; ao confirmar, cai no fluxo que já existe de "livre no mercado" (`procurarNovoClube`, mesmo slot). Onde colocar o botão: no card **Segurança no cargo** e/ou em ⚙️ Configurações. *A decidir:* se pedir demissão tem algum custo (ex.: pesa no ranking de treinadores ou só pode a partir de certa rodada).
- **🤵 Recado do presidente a cada rodada (pra depois — pedido 29/09/2026)** — um modal **no estilo das boas-vindas** (o mesmo cartão do §6.3) a cada rodada, que leva direto pra tela de **Formação**, com: **frase do presidente** (sobre o próximo jogo — já existe em `falaPresidenteAtual()`), **meta da diretoria** (objetivo principal do A3), **caixa** e **confiança**. Entra na **fila** de avisos pós-rodada (depois de desfalques e propostas), pra nunca empilhar dois modais. *A decidir:* aparecer antes de toda rodada ou só quando algo mudou; e se vale um "não mostrar de novo" nas Configurações pra quem joga rápido.

---

## 6.1 Mecânicas inspiradas nos concorrentes (backlog — 09/2026)

> Origem: temporadas jogadas no RetroFoot e no Browserfoot — ver `docs/concorrentes/analise_retrofoot_browserfoot.md` (prints em `docs/concorrentes/prints/`).
> Levantado contra o código atual: **já temos** confiança da diretoria ("HP do treinador") + fluxo de demissão, metas da diretoria por divisão, `fatorMoral` no rendimento, empréstimo, bilheteria, propostas/contrapropostas e substituições no intervalo — os itens abaixo **complementam** isso, não substituem.
> **Ordem sugerida:** 1 → 2 → 3 → 4 → 5 (baratos, reaproveitam o que existe), depois 6 e 8 (estruturais no mercado). O resto conforme couber.

### Encaixam no Bloco A (loop que engaja)
1. **Coletiva pós-jogo** *(A4)* — **✅ FEITO (29/09/2026)**: módulo `Coletiva` (3 perguntas — jogo / elenco [craque ou insatisfeito] / clube [tabela e meta]), repórter com veículo, respostas por perfil com **selos de efeito** (moral do elenco, moral do jogador citado, cargo) no modal padrão; nenhuma resposta domina as outras (troca real moral × cargo, cargo ≤ ±2 por resposta); "Pular a coletiva"; liga/desliga em ⚙️ Configurações (vai pro save). Entra na fila pós-rodada depois dos desfalques. Gate: `harness_coletiva`. *Ideia original:* — 3 perguntas de um repórter (o jogo / o elenco / o clube), 2–3 respostas por perfil (Protetor, Direto, Técnico…). Cada resposta mexe em **moral** e **confiança da diretoria**, com o efeito visível antes de escolher ("moral +4 · diretoria +2"). Pulável. Esforço baixo (textos + 2 variáveis que já existem).
2. **Reunião com a diretoria antes da demissão** *(A3/A4)* — quando a confiança cruza um limite, evento com 2 perguntas ("por que piorou?" / "qual o plano?"); a escolha dá fôlego ou piora. Mostrar a **fórmula da confiança** na tela (ex.: X% posição + Y% moral) pra o jogador saber o que corrigir. Hoje a demissão chega sem aviso.
3. **Contador na compra e na renovação** *(Mercado/Finanças)* — card com 3 números: **caixa depois**, **variação por rodada** e **projeção de fim de temporada**, + uma frase ("Cabe hoje, não cabe amanhã"). Não proíbe, só mostra a consequência. Só UI sobre números que já calculamos.
4. **Diagnóstico de fim de temporada** *(onboarding disfarçado)* — tela de fechamento com o resultado + 3 dicas tiradas da temporada ("a defesa levou 115 gols — reforce zaga e gol", "elenco terminou esgotado", "caiu cedo na copa") + bloco "O que muda agora" (divisão, folha, cargo).
5. **Forma recente: últimas 5 notas — jogador E time** *(A1/A2)* — **✅ FEITO (28/09/2026)**
   - *Como ficou:* módulo `Forma` (FIFO de 5). Jogador: `p._notas5`; time: `t._notas5` (média de quem recebeu nota na partida) e `t._forma5` (V/E/D). Save **v9** (`jogadoresById[pid].notas5` + `formaTimes`); save v8 carrega com listas vazias e dado adulterado é saneado (clamp 0–10, máx. 5). Aparece na coluna **Nota** do elenco (média das 5, com as notas no tooltip), nas camisas do campo e na **Forma** do cabeçalho. `harness_forma` 16/16.
   - *Limite conhecido:* quem é substituído (sai do campo) não recebe nota — herdado do Match Rating (A1), então também não entra na média do time.
   - **Jogador:** guardar as **5 últimas notas** (Match Rating) de cada jogador; exibir como forma recente (ex.: `7,0 · 5,6 · 6,4 · 8,1 · 6,9`) na ficha e na escalação.
   - **Time:** guardar as **5 últimas notas do time**, onde **nota do time na partida = média das notas dos jogadores que atuaram naquela partida** (titulares + quem entrou; quem ficou no banco não conta).
   - Janela deslizante (FIFO de 5), entra no save (`SaveSchema` → bump de versão + migração com lista vazia).
   - Destrava: indicador de fase do time no hub, argumento pra coletiva/diretoria, valorização de mercado por fase.

### Mercado
> **🐞 Corrigido (29/09/2026) — negociação de compra incoerente:** o clube só aceitava com **5% acima** do preço pedido; entre o preço e +5% a contraproposta (média entre oferta e preço) saía **abaixo** do que o jogador ofereceu (caso real: ofereceu R$ 9,0 M, ouviu "só sai por R$ 8,8 M"). Regra nova (`avaliarOfertaCompra`): oferta ≥ preço **fecha**; abaixo de 60% é recusada; no meio, contraproposta **sempre acima da oferta e no máximo o preço**, arredondada pra cima em R$ 100 mil. O clube **lembra a contraproposta na rodada**: oferecer esse valor fecha, e subir a oferta nunca faz ele pedir mais. Gate: `harness_mercado.js` (varre ~36 mil ofertas: oferecer mais nunca piora o resultado).
6. **Negociação em 3 etapas** — (1) **taxa** com o clube, com piso ("abaixo de X eles recusam direto"); (2) **salário** com o jogador, que pode contrapropor; (3) **fechar**, com aviso de risco quando houver (ex.: chance de aposentadoria do veterano). Cada etapa com o card do contador (item 3).
7. **Impacto antes de aceitar proposta recebida** — caixa depois, folha depois, quanto cai a força do setor, provável substituto no elenco.
8. **Renovação de contrato com pedido do jogador** — no fim da temporada, cada contrato vencendo pede salário + prazo; aceitar / contrapropor / dispensar, com a projeção "o caixa dura ~X meses". (Hoje temos contrato, não temos renovação.)
9. **Aposentadoria de veteranos** — chance de parar por idade; renova os elencos da máquina e alimenta o risco do item 6.
10. **Filtro "cabe no caixa" / "até metade do caixa"** no mercado.
11. **Leilão** quando vários clubes querem o mesmo jogador — mais complexo, fica por último.

### Calendário e ambiente
12. **Estadual como pré-temporada** (pulável) — testa o elenco e dá título extra ao time pequeno.
13. **Humor da torcida → bilheteria** — vitória +, derrota −, clássico perdido pesa mais; torcida eufórica aumenta e revoltada reduz a bilheteria.
14. **Botão "Selecionar descansados"** na escalação (escala priorizando energia).
15. **Premiação por fase na copa** — cada fase avançada paga; copa vira fonte de caixa pro time pequeno.

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
- **Fica pra depois:** faixa superior com o ranking de treinadores (opcional no spec); placas como espaço de anúncio na versão web (`mostrarAnuncio()`); redesenho das outras abas no mesmo padrão.

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
- **Pendente (D3):** o save **logado** manda os mesmos ~8 MB pro Supabase a cada auto-save. Funciona, mas é pesado — vale **enxugar o snapshot** (guardar só o que mudou em relação ao banco; `capAttr` e parte de `attrsDec` dá pra re-derivar) antes do lançamento. Não testado daqui se há limite de tamanho de requisição no Supabase.

---

## 7. Resumo em uma frase

> Um single-player **lançável** precisa do **loop de recompensa** (Match Rating → estatísticas → objetivos → moral) e do **acabamento de produto** (onboarding, imersão, empacotamento); rentabiliza com **ads recompensados opt-in + compra única que remove ads** (nunca pay-to-win, e como se vende *ausência de ads* o cheat não rouba receita); protege-se com **Via 1** — só a compra e o score de ranking passam pelo servidor (Supabase, zero GCP novo) — e mantém o ranking honesto **sinalizando** o cheater com um selo público em vez de expulsá-lo, deixando o vexame fazer o trabalho; com o **online reservado**, não descartado, pra quando o single provar que é bom.
