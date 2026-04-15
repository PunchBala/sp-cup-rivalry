import { readdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';

const testsDir = path.resolve('tests');
const nodeTestFiles = readdirSync(testsDir)
  .filter((name) => name.endsWith('.mjs'))
  .filter((name) => !name.endsWith('.spec.mjs'))
  .sort();

if (!nodeTestFiles.length) {
  console.error('No Node test files found in tests/.');
  process.exit(1);
}

const args = ['--test', ...nodeTestFiles.map((name) => path.join('tests', name))];
const child = spawn(process.execPath, args, { stdio: 'inherit' });

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
