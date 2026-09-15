# 🗺️ Prancheta FC! — Rota de Evolução + Subir Online

> **Documento de rota.** Junta as duas análises externas (roadmap por sprints + auditoria de código), a visão-alvo do `regras_jogo_cartas.md`, a especificação do modo online (§3 abaixo), e os gaps de segurança/performance do salto para online.
> **Dois modos de jogo (decidido):** (1) **single-player** offline/local, como hoje; (2) **multiplayer online** — PvP **assíncrono estilo Cartola** (monta o time e a postura; o resultado sai quando a rodada processa no servidor). Não é tempo real. Regras completas na §3.
> **Ordem escolhida:** arrumar a casa primeiro (single-player coerente) → inverter autoridade pro servidor → abrir o mundo compartilhado.
> **Filosofia mantida:** profundidade sim, complexidade e tempo não. Partida rápida, "só mais uma rodada".
>
> **⚑ Marcador de fundação:** trechos marcados com **[FUND-MP]** são fundações que o multiplayer vai exigir — vale implementar já no single-player quando o assunto passar perto, para não retrabalhar depois.

---

## 0. O reenquadramento que muda tudo

Hoje o Prancheta FC é **single-player com nuvem opcional**: o browser calcula o motor, a evolução, o mercado e o saldo, e o Supabase é só um "disco na nuvem" que guarda o que o cliente mandou. Isso é **perfeitamente seguro em single-player** (o jogador só engana a si mesmo) e **completamente inseguro em multiplayer**.

O **modo online** (detalhado na §3) é um **mundo compartilhado**: cada grupo mistura managers humanos e bots, todos começam na Div 10, o processamento diário é o relógio do servidor, e o adversário de cada rodada é o *snapshot tático* de outro jogador. No momento em que dois humanos dividem o mesmo mercado, ranking ou tabela, vale a regra de ouro dos jogos online:

> **O cliente (browser) é território inimigo. Nada que ele diz pode ser confiado. Toda regra que importa é verificada no servidor.**

Subir para online **não é uma feature** — é uma **inversão de quem tem autoridade** sobre as regras. Essa inversão precisa acontecer *antes* do primeiro usuário entrar num mundo compartilhado, não depois.

### Nota de design: estrutura de competição nos dois modos
O **single-player** roda hoje com **4 séries (A/B/C/D)** e assim pode continuar. O **multiplayer** usa a **pirâmide de 10 divisões** (§3) (Div 1 = elite com 2 grupos; Div 10 = base elástica; grupos de 15; nº de grupos dobra a cada nível). Os dois modos compartilham o **mesmo motor de partida e evolução**, mas têm **estruturas de liga diferentes**. Por isso o `CompetitionEngine` precisa virar **configurável por dados** (nº de divisões, tamanho de grupo, regras de acesso/rebaixamento, calendário) — assim o mesmo código serve às 4 séries do single e à pirâmide de 10 do online, sem fork. **[FUND-MP]** A tabela `FORMATO_DIVISOES` (criada na Fase 1) é o embrião disso.

---

## 1. Síntese das análises externas (o que aproveitar, o que adiar)

### Consenso que eu endosso
- **Camada de Rating unificada** (auditoria, gap 3) — separar `overallGlobal / overallPosição / overallRole / rendimento / matchRating`. É a dívida mais valiosa: hoje `overall`, `força`, `forcaEmCampo`, `forcaOnze` e `p.forca` se misturam, e cada sistema novo (Match Rating, moral, mercado) vai pedir "qual a força?" e receber resposta diferente.
- **Substituição usa posição natural do reserva, não o slot tático** (gap 4) — bug real: troca ST→AML e a força cai sem o usuário entender.
- **Expectativa do presidente usa 4-3-3 automático, não a formação real** (gap 7) — o presidente diz "favorito", o time joga mais fraco na formação real, e a confiança pune uma decisão que o presidente elogiou.
- **Evolução "global" fabrica polivalência** (gap 5) — quem fica no banco evolui na melhor posição matemática e troca de identidade. Regra 100%/70%/30% (natural/treinada/improvisada) resolve.
- **Toda a dimensão de segurança/validação** (gaps 10–13) — validação de save, escape de HTML, RLS, versionamento. Correta, mas **subdimensionada para multiplayer** (ver Fase 3).
- **Calibrações numéricas** (`chanceGol *0.03→0.027`, mando percentual) — quick wins de realismo, baratos, mensuráveis pelo harness.

### Onde eu discordo do "P0 = modularizar em ES6"
Ambas as análises põem "quebrar `app.js` em módulos ES6" como pré-requisito. **Eu adiaria**, por três razões concretas:
1. **Contradiz o pipeline atual** — hoje entregamos `prancheta_fc.html` com o JS embutido, validado por `diff app.js == JS embutido`, e os harnesses de Node rodam contra o `app.js` inteiro. Migrar para `<script type="module" src="main.js">` quebra isso: `import/export` não roda via `file://` (CORS), complica abrir o HTML direto, e obriga a reformar entrega + testes.
2. **Benefício indireto, custo alto** — não é feature que o usuário vê; é dias de trabalho com risco de regressão.
3. **O ganho real vem de camadas conceituais, não de arquivos** — criar um objeto `Rating`, um `Regulamentos`, um `CompetitionEngine` **dentro do monolito** entrega 80% do benefício (código coerente, sistemas que não se contradizem) com 20% do risco.

A conclusão correta da auditoria — *"o maior risco não é faltar feature, é a feature existente começar a se contradizer"* — se resolve com **camadas conceituais**, não com 15 arquivos. Modularização de verdade só quando a dor for real (mais gente no projeto, ou um build automatizado).

