// harness_nuvem_fora — o jogo aguenta a nuvem (Supabase) fora do ar.
// Em 10/2026 e 11/2026 o projeto do Supabase pausou: quem estava logado via os slots
// VAZIOS (e podia começar outra carreira por cima da que estava na nuvem), e o save
// falhava calado. Aqui o supabase-js falso "cai" (game_save e login respondem
// "Failed to fetch") e conferimos:
//   [1] logado + nuvem fora no menu → tela "Nuvem fora do ar", sem slots pra começar
//   [2] login com nuvem fora → mensagem humana (não "Failed to fetch")
//   [3] nuvem cai no meio do jogo → save vai pro aparelho, aviso UMA vez
//   [4] reabrir com a nuvem ainda fora → continua do aparelho, slots vazios travados
//   [5] nuvem volta → carrega a cópia do aparelho (mais nova), sobe e apaga a cópia
// Uso: node harness_nuvem_fora.js
const {abrir,chromium}=require('./ui_test/abrir.js');
let ok=0,falhas=0; const t=(c,m)=>{ if(c){ok++;console.log('  ✅',m);} else {falhas++;console.log('  ❌',m);} };
const UID='u-teste-1';
const SESSAO={access_token:'tok', user:{id:UID, email:'tester@catimba.local'}};

