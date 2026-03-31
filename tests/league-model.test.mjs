import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  buildMatchupsFromLeague,
  createLocalLeagueAdapter,
  makePlayerId,
  normalizeSlug,
  validateLeagueConfig
} from '../warroom-league-model.mjs';

async function readFixture(name) {
  const filePath = path.resolve(process.cwd(), 'fixtures', name);
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

test('locked SP Cup league fixture validates cleanly', async () => {
  const league = await readFixture('league_sp_cup_2026.json');
  const result = validateLeagueConfig(league);
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test('draft league fixture allows incomplete picks while still validating', async () => {
  const league = await readFixture('league_draft_example.json');
  const result = validateLeagueConfig(league);
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test('buildMatchupsFromLeague generates all pairings in player order', async () => {
  const league = await readFixture('league_sp_cup_2026.json');
  const matchups = buildMatchupsFromLeague(league);
  assert.equal(matchups.length, 3);
  assert.deepEqual(matchups.map((m) => m.id), ['senthil-sai', 'senthil-vibeesh', 'sai-vibeesh']);
  assert.equal(matchups[0].label, 'Senthil vs Sai');
  assert.equal(matchups[1].label, 'Senthil vs Vibeesh');
  assert.equal(matchups[2].label, 'Sai vs Vibeesh');
  assert.equal(matchups[0].a.picks.orangeCap, 'KL Rahul');
  assert.equal(matchups[0].b.picks.orangeCap, 'Shubman Gill');
});

test('duplicate player names are rejected', async () => {
  const league = await readFixture('league_sp_cup_2026.json');
  league.players[2].name = 'Sai';
  league.players[2].id = 'vibeesh';
  const result = validateLeagueConfig(league);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /duplicate player name/i);
});

test('locked league rejects missing required picks', async () => {
  const league = await readFixture('league_sp_cup_2026.json');
  delete league.picks.sai.mostDots;
  const result = validateLeagueConfig(league);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /picks\.sai\.mostDots: is required once the league is locked/i);
});

test('invalid category keys are rejected', async () => {
  const league = await readFixture('league_sp_cup_2026.json');
  league.picks.senthil.superOverHero = 'MS Dhoni';
  const result = validateLeagueConfig(league);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /superOverHero: is not a valid category key/i);
});

test('local adapter loads by slug and returns deep clones', async () => {
  const league = await readFixture('league_sp_cup_2026.json');
  const adapter = createLocalLeagueAdapter({ [league.slug]: league });
  const loadedA = adapter.loadLeagueBySlug('sp-cup-2026');
  const loadedB = adapter.loadLeagueBySlug('sp-cup-2026');
  loadedA.name = 'Mutated';
  loadedA.picks.senthil.orangeCap = 'Mutated Pick';
  assert.equal(loadedB.name, 'SP Cup 2026');
  assert.equal(loadedB.picks.senthil.orangeCap, 'KL Rahul');
});

test('helper normalizers stay predictable for future BaaS ids', () => {
  assert.equal(normalizeSlug('SP Cup 2026'), 'sp-cup-2026');
  assert.equal(makePlayerId('N. Tilak Varma'), 'n-tilak-varma');
});
