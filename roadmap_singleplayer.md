# 🎯 Prancheta FC! — Roadmap SINGLE-PLAYER (rota de lançamento)

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

O que **já existe e funciona** em `app.js` (4.141 linhas, monolito injetado no `prancheta_fc.html`):

- **Motor de partida** minuto-a-minuto calibrado (2,43 gols/jogo, mando percentual). Harnesses de Node como rede (`harness_fase0`, `harness_calibracao`).
- **Camada `Rating`** unificada (`overallGlobal`/`overallPosicao`/`rendimento`).
- **Evolução** por potencial oculto (`growthFactor`, `potential`, âncora fixa) + fator de posição (natural/treinada/improvisada 100/70/30%).
- **Energia, lesões, suspensões** (`checarLesao`, `disp`, `indisponivel`, decremento de suspensão).
- **Competição** 4 séries A/B/C/D, config data-driven (`FORMATO_DIVISOES`, `formatoDe`), acesso/rebaixamento, mata-mata.
- **Finanças:** saldo, extrato, empréstimo com parcelas, premiação por acesso (`PREMIO_ACESSO`), receitas (patrocínio/bilheteria).
- **Mercado:** `tickMercado`, ofertas, `executarTransferencia` (valida saldo), valor de mercado, contratos.
- **Save robusto:** `SaveSchema` v8, `snapshot`/`validateSnapshot`/`aplicarSnapshot`, checksum djb2, export/import backup. **Dois modos:** convidado (localStorage) e logado (Supabase `game_save` por user+slot). 3 slots.
- **UI completa:** 7 abas (Arena, Escala, Elenco, Competições, Mercado, Finanças, Dados) + overlay de substituição. Design system FLK! Studios.

O que **NÃO existe ainda** (buracos entre "funciona" e "lançável e bom"):

- ❌ **Match Rating** (nota 0–10 por jogo) — `fatorForma` é binário (jogou/venceu), não é nota.
- ❌ **Moral / forma / status** de elenco (insatisfeito, quer sair, em ascensão).
- ❌ **Objetivos/missões por divisão** com recompensa.
- ❌ **Estatísticas de temporada** visíveis (artilharia ao vivo, assistências, jogador da rodada).
- ❌ **Onboarding / tutorial** — o jogo começa cru; abas mostram "Conecte o Supabase" se vazio.
- ❌ **Rentabilização** — nenhum hook de ads/compra.
- ❌ **Anti-cheat** — `App.teams[x].saldo=999` no console + salvar persiste.
- ❌ **Ranking online de treinadores** — não existe.
- ❌ **Partida imersiva** (comentários por atributo, feedback de fadiga, escanteios/finalizações).
- ❌ **Polimento de lançamento** (som, telas de vazio decentes, PWA/instalável).

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

### 🟠 BLOCO C — Anti-cheat Via 1 + Ranking que sinaliza (DECIDIDO)
*Autoridade estreita no servidor + ranking honesto que expõe, não expulsa.*

> **Via 1:** o jogo inteiro continua rodando no navegador (single-player, offline, diversão local). Só uma **fronteira estreita** passa a ser decidida/validada pelo servidor: (a) a **compra do remove-ads** e (b) o **score que sobe pro ranking**. O resto do save fica no cliente — e tudo bem, porque nada disso sozinho vira dinheiro real.
>
> **Verdade honesta:** nenhum anti-cheat client-side é à prova de atacante determinado (o segredo mora no arquivo que você entrega). Via 1 não tenta ser inquebrável — ela **protege o que dá receita** (o remove-ads, validado no servidor) e **mantém o ranking crível** (sinalizando o implausível). Isso basta pro modelo de negócio escolhido.

**C1. Assinar/ofuscar o save (barra o cheat trivial).**
- Trocar o checksum djb2 (anti-corrupção) por **HMAC com segredo embutido + ofuscação leve** do JSON. Não é inquebrável — eleva de "editável em 5s no console" pra "chato o bastante" pra 99% dos jogadores casuais.
- *Pronto quando:* editar `saldo`/atributos no console e salvar quebra a assinatura (save marcado como modificado).

**C2. Posse de compra verificada no servidor.**
- A flag "removeu ads" (B2) vive no servidor e é **checada lá**, não confiada ao cliente. É a única coisa comprável, então a única que *precisa* de autoridade real. Uma tabela + uma checagem simples no Supabase.
- *Pronto quando:* forjar a flag no cliente não desliga os ads (o servidor manda a verdade).

**C3. Ranking de treinadores que SINALIZA o suspeito.**
- Score do treinador (títulos, acessos, Match Rating acumulado, campanha) sobe pro servidor.
- **Detector de plausibilidade server-side:** a evolução do save é fisicamente possível? overall do elenco bate com nº de partidas? saldo cresceu dentro do teto que o jogo permite? assinatura (C1) confere?
- Save implausível **NÃO é removido** — entra no ranking com um **selo público de suspeito** (ex.: "⚠ Progresso não verificado", ícone de alerta, posição em cinza/riscada). O cheater aparece, mas **carimbado** — o vexame social faz o resto.
- *Pronto quando:* o ranking mostra todos, mas quem tem save implausível/não-assinado aparece visivelmente marcado como suspeito.

**Infra desta rota (toda no Supabase — ZERO GCP novo):**
- **Tabelas:** `entitlement` (posse do remove-ads por user), `ranking` (score + flag `suspeito` + carimbo de verificação).
- **Edge Functions:** validar compra (B2/C2); receber submissão de ranking + rodar plausibilidade (C3).
- **RLS + constraints:** cada user só mexe na própria linha; faixas válidas no banco como segunda muralha.
- **Custo:** praticamente zero no plano grátis do Supabase até ter muitos usuários. Sem VM, sem Cloud Run, sem IAM de GCP — o Supabase que já hospeda os saves cobre tudo.

---

### 🔵 BLOCO D — Polimento de lançamento (de "projeto" a "produto")
*Acabamento, não sistema novo. É o que faz o jogo parecer pronto.*

**D1. Onboarding / primeira sessão.**
- Entrada limpa: escolher/gerar clube, escalar o primeiro time com dica, primeira partida guiada. **Matar as telas "Conecte o Supabase na aba Dados"** — o jogador nunca deveria ver isso. Maior alavanca de retenção.
- *Pronto quando:* um jogador novo chega à primeira partida sem instrução externa.

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

## 5. Resumo em uma frase

> Um single-player **lançável** precisa do **loop de recompensa** (Match Rating → estatísticas → objetivos → moral) e do **acabamento de produto** (onboarding, imersão, empacotamento); rentabiliza com **ads recompensados opt-in + compra única que remove ads** (nunca pay-to-win, e como se vende *ausência de ads* o cheat não rouba receita); protege-se com **Via 1** — só a compra e o score de ranking passam pelo servidor (Supabase, zero GCP novo) — e mantém o ranking honesto **sinalizando** o cheater com um selo público em vez de expulsá-lo, deixando o vexame fazer o trabalho; com o **online reservado**, não descartado, pra quando o single provar que é bom.