(async()=>{
  const browser=await chromium.launch();
  const {page,erros}=await abrir(browser,{seguro:true});
  const cfg=async c=>{ await page.evaluate(c=>{ sessionStorage.setItem('__fakecfg',JSON.stringify(c));
    localStorage.setItem('catimba_tutorial_v1','feito'); },c); await page.reload(); };
  const mudar=async patch=>page.evaluate(p=>{ Object.assign(window.__FAKE_CFG,p); window.__fakeSalvar(); },patch);
  const fecharModais=()=>page.evaluate(()=>{ document.querySelectorAll('#flkModal').forEach(m=>m.remove()); App._filaModais=[]; });

  console.log('\n[1] logado, nuvem fora ao abrir');
  await cfg({sessao:SESSAO, fora:true, saves:[]});
  await page.waitForSelector('#btnNuvemRetry',{timeout:15000});
  const t1=await page.evaluate(()=>({novo:document.querySelectorAll('[data-novo]').length, txt:document.getElementById('preBody').textContent}));
  t(t1.novo===0,'nenhum slot "vazio · clique para começar" aparece');
  t(/continua salva na nuvem/.test(t1.txt),'diz que a carreira está segura na nuvem');

  console.log('\n[2] login com nuvem fora');
  await page.click('#btnNuvemSair'); await page.waitForSelector('#btnIrLogin'); await page.click('#btnIrLogin');
  await page.fill('#mEmail','a@b.c'); await page.fill('#mSenha','123456'); await page.click('#btnEntrar');
  await page.waitForSelector('.pre-msg.err');
  const t2=await page.textContent('.pre-msg.err');
  t(/servidor agora/.test(t2) && !/Failed to fetch/.test(t2),'erro traduzido: "'+t2.trim().slice(0,60)+'…"');

  console.log('\n[3] nuvem cai no meio da carreira');
  await cfg({sessao:SESSAO, fora:false, saves:[]});
  await page.waitForSelector('[data-novo="1"]',{timeout:15000});
  await page.click('[data-novo="1"]'); await page.waitForSelector('.clube-lin',{timeout:15000});
  await page.click('.clube-lin'); await page.waitForSelector('.fm-campo');
  await page.evaluate(()=>App.salvarSupabase(true));
  const nuvem0=await page.evaluate(()=>window.__FAKE_CFG.saves.length);
  t(nuvem0===1,'com a nuvem no ar, o save vai pra nuvem');
  await fecharModais();
  await page.evaluate(()=>{ App._avisosNuvem=0; const o=App.avisoFLK.bind(App);
    App.avisoFLK=(tit,...r)=>{ if(/Nuvem fora/.test(tit)) App._avisosNuvem++; return o(tit,...r); }; });
  await mudar({fora:true});   // cai ANTES das rodadas: o auto-save delas já vai pro aparelho
  for(let i=0;i<2;i++){
    await page.evaluate(()=>{ if(App.onzeDe(App.myTeam).length<11) App.escalarMelhor(); App.jogarRodada(); });
    await page.evaluate(()=>App.pularRodada());
    await page.evaluate(()=>App.fecharRodada()); await fecharModais();
  }
  const t3=await page.evaluate(async uid=>{
    await App.salvarSupabase(true); await App.salvarSupabase(false);
    const avisos=App._avisosNuvem;
    const raw=localStorage.getItem('catimba_pendente_'+uid+'_1');
    return {pend:!!raw, rodadaPend:raw?JSON.parse(raw).rodada:null, rodada:App.rodada, saldo:App.teams[App.myTeam].saldo, avisos,
      rodadaNuvem:window.__FAKE_CFG.saves[0].rodada};
  },UID);
  t(t3.pend && t3.rodadaPend===t3.rodada,`cópia guardada no aparelho (rodada ${t3.rodadaPend})`);
  t(t3.avisos===1,`aviso "Nuvem fora do ar" aparece uma vez só (${t3.avisos}) apesar de vários saves`);
  t(t3.rodadaNuvem<t3.rodada,'a nuvem ficou com a versão antiga (como seria na vida real)');

  console.log('\n[4] reabrir com a nuvem ainda fora');
  await page.reload(); await page.waitForSelector('[data-slot="1"]',{timeout:15000});
  const t4=await page.evaluate(()=>({meta:document.querySelector('[data-slot="1"]').textContent,
    novo:document.querySelectorAll('[data-novo]').length, del:document.querySelectorAll('[data-del]').length}));
  t(/no aparelho/.test(t4.meta),'slot 1 aparece, marcado "no aparelho"');
  t(t4.novo===0 && t4.del===0,'slots vazios e "apagar" travados enquanto a nuvem está fora');
  await page.click('[data-slot="1"]'); await page.waitForSelector('.fm-campo',{timeout:20000});
  const t4b=await page.evaluate(()=>({rodada:App.rodada, saldo:App.teams[App.myTeam].saldo}));
  t(t4b.rodada===t3.rodada && t4b.saldo===t3.saldo,'carreira volta da cópia do aparelho (rodada e caixa iguais)');

  console.log('\n[5] nuvem volta');
  await mudar({fora:false});
  await page.reload(); await page.waitForSelector('[data-slot="1"]',{timeout:15000});
  await page.click('[data-slot="1"]'); await page.waitForSelector('.fm-campo',{timeout:20000});
  await page.waitForFunction(uid=>!localStorage.getItem('catimba_pendente_'+uid+'_1'),UID,{timeout:15000}).catch(()=>{});
  const t5=await page.evaluate(uid=>({rodada:App.rodada, nuvem:window.__FAKE_CFG.saves[0].rodada,
    pend:!!localStorage.getItem('catimba_pendente_'+uid+'_1'), assinado:App._saveAssinado}),UID);
  t(t5.rodada===t3.rodada,'carregou a versão mais nova (a do aparelho), não a velha da nuvem');
  t(t5.nuvem===t3.rodada,'subiu pra nuvem sozinho');
  t(!t5.pend,'cópia do aparelho apagada depois de subir');
  t(t5.assinado===true,'save continua assinado (não vira "suspeito" no ranking)');

  const errosPagina=erros.filter(e=>!e.startsWith('console:'));
  t(errosPagina.length===0,'sem erro de script'+(errosPagina.length?': '+errosPagina[0]:''));
  console.log(`\n${ok} ok, ${falhas} falha(s)`);
  await browser.close(); process.exit(falhas?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
