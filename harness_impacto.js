// harness_impacto — §6.1 item 7: impacto da venda ANTES de aceitar.
// Nos modais de proposta recebida e de leilão: força do setor e do time
// (melhor escalação na formação atual, com e sem o jogador), folha depois e
// provável substituto. Só leitura: calcular não mexe na escalação.
// Uso: node harness_impacto.js [--shots DIR]
const path=require('path'),fs=require('fs');
const {abrir,chromium}=require('./ui_test/abrir.js');
const SHOTS=process.argv.includes('--shots')?process.argv[process.argv.indexOf('--shots')+1]:null;
if(SHOTS) fs.mkdirSync(SHOTS,{recursive:true});
let ok=0,falhas=0; const t=(c,m)=>{ if(c){ok++;console.log('  ✅',m);} else {falhas++;console.log('  ❌',m);} };
const titulo=page=>page.$eval('#flkModal .flkm-title',e=>e.textContent).catch(()=>'');
const fecharModais=page=>page.evaluate(()=>{ document.querySelectorAll('#flkModal').forEach(e=>e.remove()); App._filaModais=[]; });

(async()=>{
  const browser=await chromium.launch();
  const {page,erros}=await abrir(browser);
  page.on('dialog',d=>d.accept());
  await page.evaluate(()=>localStorage.setItem('prancheta_tutorial_v1','feito'));
  await page.click('#btnJogarAgora'); await page.waitForSelector('.clube-lin',{timeout:15000});
  await page.click('.clube-lin'); await page.waitForSelector('.fm-campo');
  await page.evaluate(()=>{ App.garantirOpcoes().coletiva=false; App.escalarMelhor(); });

  console.log('\n[1] cálculo no meu time');
  const r1=await page.evaluate(()=>{
    const i=App.myTeam, t=App.teams[i], c=App.cfg[i];
    const escAntes=JSON.stringify(c.posEscala);
    const onze=App.onzeDe(i);
    const craque=[...onze].sort((a,b)=>Motor.overallEm(b,App.posDe(i,b.numero))-Motor.overallEm(a,App.posDe(i,a.numero)))[0];
    const mc=App.impactoVenda(craque.pid);
    const ids11=new Set(onze.map(p=>p.pid));
    // reserva fraco: o pior fora do onze ideal
    const fora=t.players.filter(p=>!ids11.has(p.pid)).sort((a,b)=>Motor.melhorGeral(a).ov-Motor.melhorGeral(b).ov)[0];
    const mr=App.impactoVenda(fora.pid);
    return {mc, mr, craque:{sal:craque.salario, setor:POS_SETOR[App.posDe(i,craque.numero)]}, fora:{sal:fora.salario},
      folha:App.folhaDe(i), intacta:JSON.stringify(c.posEscala)===escAntes, subNoOnze: mc.substituto? ids11.has(t.players.find(p=>p.nome===mc.substituto.nome).pid):null};
  });
  t(r1.intacta,'calcular o impacto não mexe na escalação');
  t(r1.mc.setor===r1.craque.setor,`setor do titular = setor em que ele joga (${r1.mc.nomeSetor})`);
  t(r1.mc.setorDepois<=r1.mc.setorAntes && r1.mc.timeDepois<=r1.mc.timeAntes,`vender o melhor titular derruba (ou mantém) setor ${r1.mc.setorAntes}→${r1.mc.setorDepois} e time ${r1.mc.timeAntes}→${r1.mc.timeDepois}`);
  t(r1.mc.substituto && r1.subNoOnze===false,`substituto vem de fora do onze: ${r1.mc.substituto&&r1.mc.substituto.nome} (${r1.mc.substituto&&r1.mc.substituto.pos} · ${r1.mc.substituto&&r1.mc.substituto.ov})`);
  t(r1.mc.folhaAntes===r1.folha && r1.mc.folhaDepois===r1.folha-Math.round(r1.craque.sal*1000),'folha depois = folha − salário dele');
  t(!r1.mr.noOnzeIdeal && r1.mr.setorAntes===r1.mr.setorDepois && r1.mr.timeAntes===r1.mr.timeDepois && !r1.mr.substituto,'reserva fora do onze ideal: força igual, sem substituto');

  console.log('\n[2] varredura: todos os jogadores de 40 clubes');
  const r2=await page.evaluate(()=>{
    const salva=App.myTeam; let n=0, subiuTime=0, subiuSetor=0, semSub=0, piorCaso=0;
    const clubes=App.teams.map((t,i)=>i).filter(i=>App.cfg[i]).slice(0,40);
    for(const i of clubes){
      App.myTeam=i;
      for(const p of App.teams[i].players){
        const m=App.impactoVenda(p.pid); if(!m) continue; n++;
        if(m.timeDepois>m.timeAntes) subiuTime++;
        if(m.setorDepois>m.setorAntes) subiuSetor++;
        if(m.noOnzeIdeal && !m.substituto && !m.vagaVazia) semSub++;
        piorCaso=Math.max(piorCaso, Math.round((m.timeAntes-m.timeDepois)*10)/10);
      }
    }
    App.myTeam=salva;
    return {n, subiuTime, subiuSetor, semSub, piorCaso};
  });
  t(r2.n>500,`${r2.n} vendas simuladas`);
  t(r2.subiuTime===0,`vender nunca deixa o time mais forte (${r2.subiuTime} casos)`);
  t(r2.subiuSetor<=r2.n*0.01,`setor quase nunca sobe ao vender (${r2.subiuSetor} casos — rearranjo de posição)`);
  t(r2.semSub===0,`todo titular vendido tem substituto apontado (${r2.semSub} sem)`);
  console.log(`     maior queda de força do time numa venda: ${r2.piorCaso}`);

  console.log('\n[3] elenco curto: sobra vaga');
  const r3=await page.evaluate(()=>{
    const i=App.myTeam, t=App.teams[i], guard=t.players;
    const onze=App.onzeDe(i); t.players=onze.slice();      // só 11 disponíveis
    const m=App.impactoVenda(onze[5].pid); t.players=guard; return m;
  });
  t(r3.vagaVazia && !r3.substituto,'com só 11 no elenco, a venda deixa vaga sem substituto');

  console.log('\n[4] modal de proposta recebida');
  const alvo=await page.evaluate(()=>{
    const i=App.myTeam, p=App.onzeDe(i).sort((a,b)=>b.forca-a.forca)[0];
    const de=App.teams.findIndex((t,k)=>k!==i);
    App.ofertasRecebidas=[{pid:p.pid,nome:p.nome,de,deNome:App.teams[de].nome,valor:App.valorMercadoReais(p),rodada:App.rodada}];
    const m=App.impactoVenda(p.pid); App.decidirVendaUI(p.pid,{nova:true}); return {pid:p.pid, m};
  });
  await page.waitForSelector('#flkModal .mf-impacto');
  t(/Proposta recebida/.test(await titulo(page)),'modal "Proposta recebida" abriu');
  const ui=await page.$$eval('#flkModal .mf-impacto .mf-kpi',ks=>ks.map(k=>k.textContent.replace(/\s+/g,' ').trim()));
  t(ui.length===4,'bloco "Impacto no time" com 4 caixinhas');
  const f1=v=>v.toFixed(1).replace('.',',');
  t(ui[0].includes(`${f1(alvo.m.setorAntes)} → ${f1(alvo.m.setorDepois)}`) && ui[1].includes(`${f1(alvo.m.timeAntes)} → ${f1(alvo.m.timeDepois)}`),`mostra setor (${ui[0]}) e time (${ui[1]})`);
  t(alvo.m.substituto && ui[3].includes(alvo.m.substituto.nome),`mostra o provável substituto (${ui[3]})`);
  if(SHOTS) await page.screenshot({path:path.join(SHOTS,'impacto_proposta_desktop.png')});
  await page.setViewportSize({width:390,height:844}); await page.waitForTimeout(200);
  const cabe=await page.evaluate(()=>{ const b=document.querySelector('#flkModal .mf-impacto'); return b.scrollWidth<=b.clientWidth+1 && document.documentElement.scrollWidth<=innerWidth+1; });
  t(cabe,'cabe no celular (390 px) sem rolagem lateral');
  if(SHOTS){ await page.evaluate(()=>{ const b=document.querySelector('#flkModal .mf-impacto'); b&&b.scrollIntoView(); }); await page.screenshot({path:path.join(SHOTS,'impacto_proposta_390.png')}); }
  await page.setViewportSize({width:1280,height:860});
  await fecharModais(page);

  console.log('\n[5] modal de leilão');
  await page.evaluate(()=>{ App.teams.forEach((t,i)=>{ if(i!==App.myTeam) t.saldo=500e6; }); });
  const lp=await page.evaluate(()=>{
    const i=App.myTeam, p=App.onzeDe(i)[2]; p.aVenda=true;
    const cands=App.teams.map((t,k)=>({t,i:k})).filter(o=>o.i!==i);
    App.leiloes=[]; App.abrirLeilao(p,cands,App.valorMercadoReais(p)); App.verLeilaoUI(p.pid); return p.pid;
  });
  await page.waitForSelector('#flkModal .mf-impacto');
  t(/Leilão por/.test(await titulo(page)) && (await page.$$('#flkModal .mf-impacto .mf-kpi')).length===4,'leilão também mostra o impacto no time');
  if(SHOTS) await page.screenshot({path:path.join(SHOTS,'impacto_leilao.png')});
  await fecharModais(page);
  t(erros.filter(e=>!/ERR_FAILED/.test(e)).length===0,'sem erros de JS'+(erros.length?': '+erros.slice(0,3).join(' | '):''));
  await browser.close();
  console.log(`\n=== ${ok} ok, ${falhas} falhas ===`);
  process.exit(falhas?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
