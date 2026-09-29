// harness_mercado — regras de negociação de compra (avaliarOfertaCompra).
// Garante que a IA é coerente: oferecer mais nunca dá resultado pior, a
// contraproposta é sempre MAIOR que a oferta e nunca passa do preço pedido.
// Caso reportado (29/09/2026): ofereceu R$ 9,0 M, clube recusou e pediu R$ 8,8 M.
// Uso: node harness_mercado.js
const {abrir,chromium}=require('./ui_test/abrir.js');
let ok=0,falhas=0; const t=(c,m)=>{ if(c){ok++;console.log('  ✅',m);} else {falhas++;console.log('  ❌',m);} };

(async()=>{
  const browser=await chromium.launch();
  const {page,erros}=await abrir(browser);
  await page.evaluate(()=>localStorage.setItem('prancheta_tutorial_v1','feito'));
  await page.click('#btnJogarAgora'); await page.waitForSelector('.clube-lin',{timeout:15000});
  await page.click('.clube-lin'); await page.waitForSelector('.fm-campo');

  const r=await page.evaluate(()=>{
    const out={viol:[], casos:0, caso:null};
    const RANK={recusa:0, contra:1, aceita:2};
    // 150 jogadores de outros clubes, idades variadas; ofertas de 30% a 150% do valor, passo de 0,5%
    const alvos=[]; App.teams.forEach((t,ti)=>{ if(ti!==App.myTeam) t.players.forEach(p=>alvos.push(p)); });
    for(let k=0;k<150;k++){
      const p=alvos[(k*37)%alvos.length], vm=App.valorMercadoReais(p);
      let ant=null; App._contras={};
      for(let f=0.30; f<=1.50; f+=0.005){
        const oferta=Math.round(vm*f/1e4)*1e4; out.casos++;
        const d=App.avaliarOfertaCompra(p.pid, oferta);
        if(d.decisao==='contra'){
          if(!(d.contra>oferta)) out.viol.push(`contra ${d.contra} <= oferta ${oferta} (${p.nome})`);
          // oferecer exatamente o que o clube pediu tem que fechar
          const d2=App.avaliarOfertaCompra(p.pid, d.contra);
          if(d2.decisao!=='aceita') out.viol.push(`contra ${d.contra} não é aceita quando oferecida (${p.nome})`);
          if(!/\d/.test(d.fala)) out.viol.push('fala sem valor');
        }
        if(ant && RANK[d.decisao]<RANK[ant.decisao]) out.viol.push(`oferta maior ${oferta} piorou: ${ant.decisao}→${d.decisao} (${p.nome})`);
        if(ant && ant.decisao==='contra' && d.decisao==='contra' && d.contra<ant.contra) out.viol.push(`contra caiu com oferta maior (${p.nome})`);
        ant=d;
      }
    }
    // o caso reportado: alvo ≈ 8,6 M, oferta de 9,0 M (sem memória de contrapropostas da varredura)
    App._contras={};
    const p=alvos[0]; const orig=App.valorMercadoReais;
    App.valorMercadoReais=()=>8.6e6/(p.idade<=21?1.25:p.idade<=26?1.1:0.95);
    out.caso=App.avaliarOfertaCompra(p.pid, 9e6);
    out.casoAbaixo=App.avaliarOfertaCompra(p.pid, 8.0e6);
    App.valorMercadoReais=orig;
    return out;
  });
  console.log('\n[1] coerência em '+r.casos+' ofertas');
  t(r.viol.length===0,'nenhuma incoerência'+(r.viol.length?' — '+r.viol.slice(0,3).join(' | '):''));
  console.log('\n[2] caso reportado');
  t(r.caso.decisao==='aceita','preço ~R$ 8,6 M: oferta de R$ 9,0 M é aceita (antes: contraproposta de R$ 8,8 M)');
  t(r.casoAbaixo.decisao==='contra' && r.casoAbaixo.contra>8e6 && r.casoAbaixo.contra<=8.6e6,
    `oferta de R$ 8,0 M: contraproposta entre a oferta e o preço (${(r.casoAbaixo.contra/1e6).toFixed(1)} M)`);

  console.log('\n[3] pela tela');
  const pid=await page.evaluate(()=>{ const t=App.teams[App.myTeam]; t.saldo=50e6;
    const ti=App.teams.findIndex((x,i)=>i!==App.myTeam); const p=App.teams[ti].players[0]; return p.pid; });
  const alvo=await page.evaluate(pid=>{ const ti=App.timeDoJogador(pid), p=App.teams[ti].players.find(x=>x.pid===pid);
    return App.valorMercadoReais(p)*(p.idade<=21?1.25:p.idade<=26?1.1:0.95); },pid);
  await page.evaluate(pid=>App.negociarCompraUI(pid),pid);
  await page.fill('#flkm_oferta', String(Math.ceil(alvo*1.02/1e5)/10));   // 2% acima do preço
  await page.click('#flkModal .flkm-foot .btn:has-text("Enviar proposta")');
  const e2=await page.$eval('#flkModal .flkm-title',e=>e.textContent);
  t(/Etapa 2 de 3/i.test(e2),'oferta 2% acima do preço: taxa aceita na hora (vai pro salário)');
  await page.fill('#flkm_sal', String(await page.evaluate(()=>App._negAtual.salReal)));
  await page.click('#flkModal .flkm-foot .btn:has-text("Enviar termos")');
  await page.click('#flkModal .flkm-foot .btn:has-text("Aceitar e fechar")');
  const tit=await page.$eval('#flkModal .flkm-title',e=>e.textContent);
  const meu=await page.evaluate(pid=>App.timeDoJogador(pid)===App.myTeam,pid);
  t(tit==='✅ Contratado!' && meu,'fecha nas 3 etapas e o jogador vem pro seu time');
  await page.click('#flkModal .flkm-foot .btn');

  console.log('\n[4] filtros do mercado');
  const f=await page.evaluate(()=>{
    const t=App.teams[App.myTeam]; t.saldo=3e6; App.mercadoFiltro=null; App.renderMercado();
    const linhas=()=>[...document.querySelectorAll('#tab-mercado [data-negociar]')].map(b=>{ const pid=+b.dataset.negociar, ti=App.timeDoJogador(pid);
      const p=App.teams[ti].players.find(x=>x.pid===pid); return {preco:App.precoPedido(p), setor:p.setorNat, div:App.teams[ti].divisao, idade:p.idade}; });
    const set=(k,v)=>{ const sel=document.querySelector(`#tab-mercado [data-mf="${k}"]`); sel.value=v; sel.dispatchEvent(new Event('change')); };
    const r={};
    r.cabe=linhas(); set('caixa','metade'); r.metade=linhas();
    set('caixa',''); set('setor','DEF'); set('div','B'); r.defB=linhas();
    set('setor',''); set('div',''); set('idade','jovem'); set('ord','barato'); r.jovBarato=linhas();
    t.saldo=1; set('idade',''); set('caixa','cabe'); r.vazio={n:linhas().length, msg:/Nenhum jogador/.test(document.getElementById('tab-mercado').innerText)};
    return r;
  });
  t(f.cabe.length>0 && f.cabe.every(x=>x.preco<=3e6),`padrão "cabe no caixa": ${f.cabe.length} jogadores, todos com preço pedido ≤ caixa`);
  t(f.metade.length>0 && f.metade.every(x=>x.preco<=1.5e6),'"até metade do caixa" respeita a metade');
  t(f.defB.length>0 && f.defB.every(x=>x.setor==='DEF'&&x.div==='B'),'setor + série filtram juntos');
  t(f.jovBarato.every(x=>x.idade<=23) && f.jovBarato.every((x,k,a)=>!k||a[k-1].preco<=x.preco),'idade até 23 + ordenar pelo mais barato');
  t(f.vazio.n===0 && f.vazio.msg,'sem resultado: mensagem explicando');
  t(erros.filter(e=>!/ERR_FAILED/.test(e)).length===0,'sem erros de JS');
  await browser.close();
  console.log(`\n=== ${ok} ok, ${falhas} falhas ===`);
  process.exit(falhas?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
