// harness_mando — mando de campo (06/10/2026): +30% no ataque E na defesa do
// mandante (era +7% só no ataque: mandante 37% × visitante 35%). A torcida do
// usuário mexe no mando dele (eufórica +10 p.p., revoltada −10 p.p.).
// Uso: node harness_mando.js
const {abrir,chromium}=require('./ui_test/abrir.js');
let ok=0,falhas=0; const t=(c,m)=>{ if(c){ok++;console.log('  ✅',m);} else {falhas++;console.log('  ❌',m);} };

(async()=>{
  const browser=await chromium.launch();
  const {page,erros}=await abrir(browser);
  page.on('dialog',d=>d.accept());
  await page.evaluate(()=>localStorage.setItem('catimba_tutorial_v1','feito'));
  await page.click('#btnJogarAgora'); await page.waitForSelector('.clube-lin',{timeout:15000});
  await page.click('.clube-lin'); await page.waitForSelector('.fm-campo');
  await page.evaluate(()=>{ const o=App.garantirOpcoes(); o.coletiva=false; o.recado=false; App.salvarSupabase=async()=>{}; if(App.estadual) App.estadual.status='pulado'; });

  console.log('\n[1] torcida mexe no mando do usuário');
  const r1=await page.evaluate(()=>{ const eu=App.myTeam, outro=App.teams.findIndex((x,i)=>i!==eu); const out={};
    [['euf',100],['neutra',60],['rev',20],['zero',0]].forEach(([k,h])=>{ App.torcida=h; out[k]=+App.mandoDe(eu).toFixed(3); });
    App.torcida=100; out.ia=App.mandoDe(outro); App.torcida=60; return out; });
  t(r1.neutra===0.3 && r1.ia===0.3,'torcida neutra e times da IA: +30%');
  t(r1.euf===0.4 && r1.rev===0.2 && r1.zero===0.2,`eufórica +40%, revoltada +20% (nunca abaixo: ${r1.zero})`);

  console.log('\n[2] jogos de verdade (motor ao vivo, 30 rodadas da minha liga)');
  const r2=await page.evaluate(()=>{ let casa=0, emp=0, fora=0, gc=0, gf=0, jogos=0;
    for(let k=0;k<30;k++){
      App.teams.forEach(t=>t.players.forEach(p=>{ delete p._expulso; p._amarelosJogo=0; p.energia=100; delete p.lesionado; delete p.suspenso; }));
      App.escalarMelhor(); App.rodada=k%Math.max(1,App.fixtures.length-1);
      App.jogarRodada(); const L=App.liveState; clearInterval(L.timer);
      while(L.min<90){ L.min++; App.simularMinuto(); }
      L.sims.forEach(s=>{ jogos++; gc+=s.gc; gf+=s.gf; if(s.gc>s.gf) casa++; else if(s.gc<s.gf) fora++; else emp++; });
      Som.ambiente(false); App.liveState=null; }
    return {jogos, casa:casa/jogos, emp:emp/jogos, fora:fora/jogos, gpj:(gc+gf)/jogos, razao:gc/Math.max(1,gf)}; });
  const P=x=>Math.round(x*100)+'%';
  console.log(`     ${r2.jogos} jogos: mandante ${P(r2.casa)} · empate ${P(r2.emp)} · visitante ${P(r2.fora)} · ${r2.gpj.toFixed(2)} gols/jogo · casa/fora ${r2.razao.toFixed(2)}×`);
  t(r2.casa-r2.fora>=0.07,'mandante vence bem mais que o visitante');
  t(r2.gpj>=2.0 && r2.gpj<=2.9,'gols por jogo seguem na faixa');

  console.log('\n[3] séries simuladas (resultado rápido)');
  const r3=await page.evaluate(()=>{ const As=App.teams.map((t,i)=>i).filter(i=>App.teams[i].divisao==='B'); let c=0,e=0,f=0,n=0;
    for(let k=0;k<4000;k++){ const h=As[k%As.length], a=As[(k*7+3)%As.length]; if(h===a) continue; const r=App.simularConfrontoReal(h,a); n++; if(r.gc>r.gf) c++; else if(r.gc<r.gf) f++; else e++; }
    return {casa:c/n, emp:e/n, fora:f/n}; });
  console.log(`     mandante ${P(r3.casa)} · empate ${P(r3.emp)} · visitante ${P(r3.fora)}`);
  t(r3.casa-r3.fora>=0.07,'nas séries simuladas o mando também pesa');

  console.log('\n[4] expectativa do jogo e tela');
  const r4=await page.evaluate(()=>{ const eu=App.myTeam; const outro=App.teams.findIndex((x,i)=>i!==eu && Math.abs(App.forcaDoTime(i)-App.forcaDoTime(eu))<0.5);
    return outro<0?null:{casa:App.expectativaJogo(eu,outro,true), fora:App.expectativaJogo(eu,outro,false)}; });
  t(!r4 || (['equilibrado','ligeiro'].includes(r4.casa) && ['equilibrado','azarao'].includes(r4.fora)),`entre times iguais: em casa "${r4&&r4.casa}", fora "${r4&&r4.fora}" (nunca favorito/impossível só pelo mando)`);
  await page.evaluate(()=>{ App.rodada=0; App.torcida=100; App.renderShell(); App.showTab('escala'); });
  const txt=await page.$eval('.fm-adv-sub',e=>e.textContent).catch(()=>'');
  t(!/Em casa/.test(txt) || /mando \+40%/.test(txt),`card do adversário mostra o fator casa quando é em casa ("${txt.trim()}")`);
  t(erros.filter(e=>!/ERR_FAILED/.test(e)).length===0,'sem erros de JS'+(erros.length?': '+erros.slice(0,3).join(' | '):''));
  await browser.close();
  console.log(`\n=== ${ok} ok, ${falhas} falhas ===`);
  process.exit(falhas?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