### O que NÃO mexer agora (as duas concordam)
- Motor estatístico profundo (xG, posse detalhada) — só depois que existir Match Rating + forma. A fórmula arcade atual está coerente com a proposta.
- Editor de times / cores oficiais — cancelado, queima tempo.

---

## 2. A ROTA — fases

Cada fase tem um **objetivo**, **por que agora**, e o **critério de pronto**. As fases 0–1 melhoram o single-player e valem por si; as fases 2+ são o caminho pro online.

---

### 🟢 FASE 0 — Quick wins + coerência do motor (single-player) ✅ CONCLUÍDA
*Arrumar a casa numérica e conceitual. Tudo isto melhora o jogo atual e não depende de servidor.*

**Objetivo:** eliminar as incoerências que a auditoria achou, sem reescrever arquitetura.

- ✅ **Calibração numérica** — medida pelo `harness_calibracao.js` (20k jogos/série, 90 min/jogo, motor real de `chanceGol`).
  - ✅ `chanceGol *0.03 → *0.027` — gols/jogo **2,71 → 2,44** (no alvo ~2,5).
  - ✅ Bônus de mando: de `+40` absoluto para **+7% percentual** sobre o ataque (`MANDO_PCT:0.07`). Escala igual entre séries: spread A/B/C/D cai de **0,020 → 0,011** gols; vantagem de mandante preservada (gols mandante/visitante 1,031x nos dois; domínio 37,8% → 37,2%).
- ✅ **Camada `Rating` (a mais importante da fase)** — objeto único `Rating` (`overallGlobal`, `overallPosicao(pos, role)`, `rendimento`) que delega ao `Motor`; todos os sistemas consultam essa camada. `rendimento` agora aceita slot/role e usa a adequação real da posição (não mais o melhor overall global), então reserva fora de posição não "rende" como titular. Feito **dentro do monolito**.
- ✅ **Corrigir substituição/slot** — o reserva que entra assume `posição = slot de quem saiu` + `role` correspondente (caminho do usuário **e** da CPU); `posicaoNatural` não sobrescreve mais o slot tático. A CPU também passou a avaliar o reserva **no slot que ocuparia**, não no melhor global dele.
- ✅ **Formação real na expectativa** — `forcaDoTime`/`expectativaJogo` usam a escalação/formação atuais (`onzeDe/slotsDe/rolesDe`), não um 4-3-3 fabricado. Mando alinhado ao percentual do motor (`Motor.MANDO_PCT`), inclusive no quick-sim Poisson; `MANDO_FORCA` absoluto removido.
- ✅ **Evolução por tipo de posição** — `Evolucao.fatorPosicaoTreino`: natural 100% / treinada (mesmo setor) 70% / improvisada (outro setor) 30%, multiplicando o ganho por rodada.
- ✅ **Energia menos punitiva** — desgaste de partida de −0,1/min (−9) para −0,078/min (~−7), tirando o saldo negativo por ciclo. Ajuste no motor, sem mexer na UI.

**Pronto quando:** harness mede ~2,5 gols/jogo ✅ (2,43); substituição preserva a força tática ✅; presidente e motor concordam sobre "favorito" ✅ (mesma escalação real + mesmo mando percentual); nenhum jogador troca de identidade no banco ✅ (herda o slot tático). Verificado por `harness_fase0.js` (9/9).

---

### 🟢 FASE 1 — Fundação estrutural leve + performance base (ainda single-player) ✅ PARCIAL (save + config + medição)
*As camadas conceituais que a auditoria pediu, sem big-bang de módulos. E a validação de performance antes de escalar.*

**Objetivo:** dar ao código as fronteiras internas que evitam contradição, e provar que a simulação aguenta o mundo inteiro.

- ✅ **Save legado eliminado** — `SupabaseProvider.salvarJogo/carregarJogo` e o `bootAntigo` morto removidos; o provider é **só fonte de dados**. Save oficial único: `game_save` por `user_id`+`slot`.
- ✅ **`SaveSchema` versionado + validação** — `schemaVersion:8`, `gameVersion`, `createdAt/updatedAt`, `checksum` (djb2). `validateSnapshot()` roda **antes** de `aplicarSnapshot` (myTeam válido, energia/atributos 0–100, confiança 0–100, pids existentes, nenhum time vazio, schema não-futuro). Save inválido é rejeitado sem corromper o estado atual; caller cai em temporada nova.
- ✅ **Tratamento de save quebrado** — time com 0 jogadores (base desatualizada) → rejeita e começa limpo no slot.
- ✅ **Config data-driven de divisões** — `FORMATO_DIVISOES` (tabela); `formatoDe` lê dela e retorna cópia. Estender para 10 divisões vira editar dados. Preparação leve do `CompetitionEngine` sem reescrever comportamento.
- ✅ **Harness industrializado + medição** — suíte roda N temporadas medindo gols/jogo, domínio e tempo.
- ⏳ **`CompetitionEngine`/`Regulamentos` como refatoração completa** — ADIADO por risco: reescrever o núcleo de competição junto com a limpeza de save multiplicaria a chance de regressão. Feita só a preparação leve (tabela de config). Fica para entrega própria, com o harness de temporadas como rede.
- ⏳ **Web Worker** — NÃO feito, por decisão da própria rota ("medir antes"). **Medição:** ~3,75 s/temporada simulando as 156 equipes no motor real (Node). 100 temporadas ≈ 6 min; num celular fraco, pior. **Conclusão: o plano B (motor real só na divisão do usuário + adjacentes, resto Poisson) provavelmente será necessário** — e é muito mais barato que Worker. Decisão registrada para a próxima entrega de performance.

