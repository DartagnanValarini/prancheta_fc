# Análise de concorrentes — RetroFoot e Browserfoot (09/2026)

> Jogado de verdade no navegador em 26–27/09/2026: **uma temporada completa do Browserfoot** e **uma temporada do RetroFoot** (conta de teste, plano grátis "Peladeiro").
> Prints em `docs/concorrentes/prints/`. Fontes públicas no fim.
> Objetivo: saber onde o Prancheta FC! ganha, onde perde e o que copiar/evitar — ligado aos buracos do `roadmap_singleplayer.md` §0.

---

## TL;DR

| | **RetroFoot** | **Browserfoot** | **Prancheta FC!** |
|---|---|---|---|
| Entrada | Conta obrigatória + onboarding de **8 passos** | **Zero** (sem login, save local) | Zero (convidado/localStorage) |
| Modelo | 1ª temporada grátis → **Pro R$ 19,90/mês** (R$ 14,90 anual) | Grátis + ads programáticos (Clever Advertising) | Grátis + ads, compra única remove-ads |
| Clubes | Reais, pelo **apelido da torcida** + escudo próprio ("Elefante Potiguar") | **Nomes reais** (Flamengo, Uberlândia…) — risco jurídico | — |
| Escolha de clube | **Sorteio obrigatório**, sempre começa na Série D | Escolhe qualquer um dos 80 | — |
| Partida | Camarote: estádio pixel art, barra de pressão, narração com texto, estatísticas completas, coletiva pós-jogo | Lista seca de eventos, sem campo | Motor minuto-a-minuto calibrado |
| Economia | **Coerente**: craque custa R$ 17–547 mi, contador NPC projeta o caixa | **Quebrada**: veterano OVR 76 da Série A por R$ 163 mil; vende reserva de R$ 5 mil por R$ 61 mil | — |
| Multiplayer | "Modo Resenha" — **ainda não lançado** ("em breve", só Pro) | Não | Fora de escopo |
| Plataforma | Web (React + Supabase + Stripe) | Web (React, save localStorage ~1,8 MB) | Web + **app Play Store (Capacitor)** |
| Minha temporada | Distrito Central (sorteado): **20º/20, 3V 6E 29D, −94** — rebaixado; ~45 min | Uberlândia (escolhido): **campeão da Série D** fácil; ~10 min | — |
| Base ativa | Ranking global com **78 treinadores** | ~3 mil partidas nas primeiras 36 h (06/2026) | — |

**Leitura em uma frase:** o Browserfoot ganha na *entrada* (10 segundos até o primeiro jogo), o RetroFoot ganha em *tudo depois da entrada* (partida, economia, narrativa). O Prancheta pode ter as duas coisas: entrada sem atrito **e** profundidade — e ainda sair na loja de apps, onde nenhum dos dois está.

---

## 1. RetroFoot (retrofoot.com.br) — v2026.01

### 1.1 Onboarding (8 passos)

1. Criar conta (nome, e-mail, WhatsApp opcional p/ entrar no grupo da comunidade, senha checada contra vazamentos) — `prints/retrofoot/01_home.jpg`
2. Modo: Solo ou Resenha ("em breve", só Pro) — `03_onboarding_modo.jpg`
3. Começar jogo novo
4. País — só Brasil por enquanto; pirâmide com nomes próprios: **Liga Soberana (A), Liga Acesso (B), Liga Impulso (C), Liga Raiz (D)**. "Ninguém começa em cima" — `04_piramide_divisoes.jpg`
5. **Moeda**: Real, Euro ou Dólar (só cosmético de conversão) — `05_moeda.jpg`
6. Treinador: nome, idade (25–75), **rosto obrigatório** (foto, IA "em breve" ou faces prontas; masculino/feminino) — `06_avatar_treinador.jpg`
7. Sorteio do clube — `07_clube_sorteado.jpg`
8. Carregamento com **anúncio patrocinado** (Moda EC, loja de camisas retrô) + boas-vindas com **estádio isométrico em pixel art** e cena de apresentação — `08_loading_patrocinado.jpg`, `09_boas_vindas_estadio.jpg`

