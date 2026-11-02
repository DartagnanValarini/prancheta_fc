---
name: instagram-catimba
description: Cria e publica posts da @catimbafcbr (Instagram do Catimba FC!) no piloto automático — voz da marca, pilares, templates FLK!, legenda e checklist de publicação. Use em toda postagem do Instagram do jogo.
---

# Instagram do Catimba FC! — @catimbafcbr

Perfil do jogo Catimba FC!, manager de futebol estilo Brasfoot/Elifoot que roda no navegador
(catimbafc.com.br, repo github.com/DartagnanValarini/prancheta_fc). O Dart deixou o perfil no
**piloto automático**: o post sai sem aprovação prévia. Por isso o checklist do fim é obrigatório.

## 1. Voz da marca

- **Quem fala:** um boleiro de várzea que virou dev. Irreverente, nostálgico, zoeiro, mas nunca
  maldoso. Fala com o leitor como "professor" (técnico), que é como o presidente do jogo chama o usuário.
- **A catimba é a personalidade:** malandragem de futebol, cera, cartola mão-de-vaca, presidente que
  cobra, torcida que pressiona. Humor de dentro do futebol brasileiro.
- **Português do Brasil, informal:** "tá", "pro", "bora", gírias de futebol. Frases curtas. No
  máximo 2 emojis por bloco de texto.
- **Bio atual:** "Brasfoot cresceu e aprendeu a catimbar 😏 ⚽ Manager de futebol grátis no navegador 🧪 Vagas pro teste 👇"

**Nunca:**
- Citar clube, jogador, escudo, técnico ou campeonato real como se estivesse no jogo. Tudo no jogo é
  fictício (Jacaré de Goiânia, Leão de Manaus…). Futebol real só como referência cultural genérica.
- Prometer data de lançamento, app na loja, recurso que não existe ou número de jogadores.
- Inventar depoimento, review ou "fulano disse". Nada de números de usuários inventados.
- Falar de política, religião, tragédia, arbitragem real ou briga de torcida real.
- Usar Brasfoot/Elifoot em tom de ataque. Pode como comparação carinhosa e em hashtag.
- Usar imagem de terceiros, logo de clube real, música com direito autoral.

## 2. Pilares e calendário

Postagem **seg, qua e sex** (tarefa agendada, fim da tarde). Proporção alvo no mês:
40% jogo em ação · 30% catimba/humor · 20% bastidores do dev · 10% chamada direta pro teste.
**Pelo menos 1 Reels por semana** (segunda): é o formato que leva a conta pra quem não segue.
Carrossel e foto quase só chegam em quem já segue.

**No máximo 1 post automático por dia.** Se `historico.md` já tem post com a data de hoje, a execução
não publica nada e só avisa no relatório final.

| Dia | Pilar | Formato | Conteúdo |
|---|---|---|---|
| Seg | **Rodada da semana** (jogo em ação) | **Reels 15–25s** | Gameplay gravado com `social/reel.js` (partida inteira no turbo), com textos curtos por cena contando uma história: POV, cobrança do presidente, virada, gol no fim, sobe ou cai. Termina com pergunta. |
| Qua | **Catimba do dia** (humor) | 1 slide ou carrossel 2–3 | Frase de presidente/cartola/torcedor fictício, "tipos de técnico no manager", "a cera perfeita", enquete em texto. Alterne com **Dica do professor** (formação, mercado, finanças) usando print da tela certa. |
| Sex | **Bastidores** (dev) ou **Chamada pro teste** | Carrossel 3–4 | O que mudou no jogo na semana (veja `git log --since="7 days ago"`), traduzido pra linguagem de jogador. Uma sexta por mês vira chamada direta pro teste fechado. |

Se não houve commit relevante na semana, sexta vira mais um "Rodada" ou "Dica".
Quarta e sexta também podem sair como Reels quando o tema render vídeo (uma dica mostrando a tela, uma
novidade do jogo em ação); carrossel continua bom pra lista, comparação e chamada pro teste.

## 2.1 Reels

