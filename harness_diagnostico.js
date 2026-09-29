// harness_diagnostico — balanço de fim de temporada (§6.1 item 4): resultado,
// 3 lições tiradas da temporada e "o que muda agora", antes de virar o ano.
// Uso: node harness_diagnostico.js [--shots DIR]
const path=require('path'),fs=require('fs');
const {abrir,chromium}=require('./ui_test/abrir.js');
const SHOTS=process.argv.includes('--shots')?process.argv[process.argv.indexOf('--shots')+1]:null;
if(SHOTS) fs.mkdirSync(SHOTS,{recursive:true});
let ok=0,falhas=0; const t=(c,m)=>{ if(c){ok++;console.log('  ✅',m);} else {falhas++;console.log('  ❌',m);} };
const titulo=page=>page.$eval('#flkModal .flkm-title',e=>e.textContent).catch(()=>null);

(async()=>{
  const browser=await chromium.launch();
  const {page,erros}=await abrir(browser);
  page.on('dialog',d=>d.accept());
  await page.evaluate(()=>localStorage.setItem('prancheta_tutorial_v1','feito'));
  await page.click('#btnJogarAgora'); await page.waitForSelector('.clube-lin',{timeout:15000});
  await page.click('.clube-lin'); await page.waitForSelector('.fm-campo');
  await page.evaluate(()=>{ App.garantirOpcoes().coletiva=false; });

  console.log('\n[1] temporada inteira');
  let r=0;
  while(r<60 && !(await page.evaluate(()=>App.tempEncerrada||App.rodada>=App.fixtures.length))){
    await page.evaluate(()=>{ App.escalarMelhor(); App.teams[App.myTeam].players.forEach(p=>{ if(p.energia<60) p.energia=60; }); App.jogarRodada(); });
    await page.evaluate(()=>App.pularRodada());
    await page.evaluate(()=>{ App.fecharRodada(); const m=document.getElementById('flkModal'); if(m) m.remove(); App._filaModais=[]; App._aposFila=[]; });
    if(await page.evaluate(()=>App.demitido)){ await page.evaluate(()=>{ App.demitido=false; App.confianca=60; }); }
    r++;
  }
  t(await page.evaluate(()=>App.tempEncerrada||App.rodada>=App.fixtures.length),`temporada terminou (${r} rodadas)`);
  const temp0=await page.evaluate(()=>App.temporada);
  await page.evaluate(()=>{ App.renderArena(); App.showTab('arena'); });
  await page.click('#btnNovaTemp');
  t((await titulo(page))===`📋 Balanço da temporada ${temp0}`,'"Nova temporada" abre o balanço antes de virar');
  const txt=await page.$eval('#flkModal',e=>e.innerText);
  const d=await page.evaluate(()=>App.diagnosticoTemporada());
  t(d.dicas.length===3 && d.dicas.every(x=>x.txt && !/NaN|undefined/.test(x.txt)),'3 lições, com números reais');
  t(new RegExp(`${d.st.pts} pts`).test(txt) && /Divisão/i.test(txt) && /Folha salarial/i.test(txt),'campanha + "o que muda agora" (divisão, folha)');
  t(/Meta da diretoria/i.test(txt),'mostra se a meta da diretoria foi cumprida');
  if(SHOTS) await page.screenshot({path:path.join(SHOTS,'diagnostico.png')});
  await page.click('#flkModal .flkm-foot .btn:has-text("Começar temporada")');
  t((await page.evaluate(()=>App.temporada))===temp0+1 && !(await page.evaluate(()=>App.tempEncerrada)),'"Começar temporada" vira o ano');

  console.log('\n[2] lições reagem aos números (cenários forçados)');
  const cen=await page.evaluate(()=>{
    const eu=App.myTeam, s=App.stats[eu];
    const base=JSON.stringify(s);
    const liçoes=()=>App.diagnosticoTemporada().dicas.map(x=>x.t);
    // defesa: sofreu muito mais que a média
    Object.assign(s,{j:10,gp:12,gc:40,pts:10,v:3,e:1,d:6});
    const def=liçoes();
    // desgaste + vestiário
    Object.assign(s,JSON.parse(base));
    App.escalarMelhor(); App.onzeDe(eu).forEach(p=>p.energia=35);
    App.teams[eu].players.forEach(p=>p.moral=20);
    const cans=liçoes();
    // começo de temporada (tudo zerado): nada de lição de gols
    App.stats.forEach(x=>{ if(x) Object.assign(x,{j:0,gp:0,gc:0,pts:0,v:0,e:0,d:0}); });
    App.teams[eu].players.forEach(p=>{ p.moral=65; p.energia=100; });
    const zerado=liçoes();
    return {def, cans, zerado};
  });
  t(cen.def.includes('Defesa vazada'),'defesa com muitos gols sofridos → "Defesa vazada" ('+cen.def.join(', ')+')');
  t(cen.cans.includes('Elenco esgotado') && cen.cans.includes('Vestiário tenso'),'energia baixa e moral baixa viram lições ('+cen.cans.join(', ')+')');
  t(!cen.zerado.some(x=>/Defesa|Ataque/.test(x)),'sem jogos, não inventa lição de gols ('+cen.zerado.join(', ')+')');

  console.log('\n[3] pelo pódio');
  await page.evaluate(()=>{ App.abrirPodio(); });
  await page.click('#podNova');
  t(/Balanço da temporada/.test(await titulo(page)||''),'"Nova temporada" do pódio também passa pelo balanço');
  await page.click('#flkModal [data-flkm-x]');
  t(erros.filter(e=>!/ERR_FAILED/.test(e)).length===0,'sem erros de JS');
  await browser.close();
  console.log(`\n=== ${ok} ok, ${falhas} falhas ===`);
  process.exit(falhas?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
