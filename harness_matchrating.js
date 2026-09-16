#!/usr/bin/env node
/*
 * harness_matchrating.js — verifica o Match Rating (A1): a nota 0–10 por partida.
 * Afirma que a nota reage ao que importa, na direção certa e nas faixas certas:
 *   - base neutra ~6.0 sem nada de especial
 *   - gol sobe muito; derrota desce; vitória sobe
 *   - jogar fora de posição derruba a nota
 *   - GK sem sofrer gol (clean sheet) ganha bônus; sofrendo muito, perde
 *   - cartão/expulsão penalizam
 *   - travada em 0–10
 *
 * Carrega o app.js real num sandbox (mesmo padrão do harness_fase0.js).
 */
'use strict';
const fs=require('fs'), vm=require('vm');

const el=new Proxy({}, { get:(t,k)=>{ if(k==='style'||k==='dataset'||k==='classList') return {}; return (typeof k==='string'&&/^(add|remove|set|append|query|get|focus|click|dispatch|insert|replace|scroll|toggle)/.test(k))?(()=>el):(el[k]??''); }, set:()=>true });
const doc=new Proxy({}, { get:(t,k)=>{ if(k==='body'||k==='documentElement'||k==='head') return el; if(k==='createElement'||k==='getElementById'||k==='querySelector') return ()=>el; if(k==='querySelectorAll') return ()=>[]; if(k==='addEventListener'||k==='removeEventListener') return ()=>{}; return ()=>el; } });
const win=new Proxy({}, { get:(t,k)=>{ if(k==='document') return doc; if(k==='localStorage'||k==='sessionStorage') return {getItem:()=>null,setItem:()=>{},removeItem:()=>{}}; if(k==='addEventListener'||k==='removeEventListener') return ()=>{}; if(k==='location') return {href:'',search:'',hash:''}; return (typeof win[k]==='function')?win[k]:(()=>{}); } });
const sandbox={ console, Math, Object, Array, JSON, Set, Map, Date, Promise, RegExp, parseInt, parseFloat, isNaN, window:win, document:doc, localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}}, setTimeout:()=>0, setInterval:()=>0, clearInterval:()=>{}, clearTimeout:()=>{}, fetch:()=>Promise.reject(new Error('no net')), navigator:{}, location:{href:'',search:'',hash:''} };
sandbox.globalThis=sandbox;
vm.createContext(sandbox);
const capture='\n;globalThis.__exp={Motor:typeof Motor!=="undefined"?Motor:null,'+
  'Rating:typeof Rating!=="undefined"?Rating:null,PESOS_POS:typeof PESOS_POS!=="undefined"?PESOS_POS:null};';
try{ vm.runInContext(fs.readFileSync(__dirname+'/app.js','utf8')+capture, sandbox, {filename:'app.js'}); }catch(e){}
const {Motor, Rating, PESOS_POS}=sandbox.__exp||{};
if(!Rating||!Rating.matchRating){ console.error('FALHA: Rating.matchRating não exposto'); process.exit(1); }

let ok=0, fail=0;
function check(nome, cond, extra){ if(cond){ok++; console.log(`  ✅ ${nome}`);} else {fail++; console.log(`  ❌ ${nome}${extra?'  ('+extra+')':''}`);} }

// jogador atacante forte em ST (bom em ST, ruim em DC)
function atacante(){
  const attrs={}; for(const g of Object.values(PESOS_POS.ST)) for(const a of g) attrs[a]=85;
  for(const g of Object.values(PESOS_POS.DC)) for(const a of g) if(attrs[a]==null) attrs[a]=35;
  return {nome:'Atac', attrs, energia:100, peDominante:'destro', peFraco:3};
}
function goleiro(){
  const attrs={}; for(const g of Object.values(PESOS_POS.GK)) for(const a of g) attrs[a]=85;
  return {nome:'Gk', attrs, energia:100, peDominante:'destro', peFraco:3};
}

