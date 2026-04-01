const WARROOM_MODEL_VERSION = 1;
const VALID_TEMPLATE_IDS = ['rivalry-war-room-v1'];
const VALID_VISIBILITY = ['public', 'unlisted', 'private'];
const VALID_STATES = ['draft', 'locked'];
const VALID_DUEL_STATES = ['draft', 'locked'];
const VALID_CATEGORY_KEYS = [
  'titleWinner','orangeCap','mostSixes','purpleCap','mostDots','mvp','uncappedMvp','fairPlay','highestScoreTeam','striker','bestBowlingFigures','bestBowlingStrikeRate','mostCatches','tableBottom','leastMvp'
];

const VALID_TEMPLATE_ID_SET = new Set(VALID_TEMPLATE_IDS);
const VALID_VISIBILITY_SET = new Set(VALID_VISIBILITY);
const VALID_STATE_SET = new Set(VALID_STATES);
const VALID_DUEL_STATE_SET = new Set(VALID_DUEL_STATES);
const VALID_CATEGORY_KEY_SET = new Set(VALID_CATEGORY_KEYS);

function normalizeWhitespace(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function normalizeSlug(value) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isNonEmptyString(value) {
  return typeof value === 'string' && normalizeWhitespace(value).length > 0;
}

function pushError(errors, path, message) {
  errors.push(`${path}: ${message}`);
}

function validatePickObject(pickObject, path, errors, { requireCompletePicks }) {
  if (!pickObject || typeof pickObject !== 'object' || Array.isArray(pickObject)) {
    if (requireCompletePicks) pushError(errors, path, 'must be an object of category picks');
    return;
  }

  const seenKeys = Object.keys(pickObject);
  for (const key of seenKeys) {
    if (!VALID_CATEGORY_KEY_SET.has(key)) pushError(errors, `${path}.${key}`, 'is not a valid category key');
    const value = pickObject[key];
    if (value != null && typeof value !== 'string') pushError(errors, `${path}.${key}`, 'must be a string when provided');
  }

  if (!requireCompletePicks) return;
  for (const categoryKey of VALID_CATEGORY_KEYS) {
    if (!isNonEmptyString(pickObject[categoryKey])) pushError(errors, `${path}.${categoryKey}`, 'is required once the duel is locked');
  }
}

function validateEntry(entry, path, errors, warnings, { requireCompletePicks, seenEntryIds }) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    pushError(errors, path, 'must be an object');
    return;
  }

  const id = normalizeSlug(entry.id || '');
  const displayName = normalizeWhitespace(entry.displayName || entry.name || '');
  if (!id) pushError(errors, `${path}.id`, 'must be a non-empty slug');
  if (!displayName) pushError(errors, `${path}.displayName`, 'must be a non-empty string');
  if (id) {
    if (seenEntryIds.has(id)) pushError(errors, `${path}.id`, `duplicate entry id '${id}'`);
    seenEntryIds.add(id);
  }
  if (entry.ownerId != null && !isNonEmptyString(entry.ownerId)) pushError(errors, `${path}.ownerId`, 'must be a non-empty string when provided');
  validatePickObject(entry.picks, `${path}.picks`, errors, { requireCompletePicks });
  if (id && displayName && !id.includes(normalizeSlug(displayName).slice(0, 3))) {
    warnings.push(`${path}: entry id '${id}' is valid, but consider keeping duel-scoped ids human-readable`);
  }
}

function validateDuelArray(duels, errors, warnings) {
  if (!Array.isArray(duels) || duels.length < 1) {
    pushError(errors, 'duels', 'must contain at least 1 duel');
    return;
  }

  const duelIds = new Set();
  const seenEntryIds = new Set();

  duels.forEach((duel, index) => {
    const path = `duels[${index}]`;
    if (!duel || typeof duel !== 'object' || Array.isArray(duel)) {
      pushError(errors, path, 'must be an object');
      return;
    }
    const duelId = normalizeSlug(duel.id || '');
    if (!duelId) pushError(errors, `${path}.id`, 'must be a non-empty slug');
    if (duelId) {
      if (duelIds.has(duelId)) pushError(errors, `${path}.id`, `duplicate duel id '${duelId}'`);
      duelIds.add(duelId);
    }
    const duelState = duel.state || 'locked';
    if (!VALID_DUEL_STATE_SET.has(duelState)) pushError(errors, `${path}.state`, `must be one of: ${VALID_DUEL_STATES.join(', ')}`);
    const requireCompletePicks = duelState === 'locked';
    validateEntry(duel.a, `${path}.a`, errors, warnings, { requireCompletePicks, seenEntryIds });
    validateEntry(duel.b, `${path}.b`, errors, warnings, { requireCompletePicks, seenEntryIds });
    const label = normalizeWhitespace(duel.label || '');
    if (label && duel.a?.displayName && duel.b?.displayName) {
      const expectedLabel = `${normalizeWhitespace(duel.a.displayName)} vs ${normalizeWhitespace(duel.b.displayName)}`;
      if (label !== expectedLabel) warnings.push(`${path}.label: '${label}' differs from generated label '${expectedLabel}'`);
    }
    if (duel.a?.id && duel.b?.id && normalizeSlug(duel.a.id) === normalizeSlug(duel.b.id)) {
      pushError(errors, `${path}.b.id`, 'must differ from duel.a.id');
    }
  });
}

