#!/usr/bin/env node
/*
 * harness_a4.js — verifica moral/forma/status (A4):
 *   - fatorMoral: neutro em 65, sobe até ~1.06, desce até ~0.92
 *   - atualizarMoralRodada: jogar+vencer+nota alta sobe; banco desce; derrota desce
 *   - statusJogador: rótulos por faixa (Motivado/Insatisfeito/Quer sair/Em ascensão)
 *   - rendimento reflete a moral (mesmo overall, moral maior => rendimento maior)
 *   - retrocompat: jogador sem p.moral usa neutro (fator 1.0)
 */
'use strict';
const fs=require('fs'), vm=require('vm');
const APP=__dirname+'/app.js';
const el=new Proxy({}, { get:(t,k)=>{ if(k==='style'||k==='dataset'||k==='classList') return {}; return (typeof k==='string'&&/^(add|remove|set|append|query|get|focus|click|dispatch|insert|replace|scroll|toggle)/.test(k))?(()=>el):(el[k]??''); }, set:()=>true });
const doc=new Proxy({}, { get:(t,k)=>{ if(k==='body'||k==='documentElement'||k==='head') return el; if(k==='createElement'||k==='getElementById'||k==='querySelector') return ()=>el; if(k==='querySelectorAll') return ()=>[]; if(k==='addEventListener'||k==='removeEventListener') return ()=>{}; return ()=>el; } });
const win=new Proxy({}, { get:(t,k)=>{ if(k==='document') return doc; if(k==='localStorage') return {getItem:()=>null,setItem:()=>{},removeItem:()=>{}}; if(k==='location') return {href:'',search:'',hash:''}; return (typeof win[k]==='function')?win[k]:(()=>{}); } });
const sandbox={ console, Math, Object, Array, JSON, Set, Map, Date, Promise, RegExp, parseInt, parseFloat, isNaN, window:win, document:doc, localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}}, setTimeout:()=>0, setInterval:()=>0, clearInterval:()=>{}, clearTimeout:()=>{}, fetch:()=>Promise.reject(new Error('no net')), navigator:{}, location:{href:'',search:'',hash:''} };
sandbox.globalThis=sandbox; vm.createContext(sandbox);
const cap='\n;globalThis.__exp={Motor:typeof Motor!=="undefined"?Motor:null,Rating:typeof Rating!=="undefined"?Rating:null,PESOS_POS:typeof PESOS_POS!=="undefined"?PESOS_POS:null};';
try{ vm.runInContext(fs.readFileSync(APP,'utf8')+cap, sandbox, {filename:'app.js'}); }catch(e){ console.error(e.message); }
const {Motor, Rating, PESOS_POS}=sandbox.__exp||{};
if(!Rating||!Rating.fatorMoral){ console.error('FALHA: Rating.fatorMoral nao exposto'); process.exit(1); }

let ok=0,fail=0; const ck=(n,c,x)=>{ if(c){ok++;console.log('  \u2705 '+n);}else{fail++;console.log('  \u274c '+n+(x?'  ('+x+')':''));} };

console.log('\n[1] fatorMoral');
ck('neutro (65) = 1.0', Math.abs(Rating.fatorMoral({moral:65})-1)<1e-9);
ck('moral 100 ~ 1.06', Math.abs(Rating.fatorMoral({moral:100})-1.06)<1e-6, Rating.fatorMoral({moral:100}));
ck('moral 0 ~ 0.92', Math.abs(Rating.fatorMoral({moral:0})-0.92)<1e-6, Rating.fatorMoral({moral:0}));
ck('sem moral usa neutro (1.0)', Math.abs(Rating.fatorMoral({})-1)<1e-9);

console.log('\n[2] atualizarMoralRodada');
let p={moral:65};
Rating.atualizarMoralRodada(p,{jogou:true,resultado:'v',nota:8.0,foiCraque:true});
ck('jogar+vencer+nota alta+craque SOBE', p.moral>65, p.moral);
p={moral:65}; Rating.atualizarMoralRodada(p,{jogou:false});
ck('ficar no banco DESCE', p.moral<65, p.moral);
p={moral:65}; Rating.atualizarMoralRodada(p,{jogou:true,resultado:'d',nota:4.0});
ck('jogar mal e perder DESCE', p.moral<65, p.moral);
p={moral:65}; for(let i=0;i<5;i++) Rating.atualizarMoralRodada(p,{jogou:false});
ck('banco prolongado desanima de forma perceptivel (5 rodadas)', p.moral<58, p.moral);
p={moral:0}; Rating.atualizarMoralRodada(p,{jogou:true,resultado:'d',nota:2});
ck('moral nao passa de 0', p.moral>=0, p.moral);

console.log('\n[3] statusJogador');
ck('moral alta => Motivado', Rating.statusJogador({moral:85},false).txt==='Motivado');
ck('moral baixa => Insatisfeito', Rating.statusJogador({moral:38},false).txt==='Insatisfeito');
ck('moral muito baixa + reserva => Quer sair', Rating.statusJogador({moral:30},true).txt==='Quer sair');
ck('jovem promissor motivado => Em ascensao', Rating.statusJogador({moral:70,idade:20,potential:80,attrs:null,forca:70},false).txt==='Em ascensão');

console.log('\n[4] rendimento reflete moral');
const attrs={}; for(const g of Object.values(PESOS_POS.ST)) for(const a of g) attrs[a]=80;
const base={attrs,energia:100};
const rMotivado=Motor.rendimento({...base,moral:100},'ST');
const rNeutro  =Motor.rendimento({...base,moral:65},'ST');
const rTriste  =Motor.rendimento({...base,moral:20},'ST');
ck('mesmo overall: motivado > neutro > triste', rMotivado>rNeutro && rNeutro>rTriste, `${rMotivado.toFixed(1)}/${rNeutro.toFixed(1)}/${rTriste.toFixed(1)}`);
ck('sem moral == neutro (retrocompat)', Math.abs(Motor.rendimento(base,'ST')-rNeutro)<1e-6);

console.log(`\n=== ${ok} ok, ${fail} falhas ===`);
process.exit(fail?1:0);
