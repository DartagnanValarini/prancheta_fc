// harness_torcida — humor da torcida (§6.1 item 13): reage a resultados (clássico
// pesa o dobro), volta pro neutro, enche/esvazia o estádio (bilheteria), save.
// Uso: node harness_torcida.js
const {abrir,chromium}=require('./ui_test/abrir.js');
let ok=0,falhas=0; const t=(c,m)=>{ if(c){ok++;console.log('  ✅',m);} else {falhas++;console.log('  ❌',m);} };
(async()=>{
  const browser=await chromium.launch();
  const {page,erros}=await abrir(browser);
  page.on('dialog',d=>d.accept());
  await page.evaluate(()=>localStorage.setItem('prancheta_tutorial_v1','feito'));
  await page.click('#btnJogarAgora'); await page.waitForSelector('.clube-lin',{timeout:15000});
  await page.click('.clube-lin'); await page.waitForSelector('.fm-campo');
  const r=await page.evaluate(()=>{
    const eu=App.myTeam, rival=App.teams.findIndex((x,i)=>i!==eu), outro=App.teams.findIndex((x,i)=>i!==eu&&i!==rival);
    App.teams[rival].cidade=App.teams[eu].cidade='Cidade X'; App.teams[outro].cidade='Longe';
    const res={};
    App.torcida=60; res.ini=App.humorTorcida();
    App.reagirTorcida({resultado:'v',meusGols:1,golsAdv:0,advTi:outro}); res.v=App.torcida;
    App.torcida=60; App.reagirTorcida({resultado:'d',meusGols:0,golsAdv:1,advTi:outro}); res.d=App.torcida;
    App.torcida=60; App.reagirTorcida({resultado:'d',meusGols:0,golsAdv:1,advTi:rival}); res.dClass=App.torcida;
    App.torcida=60; App.reagirTorcida({resultado:'v',meusGols:4,golsAdv:0,advTi:outro}); res.goleada=App.torcida;
    App.torcida=90; for(let k=0;k<30;k++) App.reagirTorcida({resultado:'e',meusGols:0,golsAdv:0,advTi:outro}); res.volta=App.torcida;
    const renda=h=>{ App.torcida=h; return App.rendaBilheteria(eu,null); };
    res.rEuf=renda(90); res.rNeu=renda(60); res.rRev=renda(15);
    res.estados=[90,70,50,35,10].map(h=>App.estadoTorcida(h).txt);
    App.torcida=77; const snap=JSON.parse(JSON.stringify(App.snapshot())); App.torcida=20; App.aplicarSnapshot(snap); res.save=App.torcida;
    App.renderCabecalho(); res.head=/Torcida/i.test(document.getElementById('clubeHead').innerText);
    return res;
  });
  t(r.ini===60,'começa neutra (60)');
  t(r.v>60 && r.d<60,`vitória sobe (${r.v}), derrota desce (${r.d})`);
  t(60-r.dClass>=(60-r.d)*1.8,`derrota em clássico pesa o dobro (${r.dClass} vs ${r.d})`);
  t(r.goleada>r.v,`goleada anima mais (${r.goleada})`);
  t(r.volta<75 && r.volta>60,`sem vitórias, a euforia volta pro neutro (${r.volta})`);
  t(r.rEuf>r.rNeu && r.rNeu>r.rRev,`bilheteria: eufórica ${r.rEuf} > neutra ${r.rNeu} > revoltada ${r.rRev}`);
  t(r.estados.join(',')==='Eufórica,Animada,Desconfiada,Impaciente,Revoltada','5 estados de humor');
  t(r.save===77,'humor vai pro save');
  t(r.head,'aparece no cabeçalho do clube');
  // rodada de verdade mexe no humor
  const d=await page.evaluate(()=>{ App.torcida=60; App.escalarMelhor(); App.jogarRodada(); App.pularRodada(); return App.torcida!==60 || App._ultimoJogo.resultado==='e'; });
  t(d,'jogar uma rodada atualiza o humor');
  t(erros.filter(e=>!/ERR_FAILED/.test(e)).length===0,'sem erros de JS');
  await browser.close();
  console.log(`\n=== ${ok} ok, ${falhas} falhas ===`);
  process.exit(falhas?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