const A=atacante();
const nBase = Rating.matchRating(A, {slot:'ST', golsFeitos:0, golsSofridosTime:1, resultado:'e', energiaFinal:70, minutos:90});
const nGol  = Rating.matchRating(A, {slot:'ST', golsFeitos:1, golsSofridosTime:1, resultado:'e', energiaFinal:70, minutos:90});
const nVit  = Rating.matchRating(A, {slot:'ST', golsFeitos:0, golsSofridosTime:0, resultado:'v', energiaFinal:70, minutos:90});
const nDer  = Rating.matchRating(A, {slot:'ST', golsFeitos:0, golsSofridosTime:2, resultado:'d', energiaFinal:70, minutos:90});
const nForaPos = Rating.matchRating(A, {slot:'DC', golsFeitos:0, golsSofridosTime:1, resultado:'e', energiaFinal:70, minutos:90});
const nCartao = Rating.matchRating(A, {slot:'ST', golsFeitos:0, golsSofridosTime:1, resultado:'e', amarelos:1, energiaFinal:70, minutos:90});
const nExpulso = Rating.matchRating(A, {slot:'ST', golsFeitos:0, golsSofridosTime:1, resultado:'e', expulso:true, energiaFinal:70, minutos:90});
const nHatTrick = Rating.matchRating(A, {slot:'ST', golsFeitos:3, golsSofridosTime:0, resultado:'v', energiaFinal:90, minutos:90});

const G=goleiro();
const nGkClean = Rating.matchRating(G, {slot:'GK', golsFeitos:0, golsSofridosTime:0, resultado:'v', energiaFinal:90, minutos:90});
const nGkVaza  = Rating.matchRating(G, {slot:'GK', golsFeitos:0, golsSofridosTime:4, resultado:'d', energiaFinal:90, minutos:90});

console.log('\n[1] Base e direção da nota');
check(`base neutra ~6 (=${nBase})`, nBase>=5.2 && nBase<=6.6, nBase);
check(`gol sobe a nota (${nGol} > ${nBase})`, nGol>nBase);
check(`vitória > empate (${nVit} > ${nBase})`, nVit>nBase);
check(`derrota < empate (${nDer} < ${nBase})`, nDer<nBase);

console.log('\n[2] Adequação de posição');
check(`ST fora de posição (em DC) rende nota menor (${nForaPos} < ${nBase})`, nForaPos<nBase, `${nForaPos} vs ${nBase}`);

console.log('\n[3] Disciplina');
check(`amarelo penaliza (${nCartao} < ${nBase})`, nCartao<nBase);
check(`expulsão penaliza mais que amarelo (${nExpulso} < ${nCartao})`, nExpulso<nCartao);

console.log('\n[4] Goleiro');
check(`clean sheet dá boa nota ao GK (${nGkClean} >= 7)`, nGkClean>=7, nGkClean);
check(`GK vazado 4x tem nota baixa (${nGkVaza} < ${nGkClean})`, nGkVaza<nGkClean);

console.log('\n[5] Travas e extremos');
check(`hat-trick não estoura 10 (${nHatTrick} <= 10)`, nHatTrick<=10, nHatTrick);
check(`toda nota fica em 0–10`, [nBase,nGol,nVit,nDer,nForaPos,nCartao,nExpulso,nHatTrick,nGkClean,nGkVaza].every(n=>n>=0&&n<=10));
check(`minutos 0 = sem nota (null)`, Rating.matchRating(A,{slot:'ST',minutos:0})===null);
check(`entrou aos 80' (10 min) puxa nota pro neutro`, (()=>{ const parcial=Rating.matchRating(A,{slot:'ST',golsFeitos:1,resultado:'v',minutos:10}); const cheio=Rating.matchRating(A,{slot:'ST',golsFeitos:1,resultado:'v',minutos:90}); return Math.abs(parcial-6)<Math.abs(cheio-6); })());

console.log(`\n=== ${ok} ok, ${fail} falhas ===`);
process.exit(fail?1:0);
