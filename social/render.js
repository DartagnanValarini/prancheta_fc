// Renderiza os slides de um post (social/posts/<id>/NN.html) em JPEG 1080x1350.
// Uso: node social/render.js social/posts/<id>   (CHROME=/caminho/do/chrome opcional)
const path=require('path'),fs=require('fs');
let chromium; try{({chromium}=require('playwright'))}catch(e){({chromium}=require(require('child_process').execSync('npm root -g').toString().trim()+'/playwright'))}
(async()=>{
  const dir=path.resolve(process.argv[2]); const htmls=fs.readdirSync(dir).filter(f=>/^\d+\.html$/.test(f)).sort();
  const b=await chromium.launch(process.env.CHROME?{executablePath:process.env.CHROME}:{});
  const pg=await b.newPage({viewport:{width:1080,height:1350}});
  for(const h of htmls){ await pg.goto('file://'+path.join(dir,h)); await pg.evaluate(()=>document.fonts.ready); await pg.waitForTimeout(200);
    const out=path.join(dir,h.replace('.html','.jpg')); await pg.screenshot({path:out,type:'jpeg',quality:92}); console.log(out); }
  await b.close();
})();
