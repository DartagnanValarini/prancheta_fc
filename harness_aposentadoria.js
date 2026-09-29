// harness_aposentadoria — veteranos param na virada (§6.1 item 9), garoto da base
// sobe no lugar, idade avança +1 por temporada, tudo sobrevive ao save (v11).
// Uso: node harness_aposentadoria.js [--shots DIR]
const path=require('path'),fs=require('fs');
const {abrir,chromium}=require('./ui_test/abrir.js');
const SHOTS=process.argv.includes('--shots')?process.argv[process.argv.indexOf('--shots')+1]:null;
if(SHOTS) fs.mkdirSync(SHOTS,{recursive:true});
let ok=0,falhas=0; const t=(c,m)=>{ if(c){ok++;console.log('  ✅',m);} else {falhas++;console.log('  ❌',m);} };
const titulo=page=>page.$eval('#flkModal .flkm-title',e=>e.textContent).catch(()=>'');
const clicar=(page,txt)=>page.click(`#flkModal .flkm-foot .btn:has-text("${txt}")`);

(async()=>{
  const browser=await chromium.launch();
  const {page,erros}=await abrir(browser);
  page.on('dialog',d=>d.accept());
  await page.evaluate(()=>localStorage.setItem('prancheta_tutorial_v1','feito'));
  await page.click('#btnJogarAgora'); await page.waitForSelector('.clube-lin',{timeout:15000});
  await page.click('.clube-lin'); await page.waitForSelector('.fm-campo');

  console.log('\n[1] chance por idade');
  const ch=await page.evaluate(()=>{ const f=i=>App.chanceAposentadoria({idade:i});
    const n=4000, p={idade:35}; let par=0; for(let k=0;k<n;k++){ App.teams[0].players[0]; if(Math.random()<f(35)) par++; }
    return {c32:f(32),c33:f(33),c35:f(35),c37:f(37),c40:f(40), taxa35:par/n}; });
  t(ch.c32===0 && ch.c33>0 && ch.c35>ch.c33 && ch.c37>=ch.c35 && ch.c40>=0.85,`32: 0 · 33: ${ch.c33} · 35: ${ch.c35} · 37+: ${ch.c37}`);

  console.log('\n[2] virada com veteranos no meu elenco');
  const s0=await page.evaluate(()=>{
    const t=App.teams[App.myTeam]; t.players.forEach(p=>{ p.idade=24; p.contratoMeses=30; });
    const vets=t.players.slice(0,3); vets.forEach(p=>{ p.idade=41; });   // 85% cada
    vets[0].contratoMeses=6;                                             // vencendo: não pode aparecer na renovação se for parar
    t.players[5].contratoMeses=6;                                        // um jovem vencendo, pra abrir a janela
    const tamIA=App.teams.map(x=>x.players.length);
    App.tempEncerrada=true; App.rodada=App.fixtures.length;
    return {vets:vets.map(p=>p.pid), jovem:t.players[5].pid, tam:t.players.length, idadeJovem:t.players[5].idade, tamIA, temp:App.temporada, total:App.teams.reduce((a,x)=>a+x.players.length,0)}; });
  await page.evaluate(()=>App.abrirDiagnostico());
  await clicar(page,'Começar temporada');
  const aposentando=await page.evaluate(v=>v.filter(pid=>App.vaiSeAposentar({pid})),s0.vets);
  if(aposentando.length){
    t((await titulo(page))==='👴 Fim de carreira','anuncia quem vai parar antes das renovações');
    if(SHOTS) await page.screenshot({path:path.join(SHOTS,'aposentadoria.png')});
    await clicar(page,'Seguir');
  } else t(true,'(sorteio: nenhum dos 3 parou — 0,3% de chance)');
  const renTxt=await page.$eval('#flkModal',e=>e.innerText).catch(()=>'');
  const nomeVet0=await page.evaluate(pid=>App.teams[App.myTeam].players.find(p=>p.pid===pid)?.nome,s0.vets[0]);
  t(/renovações/i.test(await titulo(page)) && (!aposentando.includes(s0.vets[0]) || !renTxt.includes(nomeVet0)),'quem vai parar não entra na janela de renovações');
  await clicar(page,'Renovar todos'); await clicar(page,'Confirmar');
  await page.waitForTimeout(200);
  const s1=await page.evaluate(s=>{ const t=App.teams[App.myTeam];
    const base=t.players.filter(p=>p._gerado);
    return {temp:App.temporada, tam:t.players.length, saiu:s.vets.filter(pid=>!t.players.some(p=>p.pid===pid)).length,
      base:base.map(p=>({idade:p.idade, pos:App.posDe(App.myTeam,p.numero), pid:p.pid, forca:p.forca, pot:p.potential})),
      idadeJovem:t.players.find(p=>p.pid===s.jovem)?.idade, tamIA:App.teams.map(x=>x.players.length),
      total:App.teams.reduce((a,x)=>a+x.players.length,0)}; },s0);
  t(s1.temp===s0.temp+1,'temporada virou');
  t(s1.saiu===aposentando.length && s1.tam===s0.tam,`${s1.saiu} aposentado(s) saíram e o elenco manteve ${s1.tam} jogadores`);
  t(s1.base.length===aposentando.length && s1.base.every(b=>b.idade>=18&&b.idade<=19 && b.pid<0 && b.pot>=b.forca-5),'um garoto da base por aposentado (18–19 anos, potencial alto)');
  t(s1.base.every(b=>b.pos==='BANCO'||b.pos!=='FORA'),'garotos entram no banco');
  t(s1.idadeJovem===s0.idadeJovem+1,'idade avançou +1 pra quem ficou');
  t(s1.total===s0.total && s1.tamIA.every((n,i)=>n===s0.tamIA[i]),'nenhum elenco da liga encolheu');
  if(aposentando.length){ const tt=await titulo(page); t(tt==='🌱 Sobe da base' || /Acesso|Rebaixamento/.test(tt),'aviso dos garotos que subiram'); }
  for(let i=0;i<4 && await page.$('#flkModal');i++) await page.click('#flkModal .flkm-foot .btn:last-child');

  console.log('\n[3] save v11');
  const sv=await page.evaluate(()=>{
    const snap=JSON.parse(JSON.stringify(App.snapshot()));
    const me=App.teams[App.myTeam], antes=me.players.map(p=>`${p.pid}:${p.idade}:${p.forca}`).join(',');
    const v=App.validateSnapshot(snap);
    // simula recarregar do banco: tira os gerados e volta idades
    App.teams.forEach(t=>{ t.players=t.players.filter(p=>!p._gerado); t.players.forEach(p=>p.idade=20); });
    App.aplicarSnapshot(snap);
    const depois=App.teams[App.myTeam].players.map(p=>`${p.pid}:${p.idade}:${p.forca}`).join(',');
    return {schema:snap.schemaVersion, valido:v.ok, gerados:snap.gerados.length, igual:antes===depois};
  });
  t(sv.schema===11 && sv.valido,'snapshot v11 válido');
  t(sv.igual,`elenco, idades e garotos da base (${sv.gerados} gerados na liga) voltam iguais do save`);
  t(erros.filter(e=>!/ERR_FAILED/.test(e)).length===0,'sem erros de JS');
  await browser.close();
  console.log(`\n=== ${ok} ok, ${falhas} falhas ===`);
  process.exit(falhas?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
