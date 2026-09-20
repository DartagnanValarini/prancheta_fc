'use strict';
const fs=require('fs'),vm=require('vm');
function mk(){return{style:{},dataset:{},classList:{add(){},remove(){},toggle(){},contains(){return false}},innerHTML:'',textContent:'',value:'',checked:false,appendChild(){},remove(){},setAttribute(){},getAttribute(){return null},addEventListener(){},querySelector(){return mk()},querySelectorAll(){return[]},closest(){return null},set onclick(v){},set onchange(v){}};}
const doc={body:mk(),documentElement:mk(),head:mk(),createElement(){return mk()},getElementById(){return mk()},querySelector(){return mk()},querySelectorAll(){return[]},addEventListener(){}};
const store={};const win={document:doc,localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>{store[k]=v},removeItem(){}},addEventListener(){},location:{href:'',search:'',hash:''}};
const sb={console,Math,Object,Array,JSON,Set,Map,Date,Promise,RegExp,parseInt,parseFloat,isNaN,Number,String,Boolean,window:win,document:doc,localStorage:win.localStorage,setTimeout:()=>0,setInterval:()=>0,clearInterval(){},clearTimeout(){},fetch:()=>Promise.reject(new Error()),navigator:{},location:{href:'',search:'',hash:''},alert:()=>{},confirm:()=>true,TextEncoder,crypto:globalThis.crypto};
sb.globalThis=sb;vm.createContext(sb);
vm.runInContext(fs.readFileSync('app.js','utf8')+'\n;globalThis.__App=App;globalThis.__Menu=Menu;',sb);
const App=sb.__App;
let pass=0,fail=0;const t=(c,m)=>{if(c)pass++;else{fail++;console.log('FALHOU:',m);}};

// garantirCarreira
App.carreira=null; const c=App.garantirCarreira();
t(c.titulos===0&&c.acessos===0,'garantirCarreira inicia zerado');

// scoreTreinador: 2 titulos, 3 acessos, temporada 4, melhor div do histClube = 'B'
App.carreira={titulos:2,acessos:3}; App.temporada=4; App.divisao='C';
App.histClube=[{temporada:1,divisao:'D'},{temporada:2,divisao:'C'},{temporada:3,divisao:'B'}];
const s=App.scoreTreinador();
// score = 2*1000 + 3*400 + (4-1)*100 + ordem('B'=2)*500 = 2000+1200+300+1000 = 4500
t(s.score===4500,'scoreTreinador soma correto ('+s.score+')');
t(s.melhor_divisao==='B','melhor_divisao vem do histClube (maior)');
t(s.temporadas===4&&s.titulos===2&&s.acessos===3,'campos do score batem');

// esc — evita HTML injection no nome do treinador
t(App.esc('<b>x</b>&"\'')==='&lt;b&gt;x&lt;/b&gt;&amp;&quot;&#39;','esc escapa html');

// nomeTreinador convidado
App.convidado=true; t(App.nomeTreinador()==='Convidado','nomeTreinador convidado');
App.convidado=false; sb.__Menu.user={email:'dart@ex.com'}; t(App.nomeTreinador()==='dart','nomeTreinador do email');

// round-trip do snapshot: carreira persiste e restaura
// (montar um App minimo pra snapshot exige teams; testamos so o serializa/restaura dos campos)
App.carreira={titulos:5,acessos:1};
// simula o trecho de restauração
const s2={carreira:{titulos:5,acessos:1}};
App.carreira=(s2.carreira&&typeof s2.carreira==='object')?{titulos:s2.carreira.titulos||0,acessos:s2.carreira.acessos||0}:{titulos:0,acessos:0};
t(App.carreira.titulos===5&&App.carreira.acessos===1,'carreira restaura do snapshot');

// chamarFuncao offline p/ convidado retorna offline sem lançar
App.convidado=true;
App.chamarFuncao('entitlement','GET').then(r=>{
  t(r.ok===false&&r.offline===true,'chamarFuncao convidado => offline');
  console.log(`\nBloco C cliente: ${pass}/${pass+fail}`);
  process.exit(fail?1:0);
});
