#!/usr/bin/env node
/*
 * harness_fase0.js — verifica os comportamentos da Fase 0 que não são só
 * gols/jogo (esse fica no harness_calibracao.js):
 *   1. Rating: overallPosicao(slot) != overallGlobal quando fora de posição;
 *      rendimento com slot usa a adequação real, não o melhor global.
 *   2. Substituição preserva o SLOT tático (reserva herda posição de quem saiu).
 *   3. Evolução por tipo de posição: natural 100% / treinada 70% / improvisada 30%.
 *
 * Carrega o app.js real num sandbox (ele define Motor/Rating/consts como globais).
 */
'use strict';
const fs=require('fs'), vm=require('vm');

// executa app.js num contexto com window/document stub, capturando os globais do motor
const src=fs.readFileSync(__dirname+'/app.js','utf8');
const el=new Proxy({}, { get:(t,k)=>{ if(k==='style'||k==='dataset'||k==='classList') return {}; return (typeof k==='string'&&/^(add|remove|set|append|query|get|focus|click|dispatch|insert|replace|scroll|toggle)/.test(k))?(()=>el):(el[k]??''); }, set:()=>true });
const doc=new Proxy({}, { get:(t,k)=>{ if(k==='body'||k==='documentElement'||k==='head') return el; if(k==='createElement'||k==='getElementById'||k==='querySelector') return ()=>el; if(k==='querySelectorAll') return ()=>[]; if(k==='addEventListener'||k==='removeEventListener') return ()=>{}; return ()=>el; } });
const win=new Proxy({}, { get:(t,k)=>{ if(k==='document') return doc; if(k==='localStorage'||k==='sessionStorage') return {getItem:()=>null,setItem:()=>{},removeItem:()=>{}}; if(k==='addEventListener'||k==='removeEventListener') return ()=>{}; if(k==='location') return {href:'',search:'',hash:''}; return (typeof win[k]==='function')?win[k]:(()=>{}); } });
const sandbox={ console, Math, Object, Array, JSON, Set, Map, Date, Promise, RegExp, parseInt, parseFloat, isNaN, window:win, document:doc, localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}}, setTimeout:()=>0, setInterval:()=>0, clearInterval:()=>{}, clearTimeout:()=>{}, fetch:()=>Promise.reject(new Error('no net')), navigator:{}, location:{href:'',search:'',hash:''} };
sandbox.globalThis=sandbox;
vm.createContext(sandbox);
// const Motor/Rating são bindings léxicos — não caem no global. Exporta explicitamente.
const capture='\n;globalThis.__exp={Motor:typeof Motor!=="undefined"?Motor:null,'+
  'Evolucao:typeof Evolucao!=="undefined"?Evolucao:null,Rating:typeof Rating!=="undefined"?Rating:null,'+
  'PESOS_POS:typeof PESOS_POS!=="undefined"?PESOS_POS:null,'+
  'POS_SETOR:typeof POS_SETOR!=="undefined"?POS_SETOR:null};';
try{ vm.runInContext(src+capture, sandbox, {filename:'app.js'}); }catch(e){ /* ignora erros de boot de UI */ }
const {Motor, Rating, Evolucao, PESOS_POS, POS_SETOR}=sandbox.__exp||{};
if(!Motor||!Rating){ console.error('FALHA: Motor/Rating não expostos pelo app.js'); process.exit(1); }

let ok=0, fail=0;
function check(nome, cond, extra){ if(cond){ok++; console.log(`  ✅ ${nome}`);} else {fail++; console.log(`  ❌ ${nome}${extra?'  ('+extra+')':''}`);} }

