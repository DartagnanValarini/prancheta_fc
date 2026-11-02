/* Fake supabase-js para testes de UI offline (sandbox não alcança o Supabase).
   Gera ligas sintéticas com o mesmo formato das tabelas team/player. */
(function(){
  let seed=42; const rnd=()=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; };
  const r=(a,b)=>Math.round(a+(b-a)*rnd());
  const DIVS=[['A',20,80e6,70],['B',20,30e6,64],['C',20,12e6,58],['D',96,3e6,52]];
  const CORES=['#006437','#c52613','#0033a0','#000000','#e30613','#f5c518','#1a3d8f','#0b7a3b','#8b1a2b'];
  const NOMES=['Leão','Galo','Tigre','Dragão','Onça','Gavião','Tubarão','Jacaré','Coruja','Carcará','Pantera','Lobo'];
  const CIDADES=['Manaus','Natal','Recife','Goiânia','Cuiabá','Belém','Maceió','Teresina','Campinas','Pelotas','Joinville','Macapá'];
  const ATTR=["corners","crossing","dribbling","finishing","first_touch","freekick","heading","long_shots","long_throws","marking","passing","penalty","tackling","technique","agression","antecipation","bravery","composure","concentration","decisions","determination","flair","leadership","off_the_ball","positioning","teamwork","vision","work_rate","acceleration","agility","balance","jump_reach","natural_fitness","pace","stamina","strength","aerial_reach","command_of_area","communication","handling","kicking","one_on_ones","reflexes","rushing_out","throwing"];
  const GK=new Set(["aerial_reach","command_of_area","communication","handling","kicking","one_on_ones","reflexes","rushing_out","throwing"]);
  const FOCO={defesa:['tackling','marking','heading','positioning','strength'],meio:['passing','vision','technique','first_touch','decisions'],ataque:['finishing','dribbling','pace','off_the_ball','composure']};
  const PRE=['João','Pedro','Lucas','Mateus','Rafael','Bruno','Diego','Caio','Thiago','André','Gustavo','Felipe','Renan','Igor','Vitor'];
  const SOB=['Silva','Souza','Lima','Costa','Rocha','Alves','Pereira','Ramos','Nunes','Barbosa','Teixeira','Moura','Freitas','Cardoso'];
  const teams=[], players=[]; let tid=1, pid=1;
  DIVS.forEach(([div,n,saldo,base])=>{
    for(let k=0;k<n;k++){
      const nome=NOMES[r(0,NOMES.length-1)]+' de '+CIDADES[r(0,CIDADES.length-1)];
      const t={id:tid,nome,abrev:(nome.slice(0,2)+div+k).toUpperCase().slice(0,3),cidade:'',divisao:div,saldo,escudo:null,cor1:CORES[r(0,8)],cor2:rnd()<.5?'#ffffff':'#000000'};
      teams.push(t);
      const setores=[...Array(2).fill('goleiro'),...Array(7).fill('defesa'),...Array(7).fill('meio'),...Array(4).fill('ataque')];
      const tb=base+r(-4,4);
      setores.forEach((s,idx)=>{
        const p={id:pid++,team_id:tid,player_name:PRE[r(0,14)]+' '+SOB[r(0,13)],numero:idx+1,setor:s,age:r(18,34),valor:0,salario:r(20,50),contract:r(6,36),potential:tb+r(0,10),talento:r(1,5)};
        ATTR.forEach(a=>{
          let v;
          if(s==='goleiro') v=GK.has(a)?tb+r(-6,6):r(20,45);
          else if(GK.has(a)) v=r(8,20);
          else v=(FOCO[s].includes(a)?tb+6:tb-8)+r(-7,7);
          p[a]=Math.max(1,Math.min(99,v));
        });
        players.push(p);
      });
      tid++;
    }
  });
  window.__FAKE={teams,players};

  // Nuvem simulada (harness_nuvem_fora): só liga se o teste gravar '__fakecfg' no
  // sessionStorage antes de abrir. Sem isso, tudo segue como antes (convidado, game_save vazio).
  //   {sessao:{access_token,user:{id,email}}|null, fora:bool, saves:[linhas de game_save]}
  let cfg=null; try{ cfg=JSON.parse(sessionStorage.getItem('__fakecfg')||'null'); }catch(e){}
  window.__FAKE_CFG=cfg;
  window.__fakeSalvar=()=>{ try{ sessionStorage.setItem('__fakecfg',JSON.stringify(window.__FAKE_CFG)); }catch(e){} };
  const FORA={message:'TypeError: Failed to fetch'};

  function query(table){
    let rows=null, filtros=[], range=null;
    const nuvem = table==='game_save' && window.__FAKE_CFG;
    const q={
      select(){ return q; }, order(){ return q; },
      in(col,vals){ filtros.push(r=>vals.includes(r[col])); return q; },
      eq(col,v){ filtros.push(r=>String(r[col])===String(v)); return q; },
      range(a,b){ range=[a,b]; return q; },
      maybeSingle(){ q._single=true; return q; }, single(){ q._single=true; return q; },
      upsert(row){
        if(!nuvem) return Promise.resolve({error:null});
        const c=window.__FAKE_CFG; if(c.fora) return Promise.resolve({error:FORA});
        c.saves=c.saves.filter(r=>!(r.user_id===row.user_id && String(r.slot)===String(row.slot)));
        c.saves.push(JSON.parse(JSON.stringify(row))); window.__fakeSalvar();
        return Promise.resolve({error:null});
      },
      delete(){ return q; }, insert(){ return Promise.resolve({error:null}); },
      then(res,rej){
        if(nuvem && window.__FAKE_CFG.fora) return Promise.resolve({data:null,error:FORA}).then(res,rej);
        let base= table==='team'?teams : table==='player'?players : nuvem?window.__FAKE_CFG.saves : [];
        let out=base.filter(r=>filtros.every(f=>f(r)));
        if(range) out=out.slice(range[0],range[1]+1);
        if(q._single) out=out[0]||null;
        return Promise.resolve({data:JSON.parse(JSON.stringify(out)),error:null}).then(res,rej);
      }
    };
    return q;
  }
  window.supabase={createClient(){ return {
    from:query,
    auth:{
      getSession:async()=>({data:{session:(window.__FAKE_CFG&&window.__FAKE_CFG.sessao)||null}}),
      signInWithPassword:async()=>({data:null,error:(window.__FAKE_CFG&&window.__FAKE_CFG.fora)?FORA:{message:'Invalid login credentials'}}),
      signUp:async()=>({data:null,error:{message:'offline'}}),
      signOut:async()=>({}),
    },
  }; }};
})();
