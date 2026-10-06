// harness_economia — §6.1 item 17: balanceamento (05/10/2026). Gate das correções:
//  [1] a IA escala 11 em todo jogo (antes a escalação dela nunca era refeita: cada
//      lesão/suspensão virava buraco, e o mais fraco da Série A era campeão com 100 pts)
//  [2] força pesa no placar (força^3): 16% mais fraco → bem menos chances; gols/jogo iguais
//  [3] interesse do jogador: craque de série maior recusa clube pequeno (ou pede salário maior)
//  [4] recém-contratado não pode ser revendido por 8 rodadas (fecha a arbitragem)
//  [5] economia por série: preço pela força+potencial, salário pela força, salário salvo
//  [6] informativo: temporada do clube mais fraco da Série A (posição final)
// A medição longa (10 temporadas, 3 estratégias) está descrita no roadmap §6.1 item 17.
// Uso: node harness_economia.js
const {abrir,chromium}=require('./ui_test/abrir.js');
let ok=0,falhas=0; const t=(c,m)=>{ if(c){ok++;console.log('  ✅',m);} else {falhas++;console.log('  ❌',m);} };
const titulo=page=>page.$eval('#flkModal .flkm-title',e=>e.textContent).catch(()=>'');

(async()=>{
  const browser=await chromium.launch();
  const {page,erros}=await abrir(browser);
  page.on('dialog',d=>d.accept());
  await page.evaluate(()=>localStorage.setItem('prancheta_tutorial_v1','feito'));
  await page.click('#btnJogarAgora'); await page.waitForSelector('.clube-lin',{timeout:15000});
  await page.click('.clube-lin'); await page.waitForSelector('.fm-campo');
  await page.evaluate(()=>{ const o=App.garantirOpcoes(); o.coletiva=false; o.recado=false; App.salvarSupabase=async()=>{}; if(App.estadual) App.estadual.status='pulado'; });

  console.log('\n[1] IA escala 11 em todo jogo (temporada inteira, com lesões e suspensões)');
  const r1=await page.evaluate(()=>{
    let jogosIA=0, incompletos=0, minimo=11, desfalques=0, n=0;
    while(n<60 && !(App.tempEncerrada||App.rodada>=App.fixtures.length)){
      App.escalarMelhor(); App.confianca=70;
      App.jogarRodada(); if(!App.liveState) break;
      App.liveState.sims.forEach(s=>[[s.h,s.campoH],[s.a,s.campoA]].forEach(([ti,c])=>{ if(ti===App.myTeam) return;
        jogosIA++; minimo=Math.min(minimo,c.length); if(c.length<11) incompletos++; }));
      App.teams.forEach((tm,i)=>{ if(i!==App.myTeam) desfalques+=tm.players.filter(p=>App.indisponivel(p)).length; });
      clearInterval(App.liveState.timer); App.pularRodada(); App.fecharRodada();
      document.querySelectorAll('#flkModal').forEach(e=>e.remove()); App._filaModais=[]; App._aposFila=[]; n++;
    }
    return {jogosIA, incompletos, minimo, desfalques, n};
  });
  t(r1.desfalques>0,`houve desfalques na IA durante a temporada (${r1.desfalques} jogador-rodadas)`);
  t(r1.incompletos===0 && r1.minimo===11,`IA começou todos os ${r1.jogosIA} jogos com 11 (mínimo ${r1.minimo})`);

  console.log('\n[2] força pesa no placar');
  const r2=await page.evaluate(()=>{
    const p=(a,b,m)=>Motor.chanceGol(a,b,'normal','normal',m);
    const forte=760, fraco=640;
    const razao=p(fraco,forte,false)/p(forte,fraco,false);
    const igual=p(700,700,true)+p(700,700,false), desig=p(forte,fraco,true)+p(fraco,forte,false);
    return {razao, exp:Motor.EXP_FORCA, igual, desig};
  });
  t(r2.exp>=2,`expoente de força ${r2.exp} (antes linear)`);
  t(r2.razao<=0.65,`time 16% mais fraco cria ${Math.round(r2.razao*100)}% das chances do forte (era 84%)`);
  t(Math.abs(r2.desig/r2.igual-1)<0.05,`gols por jogo quase iguais entre jogo parelho e desigual (${(r2.desig/r2.igual).toFixed(3)}×)`);

  console.log('\n[3] interesse do jogador');
  const r3=await page.evaluate(()=>{
    const eu=App.myTeam, minhaDiv=App.teams[eu].divisao;   // Série D no começo
    const ref=App.forcaRefDivisao(minhaDiv);
    const ov=p=>Motor.melhorGeral(p).ov;
    const deA=App.teams.map((t,i)=>({t,i})).filter(o=>o.t.divisao==='A');
    const craque=deA.flatMap(o=>o.t.players.map(p=>({p,i:o.i}))).sort((a,b)=>ov(b.p)-ov(a.p))[0];
    const meio=deA.flatMap(o=>o.t.players.map(p=>({p,i:o.i}))).find(x=>{ const g=ov(x.p)-ref; return g>App.INTERESSE_FOLGA+1 && g<=App.INTERESSE_TETO; });
    const mesma=App.teams.map((t,i)=>({t,i})).filter(o=>o.t.divisao===minhaDiv && o.i!==eu).flatMap(o=>o.t.players.map(p=>({p,i:o.i}))).sort((a,b)=>ov(b.p)-ov(a.p))[0];
    const rc=App.interesseJogador(craque.p,craque.i), rm=meio?App.interesseJogador(meio.p,meio.i):null, rs=App.interesseJogador(mesma.p,mesma.i);
    const salNormal=Math.round((meio?meio.p.salario:20)*1.10);
    return {minhaDiv, ref:Math.round(ref), craque:{ov:ov(craque.p), ...rc, pid:craque.p.pid}, meio:meio?{ov:ov(meio.p), ...rm, sal:App.pedidoSalarial(meio.p), salNormal}:null, mesma:{ov:ov(mesma.p), ...rs}};
  });
  t(!r3.craque.ok,`craque da Série A (força ${r3.craque.ov}) recusa a Série ${r3.minhaDiv} (nível ${r3.ref})`);
  t(r3.meio && r3.meio.ok && r3.meio.mult>1 && r3.meio.sal>r3.meio.salNormal,`um pouco acima do nível: vem, mas pede +${r3.meio?Math.round((r3.meio.mult-1)*100):0}% de salário`);
  t(r3.mesma.ok && r3.mesma.mult===1,`jogador da mesma série (força ${r3.mesma.ov}) vem sem restrição`);
  await page.evaluate(pid=>App.negociarCompraUI(pid),r3.craque.pid);
  t(/não quer vir/.test(await titulo(page)),'"Negociar" com quem recusa mostra o aviso e não abre a negociação');
  await page.evaluate(()=>{ document.querySelectorAll('#flkModal').forEach(e=>e.remove()); App._filaModais=[];
    App.mercadoFiltro={caixa:'', setor:'', div:'A', idade:'', ord:'forca'}; App.showTab('mercado'); });
  t((await page.$$('#tab-mercado .mk-recusa, .mk-recusa')).length>0,'mercado marca "🚫 Recusa" nos que não vêm');

  console.log('\n[4] recém-contratado não é revendido na hora');
  const r4=await page.evaluate(()=>{
    const eu=App.myTeam; App.teams[eu].saldo=500e6;
    const alvo=App.teams.flatMap((t,i)=>i===eu?[]:t.players.map(p=>({p,i}))).find(x=>App.interesseJogador(x.p,x.i).mult===1);
    const r=App.executarTransferencia(alvo.p.pid, eu, Math.ceil(App.precoPedido(alvo.p)));
    const p=alvo.p, r0=App.rodada;
    const travado=!App.podeRevender(p);
    p.aVenda=true; App.ofertasRecebidas=[]; App.teams.forEach((t,i)=>{ if(i!==eu) t.saldo=500e6; });
    for(let k=0;k<20;k++) App.gerarOfertasIA();
    const semOferta=!(App.ofertasRecebidas||[]).some(o=>o.pid===p.pid) && !(App.leiloes||[]).some(l=>l.pid===p.pid);
    const snap=JSON.parse(JSON.stringify(App.snapshot())); App.aplicarSnapshot(snap);
    const p2=App.teams[eu].players.find(x=>x.pid===p.pid); const salvo=p2 && !App.podeRevender(p2);
    App.rodada=r0+App.REVENDA_RODADAS; const libera=App.podeRevender(p2);
    App.rodada=r0; App.temporada++; const novaTemp=App.podeRevender(p2); App.temporada--;
    return {ok:r.ok, travado, semOferta, salvo, libera, novaTemp, rodadaLibera:App.rodadaLiberaRevenda(p2)};
  });
  t(r4.ok && r4.travado,'jogador comprado agora fica travado pra revenda');
  t(r4.semOferta,'mesmo marcado à venda, não recebe proposta nem leilão enquanto travado');
  t(r4.salvo,'a trava sobrevive ao save');
  t(r4.libera && r4.novaTemp,`libera depois de ${8} rodadas (rodada ${r4.rodadaLibera}) ou na temporada seguinte`);

  console.log('\n[5] economia por série (06/10/2026): preço pela força+potencial, salário pela força');
  const r6=await page.evaluate(()=>{
    const meses={A:9.5,B:9.5,C:9.5,D:5}, q=(a,x)=>a[Math.floor(a.length*x)], out={};
    ['A','B','C','D'].forEach(d=>{ const ts=App.teams.map((t,i)=>i).filter(i=>App.teams[i].divisao===d);
      const pr=ts.flatMap(i=>App.teams[i].players.map(p=>App.precoPedido(p))).sort((a,b)=>a-b);
      const sal=ts.flatMap(i=>App.teams[i].players.map(p=>p.salario)).sort((a,b)=>a-b);
      const fol=ts.map(i=>App.folhaDe(i)).sort((a,b)=>a-b);
      const rec=App.PATROC_BASE[d]*meses[d] + App.CAP_ESTADIO[d]*0.6*App.PRECO_INGRESSO[d]*meses[d]*2;
      out[d]={preco:q(pr,.5), sal:q(sal,.5), folhaPct:q(fol,.5)*meses[d]/rec, precoPct:q(pr,.5)/rec}; });
    // potencial: jovem promissor × mesmo nível sem potencial
    const jov=App.teams.flatMap(t=>t.players).filter(p=>p.idade<=20 && (p.potential||0)-Motor.melhorGeral(p).ov>=12);
    const razoes=jov.map(p=>{ const c={...p, potential:Motor.melhorGeral(p).ov}; return App.valorNivelA(p)/Math.max(1,App.valorNivelA(c)); }).sort((a,b)=>a-b);
    // salário vai pro save
    const p=App.teams[App.myTeam].players[0]; p.salario=123; const sp=JSON.parse(JSON.stringify(App.jogadorParaSave(p)));
    p.salario=1; App.aplicarJogadorSave(p,sp); const salvo=p.salario;
    return {out, nJov:jov.length, razMin:razoes[0], razMed:razoes[Math.floor(razoes.length/2)], razMax:razoes[razoes.length-1], salvo};
  });
  const M=v=>(v/1e6).toFixed(1)+' M', Pc=v=>Math.round(v*100)+'%';
  Object.entries(r6.out).forEach(([d,x])=>console.log(`     Série ${d}: preço mediano ${M(x.preco)} (${Pc(x.precoPct)} da receita) · salário mediano ${x.sal} mil · folha ${Pc(x.folhaPct)} da receita`));
  t(r6.out.D.precoPct<=0.6,'mercado cabe na Série D (preço mediano ≤ 60% da receita anual)');
  t(r6.out.A.sal>=r6.out.D.sal*4,`salário escala com a série (A ${r6.out.A.sal} mil × D ${r6.out.D.sal} mil)`);
  t(['A','B','C','D'].every(d=>r6.out[d].folhaPct>=0.35 && r6.out[d].folhaPct<=0.75),'folha entre 35% e 75% da receita em todas as séries');
  console.log(`     jovens promissores (${r6.nJov}): valem ${r6.razMin.toFixed(1)}× … ${r6.razMed.toFixed(1)}× (mediana) … ${r6.razMax.toFixed(1)}× um jogador igual sem potencial`);
  t(r6.razMed>=1.5 && r6.razMax<=10,'potencial vale bem, sem explodir');
  t(r6.salvo===123,'salário vai pro save (antes voltava ao do banco ao recarregar)');

  console.log('\n[6] informativo: o clube mais fraco da Série A');
  const r5=await page.evaluate(()=>{
    const As=App.teams.map((t,i)=>i).filter(i=>App.teams[i].divisao==='A').sort((a,b)=>Menu.forcaTime(a)-Menu.forcaTime(b));
    const ti=As[0]; App.temporada=1; App.reiniciarTemporadaPara(ti); App.myTeam=ti; App.squadView=ti; App.sincronizarDivisaoAtiva(); App.estadual={status:'pulado'};
    let n=0; while(n<60 && !(App.tempEncerrada||App.rodada>=App.fixtures.length)){ App.escalarMelhor(); App.confianca=70; App.jogarRodada(); if(!App.liveState) break;
      clearInterval(App.liveState.timer); App.pularRodada(); App.fecharRodada(); document.querySelectorAll('#flkModal').forEach(e=>e.remove()); App._filaModais=[]; App._aposFila=[]; n++; }
    const st=App.ligas.A.stats.slice().sort((a,b)=>b.pts-a.pts); return {pos:st.findIndex(s=>s.i===ti)+1, pts:(st.find(s=>s.i===ti)||{}).pts, lider:st[0].pts};
  });
  console.log(`     terminou em ${r5.pos}º com ${r5.pts} pts (líder ${r5.lider}) — antes da correção: campeão com 90–104`);
  t(r5.pos>=5,'o mais fraco da Série A não briga pelo título (fica fora do G-4)');
  t(erros.filter(e=>!/ERR_FAILED/.test(e)).length===0,'sem erros de JS'+(erros.length?': '+erros.slice(0,3).join(' | '):''));
  await browser.close();
  console.log(`\n=== ${ok} ok, ${falhas} falhas ===`);
  process.exit(falhas?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
