#!/usr/bin/env node
/*
 * harness_dados_estaticos.js — roadmap §6.4 item 28: jogadores servidos por arquivo
 * estático (dados/br.json) em vez do Supabase.
 *
 *   1. O arquivo gerado pelo exportador (tools/exportar_dados.mjs) produz EXATAMENTE os
 *      mesmos times/jogadores que a consulta ao banco (mesma ordem de times — o save
 *      guarda os times pela posição).
 *   2. Filtro por divisão igual ao do banco.
 *   3. Fallback pro banco: arquivo ausente (404), versão desconhecida, JSON quebrado,
 *      fetch falhando, página aberta via file://.
 *   4. O arquivo é bem menor que as linhas cruas (nomes das colunas uma vez só).
 *   5. Se dados/br.json existir no repo: formato válido e colunas que o jogo usa.
 *
 * Sem rede: o mundo sintético vem do ui_test/fake_supabase.js (mesmo formato das tabelas).
 */
'use strict';
const fs=require('fs'), vm=require('vm'), path=require('path');

let ok=0, fail=0;
function check(nome, cond, extra){ if(cond){ok++; console.log(`  ✅ ${nome}`);} else {fail++; console.log(`  ❌ ${nome}${extra?'  ('+extra+')':''}`);} }

// --- mundo sintético (fake_supabase roda num "window" próprio) ---
const fakeWin={};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'ui_test','fake_supabase.js'),'utf8'), {window:fakeWin, JSON, Math, Promise, Array, Object, String});
const FAKE=fakeWin.__FAKE;
// embaralha a ordem física dos times (o banco não devolve por id) — o arquivo tem que respeitar
const ordemBanco=[...FAKE.teams].sort((a,b)=>((a.id*7919)%97)-((b.id*7919)%97));
FAKE.teams.splice(0, FAKE.teams.length, ...ordemBanco);

