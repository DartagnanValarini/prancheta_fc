// harness_saida — quem SAI de campo no meio do jogo (substituído ou expulso)
// conta como quem jogou: recebe nota (proporcional aos minutos), gasta energia,
// consolida gols/assistências e a moral o trata como quem jogou.
// Antes: só o campo do apito final era processado — o substituído ficava sem
// nota, voltava descansado no jogo seguinte e, se tinha marcado, o gol vazava
// pra partida seguinte dele.
// Uso: node harness_saida.js
const {abrir,chromium}=require('./ui_test/abrir.js');
let ok=0,falhas=0; const t=(c,m)=>{ if(c){ok++;console.log('  ✅',m);} else {falhas++;console.log('  ❌',m);} };

(async()=>{
  const browser=await chromium.launch();
  const {page,erros}=await abrir(browser);
  page.on('dialog',d=>d.accept());
  await page.evaluate(()=>localStorage.setItem('prancheta_tutorial_v1','feito'));
  await page.click('#btnJogarAgora'); await page.waitForSelector('.clube-lin',{timeout:15000});
  await page.click('.clube-lin'); await page.waitForSelector('.fm-campo');
  await page.evaluate(()=>{ const o=App.garantirOpcoes(); o.coletiva=false; o.recado=false; if(App.estadual) App.estadual.status='pulado'; });

  console.log('\n[1] substituição manual aos 60\'');
  const r1=await page.evaluate(()=>{
    App.teams.forEach(t=>t.players.forEach(p=>{ p.energia=70; }));   // abaixo de 100: a recuperação de 3 dias não satura
    App.escalarMelhor(); App.jogarRodada(); const L=App.liveState; clearInterval(L.timer); L._rapido=true;
    while(L.min<60){ L.min++; App.simularMinuto(); }
    const s=App.meuSim(), lado=App.meuLado(s), campo=lado==='H'?s.campoH:s.campoA;
    const idx=campo.findIndex(c=>c.posicao!=='GK'); const sai=campo[idx].ref;
    sai._golsRodada=(sai._golsRodada||0)+1;          // finge que ele marcou antes de sair
    const golsAntes=sai.golsTemp||0, notasAntes=sai._qtdNotas||0, energiaAntes=sai.energia;
    const emCampo=new Set(campo.map(c=>c.numero));
    const entra=App.bancoDe(App.myTeam).find(p=>!emCampo.has(p.numero));
    App.abrirSubs('parada'); const ctx=L._subCtx;
    ctx.pendentes.push({saiIdx:idx, sai:campo[idx], entra}); App.aplicarSubs(); clearInterval(L.timer);
    const banco=App.bancoDe(App.myTeam).find(p=>p!==entra && !emCampo.has(p.numero));
    while(L.min<90){ L.min++; App.simularMinuto(); }
    const energiaNoCampo=(s.saidaH||s.saidaA||[]).concat(s.saidaA||[]).find(c=>c.ref===sai)?.energia;
    App.encerrarRodada(); App.fecharRodada(); document.getElementById('flkModal')?.remove(); App._filaModais=[];
    return {nome:sai.nome, nota:sai._notaRodada, notas:(sai._qtdNotas||0)-notasAntes, forma:(sai._notas5||[]).length,
      gol:(sai.golsTemp||0)-golsAntes, vazou:!!sai._golsRodada, energiaAntes, energiaDepois:sai.energia, energiaNoCampo,
      entrouNota:entra._notaRodada, entrouJogos:entra.jogosTemp||0, bancoEnergia:banco&&banco.energia};
  });
  t(r1.nota!=null && r1.notas===1,`${r1.nome} saiu aos 60' e recebeu nota (${r1.nota})`);
  t(r1.forma>=1,'a nota entra na forma recente (5 últimas)');
  t(r1.gol===1 && !r1.vazou,'gol de quem saiu conta na temporada e não vaza pro jogo seguinte');
  t(r1.energiaDepois<r1.bancoEnergia,`quem saiu gastou energia: ${r1.energiaDepois} contra ${r1.bancoEnergia} de quem ficou no banco (todos começaram com ${r1.energiaAntes})`);
  t(r1.entrouNota!=null && r1.entrouJogos>=1,'quem entrou também tem nota e jogo contado');

  console.log('\n[2] expulso');
  const r2=await page.evaluate(()=>{
    App.teams.forEach(t=>t.players.forEach(p=>{ delete p.suspenso; delete p.lesionado; p.energia=100; }));
    App.escalarMelhor(); App.jogarRodada(); const L=App.liveState; clearInterval(L.timer); L._rapido=true;
    while(L.min<30){ L.min++; App.simularMinuto(); }
    const s=App.meuSim(), lado=App.meuLado(s), campo=lado==='H'?s.campoH:s.campoA;
    const alvo=campo.find(c=>c.posicao!=='GK'); alvo.ref._expulso=true; App.removerDeCampo(s,campo,alvo);
    while(L.min<90){ L.min++; App.simularMinuto(); }
    const saida=(lado==='H'?s.saidaH:s.saidaA).find(c=>c.ref===alvo.ref);
    App.encerrarRodada(); App.fecharRodada(); document.getElementById('flkModal')?.remove(); App._filaModais=[];
    return {nota:alvo.ref._notaRodada, min:saida&&saida._minutos, susp:alvo.ref.suspenso||0};
  });
  t(r2.min===30,`expulso aos 30' conta 30 minutos (${r2.min})`);
  t(r2.nota!=null && r2.nota<6,`expulso recebe nota baixa (${r2.nota})`);
  t(r2.susp>=1,'expulsão continua gerando suspensão');

  console.log('\n[3] 60 jogos com trocas automáticas da IA');
  const r3=await page.evaluate(()=>{
    let saidas=0, semNota=0, jogos=0, energiaIgual=0;
    for(let k=0;k<60;k++){
      App.teams.forEach(t=>t.players.forEach(p=>{ delete p._expulso; p._amarelosJogo=0; p.energia=70; delete p.lesionado; delete p.suspenso; }));
      App.escalarMelhor(); document.getElementById('flkModal')?.remove(); App._filaModais=[];
      App.jogarRodada(); const L=App.liveState; clearInterval(L.timer); L._rapido=true;
      while(L.min<90){ L.min++; App.simularMinuto(); }
      const lista=[], minutos=new Map(); L.sims.forEach(s=>(s.saidaH||[]).concat(s.saidaA||[]).forEach(c=>{ lista.push(c.ref); minutos.set(c.ref,c._minutos); }));
      lista.forEach(p=>{ p._notaRodada=null; });
      App.encerrarRodada(); App.fecharRodada(); document.getElementById('flkModal')?.remove(); App._filaModais=[];
      lista.forEach(p=>{ saidas++; if(p._notaRodada==null) semNota++; if(minutos.get(p)>=15 && p.energia>=76) energiaIgual++; });   // 70 + 3 dias (+6) = 76 pra quem não jogou
      jogos++; App.rodada=0;
    }
    return {saidas, semNota, jogos, energiaIgual};
  });
  t(r3.saidas>50,`${r3.saidas} saídas de campo em ${r3.jogos} rodadas`);
  t(r3.semNota===0,`todas com nota (${r3.semNota} sem)`);
  t(r3.energiaIgual===0,`quem jogou 15+ minutos gastou energia (${r3.energiaIgual} ficaram como quem não jogou)`);
  t(erros.filter(e=>!/ERR_FAILED/.test(e)).length===0,'sem erros de JS'+(erros.length?': '+erros.slice(0,3).join(' | '):''));
  await browser.close();
  console.log(`\n=== ${ok} ok, ${falhas} falhas ===`);
  process.exit(falhas?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
