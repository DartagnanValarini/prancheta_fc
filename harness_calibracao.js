#!/usr/bin/env node
/*
 * harness_calibracao.js — mede gols/jogo do motor de partida (chanceGol).
 *
 * Roda o MESMO loop minuto-a-minuto do jogo (simularMinuto): a cada minuto,
 * cada lado tem probabilidade `chanceGol` de marcar; 90 minutos por jogo.
 * O harness varre forças de time realistas em todas as séries (A/B/C/D) e
 * reporta gols/jogo, domínio do mandante e vantagem de mando.
 *
 * Objetivo do roadmap (Fase 0): estabilizar ~2,5 gols/jogo e trocar o bônus
 * de mando de +40 absoluto para percentual (escala melhor entre séries).
 *
 * Uso:
 *   node harness_calibracao.js baseline    # motor atual: *0.03, mando +40 absoluto
 *   node harness_calibracao.js calibrado   # Fase 0:      *0.027, mando +7% percentual
 *   node harness_calibracao.js             # roda os dois e compara
 */

'use strict';

const JOGOS_POR_CENARIO = 20000;   // Monte Carlo por combinação de forças/estilos
const MINUTOS = 90;

// --- as duas versões da função de gol -----------------------------------
// est/def idênticos ao motor real (app.js chanceGol).
const EST = { ofensivo:1.35, normal:1.0, defensivo:0.72 };
function defMult(estiloDef){
  return estiloDef==='defensivo'?1.3 : estiloDef==='ofensivo'?0.82 : 1;
}

// BASELINE (código atual): mando = +40 absoluto na soma, multiplicador 0.03
function chanceGol_baseline(fAtk, fDef, estiloAtk, estiloDef, mando){
  const atk=(fAtk+(mando?40:0))*EST[estiloAtk];
  const def=fDef*defMult(estiloDef);
  return (atk/(def+atk))*0.03;
}

// CALIBRADO (Fase 0): mando = +7% percentual sobre o ataque, multiplicador 0.027
// +40 numa soma ~600 ≈ +6,7% -> arredondado para 7%, agora proporcional à escala,
// então escala igual entre Série A (forças altas) e Série D (forças baixas).
const MANDO_PCT = 0.07;
function chanceGol_calibrado(fAtk, fDef, estiloAtk, estiloDef, mando){
  const atk=fAtk*(mando?(1+MANDO_PCT):1)*EST[estiloAtk];
  const def=fDef*defMult(estiloDef);
  return (atk/(def+atk))*0.027;
}

// --- simula 1 jogo (90 min, dois lados) ---------------------------------
function simularJogo(chanceGol, fH, fA, estH, estA){
  let gc=0, gf=0;
  for(let m=0;m<MINUTOS;m++){
    const pH=chanceGol(fH,fA,estH,estA,true);   // mandante
    const pA=chanceGol(fA,fH,estA,estH,false);  // visitante
    if(Math.random()<pH) gc++;
    if(Math.random()<pA) gf++;
  }
  return {gc,gf};
}

// --- cenários realistas de força de time (escala de forcaCampo: soma de 11) ---
// forcaCampo soma 11 jogadores * overall(~40-60) * (energia/100). Faixas por série:
const SERIES = {
  'A': [560, 660],
  'B': [500, 590],
  'C': [450, 540],
  'D': [400, 490],
};
const ESTILOS = ['ofensivo','normal','defensivo'];

function rand(a,b){ return a + Math.random()*(b-a); }

function medir(chanceGol, nome){
  let totGols=0, totJogos=0;
  let golsMandante=0, golsVisitante=0;
  let vMandante=0, empates=0, vVisitante=0;
  const porSerie={};

  for(const [serie,[lo,hi]] of Object.entries(SERIES)){
    let sGols=0, sJogos=0;
    for(let k=0;k<JOGOS_POR_CENARIO;k++){
      const fH=rand(lo,hi), fA=rand(lo,hi);
      const estH=ESTILOS[(Math.random()*3)|0];
      const estA=ESTILOS[(Math.random()*3)|0];
      const {gc,gf}=simularJogo(chanceGol,fH,fA,estH,estA);
      totGols+=gc+gf; totJogos++;
      sGols+=gc+gf; sJogos++;
      golsMandante+=gc; golsVisitante+=gf;
      if(gc>gf) vMandante++; else if(gc<gf) vVisitante++; else empates++;
    }
    porSerie[serie]=(sGols/sJogos);
  }

  const gpj=totGols/totJogos;
  const pctMandante=100*vMandante/totJogos;
  const pctEmpate=100*empates/totJogos;
  const pctVisitante=100*vVisitante/totJogos;
  const mandoRatio=golsMandante/golsVisitante;

  console.log(`\n=== ${nome} ===`);
  console.log(`  gols/jogo (global)     : ${gpj.toFixed(3)}`);
  console.log(`  gols/jogo por série    : A ${porSerie.A.toFixed(2)} | B ${porSerie.B.toFixed(2)} | C ${porSerie.C.toFixed(2)} | D ${porSerie.D.toFixed(2)}`);
  console.log(`  spread entre séries     : ${(Math.max(...Object.values(porSerie))-Math.min(...Object.values(porSerie))).toFixed(3)} gols`);
  console.log(`  vitória mandante/emp/vis: ${pctMandante.toFixed(1)}% / ${pctEmpate.toFixed(1)}% / ${pctVisitante.toFixed(1)}%`);
  console.log(`  gols mandante/visitante : ${mandoRatio.toFixed(3)}x`);
  return {gpj, porSerie, mandoRatio, pctMandante};
}

const modo=(process.argv[2]||'ambos').toLowerCase();
console.log(`harness_calibracao — ${JOGOS_POR_CENARIO} jogos/série, ${MINUTOS} min/jogo, alvo do roadmap: ~2,5 gols/jogo`);

if(modo==='baseline'){
  medir(chanceGol_baseline, 'BASELINE (*0.03, mando +40 absoluto)');
} else if(modo==='calibrado'){
  medir(chanceGol_calibrado, 'CALIBRADO (*0.027, mando +7% percentual)');
} else {
  const b=medir(chanceGol_baseline,  'BASELINE  (*0.03,  mando +40 absoluto)');
  const c=medir(chanceGol_calibrado, 'CALIBRADO (*0.027, mando +7% percentual)');
  console.log('\n=== COMPARAÇÃO ===');
  console.log(`  gols/jogo : ${b.gpj.toFixed(3)} -> ${c.gpj.toFixed(3)}  (alvo 2,5)`);
  console.log(`  spread séries (uniformidade do mando percentual):`);
  const spread=o=>Math.max(...Object.values(o))-Math.min(...Object.values(o));
  console.log(`    baseline  : ${spread(b.porSerie).toFixed(3)} gols  |  calibrado: ${spread(c.porSerie).toFixed(3)} gols`);
  console.log(`  domínio mandante: ${b.pctMandante.toFixed(1)}% -> ${c.pctMandante.toFixed(1)}%`);
}