**Pronto quando:** competição é configurável por dados ✅; existe um único caminho de save, versionado e validado ✅; uma temporada inteira roda sem travar (medida: 3,75s/temp no motor real — ativar plano B antes de escalar) ⏳; harness roda N temporadas e reporta métricas ✅.

---

### 🟡 FASE 2 — Inversão de autoridade: o servidor vira dono das regras
*O passo que transforma "single-player na nuvem" em "cliente de um jogo servidor". Sem multiplayer ainda — mas com a arquitetura que o multiplayer exige.*

**Objetivo:** tirar do cliente a autoridade sobre tudo que, no futuro, afetará outros jogadores. Feito ainda com o mundo single-player, pra validar a arquitetura sem risco social.

**O problema concreto que isto resolve:** hoje, com o DevTools aberto, `App.teams[App.myTeam].saldo = 999999999` + salvar = saldo infinito. `App.confianca = 100`. Overall 99 no elenco todo. Nada impede, porque cálculo e autoridade estão ambos no cliente.

- **Operações sensíveis viram RPC no servidor** (Postgres Functions / Edge Functions no Supabase):
  - O cliente **pede** ("comprar jogador `pid` por X"), o servidor **decide** (valida saldo, valida que está à venda, executa a transferência **atomicamente**, retorna o novo saldo). O cliente **nunca escreve saldo direto**.
  - Regra de corte: **o que afeta outro jogador ou um placar público, o servidor decide.** A simulação da sua liga privada pode continuar no cliente por enquanto.
- **Tempo vem do servidor** (`now()` do Postgres) — qualquer cooldown / "1 jogo por dia" nunca conta pelo relógio do cliente (senão o jogador muda o relógio do sistema e pula o tempo). **[FUND-MP]** o calendário de rodadas diárias do online (Div 10 processa primeiro, depois 9…) depende inteiramente de tempo-de-servidor.
- **[FUND-MP] Snapshot tático persistido** — a §3 (modo online) exige que, na rodada, o adversário seja o *snapshot de escalação + postura* que o humano deixou salvo (modelo Cartola: "fechou, fechou"). Isso é uma **estrutura de dados nova** (guardar formação/roles/marcação/titulares de cada jogador por rodada) que **vale já modelar** quando mexermos em escalação/save — no single-player ela serve de histórico; no online, é o que o oponente enfrenta. Desenhar o formato do snapshot agora evita retrabalho.
- **Constraints no banco como segunda muralha** — `CHECK (energia BETWEEN 0 AND 100)`, `CHECK (saldo >= -teto_emprestimo)`, atributos `0–100`. Mesmo uma RPC com bug não grava estado impossível.
- **RLS em toda tabela escrita pelo cliente** — `auth.uid() = user_id`. Remover de vez o conceito `user_id = null` (quebra a ideia de carreira privada).
- **Separar as chaves** — `publishable key` pode ficar no cliente; a **`service_role key` NUNCA** toca o browser (vive só em Edge Function). Misturar as duas vaza o banco inteiro.

**Pronto quando:** editar saldo/atributos no console e salvar **não persiste** (o servidor rejeita); comprar/vender passa por RPC atômica; nenhuma regra de tempo depende do cliente; RLS cobre toda tabela.

---

### 🟡 FASE 3 — Segurança de multiplayer (os vetores que só existem com outros humanos)
*Antes de abrir o mundo compartilhado. Estes ataques não existem no single-player e por isso as análises externas não os cobriram.*

**Objetivo:** fechar os vetores que aparecem quando o dano de um usuário atinge os outros.

- **XSS armazenado — CRÍTICO e urgente** — hoje `innerHTML` com dados do banco é quase inofensivo (times fictícios seus). No momento em que o usuário escolhe **o nome do próprio clube** e esse nome é renderizado na tela de **outro** usuário (ranking, confronto, mercado), `innerHTML` sem escape vira XSS clássico: nomear o time `<img src=x onerror="...">` executa código no browser de todos que virem meu time. **`escapeHTML()` em tudo que vem de outro usuário** deixa de ser boa prática e vira crítico. Provavelmente o gap de segurança mais fácil de explorar no salto pra online.
- **Transações atômicas no mercado** — dois humanos disputando o mesmo atleta / leilão = concorrência. Dois cliques simultâneos em "comprar" sem proteção = vender o mesmo jogador duas vezes ou duplicar dinheiro. Transação no servidor trava a linha, verifica disponibilidade e commita numa só operação. **"Last-write-wins" (ok em save single-player) é inaceitável em economia compartilhada.**
- **Rate limiting / anti-automação** — bot chamando "jogar rodada" mil vezes/min pra farmar dinheiro/XP, ou martelando o mercado. Limites por usuário na **lógica de jogo** ("no máx N rodadas por dia real") — isso é você que implementa no servidor, o rate limit de infra do Supabase não cobre regra de jogo. Protege integridade **e** custo.
- **Anti-conluio / transferências fantasma** — dois amigos: um vende craque pro outro por R$1 = lavagem de recursos entre contas. Defesa: preço mínimo baseado no valor de mercado, ou imposto de transferência. (É a mesma "economia por necessidade" que a auditoria propôs por realismo — aqui vira segurança.)
- **Sybil / bots inflando ranking** — 50 contas que perdem de propósito pra subir a principal. Mínimo: e-mail verificado; desenhar o ranking pra que "vencer contas fracas" valha pouco.
- **Validação server-side de TUDO que o cliente envia** — o `validateSave` client-side pega corrupção acidental mas é **inútil contra atacante** (ele usa `curl`, não seu HTML). A validação que conta está no servidor (RLS + constraints + checagens dentro das RPCs).

