// harness_eliminacao — Série D (07/10/2026): quem fica fora do mata-mata.
// Bug: na rodada 11 (1ª do mata-mata) a tabela do grupo somava os gols dos jogos de
// mata-mata ao vivo — o time eliminado aparecia em 2º (classificado) quando era 3º — e
// nada avisava que o usuário tinha caído; o presidente só dizia "sem jogo nesta rodada".
// Confere: tabela do grupo congelada no mata-mata, aviso de eliminação, fala/meta do
// presidente e "Simular até o fim" encerrando a temporada.
// Uso: node harness_eliminacao.js
const {abrir,chromium}=require('./ui_test/abrir.js');
let ok=0,falhas=0; const t=(c,m)=>{ if(c){ok++;console.log('  ✅',m);} else {falhas++;console.log('  ❌',m);} };

(async()=>{
  const browser=await chromium.launch();
  const {page,erros}=await abrir(browser,{seguro:true});
  page.on('dialog',d=>d.accept());
  await page.evaluate(()=>localStorage.setItem('catimba_tutorial_v1','feito'));
  await page.click('#btnJogarAgora'); await page.waitForSelector('.clube-lin',{timeout:15000});
  await page.click('.clube-lin'); await page.waitForSelector('.fm-campo');
  await page.evaluate(()=>{ const o=App.garantirOpcoes(); o.coletiva=false; o.autoSaveRodadas=99; App.salvarSupabase=async()=>{}; if(App.estadual) App.estadual.status='pulado'; });
  const div=await page.evaluate(()=>App.divisao);
  t(div==='D',`time do usuário na Série D (${div})`);

  console.log('\n[1] fase de grupos com o meu time forçado a ficar fora');
  const r1=await page.evaluate(()=>{
    // sabota só a força em campo do meu time → termina no fundo do grupo
    const orig=Motor.forcaCampo.bind(Motor), meus=new Set(App.teams[App.myTeam].players);
    Motor.forcaCampo=function(c){ const f=orig(c); return c.some(x=>x&&x.ref&&meus.has(x.ref))?f*0.2:f; };
    for(let n=0;n<10;n++){ App.escalarMelhor(); App.confianca=Math.max(App.confianca,70); App.jogarRodada(); App.pularRodada();
      if(n<9){ App.fecharRodada(); document.getElementById('flkModal')?.remove(); App._filaModais=[]; App._aposFila=[]; } }
    Motor.forcaCampo=orig;
    return {fase:App.fase, pend:!!App._eliminacaoPendente, elim:App.eliminacaoSerieD(), noKO:App.mataMata.confrontos.some(c=>c.includes(App.myTeam))};
  });
  t(r1.fase==='ko' && !r1.noKO,'grupos acabaram e o meu time não está no mata-mata');
  t(r1.pend && r1.elim && r1.elim.onde==='grupos' && r1.elim.pos>2,`eliminação detectada (${JSON.stringify(r1.elim)})`);

  console.log('\n[2] aviso de eliminação e recado do presidente');
  await page.evaluate(()=>{ App.garantirOpcoes().recado=true; App.fecharRodada(); });
  const tit1=await page.$eval('#flkModal .flkm-title',e=>e.textContent).catch(()=>'');
  const corpo1=await page.$eval('#flkModal',e=>e.textContent).catch(()=>'');
  t(/Eliminado da Série D/.test(tit1),`modal de eliminação aparece ("${tit1.trim()}")`);
  t(/no grupo/.test(corpo1) && /Simular até o fim/.test(corpo1),'mostra a posição no grupo e o botão de simular');
  await page.click('#flkModal .flkm-foot .btn:has-text("Acompanhar")');
  let tit2='',corpo2='';
  for(let k=0;k<6;k++){ tit2=await page.$eval('#flkModal .flkm-title',e=>e.textContent).catch(()=>'');
    if(/presidente/i.test(tit2)){ corpo2=await page.$eval('#flkModal',e=>e.textContent); break; }
    if(!tit2) break; await page.click('#flkModal .flkm-foot .btn.primary, #flkModal .flkm-foot .btn').catch(()=>{}); }
  t(/fora do mata-mata/.test(corpo2),'presidente fala da eliminação (não só "sem jogo")');
  t(/eliminado na fase de grupos/.test(corpo2) && !/hoje: /.test(corpo2),'meta mostra "eliminado na fase de grupos" em vez de "hoje: Nº"');
  await page.evaluate(()=>{ document.getElementById('flkModal')?.remove(); App._filaModais=[]; App._aposFila=[]; });

  console.log('\n[3] tabela do grupo não muda com os jogos ao vivo do mata-mata');
  const r3=await page.evaluate(()=>{
    const antes=App.classificacao().map(s=>s.i+':'+s.pts+':'+(s.gp-s.gc)).join(',');
    App.jogarRodada(); const L=App.liveState; clearInterval(L.timer);
    // força gols em todos os jogos ao vivo
    L.sims.forEach(s=>{ s.gc+=2; s.gf+=1; });
    const d=App.deltasAoVivo(), durante=App.classificacao(d).map(s=>s.i+':'+s.pts+':'+(s.gp-s.gc)).join(',');
    App.pularRodada();
    const depois=App.classificacao().map(s=>s.i+':'+s.pts+':'+(s.gp-s.gc)).join(',');
    App.liveState=null;
    return {antes,durante,depois,d};
  });
  t(r3.d===null,'sem deltas ao vivo no mata-mata');
  t(r3.antes===r3.durante && r3.antes===r3.depois,'classificação do grupo idêntica antes, durante e depois da rodada');

  console.log('\n[4] simular até o fim');
  const r4=await page.evaluate(()=>{ App.simularRestoTemporada(); document.getElementById('flkModal')?.remove();
    return {fim:App.tempEncerrada||App.rodada>=App.fixtures.length, fase:App.fase, rod:App.rodada, n:App.fixtures.length, campeao:App.mataMata&&App.mataMata.campeao}; });
  t(r4.fim && r4.fase==='fim' && r4.campeao!=null,`temporada encerrada com campeão (${r4.rod}/${r4.n})`);

  t(erros.filter(e=>!/ERR_FAILED/.test(e)).length===0,'sem erros de JS'+(erros.filter(e=>!/ERR_FAILED/.test(e)).length?': '+erros.filter(e=>!/ERR_FAILED/.test(e)).slice(0,3).join(' | '):''));
  await browser.close();
  console.log(`\n=== ${ok} ok, ${falhas} falhas ===`);
  process.exit(falhas?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
