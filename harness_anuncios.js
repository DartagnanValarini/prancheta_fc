// harness_anuncios — anúncio recompensado da versão WEB (AdSense H5 Games Ads, módulo Ads).
//  Simula a Ad Placement API (window.adBreak) e confere, pelo mostrarAnuncio():
//   [1] sem programa aprovado / sem API: bônus sai sem anúncio ("Receber bônus"), sem chamar adBreak
//   [2] anúncio pronto + visto até o fim (adViewed): recompensa uma vez só
//   [3] anúncio fechado antes do fim (adDismissed): sem recompensa, aviso
//   [4] sem estoque (adBreakDone sem beforeReward): cai no "Receber bônus"
//   [5] quem removeu anúncios: recompensa direta, nunca chama adBreak
//   [6] o script do AdSense da conta está no <head>
// Uso: node harness_anuncios.js
const {abrir,chromium}=require('./ui_test/abrir.js');
let ok=0,falhas=0; const t=(c,m)=>{ if(c){ok++;console.log('  ✅',m);} else {falhas++;console.log('  ❌',m);} };
const titulo=page=>page.$eval('#flkModal .flkm-title',e=>e.textContent).catch(()=>'');
const botoes=page=>page.$$eval('#flkModal .flkm-foot .btn',bs=>bs.map(b=>b.textContent.trim())).catch(()=>[]);
const limpar=page=>page.evaluate(()=>{ document.querySelectorAll('#flkModal').forEach(e=>e.remove()); App._filaModais=[]; });

(async()=>{
  const browser=await chromium.launch();
  const {page,erros}=await abrir(browser);
  await page.evaluate(()=>localStorage.setItem('catimba_tutorial_v1','feito'));
  await page.click('#btnJogarAgora'); await page.waitForSelector('.clube-lin',{timeout:15000});
  await page.click('.clube-lin'); await page.waitForSelector('.fm-campo');
  await page.evaluate(()=>{ const o=App.garantirOpcoes(); o.coletiva=false; o.recado=false; o.adFree=false; if(App.estadual) App.estadual.status='pulado'; });
  await limpar(page);

  // mock da Ad Placement API: modo = 'ver' | 'fechar' | 'sem'
  await page.evaluate(()=>{
    window._adCalls=0; window._adModo='ver';
    window.adBreak=(o)=>{ window._adCalls++;
      if(o.type!=='reward') return o.adBreakDone&&o.adBreakDone({breakStatus:'notReady'});
      if(window._adModo==='sem') return setTimeout(()=>o.adBreakDone&&o.adBreakDone({breakStatus:'frequencyCapped'}),20);
      setTimeout(()=>o.beforeReward(()=>{ o.beforeAd&&o.beforeAd();
        setTimeout(()=>{ (window._adModo==='ver'?o.adViewed:o.adDismissed)(); o.afterAd&&o.afterAd();
          o.adBreakDone&&o.adBreakDone({breakStatus:window._adModo==='ver'?'viewed':'dismissed'}); },30); }),20);
    };
    window.adConfig=()=>{};
    window._premio=0;
    window._pedir=()=>App.mostrarAnuncio({titulo:'🎁 Teste', descricao:'teste', onRecompensa:()=>{ window._premio++; }});
  });

  console.log('\n[1] programa H5 não aprovado');
  await page.evaluate(()=>{ Ads.H5_APROVADO=false; window._adCalls=0; window._premio=0; window._pedir(); });
  t((await botoes(page)).some(b=>/Receber bônus/.test(b)),'modal oferece "Receber bônus" (regra da web: sem anúncio)');
  t((await page.evaluate(()=>window._adCalls))===0,'não chama adBreak sem aprovação');
  await page.click('#flkModal .flkm-foot .btn:has-text("Receber bônus")');
  t((await page.evaluate(()=>window._premio))===1,'bônus concedido');
  await limpar(page);

  console.log('\n[2] anúncio visto até o fim');
  await page.evaluate(()=>{ Ads.H5_APROVADO=true; window._adModo='ver'; window._adCalls=0; window._premio=0; window._pedir(); });
  await page.waitForSelector('#flkModal .flkm-foot .btn:has-text("Assistir e receber")',{timeout:4000}).catch(()=>{});
  t((await botoes(page)).some(b=>/Assistir e receber/.test(b)),'com anúncio pronto, o modal oferece "▶ Assistir e receber"');
  t((await page.evaluate(()=>window._premio))===0,'abrir o modal não dá o bônus');
  await page.click('#flkModal .flkm-foot .btn:has-text("Assistir e receber")');
  await page.waitForTimeout(150);
  t((await page.evaluate(()=>window._premio))===1,'adViewed → bônus concedido uma vez');
  t((await page.evaluate(()=>window._adCalls))===1,'um pedido de anúncio por bônus');
  await limpar(page);

  console.log('\n[3] anúncio fechado antes do fim');
  await page.evaluate(()=>{ window._adModo='fechar'; window._premio=0; window._pedir(); });
  await page.waitForSelector('#flkModal .flkm-foot .btn:has-text("Assistir e receber")',{timeout:4000}).catch(()=>{});
  await page.click('#flkModal .flkm-foot .btn:has-text("Assistir e receber")');
  await page.waitForTimeout(150);
  t((await page.evaluate(()=>window._premio))===0,'adDismissed → sem bônus');
  t(/fechado antes do fim/i.test(await titulo(page)),'avisa que fechou antes do fim');
  await limpar(page);

  console.log('\n[4] sem anúncio disponível');
  await page.evaluate(()=>{ window._adModo='sem'; window._premio=0; window._pedir(); });
  await page.waitForSelector('#flkModal .flkm-foot .btn:has-text("Receber bônus")',{timeout:4000}).catch(()=>{});
  t((await botoes(page)).some(b=>/Receber bônus/.test(b)),'sem estoque → cai no "Receber bônus"');
  await page.click('#flkModal .flkm-foot .btn:has-text("Receber bônus")');
  t((await page.evaluate(()=>window._premio))===1,'bônus concedido sem anúncio');
  await limpar(page);

  console.log('\n[5] quem removeu anúncios');
  await page.evaluate(()=>{ App.opcoes.adFree=true; window._adModo='ver'; window._adCalls=0; window._premio=0; window._pedir(); });
  t((await page.evaluate(()=>window._premio))===1 && !(await page.$('#flkModal')),'recompensa direta, sem modal');
  t((await page.evaluate(()=>window._adCalls))===0,'nunca chama adBreak');
  await page.evaluate(()=>{ App.opcoes.adFree=false; Ads.H5_APROVADO=false; });

  console.log('\n[6] script do AdSense');
  t(await page.evaluate(()=>!!document.querySelector('head script[src*="adsbygoogle.js?client=ca-pub-9315684481298702"]')),'script da conta no <head>');

  t(erros.filter(e=>!/ERR_FAILED/.test(e)).length===0,'sem erros de JS'+(erros.length?': '+erros.slice(0,3).join(' | '):''));
  await browser.close();
  console.log(`\n=== ${ok} ok, ${falhas} falhas ===`);
  process.exit(falhas?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
