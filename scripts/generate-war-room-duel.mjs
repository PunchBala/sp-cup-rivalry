import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { normalizeSlug, normalizeWhitespace, validateWarRoomConfig } from '../warroom-room-model.mjs';

const DEFAULT_BASE_URL = 'https://punchbala.github.io/sp-cup-rivalry/';

function usage() {
  return [
    'Usage: node scripts/generate-war-room-duel.mjs <manifest.json> [--room <fixture.json>] [--base-url <url>] [--write]',
    '',
    'Default behavior prints a duel id, share URL, and fixture payload (one duelRecord + two entryRecords).',
    'Add --write to append the generated duel into the selected room fixture after validation.'
  ].join('\n');
}

function assertNonEmptyString(value, label) {
  const normalized = normalizeWhitespace(value || '');
  if (!normalized) throw new Error(`${label} must be a non-empty string`);
  return normalized;
}

async function readJson(filePath) {
  const abs = path.resolve(process.cwd(), filePath);
  return JSON.parse(await fs.readFile(abs, 'utf8'));
}

async function pathExists(filePath) {
  try {
    await fs.access(path.resolve(process.cwd(), filePath));
    return true;
  } catch {
    return false;
  }
}

export function guessRoomFixturePath(roomSlug) {
  return `fixtures/war_room_${normalizeSlug(roomSlug).replace(/-/g, '_')}.json`;
}

function normalizeManifestEntry(entry, duelId, index, seenEntryIds) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    throw new Error(`entries[${index}] must be an object`);
  }

  const displayName = assertNonEmptyString(entry.displayName || entry.name, `entries[${index}].displayName`);
  const ownerId = assertNonEmptyString(entry.ownerId || normalizeSlug(displayName), `entries[${index}].ownerId`);
  const entrySeed = normalizeSlug(entry.entryId || ownerId || displayName) || `entry-${index + 1}`;
  let entryId = `${duelId}-${entrySeed}`;
  let suffix = 2;
  while (seenEntryIds.has(entryId)) {
    entryId = `${duelId}-${entrySeed}-${suffix}`;
    suffix += 1;
  }
  seenEntryIds.add(entryId);

  const picks = entry.picks && typeof entry.picks === 'object' && !Array.isArray(entry.picks)
    ? JSON.parse(JSON.stringify(entry.picks))
    : {};
  const submittedAt = normalizeWhitespace(entry.submittedAt || entry.updatedAt || '');
  const updatedAt = normalizeWhitespace(entry.updatedAt || entry.submittedAt || '');

  return {
    id: entryId,
    duelId,
    displayName,
    ownerId,
    submittedAt: submittedAt || null,
    updatedAt: updatedAt || null,
    picks
  };
}

export function buildDuelPayloadFromManifest(manifest, options = {}) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new Error('manifest must be a JSON object');
  }

  const roomSlug = normalizeSlug(options.roomSlug || manifest.roomSlug || manifest.room?.slug || '');
  if (!roomSlug) throw new Error('manifest.roomSlug must be a non-empty slug');

  const baseUrl = assertNonEmptyString(options.baseUrl || manifest.baseUrl || DEFAULT_BASE_URL, 'baseUrl');
  const duelInput = manifest.duel && typeof manifest.duel === 'object' && !Array.isArray(manifest.duel) ? manifest.duel : {};
  const entries = Array.isArray(manifest.entries) ? manifest.entries : [];
  if (entries.length !== 2) throw new Error('manifest.entries must contain exactly 2 entry objects');

  const label = assertNonEmptyString(
    duelInput.label || `${entries[0]?.displayName || entries[0]?.name || 'Entry 1'} vs ${entries[1]?.displayName || entries[1]?.name || 'Entry 2'}`,
    'duel.label'
  );
  const duelId = normalizeSlug(duelInput.id || label);
  if (!duelId) throw new Error('duel id could not be generated from the manifest');

  const createdAt = normalizeWhitespace(duelInput.createdAt || manifest.createdAt || new Date().toISOString());
  const updatedAt = normalizeWhitespace(duelInput.updatedAt || manifest.updatedAt || createdAt);
  const visibility = normalizeWhitespace(duelInput.visibility || manifest.visibility || 'public');
  const state = normalizeWhitespace(duelInput.state || manifest.state || 'locked');

  const seenEntryIds = new Set();
  const entryRecords = entries.map((entry, index) => normalizeManifestEntry(entry, duelId, index, seenEntryIds));
  const duelRecord = {
    id: duelId,
    label,
    visibility,
    state,
    createdAt,
    updatedAt,
    entryIds: entryRecords.map((entry) => entry.id)
  };

  const shareUrl = new URL(`?room=${roomSlug}&duel=${duelId}`, baseUrl).toString();
  return {
    roomSlug,
    duelId,
    shareUrl,
    fixturePayload: {
      duelRecord,
      entryRecords
    }
  };
}