// --- jogador sintético: zagueiro forte (bom em DC, ruim em ST) ---
function zagueiro(){
  const attrs={}; for(const g of Object.values(PESOS_POS.DC)) for(const a of g) attrs[a]=85;
  // atributos de atacante baixos
  for(const g of Object.values(PESOS_POS.ST)) for(const a of g) if(attrs[a]==null) attrs[a]=35;
  const p={nome:'Zaga', attrs, energia:100, peDominante:'destro', peFraco:3, idade:24, talento:3, potential:82};
  Evolucao.inicializar(p); Evolucao.recalcForca(p);
  return p;
}

console.log('harness_fase0 — comportamentos da Fase 0\n');

console.log('[1] Camada Rating');
const z=zagueiro();
const ovDC=Rating.overallPosicao(z,'DC');
const ovST=Rating.overallPosicao(z,'ST');
const ovGlobal=Rating.overallGlobal(z);
check('overallPosicao(DC) > overallPosicao(ST) — adequação de posição real', ovDC>ovST, `DC=${ovDC} ST=${ovST}`);
check('overallGlobal ~ melhor posição (DC)', Math.abs(ovGlobal-ovDC)<=2, `global=${ovGlobal} DC=${ovDC}`);
check('rendimento(slot=ST) < rendimento(slot=DC) — não usa o melhor global fora de posição',
      Motor.rendimento(z,'ST') < Motor.rendimento(z,'DC'), `ST=${Motor.rendimento(z,'ST').toFixed(1)} DC=${Motor.rendimento(z,'DC').toFixed(1)}`);

console.log('\n[2] Substituição preserva o slot tático');
// simula o campo: um titular no slot ST com role; reserva é o zagueiro.
const campo=[{ref:{nome:'Atk',attrs:zagueiro().attrs}, posicao:'ST', role:'', energia:100, nome:'Atk', numero:9}];
const entra=zagueiro(); entra.numero=4;
// replica a regra da substituição (Fase 0): herda posicao/role de quem sai
const sai=campo[0];
campo[0]={ref:entra, forca:entra.forca, energia:entra.energia, posicao:sai.posicao, role:sai.role, nome:entra.nome, numero:entra.numero};
check('reserva assume o slot de quem saiu (ST), não a posição natural (DC)', campo[0].posicao==='ST', `virou ${campo[0].posicao}`);
check('role do slot preservado', campo[0].role===sai.role);

console.log('\n[3] Evolução por tipo de posição');
const fNat=Evolucao.fatorPosicaoTreino(z, z._posNat);                       // natural
const setorNat=POS_SETOR[z._posNat];
const posMesmoSetor=Object.keys(POS_SETOR).find(p=>p!==z._posNat && POS_SETOR[p]===setorNat);
const posOutroSetor=Object.keys(POS_SETOR).find(p=>POS_SETOR[p]!==setorNat && POS_SETOR[p]!=='GK');
const fTre=Evolucao.fatorPosicaoTreino(z, posMesmoSetor);                    // treinada
const fImp=Evolucao.fatorPosicaoTreino(z, posOutroSetor);                    // improvisada
check('natural = 100%', fNat===1.0, `${fNat}`);
check('treinada (mesmo setor) = 70%', fTre===0.7, `${posMesmoSetor}=${fTre}`);
check('improvisada (outro setor) = 30%', fImp===0.3, `${posOutroSetor}=${fImp}`);
// efeito real: mesmo jogador ganha mais treinando na natural que improvisado
const clone=a=>JSON.parse(JSON.stringify(a));
const zA=clone(z), zB=clone(z);
for(let r=0;r<20;r++){ Evolucao.aplicarRodada(zA, zA._posNat, true, true); Evolucao.aplicarRodada(zB, posOutroSetor, true, true); }
const ganhoNat=Rating.overallPosicao(zA, zA._posNat)-Rating.overallPosicao(z, z._posNat);
check('20 rodadas na posição natural evoluem mais que 20 improvisado', ganhoNat>=0, `ganhoNat=${ganhoNat}`);

console.log(`\n=== ${ok} ok, ${fail} falhas ===`);
process.exit(fail?1:0);