**Pronto quando:** nome de clube malicioso não executa nada na tela de terceiros; compra concorrente nunca duplica jogador/dinheiro; existe teto de ações por usuário; transferência abaixo do valor de mercado é bloqueada ou taxada.

---

### 🟠 FASE 4 — Profundidade de carreira (o que engaja da 1ª à 20ª temporada)
*Agora sim, features. Com a base coerente e o servidor no controle, adicionar profundidade é seguro.*

**Objetivo:** dar razões pra voltar todo dia. Reusa o que já existe (potencial oculto, 45 atributos, roles).

- **Match Rating (nota 0–10 por jogo)** — a camada que a auditoria pediu (gap 18). Destrava evolução, moral, valor de mercado, artilharia, jogador da rodada, premiações. Barato, altíssimo retorno.
- **Moral / forma / status no elenco** (titular, reserva, insatisfeito, em ascensão, quer sair) — conecta o que já existe (energia, confiança, potencial) num loop de gestão humana.
- **Comportamento das roles** — hoje role → overall. Próximo nível: role → comportamento na partida (Maestro puxa construção, Ponta Invertido finaliza). Usa atributos que já existem.
- **Mercado por necessidade** — `Oferta = interesse × capacidade financeira × necessidade × reputação`, em vez de 35% de chance fixa. Faz o mundo negociar por motivo. (Também é anti-conluio da Fase 3.)
- **Filtros de busca no mercado + contratos/dispensas** — scouting real usando os 45 atributos; decremento de `contratoMeses`, renovação, free agent ao zerar, dispensa com multa.
- **Estatísticas e gráficos** — artilheiros **durante** a temporada (barato, já temos `gols`), assistências, evolução de valor/saldo.
- **Partida imersiva** — comentários de texto dinâmicos por atributo ("gol de cabeça" se alto `heading`; "golaço de fora" se `long_shots`), posse/finalizações/escanteios, feedback visual de fadiga (piscar vermelho < 40% energia), capitão + cobradores.
- **[FUND-MP] IA "piloto automático" robusta** — o online exige que a IA assuma o time de quem está inativo (escalação + substituições) e o mantenha competitivo por temporadas. Já existe embrião (`escalarMelhor`/`escalarAuto`); **evoluí-la agora no single-player** (IA que respeita formação, faz subs sensatas, gerencia energia) entrega valor imediato ao jogador **e** é exatamente o motor de inatividade que o online precisa. Uma pedra, dois coelhos.

**Pronto quando:** cada jogo gera notas; o elenco tem humor; o mercado reage a necessidade; o usuário faz scouting em vez de comprar por acaso.

---

### 🔵 FASE 5 — Abrir o modo online (PvP assíncrono estilo Cartola)
*O segundo modo de jogo. Só depois que 2–4 estão sólidas. Regras completas na §3.*

**Objetivo:** subir o mundo compartilhado onde o jogador enfrenta o **snapshot tático** de outros humanos, com resultado processado pelo servidor.

- **Modo é separado do single-player** — dois modos distintos partilhando motor e evolução, não o mesmo save. O single continua offline/local.
- **Pirâmide de 10 divisões** (via `CompetitionEngine` data-driven da Fase 1) — Div 1 (2 grupos, elite) … Div 10 (elástica, base); grupos de 15; nº de grupos dobra por nível. Acesso/rebaixamento conforme a tabela da spec.
- **Processamento de rodada no servidor, diário e escalonado** — Div 10 processa primeiro, depois 9, 8… para **diluir a carga** e nunca rodar tudo de uma vez. Motor roda no servidor (Edge Function / job), não no cliente.
- **PvP por snapshot tático** — o adversário é a escalação + postura que o humano deixou salva (a estrutura **[FUND-MP]** desenhada na Fase 2). **Escalação trava no horário da rodada** ("fechou, fechou").
- **Bots elásticos que somem** — Div 10 preenche grupos com bots para nunca ter tabela morta; bots cedem lugar conforme humanos entram. **Regra de Ouro:** bot nunca ocupa vaga de acesso se há humano elegível.
- **Catch-up assíncrono** — novo jogador entra no meio da temporada com 0 pontos e joga as rodadas atrasadas em sequência ("Recuperar Rodada X"), enfrentando o snapshot de cada adversário, até sincronizar com o servidor ("Aguardando Próxima Rodada").
- **Inatividade** — IA assume o time do ausente (a **[FUND-MP]** da Fase 4); pode rebaixar; o jogador retorna sem perder carreira/elenco, na divisão onde a IA o deixou.
- **Transição Div 10 → Div 9** — Ranking Geral de Campeões com desempate Pontos → Saldo → Gols Pró → Confronto Direto (cenários A/B da spec).
- **Mercado no online — EM ABERTO** — ainda não decidido se haverá mercado entre humanos (um vende jogador pro outro) ou se cada um cuida só do seu elenco (evolução + pacotes). Se houver mercado humano, ele **depende** da transação atômica da Fase 3 e do anti-conluio (preço mínimo/imposto). Decidir antes de implementar a Fase 5.
- **Ranking de treinadores** — o end-game; faz sentido com muitos humanos e temporadas.
- **Cartas COM raridade (só no online)** — o modo online usa cartas por raridade (regra 9+2 na escalação, raridade ligada à divisão, pacotes por objetivo), diferente do single-player, onde **as cartas são todas iguais** (sem economia de raridade). Ou seja: os dois modos têm cartas, mas só o online tem o sistema de raridade/coleção. Ver `regras_jogo_cartas.md`.

