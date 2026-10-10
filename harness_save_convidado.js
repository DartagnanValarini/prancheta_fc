// harness_save_convidado — o save do convidado (localStorage) precisa CABER e
// VOLTAR ÍNTEGRO: o snapshot tem ~8 MB e a cota é ~5 M caracteres, então vai
// comprimido (gzip + base64). Também confere que a assinatura HMAC (C1) sobrevive
// ao ciclo salvar → recarregar (antes, referências repetidas quebravam o canônico).
// Roda em https (contexto seguro) para ter crypto.subtle. Uso: node harness_save_convidado.js
const {abrir,chromium}=require('./ui_test/abrir.js');
let ok=0,falhas=0; const t=(c,m)=>{ if(c){ok++;console.log('  ✅',m);} else {falhas++;console.log('  ❌',m);} };

(async()=>{
  const browser=await chromium.launch();
  const {page,erros}=await abrir(browser,{seguro:true});
  await page.evaluate(()=>localStorage.setItem('catimba_tutorial_v1','feito'));
  await page.click('#btnJogarAgora'); await page.waitForSelector('.clube-lin',{timeout:15000});
  await page.click('.clube-lin'); await page.waitForSelector('.fm-campo');

  console.log('\n[1] assinatura (C1) sobrevive a JSON e à compressão');
  const c1=await page.evaluate(async()=>{
    const e=App.snapshot(), sig=await App.assinarSnapshot(e);
    const rt=JSON.parse(JSON.stringify(e));
    const z=JSON.parse(await App.descomprimir(await App.comprimir(JSON.stringify(e))));
    const adult=JSON.parse(JSON.stringify(e)); adult.saldos[App.myTeam]+=1e9;
    return {sig:!!sig, rt:await App.conferirAssinatura(rt,sig), z:await App.conferirAssinatura(z,sig), adult:await App.conferirAssinatura(adult,sig)};
  });
  t(c1.sig && c1.rt,'save passado por JSON continua assinado');
  t(c1.z,'save comprimido/descomprimido continua assinado');
  t(!c1.adult,'save com saldo adulterado continua reprovado');

  console.log('\n[2] salvar 3 rodadas e recarregar');
  for(let i=0;i<3;i++){
    await page.evaluate(()=>{ if(App.onzeDe(App.myTeam).length<11) App.escalarMelhor(); App.jogarRodada(); });
    await page.evaluate(()=>App.pularRodada());
    await page.evaluate(()=>{ App.fecharRodada(); const m=document.getElementById('flkModal'); if(m) m.remove(); App._filaModais=[]; });
  }
  const antes=await page.evaluate(async()=>{
    await App.salvarSupabase(false);
    const raw=localStorage.getItem('flk_save_1'), t=App.teams[App.myTeam];
    return {tam:raw?raw.length:0, z:raw?!!JSON.parse(raw).estadoZ:false, st:(document.getElementById('saveStatus')||{}).textContent,
      rodada:App.rodada, saldo:t.saldo, forma:(t._forma5||[]).join(''), notas:t.players.map(p=>(p._notas5||[]).join(',')).join('|')};
  });
  t(antes.tam>0 && antes.tam<4e6,`save cabe no localStorage (${(antes.tam/1e6).toFixed(2)} M caracteres, cota ~5 M)`);
  t(antes.z,'gravado comprimido (estadoZ)');
  await page.reload(); await page.waitForSelector('#btnJogarAgora');
  await page.click('#btnJogarAgora'); await page.waitForSelector('[data-slot="1"]',{timeout:15000});
  await page.click('[data-slot="1"]'); await page.waitForSelector('.fm-campo',{timeout:20000});
  const depois=await page.evaluate(()=>{ const t=App.teams[App.myTeam];
    return {rodada:App.rodada, saldo:t.saldo, forma:(t._forma5||[]).join(''), notas:t.players.map(p=>(p._notas5||[]).join(',')).join('|'), assinado:App._saveAssinado}; });
  t(depois.rodada===antes.rodada && depois.saldo===antes.saldo,'rodada e caixa voltam iguais');
  t(depois.forma===antes.forma && depois.notas===antes.notas,'forma e notas voltam iguais');
  t(depois.assinado===true,'save recarregado é reconhecido como assinado (não vira "suspeito" no ranking)');

  console.log('\n[3] formato antigo e falha de gravação');
  const leg=await page.evaluate(async()=>{
    const e=App.snapshot(), sig=await App.assinarSnapshot(e);
    try{ localStorage.setItem('flk_save_3', JSON.stringify({clube:'X',temporada:1,rodada:0,estado:{schemaVersion:9,myTeam:App.myTeam,rodada:0},sig:null})); }catch(err){ return {erro:err.message}; }
    const raw=JSON.parse(localStorage.getItem('flk_save_3'));
    const est=raw.estadoZ?JSON.parse(await App.descomprimir(raw.estadoZ)):raw.estado;
    return {ok:!!est && est.schemaVersion===9};
  });
  t(leg.ok,'envelope antigo (estado sem compressão) ainda é lido');
  const falha=await page.evaluate(async()=>{
    const orig=Storage.prototype.setItem; Storage.prototype.setItem=function(k,v){ if(String(k).startsWith('flk_save_')) throw new Error('QuotaExceededError'); return orig.call(this,k,v); };
    App._falhaSaveAvisada=false; await App.salvarSupabase(true);
    Storage.prototype.setItem=orig;
    const tit=(document.querySelector('#flkModal .flkm-title')||{}).textContent;
    const m=document.getElementById('flkModal'); if(m) m.remove();
    return tit;
  });
  t(falha==='Não deu pra salvar','falha de gravação no auto-save avisa o jogador (antes era silenciosa)');
  t(erros.filter(e=>!/ERR_FAILED/.test(e)).length===0,'sem erros de JS');
  await browser.close();
  console.log(`\n=== ${ok} ok, ${falhas} falhas ===`);
  process.exit(falhas?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
