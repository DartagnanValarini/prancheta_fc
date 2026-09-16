#!/usr/bin/env node
/*
 * harness_a3.js — verifica os objetivos (A3), modelo híbrido:
 *   PRINCIPAL: meta por divisão; avaliada por acesso/permanência
 *   SECUNDÁRIOS: progresso por evento, conclusão paga prêmio, streak zera na derrota,
 *                bônus de anúncio dobra uma vez só
 */
'use strict';
const fs=require('fs'), vm=require('vm');
const APP=__dirname+'/app.js';
const el=new Proxy({}, { get:(t,k)=>{ if(k==='style'||k==='dataset'||k==='classList') return {}; return (typeof k==='string'&&/^(add|remove|set|append|query|get|focus|click|dispatch|insert|replace|scroll|toggle)/.test(k))?(()=>el):(el[k]??''); }, set:()=>true });
const doc=new Proxy({}, { get:(t,k)=>{ if(k==='body'||k==='documentElement'||k==='head') return el; if(k==='createElement'||k==='getElementById'||k==='querySelector') return ()=>el; if(k==='querySelectorAll') return ()=>[]; if(k==='addEventListener'||k==='removeEventListener') return ()=>{}; return ()=>el; } });
const win=new Proxy({}, { get:(t,k)=>{ if(k==='document') return doc; if(k==='localStorage') return {getItem:()=>null,setItem:()=>{},removeItem:()=>{}}; if(k==='location') return {href:'',search:'',hash:''}; return (typeof win[k]==='function')?win[k]:(()=>{}); } });
const sandbox={ console, Math, Object, Array, JSON, Set, Map, Date, Promise, RegExp, parseInt, parseFloat, isNaN, window:win, document:doc, localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}}, setTimeout:()=>0, setInterval:()=>0, clearInterval:()=>{}, clearTimeout:()=>{}, fetch:()=>Promise.reject(new Error('no net')), navigator:{}, location:{href:'',search:'',hash:''} };
sandbox.globalThis=sandbox; vm.createContext(sandbox);
const cap='\n;globalThis.__exp={App:typeof App!=="undefined"?App:null,Objetivos:typeof Objetivos!=="undefined"?Objetivos:null};';
try{ vm.runInContext(fs.readFileSync(APP,'utf8')+cap, sandbox, {filename:'app.js'}); }catch(e){ console.error(e.message); }
const {App, Objetivos}=sandbox.__exp||{};
if(!App||!Objetivos){ console.error('FALHA: App/Objetivos nao expostos'); process.exit(1); }

let ok=0,fail=0; const ck=(n,c)=>{ if(c){ok++;console.log('  \u2705 '+n);}else{fail++;console.log('  \u274c '+n);} };

// ambiente mínimo
App.myTeam=0;
App.teams=[{nome:'Meu',abrev:'MEU',saldo:0,players:[]}];
App.addExtrato=function(){};   // silencia extrato

console.log('\n[1] Principal por divisao');
['A','B','C','D'].forEach(d=>{ const p=Objetivos.principalDe(d); ck(`div ${d} tem principal com premio>0 e titulo`, p&&p.premio>0&&!!p.titulo); });

console.log('\n[2] Secundarios sorteados');
App.divisao='B'; App.objetivos=null;
const o=App.garantirObjetivos();
ck('sorteia 3 secundarios distintos', o.sec.length===3 && new Set(o.sec.map(s=>s.id)).size===3);
ck('cada secundario tem meta>0 e premio>0', o.sec.every(s=>s.meta>0&&s.premioBase>0&&!s.feito));

console.log('\n[3] Progresso e conclusao');
// força um objetivo de vitória pra testar
App.divisao='B'; App.objetivos={div:'B', principal:Objetivos.principalDe('B'), principalStatus:'aberto',
  sec:[{id:'vitoria',ev:'vitoria',streak:false,titulo:'Vencer',desc:'',meta:2,prog:0,feito:false,premioBase:1e6,adUsado:false}]};
App.teams[0].saldo=0;
App.registrarEventosObjetivos({resultado:'v',souCasa:true,meusGols:1,golsAdv:0});
ck('1 vitoria => prog 1, nao feito', App.objetivos.sec[0].prog===1 && !App.objetivos.sec[0].feito);
App.registrarEventosObjetivos({resultado:'v',souCasa:false,meusGols:2,golsAdv:1});
ck('2 vitorias => feito e premio creditado', App.objetivos.sec[0].feito && App.teams[0].saldo===1e6);

console.log('\n[4] Streak de invencibilidade zera na derrota');
App.objetivos={div:'B', principal:Objetivos.principalDe('B'), principalStatus:'aberto',
  sec:[{id:'invicto',ev:'invicto',streak:true,titulo:'Invicto',desc:'',meta:3,prog:0,feito:false,premioBase:1e6,adUsado:false}]};
App.registrarEventosObjetivos({resultado:'v',golsAdv:0}); App.registrarEventosObjetivos({resultado:'e',golsAdv:1});
ck('2 sem perder => prog 2', App.objetivos.sec[0].prog===2);
App.registrarEventosObjetivos({resultado:'d',golsAdv:2});
ck('derrota zera o streak', App.objetivos.sec[0].prog===0);

console.log('\n[5] Bonus de anuncio dobra uma vez so');
App.objetivos={div:'B', principal:Objetivos.principalDe('B'), principalStatus:'aberto',
  sec:[{id:'gols',ev:'gols',streak:false,titulo:'Gols',desc:'',meta:1,prog:0,feito:false,premioBase:2e6,adUsado:false}]};
App.teams[0].saldo=0;
App.registrarEventosObjetivos({resultado:'v',meusGols:1,golsAdv:0});
ck('gols concluido credita base', App.teams[0].saldo===2e6);
ck('primeiro resgate de ad dobra', App.resgatarBonusAd('gols')===true && App.teams[0].saldo===4e6);
ck('segundo resgate falha (uma vez so)', App.resgatarBonusAd('gols')===false && App.teams[0].saldo===4e6);

console.log('\n[6] Avaliacao do principal');
App.divisao='A'; App.confianca=60;
App.objetivos={div:'A', principal:Objetivos.principalDe('A'), principalStatus:'aberto', sec:[]};
App.teams[0].saldo=0;
let r=App.avaliarPrincipal({sobem:[],caem:[5,6,7,8]});  // eu (0) nao caio
ck('Serie A: nao cair => cumprido + premio', r.ok===true && App.teams[0].saldo>0 && App.objetivos.principalStatus==='cumprido');
App.divisao='B'; App.confianca=60;
App.objetivos={div:'B', principal:Objetivos.principalDe('B'), principalStatus:'aberto', sec:[]};
App.teams[0].saldo=0;
r=App.avaliarPrincipal({sobem:[3,4],caem:[]});          // eu (0) nao subo
ck('Serie B: nao subir => falhou, sem premio', r.ok===false && App.teams[0].saldo===0 && App.objetivos.principalStatus==='falhou');

console.log(`\n=== ${ok} ok, ${fail} falhas ===`);
process.exit(fail?1:0);