- Formato **1080×1920 (9:16)**, MP4 H.264 + faixa de áudio AAC (silenciosa serve), 15–25 s.
- Gravação: `node social/reel.js <pasta> <roteiro.json>` abre o jogo no layout de celular, sorteia um
  clube, mostra a escolha de clube, o modal do presidente, a partida inteira em velocidade Turbo
  (opção real do jogo, intervalo pulado sozinho) e o resultado, e fecha com um card da marca.
  Gera `frames/` + `frames.txt`. Roteiro de exemplo em `ig-posts/2026-11-02-reel-pov-serie-d/roteiro.json`:
  `cenas.clubes`, `cenas.presidente`, `cenas.partida`, `cenas.fim` (texto da faixa; `<b>` deixa em lemon),
  `final.titulo/sub/cta` e `durPartida` (segundos que a partida ocupa no vídeo, padrão 10).
- Montagem (copie igual):
  `ffmpeg -y -f concat -safe 0 -i frames.txt -f lavfi -i anullsrc=r=44100:cl=stereo -vf "fps=30,format=yuv420p" -c:v libx264 -preset veryfast -crf 20 -c:a aac -b:a 128k -shortest -movflags +faststart reel.mp4`
- Capa: `frames/00000.jpg` vira `capa.jpg`.
- **Gancho nos 2 primeiros segundos** (texto da cena `clubes`): POV, pergunta ou provocação. Nada de
  logo parado no início. Texto da faixa com no máximo ~8 palavras por cena.
- Confira o vídeo antes de publicar: extraia uma tira de frames
  (`ffmpeg -i reel.mp4 -vf "fps=1,scale=180:-1,tile=11x2" -frames:v 1 tira.jpg`) e olhe.
- **Legenda:** só cite o que aparece legível no vídeo (placar, nome do seu time). Nome de adversário
  cortado na tela ("Gavião D…") não entra na legenda.
- Sem música: a API não aplica áudio do Instagram e música de terceiros é proibida.

## 3. Visual (design system FLK!)

- Feed **1080×1350 (4:5)**, JPEG. Fundo #111112, neon lemon #D2FF00, branco #f4f4ee, cinza #8a8a90.
- Fontes: **Bungee** (títulos, sempre maiúsculas) e **Space Mono** (texto). Já estão em `social/fonts/`.
- Logo escrito: `CATIMBA<b>.</b>FC<b>!</b>` — ponto e exclamação em lemon, resto branco.
- Uma ideia por slide. Título curto (até ~4 palavras por linha). Texto até ~25 palavras por slide.
- Capa sempre com gancho forte e um botão-pílula "ARRASTA PRO LADO ▸" quando for carrossel.
- Rodapé padrão em todo slide: logo · @catimbafcbr · bolinhas de posição.
- Prints do jogo dentro de `.box` (borda lemon arredondada). Se o print já tem borda lemon (modais),
  tire a borda da `.box`.

### Como montar

1. `social/tpl/base.css` tem as classes: `.slide .kicker .h1 .h2 .txt .pill .box .foot .dots .grid .lemon`.
2. Clone a branch de posts: `git clone --depth 1 -b instagram-posts <repo> ig-posts`.
   Use a pasta `ig-posts/2026-11-02-chegamos/` como modelo e crie localmente
   `social/posts/AAAA-MM-DD-slug/` (pasta ignorada pelo git na main) com `01.html`, `02.html`…
   O HTML usa `../../tpl/base.css`, por isso o post é montado dentro de `social/posts/` da main.
3. Prints: `node social/prints.js social/posts/<id>/prints 1` gera `entrada, clubes, boas_vindas,
   formacao, elenco, mercado, competicoes, financas, ao_vivo_1, fim_1, tabela_pos` (PNG 2560×1720,
   clube sorteado a cada execução). Recorte com Pillow o pedaço que interessa e salve na pasta do post.
   Os nomes que aparecem nos prints são do mundo sintético e fictício do jogo — tudo bem usar.
