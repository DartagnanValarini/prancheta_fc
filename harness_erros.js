// harness_erros — D3: erros amigáveis. Aba que quebra vira cartão (as outras seguem),
// erro inesperado abre o modal "o jogo tropeçou" (sem empilhar), falha ao carregar do
// servidor explica em português e oferece "Tentar de novo".
// Uso: node harness_erros.js [--shots DIR]
const path=require('path'),fs=require('fs');
const {abrir,chromium}=require('./ui_test/abrir.js');
const SHOTS=process.argv.includes('--shots')?process.argv[process.argv.indexOf('--shots')+1]:null;
if(SHOTS) fs.mkdirSync(SHOTS,{recursive:true});
let ok=0,falhas=0; const t=(c,m)=>{ if(c){ok++;console.log('  ✅',m);} else {falhas++;console.log('  ❌',m);} };
const titulo=page=>page.$eval('#flkModal .flkm-title',e=>e.textContent).catch(()=>'');

(async()=>{
  const browser=await chromium.launch();
  const {page,erros}=await abrir(browser);
  await page.evaluate(()=>localStorage.setItem('catimba_tutorial_v1','feito'));

  console.log('\n[1] falha ao carregar do servidor');
  await page.evaluate(()=>{ App._nt=App.novaTemporada; App.novaTemporada=async()=>{ throw new TypeError('Failed to fetch'); }; });
  await page.click('#btnJogarAgora'); await page.waitForSelector('#btnRetry',{timeout:15000});
  const txt=await page.textContent('#preGame');
  t(/internet/i.test(txt) && !/TypeError|Failed to fetch/.test(txt),'sem conexão: mensagem em português, sem texto técnico');
  if(SHOTS) await page.screenshot({path:path.join(SHOTS,'erro_rede.png')});
  await page.evaluate(()=>{ App.novaTemporada=App._nt; });
  await page.click('#btnRetry'); await page.waitForSelector('.clube-lin',{timeout:15000});
  t(true,'"Tentar de novo" carrega os clubes');
  await page.click('.clube-lin'); await page.waitForSelector('.fm-campo');
  await page.evaluate(()=>{ const o=App.garantirOpcoes(); o.coletiva=false; o.recado=false; });

  console.log('\n[2] uma aba quebra, as outras seguem');
  await page.evaluate(()=>{ App._rm=App.renderMercado; App.renderMercado=function(){ throw new Error('boom mercado'); }; App.showTab('mercado'); App.renderShell(); });
  await page.waitForTimeout(50);
  t(await page.$('#tab-mercado .erro-card')!==null,'Mercado mostra o cartão "Essa tela não abriu"');
  t(await page.$('#tab-escala .fm-grid')!==null && await page.$('#tab-financas .erro-card')===null,'Formação e Finanças (desenhadas depois) continuam funcionando');
  t(!(await page.$('#flkModal')),'cartão da aba não abre modal por cima');
  if(SHOTS) await page.screenshot({path:path.join(SHOTS,'erro_aba.png')});
  await page.evaluate(()=>{ App.renderMercado=App._rm; });
  await page.click('#tab-mercado [data-erro-retry]');
  t(await page.$('#tab-mercado .erro-card')===null && (await page.textContent('#tab-mercado')).length>50,'"Tentar de novo" redesenha a aba');

  console.log('\n[3] erro inesperado');
  await page.evaluate(()=>{ App.showTab('escala'); setTimeout(()=>{ throw new Error('boom solto'); }); });
  await page.waitForSelector('#flkModal',{timeout:3000}).catch(()=>{});
  t(/tropeçou/.test(await titulo(page)),'modal "Opa, o jogo tropeçou"');
  const corpo=await page.textContent('#flkModal');
  t(/carreira está segura/i.test(corpo) && /Detalhes técnicos/.test(corpo),'tranquiliza e esconde o técnico em "Detalhes"');
  if(SHOTS) await page.screenshot({path:path.join(SHOTS,'erro_modal.png')});
  await page.evaluate(()=>{ setTimeout(()=>{ throw new Error('boom 2'); }); Promise.reject(new Error('boom promessa')); });
  await page.waitForTimeout(150);
  const q=await page.evaluate(()=>({fila:(App._filaModais||[]).length, log:Erros.log.map(l=>l.msg)}));
  t(q.fila===0,'erros seguidos não empilham modais');
  t(q.log.some(m=>/boom 2/.test(m)) && q.log.some(m=>/boom promessa/.test(m)),'erros e promessas rejeitadas ficam no registro (Copiar detalhes)');
  await page.click('#flkModal .flkm-foot .btn:has-text("Continuar")');
  t(!(await page.$('#flkModal')),'"Continuar" volta pro jogo');

  const inesperados=erros.filter(e=>!/ERR_FAILED|boom|Failed to fetch/.test(e));
  t(inesperados.length===0,'nenhum erro além dos provocados'+(inesperados.length?': '+inesperados.join(' | '):''));
  await browser.close();
  console.log(`\n=== ${ok} ok, ${falhas} falhas ===`);
  process.exit(falhas?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
