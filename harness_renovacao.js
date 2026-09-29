// harness_renovacao — janela de renovações na virada (§6.1 item 8): pedido do
// jogador (nota/idade/moral), renovar / contrapropor / dispensar, contador de
// meses de caixa, contratos perdem 12 meses na virada e a IA renova os dela.
// Uso: node harness_renovacao.js [--shots DIR]
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

  console.log('\n[1] pedido do jogador');
  const ped=await page.evaluate(()=>{ const p=App.teams[App.myTeam].players[5]; const bk={s:p._somaNotas,q:p._qtdNotas,m:p.moral,i:p.idade};
    p.idade=26; p.moral=70; p._somaNotas=0; p._qtdNotas=0; const neutro=App.pedidoRenovacao(p);
    p._somaNotas=7.4*10; p._qtdNotas=10; const craque=App.pedidoRenovacao(p);
    p.moral=30; const insat=App.pedidoRenovacao(p);
    p.idade=34; p.moral=70; const vet=App.pedidoRenovacao(p);
    p._somaNotas=bk.s; p._qtdNotas=bk.q; p.moral=bk.m; p.idade=bk.i;
    return {neutro, craque, insat, vet}; });
  t(ped.craque.sal>ped.neutro.sal,`temporada boa pede mais (${ped.neutro.sal} → ${ped.craque.sal} mil)`);
  t(ped.insat.sal>ped.craque.sal && ped.insat.exigente,'insatisfeito pede ainda mais e fica exigente');
  t(ped.vet.anos===1 && ped.neutro.anos===2,'prazo pedido: 26 anos → 2 anos; 34 anos → 1 ano');

  console.log('\n[2] janela de renovações');
  const setup=await page.evaluate(()=>{ const t=App.teams[App.myTeam]; t.saldo=10e6;
    const ps=t.players.slice(0,4); ps.forEach(p=>{ p.contratoMeses=6; p.moral=70; });
    ps[2].moral=30;   // exigente
    t.players.slice(4).forEach(p=>{ if(p.contratoMeses<=12) p.contratoMeses=30; });
    // um da IA vencendo
    const ia=App.teams.findIndex((x,i)=>i!==App.myTeam); App.teams[ia].players[0].contratoMeses=10;
    App.tempEncerrada=true; App.rodada=App.fixtures.length;
    return {pids:ps.map(p=>p.pid), sal:ps.map(p=>p.salario), ia, iaPid:App.teams[ia].players[0].pid, contrOutro:t.players[6].contratoMeses, temp:App.temporada}; });
  await page.evaluate(()=>App.abrirDiagnostico());
  await clicar(page,'Começar temporada');
  t((await titulo(page))==='📝 Janela de renovações','depois do balanço abre a janela de renovações');
  t(!(await page.$('#flkModal [data-flkm-x]')),'é obrigatória (sem ✕)');
  t(/Decida 4 contratos/i.test(await page.$eval('#flkModal .flkm-foot',e=>e.innerText)),'não vira a temporada sem decidir todos');
  if(SHOTS) await page.screenshot({path:path.join(SHOTS,'renovacoes.png')});
  const folha0=await page.$eval('#flkModal .contador',e=>e.innerText);
  // 0: renovar pelo pedido
  await page.click(`#flkModal [data-ren="ok"][data-pid="${setup.pids[0]}"]`);
  // 1: contrapropor −8% (contente → aceita)
  await page.click(`#flkModal [data-ren="contra"][data-pid="${setup.pids[1]}"]`);
  const pedido1=await page.evaluate(pid=>App.pedidoRenovacao(App.teams[App.myTeam].players.find(p=>p.pid===pid)).sal,setup.pids[1]);
  await page.fill('#flkm_sal',String(Math.round(pedido1*0.92))); await clicar(page,'Enviar');
  t((await titulo(page))==='📝 Janela de renovações' && /renovado/.test(await page.$eval('#flkModal .ren-lista',e=>e.innerText)),'contente aceita −8%');
  // 2: exigente recusa −8%
  await page.click(`#flkModal [data-ren="contra"][data-pid="${setup.pids[2]}"]`);
  const pedido2=await page.evaluate(pid=>App.pedidoRenovacao(App.teams[App.myTeam].players.find(p=>p.pid===pid)).sal,setup.pids[2]);
  await page.fill('#flkm_sal',String(Math.round(pedido2*0.92))); await clicar(page,'Enviar');
  t((await titulo(page))==='❌ Não aceitou','exigente recusa −8%');
  await clicar(page,'Entendido');
  await page.click(`#flkModal [data-ren="fora"][data-pid="${setup.pids[2]}"]`);
  // 3: dispensar
  await page.click(`#flkModal [data-ren="fora"][data-pid="${setup.pids[3]}"]`);
  const folha1=await page.$eval('#flkModal .contador',e=>e.innerText);
  t(folha0!==folha1,'contador recalcula a folha com as decisões');
  const saldo0=await page.evaluate(()=>App.teams[App.myTeam].saldo);
  await clicar(page,'Confirmar e virar');
  await page.waitForTimeout(150);
  const fim=await page.evaluate(s=>{ const t=App.teams[App.myTeam], by=pid=>t.players.find(p=>p.pid===pid);
    const ia=App.teams[s.ia].players.find(p=>p.pid===s.iaPid);
    return {temp:App.temporada, r0:by(s.pids[0]), r1:by(s.pids[1]), d2:by(s.pids[2]), d3:by(s.pids[3]),
      ondeD3:App.timeDoJogador(s.pids[3]), divD3:App.teams[App.timeDoJogador(s.pids[3])]?.divisao, minhaDiv:t.divisao,
      outro:t.players[4].contratoMeses, ia:ia&&ia.contratoMeses, saldo:t.saldo}; },setup);
  t(fim.temp===setup.temp+1,'temporada virou');
  t(fim.r0 && fim.r0.contratoMeses>=12 && fim.r1 && fim.r1.salario===Math.round(pedido1*0.92),'renovados ficam, com salário e prazo novos');
  t(!fim.d2 && !fim.d3 && fim.ondeD3>=0 && fim.ondeD3!==undefined,'dispensados saem pra outro clube');
  t(fim.ia===24,'IA renova o contrato que venceu (24 meses)');
  t(erros.filter(e=>!/ERR_FAILED/.test(e)).length===0,'sem erros de JS');
  await browser.close();
  console.log(`\n=== ${ok} ok, ${falhas} falhas ===`);
  process.exit(falhas?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
