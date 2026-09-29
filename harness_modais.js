// harness_modais — §6.3 padrão de UI: tudo que é importante e pede resposta usa o
// modal FLK (nunca alert/confirm/prompt nativos). Cobre fila, modal dentro de modal,
// posição na tela (fixo), decisão obrigatória, venda, compra, desfalques,
// escalação incompleta, demissão e apagar carreira.
// Uso: node harness_modais.js [--shots DIR]
const path=require('path'),fs=require('fs');
const {abrir,chromium}=require('./ui_test/abrir.js');
const SHOTS=process.argv.includes('--shots')?process.argv[process.argv.indexOf('--shots')+1]:null;
if(SHOTS) fs.mkdirSync(SHOTS,{recursive:true});
let ok=0,falhas=0; const t=(c,m)=>{ if(c){ok++;console.log('  ✅',m);} else {falhas++;console.log('  ❌',m);} };

async function carreira(browser,vp){
  const r=await abrir(browser,vp);
  r.dialogos=0; r.page.on('dialog',d=>{ r.dialogos++; d.dismiss(); });
  await r.page.evaluate(()=>localStorage.setItem('prancheta_tutorial_v1','feito'));
  await r.page.click('#btnJogarAgora'); await r.page.waitForSelector('.clube-lin',{timeout:15000});
  await r.page.click('.clube-lin'); await r.page.waitForSelector('.fm-campo');
  return r;
}
const titulo=page=>page.$eval('#flkModal .flkm-title',e=>e.textContent).catch(()=>null);
const noViewport=page=>page.$eval('#flkModal .flkm-box',e=>{ const r=e.getBoundingClientRect();
  return r.top>=0 && r.left>=0 && r.bottom<=innerHeight+1 && r.right<=innerWidth+1 && r.height>40; }).catch(()=>false);
const clicar=(page,txt)=>page.click(`#flkModal .flkm-foot .btn:has-text("${txt}")`);
const shot=async(page,n)=>{ if(SHOTS){ await page.waitForTimeout(150); await page.screenshot({path:path.join(SHOTS,n+'.png')}); } };

