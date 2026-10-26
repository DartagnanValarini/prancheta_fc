#!/usr/bin/env node
// Injeta o app.js dentro do <script> do catimba_fc.html (o jogo é um HTML único, sem build).
//
//   node tools/injetar.mjs           → copia o app.js pro HTML (só grava se mudou)
//   node tools/injetar.mjs --check   → só confere; sai com 1 se o HTML estiver diferente do app.js
//
// O app.js é a fonte. Nunca edite o script dentro do HTML na mão.
// O bloco é o primeiro "<script>" (sem atributos) depois do <script> do supabase-js.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HTML = path.join(RAIZ, 'catimba_fc.html');
const APP = path.join(RAIZ, 'app.js');
const checar = process.argv.includes('--check');

const html = fs.readFileSync(HTML, 'utf8');
const app = fs.readFileSync(APP, 'utf8');

const ancora = html.indexOf('supabase-js@2');
const abre = html.indexOf('<script>\n', ancora);
const fecha = abre < 0 ? -1 : html.indexOf('</script>', abre);
if (ancora < 0 || abre < 0 || fecha < 0) {
  console.error('injetar: não achei o bloco <script> do jogo no catimba_fc.html (depois do supabase-js).');
  process.exit(2);
}
const inicio = abre + '<script>\n'.length;
const atual = html.slice(inicio, fecha);

if (atual === app) {
  console.log('injetar: catimba_fc.html já está igual ao app.js.');
  process.exit(0);
}
if (checar) {
  console.error('injetar: catimba_fc.html DIFERENTE do app.js. Rode: node tools/injetar.mjs');
  process.exit(1);
}
fs.writeFileSync(HTML, html.slice(0, inicio) + app + html.slice(fecha));
console.log(`injetar: app.js (${app.split('\n').length} linhas) copiado pro catimba_fc.html.`);
