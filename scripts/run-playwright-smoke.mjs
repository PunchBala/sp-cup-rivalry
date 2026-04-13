import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const SERVER_URL = 'http://127.0.0.1:4173/index.html';
const serverScript = path.resolve('scripts/serve-static.mjs');
const require = createRequire(import.meta.url);
const playwrightPkgJson = require.resolve('playwright/package.json');
const playwrightCli = path.join(path.dirname(playwrightPkgJson), 'cli.js');

function waitForServer(url, timeoutMs = 20000) {
  const startedAt = Date.now();
  return (async () => {
    while (Date.now() - startedAt < timeoutMs) {
      try {
        const res = await fetch(url, { method: 'GET' });
        if (res.ok) return;
      } catch {
        // Keep polling until timeout.
      }
      await delay(250);
    }
    throw new Error(`Timed out waiting for dev server at ${url}`);
  })();
}

function runPlaywright() {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [playwrightCli, 'test', 'tests/page.smoke.spec.mjs'], {
      stdio: 'inherit'
    });
    child.on('exit', (code) => resolve(code ?? 1));
  });
}

const server = spawn(process.execPath, [serverScript], { stdio: 'inherit' });
let finished = false;

async function cleanup(exitCode) {
  if (finished) return;
  finished = true;
  if (!server.killed) {
    server.kill('SIGTERM');
  }
  process.exit(exitCode);
}

server.on('exit', () => {
  if (!finished) {
    console.error('Static server stopped unexpectedly.');
    cleanup(1);
  }
});

try {
  await waitForServer(SERVER_URL);
  const code = await runPlaywright();
  await cleanup(code);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  await cleanup(1);
}