**Pronto quando:** um jogador cria conta, entra na Div 10 (com bots onde falta gente), joga rodadas diárias processadas no servidor contra snapshots de humanos, recupera rodadas atrasadas se entrou tarde, e sobe a pirâmide sem perder histórico mesmo se ficar ausente.

---

### ⚪ FASE 6 — Escala e operação (quando houver usuários de verdade)
*Não é código de jogo — é o que mantém o jogo de pé e barato.*

- **Backups automáticos do Postgres** + plano de **migração versionada** do banco. Um deploy que corrompe a tabela `player` apaga o progresso de todo mundo. (Você já sabe: trocar a base quebra saves — em produção isso é incidente, não inconveniente.)
- **Denial of Wallet** — hospedagem cobra por uso. Sem rate limit, o atacante não precisa "hackear": chama muito e gera fatura impagável. Rate limiting protege o bolso.
- **LGPD** — ao guardar e-mail/dados de brasileiros reais: base legal pra coletar, botão de deletar conta, não vazar. Desenhar **antes** de ter 10 mil usuários.
- **Monetização (reservado pro futuro)** — modelo pretendido: **grátis para todos**, com **cosméticos/opcionais pagos** eventualmente (nunca pay-to-win, que mataria a integridade competitiva do PvP assíncrono). Não implementar agora; só manter o desenho de dados aberto pra isso (ex.: campo de itens cosméticos por usuário) e evitar decisões que travem essa porta. Cobrar por vantagem competitiva está fora.
- **Observabilidade** — logs de erro (client + server), métricas de uso, alertas de custo.
- **Rostos IA pros cards** (backlog) — Generated Photos / WaveSpeedAI, 128×128, cache, **conferir licença comercial** antes de gerar em lote.

---

## 3. Especificação do Modo Online (regras de negócio)

> **Regras de negócio e game design do modo online.** Sincronização de ligas, recuperação assíncrona, afunilamento piramidal e gestão de inatividade.
> **Natureza:** PvP **assíncrono estilo Cartola** — o jogador monta o time e a postura; o resultado sai quando a rodada processa no servidor. Sem tempo real, sem WebSocket ao vivo.

---

### 1. Estrutura Geral da Pirâmide de Ligas

O modo online opera em pirâmide com acesso/rebaixamento contínuos a cada temporada (**30 dias/rodadas** de calendário real).

- **Capacidade fixa (Divisões 1–9):** o nº de grupos **dobra** a cada nível para baixo, sempre **15 times por grupo**.
- **Divisão 10 (elástica/base):** quantidade **dinâmica** de grupos para absorver novos jogadores a qualquer momento; preenchida com **bots** para fechar tabelas quando necessário.

### Tabela da Pirâmide

| Divisão | Nº de Grupos | Times/Grupo | Total | Acesso (sobem) | Rebaixamento (caem) |
|---|---|---|---|---|---|
| 1 | 2 | 15 | 30 | 0 (elite) | 2 por grupo (4 caem) |
| 2 | 4 | 15 | 60 | 1 por grupo (4 sobem) | 2 por grupo (8 caem) |
| 3 | 8 | 15 | 120 | 1 por grupo (8 sobem) | 2 por grupo (16 caem) |
| 4 | 16 | 15 | 240 | 1 por grupo (16 sobem) | 2 por grupo (32 caem) |
| 5 | 32 | 15 | 480 | 1 por grupo (32 sobem) | 2 por grupo (64 caem) |
| 6 | 64 | 15 | 960 | 1 por grupo (64 sobem) | 2 por grupo (128 caem) |
| 7 | 128 | 15 | 1.920 | 1 por grupo (128 sobem) | 2 por grupo (256 caem) |
| 8 | 256 | 15 | 3.840 | 1 por grupo (256 sobem) | 2 por grupo (512 caem) |
| 9 | 512 | 15 | 7.680 | 1 por grupo (512 sobem) | 2 por grupo (1.024 caem) |
| 10 | Dinâmico | 15 | Variável | 512 melhores | 0 (base, sem queda) |

---

### 2. Entrada no Meio da Temporada e Sistema Catch-Up

Quando um novo usuário cria conta com a temporada em andamento (ex.: mundo na Rodada 6 da Div 10):

- **Início com 0 pontos:** inserido num grupo existente da Div 10, tabela zerada.
- **Modo Recuperação (assíncrono):** libera o botão **"Recuperar Rodada X"**, jogando as partidas atrasadas sequencialmente sem esperar o calendário diário.
- **Mecânica entre partidas:** pode alterar escalação, táticas e trocar jogadores entre as partidas de recuperação, como se vivesse o dia a dia da rodada.
- **Seleção de adversários na recuperação:**
  1. **Humano:** enfrenta o *snapshot tático* (escalação + postura salva) que o adversário humano usou no dia oficial.
  2. **Bot:** se o adversário era bot ou não há snapshot válido, o sistema escala o **bot de melhor desempenho** do grupo naquela rodada.
- **Sincronização com o mundo:** ao alcançar a rodada atual do servidor, o botão muda para **"Aguardando Próxima Rodada"** e o jogador passa a rodar 1 partida/dia no fluxo normal.

---

### 3. Transição de Acesso: Divisão 10 → Divisão 9

