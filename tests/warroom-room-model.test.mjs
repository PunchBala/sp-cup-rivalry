import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  buildMatchupsFromWarRoom,
  createLocalWarRoomAdapter,
  normalizeSlug,
  validateWarRoomConfig
} from '../warroom-room-model.mjs';

async function readFixture(name) {
  const filePath = path.resolve(process.cwd(), 'fixtures', name);
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

test('locked SP Cup war room fixture validates cleanly', async () => {
  const room = await readFixture('war_room_sp_cup_2026.json');
  const result = validateWarRoomConfig(room);
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test('draft war room fixture allows incomplete picks', async () => {
  const room = await readFixture('war_room_draft_example.json');
  const result = validateWarRoomConfig(room);
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test('buildMatchupsFromWarRoom preserves explicit duel list and separate Senthil entries', async () => {
  const room = await readFixture('war_room_sp_cup_2026.json');
  const matchups = buildMatchupsFromWarRoom(room);
  assert.equal(matchups.length, 2);
  assert.deepEqual(matchups.map((m) => m.id), ['senthil-sai', 'senthil-vibeesh']);
  assert.equal(matchups[0].a.name, 'Senthil');
  assert.equal(matchups[1].a.name, 'Senthil');
  assert.notEqual(matchups[0].a.entryId, matchups[1].a.entryId);
  assert.equal(matchups[0].a.picks.orangeCap, 'KL Rahul');
  assert.equal(matchups[1].a.picks.orangeCap, 'Shubman Gill');
});

test('duplicate entry ids are rejected even when display names repeat across duels', async () => {
  const room = await readFixture('war_room_sp_cup_2026.json');
  room.duels[1].a.id = room.duels[0].a.id;
  const result = validateWarRoomConfig(room);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /duplicate entry id/i);
});

test('locked duel rejects missing required picks', async () => {
  const room = await readFixture('war_room_sp_cup_2026.json');
  delete room.duels[0].b.picks.fairPlay;
  const result = validateWarRoomConfig(room);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /fairPlay: is required once the duel is locked/i);
});

test('local adapter loads by slug and returns deep clones', async () => {
  const room = await readFixture('war_room_sp_cup_2026.json');
  const adapter = createLocalWarRoomAdapter({ [room.slug]: room });
  const loadedA = adapter.loadWarRoomBySlug('sp-cup-2026');
  const loadedB = adapter.loadWarRoomBySlug('sp-cup-2026');
  loadedA.duels[0].a.picks.orangeCap = 'Mutated';
  assert.equal(loadedB.duels[0].a.picks.orangeCap, 'KL Rahul');
});

test('slug normalizer stays predictable', () => {
  assert.equal(normalizeSlug('SP Cup 2026'), 'sp-cup-2026');
});
