// harness_itens_carreira — save v13:
//  [1] campo reservado pra cosméticos (itensUsuario): vazio por padrão, volta
//      idêntico pelo save, saneado contra lixo, save ≤ v12 carrega vazio;
//  [2] 2ª carreira na mesma sessão (Menu principal → slot vazio) NÃO herda nada
//      da 1ª (temporada, títulos/acessos do ranking, histórico, leilões, extrato…),
//      mas as opções do jogador ficam.
// Uso: node harness_itens_carreira.js
const {abrir,chromium}=require('./ui_test/abrir.js');
let ok=0,falhas=0; const t=(c,m)=>{ if(c){ok++;console.log('  ✅',m);} else {falhas++;console.log('  ❌',m);} };

(async()=>{
  const browser=await chromium.launch();
  const {page,erros}=await abrir(browser);
  page.on('dialog',d=>d.accept());
  await page.evaluate(()=>localStorage.setItem('prancheta_tutorial_v1','feito'));
  await page.click('#btnJogarAgora'); await page.waitForSelector('.clube-lin',{timeout:15000});
  await page.click('.clube-lin'); await page.waitForSelector('.fm-campo');

  console.log('\n[1] campo reservado de cosméticos');
  const r1=await page.evaluate(()=>{
    const snap=JSON.parse(JSON.stringify(App.snapshot()));
    const vazio=JSON.stringify(snap.itensUsuario)===JSON.stringify({v:1,itens:[],equipados:{}});
    // com itens: volta idêntico
    App.itensUsuario={v:1, itens:[{id:'escudo_leao',tipo:'escudo',origem:'compra',em:'2026-10-05'},{id:'tema_noite',tipo:'tema',origem:'jogo',em:''}], equipados:{escudo:'escudo_leao'}};
    const s2=JSON.parse(JSON.stringify(App.snapshot())); const ida=JSON.stringify(App.itensUsuario);
    App.itensUsuario=null; App.aplicarSnapshot(s2);
    const volta=JSON.stringify(App.itensUsuario)===ida;
    // lixo vindo do save
    const sujo=App.sanearItensUsuario({itens:[{id:'<script>x',tipo:'escudo'},{id:'ok',tipo:'nave'},{id:'a',tipo:'kit',origem:'hack'},{id:'a',tipo:'kit'},null,...Array(300).fill({id:'z',tipo:'tema'})], equipados:{kit:'a',escudo:'naoexiste',nave:'ok'}});
    // save antigo (v12, sem o campo)
    const v12=JSON.parse(JSON.stringify(s2)); v12.schemaVersion=12; delete v12.itensUsuario;
    App.itensUsuario={v:1,itens:[{id:'x',tipo:'kit'}],equipados:{}}; const r12=App.aplicarSnapshot(v12);
    return {vazio, schema:s2.schemaVersion, volta, sujo, ok12:r12.ok, vazio12:App.itensUsuario.itens.length===0};
  });
  t(r1.schema===13,'snapshot sai com schemaVersion 13');
  t(r1.vazio,'carreira nova: itensUsuario vazio ({v:1, itens:[], equipados:{}})');
  t(r1.volta,'itens e equipados voltam idênticos pelo save');
  const ids=r1.sujo.itens.map(i=>i.id+':'+i.tipo+':'+i.origem);
  t(ids.length===3 && ids.includes('scriptx:escudo:jogo') && ids.includes('a:kit:jogo') && ids.includes('z:tema:jogo'),`save sujo é saneado: tipos desconhecidos fora, ids limpos, sem duplicata, origem só compra|jogo (${ids.join(', ')})`);
  t(JSON.stringify(r1.sujo.equipados)==='{"kit":"a"}','só fica equipado o que existe na lista e tem tipo conhecido');
  t(r1.ok12 && r1.vazio12,'save v12 (sem o campo) carrega e chega com a lista vazia');

  console.log('\n[2] 2ª carreira na mesma sessão');
  await page.evaluate(()=>{
    const o=App.garantirOpcoes(); o.velocidade=3;
    App.carreira.titulos=3; App.carreira.acessos=2; App.temporada=5; App.histClube=[{temporada:1}];
    App.leiloes=[{pid:1,lances:[{valor:1}],status:'aberto'}]; App.ofertasRecebidas=[{pid:1}]; App.extrato=[{d:'x',v:1}];
    App.emprestimo={saldo:1}; App.histConf=[{t:1,r:1,d:-5,m:'x'}]; App.ultimato={rodadaLimite:9}; App._reuniaoFeita=true;
    App.itensUsuario={v:1,itens:[{id:'x',tipo:'kit'}],equipados:{kit:'x'}};
  });
  await page.click('button:visible:has-text("Menu principal"), .sb-item:visible:has-text("Menu principal")');
  for(let k=0;k<3 && await page.$('#flkModal');k++){ await page.click('#flkModal .flkm-foot .btn:last-child'); await page.waitForTimeout(500); }
  await page.waitForSelector('[data-novo]:visible',{timeout:15000});
  await page.click('[data-novo]:visible'); await page.waitForSelector('.clube-lin',{timeout:15000});
  await page.click('.clube-lin'); await page.waitForSelector('.fm-campo');
  const r2=await page.evaluate(()=>({temporada:App.temporada, rodada:App.rodada, tit:App.carreira.titulos, ace:App.carreira.acessos, hist:App.histClube.length,
    leiloes:App.leiloes.length, ofertas:App.ofertasRecebidas.length, extrato:App.extrato.filter(e=>/x/.test(e.d||'')).length, emp:App.emprestimo, histConf:App.histConf.length,
    ultimato:App.ultimato, reuniao:App._reuniaoFeita, conf:App.confianca, itens:App.garantirItensUsuario().itens.length, vel:App.garantirOpcoes().velocidade,
    score:App.scoreTreinador?App.scoreTreinador():null}));
  t(r2.temporada===1 && r2.rodada===0,`começa na temporada 1, rodada 0 (veio ${r2.temporada}/${r2.rodada})`);
  t(r2.tit===0 && r2.ace===0,`títulos/acessos zerados — score do ranking não herda (${r2.tit}/${r2.ace})`);
  t(r2.hist===0 && r2.leiloes===0 && r2.ofertas===0 && r2.extrato===0 && !r2.emp,'histórico, leilões, propostas, extrato e empréstimo zerados');
  t(r2.histConf===0 && !r2.ultimato && !r2.reuniao && r2.conf===60,'diretoria do zero: confiança 60, sem ultimato nem reunião');
  t(r2.itens===0,'cosméticos equipados da carreira anterior não vêm junto');
  t(r2.vel===3,'opções do jogador (velocidade) continuam');
  t(erros.filter(e=>!/ERR_FAILED/.test(e)).length===0,'sem erros de JS');
  await browser.close();
  console.log(`\n=== ${ok} ok, ${falhas} falhas ===`);
  process.exit(falhas?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
