// harness_leilao — leilão quando vários clubes querem o mesmo jogador meu à venda
// (§6.1 item 11): abre com 2–4 clubes, lances sobem por 3 rodadas (ou desistem),
// aceitar a qualquer momento / esperar / recusar, decisão no fim, save.
// Uso: node harness_leilao.js [--shots DIR]
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
  await page.evaluate(()=>{ localStorage.setItem('catimba_tutorial_v1','feito'); });
  await page.click('#btnJogarAgora'); await page.waitForSelector('.clube-lin',{timeout:15000});
  await page.click('.clube-lin'); await page.waitForSelector('.fm-campo');
  await page.evaluate(()=>{ App.garantirOpcoes().coletiva=false; App.teams.forEach((t,i)=>{ if(i!==App.myTeam) t.saldo=500e6; }); });

  console.log('\n[1] mecânica (500 leilões simulados)');
  const m=await page.evaluate(()=>{
    const p=App.teams[App.myTeam].players[3], vm=App.valorMercadoReais(p);
    const cands=App.teams.map((t,i)=>({t,i})).filter(o=>o.i!==App.myTeam);
    let subiu=0, nClubes=[], tetoOk=true, fimOk=true;
    for(let k=0;k<500;k++){
      App.leiloes=[]; const l=App.abrirLeilao(p,cands,vm); nClubes.push(l.lances.length);
      const ini=App.maiorLance(l).valor;
      for(let r=0;r<3;r++) App.rodadaLeilao(l);
      const fim=App.maiorLance(l).valor; if(fim>ini) subiu++;
      if(l.lances.some(x=>x.valor>vm*1.4+1e5)) tetoOk=false;
      if(l.status!=='decidir'||l.rodadas!==0) fimOk=false;
    }
    App.leiloes=[];
    return {subiu:subiu/500, min:Math.min(...nClubes), max:Math.max(...nClubes), tetoOk, fimOk};
  });
  t(m.min>=2 && m.max<=4,`abre com ${m.min}–${m.max} clubes`);
  t(m.subiu>0.6,`o maior lance sobe na maioria dos leilões (${Math.round(m.subiu*100)}%)`);
  t(m.tetoOk,'nenhum lance passa de 140% do valor');
  t(m.fimOk,'depois de 3 rodadas o leilão pede decisão');

  console.log('\n[2] leilão de verdade pelo fim de rodada');
  const alvo=await page.evaluate(()=>{ App.CHANCE_LEILAO=1; const p=App.teams[App.myTeam].players.find(x=>{ const ps=App.posDe(App.myTeam,x.numero); return ps==='BANCO'; })||App.teams[App.myTeam].players[15];
    p.aVenda=true; App.ofertasRecebidas=[]; App.leiloes=[];
    // garante interesse nesta rodada
    const r=Math.random; let k=0; Math.random=()=>{ k++; return k===1?0.1:r(); }; App.gerarOfertasIA(); Math.random=r;
    return {pid:p.pid, nome:p.nome, caixa:App.teams[App.myTeam].saldo}; });
  t(await page.evaluate(pid=>!!App.leilaoDe(pid),alvo.pid),'2+ clubes interessados → abre leilão (não proposta única)');
  await page.evaluate(()=>{ App.liveState={done:true}; App.fecharRodada(); });
  t(/Leilão por/.test(await titulo(page)),'aviso de leilão aberto no fim da rodada');
  const txt=await page.$eval('#flkModal',e=>e.innerText);
  t(/Maior lance/i.test(txt) && /Caixa depois/i.test(txt) && /rodadas? de lances/i.test(txt),'mostra lances, caixa depois e prazo');
  if(SHOTS) await page.screenshot({path:path.join(SHOTS,'leilao.png')});
  await clicar(page,'Esperar mais lances');
  // painel no mercado
  await page.evaluate(()=>{ App.renderMercado(); App.showTab('mercado'); });
  t(await page.$('#tab-mercado [data-leilao]')!==null,'painel "🔨 Leilões" no Mercado');
  // 3 rodadas → encerra e pede decisão
  const antes=await page.evaluate(pid=>App.maiorLance(App.leilaoDe(pid)).valor,alvo.pid);
  for(let r=0;r<3;r++){ await page.evaluate(()=>{ App.gerarOfertasIA(); App.liveState={done:true}; App.fecharRodada(); }); if(r<2) for(let i=0;i<3 && await page.$('#flkModal');i++) await page.click('#flkModal .flkm-foot .btn:has-text("Esperar"), #flkModal .flkm-foot .btn:last-child'); }
  t((await titulo(page))==='🔨 Leilão encerrado','depois de 3 rodadas: "Leilão encerrado", decida');
  t(!(await page.$('#flkModal .flkm-foot .btn:has-text("Esperar")')),'encerrado não tem mais "esperar"');
  const top=await page.evaluate(pid=>{ const l=(App.leiloes||[]).find(x=>x.pid===pid); const m=App.maiorLance(l); return {valor:m.valor, ti:m.ti}; },alvo.pid);
  t(top.valor>=antes,`maior lance ${antes/1e6}M → ${top.valor/1e6}M`);
  await clicar(page,'Vender por');
  const fim=await page.evaluate(({pid,ti})=>({onde:App.timeDoJogador(pid), caixa:App.teams[App.myTeam].saldo, leiloes:(App.leiloes||[]).length}),{pid:alvo.pid,ti:top.ti});
  t(fim.onde===top.ti && fim.caixa===alvo.caixa+top.valor && fim.leiloes===0,'vendido pro maior lance; caixa sobe o valor');
  t((await titulo(page))==='✅ Vendido no leilão','confirmação da venda');
  await clicar(page,'Entendido');

  console.log('\n[3] recusar e save');
  const sv=await page.evaluate(()=>{
    const p=App.teams[App.myTeam].players.find(x=>App.posDe(App.myTeam,x.numero)==='BANCO'); p.aVenda=true;
    const cands=App.teams.map((t,i)=>({t,i})).filter(o=>o.i!==App.myTeam);
    const l=App.abrirLeilao(p,cands,App.valorMercadoReais(p));
    App.ofertasRecebidas=[{pid:App.teams[App.myTeam].players[0].pid,nome:'X',de:cands[0].i,deNome:'Y',valor:1e6,rodada:0}];
    const snap=JSON.parse(JSON.stringify(App.snapshot()));
    App.leiloes=[]; App.ofertasRecebidas=[]; App.aplicarSnapshot(snap);
    const volta=(App.leiloes||[]).length===1 && App.leiloes[0].lances.length===l.lances.length && App.ofertasRecebidas.length===1;
    const r=App.fecharLeilao(p.pid,false);
    return {volta, recusou:r.ok && !(App.leiloes||[]).length && App.timeDoJogador(p.pid)===App.myTeam};
  });
  t(sv.volta,'leilão e proposta pendente sobrevivem ao save');
  t(sv.recusou,'recusar todos: jogador fica, leilão some');
  console.log('\n[4] card do jogador: Vender e Leilão');
  await page.evaluate(()=>{ App.leiloes=[]; App.showTab('escala'); window.scrollTo(0,document.body.scrollHeight); });
  const p4=await page.evaluate(()=>{ const p=App.teams[App.myTeam].players.find(x=>App.posDe(App.myTeam,x.numero)==='BANCO'); p.aVenda=false; return {pid:p.pid, num:p.numero, vm:App.valorMercadoReais(p)}; });
  await page.evaluate(n=>App.abrirFichaModal(App.myTeam,n),p4.num);
  const noViewport=await page.$eval('#fichaModal .fmodal-box',e=>{ const r=e.getBoundingClientRect(); return r.top>=0 && r.bottom<=innerHeight+1; });
  t(noViewport,'card abre na tela mesmo com a página rolada');
  t(await page.$('#fmVender') && await page.$('#fmLeilao'),'card do meu jogador tem "Vender" e "Leilão"');
  await page.click('#fmVender');
  t(await page.evaluate(pid=>App.teams[App.myTeam].players.find(p=>p.pid===pid).aVenda,p4.pid) && /Tirar da venda/.test(await page.textContent('#fmVender')),'"Vender" anuncia à venda (igual ao Mercado) e vira "Tirar da venda"');
  await page.click('#fmLeilao');
  t(/Leilão por/.test(await titulo(page)),'"Leilão" abre o leilão na hora');
  const lances=await page.evaluate(pid=>{ const l=App.leilaoDe(pid); return l.lances.map(x=>x.valor); },p4.pid);
  const ps=p4.vm<2e6?1e4:1e5, piso=Math.round(p4.vm*0.6/ps)*ps;
  t(Math.min(...lances)===piso && lances.every(v=>v>=piso && v<=p4.vm*0.7+ps),`lances começam em 60% do valor (${(piso/1e6).toFixed(1)} M de ${(p4.vm/1e6).toFixed(1)} M)`);
  await clicar(page,'Esperar');
  const outroCard=await page.evaluate(()=>{ const ti=App.teams.findIndex((t,i)=>i!==App.myTeam); App.abrirFichaModal(ti,App.teams[ti].players[0].numero); return !document.getElementById('fmLeilao'); });
  t(outroCard,'card de jogador de outro clube não tem esses botões');
  await page.evaluate(()=>document.getElementById('fichaModal')?.remove());
  t(erros.filter(e=>!/ERR_FAILED/.test(e)).length===0,'sem erros de JS');
  await browser.close();
  console.log(`\n=== ${ok} ok, ${falhas} falhas ===`);
  process.exit(falhas?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