function validateWarRoomConfig(room) {
  const errors = [];
  const warnings = [];

  if (!room || typeof room !== 'object' || Array.isArray(room)) {
    return { ok: false, errors: ['war room: must be an object'], warnings };
  }

  if (Number(room.version) !== WARROOM_MODEL_VERSION) pushError(errors, 'version', `must be ${WARROOM_MODEL_VERSION}`);
  if (!isNonEmptyString(room.id)) pushError(errors, 'id', 'must be a non-empty string');
  if (!isNonEmptyString(room.name)) pushError(errors, 'name', 'must be a non-empty string');
  const slug = normalizeSlug(room.slug || '');
  if (!slug) pushError(errors, 'slug', 'must be a non-empty slug');
  if (!VALID_TEMPLATE_ID_SET.has(room.templateId)) pushError(errors, 'templateId', `must be one of: ${VALID_TEMPLATE_IDS.join(', ')}`);
  if (!VALID_VISIBILITY_SET.has(room.visibility)) pushError(errors, 'visibility', `must be one of: ${VALID_VISIBILITY.join(', ')}`);
  if (!VALID_STATE_SET.has(room.state)) pushError(errors, 'state', `must be one of: ${VALID_STATES.join(', ')}`);
  if (room.createdBy != null && !isNonEmptyString(room.createdBy)) pushError(errors, 'createdBy', 'must be a non-empty string when provided');
  if (room.settings != null && (typeof room.settings !== 'object' || Array.isArray(room.settings))) pushError(errors, 'settings', 'must be an object when provided');

  validateDuelArray(room.duels, errors, warnings);

  return { ok: errors.length === 0, errors, warnings };
}

function assertValidWarRoomConfig(room) {
  const result = validateWarRoomConfig(room);
  if (!result.ok) {
    throw new Error(['War room validation failed:', ...result.errors.map((line) => `- ${line}`)].join('\n'));
  }
  return room;
}

function normalizeWarRoomConfig(room) {
  assertValidWarRoomConfig(room);
  const cloned = deepClone(room);
  cloned.slug = normalizeSlug(cloned.slug);
  cloned.id = normalizeWhitespace(cloned.id);
  cloned.name = normalizeWhitespace(cloned.name);
  cloned.duels = cloned.duels.map((duel) => ({
    ...duel,
    id: normalizeSlug(duel.id),
    label: normalizeWhitespace(duel.label || `${duel.a.displayName} vs ${duel.b.displayName}`),
    a: {
      ...duel.a,
      id: normalizeSlug(duel.a.id),
      displayName: normalizeWhitespace(duel.a.displayName || duel.a.name),
      picks: deepClone(duel.a.picks || {})
    },
    b: {
      ...duel.b,
      id: normalizeSlug(duel.b.id),
      displayName: normalizeWhitespace(duel.b.displayName || duel.b.name),
      picks: deepClone(duel.b.picks || {})
    }
  }));
  return cloned;
}

function buildMatchupsFromWarRoom(room) {
  const normalized = normalizeWarRoomConfig(room);
  return normalized.duels.map((duel) => ({
    id: duel.id,
    label: duel.label || `${duel.a.displayName} vs ${duel.b.displayName}`,
    state: duel.state || 'locked',
    a: {
      name: duel.a.displayName,
      entryId: duel.a.id,
      ownerId: duel.a.ownerId || null,
      picks: deepClone(duel.a.picks || {})
    },
    b: {
      name: duel.b.displayName,
      entryId: duel.b.id,
      ownerId: duel.b.ownerId || null,
      picks: deepClone(duel.b.picks || {})
    }
  }));
}

function createLocalWarRoomAdapter(fixturesBySlug = {}) {
  const normalizedFixtures = Object.fromEntries(
    Object.entries(fixturesBySlug).map(([slug, room]) => [normalizeSlug(slug), normalizeWarRoomConfig(room)])
  );

  return {
    listWarRoomSlugs() { return Object.keys(normalizedFixtures).sort(); },
    loadWarRoomBySlug(slug) {
      const key = normalizeSlug(slug);
      const room = normalizedFixtures[key];
      if (!room) throw new Error(`War room fixture not found for slug '${slug}'`);
      return deepClone(room);
    },
    buildMatchups(slugOrRoom) {
      const room = typeof slugOrRoom === 'string' ? this.loadWarRoomBySlug(slugOrRoom) : slugOrRoom;
      return buildMatchupsFromWarRoom(room);
    }
  };
}

export {
  WARROOM_MODEL_VERSION,
  VALID_TEMPLATE_IDS,
  VALID_VISIBILITY,
  VALID_STATES,
  VALID_DUEL_STATES,
  VALID_CATEGORY_KEYS,
  normalizeWhitespace,
  normalizeSlug,
  deepClone,
  validateWarRoomConfig,
  assertValidWarRoomConfig,
  normalizeWarRoomConfig,
  buildMatchupsFromWarRoom,
  createLocalWarRoomAdapter
};
