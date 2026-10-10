// harness_presidente — recado do presidente a cada rodada (modal no estilo das
// boas-vindas → Formação) e botão "Pedir demissão" (card do cargo e Configurações).
// Uso: node harness_presidente.js [--shots DIR]
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
  await page.evaluate(()=>localStorage.setItem('catimba_tutorial_v1','feito'));
  await page.click('#btnJogarAgora'); await page.waitForSelector('.clube-lin',{timeout:15000});
  await page.click('.clube-lin'); await page.waitForSelector('.fm-campo');
  await page.evaluate(()=>{ App.garantirOpcoes().coletiva=false; });
  const jogar=async()=>{ await page.evaluate(()=>{ App.escalarMelhor(); App.jogarRodada(); }); await page.evaluate(()=>App.pularRodada()); await page.click('#btnFechar'); };
  const ateRecado=async()=>{ for(let i=0;i<6;i++){ const tt=await titulo(page); if(!tt||tt==='🤵 Recado do presidente') return tt; await page.click('#flkModal .flkm-foot .btn:last-child'); } return titulo(page); };

  console.log('\n[1] recado a cada rodada');
  await jogar();
  t((await ateRecado())==='🤵 Recado do presidente','depois da rodada vem o recado do presidente (último da fila)');
  const txt=await page.$eval('#flkModal',e=>e.innerText);
  t(/próximo:/i.test(txt) && /Meta da diretoria/i.test(txt) && /Caixa/i.test(txt) && /Confiança/i.test(txt),'frase do próximo jogo, meta, caixa e confiança');
  t(/“.+”/.test(txt),'traz a fala do presidente');
  if(SHOTS) await page.screenshot({path:path.join(SHOTS,'recado.png')});
  await page.evaluate(()=>App.showTab('financas'));
  await clicar(page,'Ir para a formação');
  t(!(await page.$('#flkModal')) && await page.$eval('#tab-escala',e=>!e.classList.contains('hidden')),'"Ir para a formação" fecha e abre a Formação');
  await jogar(); await ateRecado();
  t((await titulo(page))==='🤵 Recado do presidente','aparece de novo na rodada seguinte');
  await clicar(page,'Ir para a formação');
  await page.click('#btnConfig'); await page.click('[data-cfg-rec="0"]'); await page.click('#flkModal [data-flkm-x]');
  await jogar(); await ateRecado();
  t((await titulo(page))!=='🤵 Recado do presidente','desligado nas Configurações: não aparece');
  for(let i=0;i<5 && await page.$('#flkModal');i++) await page.click('#flkModal .flkm-foot .btn:last-child');

  console.log('\n[2] pedir demissão');
  await page.evaluate(()=>App.showTab('escala'));
  await page.click('#btnPedirDemissao');
  t((await titulo(page))==='🚪 Pedir demissão?','botão no card "Segurança no cargo" abre a confirmação');
  if(SHOTS) await page.screenshot({path:path.join(SHOTS,'demissao.png')});
  await clicar(page,'Ficar no clube');
  t(!(await page.$('#flkModal')) && !(await page.evaluate(()=>App.demitido)),'"Ficar no clube" não muda nada');
  const antes=await page.evaluate(()=>({car:JSON.stringify(App.garantirCarreira()), temp:App.temporada}));
  await page.click('#btnConfig'); await page.click('[data-cfg-dem]');
  t((await titulo(page))==='🚪 Pedir demissão?','também pelas Configurações');
  await clicar(page,'Pedir demissão');
  await page.waitForSelector('#preGame:not(.hidden)',{timeout:5000}).catch(()=>{});
  const pre=await page.$eval('#preBody',e=>e.innerText).catch(()=>'');
  t(await page.evaluate(()=>App.demitido) && /Proposta de trabalho/i.test(pre),'confirmar: fica livre no mercado e recebe propostas');
  t((await page.evaluate(()=>JSON.stringify(App.garantirCarreira())))===antes.car,'carreira (títulos/acessos) continua');
  await page.click('#btnAceitar');
  await page.waitForSelector('.fm-campo',{timeout:10000});
  t(!(await page.evaluate(()=>App.demitido)),'assume o clube novo e segue o jogo');
  t(erros.filter(e=>!/ERR_FAILED/.test(e)).length===0,'sem erros de JS');
  await browser.close();
  console.log(`\n=== ${ok} ok, ${falhas} falhas ===`);
  process.exit(falhas?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
