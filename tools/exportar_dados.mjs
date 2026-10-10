#!/usr/bin/env node
/*
 * exportar_dados.mjs — gera dados/br.json a partir do Supabase (roadmap §6.4 item 28).
 *
 * O jogo lê esse arquivo estático (servido pelo GitHub Pages, com gzip e cache do
 * navegador) em vez de baixar os ~3 mil jogadores do banco a cada abertura. Assim o
 * tráfego do Supabase fica só com login, saves e ranking.
 *
 * Rodar sempre que o banco de jogadores/times mudar:
 *   - pelo GitHub: Actions → "Exportar dados dos jogadores" → Run workflow
 *   - local:       node tools/exportar_dados.mjs   (Node 18+)
 *
 * ⚠️ ORDEM DOS TIMES: o save guarda os times pela POSIÇÃO na lista (composicao,
 * saldos, divisoesTime), então o arquivo mantém a mesma ordem que o jogo recebia do
 * banco (consulta sem ORDER BY = ordem física da tabela). Não ordene os times aqui.
 *
 * Formato (v:1):
 *   { v:1, teams:[{id,nome,abrev,cidade,divisao,saldo,escudo,cor1,cor2}],
 *     cols:[nomes das colunas de player], rows:[[valores na ordem de cols]] }
 * Os atributos vão como colunas comuns em `cols` (nomes uma vez só, não por jogador).
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SUP_URL = process.env.SUP_URL || 'https://leysofvftpgocigqqgzi.supabase.co';
const SUP_KEY = process.env.SUP_KEY || 'sb_publishable_i5CqcTOw2U9amGelpwcuxg_d-nYXdxu';  // chave pública (a mesma do jogo)

export const TEAM_COLS = ['id','nome','abrev','cidade','divisao','saldo','escudo','cor1','cor2'];
// colunas de player que o jogo usa (SupabaseProvider.montar) — sem os atributos
export const PLAYER_COLS = ['id','team_id','player_name','numero','setor','energia','age','valor','salario',
  'contract','games','gols','expulsões','lesoes','height','weight','preferred_foot','weak_foot',
  'photo_player','potential','talento','avenda'];
// mesma ordem do ATTR_ORDEM do app.js
export const ATTR_ORDEM = ["corners","crossing","dribbling","finishing","first_touch","freekick",
  "heading","long_shots","long_throws","marking","passing","penalty","tackling","technique",
  "agression","antecipation","bravery","composure","concentration","decisions","determination",
  "flair","leadership","off_the_ball","positioning","teamwork","vision","work_rate",
  "acceleration","agility","balance","jump_reach","natural_fitness","pace","stamina","strength",
  "aerial_reach","command_of_area","communication","handling","kicking","one_on_ones",
  "reflexes","rushing_out","throwing"];

// monta o arquivo a partir das linhas cruas (exportado pro harness testar sem rede)
export function montarArquivo(teams, players) {
  const cols = [...PLAYER_COLS, ...ATTR_ORDEM];
  const ids = new Set(teams.map(t => t.id));
  const rows = players
    .filter(p => ids.has(p.team_id))
    .sort((a, b) => a.id - b.id)
    .map(p => cols.map(c => p[c] ?? null));
  return {
    v: 1,   // sem data: arquivo só muda (e só gera commit) quando os dados mudam
    teams: teams.map(t => Object.fromEntries(TEAM_COLS.map(c => [c, t[c] ?? null]))),
    cols, rows,
  };
}

async function get(path, extra = {}) {
  const r = await fetch(`${SUP_URL}/rest/v1/${path}`, {
    headers: { apikey: SUP_KEY, Authorization: `Bearer ${SUP_KEY}`, ...extra },
  });
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status} ${await r.text()}`);
  return r.json();
}

async function main() {
  // times: SEM order (mesma ordem que o jogo recebia do banco — ver aviso no topo)
  const teams = await get(`team?select=${TEAM_COLS.join(',')}`);
  if (!teams.length) throw new Error('tabela team vazia');
  const players = [];
  const PAG = 1000;
  const sel = encodeURIComponent([...PLAYER_COLS, ...ATTR_ORDEM].join(','));
  for (let de = 0; ; de += PAG) {
    const pag = await get(`player?select=${sel}&order=id.asc&offset=${de}&limit=${PAG}`);
    players.push(...pag);
    if (pag.length < PAG) break;
  }
  const arq = montarArquivo(teams, players);
  const destino = join(dirname(fileURLToPath(import.meta.url)), '..', 'dados', 'br.json');
  mkdirSync(dirname(destino), { recursive: true });
  const txt = JSON.stringify(arq);
  writeFileSync(destino, txt + '\n');
  console.log(`dados/br.json: ${arq.teams.length} times, ${arq.rows.length} jogadores, ${(txt.length / 1024).toFixed(0)} KB`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch(e => { console.error('FALHOU:', e.message); process.exit(1); });
}
