// harness_pressao — §6.1 item 20: barra de pressão sob o placar do "Seu jogo".
// Índice −100 (fora) … +100 (casa), decai a cada minuto e sobe com posse,
// finalizações, chutes no alvo, escanteios e gols do minuto. Camada de TV.
// Uso: node harness_pressao.js [--shots DIR]
const path=require('path'),fs=require('fs');
const {abrir,chromium}=require('./ui_test/abrir.js');
const SHOTS=process.argv.includes('--shots')?process.argv[process.argv.indexOf('--shots')+1]:null;
if(SHOTS) fs.mkdirSync(SHOTS,{recursive:true});
let ok=0,falhas=0; const t=(c,m)=>{ if(c){ok++;console.log('  ✅',m);} else {falhas++;console.log('  ❌',m);} };

(async()=>{
  const browser=await chromium.launch();
  const {page,erros}=await abrir(browser);
  page.on('dialog',d=>d.accept());
  await page.evaluate(()=>localStorage.setItem('prancheta_tutorial_v1','feito'));
  await page.click('#btnJogarAgora'); await page.waitForSelector('.clube-lin',{timeout:15000});
  await page.click('.clube-lin'); await page.waitForSelector('.fm-campo');
  await page.evaluate(()=>{ const o=App.garantirOpcoes(); o.coletiva=false; o.recado=false; o.velocidade=3; if(App.estadual) App.estadual.status='pulado'; });

  console.log('\n[1] cálculo');
  const c=await page.evaluate(()=>{
    const est={posse:[0,0],fin:[0,0],alvo:[0,0],esc:[0,0],press:0};
    const passo=(fn,g0,g1)=>{ const a=JSON.parse(JSON.stringify([est.posse,est.fin,est.alvo,est.esc])); fn(); return App.atualizarPressao(est,a,g0||[0,0],g1||[0,0]); };
    const r={};
    for(let k=0;k<6;k++) passo(()=>{ est.posse[0]++; est.fin[0]++; est.alvo[0]++; });   // casa em cima
    r.casa=est.press;
    for(let k=0;k<12;k++) passo(()=>{ est.posse[k%2]++; });                            // equilibrado: volta pro meio
    r.volta=est.press;
    for(let k=0;k<30;k++) passo(()=>{ est.posse[1]++; est.fin[1]++; est.alvo[1]++; est.esc[1]++; },[0,0],[0,1]);
    r.fora=est.press;
    return r;
  });
  t(c.casa>30,`casa finalizando seguido: pressão +${Math.round(c.casa)}`);
  t(Math.abs(c.volta)<c.casa/2,`minutos equilibrados puxam de volta pro meio (${Math.round(c.volta)})`);
  t(c.fora===-100,'nunca passa de ±100');

  console.log('\n[2] no jogo ao vivo');
  await page.evaluate(()=>{ App.escalarMelhor(); App.jogarRodada(); });
  await page.waitForSelector('#meuJogo .mj-press',{timeout:15000});
  t(true,'barra aparece sob o placar');
  await page.waitForFunction(()=>App.liveState && App.liveState.min>=25,null,{timeout:60000});
  const v=await page.evaluate(()=>{ const el=document.querySelector('#meuJogo .mj-press'); return {press:+el.dataset.press, motor:Math.round(App.meuSim().est.press), txt:el.querySelector('small').textContent, cls:el.className}; });
  t(Math.abs(v.press-v.motor)<=1,`barra mostra o índice do motor (${v.press})`);
  t(/PRESSIONA|EQUILIBRADO/.test(v.txt),`rótulo: "${v.txt}"`);
  if(SHOTS) await page.screenshot({path:path.join(SHOTS,'pressao.png')});
  await page.evaluate(()=>{ clearInterval(App.liveState.timer); App.liveState=null; });

  console.log('\n[3] 80 jogos inteiros');
  const n=await page.evaluate(()=>{
    let minutos=0, eq=0, casa=0, fora=0, vencedorPressionou=0, decididos=0, trocas=0;
    for(let k=0;k<80;k++){
      App.teams.forEach(t=>t.players.forEach(p=>{ delete p._expulso; p._amarelosJogo=0; p.energia=100; delete p.lesionado; delete p.suspenso; }));
      App.escalarMelhor(); document.getElementById('flkModal')?.remove(); App._filaModais=[];
      App.jogarRodada(); const L=App.liveState; clearInterval(L.timer); L._rapido=true;
      let somaP=0, ant=null;
      while(L.min<90){ L.min++; App.simularMinuto(); const p=App.meuSim().est.press; somaP+=p; minutos++;
        const lado=p>App.PRESS_LIMIAR?1:p<-App.PRESS_LIMIAR?-1:0; if(lado===0) eq++; else if(lado>0) casa++; else fora++;
        if(ant!==null && lado!==ant) trocas++; ant=lado; }
      const s=App.meuSim(); if(s.gc!==s.gf){ decididos++; if((s.gc>s.gf)===(somaP>0)) vencedorPressionou++; }
      Som.ambiente(false); App.liveState=null;
    }
    return {minutos, eq, casa, fora, decididos, vencedorPressionou, trocas};
  });
  const pct=x=>Math.round(x/n.minutos*100);
  console.log(`     equilibrado ${pct(n.eq)}% · casa pressiona ${pct(n.casa)}% · fora ${pct(n.fora)}% · ${(n.trocas/80).toFixed(1)} viradas de rótulo por jogo`);
  t(pct(n.eq)>=25 && pct(n.eq)<=80,'"jogo equilibrado" é comum, mas não o tempo todo');
  t(n.casa>0 && n.fora>0,'os dois lados pressionam em algum momento');
  t(n.trocas/80>=3 && n.trocas/80<=40,'a barra mexe durante o jogo sem piscar o tempo todo');
  t(n.vencedorPressionou>=n.decididos*0.55,`quem venceu pressionou mais na maioria dos jogos (${n.vencedorPressionou}/${n.decididos})`);
  t(erros.filter(e=>!/ERR_FAILED/.test(e)).length===0,'sem erros de JS'+(erros.length?': '+erros.slice(0,3).join(' | '):''));
  await browser.close();
  console.log(`\n=== ${ok} ok, ${falhas} falhas ===`);
  process.exit(falhas?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
