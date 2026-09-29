// harness_layout — §6.2 página do clube: casca (menu lateral / barra inferior),
// cabeçalho, Formação em 2 colunas e campo vertical de camisas.
// Desktop 1440×900 e celular 390×844, supabase falso offline (ui_test/).
// Uso: node harness_layout.js [--shots DIR]
const path=require('path'),fs=require('fs');
const {abrir,chromium}=require('./ui_test/abrir.js');
const SHOTS=process.argv.includes('--shots')?process.argv[process.argv.indexOf('--shots')+1]:null;
if(SHOTS) fs.mkdirSync(SHOTS,{recursive:true});
let ok=0,falhas=0; const t=(c,m)=>{ if(c){ok++;console.log('  ✅',m);} else {falhas++;console.log('  ❌',m);} };
const ABAS=['escala','arena','elenco','mercado','competicoes','financas','ranking','dados'];

async function novaCarreira(browser,vp){
  const r=await abrir(browser,vp);
  r.page.on('dialog',d=>d.accept());
  await r.page.evaluate(()=>{ localStorage.setItem('prancheta_tutorial_v1','feito'); localStorage.removeItem('prancheta_menu_recolhido'); });
  await r.page.click('#btnJogarAgora'); await r.page.waitForSelector('.clube-lin',{timeout:15000});
  await r.page.click('.clube-lin'); await r.page.waitForSelector('.fm-campo');
  return r;
}
// visível = ocupa espaço na tela (offsetParent não serve pra position:fixed)
const vis=(page,sel)=>page.$eval(sel,e=>{ const r=e.getBoundingClientRect(); return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden'; }).catch(()=>false);
const overflowX=page=>page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
// camisas: todas dentro do campo e sem se sobrepor demais (centros a ≥ 60% da largura da camisa)
const checarCampo=page=>page.evaluate(()=>{
  const campo=document.querySelector('.fm-campo').getBoundingClientRect();
  const cams=[...document.querySelectorAll('.fm-slot[data-pnum] .fm-shirt-wrap')].map(e=>e.getBoundingClientRect());
  const dentro=cams.every(r=>r.left>=campo.left-2 && r.right<=campo.right+2 && r.top>=campo.top-2 && r.bottom<=campo.bottom+2);
  let colide=0;
  for(let a=0;a<cams.length;a++) for(let b=a+1;b<cams.length;b++){
    const A=cams[a],B=cams[b], dx=Math.abs((A.left+A.right)/2-(B.left+B.right)/2), dy=Math.abs((A.top+A.bottom)/2-(B.top+B.bottom)/2);
    if(dx<A.width*0.95 && dy<A.height*0.95) colide++; }
  return {n:cams.length, dentro, colide};
});

(async()=>{
  const browser=await chromium.launch();

  // ================= DESKTOP =================
  console.log('\n[1] desktop 1440×900');
  {
    const {page,erros}=await novaCarreira(browser,{w:1440,h:900});
    if(SHOTS) await page.screenshot({path:path.join(SHOTS,'desktop_formacao.png')});
    t(await vis(page,'#side') && !(await vis(page,'#bottomBar')),'menu lateral visível, barra inferior escondida');
    const head=await page.textContent('#clubeHead');
    t(/Em caixa/i.test(head) && /Forma/i.test(head) && /Série D/.test(head) && /Treinador/.test(head),'cabeçalho: treinador, divisão, caixa e forma');
    t(await vis(page,'#btnSalvarHead'),'botão Salvar no cabeçalho');
    for(const a of ABAS){
      await page.click(`#tabs [data-tab="${a}"]`);
      const okAba=await page.evaluate(a=>!document.getElementById('tab-'+a).classList.contains('hidden') &&
        document.querySelector(`#tabs [data-tab="${a}"]`).classList.contains('active'),a);
      t(okAba && (await overflowX(page))<=0,`menu → ${a} abre, sem rolagem horizontal`);
    }
    await page.click('#tabs [data-tab="escala"]');
    await page.click('#btnRecolher');
    const larg=await page.$eval('#side',e=>e.getBoundingClientRect().width);
    t(larg<100,'recolher menu deixa só os ícones ('+Math.round(larg)+'px)');
    await page.reload(); await page.waitForSelector('#btnJogarAgora');
    t(await page.evaluate(()=>document.getElementById('appGrid').classList.contains('side-min')),'menu recolhido persiste após recarregar');
    await page.evaluate(()=>localStorage.removeItem('prancheta_menu_recolhido'));

    console.log('\n[2] formações e campo vertical (desktop)');
    const {page:p2}=await novaCarreira(browser,{w:1440,h:900});
    const forms=await p2.evaluate(()=>Object.keys(LINHAS_FM));
    for(const f of forms){
      await p2.click(`[data-form="${f}"]`);
      const r=await checarCampo(p2);
      const ativo=await p2.$eval(`[data-form="${f}"]`,e=>e.classList.contains('on'));
      t(r.n===11 && r.dentro && r.colide===0 && ativo,`${f}: 11 camisas dentro do campo, sem sobreposição`);
    }
    const marc=await p2.evaluate(()=>{ const s=document.querySelector('.fm-linhas'); return s? s.querySelectorAll('rect').length>=6 && !!s.querySelector('circle') : false; });
    t(marc,'campo com marcações (áreas, meia-lua, círculo central)');
    t(await p2.$$eval('.fm-placa',ps=>ps.length===6 && ps.every(p=>!/ANUNCIE/i.test(p.textContent))),'placas em volta do gramado, nenhuma "ANUNCIE AQUI"');

    console.log('\n[3] trocas');
    const pos=(num)=>p2.evaluate(n=>App.posDe(App.myTeam,n),num);
    const tit=await p2.$eval('.fm-slot[data-pnum]',e=>+e.dataset.pnum);
    const res=await p2.$eval('.fm-chip[data-pnum]',e=>+e.dataset.pnum);
    const posTit=await pos(tit);
    await p2.click(`.fm-slot[data-pnum="${tit}"]`);
    t(await vis(p2,'.fm-dica.on'),'selecionar titular mostra a dica de troca');
    await p2.click(`.fm-chip[data-pnum="${res}"]`);
    t((await pos(res))===posTit && (await pos(tit))==='BANCO','toque titular → toque reserva: reserva entra na posição, titular vai pro banco');
    const [a,b]=await p2.$$eval('.fm-slot[data-pnum]',es=>es.slice(0,2).map(e=>+e.dataset.pnum));
    const [pa,pb]=[await pos(a),await pos(b)];
    await p2.click(`.fm-slot[data-pnum="${a}"]`); await p2.click(`.fm-slot[data-pnum="${b}"]`);
    t((await pos(a))===pb && (await pos(b))===pa,'titular ↔ titular troca as posições');
    const [r1,r2]=await p2.$$eval('.fm-chip[data-pnum]',es=>es.slice(0,2).map(e=>+e.dataset.pnum));
    await p2.click(`.fm-chip[data-pnum="${r1}"]`); await p2.click(`.fm-chip[data-pnum="${r2}"]`);
    const aviso=await p2.$('#flkModal'); t(!!aviso,'reserva ↔ reserva é recusado com aviso');
    if(aviso) await p2.click('[data-flkm-x]');
    await p2.click('#btnCancelaTroca').catch(()=>{});
    const [d1]=await p2.$$eval('.fm-slot[data-pnum]',es=>[+es[2].dataset.pnum]);
    const d2=await p2.$eval('.fm-chip[data-pnum]',e=>+e.dataset.pnum);
    const pd1=await pos(d1);
    await p2.dragAndDrop(`.fm-chip[data-pnum="${d2}"]`,`.fm-slot[data-pnum="${d1}"]`);
    t((await pos(d2))===pd1,'arrastar reserva sobre titular faz a troca');
    t((await p2.evaluate(()=>App.onzeDe(App.myTeam).length))===11,'continua com 11 titulares');

    console.log('\n[4] Auto / 11 melhores / Descansados');
    await p2.click('#btnEscalarAuto');
    t((await p2.evaluate(()=>App.onzeDe(App.myTeam).length))===11,'⚡ Auto escala 11');
    const f11=await p2.evaluate(()=>{ const c=App.cfg[App.myTeam]; App.escalar11Melhores();
      const melhor=Motor.forcaEmCampo(App.onzeDe(App.myTeam),App.slotsDe(App.myTeam),App.rolesDe(App.myTeam));
      let maior=0; const f0=c.formacao;
      Object.keys(LINHAS_FM).forEach(f=>{ c.formacao=f; App.escalarMelhor(); maior=Math.max(maior,Motor.forcaEmCampo(App.onzeDe(App.myTeam),App.slotsDe(App.myTeam),App.rolesDe(App.myTeam))); });
      c.formacao=f0; App.escalarMelhor(); return {melhor,maior,f0}; });
    t(Math.abs(f11.melhor-f11.maior)<1e-6,'★ 11 melhores escolhe a formação mais forte ('+f11.f0+')');
    const en=await p2.evaluate(()=>{ const t=App.teams[App.myTeam];
      App.escalarMelhor(); App.onzeDe(App.myTeam).forEach(p=>p.energia=35);   // titulares esgotados
      const media=()=>{ const o=App.onzeDe(App.myTeam); return o.reduce((a,p)=>a+p.energia,0)/o.length; };
      App.escalarMelhor(); const auto=media();
      App.escalarCom(App.myTeam,{descansados:true}); const desc=media();
      return {auto,desc,n:App.onzeDe(App.myTeam).length}; });
    t(en.n===11 && en.desc>en.auto,`🔋 Descansados sobe a energia média do onze (${en.auto.toFixed(0)}% → ${en.desc.toFixed(0)}%)`);

    console.log('\n[5] ação principal e forma no cabeçalho');
    await p2.evaluate(()=>{ App.escalarMelhor(); App.teams[App.myTeam].players.forEach(p=>p.energia=100); App.renderShell(); App.showTab('escala'); });
    await p2.click('#btnJogarEsc');
    t(await vis(p2,'#tab-arena'),'Jogar (card do adversário) leva à partida');
    await p2.click('#btnPular'); await p2.waitForSelector('#btnFechar'); await p2.click('#btnFechar');
    for(let k=0;k<5 && await p2.$('#flkModal');k++) await p2.click('#flkModal .flkm-foot .btn:last-child');
    const forma=await p2.$$eval('#clubeHead .forma-vde span:not(.vazio)',s=>s.map(x=>x.textContent).join(''));
    t(/^[VED]$/.test(forma),'forma no cabeçalho mostra o resultado ('+forma+')');
    const notas=await p2.$$eval('.fm-row td:nth-child(6)',tds=>tds.filter(td=>/\d/.test(td.textContent)).length);
    t(notas>=10,'coluna Nota preenchida para quem jogou ('+notas+')');
    t(erros.filter(e=>!/ERR_FAILED/.test(e)).length===0,'sem erros de JS (desktop)');
  }

  // ================= CELULAR =================
  console.log('\n[6] celular 390×844');
  {
    const {page,erros}=await novaCarreira(browser,{w:390,h:844});
    if(SHOTS) await page.screenshot({path:path.join(SHOTS,'mobile_formacao.png')});
    t(!(await vis(page,'#side')) && await vis(page,'#bottomBar'),'barra inferior no lugar do menu lateral');
    t(await vis(page,'#fabAcao') && /Jogar/.test(await page.textContent('#fabAcao')),'botão de ação principal visível');
    const ordem=await page.evaluate(()=>{ const y=s=>document.querySelector(s).getBoundingClientRect().top;
      return y('#clubeHead')<y('.fm-adv') && y('.fm-adv')<y('.fm-form-card') && y('.fm-form-card')<y('.fm-campo') && y('.fm-campo')<y('.fm-elenco'); });
    t(ordem,'ordem: cabeçalho → adversário → formações → campo → elenco');
    for(const a of ABAS){
      await page.evaluate(a=>App.showTab(a),a);
      t((await overflowX(page))<=0,`${a}: sem rolagem horizontal`);
    }
    await page.evaluate(()=>App.showTab('escala'));
    const forms=await page.evaluate(()=>Object.keys(LINHAS_FM));
    for(const f of forms){
      await page.evaluate(f=>{ App.aplicarFormacao(App.myTeam,f); App.renderEscala(); },f);
      const r=await checarCampo(page);
      t(r.n===11 && r.dentro && r.colide===0,`celular ${f}: camisas cabem sem sobreposição`);
    }
    await page.click('#bottomBar [data-mais]');
    t(await vis(page,'#maisSheet .mais-box'),'"Mais" abre a folha com o resto do menu');
    await page.click('#maisSheet [data-tab="financas"]');
    t(await vis(page,'#tab-financas') && !(await vis(page,'#maisSheet .mais-box')),'folha "Mais" navega e fecha');
    await page.click('#bottomBar [data-tab="escala"]');
    await page.click('#fabAcao');
    t(await page.evaluate(()=>!!App.liveState),'botão de ação principal inicia a rodada');
    t(erros.filter(e=>!/ERR_FAILED/.test(e)).length===0,'sem erros de JS (celular)');
  }

  await browser.close();
  console.log(`\n=== ${ok} ok, ${falhas} falhas ===`);
  process.exit(falhas?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