A Div 9 tem **512 vagas** de acesso (os 2 rebaixados de cada um dos 256 grupos). A transição segue o **Ranking Geral de Campeões**:

- **Cenário A (> 512 grupos na Div 10):** consolida uma Tabela Geral com todos os campeões de grupo; sobem os **512 primeiros** pelos critérios de desempate: **Pontos → Saldo de Gols → Gols Pró → Confronto Direto**.
- **Cenário B (< 512 grupos na Div 10):** todos os campeões sobem; as vagas restantes são preenchidas pelos **melhores 2º colocados humanos** da Div 10.
- **Regra de Ouro dos Bots:** bots da Div 10 **nunca** ocupam vaga de acesso à Div 9 se houver humanos ativos elegíveis.

---

### 4. Inatividade e Ausência de Usuários

Para não travar as ligas nem criar grupos mortos:

- **Invocação de IA (piloto automático):** usuário inativo (sem logar por 1+ rodadas) → a IA assume escalação e substituições pelas regras padrão do motor.
- **Rebaixamento por inatividade:** o time sob IA segue disputando; se pontuar pouco, cai a cada fim de temporada.
- **Retorno do jogador:** ao logar após ausência, encontra o clube na divisão para a qual a IA o levou (podendo ter caído até a Div 10), **sem perda de histórico de carreira nem elenco** — recomeça imediatamente.

---

### Decisões de produto do modo online (respondidas)

- **Dois modos de jogo:** single-player (offline/local, como hoje) **e** multiplayer online. Serão dois modos distintos.
- **Multiplayer é PvP assíncrono estilo Cartola:** monta o time, resultado sai no processamento da rodada.
- **Rodadas diárias, escalonadas por divisão ao longo do dia** (Div 10 processa primeiro, depois 9…) para diluir a carga — nunca todos os jogos ao mesmo tempo.
- **Escalação trava no horário da rodada** (fechou, fechou — modelo Cartola).
- **Bots preenchem no começo e somem conforme entram humanos reais** (Div 10 elástica).
- **Cartas com raridade (exclusivo do online):** o online usa cartas por raridade (regra 9+2, raridade ligada à divisão, pacotes por objetivo). O single-player também tem cartas, mas **todas iguais** — sem economia de raridade.
- **Mercado entre humanos: EM ABERTO** — ainda não decidido se um jogador vende jogador pro outro (exigiria transação atômica no servidor + anti-conluio) ou se cada um cuida só do seu elenco via evolução/pacotes.
- **Monetização (futuro):** grátis para todos, com cosméticos/opcionais pagos eventualmente. **Nunca pay-to-win** — cobrar por vantagem competitiva está fora, para não quebrar a integridade do PvP assíncrono.

## 4. Plano de ataque — por onde começar

A ordem que concilia "arrumar a casa" com o destino online:

**Primeiro (valem por si, melhoram o single-player):**
1. ✅ Calibrações numéricas (`0.027`, mando %) — feito e medido no harness (2,71 → 2,44 gols/jogo).
2. Camada `Rating` + substituição/slot + formação real na expectativa — resolve as maiores incoerências da auditoria.
3. Auditar/eliminar save legado + `SaveSchema` validado — pré-requisito de tudo online.

**Depois (a virada arquitetural):**
4. Medir performance de uma temporada inteira; ativar plano B se travar (Worker só se preciso).
5. Inverter autoridade: primeira RPC atômica (comprar/vender) + tempo do servidor + RLS + constraints.

**Antes de abrir pra humanos (inegociável):**
6. `escapeHTML` em todo dado renderizável de usuário.
7. Transação de mercado atômica + rate limiting.

**Só então:** profundidade (Match Rating, moral, mercado por necessidade) e a abertura do mundo compartilhado.

---

## 5. Resumo brutal em uma frase

> As duas análises deixam o **single-player mais coerente**; mas o salto pra online **não é uma feature, é uma inversão de quem tem autoridade sobre as regras** — e essa inversão (servidor decide, cliente pede) precisa acontecer **antes do primeiro humano entrar num mundo compartilhado**, com `escapeHTML`, transações atômicas e tempo-de-servidor como o mínimo inegociável.

---

## 6. Forma de multiplayer — DECIDIDO ✅

**Decisão:** dois modos de jogo. Single-player (offline/local) **e** multiplayer online **PvP assíncrono estilo Cartola** — o jogador monta o time e a postura, o resultado sai quando a rodada processa no servidor. **Não** é tempo real.

Por que essa é a escolha certa (era a coluna recomendada da análise abaixo):

| | **Assíncrono estilo Cartola** ✅ escolhido | **PvP tempo real** (2 managers ao vivo) |
|---|---|---|
| **Esforço de servidor** | Médio — job de rodada, RPCs de mercado | Alto — WebSocket, estado ao vivo, anti-lag |
| **Anti-cheat** | Autoridade no servidor resolve quase tudo | Muito mais difícil (sincronizar estado ao vivo sem confiar no cliente) |
| **Fidelidade à visão** | **Altíssima** (a spec online é exatamente isto) | Baixa (as regras não pedem tempo real) |
| **Custo de infra** | Baixo/previsível | Alto (conexões persistentes) |
| **Ritmo "só mais uma rodada"** | Preserva (joga quando quer) | Quebra (precisa achar oponente online) |