(async()=>{
  const browser=await chromium.launch();

  console.log('\n[0] código');
  const src=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
  const nativos=src.split('\n').filter(l=>/(^|[^a-zA-Z_.$])(alert|confirm|prompt)\(/.test(l));
  t(nativos.length===0,'app.js não usa alert/confirm/prompt nativos'+(nativos.length?': '+nativos[0].trim().slice(0,80):''));

  console.log('\n[1] mecânica do modal');
  const {page,erros,...ctx}=await carreira(browser,{w:1280,h:860});
  await page.evaluate(()=>{ App.garantirOpcoes().recado=false; App.garantirOpcoes().coletiva=false; });
  await page.evaluate(()=>{ window.__log=[];
    App.modalFLK({titulo:'A', fila:true, botoes:[{txt:'ok',tipo:'primary'}], onClose:()=>__log.push('A')});
    App.modalFLK({titulo:'B', fila:true, botoes:[{txt:'ok',tipo:'primary'}], onClose:()=>__log.push('B')});
    App.aposFila(()=>__log.push('fim')); });
  t((await titulo(page))==='A','fila: abre o primeiro');
  await clicar(page,'ok');
  t((await titulo(page))==='B','fila: ao fechar, abre o segundo');
  await clicar(page,'ok');
  t(JSON.stringify(await page.evaluate(()=>__log))==='["A","B","fim"]','aposFila roda só quando a fila esvazia');
  // modal aberto de dentro de outro não some
  await page.evaluate(()=>App.modalFLK({titulo:'Pai', botoes:[{txt:'abrir',tipo:'primary',onClick:()=>{ App.avisoFLK('Filho','x'); }}]}));
  await clicar(page,'abrir');
  t((await titulo(page))==='Filho','aviso aberto de dentro de um modal continua na tela');
  await clicar(page,'Entendido');
  // decisão obrigatória
  await page.evaluate(()=>App.modalFLK({titulo:'Obrigatório', fechavel:false, botoes:[{txt:'Responder',tipo:'primary'}]}));
  await page.keyboard.press('Escape'); await page.mouse.click(8,8);
  t((await titulo(page))==='Obrigatório' && !(await page.$('#flkModal [data-flkm-x]')),'fechavel:false: sem ✕, Esc e clique fora não fecham');
  await clicar(page,'Responder');
  await page.evaluate(()=>App.avisoFLK('Esc','x')); await page.keyboard.press('Escape');
  t(!(await page.$('#flkModal')),'modal comum fecha com Esc');
  // fixo na tela mesmo com a página rolada
  await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
  await page.evaluate(()=>App.avisoFLK('Rolado','x'));
  t(await noViewport(page),'modal aparece dentro da tela com a página rolada');
  await clicar(page,'Entendido');

  console.log('\n[2] escalação incompleta e desfalque');
  await page.evaluate(()=>{ const i=App.myTeam; App.onzeDe(i).slice(0,2).forEach(p=>App.cfg[i].posEscala[p.numero]='FORA'); App.jogarRodada(); });
  t((await titulo(page))==='Escalação incompleta' && !(await page.evaluate(()=>!!App.liveState)),'jogar com 9: modal "Escalação incompleta", rodada não começa');
  await shot(page,'escalacao_incompleta');
  await clicar(page,'Completar automaticamente');
  t((await page.evaluate(()=>App.onzeDe(App.myTeam).length))===11,'"Completar automaticamente" fecha os 11');

  console.log('\n[3] venda');
  const venda=await page.evaluate(()=>{
    const t=App.teams[App.myTeam], p=App.onzeDe(App.myTeam)[3]; p.aVenda=true;
    const comprador=App.teams.findIndex((x,i)=>i!==App.myTeam);
    App.ofertasRecebidas=[{pid:p.pid,nome:p.nome,de:comprador,deNome:App.teams[comprador].nome,valor:2e6,rodada:App.rodada}];
    return {pid:p.pid, nome:p.nome, caixa:t.saldo};
  });
  // desfalques + proposta nova no fim da rodada, em fila
  await page.evaluate(()=>{ App.baixas=[{nome:'Fulano Teste',motivo:'🩹 lesionado (2 jogos)'}]; App.liveState={done:true}; App.fecharRodada(); });
  t((await titulo(page))==='⚠️ Desfalques' && /Fulano Teste/.test(await page.textContent('#flkModal')),'fim de rodada: desfalques primeiro');
  await shot(page,'desfalques');
  await clicar(page,'Ver escalação');
  t((await titulo(page))==='📨 Proposta recebida','depois a proposta nova (fila)');
  const txt=await page.textContent('#flkModal');
  t(/Caixa depois/.test(txt) && /Valor de mercado/.test(txt) && /titular/i.test(txt),'proposta mostra valor, caixa depois e aviso de titular');
  await shot(page,'proposta_recebida');
  await clicar(page,'Decidir depois');
  t(!(await page.$('#flkModal')) && (await page.evaluate(()=>App.ofertasRecebidas.length))===1,'"Decidir depois" mantém a proposta no Mercado');
  await page.evaluate(()=>{ App.fecharRodada(); });
  t(!(await page.$('#flkModal')),'proposta já avisada não reaparece na próxima rodada');
  await page.click('#tabs [data-tab="mercado"]');
  await page.click(`[data-oferta-sim="${venda.pid}"]`);
  t((await titulo(page))==='Vender jogador?','"Aceitar" no Mercado abre o modal de decisão (não vende direto)');
  await clicar(page,'Aceitar venda');
  const pos=await page.evaluate(v=>({dele:App.teams[App.myTeam].players.some(p=>p.pid===v.pid), caixa:App.teams[App.myTeam].saldo}),venda);
  t(!pos.dele && pos.caixa===venda.caixa+2e6 && (await titulo(page))==='✅ Venda concluída','venda concluída: jogador sai, caixa sobe, aviso de confirmação');
  await clicar(page,'Entendido');

  console.log('\n[4] compra');
  const alvo=await page.evaluate(()=>{ const ti=App.teams.findIndex((x,i)=>i!==App.myTeam); return App.teams[ti].players[0].pid; });
  await page.evaluate(pid=>App.negociarCompraUI(pid),alvo);
  t(/Proposta por/.test(await titulo(page)||'') && /Caixa depois/i.test(await page.textContent('#flkModal')),'negociação no padrão, com o contador (caixa depois)');
  await page.fill('#flkm_oferta','999');
  const cd=await page.$eval('#flkModal [data-ct="caixa"]',e=>({txt:e.textContent, cor:e.style.color}));
  t(/-/.test(cd.txt) && /loss/.test(cd.cor),'"caixa depois" atualiza ao digitar (negativo em vermelho)');
  await shot(page,'compra');
  await clicar(page,'Enviar proposta');
  t((await titulo(page))==='Saldo insuficiente','saldo insuficiente aparece (antes sumia na hora)');
  await clicar(page,'Entendido');
  t(/Proposta por/.test(await titulo(page)||''),'fechar o aviso volta pra negociação');
  await page.click('#flkModal .flkm-foot .btn:has-text("Cancelar")');

  console.log('\n[5] demissão');
  await page.evaluate(()=>{ App._demissaoPendente=true; App.liveState={done:true}; App.fecharRodada(); });
  t((await titulo(page))==='🚪 Você foi demitido' && !(await page.$('#flkModal [data-flkm-x]')),'demissão no padrão, sem ✕ (precisa responder)');
  await shot(page,'demissao');
  await page.keyboard.press('Escape');
  t(!!(await page.$('#flkModal')),'Esc não fecha a demissão');
  await clicar(page,'Voltar ao menu');

  console.log('\n[6] apagar carreira (pré-jogo)');
  await page.waitForSelector('[data-del], [data-novo]',{timeout:15000}).catch(()=>{});
  if(!(await page.$('[data-del]'))){ await page.evaluate(()=>{ Menu.convidado=true; Menu.telaMenu(); }); await page.waitForSelector('[data-del]',{timeout:15000}); }
  await page.click('[data-del]');
  t((await titulo(page))==='Apagar carreira?' && await noViewport(page),'apagar carreira pede confirmação no modal, visível no pré-jogo');
  await shot(page,'apagar');
  await clicar(page,'Cancelar');
  t(!!(await page.$('[data-del]')),'cancelar mantém o save');
  await page.click('[data-del]'); await clicar(page,'Apagar carreira');
  await page.waitForTimeout(400);
  t(!(await page.$('[data-del]')),'confirmar apaga o save');
  t(ctx.dialogos===0,'nenhum diálogo nativo do navegador apareceu');
  t(erros.filter(e=>!/ERR_FAILED/.test(e)).length===0,'sem erros de JS');

  console.log('\n[7] celular');
  {
    const {page:m}=await carreira(browser,{w:390,h:844});
    await m.evaluate(()=>{ window.scrollTo(0,document.body.scrollHeight);
      const p=App.onzeDe(App.myTeam)[2]; const c=App.teams.findIndex((x,i)=>i!==App.myTeam);
      App.ofertasRecebidas=[{pid:p.pid,nome:p.nome,de:c,deNome:App.teams[c].nome,valor:1.5e6,rodada:0}]; App.avisarPropostasNovas(); });
    t(await noViewport(m),'celular: proposta cabe na tela com a página rolada');
    const sobre=await m.evaluate(()=>{ const b=document.querySelector('#flkModal .flkm-bg'), bar=document.getElementById('bottomBar');
      return +getComputedStyle(b).zIndex > +getComputedStyle(bar).zIndex; });
    t(sobre,'modal fica acima da barra inferior');
    await shot(m,'mobile_proposta');
  }

  await browser.close();
  console.log(`\n=== ${ok} ok, ${falhas} falhas ===`);
  process.exit(falhas?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
