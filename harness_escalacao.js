// harness_escalacao — escalação automática por atribuição ÓTIMA (Escalacao).
// Caso reportado (29/09/2026): comprou um meia forte (MC 78, DC 72) e o
// Auto/11 melhores o escalou de ZAGUEIRO, porque a zaga era preenchida antes do meio.
// Uso: node harness_escalacao.js
const {abrir,chromium}=require('./ui_test/abrir.js');
let POS_SETOR={};   // copiado da página abaixo
let ok=0,falhas=0; const t=(c,m)=>{ if(c){ok++;console.log('  ✅',m);} else {falhas++;console.log('  ❌',m);} };

(async()=>{
  const browser=await chromium.launch();
  const {page,erros}=await abrir(browser);
  page.on('dialog',d=>d.accept());
  await page.evaluate(()=>localStorage.setItem('prancheta_tutorial_v1','feito'));
  await page.click('#btnJogarAgora'); await page.waitForSelector('.clube-lin',{timeout:15000});
  await page.click('.clube-lin'); await page.waitForSelector('.fm-campo');

  POS_SETOR=await page.evaluate(()=>POS_SETOR);
  console.log('\n[1] húngaro = força bruta (matrizes pequenas)');
  const h=await page.evaluate(()=>{
    let seed=7; const rnd=()=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; };
    const perms=(arr,k)=>{ const out=[]; const rec=(cur,rest)=>{ if(cur.length===k){out.push(cur);return;} rest.forEach((x,i)=>rec([...cur,x],rest.filter((_,j)=>j!==i))); }; rec([],arr); return out; };
    let erradas=0;
    for(let caso=0;caso<200;caso++){
      const n=1+Math.floor(rnd()*4), m=n+Math.floor(rnd()*3);
      const a=[...Array(n)].map(()=>[...Array(m)].map(()=>Math.round(rnd()*100)));
      const r=Escalacao.hungaro(a); const custo=r.reduce((s,j,i)=>s+a[i][j],0);
      const melhor=Math.min(...perms([...Array(m).keys()],n).map(pm=>pm.reduce((s,j,i)=>s+a[i][j],0)));
      if(custo!==melhor || new Set(r).size!==n) erradas++;
    }
    return erradas;
  });
  t(h===0,'200 casos aleatórios: custo ótimo e sem jogador repetido');

  console.log('\n[2] cenário reportado: 2 reforços da Série A');
  const cen=await page.evaluate(()=>{
    const i=App.myTeam, meu=App.teams[i];
    const melhorMeuDC=Math.max(...meu.players.map(p=>Motor.overallEm(p,'DC')));
    // meias da Série A que rendem MAIS na zaga do que qualquer zagueiro meu (o caso do Túlio)
    const cands=[]; App.teams.forEach((t,ti)=>{ if(ti===i||t.divisao!=='A') return;
      t.players.forEach(p=>{ const nat=Escalacao.posNatural(p);
        if(POS_SETOR[nat]==='MEI' && Motor.overallEm(p,'DC')>melhorMeuDC+3) cands.push({p,ti,nat}); }); });
    cands.sort((a,b)=>Motor.overallEm(b.p,b.nat)-Motor.overallEm(a.p,a.nat));
    const zag=[]; App.teams.forEach((t,ti)=>{ if(ti===i||t.divisao!=='A') return;
      t.players.forEach(p=>{ if(POS_SETOR[Escalacao.posNatural(p)]==='DEF') zag.push({p,ti}); }); });
    zag.sort((a,b)=>b.p.forca-a.p.forca);
    if(!cands.length||!zag.length) return {sem:true};
    meu.saldo=999e6;
    const meia=cands[0].p, lat=zag[0].p;
    App.executarTransferencia(meia.pid,i,1); App.executarTransferencia(lat.pid,i,1);
    const nat=Escalacao.posNatural(meia);
    // o algoritmo ANTIGO (vaga por vaga, na ordem) — pra provar que o caso reproduz
    const antigo=(players,slots)=>{ const us=new Set(), out={};
      [...slots].sort((a,b)=>(a==='GK'?0:1)-(b==='GK'?0:1)).forEach(pos=>{ let mel=null,mo=-1;
        players.forEach(p=>{ if(us.has(p.numero)) return; const o=Motor.overallEm(p,pos); if(o>mo){mo=o;mel=p;} });
        if(mel){ us.add(mel.numero); out[mel.numero]=pos; } }); return out; };
    const res={nome:meia.nome, nat, ovNat:Motor.overallEm(meia,nat), ovDC:Motor.overallEm(meia,'DC'), porFormacao:[]};
    Object.keys(LINHAS_FM).forEach(f=>{
      App.cfg[i].formacao=f; App.escalarMelhor();
      const pos=App.posDe(i,meia.numero), posLat=App.posDe(i,lat.numero);
      const temMeio=LINHAS_FM[f].flat().some(s=>POS_SETOR[s]==='MEI');
      const velho=antigo(meu.players.filter(p=>!App.indisponivel(p)), LINHAS_FM[f].flat())[meia.numero];
      res.porFormacao.push({f, pos, velho, temMeio, posLat, setor:POS_SETOR[pos], latSetor:POS_SETOR[posLat]});
    });
    // 11 melhores e troca de formação
    const f11=App.escalar11Melhores(); res.f11={f:f11, pos:App.posDe(i,meia.numero)};
    App.cfg[i].formacao='4-4-2'; App.escalarMelhor();
    const antes=new Set(App.onzeDe(i).map(p=>p.numero));
    App.aplicarFormacao(i,'3-5-2'); res.troca=App.posDe(i,meia.numero);
    res.mantidos=App.onzeDe(i).filter(p=>antes.has(p.numero)).length; res.onze=App.onzeDe(i).length;
    res.bancoOk=App.bancoDe(i).length<=12;
    return res;
  });
  if(cen.sem){ t(false,'dados de teste sem candidato pro cenário'); }
  else {
    console.log(`     ${cen.nome}: natural ${cen.nat} (${cen.ovNat}) · como zagueiro ${cen.ovDC}`);
    const reproduz=cen.porFormacao.filter(x=>x.velho && POS_SETOR[x.velho]==='DEF').length;
    t(reproduz>0,`algoritmo antigo reproduz o bug: zagueiro em ${reproduz}/9 formações`);
    const errados=cen.porFormacao.filter(x=>x.temMeio && x.setor!=='MEI');
    t(errados.length===0,'Auto: o meia joga no MEIO nas 9 formações'+(errados.length?' — '+errados.map(x=>x.f+'→'+x.pos).join(', '):''));
    t(cen.porFormacao.every(x=>x.latSetor==='DEF'),'o reforço de defesa continua na defesa');
    t(POS_SETOR[cen.f11.pos]==='MEI',`11 melhores (${cen.f11.f}): meia no meio (${cen.f11.pos})`);
    t(POS_SETOR[cen.troca]==='MEI',`trocar de formação (4-4-2 → 3-5-2): meia continua no meio (${cen.troca})`);
    t(cen.onze===11 && cen.mantidos>=9 && cen.bancoOk,`trocar de formação mantém a base do time (${cen.mantidos}/11 continuam titulares, banco ≤ 12)`);
  }

  console.log('\n[3] qualidade geral: 156 times × 9 formações');
  const g=await page.evaluate(()=>{
    const antigo=(players,slots)=>{ const us=new Set(), out=[];
      [...slots].sort((a,b)=>(a==='GK'?0:1)-(b==='GK'?0:1)).forEach(pos=>{ let mel=null,mo=-1;
        players.forEach(p=>{ if(us.has(p.numero)) return; const o=Motor.overallEm(p,pos); if(o>mo){mo=o;mel=p;} });
        if(mel){ us.add(mel.numero); out.push({pos,p:mel}); } }); return out; };
    const soma=(arr,fn)=>arr.reduce((s,x)=>s+fn(x),0);
    let nota={n:0,v:0}, forca={n:0,v:0}, impro={n:0,v:0}, fora=0, casos=0, pior=0;
    App.teams.forEach(t=>{ const disp=t.players.filter(p=>!App.indisponivel(p));
      Object.keys(LINHAS_FM).forEach(f=>{ const slots=LINHAS_FM[f].flat(); casos++;
        const N=Escalacao.atribuir(disp,slots).filter(x=>x.p), V=antigo(disp,slots);
        const nat=p=>Escalacao.posNatural(p);
        nota.n+=soma(N,x=>Escalacao.nota(x.p,x.pos,nat(x.p))); nota.v+=soma(V,x=>Escalacao.nota(x.p,x.pos,nat(x.p)));
        const fN=soma(N,x=>Motor.overallEm(x.p,x.pos)), fV=soma(V,x=>Motor.overallEm(x.p,x.pos));
        forca.n+=fN; forca.v+=fV; if(fN<fV) pior=Math.max(pior,(fV-fN)/fV);
        const imp=x=>POS_SETOR[x.pos]!==POS_SETOR[nat(x.p)]?1:0;
        impro.n+=soma(N,imp); impro.v+=soma(V,imp);
        if(N.length!==11) fora++;
      }); });
    return {casos, nota, forca, impro, fora, pior};
  });
  t(g.fora===0,`sempre 11 escalados (${g.casos} casos)`);
  t(g.nota.n>=g.nota.v,`nota total (overall − penalidade) nunca pior: ${(g.nota.n/g.casos).toFixed(1)} vs ${(g.nota.v/g.casos).toFixed(1)} por time`);
  t(g.impro.n<=g.impro.v,`jogadores fora do setor natural: ${g.impro.n} (antes ${g.impro.v})`);
  const dForca=(g.forca.n-g.forca.v)/g.forca.v*100;
  t(dForca>=-0.5,`força em campo média: ${dForca>=0?'+':''}${dForca.toFixed(2)}% vs antes (pior caso ${(g.pior*100).toFixed(1)}%)`);

  console.log('\n[4] Descansados continua pesando energia');
  const en=await page.evaluate(()=>{ App.cfg[App.myTeam].formacao='4-3-3'; App.escalarMelhor();
    App.onzeDe(App.myTeam).forEach(p=>p.energia=35);
    const media=()=>{ const o=App.onzeDe(App.myTeam); return o.reduce((a,p)=>a+p.energia,0)/o.length; };
    App.escalarMelhor(); const a=media(); App.escalarCom(App.myTeam,{descansados:true}); return {a, d:media(), n:App.onzeDe(App.myTeam).length}; });
  t(en.n===11 && en.d>en.a,`energia média do onze ${en.a.toFixed(0)}% → ${en.d.toFixed(0)}%`);
  t(erros.filter(e=>!/ERR_FAILED/.test(e)).length===0,'sem erros de JS');
  await browser.close();
  console.log(`\n=== ${ok} ok, ${falhas} falhas ===`);
  process.exit(falhas?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
