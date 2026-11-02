// Tira prints do jogo (offline, mundo sintético do fake_supabase) para usar nos posts.
// Uso: node social/prints.js <pasta-saida> [rodadas]   (CHROME=/caminho/do/chrome opcional)
// Gera: entrada, clubes, boas_vindas, formacao, elenco, mercado, competicoes, financas e,
// depois de jogar N rodadas (padrão 1; a 2ª em diante ainda falha às vezes), ao_vivo_N, fim_N e tabela_pos (PNG 2x, 1280x860 css px).
const path=require('path'),fs=require('fs');
let chromium; try{({chromium}=require('playwright'))}catch(e){({chromium}=require(require('child_process').execSync('npm root -g').toString().trim()+'/playwright'))}
const REPO=path.join(__dirname,'..'), F=path.join(__dirname,'fonts');
const OUT=path.resolve(process.argv[2]||path.join(__dirname,'prints')); const N=+(process.argv[3]||1);
fs.mkdirSync(OUT,{recursive:true});
const css=`@font-face{font-family:'Bungee';src:url(https://fonts.local/bungee.woff2)}
@font-face{font-family:'Space Mono';font-weight:400;src:url(https://fonts.local/spacemono-400.woff2)}
@font-face{font-family:'Space Mono';font-weight:700;src:url(https://fonts.local/spacemono-700.woff2)}`;
(async()=>{
  const b=await chromium.launch(process.env.CHROME?{executablePath:process.env.CHROME}:{});
  const page=await (await b.newContext({viewport:{width:1280,height:860},deviceScaleFactor:2})).newPage();
  const BASE='http://game.local/';
  await page.route('**/*',r=>{const u=r.request().url();
    if(u.includes('fonts.googleapis'))return r.fulfill({contentType:'text/css',body:css});
    if(u.startsWith('https://fonts.local/'))return r.fulfill({contentType:'font/woff2',body:fs.readFileSync(path.join(F,u.split('/').pop()))});
    if(u.startsWith(BASE)){const rel=new URL(u).pathname.replace(/^\/+/,'');
      if(rel.startsWith('dados/'))return r.fulfill({contentType:'application/json',body:'{"v":0}'});
      const a=path.join(REPO,rel); if(rel&&rel!=='catimba_fc.html'&&!rel.includes('..')&&fs.existsSync(a)&&fs.statSync(a).isFile())return r.fulfill({body:fs.readFileSync(a)});
      return r.fulfill({contentType:'text/html',body:fs.readFileSync(path.join(REPO,'catimba_fc.html'),'utf8')});}
    if(u.includes('supabase-js'))return r.fulfill({contentType:'application/javascript',body:fs.readFileSync(path.join(REPO,'ui_test','fake_supabase.js'),'utf8')});
    return r.abort();});
  const shot=async n=>{await page.waitForTimeout(700); const f=path.join(OUT,n+'.png'); await page.screenshot({path:f}); console.log(f);};
  const tenta=async(fn)=>{try{await fn()}catch(e){console.error('pulou:',e.message.split('\n')[0])}};
  await page.goto(BASE); await shot('entrada');
  await page.click('#btnJogarAgora'); await page.waitForTimeout(1200);
  const nv=await page.$('[data-novo]'); if(nv) await nv.click();
  await page.waitForSelector('.clube-lin',{timeout:15000});
  // clube sorteado entre os oferecidos, pra variar os prints
  const lins=await page.$$('.clube-lin'); await shot('clubes'); await lins[Math.floor(Math.random()*lins.length)].click();
  await page.waitForTimeout(1500); await shot('boas_vindas');
  await tenta(async()=>{ await page.getByText('Já sei jogar',{exact:false}).first().click(); });
  for(const t of ['escala','elenco','mercado','competicoes','financas']){
    await tenta(async()=>{ await page.click(`[data-tab="${t}"]`,{timeout:3000}); await shot(t==='escala'?'formacao':t); });
  }
  for(let i=1;i<=N;i++){
    await tenta(async()=>{
      await page.click('[data-tab="escala"]',{timeout:3000});
      const btn=await page.$('#btnJogarEsc')||await page.$('#btnRodada'); if(!btn) throw new Error('sem botão de rodada');
      await btn.click(); await page.waitForTimeout(4000);
      await shot('ao_vivo_'+i);   // partida rolando (placar, posse, lances)
      await page.getByText('Pular',{exact:false}).first().click({timeout:3000}).catch(()=>{});
      await page.waitForTimeout(2500); await shot('fim_'+i);
      // fecha modais que aparecerem (pós-jogo, presidente etc.) depois do print
      for(let k=0;k<4;k++){const m=await page.$('.modal-bg button, .modal button'); if(!m) break; await m.click().catch(()=>{}); await page.waitForTimeout(400);}
    });
  }
  await tenta(async()=>{ await page.click('[data-tab="competicoes"]',{timeout:3000}); await shot('tabela_pos'); });
  await b.close();
})();
