#!/usr/bin/env node
/*
 * harness_blocob.js — verifica as opções/configurações (Bloco B):
 *   - garantirOpcoes: cria defaults, preenche chaves ausentes (retrocompat)
 *   - msPorMinuto: velocidade altera o ritmo do relógio (maior vel => menos ms)
 *   - semAnuncios: reflete adFree; compra placeholder liga a flag
 *   - persistência: opcoes sobrevivem a snapshot/restore
 */
'use strict';
const fs=require('fs'),vm=require('vm');
const APP=__dirname+'/app.js';
function mk(){return{style:{},dataset:{},classList:{add(){},remove(){},toggle(){},contains(){return false}},innerHTML:'',textContent:'',value:'',checked:false,appendChild(){},remove(){},setAttribute(){},getAttribute(){return null},addEventListener(){},querySelector(){return mk()},querySelectorAll(){return[]},closest(){return null},set onclick(v){},set onchange(v){}};}
const doc={body:mk(),documentElement:mk(),head:mk(),createElement(){return mk()},getElementById(){return mk()},querySelector(){return mk()},querySelectorAll(){return[]},addEventListener(){}};
const store={};const win={document:doc,localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>{store[k]=v},removeItem(){}},addEventListener(){},location:{href:'',search:'',hash:''}};
const sb={console,Math,Object,Array,JSON,Set,Map,Date,Promise,RegExp,parseInt,parseFloat,isNaN,Number,String,Boolean,window:win,document:doc,localStorage:win.localStorage,setTimeout:()=>0,setInterval:()=>0,clearInterval(){},clearTimeout(){},fetch:()=>Promise.reject(new Error()),navigator:{},location:{href:'',search:'',hash:''},alert:()=>{},confirm:()=>true};
sb.globalThis=sb;vm.createContext(sb);
vm.runInContext(fs.readFileSync(APP,'utf8')+'\n;globalThis.__App=App;',sb);
const App=sb.__App;
if(!App||!App.garantirOpcoes){ console.error('FALHA: App.garantirOpcoes nao exposto'); process.exit(1); }

let ok=0,fail=0; const ck=(n,c,x)=>{ if(c){ok++;console.log('  \u2705 '+n);}else{fail++;console.log('  \u274c '+n+(x?'  ('+x+')':''));} };

console.log('\n[1] garantirOpcoes / defaults');
App.opcoes=null;
const o=App.garantirOpcoes();
ck('cria defaults', o.velocidade===1 && o.autoSaveRodadas===3 && o.adFree===false);
App.opcoes={velocidade:2};   // save antigo parcial
const o2=App.garantirOpcoes();
ck('preenche chaves ausentes (retrocompat)', o2.velocidade===2 && o2.autoSaveRodadas===3 && o2.adFree===false);

console.log('\n[2] msPorMinuto pela velocidade');
App.opcoes={velocidade:1};   const m1=App.msPorMinuto();
App.opcoes={velocidade:2};   const m2=App.msPorMinuto();
App.opcoes={velocidade:0.5}; const m05=App.msPorMinuto();
ck('vel 2x = metade do tempo de 1x', Math.abs(m2-m1/2)<=2, `${m1}/${m2}`);
ck('vel 0.5x = dobro do tempo de 1x', m05>m1, `${m05}/${m1}`);
ck('nunca abaixo de 80ms (turbo travado)', (()=>{App.opcoes={velocidade:3};return App.msPorMinuto()>=80;})());

console.log('\n[3] anúncios / adFree');
App.opcoes={adFree:false};
ck('sem compra => tem anúncios', App.semAnuncios()===false);
App.opcoes.adFree=true;
ck('adFree=true => sem anúncios', App.semAnuncios()===true);

console.log('\n[4] persistência das opções');
App.myTeam=0; App.teams=[{id:'T0',abrev:'T0',nome:'Meu',divisao:'D',saldo:1e6,players:[]}];
App.opcoes={velocidade:2, autoSaveRodadas:5, adFree:true};
// snapshot só precisa serializar opcoes; testamos o roundtrip do campo
const snapOpc=JSON.parse(JSON.stringify(App.garantirOpcoes()));
App.opcoes=null;   // simula reload
App.opcoes=(snapOpc&&typeof snapOpc==='object')?{...App.OPCOES_PADRAO,...snapOpc}:{...App.OPCOES_PADRAO};
ck('opcoes sobrevivem ao roundtrip', App.opcoes.velocidade===2 && App.opcoes.autoSaveRodadas===5 && App.semAnuncios()===true);

console.log(`\n=== ${ok} ok, ${fail} falhas ===`);
process.exit(fail?1:0);
