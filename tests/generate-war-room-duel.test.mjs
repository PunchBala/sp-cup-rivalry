import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

import { appendGeneratedDuelToRoom, buildDuelPayloadFromManifest } from '../scripts/generate-war-room-duel.mjs';

async function readFixture(name) {
  const filePath = path.resolve(process.cwd(), 'fixtures', name);
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

test('buildDuelPayloadFromManifest creates duel records, entry records, and a share URL', () => {
  const payload = buildDuelPayloadFromManifest({
    roomSlug: 'sp-cup-2026',
    baseUrl: 'https://punchbala.github.io/sp-cup-rivalry/',
    duel: {
      label: 'Senthil vs Bala',
      visibility: 'public',
      state: 'draft',
      createdAt: '2026-04-05T19:00:00Z',
      updatedAt: '2026-04-05T19:05:00Z'
    },
    entries: [
      { displayName: 'Senthil', ownerId: 'senthil', picks: { orangeCap: 'KL Rahul' } },
      { displayName: 'Bala', ownerId: 'bala', picks: { orangeCap: 'Virat Kohli' } }
    ]
  });

  assert.equal(payload.duelId, 'senthil-vs-bala');
  assert.equal(payload.shareUrl, 'https://punchbala.github.io/sp-cup-rivalry/?room=sp-cup-2026&duel=senthil-vs-bala');
  assert.deepEqual(payload.fixturePayload.duelRecord.entryIds, ['senthil-vs-bala-senthil', 'senthil-vs-bala-bala']);
  assert.equal(payload.fixturePayload.entryRecords[0].duelId, 'senthil-vs-bala');
});

test('appendGeneratedDuelToRoom adds the generated duel into a record-backed room fixture', async () => {
  const room = await readFixture('war_room_sp_cup_2026.json');
  const [senthilSeed, vibeeshSeed] = room.entryRecords.slice(2, 4);
  const payload = buildDuelPayloadFromManifest({
    roomSlug: 'sp-cup-2026',
    duel: {
      label: 'Sai vs Bala',
      visibility: 'public',
      state: 'locked',
      createdAt: '2026-04-05T20:00:00Z',
      updatedAt: '2026-04-05T20:05:00Z'
    },
    entries: [
      {
        displayName: 'Sai',
        ownerId: 'sai',
        submittedAt: '2026-04-05T20:01:00Z',
        updatedAt: '2026-04-05T20:01:00Z',
        picks: { ...senthilSeed.picks }
      },
      {
        displayName: 'Bala',
        ownerId: 'bala',
        submittedAt: '2026-04-05T20:05:00Z',
        updatedAt: '2026-04-05T20:05:00Z',
        picks: { ...vibeeshSeed.picks }
      }
    ]
  });

  const next = appendGeneratedDuelToRoom(room, payload);
  assert.equal(next.duelRecords.length, room.duelRecords.length + 1);
  assert.equal(next.entryRecords.length, room.entryRecords.length + 2);
  assert.equal(next.duelRecords.at(-1).id, 'sai-vs-bala');
});

test('buildDuelPayloadFromManifest leaves optional entry timestamps unset when omitted', () => {
  const payload = buildDuelPayloadFromManifest({
    roomSlug: 'sp-cup-2026',
    duel: {
      label: 'Arun vs Bala',
      visibility: 'public',
      state: 'draft',
      createdAt: '2026-04-05T21:00:00Z'
    },
    entries: [
      { displayName: 'Arun', ownerId: 'arun', picks: { orangeCap: 'KL Rahul' } },
      { displayName: 'Bala', ownerId: 'bala', picks: { orangeCap: 'Virat Kohli' } }
    ]
  });

  assert.equal(payload.fixturePayload.entryRecords[0].submittedAt, null);
  assert.equal(payload.fixturePayload.entryRecords[0].updatedAt, null);
  assert.equal(payload.fixturePayload.entryRecords[1].submittedAt, null);
  assert.equal(payload.fixturePayload.entryRecords[1].updatedAt, null);
});
