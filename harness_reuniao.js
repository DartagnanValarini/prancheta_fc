// harness_reuniao — reunião com a diretoria antes da demissão (§6.1 item 2) +
// "fórmula" da confiança visível (histórico de mudanças) + ultimato.
// Uso: node harness_reuniao.js [--shots DIR]
const path=require('path'),fs=require('fs');
const {abrir,chromium}=require('./ui_test/abrir.js');
const SHOTS=process.argv.includes('--shots')?process.argv[process.argv.indexOf('--shots')+1]:null;
if(SHOTS) fs.mkdirSync(SHOTS,{recursive:true});
let ok=0,falhas=0; const t=(c,m)=>{ if(c){ok++;console.log('  ✅',m);} else {falhas++;console.log('  ❌',m);} };
const titulo=page=>page.$eval('#flkModal .flkm-title',e=>e.textContent).catch(()=>null);

(async()=>{
  const browser=await chromium.launch();
  const {page,erros}=await abrir(browser);
  page.on('dialog',d=>d.accept());
  await page.evaluate(()=>{ localStorage.setItem('prancheta_tutorial_v1','feito'); });
  await page.click('#btnJogarAgora'); await page.waitForSelector('.clube-lin',{timeout:15000});
  await page.click('.clube-lin'); await page.waitForSelector('.fm-campo');
  await page.evaluate(()=>{ App.garantirOpcoes().coletiva=false; });
  // fecha a rodada "de mentira" (sem jogar) pra disparar a fila pós-rodada
  const fechar=()=>page.evaluate(()=>{ App.liveState={done:true}; App.fecharRodada(); });

  console.log('\n[1] histórico e explicação da confiança');
  await page.evaluate(()=>{ App.escalarMelhor(); App.jogarRodada(); App.pularRodada(); });
  const h=await page.evaluate(()=>(App.histConf||[]).slice(-1)[0]);
  t(h && /vs .* como|Vitória|Empate|Derrota/.test(h.m),'resultado da partida entra no histórico com o motivo ('+(h?h.m+' '+h.d:'—')+')');
  await page.click('#btnFechar');
  for(let i=0;i<4 && await page.$('#flkModal');i++) await page.click('#flkModal .flkm-foot .btn:last-child');
  await page.click('#btnConfInfo');
  const exp=await page.$eval('#flkModal',e=>e.innerText);
  t(/O que mexe na confiança/i.test(exp) && /Favorito/i.test(exp) && /Derrota/i.test(exp),'"ⓘ Entenda" mostra a tabela resultado × expectativa');
  await page.click('#flkModal .flkm-foot .btn');

  console.log('\n[2] reunião ao entrar na zona de alerta');
  const lim=await page.evaluate(()=>App.limiarReuniao());
  await page.evaluate(l=>{ App.confianca=l-1; App._reuniaoFeita=false; App.ultimato=null; },lim);
  await fechar();
  t((await titulo(page))==='🏛️ Reunião com a diretoria','abre a reunião (confiança '+(lim-1)+', alerta em '+lim+')');
  t(!(await page.$('#flkModal [data-flkm-x]')),'reunião é obrigatória (sem ✕)');
  const txt=await page.$eval('#flkModal',e=>e.innerText);
  t(/a diretoria confere/i.test(txt) && /mais forte de/.test(txt),'cada desculpa mostra o fato que a diretoria vai conferir');
  if(SHOTS) await page.screenshot({path:path.join(SHOTS,'reuniao.png')});
  const fatos=await page.evaluate(()=>App.fatosReuniao());
  const c0=await page.evaluate(()=>App.confianca);
  await page.click('#flkModal [data-resp="0"]');     // "o elenco não tem nível"
  const c1=await page.evaluate(()=>App.confianca);
  t(fatos.elencoFraco ? c1-c0===4 : c1-c0===-3, `desculpa do elenco julgada pelos fatos (${fatos.rank}º de ${fatos.n} → ${c1-c0>0?'+':''}${c1-c0})`);
  t(/Pergunta 2 de 2/i.test(await page.$eval('#flkModal',e=>e.innerText)),'vai pra pergunta 2 (o plano)');
  await page.click('#flkModal [data-resp="0"]');     // pede 3 rodadas
  const ul=await page.evaluate(()=>({u:App.ultimato, conf:App.confianca}));
  t(ul.u && ul.u.limiar===lim && ul.conf-c1===6,'pedir prazo: +6 agora e ultimato de 3 rodadas');
  t((await titulo(page))==='Fim da reunião','resumo no fim da reunião');
  await page.click('#flkModal .flkm-foot .btn');
  t(await page.$eval('.fm-ultimato',e=>/rodada/.test(e.textContent)).catch(()=>false),'prazo aparece no card de Segurança no cargo');

  console.log('\n[3] ultimato');
  // não cumpre: confiança abaixo do limiar no fim do prazo → demissão
  await page.evaluate(l=>{ App.rodada=App.ultimato.rodadaLimite; App.confianca=l-2;
    // simula só o trecho de fim de rodada que confere o ultimato/demissão
    if(App.ultimato && !App.demitido && App.rodada>=App.ultimato.rodadaLimite){ if(App.confianca<=App.ultimato.limiar){ App._demissaoPendente=true; App._motivoDemissao='ultimato'; } App.ultimato=null; } },lim);
  await fechar();
  const dem=await page.$eval('#flkModal',e=>e.innerText).catch(()=>'');
  t(/demitido/i.test(await titulo(page)||'') && /prazo acabou/i.test(dem),'prazo estourado → demissão com o motivo do ultimato');
  await page.evaluate(()=>{ const m=document.getElementById('flkModal'); if(m) m.remove(); App.demitido=false; App._filaModais=[]; });
  // cumpre: acima do limiar
  const cumpriu=await page.evaluate(l=>{ App.ultimato={rodadaLimite:App.rodada, limiar:l, temporada:App.temporada}; App.confianca=l+5;
    if(App.ultimato && !App.demitido && App.rodada>=App.ultimato.rodadaLimite){ if(App.confianca<=App.ultimato.limiar){ App._demissaoPendente=true; } else App._ultimatoCumprido=true; App.ultimato=null; }
    return App._ultimatoCumprido; },lim);
  await fechar();
  t(cumpriu && (await titulo(page))==='✅ Prazo cumprido','prazo cumprido → aviso de confiança renovada');
  await page.click('#flkModal .flkm-foot .btn');

  console.log('\n[4] uma reunião por crise + verba');
  await page.evaluate(l=>{ App.confianca=l-1; App._reuniaoFeita=true; App.ultimato=null; },lim);
  await fechar();
  t(!(await page.$('#flkModal')),'mesma crise: não repete a reunião');
  await page.evaluate(l=>{ App.confianca=l+11; },lim); await fechar();
  await page.evaluate(l=>{ App.confianca=l-1; },lim); await fechar();
  t((await titulo(page))==='🏛️ Reunião com a diretoria','saiu da crise e voltou: nova reunião');
  await page.click('#flkModal [data-resp="2"]');   // assume a culpa
  const s0=await page.evaluate(()=>({saldo:App.teams[App.myTeam].saldo, conf:App.confianca, verba:App.VERBA_REUNIAO[App.divisao]}));
  await page.click('#flkModal [data-resp="1"]');   // pede reforços
  const s1=await page.evaluate(()=>({saldo:App.teams[App.myTeam].saldo, conf:App.confianca}));
  t(s1.saldo-s0.saldo===s0.verba && Math.round(s1.conf-s0.conf)===-2,'pedir reforços: verba no caixa e cargo −2');
  await page.click('#flkModal .flkm-foot .btn');

  console.log('\n[5] save');
  const sv=await page.evaluate(()=>{ App.ultimato={rodadaLimite:9,limiar:25,temporada:1}; const snap=JSON.parse(JSON.stringify(App.snapshot()));
    const h=JSON.stringify(App.histConf); App.histConf=[]; App.ultimato=null; App.aplicarSnapshot(snap);
    return {h:JSON.stringify(App.histConf)===h && App.histConf.length>0, u:App.ultimato&&App.ultimato.rodadaLimite===9}; });
  t(sv.h && sv.u,'histórico e ultimato sobrevivem ao save');
  t(erros.filter(e=>!/ERR_FAILED/.test(e)).length===0,'sem erros de JS');
  await browser.close();
  console.log(`\n=== ${ok} ok, ${falhas} falhas ===`);
  process.exit(falhas?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
