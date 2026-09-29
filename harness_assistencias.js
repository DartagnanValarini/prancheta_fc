// harness_assistencias — passes pra gol: motor, nota, estatísticas e save (v10).
// Uso: node harness_assistencias.js
const {abrir,chromium}=require('./ui_test/abrir.js');
let ok=0,falhas=0; const t=(c,m)=>{ if(c){ok++;console.log('  ✅',m);} else {falhas++;console.log('  ❌',m);} };
(async()=>{
  const browser=await chromium.launch();
  const {page,erros}=await abrir(browser);
  await page.evaluate(()=>localStorage.setItem('prancheta_tutorial_v1','feito'));
  await page.click('#btnJogarAgora'); await page.waitForSelector('.clube-lin',{timeout:15000});
  await page.click('.clube-lin'); await page.waitForSelector('.fm-campo');

  console.log('\n[1] quem dá o passe (10 mil gols simulados)');
  const d=await page.evaluate(()=>{
    const t=App.teams[App.myTeam]; App.escalarMelhor();
    const campo=App.onzeDe(App.myTeam).map((p,idx)=>({ref:p,nome:p.nome,posicao:App.slotsDe(App.myTeam)[idx],energia:100}));
    const porPos={}, n=10000; let com=0, autoAssist=0;
    for(let k=0;k<n;k++){ const art=App.artilheiro(campo), a=App.assistente(campo,art);
      if(a){ com++; if(a===art) autoAssist++; porPos[a.posicao]=(porPos[a.posicao]||0)+1; } }
    return {taxa:com/n, autoAssist, porPos};
  });
  t(d.taxa>0.74 && d.taxa<0.82,`~78% dos gols têm assistência (${(d.taxa*100).toFixed(1)}%)`);
  t(d.autoAssist===0,'ninguém dá assistência pro próprio gol');
  const pp=d.porPos, soma=k=>k.reduce((s,x)=>s+(pp[x]||0),0);
  t((pp.GK||0)<soma(['MC','AML','AMR','AMC','ML','MR'])/50,'goleiro quase nunca dá assistência');
  t(soma(['MC','AML','AMR','AMC','ML','MR'])>soma(['DC','DL','DR']),'meias/pontas dão mais passes que a defesa');

  console.log('\n[2] nota da partida');
  const n=await page.evaluate(()=>{ const p=App.teams[App.myTeam].players.find(x=>x.setorNat==='MEI');
    const base={slot:'MC',resultado:'e',golsSofridosTime:1,energiaFinal:70};
    return {sem:Rating.matchRating(p,base), com:Rating.matchRating(p,{...base,assistencias:1}), gol:Rating.matchRating(p,{...base,golsFeitos:1})}; });
  t(n.com>n.sem && n.com<n.gol,`assistência sobe a nota, menos que um gol (${n.sem} → ${n.com}; gol ${n.gol})`);

  console.log('\n[3] temporada de verdade (8 rodadas)');
  page.on('dialog',x=>x.accept());
  for(let r=0;r<8;r++){
    await page.evaluate(()=>{ if(App.onzeDe(App.myTeam).length<11) App.escalarMelhor(); App.jogarRodada(); });
    await page.evaluate(()=>App.pularRodada());
    await page.evaluate(()=>{ App.fecharRodada(); const m=document.getElementById('flkModal'); if(m) m.remove(); App._filaModais=[]; });
  }
  const st=await page.evaluate(()=>{
    const div=App._jogadoresDaMinhaDivisao(); const gols=div.reduce((s,o)=>s+(o.p.golsTemp||0),0), ast=div.reduce((s,o)=>s+(o.p.assistTemp||0),0);
    const lider=App.topAssistencias(1)[0];
    App.cmpAba='stats'; App.renderCompeticoes(); App.showTab('competicoes');
    const txt=document.getElementById('tab-competicoes').innerText;
    return {gols, ast, lider:lider&&lider.p.assistTemp, painel:/Assistências ·/.test(txt), carreira:div.every(o=>(o.p.assist||0)>=(o.p.assistTemp||0))};
  });
  t(st.gols>0 && st.ast/st.gols>0.65 && st.ast/st.gols<0.9,`assistências ≈ 78% dos gols da divisão (${st.ast}/${st.gols})`);
  t(st.painel && st.lider>0,'painel "Assistências" nas Estatísticas com líder');
  t(st.carreira,'carreira ≥ temporada pra todos');

  console.log('\n[4] save v10 e migração do v9');
  const sv=await page.evaluate(()=>{
    const snap=JSON.parse(JSON.stringify(App.snapshot()));
    const me=App.teams[App.myTeam]; const antes=me.players.map(p=>`${p.assist||0}/${p.assistTemp||0}`).join(',');
    App.teams.forEach(t=>t.players.forEach(p=>{ delete p.assist; delete p.assistTemp; }));
    App.aplicarSnapshot(snap); const depois=App.teams[App.myTeam].players.map(p=>`${p.assist||0}/${p.assistTemp||0}`).join(',');
    const v9=JSON.parse(JSON.stringify(snap)); v9.schemaVersion=9; Object.values(v9.jogadoresById).forEach(j=>{ delete j.assist; delete j.assistTemp; });
    const ok9=App.validateSnapshot(v9).ok; App.aplicarSnapshot(v9);
    return {v:snap.schemaVersion, igual:antes===depois, ok9, zero:App.teams[App.myTeam].players.every(p=>p.assist===0&&p.assistTemp===0)};
  });
  t(sv.v===10 && sv.igual,'snapshot v10 preserva assistências');
  t(sv.ok9 && sv.zero,'save v9 carrega com assistências zeradas');
  t(erros.filter(e=>!/ERR_FAILED/.test(e)).length===0,'sem erros de JS');
  await browser.close();
  console.log(`\n=== ${ok} ok, ${falhas} falhas ===`);
  process.exit(falhas?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