(async()=>{
  const {montarArquivo, ATTR_ORDEM:ATTR_EXP, PLAYER_COLS, TEAM_COLS}=await import(path.join(__dirname,'tools','exportar_dados.mjs'));
  // o banco real devolve TODA coluna (null quando vazia); o fake omite algumas → completa
  FAKE.players.forEach(p=>[...PLAYER_COLS,...ATTR_EXP].forEach(c=>{ if(!(c in p)) p[c]=null; }));
  FAKE.teams.forEach(t=>TEAM_COLS.forEach(c=>{ if(!(c in t)) t[c]=null; }));

  // --- app.js num sandbox, com fetch controlável ---
  let respostaFetch=null;   // função (url) => Response-like
  const location={protocol:'https:', href:'https://x/catimba_fc.html', search:'', hash:'', origin:'https://x', pathname:'/catimba_fc.html'};
  const src=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
  const el=new Proxy({}, { get:(t,k)=>{ if(k==='style'||k==='dataset'||k==='classList') return {}; return (typeof k==='string'&&/^(add|remove|set|append|query|get|focus|click|dispatch|insert|replace|scroll|toggle)/.test(k))?(()=>el):(el[k]??''); }, set:()=>true });
  const doc=new Proxy({}, { get:(t,k)=>{ if(k==='body'||k==='documentElement'||k==='head') return el; if(k==='querySelectorAll') return ()=>[]; if(k==='addEventListener'||k==='removeEventListener') return ()=>{}; return ()=>el; } });
  const win={document:doc, supabase:fakeWin.supabase, addEventListener(){}, removeEventListener(){}, location};
  const sandbox={ console, Math, Object, Array, JSON, Set, Map, Date, Promise, RegExp, parseInt, parseFloat, isNaN, isFinite, Number, String, Boolean, Error,
    window:win, document:doc, location, navigator:{},
    localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},
    setTimeout:()=>0, setInterval:()=>0, clearInterval:()=>{}, clearTimeout:()=>{},
    fetch:(u,o)=>{ if(!respostaFetch) return Promise.reject(new Error('sem rede')); return Promise.resolve().then(()=>respostaFetch(u,o)); } };
  sandbox.globalThis=sandbox;
  vm.createContext(sandbox);
  try{ vm.runInContext(src+'\n;globalThis.__exp={SupabaseProvider, ATTR_ORDEM};', sandbox, {filename:'app.js'}); }catch(e){ /* boot de UI */ }
  const {SupabaseProvider, ATTR_ORDEM}=sandbox.__exp||{};
  if(!SupabaseProvider){ console.error('FALHA: SupabaseProvider não exposto'); process.exit(1); }

  console.log('\n[0] exportador e jogo usam a mesma lista de atributos');
  check('ATTR_ORDEM do exportador = ATTR_ORDEM do app.js', JSON.stringify(ATTR_EXP)===JSON.stringify(ATTR_ORDEM));

  const arquivo=montarArquivo(FAKE.teams, FAKE.players);
  const txt=JSON.stringify(arquivo);
  const resp=(body,status=200)=>({ok:status>=200&&status<300, status, json:async()=>JSON.parse(body)});
  const prov=new SupabaseProvider('u','k');
  const limpa=ts=>JSON.parse(JSON.stringify(ts));   // compara só dados

  console.log('\n[1] arquivo estático = consulta ao banco');
  respostaFetch=()=>resp(txt);
  const doArq=limpa(await prov.getTeams(['A','B','C','D']));
  check('veio do arquivo estático', prov.fonte==='estatico', prov.fonte);
  respostaFetch=null;
  const doBanco=limpa(await prov.getTeams(['A','B','C','D']));
  check('sem arquivo, veio do banco', prov.fonte==='banco', prov.fonte);
  check('mesmo número de times', doArq.length===doBanco.length, `${doArq.length} × ${doBanco.length}`);
  check('MESMA ORDEM de times (o save guarda por posição)', doArq.map(t=>t.id).join()===doBanco.map(t=>t.id).join());
  check('ordem não é por id (o teste realmente embaralhou)', doBanco.map(t=>t.id).join()!==[...doBanco].sort((a,b)=>a.id-b.id).map(t=>t.id).join());
  check('times e jogadores idênticos (todos os campos)', JSON.stringify(doArq)===JSON.stringify(doBanco));
  const nj=doArq.reduce((s,t)=>s+t.players.length,0);
  check('todos os jogadores presentes', nj===FAKE.players.length, `${nj}/${FAKE.players.length}`);
  check('atributos e força calculados', doArq[0].players[0].attrs && doArq[0].players[0].forca>0);

  console.log('\n[2] filtro por divisão');
  respostaFetch=()=>resp(txt);
  const soAB=limpa(await prov.getTeams(['A','B']));
  check('arquivo: só A e B', soAB.every(t=>['A','B'].includes(t.divisao)) && soAB.length===FAKE.teams.filter(t=>['A','B'].includes(t.divisao)).length);
  respostaFetch=null;
  const soABb=limpa(await prov.getTeams(['A','B']));
  check('igual ao banco filtrado', JSON.stringify(soAB)===JSON.stringify(soABb));

  console.log('\n[3] fallback pro banco');
  const casos=[
    ['arquivo ausente (404)', ()=>resp('',404)],
    ['versão desconhecida', ()=>resp(JSON.stringify({...arquivo, v:2}))],
    ['JSON quebrado', ()=>({ok:true,status:200,json:async()=>{ throw new Error('json'); }})],
    ['fetch falha (offline)', ()=>{ throw new Error('offline'); }],
    ['arquivo sem jogadores', ()=>resp(JSON.stringify({...arquivo, rows:[]}))],
  ];
  for(const [nome,f] of casos){
    respostaFetch=f;
    const r=limpa(await prov.getTeams(['A','B','C','D']));
    check(`${nome} → banco, mesmos dados`, prov.fonte==='banco' && JSON.stringify(r)===JSON.stringify(doBanco), prov.fonte);
  }
  respostaFetch=()=>resp(txt); location.protocol='file:';
  let pediu=false; const antes=respostaFetch; respostaFetch=(u,o)=>{ pediu=true; return antes(u,o); };
  await prov.getTeams(['A']);
  check('aberto via file:// nem tenta o arquivo', !pediu && prov.fonte==='banco');
  location.protocol='https:';
  respostaFetch=(u,o)=>{ pediu={u,o}; return resp(txt); };
  await prov.getTeams(['A']);
  check('pede dados/br.json com revalidação (cache no-cache)', pediu && pediu.u==='dados/br.json' && pediu.o && pediu.o.cache==='no-cache', JSON.stringify(pediu));

  console.log('\n[4] tamanho');
  const cru=JSON.stringify(FAKE.players).length;
  check('arquivo menor que as linhas cruas do banco', txt.length < cru*0.6, `${(txt.length/1024).toFixed(0)} KB × ${(cru/1024).toFixed(0)} KB`);

  console.log('\n[5] dados/br.json do repo');
  const real=path.join(__dirname,'dados','br.json');
  if(fs.existsSync(real)){
    const d=JSON.parse(fs.readFileSync(real,'utf8'));
    check('formato v1', d.v===1 && Array.isArray(d.teams) && Array.isArray(d.cols) && Array.isArray(d.rows));
    check('tem os 45 atributos', ATTR_ORDEM.every(a=>d.cols.includes(a)));
    check('tem as colunas que o jogo usa', ['id','team_id','player_name','setor','age','potential','talento'].every(c=>d.cols.includes(c)));
    check('toda linha com todas as colunas', d.rows.every(r=>r.length===d.cols.length));
    check('todo jogador tem time no arquivo', (()=>{ const ids=new Set(d.teams.map(t=>t.id)); const ti=d.cols.indexOf('team_id'); return d.rows.every(r=>ids.has(r[ti])); })());
    console.log(`     (${d.teams.length} times, ${d.rows.length} jogadores, ${(fs.statSync(real).size/1024).toFixed(0)} KB)`);
  } else console.log('  (ainda não existe — gerado pelo workflow "Exportar dados dos jogadores")');

  console.log(`\n${fail?'❌':'✅'} ${ok} ok, ${fail} falha(s)`);
  process.exit(fail?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
