// harness_visual — #28: abas no padrão FLK. Cada aba desenha sem erro, com as peças
// novas (próximo jogo, KPIs, tabela do elenco, contador nas finanças, dados enxutos),
// e nada estoura a largura no celular (390 px). Uso: node harness_visual.js [--shots DIR]
const path=require('path'),fs=require('fs');
const {abrir,chromium}=require('./ui_test/abrir.js');
const SHOTS=process.argv.includes('--shots')?process.argv[process.argv.indexOf('--shots')+1]:null;
if(SHOTS) fs.mkdirSync(SHOTS,{recursive:true});
let ok=0,falhas=0; const t=(c,m)=>{ if(c){ok++;console.log('  ✅',m);} else {falhas++;console.log('  ❌',m);} };
const ABAS=['arena','escala','elenco','mercado','competicoes','financas','ranking','dados'];

async function preparar(page){
  await page.evaluate(()=>localStorage.setItem('catimba_tutorial_v1','feito'));
  await page.click('#btnJogarAgora'); await page.waitForSelector('.clube-lin',{timeout:15000});
  await page.click('.clube-lin'); await page.waitForSelector('.fm-campo');
  await page.evaluate(()=>{ const o=App.garantirOpcoes(); o.coletiva=false; o.recado=false; if(App.estadual) App.estadual.status='pulado';
    for(let k=0;k<2;k++){ App.escalarMelhor(); App.jogarRodada(); App.pularRodada(); App.fecharRodada(); document.getElementById('flkModal')?.remove(); App._filaModais=[]; } });
}

(async()=>{
  const browser=await chromium.launch();
  const {page,erros}=await abrir(browser);
  await preparar(page);

  console.log('\n[1] desktop');
  for(const a of ABAS){
    await page.evaluate(x=>{ App.showTab(x); window.scrollTo(0,0); },a);
    const r=await page.evaluate(x=>{ const el=document.getElementById('tab-'+x); return {txt:el.innerText.length, erro:!!el.querySelector('.erro-card')}; },a);
    t(r.txt>20 && !r.erro,`aba ${a} desenha`);
    if(SHOTS) await page.screenshot({path:path.join(SHOTS,`d_${a}.png`), fullPage:true});
  }
  // Rodada
  await page.evaluate(()=>App.showTab('arena'));
  const ar=await page.evaluate(()=>({pj:!!document.querySelector('#tab-arena .panel.pj .pj-conf'), n:document.querySelectorAll('#resultados .match').length, total:App.resultados.length, meu:!!document.querySelector('#resultados .match.me')}));
  t(ar.pj,'Rodada: cartão "Próximo jogo" com os dois clubes');
  t(ar.meu && (ar.n<ar.total || ar.total<=12),`Última rodada mostra o seu grupo (${ar.n} de ${ar.total}), com seu jogo`);
  if(await page.$('#btnArenaTodos')){ await page.click('#btnArenaTodos'); t(await page.evaluate(()=>document.querySelectorAll('#resultados .match').length===App.resultados.length),'"Ver todos os jogos" abre a rodada inteira'); }
  // Elenco
  await page.evaluate(()=>App.showTab('elenco'));
  t((await page.$$('#elencoKpis .kpi-c')).length===5,'Elenco: 5 KPIs (força, idade, folha, desfalques, contratos)');
  t(await page.evaluate(()=>document.querySelectorAll('#roster tbody tr').length===App.teams[App.myTeam].players.length),'tabela com o elenco inteiro');
  await page.click('#roster tbody tr');
  t(await page.$('#fichaModal')!==null,'clicar no jogador abre a ficha');
  await page.evaluate(()=>document.getElementById('fichaModal')?.remove());
  // Mercado / Finanças / Dados
  await page.evaluate(()=>{ App.showTab('mercado'); });
  t((await page.$$('#tab-mercado .kpi-c')).length===5 && !(await page.$('#tab-mercado .fin-topbar')),'Mercado: faixa de KPIs no lugar do cartão repetido do clube');
  await page.evaluate(()=>App.showTab('financas'));
  t(await page.$('#tab-financas .fin-hero .contador')!==null && /meses? de folha/.test(await page.textContent('#tab-financas .fin-hero')),'Finanças: saldo + fôlego + contador (fim da temporada)');
  await page.evaluate(()=>App.showTab('dados'));
  t(await page.$('#tab-dados #btnSalvarAgora')!==null && await page.evaluate(()=>!document.querySelector('#tab-dados details.dados-avancado').open),'Dados: salvar/backup à vista; Supabase e troca de time escondidos em "Avançado"');

  console.log('\n[2] celular (390 px)');
  const m=await abrir(browser,{w:390,h:844});
  await preparar(m.page);
  for(const a of ABAS){
    const larg=await m.page.evaluate(x=>{ App.showTab(x); return document.documentElement.scrollWidth; },a);
    t(larg<=392,`${a}: sem rolagem lateral (${larg}px)`);
    if(SHOTS) await m.page.screenshot({path:path.join(SHOTS,`m_${a}.png`), fullPage:true});
  }
  const todos=[...erros,...m.erros].filter(e=>!/ERR_FAILED/.test(e));
  t(todos.length===0,'sem erros de JS'+(todos.length?': '+todos.slice(0,3).join(' | '):''));
  await browser.close();
  console.log(`\n=== ${ok} ok, ${falhas} falhas ===`);
  process.exit(falhas?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
