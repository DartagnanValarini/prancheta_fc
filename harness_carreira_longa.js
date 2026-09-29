// harness_carreira_longa — D3: gate de release. Joga 12 temporadas seguidas pelo fluxo
// real (rodadas → balanço → fim de carreira → renovações → virada) e confere, a cada
// virada, que nada apodrece: elencos inteiros, sem jogador duplicado, séries com o
// mesmo número de clubes, números finitos, idade média estável, save enxuto que volta
// idêntico (ida e volta) e carrega rápido. No fim, salva como convidado e recarrega.
// Uso: node harness_carreira_longa.js [--temporadas N]
const {abrir,chromium}=require('./ui_test/abrir.js');
const N=process.argv.includes('--temporadas')?+process.argv[process.argv.indexOf('--temporadas')+1]:12;
let ok=0,falhas=0; const t=(c,m)=>{ if(c){ok++;console.log('  ✅',m);} else {falhas++;console.log('  ❌',m);} };
const titulo=page=>page.$eval('#flkModal .flkm-title',e=>e.textContent).catch(()=>'');

(async()=>{
  const browser=await chromium.launch();
  const {page,erros}=await abrir(browser,{seguro:true});
  page.on('dialog',d=>d.accept());
  await page.evaluate(()=>localStorage.setItem('prancheta_tutorial_v1','feito'));
  await page.click('#btnJogarAgora'); await page.waitForSelector('.clube-lin',{timeout:15000});
  await page.click('.clube-lin'); await page.waitForSelector('.fm-campo');
  await page.evaluate(()=>{ const o=App.garantirOpcoes(); o.coletiva=false; o.recado=false; o.autoSaveRodadas=99; App._salvarOrig=App.salvarSupabase; App.salvarSupabase=async()=>{}; });
  const div0=await page.evaluate(()=>{ const c={}; App.teams.forEach(t=>c[t.divisao]=(c[t.divisao]||0)+1); return c; });

  // assinatura do estado pra comparar ida e volta do save
  const retrato=`(()=>{ const r=[]; App.teams.forEach(t=>{ r.push(t.saldo); t.players.forEach(p=>r.push(p.pid,p.forca,p.idade,p.energia,p.gols||0,
      Object.values(p.attrs).join(','), p._capAttr?Object.values(p._capAttr).join(','):'-', p._growth||'-', p._ovInicialNat||'-')); });
      return r.join('|')+'#'+App.rodada+'#'+App.temporada+'#'+App.myTeam; })()`;

  const log=[]; let problemas=[];
  for(let temp=1; temp<=N; temp++){
    // --- temporada inteira (loop dentro da página: rápido) ---
    const r=await page.evaluate(()=>{
      let n=0, demissoes=0;
      if(App.estadual && App.estadual.status==='pendente'){ App.jogarFaseEstadual(); }   // exercita o estadual também
      while(n<80 && !(App.tempEncerrada||App.rodada>=App.fixtures.length)){
        App.escalarMelhor(); App.teams[App.myTeam].players.forEach(p=>{ if(p.energia<55) p.energia=55; });
        App.confianca=Math.max(App.confianca,70);   // não é teste de demissão
        App.jogarRodada(); if(!App.liveState) break;
        App.pularRodada(); App.fecharRodada();
        document.getElementById('flkModal')?.remove(); App._filaModais=[]; App._aposFila=[];
        if(App.demitido){ demissoes++; App.demitido=false; App.confianca=70; }
        n++;
      }
      return {n, fim:App.tempEncerrada||App.rodada>=App.fixtures.length, div:App.divisao, demissoes};
    });
    if(!r.fim){ problemas.push(`T${temp}: não terminou (${r.n} rodadas)`); break; }
    // --- virada pelo fluxo real ---
    await page.evaluate(()=>{ App.renderArena(); App.showTab('arena'); });
    await page.click('#btnNovaTemp');
    await page.click('#flkModal .flkm-foot .btn:has-text("Começar temporada")');
    for(let k=0;k<6;k++){
      const ti=await titulo(page);
      if(/Fim de carreira/.test(ti)) await page.click('#flkModal .flkm-foot .btn:has-text("Seguir")');
      else if(/renovações/.test(ti)){ await page.click('#flkModal .flkm-foot .btn:has-text("Renovar todos")'); await page.click('#flkModal .flkm-foot .btn:has-text("Confirmar")'); }
      else break;
    }
    await page.evaluate(()=>{ document.getElementById('flkModal')?.remove(); App._filaModais=[]; });
    // --- invariantes ---
    const inv=await page.evaluate((div0)=>{
      const pids=new Set(); let dup=0, minElenco=99, somaIdade=0, nJog=0, naoFinito=0;
      App.teams.forEach(t=>{ minElenco=Math.min(minElenco,t.players.length); if(!isFinite(t.saldo)) naoFinito++;
        t.players.forEach(p=>{ if(pids.has(p.pid)) dup++; pids.add(p.pid); somaIdade+=p.idade; nJog++;
          if(![p.forca,p.energia,p.idade,p.valor,p.salario].every(v=>isFinite(v))) naoFinito++; }); });
      const div={}; App.teams.forEach(t=>div[t.divisao]=(div[t.divisao]||0)+1);
      const mesmasSeries=Object.keys(div0).every(k=>div0[k]===div[k]);
      const s0=performance.now(); const snap=App.snapshot(); const json=JSON.stringify(snap); const tSnap=performance.now()-s0;
      return {temporada:App.temporada, dup, minElenco, idadeMedia:somaIdade/nJog, naoFinito, mesmasSeries, div, tam:json.length, tSnap, nullSaldo:snap.saldos.some(v=>v==null), gerados:snap.gerados.length};
    },div0);
    // ida e volta do save
    const rt=await page.evaluate((retrato)=>{
      const antes=eval(retrato); const json=JSON.stringify(App.snapshot());
      const t0=performance.now(); const r=App.aplicarSnapshot(JSON.parse(json)); const tLoad=performance.now()-t0;
      const depois=eval(retrato); return {igual:antes===depois, ok:r&&r.ok, tLoad};
    },retrato);
    log.push(`T${inv.temporada-1}→${inv.temporada}: ${r.n} rodadas · série ${r.div} · save ${(inv.tam/1e6).toFixed(2)} MB · load ${Math.round(rt.tLoad)} ms · idade ${inv.idadeMedia.toFixed(1)} · menor elenco ${inv.minElenco} · base ${inv.gerados}`);
    console.log('   '+log[log.length-1]);
    if(inv.dup) problemas.push(`T${temp}: ${inv.dup} jogador(es) em 2 clubes`);
    if(inv.minElenco<16) problemas.push(`T${temp}: elenco com ${inv.minElenco}`);
    if(inv.naoFinito||inv.nullSaldo) problemas.push(`T${temp}: ${inv.naoFinito} número(s) inválido(s)`);
    if(!inv.mesmasSeries) problemas.push(`T${temp}: séries mudaram de tamanho ${JSON.stringify(inv.div)}`);
    if(inv.idadeMedia<21 || inv.idadeMedia>31) problemas.push(`T${temp}: idade média ${inv.idadeMedia.toFixed(1)}`);
    if(inv.tam>3e6) problemas.push(`T${temp}: save ${(inv.tam/1e6).toFixed(2)} MB`);
    if(!rt.ok || !rt.igual) problemas.push(`T${temp}: save não volta idêntico`);
    if(rt.tLoad>3000) problemas.push(`T${temp}: load lento (${Math.round(rt.tLoad)} ms)`);
  }
  console.log('\n[resumo]');
  t(log.length===N,`${N} temporadas jogadas pelo fluxo real`);
  t(!problemas.some(p=>/2 clubes/.test(p)),'nenhum jogador em dois clubes');
  t(!problemas.some(p=>/elenco com/.test(p)),'nenhum elenco abaixo de 16');
  t(!problemas.some(p=>/inválido/.test(p)),'todos os números finitos (caixa, força, energia, idade, valor, salário)');
  t(!problemas.some(p=>/séries mudaram/.test(p)),'séries mantêm o número de clubes (acesso = rebaixamento)');
  t(!problemas.some(p=>/idade média/.test(p)),'idade média estável (aposentadoria + base equilibram)');
  t(!problemas.some(p=>/save .* MB/.test(p)),'save abaixo de 3 MB em todas as viradas');
  t(!problemas.some(p=>/idêntico/.test(p)),'save volta idêntico (atributos, teto, growth, caixa, rodada)');
  t(!problemas.some(p=>/load lento/.test(p)),'carregar leva menos de 3 s');
  if(problemas.length) console.log('   problemas:\n   - '+problemas.join('\n   - '));

  console.log('\n[convidado: salvar, recarregar a página, carregar]');
  const antes=await page.evaluate(async(retrato)=>{ App.salvarSupabase=App._salvarOrig; await App.salvarSupabase(false); const raw=localStorage.getItem('flk_save_1'); return {tam:raw?raw.length:0, r:eval(retrato)}; },retrato);
  t(antes.tam>0 && antes.tam<1.5e6,`cabe no localStorage com folga (${(antes.tam/1e6).toFixed(2)} M caracteres comprimido)`);
  await page.reload(); await page.waitForSelector('#btnJogarAgora');
  await page.click('#btnJogarAgora'); await page.waitForSelector('[data-slot="1"]',{timeout:15000});
  await page.click('[data-slot="1"]'); await page.waitForSelector('.fm-campo',{timeout:30000});
  const depois=await page.evaluate((retrato)=>({r:eval(retrato), assinado:App._saveAssinado}),retrato);
  t(depois.r===antes.r,'depois de recarregar a página: tudo igual');
  t(depois.assinado===true,'save continua assinado (C1)');
  t(erros.filter(e=>!/ERR_FAILED/.test(e)).length===0,'sem erros de JS'+(erros.length?': '+erros.slice(0,3).join(' | '):''));
  await browser.close();
  console.log(`\n=== ${ok} ok, ${falhas} falhas ===`);
  process.exit(falhas?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