4. Render: `node social/render.js social/posts/<id>` gera `01.jpg`, `02.jpg`…
   - Sem Playwright no ambiente: `npm i playwright` numa pasta temporária e rode com `NODE_PATH`.
   - Se o download do Chromium for bloqueado, aponte `CHROME=` pro Chromium já instalado
     (ex.: `/opt/pw-browsers/chromium-*/chrome-linux64/chrome`).

## 4. Legenda

- **Linha 1 = gancho** (aparece antes do "mais"): curta, com curiosidade ou zoeira. Nunca "Olá, pessoal".
- Corpo: 2–4 parágrafos curtos, conversando com o "professor".
- **CTA no fim**, alternando: pergunta pra comentar (preferido), "salva pra lembrar", "manda pro amigo
  que só joga de 4-4-2", "link na bio pro teste".
- **Hashtags no fim, 8–10 no total:**
  - Fixas: `#catimbafc #managerdefutebol #jogodefutebol #futebolbrasileiro #jogosdenavegador`
  - Rotativas (escolha 3–5 que combinem): `#brasfoot #elifoot #gamedevbrasil #indiegame #seried
    #futebolraiz #varzea #tecnicodefutebol #taticas #futebolarte #nostalgia #jogosbr`
- Sem link na legenda (Instagram não deixa clicar): sempre "link na bio".

## 5. Publicação (Composio · Instagram)

- Conta: `@catimbafcbr`, **ig_user_id `29474892022116705`** (conexão Composio alias `catimbafcbr`).
- As imagens precisam de URL pública. **Nada de post vai pra main.** Copie a pasta do post
  (`social/posts/<id>/` inteira) pra raiz do clone da branch órfã **`instagram-posts`**, faça commit e push
  nela e use `https://raw.githubusercontent.com/DartagnanValarini/prancheta_fc/instagram-posts/<id>/NN.jpg`.
- Carrossel: `INSTAGRAM_CREATE_CAROUSEL_CONTAINER` com `child_image_urls` (2–10) e `caption`
  → `INSTAGRAM_POST_IG_USER_MEDIA_PUBLISH` com o `creation_id` → `INSTAGRAM_GET_IG_MEDIA` pra pegar o permalink.
- Slide único: `INSTAGRAM_POST_IG_USER_MEDIA` com `image_url` + `caption` → publish → get.
- Reels: `INSTAGRAM_POST_IG_USER_MEDIA` com `media_type: "REELS"`, `video_url` (raw do reel.mp4),
  `cover_url` (raw do capa.jpg), `share_to_feed: true` e `caption` → publish com `max_wait_seconds: 240`
  (o vídeo leva ~40 s processando) → get.
- Se o publish falhar por processamento, espere e tente 1 vez; se falhar de novo, recrie o container.
- Commits de post: mensagem `Instagram: <slug>`, direto na branch `instagram-posts` (sem PR).
  Na main só entram mudanças de ferramenta (templates, scripts, esta skill).

## 6. Checklist antes de publicar (obrigatório)

1. Leia `historico.md` (na raiz da branch `instagram-posts`): não repita tema, frase de capa ou print das últimas 6 postagens.
2. Confira o calendário: o pilar bate com o dia da semana?
3. Abra cada JPG gerado e olhe: texto cortado, sobreposição, print errado, fonte faltando
   (se aparecer fonte serifada/padrão, a Bungee não carregou — não publique).
4. Releia a legenda contra a seção "Nunca" (clube real, data prometida, número inventado).
5. Confira que as URLs raw abrem (HTTP 200) depois do push.
6. Publique, pegue o permalink e **adicione uma linha no topo da tabela de `historico.md` da branch `instagram-posts`**:
   `| AAAA-MM-DD | pilar | formato | tema em 5 palavras | permalink |` e faça commit.
7. Se algo deu errado e o post não saiu, não insista mais de 2 vezes: registre o erro no histórico
   e avise o Dart na mensagem final da execução.

## 7. O que NÃO é automático

- Responder comentários e DMs: é com o Dart. A tarefa pode, no máximo, resumir comentários novos
  dos últimos posts no relatório final, sem responder.
- Foto de perfil e bio: a API não altera; o Dart troca no app (`social/avatar.png`).
- Anúncio pago: nunca.
