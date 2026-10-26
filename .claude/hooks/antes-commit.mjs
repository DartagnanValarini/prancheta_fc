#!/usr/bin/env node
// Hook PreToolUse (Bash: git commit) do Claude Code.
// Bloqueia o commit se o catimba_fc.html estiver diferente do app.js — senão o site
// publicado e os harnesses de motor testariam códigos diferentes.
import { execFileSync } from 'node:child_process';

const RAIZ = process.env.CLAUDE_PROJECT_DIR || process.cwd();
try {
  execFileSync(process.execPath, ['tools/injetar.mjs', '--check'], { cwd: RAIZ, stdio: 'pipe' });
  process.exit(0);
} catch {
  process.stderr.write('Commit bloqueado: catimba_fc.html diferente do app.js. Rode `node tools/injetar.mjs`, ' +
    'confira a regressão (`node tools/regressao.mjs`) e faça o commit de novo.');
  process.exit(2);
}
