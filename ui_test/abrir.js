// Abre o prancheta_fc.html num Chromium headless com o supabase-js falso (offline).
// Rodar direto (node ui_test/abrir.js) tira prints do fluxo de entrada em ui_test/shots.
// Playwright local ou global (npm i -g playwright && npx playwright install chromium)
let chromium; try{ ({chromium}=require('playwright')); }catch(e){ ({chromium}=require(require('child_process').execSync('npm root -g').toString().trim()+'/playwright')); }
const fs=require('fs'),path=require('path');
const REPO=process.env.REPO||path.join(__dirname,'..');
const OUT=process.env.OUT||path.join(__dirname,'shots');
fs.mkdirSync(OUT,{recursive:true});
async function abrir(browser,{w=1280,h=860}={}){
  const ctx=await browser.newContext({viewport:{width:w,height:h}});
  const page=await ctx.newPage();
  const erros=[];
  page.on('pageerror',e=>erros.push(e.message));
  page.on('console',m=>{ if(m.type()==='error') erros.push('console: '+m.text()); });
  await page.route('**/*',route=>{
    const u=route.request().url();
    if(u.startsWith('http://game.local/')) return route.fulfill({contentType:'text/html',body:fs.readFileSync(path.join(REPO,'prancheta_fc.html'),'utf8')});
    if(u.includes('supabase-js')) return route.fulfill({contentType:'application/javascript',body:fs.readFileSync(path.join(__dirname,'fake_supabase.js'),'utf8')});
    return route.abort();
  });
  await page.goto('http://game.local/');
  return {ctx,page,erros};
}
module.exports={abrir,OUT,chromium};
if(require.main===module)(async()=>{
  const browser=await chromium.launch();
  const {page,erros}=await abrir(browser);
  const shot=async n=>{ await page.waitForTimeout(250); await page.screenshot({path:path.join(OUT,n+'.png')}); console.log('shot',n); };
  await shot('01_entrada');
  const conv=await page.$('#btnConvidado'); if(conv){ await conv.click(); await page.waitForSelector('[data-novo]'); await shot('02_menu'); await page.click('[data-novo="1"]'); await page.waitForSelector('.clube-lin',{timeout:15000}); await shot('03_clubes'); await page.click('.clube-lin'); await page.waitForTimeout(800); await shot('04_primeira_tela'); }
  console.log('erros:',erros.slice(0,10));
  await browser.close();
})();
