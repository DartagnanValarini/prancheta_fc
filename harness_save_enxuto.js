// harness_save_enxuto — D3: save v12 guarda só o que mudou nos atributos (teto,
// overall inicial e growth são recalculados dos atributos do banco no load).
// Confere tamanho, ida e volta exata, compatibilidade com o formato completo (≤ v11),
// garotos da base e save adulterado. Uso: node harness_save_enxuto.js
const {abrir,chromium}=require('./ui_test/abrir.js');
let ok=0,falhas=0; const t=(c,m)=>{ if(c){ok++;console.log('  ✅',m);} else {falhas++;console.log('  ❌',m);} };

(async()=>{
  const browser=await chromium.launch();
  const {page,erros}=await abrir(browser);
  await page.evaluate(()=>localStorage.setItem('catimba_tutorial_v1','feito'));
  await page.click('#btnJogarAgora'); await page.waitForSelector('.clube-lin',{timeout:15000});
  await page.click('.clube-lin'); await page.waitForSelector('.fm-campo');
  const r=await page.evaluate(()=>{
    const o=App.garantirOpcoes(); o.coletiva=false; o.recado=false; if(App.estadual) App.estadual.status='pulado';
    for(let k=0;k<6;k++){ App.escalarMelhor(); App.jogarRodada(); App.pularRodada(); App.fecharRodada(); document.getElementById('flkModal')?.remove(); App._filaModais=[]; }
    // 2 garotos da base no meu time, um deles já evoluído
    const g1=App.gerarJovem(App.myTeam,'ATQ'), g2=App.gerarJovem(App.myTeam,'MEI'); App.teams[App.myTeam].players.push(g1,g2);
    for(let k=0;k<30;k++) Evolucao.aplicarRodada(g1, 'ST', true, true); Evolucao.recalcForca(g1);
    const ret=()=>App.teams.map(t=>t.players.map(p=>[p.pid,p.forca,Object.values(p.attrs).join(','),Object.values(p.attrsDec||{}).map(v=>Math.floor(v)).join(','),
      p._capAttr?Object.values(p._capAttr).join(','):'-',p._growth,p._ovInicialNat,p.valor,p.idade,p.energia,p.gols||0,p.contratoMeses].join(':')).join('/')).join('#');
    const antes=ret();
    const snap=App.snapshot(), json=JSON.stringify(snap);
    // formato completo (como os saves ≤ v11 gravavam)
    const cheio=JSON.parse(json); cheio.schemaVersion=11;
    App.teams.forEach(t=>t.players.forEach(p=>{ const j=cheio.jogadoresById[p.pid];
      Object.assign(j,{attrs:{...p.attrs}, attrsDec:{...p.attrsDec}, mkt:p._mktFactor, ovIni:p._ovInicialNat, growth:p._growth, capAttr:p._capAttr?{...p._capAttr}:null});
      delete j.ev; delete j.an; }));
    cheio.gerados=cheio.gerados.map(g=>{ const p=App.teams[App.myTeam].players.find(x=>x.pid===g.pid)||App.teams.flatMap(x=>x.players).find(x=>x.pid===g.pid); const c={...g, attrs:{...p.attrs}}; delete c.base; return c; });
    const tamCheio=JSON.stringify(cheio).length;
    // 1) ida e volta enxuta
    App.aplicarSnapshot(JSON.parse(json)); const volta=ret();
    // 2) formato antigo carrega igual
    App.aplicarSnapshot(JSON.parse(JSON.stringify(cheio))); const voltaCheio=ret();
    // 3) e regrava enxuto sem perder nada
    const json2=JSON.stringify(App.snapshot()); App.aplicarSnapshot(JSON.parse(json2)); const voltaRegravado=ret();
    // 4) adulterado
    const adult=JSON.parse(json); const pid0=Object.keys(adult.jogadoresById).find(k=>adult.jogadoresById[k].ev);
    adult.jogadoresById[pid0].ev[Object.keys(adult.jogadoresById[pid0].ev)[0]]=250;
    const vAd=App.validateSnapshot(adult);
    const j0=snap.jogadoresById[pid0];
    return {tam:json.length, tamCheio, igual:volta===antes, igualCheio:voltaCheio===antes, igualReg:voltaRegravado===antes,
      adultBarrado:!vAd.ok, semCampos:!('capAttr' in j0) && !('attrsDec' in j0) && !('attrs' in j0),
      gerLean:snap.gerados.every(g=>g.base && !g.attrs), schema:snap.schemaVersion};
  });
  t(r.schema>=12,'save v12+ (schema '+r.schema+')');
  t(r.tam<r.tamCheio/3,`enxuto: ${(r.tam/1e6).toFixed(2)} MB contra ${(r.tamCheio/1e6).toFixed(2)} MB no formato completo`);
  t(r.semCampos,'jogador do banco não grava attrs/attrsDec/capAttr (só o que evoluiu)');
  t(r.gerLean,'garoto da base guarda os atributos de quando subiu + evolução');
  t(r.igual,'ida e volta: força, atributos, teto, growth, valor, idade, energia idênticos');
  t(r.igualCheio,'save antigo (formato completo) carrega igual');
  t(r.igualReg,'save antigo regravado no formato novo continua igual');
  t(r.adultBarrado,'atributo fora de 0..100 no save é barrado');
  t(erros.filter(e=>!/ERR_FAILED/.test(e)).length===0,'sem erros de JS'+(erros.length?': '+erros.slice(0,3).join(' | '):''));
  await browser.close();
  console.log(`\n=== ${ok} ok, ${falhas} falhas ===`);
  process.exit(falhas?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