**Mecânica confirmada** (detalhe na §3):
- Rodadas **diárias, processadas no servidor**, escalonadas por divisão (Div 10 primeiro, depois 9…) para diluir a carga.
- Adversário = **snapshot tático** do humano; escalação **trava no horário da rodada** ("fechou, fechou").
- **Bots elásticos** preenchem no começo e cedem lugar conforme humanos entram; bot nunca toma vaga de acesso de humano.
- **Catch-up assíncrono** para quem entra no meio da temporada; **IA piloto-automático** para inatividade, sem perda de carreira.
- **Cartas nos dois modos, com diferença:** offline usa cartas **todas iguais** (gestão pura, sem raridade); online usa cartas **com raridade** (regra 9+2, raridade por divisão, pacotes). O sistema de coleção/raridade é exclusivo do online.
- **Mercado entre humanos no online: EM ABERTO** — decidir antes da Fase 5 se um jogador vende pro outro (exige transação atômica + anti-conluio) ou se cada um cuida só do seu elenco.
- Se um dia quiser **PvP ao vivo**, entra como modo/evento à parte — nunca como fundação.

---

## 7. Fundações do multiplayer a plantar cedo (resumo [FUND-MP])

Coisas que o online vai exigir e que **vale implementar já no single-player** quando o assunto passar perto — dão valor imediato ao modo atual e evitam retrabalho depois:

1. **`CompetitionEngine` data-driven** (Fase 1, iniciado) — mesmo código serve às 4 séries do single e à pirâmide de 10 do online. `FORMATO_DIVISOES` é o embrião; estender para descrever grupos de 15, nº de grupos por nível, e regras de acesso/rebaixamento por divisão.
2. **Snapshot tático persistido** (Fase 2) — guardar formação + roles + marcação + titulares por rodada. No single vira histórico/replay; no online é **o que o oponente enfrenta**. Desenhar o formato agora.
3. **Tempo-de-servidor** (Fase 2) — nunca confiar no relógio do cliente para calendário/cooldown. O processamento diário escalonado do online depende disso.
4. **IA piloto-automático** (Fase 4) — IA que escala, substitui e gerencia energia de forma competente. No single melhora a experiência; no online é o motor de inatividade.
5. **Separação motor ↔ estado ↔ UI** (camadas conceituais, sem modularizar em ES6) — para o mesmo motor rodar no cliente (single) e no servidor (online) sem fork. Começou com a camada `Rating` (Fase 0) e `FORMATO_DIVISOES` (Fase 1).

> Regra prática: quando uma tarefa do single-player tocar num destes cinco pontos, implementar já pensando no formato que o online vai querer — não "gambiarra pro single e refaz depois".

---

---

# Histórico de implementação

## Fase 1 — Save único + SaveSchema + config data-driven + medição (09/2026)

**Entregue:** `prancheta_fc.html` reinjetado (`app.js` == JS embutido, conferido por diff).
**Testes:** harness_fase1 26/26; regressão de divisões 10/10; features 27/27.

### O que foi feito
- **Gap crítico nº 1 (dois sistemas de save) fechado.** Confirmado por auditoria que havia dois caminhos vivos: o legado (`SupabaseProvider.salvarJogo/carregarJogo`, `slot:'default'`, `user_id:null`) e o oficial (`game_save` por `user_id`+`slot`). Removido o legado inteiro + o `bootAntigo` morto + os call-sites (`carregarSupabase` e a conexão manual da aba Dados). Risco de "salva por um caminho, carrega por outro" eliminado.
- **SaveSchema.** `snapshot()` agora carrega `schemaVersion`/`gameVersion`/`createdAt`/`updatedAt`/`checksum`. `validateSnapshot(s)` trata o save como dado não confiável e checa estrutura e faixas antes de aplicar. `aplicarSnapshot` retorna `{ok,motivo}` e **não toca no estado** se a validação falhar. `carregarSlot` e `importSave` reagem ao resultado (temporada nova / mensagem de erro). O checksum é anti-corrupção, **não** segurança (o cliente pode recalcular — a validação de verdade será server-side na Fase 2).
- **Config data-driven.** `FORMATO_DIVISOES{A,B,C,D}` centraliza tipo/acessos/rebaixa; `formatoDe` lê da tabela e devolve cópia (nenhum caller muta a config global). A regra da Série C (cai 6, casando com os 6 acessos da D) agora vive na tabela, documentada — não se perde numa "correção" futura.
- **Medição de performance (a rota pedia medir antes de otimizar).** ~3,75s por temporada completa no motor real das 156 equipes (Node headless). Gols/jogo 2,59 (perto do alvo 2,5, ainda **sem** o ajuste `0.027` da Fase 0). 8 campeões distintos da Série A em 10 temporadas (liga não dominada). Tamanhos 20/20/20/96 estáveis após as viradas.

### O que foi adiado (e por quê)
- **Refatoração completa `CompetitionEngine`/`Regulamentos`** e **migração para 10 divisões**: é reescrita de núcleo; juntar com a limpeza de save numa entrega só é arriscado. Feita só a preparação leve (tabela de config). Próxima entrega dedicada.
- **Web Worker**: a medição indica que o **plano B** (motor real só na divisão do usuário + adjacentes) resolve com uma fração do custo. Worker só se o plano B não bastar.
- **Modularização ES6**: mantida fora por ora — quebraria o pipeline de HTML embutido + harnesses; o ganho vem de camadas conceituais dentro do monolito (já iniciadas com `FORMATO_DIVISOES`).

