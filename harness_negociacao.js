// harness_negociacao — compra em 3 etapas (§6.1 item 6): taxa com o clube (piso),
// salário com o jogador (mínimo dito ≠ real), fechar (prazo + risco de aposentadoria),
// e o contador (caixa depois / por rodada / fim da temporada) em todas.
// Uso: node harness_negociacao.js [--shots DIR]
const path=require('path'),fs=require('fs');
const {abrir,chromium}=require('./ui_test/abrir.js');
const SHOTS=process.argv.includes('--shots')?process.argv[process.argv.indexOf('--shots')+1]:null;
if(SHOTS) fs.mkdirSync(SHOTS,{recursive:true});
let ok=0,falhas=0; const t=(c,m)=>{ if(c){ok++;console.log('  ✅',m);} else {falhas++;console.log('  ❌',m);} };
const titulo=page=>page.$eval('#flkModal .flkm-title',e=>e.textContent).catch(()=>'');
const clicar=(page,txt)=>page.click(`#flkModal .flkm-foot .btn:has-text("${txt}")`);
const shot=async(page,n)=>{ if(SHOTS){ await page.waitForTimeout(120); await page.screenshot({path:path.join(SHOTS,n+'.png')}); } };

(async()=>{
  const browser=await chromium.launch();
  const {page,erros}=await abrir(browser);
  page.on('dialog',d=>d.accept());
  await page.evaluate(()=>localStorage.setItem('prancheta_tutorial_v1','feito'));
  await page.click('#btnJogarAgora'); await page.waitForSelector('.clube-lin',{timeout:15000});
  await page.click('.clube-lin'); await page.waitForSelector('.fm-campo');

  console.log('\n[1] contador (projeção)');
  const pj=await page.evaluate(()=>{ const a=App.projecaoCaixa(0,0), b=App.projecaoCaixa(-1e6, 30000);
    return {a,b, coer:Math.abs(b.fim-(b.caixaDepois+b.porRodada*b.restantes))<1, folha:b.folhaDepois-a.folhaDepois}; });
  t(pj.coer,'fim da temporada = caixa depois + (por rodada × rodadas restantes)');
  t(pj.b.caixaDepois===pj.a.caixaDepois-1e6 && pj.folha===30000 && pj.b.porRodada<pj.a.porRodada,'taxa sai do caixa; salário sobe a folha e piora o "por rodada"');

  console.log('\n[2] etapa 1 — taxa');
  // um jogador da série B, jovem ou no auge, que cabe no caixa inflado
  const alvo=await page.evaluate(()=>{ App.teams[App.myTeam].saldo=80e6;
    for(const [ti,t] of App.teams.entries()){ if(ti===App.myTeam||t.divisao!=='B') continue;
      const p=t.players.find(p=>p.idade<=29); if(p) return {pid:p.pid, preco:App.precoPedido(p)}; } });
  await page.evaluate(pid=>App.negociarCompraUI(pid),alvo.pid);
  const e1=await page.$eval('#flkModal',e=>e.innerText);
  t(/Etapa 1 de 3/i.test(e1) && /recusa direto/i.test(e1) && /Seu contador/i.test(e1),'mostra etapa, piso explícito e o contador');
  await shot(page,'etapa1');
  await page.fill('#flkm_oferta',String((alvo.preco*0.4/1e6).toFixed(1)));
  await clicar(page,'Enviar proposta');
  t((await titulo(page))==='❌ Proposta recusada','abaixo do piso: recusa direto');
  await clicar(page,'Entendido');
  t(/Etapa 1 de 3/i.test(await titulo(page)),'volta pra etapa 1');
  await page.fill('#flkm_oferta',String((alvo.preco*0.8/1e6).toFixed(1)));
  await clicar(page,'Enviar proposta');
  const contra=await page.$eval('#flkModal',e=>e.innerText);
  t(/Contraproposta/i.test(contra),'no meio do caminho: contraproposta aparece na própria etapa');
  const valorContra=await page.$eval('#flkm_oferta',e=>+e.value);
  await clicar(page,'Enviar proposta');
  t(/Etapa 2 de 3/i.test(await titulo(page)),`oferecer a contraproposta (${valorContra} M) fecha a taxa`);

  console.log('\n[3] etapa 2 — salário');
  // força margem entre o mínimo dito e o real pra exercitar a contraproposta do empresário
  const neg=await page.evaluate(()=>{ const n=App._negAtual; n.salReal=n.salPedido+Math.max(1,Math.round(n.salPedido*0.08)); return {min:n.salPedido, real:n.salReal}; });
  t(neg.real>=neg.min && neg.real<=Math.round(neg.min*1.12)+1,`mínimo dito ${neg.min} mil, real ${neg.real} mil (até +12%)`);
  await shot(page,'etapa2');
  await page.fill('#flkm_sal',String(neg.min-1)); await clicar(page,'Enviar termos');
  t((await titulo(page))==='❌ Abaixo do mínimo','abaixo do mínimo dito: não aceita');
  await clicar(page,'Entendido');
  if(neg.real>neg.min){
    await page.fill('#flkm_sal',String(neg.min)); await clicar(page,'Enviar termos');
    t(/empresário contrapropõe/i.test(await page.$eval('#flkModal',e=>e.innerText)),'no mínimo dito mas abaixo do real: o empresário pede mais');
  } else t(true,'(sorteio sem margem: mínimo = real)');
  await page.fill('#flkm_sal',String(neg.real)); await clicar(page,'Enviar termos');
  t(/Etapa 3 de 3/i.test(await titulo(page)),'salário real aceito → etapa 3');

  console.log('\n[4] etapa 3 — fechar');
  const antes=await page.evaluate(()=>({saldo:App.teams[App.myTeam].saldo, folha:App.folhaDe(App.myTeam)}));
  await page.fill('#flkm_anos','3');
  await shot(page,'etapa3');
  await clicar(page,'Aceitar e fechar');
  const fim=await page.evaluate(pid=>{ const p=App.teams[App.myTeam].players.find(x=>x.pid===pid);
    return p?{sal:p.salario, cont:p.contratoMeses, saldo:App.teams[App.myTeam].saldo, folha:App.folhaDe(App.myTeam)}:null; },alvo.pid);
  t((await titulo(page))==='✅ Contratado!' && fim,'jogador contratado');
  t(fim && fim.sal===neg.real && fim.cont===36,'salário e prazo (3 anos) gravados no jogador');
  t(fim && antes.saldo-fim.saldo===Math.round(valorContra*1e6) && fim.folha-antes.folha===neg.real*1000,'caixa caiu a taxa; folha subiu o salário');
  await clicar(page,'Entendido');

  console.log('\n[5] veterano: risco de aposentadoria');
  const vet=await page.evaluate(()=>{ const ti=App.teams.findIndex((t,i)=>i!==App.myTeam); const p=App.teams[ti].players[0]; p.idade=36;
      return {pid:p.pid, idade:p.idade, ch:App.chanceAposentadoria(p)}; });
  if(vet){
    await page.evaluate(v=>{ App._negAtual=null; App.negociarCompraUI(v.pid); const n=App._negAtual; n.taxa=1; n.sal=n.salReal; App.negEtapa3(n); },vet);
    const txt=await page.$eval('#flkModal',e=>e.innerText);
    t(new RegExp(`${Math.round(vet.ch*100)}% de chance de se aposentar`).test(txt),`veterano de ${vet.idade}: aviso "${Math.round(vet.ch*100)}% de chance de se aposentar"`);
    t(await page.$eval('#flkm_anos',e=>e.value)==='1','prazo sugerido de 1 ano pro veterano');
    await clicar(page,'Cancelar');
  } else t(true,'(sem veterano nos dados)');
  t(erros.filter(e=>!/ERR_FAILED/.test(e)).length===0,'sem erros de JS');
  await browser.close();
  console.log(`\n=== ${ok} ok, ${falhas} falhas ===`);
  process.exit(falhas?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
