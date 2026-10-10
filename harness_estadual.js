// harness_estadual — Estadual de pré-temporada (§6.1 item 12) + premiação por fase (item 15).
// 8 clubes do estado, 3 fases em jogo único, prêmio por fase, pular, auto-resolve ao começar
// o Brasileiro, save; Série D paga por fase avançada no mata-mata.
// Uso: node harness_estadual.js [--shots DIR]
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
  await page.evaluate(()=>{ const o=App.garantirOpcoes(); o.coletiva=false; o.recado=false; });

  console.log('\n[1] montagem');
  const m=await page.evaluate(()=>{
    const E=App.estadual, eu=App.myTeam, uf=Estadual.ufDe(App.teams[eu]);
    const todos=E.confrontos.flat();
    const disp=App.teams.filter((x,i)=>i!==eu && Estadual.ufDe(x)===uf).length;
    const mesmos=todos.filter(i=>i!==eu && Estadual.ufDe(App.teams[i])===uf).length;
    return {st:E.status, n:todos.length, unicos:new Set(todos).size, euDentro:todos.includes(eu), uf, disp, mesmos, nome:E.nome, fase:E.fase};
  });
  t(m.st==='pendente' && m.fase===0,'carreira nova começa com estadual pendente');
  t(m.n===8 && m.unicos===8 && m.euDentro,'8 clubes distintos, eu incluso, 4 confrontos');
  t(m.mesmos===Math.min(7,m.disp),`adversários do mesmo estado primeiro (${m.mesmos} de ${m.disp} do ${m.uf||'?'})`);
  t(/Campeonato|Torneio/.test(m.nome),`nome: ${m.nome}`);
  // cidades reais: 3 do PR + 5 do RS (mesma região) + resto longe → 3 do PR, 4 do Sul
  const reg=await page.evaluate(()=>{ const bk=App.estadual, eu=App.myTeam, cid=App.teams.map(x=>x.cidade);
    const os=App.teams.map((x,i)=>i).filter(i=>i!==eu);
    App.teams.forEach(x=>x.cidade='Manaus'); App.teams[eu].cidade='Curitiba';
    os.slice(0,3).forEach(i=>App.teams[i].cidade='Maringá'); os.slice(3,8).forEach(i=>App.teams[i].cidade='Porto Alegre');
    const E=App.criarEstadual(), ps=E.confrontos.flat().filter(i=>i!==eu).map(i=>Estadual.ufDe(App.teams[i]));
    const r={pr:ps.filter(u=>u==='PR').length, rs:ps.filter(u=>u==='RS').length, nome:E.nome};
    App.teams.forEach((x,i)=>x.cidade=cid[i]); App.estadual=bk; return r; });
  t(reg.pr===3 && reg.rs===4 && reg.nome==='Campeonato Paranaense',`clube de Curitiba: ${reg.pr} do PR + ${reg.rs} do Sul, "${reg.nome}"`);
  // sem UF conhecida: completa com qualquer um
  const semUF=await page.evaluate(()=>{ const bk=App.estadual, c=App.teams[App.myTeam].cidade; App.teams[App.myTeam].cidade='Atlântida';
    const E=App.criarEstadual(); const r={n:new Set(E.confrontos.flat()).size, nome:E.nome}; App.teams[App.myTeam].cidade=c; App.estadual=bk; return r; });
  t(semUF.n===8 && /Pré-Temporada/.test(semUF.nome),'cidade sem estado → torneio de pré-temporada com 8 clubes');

  console.log('\n[2] UI: banner, disputar, prêmios');
  t(await page.$('#estAbrir')!==null && /pré-temporada/i.test(await page.textContent('.est-banner')),'banner do estadual na Formação');
  if(SHOTS) await page.screenshot({path:path.join(SHOTS,'estadual_banner.png')});
  await page.click('#estAbrir');
  t(/🏆/.test(await titulo(page)) && await page.$('#flkModal .flkm-foot .btn:has-text("Disputar")'),'modal com Pular / Disputar');
  if(SHOTS) await page.screenshot({path:path.join(SHOTS,'estadual_modal.png')});
  const antes=await page.evaluate(()=>({caixa:App.teams[App.myTeam].saldo, conf:App.confianca}));
  // garante vitória em tudo pra ver o caminho inteiro
  await page.evaluate(()=>{ App._fzBk=App.forcaDoTime; App.forcaDoTime=()=>9999; });
  await clicar(page,'Disputar');
  let st=await page.evaluate(()=>({fase:App.estadual.fase, st:App.estadual.status, g:App.estadual.ganhos}));
  t(st.st==='andamento' && st.fase===1,'quartas jogadas → semifinal');
  t(st.g===await page.evaluate(()=>App.premioEstadual('participacao')+App.premioEstadual('semi')),'pagou participação + semifinal');
  t(/\+R?\$?/.test(await page.textContent('#flkModal')) && await page.$('#flkModal .flkm-foot .btn:has-text("Jogar Semifinal")'),'mostra prêmio e botão da próxima fase');
  await clicar(page,'Jogar Semifinal');
  await clicar(page,'Jogar Final');
  const fim=await page.evaluate(()=>({st:App.estadual.status, camp:App.estadual.campeao===App.myTeam, g:App.estadual.ganhos, max:App.premioMaxEstadual(),
    caixa:App.teams[App.myTeam].saldo, conf:App.confianca, car:App.garantirCarreira().estaduais, ext:(App.extrato||[]).filter(e=>/Campeonato|Torneio/.test(e.desc||'')).length}));
  t(fim.st==='fim' && fim.camp,'campeão estadual');
  t(fim.g===fim.max && fim.caixa===antes.caixa+fim.max,`prêmio total ${fim.max} creditado no caixa`);
  t(fim.conf>antes.conf && fim.car===1,'título: confiança sobe e conta na carreira');
  t(fim.ext===4,'4 lançamentos no extrato');
  t(/campeão/i.test(await page.textContent('#flkModal')),'modal de campeão');
  if(SHOTS) await page.screenshot({path:path.join(SHOTS,'estadual_campeao.png')});
  await clicar(page,'Fechar');
  await page.evaluate(()=>{ App.forcaDoTime=App._fzBk; });
  t(!(await page.$('#estAbrir')),'banner some depois do estadual');

  console.log('\n[3] eliminação, pular e auto-resolve');
  const el=await page.evaluate(()=>{
    const bk=App.forcaDoTime; App.forcaDoTime=()=>1; App.criarEstadual();
    const r1=App.jogarFaseEstadual(); App.forcaDoTime=bk;
    const E=App.estadual; const eliminado=!r1.vivo && !E.confrontos.some(c=>c.includes(App.myTeam));
    const g=E.ganhos; App.resolverEstadualRestante();
    return {eliminado, g, part:App.premioEstadual('participacao'), fim:E.status, camp:E.campeao!=null && E.campeao!==App.myTeam};
  });
  t(el.eliminado && el.g===el.part,'eliminado nas quartas: só a participação');
  t(el.fim==='fim' && el.camp,'resto do torneio é simulado até o campeão');
  const pul=await page.evaluate(()=>{ App.criarEstadual(); App.renderEscala(); document.getElementById('estPular').click(); return {st:App.estadual.status, banner:!!document.getElementById('estAbrir')}; });
  t(pul.st==='pulado' && !pul.banner,'"Pular" encerra sem jogar');
  const auto=await page.evaluate(()=>{
    App.criarEstadual(); App.jogarFaseEstadual(); const c0=App.estadual.status;
    App.escalarMelhor(); App.jogarRodada(); App.pularRodada();
    const a=App.estadual.status;
    return {c0, a};
  });
  t(auto.c0==='andamento' && auto.a==='fim','começar o Brasileiro com estadual em andamento → simulado até o fim');
  await page.evaluate(()=>{ App.liveState={done:true}; App.fecharRodada(); document.getElementById('flkModal')?.remove(); App._filaModais=[]; });

  console.log('\n[4] save');
  const sv=await page.evaluate(()=>{
    App.criarEstadual(); App.jogarFaseEstadual(); const E=JSON.stringify(App.estadual);
    App.garantirCarreira().estaduais=2;
    const snap=JSON.parse(JSON.stringify(App.snapshot())); App.estadual=null; App.carreira.estaduais=0; App.aplicarSnapshot(snap);
    const volta=App.estadual && App.estadual.status==='andamento' && App.estadual.fase===1 && App.estadual.confrontos.length===2 && App.estadual.ganhos===JSON.parse(E).ganhos;
    const lixo=App.sanearEstadual({confrontos:[[1,99999],['x',2]],status:'hack',ganhos:-5});
    const velho=(()=>{ const s2=JSON.parse(JSON.stringify(snap)); delete s2.estadual; App.aplicarSnapshot(s2); return App.estadual===null; })();
    return {volta, car:App.garantirCarreira().estaduais, lixo:lixo.confrontos.length===0 && lixo.status==='pulado' && lixo.ganhos===0, velho};
  });
  t(sv.volta,'estadual em andamento sobrevive ao save');
  t(sv.car===2,'títulos estaduais da carreira vão pro save');
  t(sv.lixo,'save adulterado é saneado');
  t(sv.velho,'save antigo sem estadual carrega normal');

  console.log('\n[5] nova temporada cria estadual');
  const nt=await page.evaluate(()=>{ App.estadual=null; App.tempEncerrada=true; App.novaTemporadaCompleta(); document.getElementById('flkModal')?.remove(); App._filaModais=[];
    return App.estadual && App.estadual.status==='pendente' && App.estadual.temporada===App.temporada; });
  t(nt,'temporada nova → estadual novo pendente');

  console.log('\n[6] Série D: premiação por fase no mata-mata');
  const d=await page.evaluate(()=>{
    const eu=App.myTeam, os=App.teams.map((x,i)=>i).filter(i=>i!==eu).slice(0,3);
    const cx0=App.teams[eu].saldo; App._premiosFase=[];
    App.fase='ko';
    App.mataMata={confrontos:[[eu,os[0]],[os[1],os[2]]], resultados:[{h:eu,a:os[0],gc:2,gf:0},{h:os[0],a:eu,gc:0,gf:1},{h:os[1],a:os[2],gc:1,gf:0},{h:os[2],a:os[1],gc:0,gf:0}], historico:[]};
    App.formato=App.formato||{acessos:6};
    App.avancarFaseMataMata();
    const r1={pr:App._premiosFase.map(x=>x.v), cx:App.teams[eu].saldo-cx0};
    // final ganha → campeão
    App.mataMata.resultados=[{h:eu,a:os[1],gc:3,gf:0},{h:os[1],a:eu,gc:0,gf:0}];
    App.avancarFaseMataMata();
    const r2={pr:App._premiosFase.map(x=>x.v), txt:App._premiosFase.map(x=>x.txt)};
    return {r1,r2,esp1:App.PREMIO_FASE_D[2], esp2:App.PREMIO_FASE_D[1]};
  });
  t(d.r1.pr.length===1 && d.r1.pr[0]===d.esp1 && d.r1.cx===d.esp1,`passou da semifinal → +${d.esp1}`);
  t(d.r2.pr[1]===d.esp2 && /campeão/.test(d.r2.txt[1]),`campeão da Série D → +${d.esp2}`);
  await page.evaluate(()=>{ App.fase='fim'; App.liveState={done:true}; App.fecharRodada(); });
  // outros avisos do fim da rodada (desfalques, propostas, leilão…) podem vir antes na fila:
  // pula-os até achar o da premiação (no máx. 6)
  let achou=false, vistos=[];
  for(let k=0;k<6;k++){ const tt=await titulo(page); if(!tt) break; vistos.push(tt);
    if(/Premiação por fase/.test(tt)){ achou=true; break; }
    await page.click('#flkModal .flkm-foot .btn:first-child'); await page.waitForTimeout(250); }
  t(achou,'aviso "💰 Premiação por fase" no fim da rodada'+(achou?'':' (fila: '+vistos.join(' · ')+')'));
  if(SHOTS) await page.screenshot({path:path.join(SHOTS,'premio_fase.png')});
  t(await page.evaluate(()=>!(App._premiosFase||[]).length),'fila de prêmios esvazia depois do aviso');

  t(erros.filter(e=>!/ERR_FAILED/.test(e)).length===0,'sem erros de JS'+(erros.length?': '+erros.join(' | '):''));
  await browser.close();
  console.log(`\n=== ${ok} ok, ${falhas} falhas ===`);
  process.exit(falhas?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
