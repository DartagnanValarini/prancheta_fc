// harness_bonus — B1 extra: bônus recompensados opt-in fora da partida.
//  ⚡ Fisioterapia extra: +10 de energia pro elenco, 1x por rodada (botão na Formação)
//  🔭 Relatório do olheiro: faixa de 5 pontos do potencial oculto, 3 por rodada,
//     em qualquer jogador; o revelado fica salvo.
// Os dois passam pelo mostrarAnuncio() (placeholder até o SDK entrar).
// Uso: node harness_bonus.js [--shots DIR]
const path=require('path'),fs=require('fs');
const {abrir,chromium}=require('./ui_test/abrir.js');
const SHOTS=process.argv.includes('--shots')?process.argv[process.argv.indexOf('--shots')+1]:null;
if(SHOTS) fs.mkdirSync(SHOTS,{recursive:true});
let ok=0,falhas=0; const t=(c,m)=>{ if(c){ok++;console.log('  ✅',m);} else {falhas++;console.log('  ❌',m);} };
const titulo=page=>page.$eval('#flkModal .flkm-title',e=>e.textContent).catch(()=>'');

(async()=>{
  const browser=await chromium.launch();
  const {page,erros}=await abrir(browser);
  page.on('dialog',d=>d.accept());
  await page.evaluate(()=>localStorage.setItem('catimba_tutorial_v1','feito'));
  await page.click('#btnJogarAgora'); await page.waitForSelector('.clube-lin',{timeout:15000});
  await page.click('.clube-lin'); await page.waitForSelector('.fm-campo');
  await page.evaluate(()=>{ const o=App.garantirOpcoes(); o.coletiva=false; o.recado=false; if(App.estadual) App.estadual.status='pulado'; });

  console.log('\n[1] fisioterapia extra');
  await page.evaluate(()=>{ App.teams[App.myTeam].players.forEach((p,k)=>{ p.energia=k===0?95:60; }); App.renderShell(); App.showTab('escala'); });
  t(!!(await page.$('#btnBonusEnergia')),'botão "⚡ Fisioterapia extra" na Formação');
  await page.click('#btnBonusEnergia');
  t(/Fisioterapia extra/.test(await titulo(page)),'abre o modal opt-in (mostrarAnuncio)');
  await page.click('#flkModal .flkm-foot .btn:has-text("Assistir e receber")');
  const e1=await page.evaluate(()=>{ const ps=App.teams[App.myTeam].players; return {a:ps[0].energia, b:ps[1].energia, pode:App.podeBonusEnergia(), btn:!!document.getElementById('btnBonusEnergia')}; });
  t(e1.a===100 && e1.b===70,`+10 de energia, sem passar de 100 (95→${e1.a}, 60→${e1.b})`);
  t(!e1.pode && !e1.btn,'uma vez por rodada: o botão some depois de usar');
  t((await page.evaluate(()=>App.aplicarBonusEnergia()))===0,'chamar de novo na mesma rodada não dá nada');
  await page.evaluate(()=>{ document.querySelectorAll('#flkModal').forEach(e=>e.remove()); App._filaModais=[]; });
  const e2=await page.evaluate(()=>{ App.rodada++; const pode=App.podeBonusEnergia(); App.jogarRodada(); const vivo=App.podeBonusEnergia(); clearInterval(App.liveState.timer); App.liveState=null; App.rodada--; return {pode, vivo}; });
  t(e2.pode && !e2.vivo,'na rodada seguinte volta; com a partida rolando, não');
  await page.evaluate(()=>{ App.opcoes.adFree=true; App.bonus.energia=null; App.teams[App.myTeam].players.forEach(p=>p.energia=50); App.bonusEnergiaUI(); });
  const tt=await titulo(page);
  t(!/Fisioterapia extra/.test(tt) && (await page.evaluate(()=>App.teams[App.myTeam].players[0].energia))===60,`quem removeu anúncios recebe direto, sem o modal do anúncio (abriu: "${tt}")`);
  await page.evaluate(()=>{ document.querySelectorAll('#flkModal').forEach(e=>e.remove()); App._filaModais=[]; });
  await page.evaluate(()=>{ App.opcoes.adFree=false; });

  console.log('\n[2] relatório do olheiro');
  const alvo=await page.evaluate(()=>{ const ti=App.teams.findIndex((t,i)=>i!==App.myTeam); const p=App.teams[ti].players[0]; App.bonus.olheiroRod=null; return {ti, num:p.numero, pid:p.pid, pot:Math.round(p.potential||Motor.melhorGeral(p).ov)}; });
  await page.evaluate(a=>App.abrirFichaModal(a.ti,a.num),alvo);
  t(!!(await page.$('#fichaModal #fmOlheiro')),'ficha de jogador de OUTRO clube tem "🔭 Relatório do olheiro"');
  await page.click('#fmOlheiro');
  t(/Relatório do olheiro/.test(await titulo(page)),'abre o modal opt-in');
  await page.click('#flkModal .flkm-foot .btn:has-text("Assistir e receber")');
  const txt=await page.$eval('#fichaModal .ficha-olheiro',e=>e.textContent.replace(/\s+/g,' '));
  const m=txt.match(/(\d+)–(\d+)/); const lo=m&&+m[1], hi=m&&+m[2];
  t(m && hi-lo===4 && lo<=alvo.pot && alvo.pot<=hi,`ficha mostra a faixa ${lo}–${hi} (potencial real ${alvo.pot} dentro)`);
  if(SHOTS) await page.screenshot({path:path.join(SHOTS,'bonus_olheiro.png')});
  await page.evaluate(()=>document.getElementById('fichaModal')?.remove());
  const c=await page.evaluate(()=>{
    const ps=App.teams.flatMap(t=>t.players).slice(0,400);
    const dentro=ps.filter(p=>{ const f=App.faixaPotencial(p), pot=Math.round(p.potential||Motor.melhorGeral(p).ov); return f.lo<=pot && pot<=f.hi && f.hi-f.lo===4; }).length;
    const centradas=ps.filter(p=>{ const f=App.faixaPotencial(p), pot=Math.round(p.potential||Motor.melhorGeral(p).ov); return f.lo+2===pot; }).length;
    const resto=App.olheiroRestante();
    const outros=App.teams[App.myTeam].players.slice(0,4);
    const r=outros.map(p=>!!App.revelarPotencial(p));
    return {n:ps.length, dentro, centradas, resto, r, fim:App.olheiroRestante()};
  });
  t(c.dentro===c.n,`faixa sempre contém o potencial real (${c.dentro}/${c.n})`);
  t(c.centradas<c.n*0.4,`faixa nem sempre centrada (${c.centradas}/${c.n} centradas)`);
  t(c.resto===2 && c.r.join()==='true,true,false,false' && c.fim===0,'3 relatórios por rodada (o 4º é recusado)');
  const ja=await page.evaluate(pid=>{ const p=App.teams.flatMap(t=>t.players).find(x=>x.pid===pid); return !!App.revelarPotencial(p); },alvo.pid);
  t(ja,'jogador já revelado continua visível mesmo sem relatórios sobrando');

  console.log('\n[3] save');
  const sv=await page.evaluate(pid=>{
    const snap=JSON.parse(JSON.stringify(App.snapshot()));
    const antes=JSON.stringify(App.bonus);
    App.bonus=null; App.aplicarSnapshot(snap);
    const volta=JSON.stringify(App.bonus)===antes && !!App.bonus.revelados[pid];
    const sujo=App.sanearBonus({energia:'<x>',olheiroUsos:99,revelados:{'1':{lo:'a',hi:2},'2':{lo:50,hi:54},'z':{lo:1,hi:5}}});
    const antigo=JSON.parse(JSON.stringify(snap)); delete antigo.bonus; App.aplicarSnapshot(antigo);
    return {volta, sujo, vazio:Object.keys(App.bonus.revelados).length===0 && App.bonus.energia===null};
  },alvo.pid);
  t(sv.volta,'bônus usados e potenciais revelados voltam pelo save');
  t(sv.sujo.energia===null && sv.sujo.olheiroUsos===3 && JSON.stringify(sv.sujo.revelados)==='{"2":{"lo":50,"hi":54}}','save adulterado é saneado');
  t(sv.vazio,'save sem o campo carrega vazio');
  t(erros.filter(e=>!/ERR_FAILED/.test(e)).length===0,'sem erros de JS'+(erros.length?': '+erros.slice(0,3).join(' | '):''));
  await browser.close();
  console.log(`\n=== ${ok} ok, ${falhas} falhas ===`);
  process.exit(falhas?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
