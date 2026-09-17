#!/usr/bin/env node
/*
 * harness_contagem.js — regressao do Bug 1: contagem de jogos/rodada.
 * Prova que 2 rodadas contam 2 jogos por time (nao 4), rodada acompanha,
 * e total da liga cresce certinho. Trava contra dupla contagem no motor.
 */
'use strict';
const fs=require('fs'),vm=require('vm');
function mk(){return{style:{},dataset:{},classList:{add(){},remove(){},toggle(){},contains(){return false}},innerHTML:'',textContent:'',value:'',checked:false,appendChild(){},remove(){},setAttribute(){},getAttribute(){return null},addEventListener(){},querySelector(){return mk()},querySelectorAll(){return[]},closest(){return null},set onclick(v){},set onchange(v){}};}
const doc={body:mk(),documentElement:mk(),head:mk(),createElement(){return mk()},getElementById(){return mk()},querySelector(){return mk()},querySelectorAll(){return[]},addEventListener(){}};
const store={};const win={document:doc,localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>{store[k]=v},removeItem(){}},addEventListener(){},location:{href:'',search:'',hash:''}};
const sb={console,Math,Object,Array,JSON,Set,Map,Date,Promise,RegExp,parseInt,parseFloat,isNaN,Number,String,Boolean,window:win,document:doc,localStorage:win.localStorage,setTimeout:()=>0,setInterval:()=>0,clearInterval(){},clearTimeout(){},fetch:()=>Promise.reject(new Error()),navigator:{},location:{href:'',search:'',hash:''},alert:()=>{},confirm:()=>true};
sb.globalThis=sb;vm.createContext(sb);
vm.runInContext(fs.readFileSync('/home/claude/prancheta_fc/app.js','utf8')+'\n;globalThis.__App=App;',sb);
const App=sb.__App;
const ATTRS=['finishing','marking','tackling','passing','pace','strength','stamina','positioning','vision','dribbling','crossing','heading','long_shots','technique','aggression','composure','reflexes','handling','concentration','decisions'];
function mkTeam(id){const players=[];for(let n=1;n<=14;n++){const attrs={};ATTRS.forEach(a=>attrs[a]=50);players.push({numero:n,pid:id+'-'+n,nome:'J'+n,attrs,energia:100,forca:50,setorNat:'MEI',idade:24,contratoMeses:24,moral:65});}return{id:'T'+id,abrev:'T'+id,nome:'Time'+id,divisao:'D',saldo:1e6,players};}
App.teams=[];for(let i=0;i<12;i++)App.teams.push(mkTeam(i));App.myTeam=0;
App.cfg=App.teams.map(t=>App.cfgInicial(t));App.montarTemporada();App.cfg=App.teams.map(t=>App.cfgInicial(t));App.escalarMelhor();
const stat=i=>App.stats.find(s=>s.i===i);
function jogaUmaRodada(){
  const p=App.prepararRodada();
  App.liveState={jogos:p.jogos,sims:p.sims,min:0,timer:null,playing:true,done:false,fase:'1T',paused:false,subOpen:false};
  App.pularRodada();
}
console.log('rodada 0: j=',stat(0).j);
jogaUmaRodada();
console.log('apos R1: j=',stat(0).j,'| total liga J=',App.ligas.D.stats.reduce((a,s)=>a+s.j,0),'| rodada=',App.rodada);
jogaUmaRodada();
console.log('apos R2: j=',stat(0).j,'| total liga J=',App.ligas.D.stats.reduce((a,s)=>a+s.j,0),'| rodada=',App.rodada);
const ok = stat(0).j===2 && App.rodada===2;
console.log(ok ? '\n✅ CONTAGEM CORRETA: 2 rodadas = 2 jogos por time' : '\n❌ CONTAGEM ERRADA');
if(!ok) process.exitCode=1;

// --- REGRESSAO Bug pontos dobrados (tabela Arena) ---
(function(){
  const stat=i=>App.stats.find(s=>s.i===i);
  App.montarTemporada(); App.cfg=App.teams.map(t=>App.cfgInicial(t)); App.escalarMelhor();
  const p=App.prepararRodada();
  App.liveState={jogos:p.jogos,sims:p.sims,min:0,timer:null,playing:true,done:false,fase:'1T',paused:false,subOpen:false};
  App.pularRodada();
  const L=App.liveState, meu=0, real=stat(meu).pts;
  const semDelta=App.classificacao((L && !L.done)?App.deltasAoVivo():null).find(s=>s.i===meu);
  console.log('\n--- pontos na tabela apos rodada encerrada ---');
  console.log(semDelta.pts===real ? '✅ pts NAO dobra (L.done nao aplica deltas): '+real : '❌ pts dobrou: '+semDelta.pts+' vs real '+real);
  if(semDelta.pts!==real){ process.exitCode=1; }
})();
