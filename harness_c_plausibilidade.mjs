// replica exata da função plausibilidade da Edge Function ranking-submit
function plausibilidade(s){
  const t=s.temporadas;
  if(!s.assinado) return [true,'Save sem assinatura válida'];
  if(s.titulos>t)  return [true,'Mais títulos que temporadas jogadas'];
  if(s.acessos>t)  return [true,'Mais acessos que temporadas jogadas'];
  if(s.melhor_divisao==='A'&&t<3) return [true,'Série A alcançada cedo demais'];
  if(s.melhor_divisao==='B'&&t<1) return [true,'Progresso de divisão impossível'];
  const TETO=5000;
  if(s.score>(t+1)*TETO) return [true,'Pontuação acima do possível para a carreira'];
  return [false,null];
}
let pass=0,fail=0;const t=(c,m)=>{if(c)pass++;else{fail++;console.log('FALHOU:',m);}};

t(plausibilidade({assinado:true,titulos:1,acessos:1,temporadas:3,melhor_divisao:'C',score:1500})[0]===false,'carreira coerente = OK');
t(plausibilidade({assinado:false,titulos:1,acessos:1,temporadas:3,melhor_divisao:'C',score:1500})[0]===true,'não-assinado = suspeito');
t(plausibilidade({assinado:true,titulos:5,acessos:1,temporadas:3,melhor_divisao:'C',score:1500})[0]===true,'mais títulos que temporadas = suspeito');
t(plausibilidade({assinado:true,titulos:9,acessos:9,temporadas:3,melhor_divisao:'C',score:1500})[0]===true,'mais acessos que temporadas = suspeito');
t(plausibilidade({assinado:true,titulos:0,acessos:2,temporadas:2,melhor_divisao:'A',score:1000})[0]===true,'Série A com 2 temporadas = suspeito');
t(plausibilidade({assinado:true,titulos:1,acessos:3,temporadas:3,melhor_divisao:'A',score:2000})[0]===false,'Série A com 3 temporadas = OK');
t(plausibilidade({assinado:true,titulos:1,acessos:1,temporadas:1,melhor_divisao:'C',score:999999})[0]===true,'score estourado = suspeito');
t(plausibilidade({assinado:true,titulos:0,acessos:0,temporadas:1,melhor_divisao:'D',score:100})[0]===false,'novato honesto = OK');

console.log(`\nplausibilidade: ${pass}/${pass+fail}`);
process.exit(fail?1:0);
