// harness_coletiva — coletiva pós-jogo (§6.1 item 1): 3 perguntas depois do jogo,
// respostas com efeito visível em moral/cargo, pulável, desliga nas Configurações.
// Uso: node harness_coletiva.js [--shots DIR]
const path=require('path'),fs=require('fs');
const {abrir,chromium}=require('./ui_test/abrir.js');
const SHOTS=process.argv.includes('--shots')?process.argv[process.argv.indexOf('--shots')+1]:null;
if(SHOTS) fs.mkdirSync(SHOTS,{recursive:true});
let ok=0,falhas=0; const t=(c,m)=>{ if(c){ok++;console.log('  ✅',m);} else {falhas++;console.log('  ❌',m);} };
const titulo=page=>page.$eval('#flkModal .flkm-title',e=>e.textContent).catch(()=>null);
// responde os avisos que vêm antes na fila (ex.: desfalques) até chegar na coletiva
const ateColetiva=async page=>{ for(let i=0;i<4;i++){ const tt=await titulo(page); if(!tt||tt==='🎤 Coletiva pós-jogo') return tt; await page.click('#flkModal .flkm-foot .btn:last-child'); } return titulo(page); };

(async()=>{
  const browser=await chromium.launch();
  const {page,erros}=await abrir(browser);
  page.on('dialog',d=>d.accept());
  await page.evaluate(()=>localStorage.setItem('prancheta_tutorial_v1','feito'));
  await page.click('#btnJogarAgora'); await page.waitForSelector('.clube-lin',{timeout:15000});
  await page.click('.clube-lin'); await page.waitForSelector('.fm-campo');
  const jogar=async()=>{ await page.evaluate(()=>{ App.escalarMelhor(); App.jogarRodada(); }); await page.evaluate(()=>App.pularRodada()); await page.click('#btnFechar'); };

  console.log('\n[1] conteúdo (500 contextos sorteados)');
  const c=await page.evaluate(()=>{
    let problemas=[], dominada=0, total=0;
    const nomes={craque:{nome:'Fulano da Silva',numero:9,nota:8.1},insatisfeito:{nome:'Beltrano Souza',numero:14}};
    for(let k=0;k<500;k++){
      const res=['v','e','d'][k%3], meus=res==='v'?2+(k%3):res==='e'?1:0, deles=res==='d'?1+(k%4):res==='e'?1:0;
      const ctx={meus,deles,resultado:res,adv:'Rival FC',posicao:1+(k%10),zonaBoa:k%2===0,pressao:k%5===0,meta:'Subir',
        craque:k%3?nomes.craque:null, insatisfeito:k%4===0?nomes.insatisfeito:null};
      const col=Coletiva.montar(ctx);
      if(col.perguntas.length<2||col.perguntas.length>3) problemas.push('qtd '+col.perguntas.length);
      col.perguntas.forEach(q=>{
        if(!q.txt||/undefined|NaN/.test(q.txt)) problemas.push('texto: '+q.txt);
        if(q.respostas.length<2) problemas.push('poucas respostas');
        q.respostas.forEach(r=>{ if(/undefined|NaN/.test(r.txt)) problemas.push('resp: '+r.txt); });
        // nenhuma resposta pode dominar as outras (melhor em moral E cargo ao mesmo tempo que todas)
        const val=r=>[(r.moral||0)+(r.moralAlvo||0)/5, r.cargo||0];
        q.respostas.forEach(r=>{ total++; const [m1,c1]=val(r);
          if(q.respostas.every(o=>o===r || (m1>=val(o)[0] && c1>=val(o)[1] && (m1>val(o)[0]||c1>val(o)[1])))) dominada++; });
        // cargo por resposta limitado
        q.respostas.forEach(r=>{ if(Math.abs(r.cargo||0)>2) problemas.push('cargo alto'); });
      });
    }
    return {problemas:problemas.slice(0,3), n:problemas.length, dominada, total};
  });
  t(c.n===0,'textos e respostas completos, 2–3 perguntas'+(c.n?' — '+c.problemas.join(' | '):''));
  t(c.dominada===0,`nenhuma resposta domina as outras (troca real moral × cargo) — ${c.dominada}/${c.total}`);

  console.log('\n[2] depois do jogo');
  await jogar();
  t((await ateColetiva(page))==='🎤 Coletiva pós-jogo','abre a coletiva depois da partida');
  const q1=await page.$eval('#flkModal',e=>e.innerText);
  t(/Pergunta 1 de/i.test(q1) && /moral|cargo|sem efeito/i.test(q1),'mostra a pergunta e o efeito de cada resposta antes de escolher');
  if(SHOTS) await page.screenshot({path:path.join(SHOTS,'coletiva.png')});
  // pega a primeira resposta e confere o efeito aplicado
  const antes=await page.evaluate(()=>({conf:App.confianca, moral:App.teams[App.myTeam].players.map(p=>Rating.moralDe(p))}));
  const sel=await page.$eval('#flkModal [data-resp="0"]',e=>e.innerText);
  await page.click('#flkModal [data-resp="0"]');
  const depois=await page.evaluate(()=>({conf:App.confianca, moral:App.teams[App.myTeam].players.map(p=>Rating.moralDe(p))}));
  const mCargo=/cargo ([+−])(\d+)/.exec(sel), mMoral=/moral ([+−])(\d+)/.exec(sel);
  const esperaC=mCargo?(mCargo[1]==='+'?1:-1)*+mCargo[2]:0, esperaM=mMoral?(mMoral[1]==='+'?1:-1)*+mMoral[2]:0;
  const dC=depois.conf-antes.conf, dM=depois.moral.map((m,i)=>m-antes.moral[i]);
  t(Math.abs(dC-esperaC)<0.01 || (antes.conf+esperaC>100||antes.conf+esperaC<0),`cargo mudou exatamente o que o selo dizia (${esperaC})`);
  t(!esperaM || dM.filter(x=>Math.abs(x-esperaM)<0.051).length>=dM.length-2,`moral do elenco mudou ${esperaM>=0?'+':''}${esperaM}`);
  t(/Pergunta 2 de/i.test(await page.$eval('#flkModal',e=>e.innerText)),'avança pra pergunta 2');
  let k=0; while(k<3 && await page.$('#flkModal [data-resp]')){ await page.click('#flkModal [data-resp="1"]'); k++; }
  t(!(await page.$('#flkModal')) || (await titulo(page))!=='🎤 Coletiva pós-jogo','termina depois da última pergunta');
  t(await page.$eval('#tutToast',e=>/Coletiva encerrada/.test(e.textContent)).catch(()=>false),'resumo do efeito no final');

  console.log('\n[3] pular e desligar');
  for(let i=0;i<5 && await page.$('#flkModal');i++) await page.click('#flkModal .flkm-foot .btn:last-child');
  await jogar(); await ateColetiva(page);
  const conf0=await page.evaluate(()=>App.confianca);
  await page.click('#flkModal .flkm-foot .btn:has-text("Pular")');
  t(!(await page.$('#flkModal')) || (await titulo(page))!=='🎤 Coletiva pós-jogo','"Pular a coletiva" fecha tudo');
  t((await page.evaluate(()=>App.confianca))===conf0,'pular não mexe no cargo');
  for(let i=0;i<5 && await page.$('#flkModal');i++) await page.click('#flkModal .flkm-foot .btn:last-child');
  await page.click('#btnConfig'); await page.click('[data-cfg-col="0"]'); await page.click('#flkModal [data-flkm-x]');
  await jogar(); await ateColetiva(page);
  t((await titulo(page))!=='🎤 Coletiva pós-jogo','desligada nas Configurações: não aparece');
  t(await page.evaluate(()=>{ const s=App.snapshot(); return s.opcoes && s.opcoes.coletiva===false; }),'preferência vai pro save');
  t(erros.filter(e=>!/ERR_FAILED/.test(e)).length===0,'sem erros de JS');
  await browser.close();
  console.log(`\n=== ${ok} ok, ${falhas} falhas ===`);
  process.exit(falhas?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
