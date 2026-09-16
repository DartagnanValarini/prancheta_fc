#!/usr/bin/env node
/*
 * harness_a2.js — verifica as estatísticas visíveis (A2):
 *   - topArtilheiros: só quem fez gol, ordenado desc, líder correto
 *   - topNotas: exige mínimo de jogos, média correta, ordenado desc
 *   - retratoClube / registrarHistoricoClube: idempotente por temporada
 *   - sparkline: SVG válido; aviso com <2 pontos
 *   - esc: escapa HTML
 * Carrega o app.js real e exercita o objeto App com dados sintéticos.
 */
'use strict';
const fs=require('fs'), vm=require('vm');
const APP=__dirname+'/app.js';
const el=new Proxy({}, { get:(t,k)=>{ if(k==='style'||k==='dataset'||k==='classList') return {}; return (typeof k==='string'&&/^(add|remove|set|append|query|get|focus|click|dispatch|insert|replace|scroll|toggle)/.test(k))?(()=>el):(el[k]??''); }, set:()=>true });
const doc=new Proxy({}, { get:(t,k)=>{ if(k==='body'||k==='documentElement'||k==='head') return el; if(k==='createElement'||k==='getElementById'||k==='querySelector') return ()=>el; if(k==='querySelectorAll') return ()=>[]; if(k==='addEventListener'||k==='removeEventListener') return ()=>{}; return ()=>el; } });
const win=new Proxy({}, { get:(t,k)=>{ if(k==='document') return doc; if(k==='localStorage') return {getItem:()=>null,setItem:()=>{},removeItem:()=>{}}; if(k==='location') return {href:'',search:'',hash:''}; return (typeof win[k]==='function')?win[k]:(()=>{}); } });
const sandbox={ console, Math, Object, Array, JSON, Set, Map, Date, Promise, RegExp, parseInt, parseFloat, isNaN, window:win, document:doc, localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}}, setTimeout:()=>0, setInterval:()=>0, clearInterval:()=>{}, clearTimeout:()=>{}, fetch:()=>Promise.reject(new Error('no net')), navigator:{}, location:{href:'',search:'',hash:''} };
sandbox.globalThis=sandbox; vm.createContext(sandbox);
const cap='\n;globalThis.__exp={App:typeof App!=="undefined"?App:null};';
try{ vm.runInContext(fs.readFileSync(APP,'utf8')+cap, sandbox, {filename:'app.js'}); }catch(e){}
const {App}=sandbox.__exp||{};
if(!App||!App.topArtilheiros){ console.error('FALHA: App/topArtilheiros nao exposto'); process.exit(1); }

let ok=0,fail=0; const ck=(n,c)=>{ if(c){ok++;console.log('  \u2705 '+n);}else{fail++;console.log('  \u274c '+n);} };

App.divisao='A'; App.myTeam=0;
const mkP=(nome,gols,soma,qtd)=>({nome,pid:nome,golsTemp:gols,_somaNotas:soma,_qtdNotas:qtd,attrs:null,forca:70,energia:100});
App.teams=[
  {nome:'Meu FC',abrev:'MEU',divisao:'A',saldo:5e6,players:[mkP('Artur',12,50,7),mkP('Bibo',3,42,7),mkP('Caue',0,30,5)]},
  {nome:'Rival',abrev:'RIV',divisao:'A',saldo:3e6,players:[mkP('Dede',15,55,7),mkP('Elias',1,20,2)]}
];

console.log('\n[1] Artilharia');
const arts=App.topArtilheiros(10);
ck('lider e Dede (15 gols)', arts[0].p.nome==='Dede' && arts[0].p.golsTemp===15);
ck('so inclui quem fez gol (Caue fora)', !arts.some(o=>o.p.nome==='Caue'));
ck('ordenada desc', arts.every((o,i)=>i===0||arts[i-1].p.golsTemp>=o.p.golsTemp));

console.log('\n[2] Melhores notas');
const notas=App.topNotas(10,3);
ck('exige min 3 jogos (Elias 2j fora)', !notas.some(o=>o.p.nome==='Elias'));
ck('media correta (Artur=50/7)', Math.abs(notas.find(o=>o.p.nome==='Artur').media-50/7)<0.01);
ck('ordenadas desc', notas.every((o,i)=>i===0||notas[i-1].media>=o.media));

console.log('\n[3] Retrato e historico do clube');
const r=App.retratoClube();
ck('retrato tem divisao/saldo/ovMedio', r&&r.divisao==='A'&&r.saldo===5000000&&r.ovMedio>0);
App.histClube=[]; App.temporada=1; App.registrarHistoricoClube();
ck('registrou 1 ponto', App.histClube.length===1);
App.registrarHistoricoClube();
ck('idempotente por temporada', App.histClube.length===1);

console.log('\n[4] Grafico e escape');
ck('sparkline gera <svg>+polyline', /<svg/.test(App.sparkline([1,2,3]))&&/polyline/.test(App.sparkline([1,2,3])));
ck('sparkline 1 ponto = aviso', /2\u00aa temporada/.test(App.sparkline([5])));
ck('esc escapa < e aspas', App.esc('<img src="x">')==='&lt;img src=&quot;x&quot;&gt;');

console.log(`\n=== ${ok} ok, ${fail} falhas ===`);
process.exit(fail?1:0);
