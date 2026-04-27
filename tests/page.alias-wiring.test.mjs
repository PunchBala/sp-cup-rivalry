
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const INDEX_PATH = path.resolve(process.cwd(), 'index.html');

function extractBlock(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  assert.notEqual(start, -1, `Missing block start: ${startNeedle}`);
  const end = source.indexOf(endNeedle, start);
  assert.notEqual(end, -1, `Missing block end: ${endNeedle}`);
  return source.slice(start, end);
}

test('page runtime keeps player aliases wired ahead of team aliases', () => {
  const source = fs.readFileSync(INDEX_PATH, 'utf8');
  const playerAliases = extractBlock(source, 'const PLAYER_NAME_ALIASES = {', 'function normalizeName');
  assert.match(playerAliases, /"auqib nabi dar":\s*"auqib nabi"/i);
  assert.match(playerAliases, /"suryavanshi":\s*"vaibhav suryavanshi"/i);
  assert.match(playerAliases, /"vaibhav sooryavanshi":\s*"vaibhav suryavanshi"/i);
  assert.match(playerAliases, /"v suryavanshi":\s*"vaibhav suryavanshi"/i);
  assert.match(source, /return PLAYER_NAME_ALIASES\[normalized\] \|\| TEAM_NAME_ALIASES\[normalized\] \|\| normalized;/);
});