### Armadilhas conhecidas (não repetir)
- O `checksum` do save é anti-corrupção, não segurança. Nunca confiar nele contra adulteração — isso é papel do servidor (Fase 2).
- `validateSnapshot` roda contra `this.teams` já carregado do banco; se a base mudar (pids novos), saves antigos são rejeitados por design (base desatualizada) e o jogo começa limpo no slot em vez de quebrar.
- A tabela `FORMATO_DIVISOES` tem invariante: `acessos` de uma divisão = `rebaixa` da de cima. Quebrar isso faz os tamanhos das séries derivarem (o harness de divisões pega).

---

## Entrega — Calibração da Fase 0 (harness + `*0.027` + mando percentual)

### O que foi feito
- **Harness de calibração (`harness_calibracao.js`).** Roda o loop minuto-a-minuto real do motor (`chanceGol` × 90 min) em 20k jogos por série (A/B/C/D), varrendo forças de time realistas e os três estilos. Reporta gols/jogo global e por série, spread entre séries, domínio do mandante e razão gols mandante/visitante. Serve de rede para qualquer mexida futura no motor de gol.
- **Baseline medido (código anterior, `*0.03` + mando `+40` absoluto):** **2,706 gols/jogo**; spread A/B/C/D 0,020; mandante 37,8% / empate 26,2% / visitante 36,0%; razão mando 1,031x.
- **Calibração aplicada (`*0.027` + mando `+7%` percentual, `MANDO_PCT:0.07`):** **2,436 gols/jogo** (no alvo ~2,5 do roadmap); spread A/B/C/D 0,011 (mando percentual escala mais uniforme entre séries); mandante 37,2% / empate 27,6% / visitante 35,2%; razão mando 1,031x (vantagem de casa preservada).
- **Prova do que o roadmap pedia:** o multiplicador puxou o gols/jogo de 2,71 para 2,44 (estabiliza ~2,5) e o mando virou percentual sem perder a vantagem de casa, com spread entre séries menor — exatamente os dois efeitos previstos na Fase 0.
- Alteração espelhada no `app.js` **e** no `prancheta_fc.html` embutido (invariante `diff app.js == JS embutido` mantido).

### Armadilhas conhecidas (não repetir)
- `MANDO_PCT` é propriedade do objeto `Motor`; `chanceGol` lê `this.MANDO_PCT`. Se o método for chamado desatrelado do objeto (`const f = Motor.chanceGol; f(...)`), `this` se perde — sempre chamar como `Motor.chanceGol(...)`.
- O harness mede `chanceGol` isolado (força de time amostrada), não uma temporada inteira no motor de 156 equipes; os números batem com o alvo, mas a medição de temporada completa (Fase 1, ~2,59 antes do ajuste) é o número de sistema, não o de unidade.

---

## Entrega — Fase 0 concluída (Rating + substituição + expectativa + evolução + energia)

### O que foi feito
- **Camada `Rating`.** Objeto único (`overallGlobal`, `overallPosicao(pos, role)`, `rendimento`) que delega ao `Motor`; os sistemas passam a consultar essa camada em vez de recalcular. `Motor.rendimento(p, slot, role)` agora usa a adequação real do slot — antes usava `p.forca` (melhor overall global), o que fazia reserva fora de posição "render" como titular.
- **Substituição/slot.** Reserva que entra herda o slot tático de quem saiu (`posicao` + `role`), no caminho do usuário **e** da CPU (antes ambos gravavam `entra.posicao`, a posição natural). A CPU também passou a pontuar o reserva no slot que ocuparia (`Motor.rendimento(res, slot, role)`), não no melhor global dele.
- **Formação real na expectativa.** `forcaDoTime` usa a escalação/formação atuais (`onzeDe/slotsDe/rolesDe`) quando há onze montado; só cai no auto-escalar (com a formação escolhida, não 4-3-3 fixo) como fallback. Mando unificado no percentual `Motor.MANDO_PCT` em `expectativaJogo` e no quick-sim Poisson; constante `MANDO_FORCA` absoluta removida.
- **Evolução por tipo de posição.** `Evolucao.fatorPosicaoTreino(p, posAlvo)`: natural 100% / treinada (mesmo setor DEF/MEI/ATQ) 70% / improvisada (setor diferente) 30%, multiplicando o ganho por rodada.
- **Energia.** Desgaste de partida de −0,1/min (−9 na cheia) para −0,078/min (~−7), removendo o saldo negativo por ciclo. Ajuste de motor, UI intocada (decisão do Dart).
- **Harness de comportamento (`harness_fase0.js`).** Carrega o `app.js` real num sandbox (stubs de DOM) e afirma: Rating diferencia posição, substituição preserva o slot, evolução escala por tipo de posição. **9/9 checks.**
- Tudo espelhado no `prancheta_fc.html` embutido (invariante `diff app.js == JS embutido` verificado: 211.627 bytes idênticos).

### Verificação
- `harness_fase0.js`: 9/9 (Rating, substituição, evolução).
- `harness_calibracao.js`: gols/jogo 2,71 → 2,43 (calibração intacta).
- `node --check app.js`: OK.

### Armadilhas conhecidas (não repetir)
- `Rating`/`Motor`/`Evolucao` são `const` léxicos (não caem no `globalThis`). Pra testar em Node, o harness reexecuta o `app.js` com um trecho que exporta esses bindings pro sandbox — não dá pra `require` direto.
- `forcaDoTime` só usa a escalação real se `onzeDe(ti).length>=7`; abaixo disso (time incompleto) cai no auto-escalar. Se mudar o mínimo, conferir que a expectativa não quebra em times recém-montados.
- Evolução: `fatorPosicaoTreino` depende de `p._posNat`, populado por `Evolucao.inicializar`. Jogador sem âncora inicializada calcula a posição natural na hora (fallback) — mais caro, mas correto.
