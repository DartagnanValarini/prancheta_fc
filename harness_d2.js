// harness_d2 — partida imersiva: painel "Seu jogo" (posse, finalizações, no alvo,
// escanteios), narração por atributo, alerta de fadiga. Não muda o resultado.
// Uso: node harness_d2.js [--shots DIR]
const path=require('path'),fs=require('fs');
const {abrir,chromium}=require('./ui_test/abrir.js');
const SHOTS=process.argv.includes('--shots')?process.argv[process.argv.indexOf('--shots')+1]:null;
if(SHOTS) fs.mkdirSync(SHOTS,{recursive:true});
let ok=0,falhas=0; const t=(c,m)=>{ if(c){ok++;console.log('  ✅',m);} else {falhas++;console.log('  ❌',m);} };

(async()=>{
  const browser=await chromium.launch();
  const {page,erros}=await abrir(browser);
  page.on('dialog',d=>d.accept());
  await page.evaluate(()=>localStorage.setItem('catimba_tutorial_v1','feito'));
  await page.click('#btnJogarAgora'); await page.waitForSelector('.clube-lin',{timeout:15000});
  await page.click('.clube-lin'); await page.waitForSelector('.fm-campo');
  await page.evaluate(()=>{ const o=App.garantirOpcoes(); o.coletiva=false; o.recado=false; o.velocidade=3; if(App.estadual) App.estadual.status='pulado'; });

  console.log('\n[1] painel ao vivo');
  await page.evaluate(()=>{ App.escalarMelhor(); App.jogarRodada(); });
  t(await page.$('#meuJogo .mj-placar')!==null,'painel "Seu jogo" aparece na Arena ao vivo');
  await page.waitForFunction(()=>App.liveState && App.liveState.min>=20,null,{timeout:30000});
  const vivo=await page.evaluate(()=>{ const s=App.meuSim(); return {posse:s.est.posse[0]+s.est.posse[1], min:App.liveState.min, narr:s.narr.length, linhas:document.querySelectorAll('#meuJogo .nr').length, placar:document.querySelector('#meuJogo .mj-placar').innerText.replace(/\s/g,''), real:`${s.gc}×${s.gf}`}; });
  t(Math.abs(vivo.posse-vivo.min)<=1,`posse contada minuto a minuto (${vivo.posse} de ${vivo.min}')`);
  t(vivo.linhas>=1 && vivo.linhas<=6,`narração mostra os últimos lances (${vivo.linhas} linhas, ${vivo.narr} no total)`);
  t(vivo.placar===vivo.real,'placar do painel = placar do motor');
  // fadiga
  const fad=await page.evaluate(()=>{ const s=App.meuSim(), campo=s.h===App.myTeam?s.campoH:s.campoA; campo[3].energia=31; campo[5].energia=52; App.atualizarMeuJogo();
    return {crit:document.querySelectorAll('#meuJogo .mj-fad .crit').length, baixa:document.querySelectorAll('#meuJogo .mj-fad .baixa').length, btn:!!document.getElementById('mjSub')}; });
  t(fad.crit>=1 && fad.baixa>=1,'fadiga: <40% pisca em vermelho, <60% em amarelo');
  t(fad.btn,'botão "Trocar" quando alguém está no vermelho');
  if(SHOTS) await page.screenshot({path:path.join(SHOTS,'d2_ao_vivo.png'), fullPage:false});
  await page.click('#mjSub');
  t(await page.evaluate(()=>App.liveState.subOpen===true),'"Trocar" pausa pra substituição');
  await page.evaluate(()=>{ document.getElementById('subsOverlay')?.remove(); App.liveState.subOpen=false; App.pularRodada(); });
  const fim=await page.evaluate(()=>{ const s=App.meuSim(); return {narr:s.narr.map(n=>n.txt).join('\n'), gols:s.gc+s.gf, golsNarr:s.narr.filter(n=>n.tipo==='gol').length, est:s.est}; });
  t(fim.golsNarr===fim.gols,`todo gol é narrado (${fim.gols})`);
  t(/Fim de jogo/.test(fim.narr),'narração fecha com o apito final');
  t(fim.est.alvo[0]>=0 && fim.est.fin[0]>=fim.est.alvo[0] && fim.est.fin[1]>=fim.est.alvo[1],'finalizações ≥ no alvo');
  if(SHOTS) await page.screenshot({path:path.join(SHOTS,'d2_fim.png')});
  await page.evaluate(()=>{ App.liveState={done:true}; App.fecharRodada(); document.getElementById('flkModal')?.remove(); App._filaModais=[]; });

  console.log('\n[2] números em 120 jogos');
  const n=await page.evaluate(()=>{
    const r={fin:0, alvo:0, esc:0, gols:0, posseForte:0, jogos:0, alvoGol:true, som:0};
    for(let k=0;k<120;k++){
      // sem encerrarRodada no meio: limpa o estado de jogo que ele limparia (expulsões, cartões, energia)
      App.teams.forEach(t=>t.players.forEach(p=>{ delete p._expulso; p._amarelosJogo=0; p.energia=100; delete p.lesionado; delete p.suspenso; }));
      App.escalarMelhor(); document.getElementById('flkModal')?.remove(); App._filaModais=[];
      App.jogarRodada(); const L=App.liveState; clearInterval(L.timer); L._rapido=true;
      while(L.min<90){ L.min++; App.simularMinuto(); }
      const s=App.meuSim(), e=s.est; r.jogos++;
      r.fin+=e.fin[0]+e.fin[1]; r.alvo+=e.alvo[0]+e.alvo[1]; r.esc+=e.esc[0]+e.esc[1]; r.gols+=s.gc+s.gf;
      if(e.alvo[0]<s.gc || e.alvo[1]<s.gf) r.alvoGol=false;
      const fH=Motor.forcaCampo(s.campoH), fA=Motor.forcaCampo(s.campoA);
      // só conta jogo com diferença real de força (≥5%): entre times parelhos a posse é cara ou coroa
      // (antes de 05/10/2026 a IA jogava desfalcada e quase todo jogo era desigual)
      if(Math.abs(fH-fA)/Math.min(fH,fA)>=0.05){ r.desiguais=(r.desiguais||0)+1; if((fH>fA)===(e.posse[0]>e.posse[1]) || e.posse[0]===e.posse[1]) r.posseForte++; }
      Som.ambiente(false); App.liveState=null;
    }
    return r;
  });
  const pj=x=>(x/n.jogos/2).toFixed(1);
  t(n.fin/n.jogos/2>=8 && n.fin/n.jogos/2<=16,`finalizações por time/jogo: ${pj(n.fin)} (futebol real ~12)`);
  t(n.alvo/n.jogos/2>=3 && n.alvo/n.jogos/2<=7,`no alvo por time/jogo: ${pj(n.alvo)}`);
  t(n.esc/n.jogos/2>=3 && n.esc/n.jogos/2<=7,`escanteios por time/jogo: ${pj(n.esc)}`);
  t(n.alvoGol,'gols sempre contam como chute no alvo');
  t(n.desiguais>=10 && n.posseForte/n.desiguais>=0.6,`time ≥5% mais forte tem mais posse em ${Math.round(n.posseForte/Math.max(1,n.desiguais)*100)}% dos ${n.desiguais} jogos desiguais`);

  console.log('\n[3] tipo do gol pelos atributos');
  const tipos=await page.evaluate(()=>{
    const mk=a=>({nome:'X',ref:{attrs:Object.assign({heading:30,long_shots:30,dribbling:30,pace:30,acceleration:30,finishing:30},a)}});
    const conta=(a,assist)=>{ const c={}; for(let i=0;i<2000;i++){ const k=App.tipoDeGol(mk(a),assist); c[k]=(c[k]||0)+1; } return c; };
    return {cab:conta({heading:95},mk({crossing:90})), fora:conta({long_shots:95}), drb:conta({dribbling:95}), vel:conta({pace:95,acceleration:95})};
  });
  const top=c=>Object.entries(c).sort((a,b)=>b[1]-a[1])[0][0];
  t(top(tipos.cab)==='cabeca','cabeceador + cruzamento → gol de cabeça');
  t(top(tipos.fora)==='fora','chutador de longe → gol de fora da área');
  t(top(tipos.drb)==='drible','driblador → gol de drible');
  t(top(tipos.vel)==='arrancada','velocista → gol de arrancada');
  t(erros.filter(e=>!/ERR_FAILED/.test(e)).length===0,'sem erros de JS'+(erros.length?': '+erros.join(' | '):''));
  await browser.close();
  console.log(`\n=== ${ok} ok, ${falhas} falhas ===`);
  process.exit(falhas?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