export function appendGeneratedDuelToRoom(room, payload) {
  const nextRoom = JSON.parse(JSON.stringify(room));
  nextRoom.duelRecords = Array.isArray(nextRoom.duelRecords) ? nextRoom.duelRecords : [];
  nextRoom.entryRecords = Array.isArray(nextRoom.entryRecords) ? nextRoom.entryRecords : [];

  if (nextRoom.duelRecords.some((duel) => normalizeSlug(duel.id) === payload.duelId)) {
    throw new Error(`room already contains duel '${payload.duelId}'`);
  }

  const existingEntryIds = new Set(nextRoom.entryRecords.map((entry) => normalizeSlug(entry.id)));
  for (const entry of payload.fixturePayload.entryRecords) {
    if (existingEntryIds.has(normalizeSlug(entry.id))) {
      throw new Error(`room already contains entry '${entry.id}'`);
    }
  }

  nextRoom.duelRecords.push(payload.fixturePayload.duelRecord);
  nextRoom.entryRecords.push(...payload.fixturePayload.entryRecords);

  const validation = validateWarRoomConfig(nextRoom);
  if (!validation.ok) {
    throw new Error(`generated room failed validation: ${validation.errors.join(' | ')}`);
  }

  return nextRoom;
}

function parseArgs(argv) {
  const args = [...argv];
  const options = {
    manifestPath: null,
    roomPath: null,
    baseUrl: null,
    write: false
  };

  while (args.length) {
    const current = args.shift();
    if (current === '--write') {
      options.write = true;
      continue;
    }
    if (current === '--room') {
      options.roomPath = args.shift() || null;
      continue;
    }
    if (current === '--base-url') {
      options.baseUrl = args.shift() || null;
      continue;
    }
    if (!options.manifestPath) {
      options.manifestPath = current;
      continue;
    }
    throw new Error(`Unknown argument: ${current}`);
  }

  if (!options.manifestPath) throw new Error(usage());
  return options;
}

export async function runGenerateWarRoomDuel(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const manifest = await readJson(options.manifestPath);
  const payload = buildDuelPayloadFromManifest(manifest, { baseUrl: options.baseUrl });
  const roomPath = options.roomPath || manifest.roomFixture || guessRoomFixturePath(payload.roomSlug);
  const roomExists = await pathExists(roomPath);

  let roomUpdated = false;
  let updatedRoom = null;

  if (roomExists) {
    const room = await readJson(roomPath);
    updatedRoom = appendGeneratedDuelToRoom(room, payload);
    if (options.write) {
      await fs.writeFile(path.resolve(process.cwd(), roomPath), `${JSON.stringify(updatedRoom, null, 2)}\n`, 'utf8');
      roomUpdated = true;
    }
  } else if (options.write) {
    throw new Error(`room fixture not found: ${roomPath}`);
  }

  const result = {
    duelId: payload.duelId,
    shareUrl: payload.shareUrl,
    roomSlug: payload.roomSlug,
    roomFixture: roomPath,
    fixturePayload: payload.fixturePayload,
    roomUpdated
  };

  if (updatedRoom) {
    result.roomSummary = {
      duelCount: Array.isArray(updatedRoom.duelRecords) ? updatedRoom.duelRecords.length : 0,
      entryCount: Array.isArray(updatedRoom.entryRecords) ? updatedRoom.entryRecords.length : 0
    };
  }

  return result;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  runGenerateWarRoomDuel()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error(error.message || error);
      process.exit(1);
    });
}
