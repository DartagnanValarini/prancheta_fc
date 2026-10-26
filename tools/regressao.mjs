#!/usr/bin/env node
// Roda os harnesses (harness_*.js / *.mjs) em paralelo e mostra um resumo.
//
//   node tools/regressao.mjs                  → regressão rápida (tudo menos a carreira longa)
//   node tools/regressao.mjs --completa       → inclui harness_carreira_longa (~3–5 min a mais)
//   node tools/regressao.mjs --so leilao,mando → só os harnesses cujo nome contém um dos termos
//   node tools/regressao.mjs -j 2             → quantos rodam ao mesmo tempo (padrão: núcleos, até 6)
//
// Antes de rodar, confere se o catimba_fc.html está igual ao app.js (os harnesses de UI
// abrem o HTML; os de motor leem o app.js — se divergirem, os dois testam coisas diferentes).
// A saída completa de cada harness fica em .regressao/<nome>.log (pasta ignorada pelo git).
// Sai com 1 se algum harness falhar.
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOGS = path.join(RAIZ, '.regressao');
const LENTOS = ['harness_carreira_longa'];
const TIMEOUT_MS = 12 * 60 * 1000;

const args = process.argv.slice(2);
const val = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
const completa = args.includes('--completa');
const so = (val('--so') || '').split(',').map(s => s.trim()).filter(Boolean);
const paralelo = Math.max(1, +(val('-j') || Math.min(6, os.cpus().length)));

try {
  execFileSync(process.execPath, [path.join(RAIZ, 'tools/injetar.mjs'), '--check'], { stdio: 'pipe' });
} catch {
  console.error('❌ catimba_fc.html diferente do app.js. Rode antes: node tools/injetar.mjs');
  process.exit(1);
}

let lista = fs.readdirSync(RAIZ)
  .filter(f => /^harness_.+\.(m?js)$/.test(f))
  .sort();
if (so.length) lista = lista.filter(f => so.some(t => f.includes(t)));
else if (!completa) lista = lista.filter(f => !LENTOS.some(l => f.startsWith(l)));
if (!lista.length) { console.error('Nenhum harness bate com o filtro.'); process.exit(1); }

fs.mkdirSync(LOGS, { recursive: true });
console.log(`Rodando ${lista.length} harnesses (${paralelo} por vez)…\n`);

const resultados = [];
const inicioGeral = Date.now();

function rodar(arquivo) {
  return new Promise(resolve => {
    const ini = Date.now();
    const nome = arquivo.replace(/\.m?js$/, '');
    const log = fs.createWriteStream(path.join(LOGS, nome + '.log'));
    const filho = spawn(process.execPath, [arquivo], { cwd: RAIZ, env: process.env });
    let saida = '';
    const guardar = d => { saida += d; log.write(d); };
    filho.stdout.on('data', guardar);
    filho.stderr.on('data', guardar);
    const relogio = setTimeout(() => { guardar('\n[regressao] TIMEOUT — processo encerrado\n'); filho.kill('SIGKILL'); }, TIMEOUT_MS);
    filho.on('close', codigo => {
      clearTimeout(relogio);
      log.end();
      const seg = ((Date.now() - ini) / 1000).toFixed(1);
      const oks = (saida.match(/✅/g) || []).length;
      const xs = (saida.match(/❌/g) || []).length;
      const passou = codigo === 0;
      resultados.push({ nome, passou, seg, oks, xs, saida });
      console.log(`${passou ? '✅' : '❌'} ${nome.padEnd(32)} ${String(seg).padStart(6)}s  ${oks}✓ ${xs ? xs + '✗' : ''}`);
      resolve();
    });
  });
}

const fila = [...lista];
await Promise.all(Array.from({ length: Math.min(paralelo, fila.length) }, async () => {
  while (fila.length) await rodar(fila.shift());
}));

const falhas = resultados.filter(r => !r.passou);
const total = ((Date.now() - inicioGeral) / 1000).toFixed(0);
console.log(`\n${resultados.length - falhas.length}/${resultados.length} verdes em ${total}s.`);
if (falhas.length) {
  console.log('\nFalharam:');
  for (const f of falhas) {
    const linhas = f.saida.split('\n').filter(l => /❌|Error|FALHA|TIMEOUT/.test(l)).slice(0, 8);
    console.log(`\n— ${f.nome}  (log: .regressao/${f.nome}.log)`);
    for (const l of linhas) console.log('   ' + l.trim());
  }
  process.exit(1);
}
