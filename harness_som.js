// harness_som — D4 áudio: WebAudio sintetizado (apitos, gol, gol sofrido, cartão, caixa,
// título), murmúrio de torcida na partida, música no menu, volumes nas Configurações.
// Uso: node harness_som.js [--shots DIR]
const path=require('path'),fs=require('fs');
const {abrir,chromium}=require('./ui_test/abrir.js');
const SHOTS=process.argv.includes('--shots')?process.argv[process.argv.indexOf('--shots')+1]:null;
if(SHOTS) fs.mkdirSync(SHOTS,{recursive:true});
let ok=0,falhas=0; const t=(c,m)=>{ if(c){ok++;console.log('  ✅',m);} else {falhas++;console.log('  ❌',m);} };

(async()=>{
  const browser=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
  const {page,erros}=await abrir(browser);
  page.on('dialog',d=>d.accept());
  await page.evaluate(()=>{ localStorage.setItem('prancheta_tutorial_v1','feito'); localStorage.removeItem('prancheta_audio_v1'); });

  console.log('\n[1] menu e música');
  const m0=await page.evaluate(()=>({ctx:!!Som.ctx, quer:Som._querMusica, cfg:Som.cfg()}));
  t(!m0.ctx && m0.quer,'antes do 1º toque: sem AudioContext, música só "pedida"');
  t(m0.cfg.efeitos===0.7 && m0.cfg.musica===0.4,'volumes padrão (efeitos 70%, música 40%)');
  await page.mouse.click(5,5);
  await page.waitForTimeout(300);
  const m1=await page.evaluate(()=>({st:Som.ctx&&Som.ctx.state, mus:!!Som._musica}));
  t(m1.st==='running','1º toque cria o AudioContext');
  t(m1.mus,'música do menu começa depois do toque');
  await page.click('#btnJogarAgora'); await page.waitForSelector('.clube-lin',{timeout:15000});
  t(await page.evaluate(()=>!!Som._musica),'música segue na escolha de clube');
  await page.click('.clube-lin'); await page.waitForSelector('.fm-campo');
  t(await page.evaluate(()=>!Som._musica),'música para ao entrar no jogo');
  await page.evaluate(()=>{ const o=App.garantirOpcoes(); o.coletiva=false; o.recado=false; o.velocidade=3; if(App.estadual) App.estadual.status='pulado'; });

  console.log('\n[2] catálogo sintetiza sem erro');
  const cat=await page.evaluate(()=>{ const r={}; Object.keys(Som.SONS).forEach(k=>{ try{ r[k]=Som.tocar(k); }catch(e){ r[k]='ERRO '+e.message; } }); return r; });
  t(Object.values(cat).every(v=>v===true),'todos os sons tocam: '+Object.keys(cat).join(', '));

  console.log('\n[3] partida');
  await page.evaluate(()=>{ Som._log=[]; App.escalarMelhor(); App.jogarRodada(); });
  const p1=await page.evaluate(()=>({log:[...Som._log], amb:!!Som._amb}));
  t(p1.log[0]==='apito' && p1.amb,'apito inicial + murmúrio da torcida');
  const g=await page.evaluate(()=>{
    const L=App.liveState; clearInterval(L.timer); Som._log=[];
    const bk=Motor.chanceGol; Motor.chanceGol=()=>1; L.min++; App.simularMinuto(); Motor.chanceGol=bk;
    return [...Som._log];
  });
  t(g.includes('gol') && g.includes('golContra'),'gol meu = explosão; gol sofrido = lamento ('+g.join(',')+')');
  t(g.filter(x=>x==='gol'||x==='golContra').length===2,'só o MEU jogo faz som (1 gol de cada lado, não os ~'+(await page.evaluate(()=>App.liveState.sims.length))+' jogos)');
  const pul=await page.evaluate(()=>{ Som._log=[]; App.pularRodada(); return {log:[...Som._log], amb:!!Som._amb}; });
  t(!pul.log.includes('gol') && !pul.log.includes('golContra') && pul.log.includes('apitoFinal'),'"pular" não dispara rajada de gols; só o apito final');
  t(!pul.amb,'torcida silencia no fim');
  await page.evaluate(()=>{ App.liveState={done:true}; App.fecharRodada(); });

  console.log('\n[4] Configurações');
  await page.evaluate(()=>{ document.getElementById('flkModal')?.remove(); App._filaModais=[]; App.abrirConfig(); });
  t(/Som/.test(await page.textContent('#flkModal')) && (await page.$$('#flkModal [data-cfg-som]')).length===8,'seção 🔊 Som com efeitos e música (4 níveis cada)');
  if(SHOTS) await page.screenshot({path:path.join(SHOTS,'config_som.png')});
  await page.click('#flkModal [data-cfg-som="efeitos"][data-v="0"]');
  const mudo=await page.evaluate(()=>{ Som._log=[]; const r=Som.tocar('gol'); return {r, log:Som._log.length, ls:JSON.parse(localStorage.getItem('prancheta_audio_v1')).efeitos, on:document.querySelector('#flkModal [data-cfg-som="efeitos"].on').dataset.v}; });
  t(!mudo.r && mudo.log===0 && mudo.ls===0 && mudo.on==='0','efeitos "Mudo": nada toca, fica salvo e marcado');
  await page.click('#flkModal [data-cfg-som="musica"][data-v="0"]');
  const mm=await page.evaluate(()=>{ Menu.mostrar(); const a=!!Som._musica; Som.definir('musica',1); const b=!!Som._musica; Menu.esconder(); return {a,b}; });
  t(!mm.a && mm.b,'música "Mudo" não toca no menu; subir o volume liga na hora');
  const rel=await page.evaluate(()=>{ Som._cfg=null; return Som.cfg(); });
  t(rel.efeitos===0 && rel.musica===1,'volumes sobrevivem a recarregar (localStorage do aparelho)');
  const lixo=await page.evaluate(()=>{ localStorage.setItem('prancheta_audio_v1','{"efeitos":"x","musica":9}'); Som._cfg=null; return Som.cfg(); });
  t(lixo.efeitos===0.7 && lixo.musica===1,'valor inválido volta pro padrão / limita em 100%');
  t(erros.filter(e=>!/ERR_FAILED/.test(e)).length===0,'sem erros de JS'+(erros.length?': '+erros.join(' | '):''));
  await browser.close();
  console.log(`\n=== ${ok} ok, ${falhas} falhas ===`);
  process.exit(falhas?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
