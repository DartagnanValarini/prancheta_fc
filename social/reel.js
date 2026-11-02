// Grava um Reels vertical (1080x1920) com gameplay real do Catimba FC! no layout de celular.
// Uso: node social/reel.js <pasta-saida> <roteiro.json>   (CHROME=/caminho/do/chrome opcional)
// roteiro.json: { "cenas": { "clubes": "texto", "presidente": "texto", "partida": "texto", "fim": "texto" },
//                 "final": { "titulo": "texto", "sub": "texto", "cta": "texto" },
//                 "segPartida": 30 (máx. gravando), "durPartida": 10 (segundos da partida no vídeo final) }
// Saída: <pasta>/frames/*.jpg + <pasta>/frames.txt (concat do ffmpeg com as durações reais).
// Depois: ffmpeg -f concat -safe 0 -i frames.txt -vf "fps=30,format=yuv420p" -c:v libx264 -preset veryfast -crf 20 reel.mp4
const path=require('path'),fs=require('fs');
let chromium; try{({chromium}=require('playwright'))}catch(e){({chromium}=require(require('child_process').execSync('npm root -g').toString().trim()+'/playwright'))}
const REPO=path.join(__dirname,'..'), F=path.join(__dirname,'fonts');
const OUT=path.resolve(process.argv[2]); const R=JSON.parse(fs.readFileSync(process.argv[3],'utf8'));
const FR=path.join(OUT,'frames'); fs.rmSync(FR,{recursive:true,force:true}); fs.mkdirSync(FR,{recursive:true});
const fontcss=`@font-face{font-family:'Bungee';src:url(https://fonts.local/bungee.woff2)}
@font-face{font-family:'Space Mono';font-weight:400;src:url(https://fonts.local/spacemono-400.woff2)}
@font-face{font-family:'Space Mono';font-weight:700;src:url(https://fonts.local/spacemono-700.woff2)}`;
// faixa de texto por cima do jogo (zona segura do Reels: longe do topo e da base)
const overlayCss=`#__reel{position:fixed;left:14px;right:14px;top:56px;z-index:99999;pointer-events:none;
 background:#111112;border:3px solid #D2FF00;border-radius:16px;padding:14px 16px;box-shadow:4px 4px 0 #000;
 font-family:Bungee;font-size:24px;line-height:1.05;color:#f4f4ee;text-transform:uppercase;text-align:center}
#__reel b{color:#D2FF00;font-weight:400}
#__tag{position:fixed;left:0;right:0;bottom:150px;z-index:99999;text-align:center;pointer-events:none;font-family:Bungee;font-size:15px;color:#f4f4ee;text-shadow:0 2px 6px #000}
#__tag b{color:#D2FF00;font-weight:400}`;
let n=0, lista=[];
(async()=>{
  const b=await chromium.launch(process.env.CHROME?{executablePath:process.env.CHROME}:{});
  // 432x768 css px * 2.5 = 1080x1920
  const ctx=await b.newContext({viewport:{width:432,height:768},deviceScaleFactor:2.5,isMobile:true,hasTouch:true});
  const page=await ctx.newPage(); const BASE='http://game.local/';
  await page.route('**/*',r=>{const u=r.request().url();
    if(u.includes('fonts.googleapis'))return r.fulfill({contentType:'text/css',body:fontcss});
    if(u.startsWith('https://fonts.local/'))return r.fulfill({contentType:'font/woff2',body:fs.readFileSync(path.join(F,u.split('/').pop()))});
    if(u.startsWith(BASE)){const rel=new URL(u).pathname.replace(/^\/+/,'');
      if(rel.startsWith('dados/'))return r.fulfill({contentType:'application/json',body:'{"v":0}'});
      const a=path.join(REPO,rel); if(rel&&rel!=='catimba_fc.html'&&!rel.includes('..')&&fs.existsSync(a)&&fs.statSync(a).isFile())return r.fulfill({body:fs.readFileSync(a)});
      return r.fulfill({contentType:'text/html',body:fs.readFileSync(path.join(REPO,'catimba_fc.html'),'utf8')});}
    if(u.includes('supabase-js'))return r.fulfill({contentType:'application/javascript',body:fs.readFileSync(path.join(REPO,'ui_test','fake_supabase.js'),'utf8')});
    return r.abort();});
  const texto=async t=>{ await page.evaluate(([t,css])=>{
      if(!document.getElementById('__reelcss')){const s=document.createElement('style');s.id='__reelcss';s.textContent=css;document.head.appendChild(s);}
      let e=document.getElementById('__reel'); if(!e){e=document.createElement('div');e.id='__reel';document.body.appendChild(e);}
      e.style.display=t?'block':'none'; e.innerHTML=t||''; },[t,overlayCss]); };
  // grava frames reais por `seg` segundos (cada frame dura o tempo que levou de verdade)
  const grava=async(seg,para)=>{ const fim=Date.now()+seg*1000; let t0=Date.now();
    while(Date.now()<fim && !(para && await para())){
      // intervalo: o jogo abre a tela de substituições e espera; segue direto pro 2º tempo
      const sd=await page.$('#subDone'); if(sd){ await sd.click().catch(()=>{}); await page.waitForTimeout(250); t0=Date.now(); continue; } const f=path.join(FR,String(n++).padStart(5,'0')+'.jpg');
      await page.screenshot({path:f,type:'jpeg',quality:88}); const t1=Date.now();
      lista.push([f,(t1-t0)/1000]); t0=t1; } };
  const segura=async(seg)=>{ const f=path.join(FR,String(n++).padStart(5,'0')+'.jpg'); await page.screenshot({path:f,type:'jpeg',quality:88}); lista.push([f,seg]); };
  const tenta=async fn=>{try{await fn()}catch(e){console.error('pulou:',e.message.split('\n')[0])}};

  await page.goto(BASE); await page.waitForTimeout(800);
  await page.click('#btnJogarAgora'); await page.waitForTimeout(1200);
  const nv=await page.$('[data-novo]'); if(nv) await nv.click();
  await page.waitForSelector('.clube-lin',{timeout:15000}); await page.waitForTimeout(500);
  await texto(R.cenas.clubes); await segura(2.6);
  const lins=await page.$$('.clube-lin'); await lins[Math.floor(Math.random()*lins.length)].click();
  await page.waitForTimeout(1500); await texto(R.cenas.presidente); await segura(2.8);
  await tenta(async()=>{ await page.getByText('Já sei jogar',{exact:false}).first().click(); });
  await page.waitForTimeout(600);
  await tenta(async()=>{ const t=await page.$('[data-tab="escala"]'); if(t && await t.isVisible()) await t.click({timeout:2000}); });
  // velocidade Turbo (3x), opção real do jogo, pra caber o jogo inteiro no Reels
  await page.evaluate(()=>{ try{ App.garantirOpcoes().velocidade=3; }catch(e){} });
  await page.waitForTimeout(500);
  const btn=await page.$('#btnJogarEsc')||await page.$('#btnRodada');
  if(btn){ await btn.click(); await page.waitForTimeout(400); }
  await texto(R.cenas.partida);
  // grava a partida até apitar o fim (ou segPartida segundos); depois acelera pra caber no tempo
  const ini=lista.length;
  await grava(R.segPartida||30, async()=>/encerrada|fim de jogo/i.test(await page.evaluate(()=>document.body.innerText.slice(0,4000))));
  const dur=lista.slice(ini).reduce((a,[,d])=>a+d,0), alvo=R.durPartida||10;
  if(dur>alvo) for(let i=ini;i<lista.length;i++) lista[i][1]*=alvo/dur;
  await tenta(async()=>{ await page.getByText('Pular',{exact:false}).first().click({timeout:1500}); });
  await page.waitForTimeout(1500); await texto(R.cenas.fim); await segura(2.8);

  // card final na marca
  const fin=await ctx.newPage();
  await fin.route('https://fonts.local/**',r=>r.fulfill({contentType:'font/woff2',body:fs.readFileSync(path.join(F,r.request().url().split('/').pop()))}));
  await fin.setContent(`<meta name="viewport" content="width=432"><style>${fontcss}*{margin:0}body{width:432px;height:768px;background:#111112;color:#f4f4ee;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;font-family:'Space Mono'}
   .l{font-family:Bungee;font-size:46px}.l b{color:#D2FF00;font-weight:400}.t{font-family:Bungee;font-size:26px;margin-top:26px;line-height:1.1;text-transform:uppercase;padding:0 26px}
   .s{font-size:16px;color:#bdbdb7;margin-top:16px;padding:0 30px;line-height:1.5}.c{font-family:Bungee;font-size:18px;background:#D2FF00;color:#111;padding:14px 22px;border-radius:12px;margin-top:30px}</style>
   <div class="l">CATIMBA<b>.</b>FC<b>!</b></div><div class="t">${R.final.titulo}</div><div class="s">${R.final.sub}</div><div class="c">${R.final.cta}</div>`);
  await fin.evaluate(()=>document.fonts.ready); await fin.waitForTimeout(300);
  const f=path.join(FR,String(n++).padStart(5,'0')+'.jpg'); await fin.screenshot({path:f,type:'jpeg',quality:90}); lista.push([f,3.2]);
  await b.close();
  // concat do ffmpeg (o último arquivo repetido sem duração, exigência do formato)
  let txt=lista.map(([f,d])=>`file '${f}'\nduration ${Math.max(d,0.03).toFixed(3)}`).join('\n')+`\nfile '${lista[lista.length-1][0]}'\n`;
  fs.writeFileSync(path.join(OUT,'frames.txt'),txt);
  console.log('frames',lista.length,'duração',lista.reduce((a,[,d])=>a+d,0).toFixed(1)+'s');
})();
