// harness_forma — forma recente (§6.1 item 5): 5 últimas notas de jogador e time
// + 5 últimos resultados, persistidos no save v9 (e migração do v8).
// Roda o jogo de verdade num Chromium headless com o supabase falso (ui_test/).
// Uso: node harness_forma.js
const {abrir,chromium}=require('./ui_test/abrir.js');
let ok=0,falhas=0; const t=(c,m)=>{ if(c){ok++;console.log('  ✅',m);} else {falhas++;console.log('  ❌',m);} };

(async()=>{
  const browser=await chromium.launch();
  const {page,erros}=await abrir(browser);
  await page.evaluate(()=>localStorage.setItem('prancheta_tutorial_v1','feito'));
  await page.click('#btnJogarAgora'); await page.waitForSelector('.clube-lin',{timeout:15000});
  await page.click('.clube-lin'); await page.waitForTimeout(300);

  console.log('\n[1] Forma (unidade)');
  const u=await page.evaluate(()=>{
    const o={}; [1,2,3,4,5,6,7].forEach(n=>Forma.empurrar(o,'x',n));
    const t={}; Forma.registrarTime(t,[6,7,8],'v'); Forma.registrarTime(t,[],'d');
    return {fifo:o.x, tn:t._notas5, tr:t._forma5,
      san:Forma.sanearNotas([1,'7.5',NaN,99,-3,null,'x',6,5,4]),
      sanR:Forma.sanearResultados(['v','x','e','d',3,'d','v','v']),
      media:Forma.media([6,7,8]), mediaVazia:Forma.media([])};
  });
  t(JSON.stringify(u.fifo)==='[3,4,5,6,7]','FIFO guarda só as 5 últimas, mais antiga primeiro');
  t(JSON.stringify(u.tn)==='[7]' && JSON.stringify(u.tr)==='["v","d"]','nota do time = média de quem atuou; jogo sem notas ainda conta o resultado');
  t(u.san.length===5 && u.san.every(n=>n>=0&&n<=10),'sanearNotas: descarta lixo, clamp 0–10, máx. 5');
  t(JSON.stringify(u.sanR)==='["e","d","d","v","v"]','sanearResultados: só v/e/d, últimos 5');
  t(u.media===7 && u.mediaVazia===null,'media() e lista vazia');

  console.log('\n[2] 7 rodadas de verdade (algumas podem virar ajuste de escalação)');
  page.on('dialog',d=>d.accept());   // avisos de desfalque (alert) não travam o teste
  for(let r=0;r<7;r++){
    await page.evaluate(()=>App.jogarRodada());
    await page.evaluate(()=>App.pularRodada());
    await page.evaluate(()=>App.fecharRodada());
  }
  const st=await page.evaluate(()=>{
    const me=App.teams[App.myTeam];
    const jog=me.players.filter(p=>(p._notas5||[]).length);
    const todos=App.teams.filter(t=>App.indicesDaDivisao(App.divisao).includes(App.teams.indexOf(t)));
    return {rodada:App.rodada, tn:me._notas5, tr:me._forma5,
      maxJog:Math.max(...me.players.map(p=>(p._notas5||[]).length)), nJog:jog.length,
      titular:jog.find(p=>p._notas5.length>=5)?.['_notas5'],
      coerente:jog.every(p=>p._notas5.at(-1)===p._notaRodada || p._notaRodada==null || !App.onzeDe(App.myTeam).includes(p)),
      outrosTimes:todos.filter(t=>(t._forma5||[]).length===5).length, nDiv:todos.length};
  });
  t(st.rodada>=5,'rodadas jogadas: '+st.rodada);
  t(st.tn.length===5 && st.tr.length===5,'meu time: 5 notas e 5 resultados ('+st.tn.join(' · ')+' | '+st.tr.join('')+')');
  t(st.tn.every(n=>n>=0&&n<=10),'notas do time dentro de 0–10');
  t(st.maxJog===5,'nenhum jogador passa de 5 notas');
  t(!!st.titular,'titular tem forma completa ('+(st.titular||[]).join(' · ')+')');
  t(st.outrosTimes===st.nDiv,'todos os times da divisão têm forma (V/E/D) — '+st.outrosTimes+'/'+st.nDiv);

  console.log('\n[3] save v9 (roundtrip) e migração do v8');
  const rt=await page.evaluate(()=>{
    const snap=JSON.parse(JSON.stringify(App.snapshot()));
    const me=App.teams[App.myTeam];
    const antes={tn:me._notas5.slice(), tr:me._forma5.slice(), p:me.players.map(p=>(p._notas5||[]).join(','))};
    // zera em memória e reaplica o snapshot
    App.teams.forEach(t=>{ delete t._notas5; delete t._forma5; t.players.forEach(p=>delete p._notas5); });
    const v=App.validateSnapshot(snap); App.aplicarSnapshot(snap);
    const me2=App.teams[App.myTeam];
    const depois={tn:me2._notas5, tr:me2._forma5, p:me2.players.map(p=>(p._notas5||[]).join(','))};
    // v8: sem os campos novos
    const v8=JSON.parse(JSON.stringify(snap)); v8.schemaVersion=8; delete v8.formaTimes;
    Object.values(v8.jogadoresById).forEach(j=>delete j.notas5);
    const v8ok=App.validateSnapshot(v8); App.aplicarSnapshot(v8);
    const me3=App.teams[App.myTeam];
    const v8vazio=me3._notas5.length===0 && me3._forma5.length===0 && me3.players.every(p=>p._notas5.length===0);
    // save adulterado: notas absurdas
    const ruim=JSON.parse(JSON.stringify(snap)); ruim.formaTimes[App.myTeam]={n:[99,'<b>',-5,7,7,7,7,7],r:['v','hack']};
    App.aplicarSnapshot(ruim); const me4=App.teams[App.myTeam];
    return {schema:snap.schemaVersion, valida:v.ok, iguais:JSON.stringify(antes)===JSON.stringify(depois),
      v8ok:v8ok.ok, v8vazio,
      ruim:{n:me4._notas5, r:me4._forma5}};
  });
  t(rt.schema===9,'snapshot sai com schemaVersion 9');
  t(rt.valida && rt.iguais,'roundtrip preserva forma de jogadores e do time');
  t(rt.v8ok && rt.v8vazio,'save v8 carrega com forma vazia (migração)');
  t(rt.ruim.n.length===5 && rt.ruim.n.every(n=>n>=0&&n<=10) && JSON.stringify(rt.ruim.r)==='["v"]','save adulterado é saneado');
  t(erros.filter(e=>!/ERR_FAILED/.test(e)).length===0,'sem erros de JS');
  await browser.close();
  console.log(`\n=== ${ok} ok, ${falhas} falhas ===`);
  process.exit(falhas?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