Depois ainda vem a **cerimônia do sorteio das copas** (Copa da Federação, Liberta Cup, Clubes da América) com troféus renderizados e premiação por fase (Liberta: US$ 31,2 mi ao campeão; Copa da Federação: R$ 36,4 mi) — `10_cerimonia_sorteio_copa.jpg`, `26_cerimonia_copa_federacao.jpg`.

⏱️ Do clique em "Começar carreira" ao primeiro jogo: **~3 minutos**, com cadastro. No Browserfoot: **~10 segundos**.

### 1.2 Hub e escalação
- Tela única com **Formação / Elenco / Jogo**; letreiro com o **ranking global de treinadores** passando no topo (o 1º tinha 10.512 pts; eu entrei em #76) — `11_hub_formacao.jpg`
- 6 formações + **Auto** + **11+ Melhores** + **"Seleccionar descansados"** (energia por jogador, 0–100)
- Força dos jogadores numa escala de **0 a ~100** (meu time da Série D: 7–14)
- Calendário por **dia** (semana DOM–SAB); jogos no sábado, copa no meio da semana
- Placas "ANUNCIE AQUI" vazias no rodapé = inventário de mídia ainda não vendido — `12_hub_anuncie_aqui.jpg`

### 1.3 Partida ("Camarote")
- Placar sobre o **estádio em pixel art**, relógio, **barra de pressão** ("Águia do Vale PRESSIONA" / "JOGO EQUILIBRADO"), público pagante — `13_partida_camarote.jpg`
- Narração com texto de verdade ("Emerson Melo tabela, entra na área e finaliza no cantinho")
- Estatísticas: posse/domínio, finalizações, no alvo, defesas, cartões, substituições; ficha com árbitro
- **Intervalo**: tela de substituição com foto, energia e força de cada jogador — `14_substituicao_intervalo.jpg`
- Velocidade: Curto (~30 s) grátis; Ultrassônico (~10 s) só Pro

### 1.4 Coletiva pós-jogo ⭐
Depois do jogo: **3 perguntas de um repórter com nome** (ex.: "Kevin Campos, TV Bandeirantes do Vale"), cada uma com 2–3 respostas de perfil (Protetor / Direto / Técnico / Abraço / Institucional / Firme / Contido). Cada resposta mexe em **moral do time, segurança no cargo e reputação**, e a repercussão aparece na imprensa e na torcida — `19_coletiva_pos_jogo.jpg`.
É barato de fazer (texto + 3 números) e dá personalidade ao jogo.

### 1.5 Mercado ⭐⭐
- Abas: Comprar, Vender, **Leilão** (8 lotes, lance fecha em data), Propostas, Contrapropostas, Transferências — `17_mercado.jpg`
- Filtros: país/divisão (Brasil, Argentina, Chile, Uruguai, Paraguai, Peru, Colômbia, Equador, Venezuela, Bolívia, Alemanha, Itália, Inglaterra, Espanha, Portugal), posição, força, idade, **"o que cabe no caixa" / "até metade do caixa"**, nacionalidade (**cota de estrangeiros**), clube
- **Negociação em 3 etapas** — `22–24_negociacao_*.jpg`:
  1. **Taxa** com o clube, com piso explícito ("abaixo de R$ 3,27 mi o clube recusa direto")
  2. **Salário** com o empresário — o "mínimo" mostrado não é o real; recusou R$ 39 mil e pediu R$ 49,4 mil
  3. **Fechar**, com aviso de risco ("83% de chance de se aposentar até o fim da temporada")
- **Contador NPC** (Joaquim Serrano) em cada etapa: caixa depois, variação por rodada e **projeção de fim de temporada** ("o ano termina em −R$ 1,38 mi"). É o melhor elemento de UX do gênero que já vi: impede a compra burra sem proibir.
- Propostas recebidas mostram **impacto antes de aceitar**: caixa, folha, força do ataque/meio e provável substituto.
- Negociação leva dias do calendário ("Negocie os termos pessoais — Dia 2").

### 1.6 Monetização
- **Paywall por tempo**: o grátis é **uma temporada**; da 2ª em diante só no Pro. O upsell aparece **logo depois do 1º jogo** — `16_upsell_pro_pos_jogo.jpg`
- Pro: temporadas/carreiras ilimitadas, save na nuvem, Ultrassônico, selo Pro, acesso ao Resenha "quando lançarmos"
- Stripe (cartão/Pix)
- Mídia vendida direto: tabela pública de R$ 235 a R$ 5.000/mês (leaderboard R$ 1.750, placas do campo R$ 540, cota Resenha R$ 235); números de audiência "sob consulta"
- Aquisição: ~10 páginas SEO comparativas ("Brasfoot vs RetroFoot", "vs Football Manager"…), vídeos de resenha com streamers, grupo de WhatsApp

### 1.7 Ranking de treinadores (público)
Vitória 3 / empate 1 (liga e copa; pênaltis = empate); fator de divisão na liga (A 100%, B 90%, C 80%, D 70%); +10 por temporada terminada; títulos: Libertadores 160, Série A 130, Copa do Brasil 112, Sul-Americana 100, B 58, C 46, D 43. Recortes **dia / semana / mês / sempre**. Opção de sair da lista pública.

### 1.8 Temporada jogada — Distrito Central (Série D)

| | |
|---|---|
| Clube sorteado | Distrito Central ("Liga Raiz" / Série D, 20 clubes, 38 rodadas) |
| Liga | **20º de 20 — 15 pts, 3V 6E 29D, 21 gols pró × 115 contra (−94)** → rebaixado |
| Copa da Federação | Eliminado cedo |
| Caixa | R$ 1,1 mi → pico de R$ 3,7 mi → **R$ 1,7 mi** para a próxima (1 reforço: atacante força 40 por R$ 1,34 mi + R$ 49 mil/rodada) |
| Treinador | Segurança no cargo 17% (não foi demitido), reputação "4 de 5", ranking **#76 → #35** |
| Duração | ~45 min de relógio para a temporada, mesmo com a partida no tempo "Curto" |

O que aconteceu, em ordem:
- **Formação "Auto" (4-3-3)**: 5 jogos, 1 ponto, 2–15. A **diretoria chamou para conversar** ("o clima azedou"; 2 perguntas de múltipla escolha, segurança 29%) — `27_diretoria_crise.jpg`
- Troquei para **4-5-1**: 3 vitórias seguidas. Depois o time voltou a perder — elenco esgotado (energia média < 65%) e a força do clube sorteado era baixa demais (campeão fez 90 pts; o penúltimo, 17).
- **Fim de temporada** com arte em pixel art de muro pichado ("Fora, mercenário", "devolve o dinheiro do ingresso") e o que muda na próxima: divisão de baixo, salários acima do teto, reunião para aprovar plano de reconstrução — `30_fim_temporada_rebaixamento.jpg`
- **Paywall**: diagnóstico personalizado ("a defesa levou 115 gols — zagueiro e goleiro são os reforços que mais valem pontos"), oferta Pro, e **"Ganhar 1 temporada grátis — dar minha opinião"** (feedback em troca de mais uma temporada) — `31_paywall_fim_temporada.jpg`

Outros achados jogando:
- **Rodadas obrigatórias de copas das quais você não participa** ("Liberta Cup — sem jogo seu"): o botão do hub vira "Assistir" e é preciso passar por elas. É o maior ralo de tempo do jogo.
- **Semana ≠ rodada**: 42 semanas para 38 jogos; nas últimas o botão vira "Avançar" várias vezes seguidas sem jogo.
- **Ranking global tem só 78 treinadores** com pontos (o 1º, "GRINGO", tem 10.543 pts contra 933 do 2º — provável conta de teste/dev). Uma temporada péssima me levou de #76 a #35: o ranking premia volume, não desempenho. Base ativa pequena.
- Mercado mundial real: Brasil A–D, 9 ligas sul-americanas e Alemanha/Itália/Inglaterra/Espanha/Portugal; **cota de estrangeiros**.

### 1.9 Problemas / inconsistências
- **Resenha vendida como pronta** nas páginas de SEO, mas "em breve" dentro do jogo; quem assina hoje paga só temporadas extras + Ultrassônico.
- Tamanho da sala muda por página: 3–8, até 10, até 20.
- "Grátis" = demo de 1 temporada; o upsell no 1º jogo é agressivo.
- Onboarding longo; foto do treinador **obrigatória**.
- Formação "Auto" fraca: 5 jogos, 1 ponto, 2–15 no saldo.
- **Sorteio pode dar um time sem chance** (−94 de saldo) — frustrante na única temporada grátis, justo antes do paywall.
- Temporada longa (~45 min) por causa das rodadas "Assistir" de copas alheias.
- Bugs: card da competição diz "MEIO DE TABELA" em 20º de 20; ficha do clube conta 76 jogos em vez de 38; reputação 4/5 com 13% de aproveitamento; nome de arquivo "1.png" visível na arte do fim de temporada; o "mínimo" salarial exibido não é o real.
- Termo em PT-PT ("Seleccionar descansados").

---

## 2. Browserfoot (browserfoot.com.br) — v6

Lançado em 06/2026 por Eric Arraché (Critical Hits); ~3 mil partidas nas primeiras 36 h.

### 2.1 Temporada jogada — Uberlândia (Série D)

| Etapa | Resultado |
|---|---|
| Estadual MG (10 times, 9 rodadas, top 4) | 3º na fase; perdi a semi (0–1 Athletic) e o 3º lugar nos pênaltis → 4º, R$ 5 mil |
| Série D (38 rodadas) | **Campeão** — 66 pts, 18V 12E 8D, saldo +8, acesso |
| Copa (128 times) | Venci o Juventude (1–0), caí para o Fluminense (0–1) nos 32-avos |
| Caixa | R$ 350 mil → **R$ 1,1 mi** |

### 2.2 Como funciona
- Sem login; 3 slots no localStorage; login Google opcional p/ nuvem — `prints/browserfoot/01_home_escolha_time.jpg`
- Escolhe o clube livremente (80 times; 91 da Série D sorteados 20 por vez); opção de pular o Estadual
- Calendário: **Estadual** (pré-temporada) → Série (38 rodadas) → Copa (128 times) → **renovações** com pedido salarial do jogador → nova temporada — `02_estadual.jpg`
- Escalação: 6 formações, 3 mentalidades, Ideal / Melhores / **Otimizar (IA)**; OVR + tendência (↗↘), moral, salário, contrato — `03_escalacao.jpg`
- Partida: placar + lista de eventos (falta, escanteio, cartão, gol); **área do campo fica vazia**; velocidades 90 s → Ultra 12 s; simular rápido; **simular a temporada inteira** — `04_partida_ao_vivo.jpg`, `05_pos_jogo.jpg`
- Finanças: TV, patrocínio, bilheteria ligada ao humor da torcida (−25% a +20%), bônus por resultado pago por jogo, 3 empréstimos (12%/8%/5% a.m.), obras no estádio
- Mercado: abre a cada 4 rodadas, máx. 3 propostas por jogador, agentes livres com luvas — `06_proposta_compra.jpg`, `07_mercado.jpg`
- Botão **Compartilhar** resultado

### 2.3 Problemas encontrados jogando
1. **Economia quebrada**: recebi R$ 61 mil por lateral de valor R$ 5 mil; oferta de 70% do valor aceita de primeira; **veterano da Série A (OVR 76) por R$ 163 mil** num time de Série D → campeão na 1ª temporada sem esforço.
2. **Divisões niveladas demais**: time da Série D terminou o Estadual acima do Atlético-MG (Série A).
3. **Caixa só cresce** (R$ 350 mil → R$ 1,1 mi), sem pressão financeira.
4. Bugs: artilheiro com 1 gol após 38 rodadas (via "Simular tudo"); "Otimizar" pôs lateral de zagueiro; "~47 mêses".
5. **Nomes reais de clubes** = risco jurídico.

---

## 3. O que isso significa pro Prancheta FC!

### Onde já estamos à frente
- **Entrada sem cadastro** (como o Browserfoot) — manter conta opcional, pedida só no ranking e na compra.
- **Grátis de verdade** (sem paywall de temporada) + remove-ads único → o pitch "o jogo inteiro, sem assinatura" bate direto no ponto fraco do RetroFoot.
- **App na Play Store** — nenhum dos dois está lá.
- **Anti-cheat com selo público** no ranking.

### Copiar/adaptar (priorizado, ligado ao roadmap §0)
| # | Ideia | De onde | Buraco do roadmap | Esforço |
|---|---|---|---|---|
| 1 | **Contador NPC** na compra/renovação: caixa depois, variação por rodada, **projeção de fim de temporada** | RetroFoot | Mercado/Finanças | Baixo — só UI sobre números que já temos |
| 2 | **Coletiva pós-jogo** (3 perguntas, respostas por perfil → moral/cargo/reputação) | RetroFoot | ❌ Moral/forma/status | Baixo-médio |
| 3 | **Teto de preço coerente + recusa de craque por clube pequeno** e teste automatizado de balanceamento (10 temporadas com IA gananciosa medindo caixa/OVR) | lição do Browserfoot | Mercado | Médio (harness no padrão `harness_*.js`) |
| 4 | **Barra de pressão + estatísticas ao vivo + narração com texto** | RetroFoot | Estatísticas de temporada / Match Rating | Médio |
| 5 | Filtros **"o que cabe no caixa"** no mercado | RetroFoot | Mercado | Baixo |
| 6 | **Estadual como pré-temporada** (pulável) | Browserfoot | Competição | Médio |
| 7 | **Renovação com pedido do jogador** + "caixa dura X meses" | Browserfoot | Mercado/contratos | Baixo |
| 8 | **Ranking com recortes dia/semana/mês** (quem está começando aparece) | RetroFoot | Ranking C3 | Baixo (views no Supabase) |
| 9 | **Placas do campo** como espaço de anúncio/cosmético | RetroFoot | Rentabilização | Baixo |
| 10 | Botão **Compartilhar** resultado | Browserfoot | Aquisição | Baixo |
| 11 | Clubes pelo **apelido da torcida** | RetroFoot | Base de dados | — |
| 12 | **Reunião com a diretoria** quando a segurança no cargo cai (2 perguntas → efeito) + fórmula explicada ("70% posição, 30% moral") | RetroFoot | Objetivos por divisão | Baixo |
| 13 | **Tela de fim de temporada com diagnóstico** ("a defesa levou 115 gols — reforce zaga e gol") — serve de tutorial disfarçado | RetroFoot | ❌ Onboarding | Baixo |
| 14 | **Feedback em troca de recompensa** (no nosso caso: X dias sem anúncio) | RetroFoot | Rentabilização | Baixo |

### Evitar
- Paywall por tempo e upsell no 1º jogo (RetroFoot).
- Onboarding longo, foto obrigatória.
- Prometer multiplayer que não existe.
- Nomes reais de clubes (Browserfoot).
- Economia sem teste de balanceamento (Browserfoot).
- Obrigar o jogador a assistir competições das quais ele não participa (RetroFoot) — no máximo um resumo opcional.
- Ranking que premia só volume (RetroFoot): pesar desempenho, ou separar "ranking de carreira" de "ranking da semana".

---

## Fontes
- [retrofoot.com.br](https://www.retrofoot.com.br) · [Guia](https://www.retrofoot.com.br/guia/) · [Ranking](https://www.retrofoot.com.br/ranking/) · [Modo Resenha](https://www.retrofoot.com.br/jogar-com-amigos/) · [Brasfoot vs RetroFoot](https://www.retrofoot.com.br/brasfoot-vs-retrofoot/) · [Media kit](https://www.retrofoot.com.br/media-kit/)
- [browserfoot.com.br](https://browserfoot.com.br) · [Critical Hits — lançamento do Browserfoot](https://criticalhits.com.br/games/browserfoot-manager-de-futebol-pelo-navegador-e-lancado/)
