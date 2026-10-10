// harness_d1_onboarding — gate do D1: um jogador novo chega (e termina) a
// primeira partida sem instrução externa. Roda o catimba_fc.html num Chromium
// headless com um supabase-js falso (ligas sintéticas, offline).
// Uso: node harness_d1_onboarding.js [--shots DIR]   (requer Playwright + Chromium)
const path=require('path'),fs=require('fs');
const {abrir,chromium}=require('./ui_test/abrir.js');
const SHOTS=process.argv.includes('--shots')?process.argv[process.argv.indexOf('--shots')+1]:null;
if(SHOTS) fs.mkdirSync(SHOTS,{recursive:true});
let ok=0,falhas=0; const t=(c,m)=>{ if(c){ok++;console.log('  ✅',m);} else {falhas++;console.log('  ❌',m);} };

(async()=>{
  const browser=await chromium.launch();
  const vis=async(page,sel)=>page.$eval(sel,e=>!!e.offsetParent).catch(()=>false);
  let n=0; const shot=async(page,nome)=>{ if(SHOTS){ await page.waitForTimeout(200); await page.screenshot({path:path.join(SHOTS,String(++n).padStart(2,'0')+'_'+nome+'.png')}); } };

  // ---------------- 1) primeira sessão completa, com tour ----------------
  console.log('\n[1] primeira sessão: entrada → clube → tour → 1ª partida → objetivos');
  {
    const {ctx,page,erros}=await abrir(browser);
    await page.waitForSelector('#btnJogarAgora'); await shot(page,'entrada');
    t(!(await page.$('#mEmail')),'entrada não mostra formulário de login');
    await page.click('#btnJogarAgora');
    await page.waitForSelector('.clube-lin',{timeout:15000}); await shot(page,'clubes');
    t(!(await page.$('[data-novo]')),'1ª vez pula a tela de slots e vai direto pros clubes');
    await page.click('.clube-lin');
    await page.waitForSelector('.tut-bv'); await shot(page,'boas_vindas');
    const bv=await page.textContent('.flkm-box');
    t(/Meta da diretoria/.test(bv) && /Série D/.test(bv),'boas-vindas mostra divisão e meta da diretoria');
    await page.click('text=Me mostra como funciona');
    await page.waitForSelector('#tutOverlay .tut-bubble');
    const titulos=[];
    for(let k=0;k<6;k++){
      const b=await page.$('#tutOverlay .tut-bubble'); if(!b) break;
      titulos.push(await page.textContent('#tutOverlay .tut-h')); await shot(page,'tour_'+k);
      // bolha dentro da tela
      const r=await b.boundingBox(); const vp=page.viewportSize();
      t(r.x>=0 && r.y>=0 && r.x+r.width<=vp.width && r.y+r.height<=vp.height,`bolha "${titulos.at(-1)}" cabe na tela`);
      await page.click('[data-tut-next]');
    }
    t(titulos.length===5,'tour da Escalação tem 5 passos ('+titulos.join(' | ')+')');
    t(await page.evaluate(()=>localStorage.getItem('catimba_tutorial_v1'))==='jogo1','estado vira "jogo1" ao fim do tour');
    t(await vis(page,'#btnJogarEsc'),'botão Jogar visível na Escalação');
    await page.click('#btnJogarEsc');
    await page.waitForSelector('#tutToast.on'); await shot(page,'toast_partida');
    t(/Pular/.test(await page.textContent('#tutToast')),'toast da 1ª partida explica o Pular');
    await page.click('#btnPular');
    await page.waitForSelector('#btnFechar',{timeout:20000}); await shot(page,'fim_partida');
    await page.click('#btnFechar');
    // avisos pós-rodada (desfalques etc.) vêm antes do tutorial: responde todos
    for(let k=0;k<5 && await page.$('#flkModal');k++) await page.click('#flkModal .flkm-foot .btn:last-child');
    await page.waitForSelector('#tutOverlay .tut-bubble'); await shot(page,'pos_jogo_0');
    t(/Primeira rodada/.test(await page.textContent('#tutOverlay .tut-h')),'após a 1ª partida, dica aponta pra Competições');
    await page.click('[data-tut-next]');
    await page.waitForSelector('#tutOverlay .tut-bubble'); await shot(page,'pos_jogo_1');
    t(await vis(page,'#tab-competicoes') && /objetivos/i.test(await page.textContent('#tutOverlay .tut-h')),'abre Competições e destaca os objetivos');
    await page.click('[data-tut-next]');
    t(!(await page.$('#tutOverlay')),'overlay some no fim');
    t(await page.evaluate(()=>localStorage.getItem('catimba_tutorial_v1'))==='feito','estado final "feito"');
    t(await page.evaluate(()=>App.rodada)===1,'rodada 1 jogada');
    t(erros.filter(e=>!/ERR_FAILED/.test(e)).length===0,'sem erros de JS ('+erros.filter(e=>!/ERR_FAILED/.test(e)).join('; ')+')');

    // 2ª carreira no mesmo aparelho: não repete o tutorial
    console.log('\n[2] segunda carreira no mesmo aparelho');
    await page.evaluate(()=>{ Menu.mostrar(); Menu.convidado=true; Menu.telaNovoJogo('2'); });
    await page.waitForSelector('.clube-lin',{timeout:15000});
    await page.click('.clube-lin'); await page.waitForTimeout(400);
    t(!(await page.$('.tut-bv')) && !(await page.$('#tutOverlay')),'tutorial não reaparece na 2ª carreira');
    // rever pelas configurações
    await page.click('#btnConfig'); await page.click('[data-cfg-tut]');
    await page.waitForSelector('.tut-bv');
    t(true,'"Rever tutorial" nas Configurações reabre as boas-vindas');
    await ctx.close();
  }

  // ---------------- 3) "Já sei jogar" e "Pular tutorial" ----------------
  console.log('\n[3] saídas do tutorial');
  for(const modo of ['ja_sei','pular']){
    const {ctx,page}=await abrir(browser);
    await page.click('#btnJogarAgora'); await page.waitForSelector('.clube-lin',{timeout:15000});
    await page.click('.clube-lin'); await page.waitForSelector('.tut-bv');
    if(modo==='ja_sei') await page.click('text=Já sei jogar');
    else { await page.click('text=Me mostra como funciona'); await page.waitForSelector('[data-tut-skip]'); await page.click('[data-tut-skip]'); }
    t(await page.evaluate(()=>localStorage.getItem('catimba_tutorial_v1'))==='feito',`"${modo}" encerra o tutorial`);
    await page.click('#btnJogarEsc'); await page.waitForTimeout(300);
    t(!(await page.$('#tutToast.on')),`"${modo}": 1ª partida sem toast`);
    await ctx.close();
  }

  // ---------------- 4) celular ----------------
  console.log('\n[4] celular (390×844)');
  {
    const {ctx,page,erros}=await abrir(browser,{w:390,h:844});
    await page.click('#btnJogarAgora'); await page.waitForSelector('.clube-lin',{timeout:15000});
    await page.click('.clube-lin'); await page.waitForSelector('.tut-bv'); await shot(page,'mobile_boas_vindas');
    await page.click('text=Me mostra como funciona');
    await page.waitForSelector('#tutOverlay .tut-bubble');
    let k=0;
    while(await page.$('#tutOverlay .tut-bubble')){
      const r=await (await page.$('#tutOverlay .tut-bubble')).boundingBox();
      t(r.x>=0 && r.x+r.width<=390 && r.y>=0 && r.y+r.height<=844,`mobile: bolha ${k+1} cabe na tela`);
      await shot(page,'mobile_tour_'+k); k++; await page.click('[data-tut-next]');
    }
    t(k===5,'mobile: 5 passos');
    await ctx.close();
  }

  // ---------------- 5) estados vazios ----------------
  console.log('\n[5] estados vazios');
  {
    const {ctx,page}=await abrir(browser);
    await page.waitForSelector('#btnJogarAgora');
    const txt=await page.evaluate(()=>document.getElementById('gameWrap').innerText);
    t(!/Conecte o Supabase/i.test(txt),'nenhuma aba pede "Conecte o Supabase"');
    await ctx.close();
  }

  await browser.close();
  console.log(`\n=== ${ok} ok, ${falhas} falhas ===`);
  process.exit(falhas?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
