import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

test('public duel directory wiring exists in the page shell', async () => {
  const html = await fs.readFile(path.resolve(process.cwd(), 'index.html'), 'utf8');

  assert.match(html, /id="duelDirectory"/);
  assert.match(html, /id="duelDirectorySummary"/);
  assert.match(html, /function sortedDirectoryDuels\(/);
  assert.match(html, /function buildDuelShareUrl\(/);
  assert.match(html, /data-copy-duel-link=/);
  assert.match(html, /data-open-duel=/);
  assert.match(html, /window\.history\.replaceState/);
});
