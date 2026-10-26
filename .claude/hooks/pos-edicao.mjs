#!/usr/bin/env node
// Hook PostToolUse (Edit|Write) do Claude Code.
// - Editou o app.js → confere a sintaxe e reinjeta no catimba_fc.html.
// - Editou o catimba_fc.html e o script ficou diferente do app.js → avisa o Claude
//   (o app.js é a fonte; edição no <script> do HTML se perde na próxima injeção).
// Sai com 2 pra mostrar o aviso ao Claude; 0 quando está tudo certo.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = process.env.CLAUDE_PROJECT_DIR || process.cwd();
let entrada = {};
try { entrada = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch { process.exit(0); }
const arq = entrada?.tool_input?.file_path;
if (!arq) process.exit(0);
const rel = path.relative(RAIZ, path.resolve(RAIZ, arq));

const node = (args) => execFileSync(process.execPath, args, { cwd: RAIZ, stdio: 'pipe' }).toString();

if (rel === 'app.js') {
  try { node(['--check', 'app.js']); }
  catch (e) {
    process.stderr.write('app.js com erro de sintaxe — NÃO foi injetado no HTML:\n' + (e.stderr?.toString() || e.message));
    process.exit(2);
  }
  try { node(['tools/injetar.mjs']); process.exit(0); }
  catch (e) { process.stderr.write('Falhou ao injetar o app.js no HTML:\n' + (e.stderr?.toString() || e.message)); process.exit(2); }
}

if (rel === 'catimba_fc.html') {
  try { node(['tools/injetar.mjs', '--check']); process.exit(0); }
  catch {
    process.stderr.write('O <script> do catimba_fc.html ficou diferente do app.js. O app.js é a fonte: ' +
      'leve a mudança pro app.js e rode `node tools/injetar.mjs` (que sobrescreve o script do HTML).');
    process.exit(2);
  }
}
process.exit(0);
