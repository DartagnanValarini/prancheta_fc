// smoke C1: reimplementa só os helpers de crypto do App e testa o ciclo
const SAVE_SECRET='cfc_v1_a7Q2-nEon-Lemon-D2FF00-!catimba';
function _canonical(obj){
  const seen=new WeakSet();
  const ord=(v)=>{
    if(v && typeof v==='object'){
      if(seen.has(v)) return null; seen.add(v);
      if(Array.isArray(v)) return v.map(ord);
      return Object.keys(v).filter(k=>k!=='checksum').sort().reduce((o,k)=>{o[k]=ord(v[k]);return o;},{});
    }
    return v;
  };
  return JSON.stringify(ord(obj));
}
async function _hmac(str){
  const enc=new TextEncoder();
  const key=await crypto.subtle.importKey('raw',enc.encode(SAVE_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const sig=await crypto.subtle.sign('HMAC',key,enc.encode(str));
  return Array.from(new Uint8Array(sig)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
const assinar=async(s)=>await _hmac(_canonical(s));
const conferir=async(s,sig)=>{ if(!sig) return false; const c=await _hmac(_canonical(s)); return !!c && c===sig; };

let pass=0, fail=0; const t=(c,m)=>{ if(c){pass++;} else {fail++; console.log('FALHOU:',m);} };

const save={ myTeam:3, temporada:2, saldos:[100,200,300], checksum:'abc' };
const sig=await assinar(save);
t(typeof sig==='string' && sig.length===64, 'sig é hex de 64 chars (SHA-256)');
t(await conferir(save,sig)===true, 'assinatura válida confere');

// adulteração: cheat no saldo
const cheat={...save, saldos:[999,200,300]};
t(await conferir(cheat,sig)===false, 'save adulterado (saldo) NÃO confere');

// ordem de chaves não importa (canônico)
const reord={ temporada:2, saldos:[100,200,300], myTeam:3, checksum:'xyz' };
t(await conferir(reord,sig)===true, 'ordem de chaves + checksum diferente ainda confere');

// sig ausente
t(await conferir(save,null)===false, 'sig ausente => não-assinado');

console.log(`\nC1 smoke: ${pass}/${pass+fail}`);
process.exit(fail?1:0);
