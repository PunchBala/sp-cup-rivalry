(function(){
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

function validateOptionalStringField(value, path, errors) {
  if (value != null && !isNonEmptyString(value)) pushError(errors, path, 'must be a non-empty string when provided');
}

function normalizeEntryRecord(entry = {}) {
  return {
    ...entry,
    id: normalizeSlug(entry.id),
    duelId: normalizeSlug(entry.duelId),
    displayName: normalizeWhitespace(entry.displayName || entry.name),
    ownerId: entry.ownerId != null ? normalizeWhitespace(entry.ownerId) : null,
    createdAt: isNonEmptyString(entry.createdAt) ? normalizeWhitespace(entry.createdAt) : null,
    updatedAt: isNonEmptyString(entry.updatedAt) ? normalizeWhitespace(entry.updatedAt) : null,
    submittedAt: isNonEmptyString(entry.submittedAt) ? normalizeWhitespace(entry.submittedAt) : null,
    picks: deepClone(entry.picks || {})
  };
}

function normalizeDuelRecord(duel = {}, roomVisibility = 'public') {
  return {
    ...duel,
    id: normalizeSlug(duel.id),
    label: normalizeWhitespace(duel.label || ''),
    visibility: duel.visibility || roomVisibility,
    state: duel.state || 'locked',
    createdAt: isNonEmptyString(duel.createdAt) ? normalizeWhitespace(duel.createdAt) : null,
    updatedAt: isNonEmptyString(duel.updatedAt) ? normalizeWhitespace(duel.updatedAt) : null,
    entryIds: Array.isArray(duel.entryIds) ? duel.entryIds.map((value) => normalizeSlug(value)) : []
  };
}

function buildDuelFromRecord(duelRecord, entryMap) {
  const [entryAId, entryBId] = duelRecord.entryIds;
  const entryA = entryMap.get(entryAId);
  const entryB = entryMap.get(entryBId);
  if (!entryA || !entryB) return null;

  const generatedLabel = `${entryA.displayName} vs ${entryB.displayName}`;
  return {
    id: duelRecord.id,
    label: normalizeWhitespace(duelRecord.label || generatedLabel),
    visibility: duelRecord.visibility || 'public',
    state: duelRecord.state || 'locked',
    createdAt: duelRecord.createdAt || null,
    updatedAt: duelRecord.updatedAt || null,
    a: {
      id: entryA.id,
      displayName: entryA.displayName,
      ownerId: entryA.ownerId || null,
      createdAt: entryA.createdAt || null,
      updatedAt: entryA.updatedAt || null,
      submittedAt: entryA.submittedAt || null,
      picks: deepClone(entryA.picks || {})
    },
    b: {
      id: entryB.id,
      displayName: entryB.displayName,
      ownerId: entryB.ownerId || null,
      createdAt: entryB.createdAt || null,
      updatedAt: entryB.updatedAt || null,
      submittedAt: entryB.submittedAt || null,
      picks: deepClone(entryB.picks || {})
    }
  };
}

function validateRecordBackedRoom(room, errors, warnings) {
  const duelRecords = Array.isArray(room.duelRecords) ? room.duelRecords : null;
  const entryRecords = Array.isArray(room.entryRecords) ? room.entryRecords : null;
  const duelStateById = new Map();
  const duelIds = new Set();

  if (!duelRecords || duelRecords.length < 1) {
    pushError(errors, 'duelRecords', 'must contain at least 1 duel record');
  } else {
    duelRecords.forEach((duel, index) => {
      const path = `duelRecords[${index}]`;
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
      if (duel.visibility != null && !VALID_VISIBILITY_SET.has(duel.visibility)) pushError(errors, `${path}.visibility`, `must be one of: ${VALID_VISIBILITY.join(', ')}`);
      const entryIds = Array.isArray(duel.entryIds) ? duel.entryIds.map((value) => normalizeSlug(value)) : [];
      if (entryIds.length !== 2) pushError(errors, `${path}.entryIds`, 'must contain exactly 2 entry ids');
      if (entryIds.some((value) => !value)) pushError(errors, `${path}.entryIds`, 'must contain only non-empty entry ids');
      if (new Set(entryIds).size !== entryIds.length) pushError(errors, `${path}.entryIds`, 'must reference 2 distinct entries');
      validateOptionalStringField(duel.label, `${path}.label`, errors);
      validateOptionalStringField(duel.createdAt, `${path}.createdAt`, errors);
      validateOptionalStringField(duel.updatedAt, `${path}.updatedAt`, errors);
      if (duelId) duelStateById.set(duelId, duelState);
    });
  }

  const entryMap = new Map();
  const seenEntryIds = new Set();

  if (!entryRecords || entryRecords.length < 1) {
    pushError(errors, 'entryRecords', 'must contain at least 2 entry records');
  } else {
    entryRecords.forEach((entry, index) => {
      const path = `entryRecords[${index}]`;
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        pushError(errors, path, 'must be an object');
        return;
      }
      const duelId = normalizeSlug(entry.duelId || '');
      const requireCompletePicks = duelStateById.get(duelId) === 'locked';
      validateEntry(entry, path, errors, warnings, { requireCompletePicks, seenEntryIds });
      if (!duelId) pushError(errors, `${path}.duelId`, 'must be a non-empty slug');
      if (duelId && !duelStateById.has(duelId)) pushError(errors, `${path}.duelId`, `references missing duel '${duelId}'`);
      validateOptionalStringField(entry.createdAt, `${path}.createdAt`, errors);
      validateOptionalStringField(entry.updatedAt, `${path}.updatedAt`, errors);
      validateOptionalStringField(entry.submittedAt, `${path}.submittedAt`, errors);
      const normalizedEntry = normalizeEntryRecord(entry);
      if (normalizedEntry.id) entryMap.set(normalizedEntry.id, normalizedEntry);
    });
  }

  const derivedDuels = (duelRecords || []).map((duel, index) => {
    const path = `duelRecords[${index}]`;
    const normalizedDuel = normalizeDuelRecord(duel, room.visibility);
    const [entryAId, entryBId] = normalizedDuel.entryIds;
    const entryA = entryMap.get(entryAId);
    const entryB = entryMap.get(entryBId);
    if (!entryA) pushError(errors, `${path}.entryIds`, `references missing entry '${entryAId || ''}'`);
    if (!entryB) pushError(errors, `${path}.entryIds`, `references missing entry '${entryBId || ''}'`);
    if (entryA && entryA.duelId !== normalizedDuel.id) pushError(errors, `${path}.entryIds`, `entry '${entryA.id}' belongs to duel '${entryA.duelId}' not '${normalizedDuel.id}'`);
    if (entryB && entryB.duelId !== normalizedDuel.id) pushError(errors, `${path}.entryIds`, `entry '${entryB.id}' belongs to duel '${entryB.duelId}' not '${normalizedDuel.id}'`);
    const duelObject = buildDuelFromRecord(normalizedDuel, entryMap);
    if (duelObject && normalizedDuel.label && duelObject.label !== `${duelObject.a.displayName} vs ${duelObject.b.displayName}`) {
      warnings.push(`${path}.label: '${duelObject.label}' differs from generated label '${duelObject.a.displayName} vs ${duelObject.b.displayName}'`);
    }
    return duelObject;
  }).filter(Boolean);

  validateDuelArray(derivedDuels, errors, warnings);
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
  const usesRecordBackedShape = Array.isArray(room.duelRecords) || Array.isArray(room.entryRecords);
  if (usesRecordBackedShape) {
    validateRecordBackedRoom(room, errors, warnings);
  } else {
    validateDuelArray(room.duels, errors, warnings);
  }

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
  const usesRecordBackedShape = Array.isArray(cloned.duelRecords) || Array.isArray(cloned.entryRecords);
  if (usesRecordBackedShape) {
    cloned.entryRecords = (cloned.entryRecords || []).map((entry) => normalizeEntryRecord(entry));
    cloned.duelRecords = (cloned.duelRecords || []).map((duel) => normalizeDuelRecord(duel, cloned.visibility));
    const entryMap = new Map(cloned.entryRecords.map((entry) => [entry.id, entry]));
    cloned.duels = cloned.duelRecords.map((duel) => buildDuelFromRecord(duel, entryMap)).filter(Boolean);
  } else {
    cloned.duels = cloned.duels.map((duel) => ({
      ...duel,
      id: normalizeSlug(duel.id),
      label: normalizeWhitespace(duel.label || `${duel.a.displayName} vs ${duel.b.displayName}`),
      visibility: duel.visibility || cloned.visibility,
      createdAt: isNonEmptyString(duel.createdAt) ? normalizeWhitespace(duel.createdAt) : null,
      updatedAt: isNonEmptyString(duel.updatedAt) ? normalizeWhitespace(duel.updatedAt) : null,
      a: {
        ...duel.a,
        id: normalizeSlug(duel.a.id),
        displayName: normalizeWhitespace(duel.a.displayName || duel.a.name),
        ownerId: duel.a.ownerId != null ? normalizeWhitespace(duel.a.ownerId) : null,
        createdAt: isNonEmptyString(duel.a.createdAt) ? normalizeWhitespace(duel.a.createdAt) : null,
        updatedAt: isNonEmptyString(duel.a.updatedAt) ? normalizeWhitespace(duel.a.updatedAt) : null,
        submittedAt: isNonEmptyString(duel.a.submittedAt) ? normalizeWhitespace(duel.a.submittedAt) : null,
        picks: deepClone(duel.a.picks || {})
      },
      b: {
        ...duel.b,
        id: normalizeSlug(duel.b.id),
        displayName: normalizeWhitespace(duel.b.displayName || duel.b.name),
        ownerId: duel.b.ownerId != null ? normalizeWhitespace(duel.b.ownerId) : null,
        createdAt: isNonEmptyString(duel.b.createdAt) ? normalizeWhitespace(duel.b.createdAt) : null,
        updatedAt: isNonEmptyString(duel.b.updatedAt) ? normalizeWhitespace(duel.b.updatedAt) : null,
        submittedAt: isNonEmptyString(duel.b.submittedAt) ? normalizeWhitespace(duel.b.submittedAt) : null,
        picks: deepClone(duel.b.picks || {})
      }
    }));
    cloned.entryRecords = cloned.duels.flatMap((duel) => ([
      {
        id: duel.a.id,
        duelId: duel.id,
        ownerId: duel.a.ownerId || null,
        displayName: duel.a.displayName,
        createdAt: duel.a.createdAt || null,
        updatedAt: duel.a.updatedAt || null,
        submittedAt: duel.a.submittedAt || null,
        picks: deepClone(duel.a.picks || {})
      },
      {
        id: duel.b.id,
        duelId: duel.id,
        ownerId: duel.b.ownerId || null,
        displayName: duel.b.displayName,
        createdAt: duel.b.createdAt || null,
        updatedAt: duel.b.updatedAt || null,
        submittedAt: duel.b.submittedAt || null,
        picks: deepClone(duel.b.picks || {})
      }
    ]));
    cloned.duelRecords = cloned.duels.map((duel) => ({
      id: duel.id,
      label: duel.label,
      visibility: duel.visibility || cloned.visibility,
      state: duel.state || 'locked',
      createdAt: duel.createdAt || null,
      updatedAt: duel.updatedAt || null,
      entryIds: [duel.a.id, duel.b.id]
    }));
  }
  return cloned;
}

function buildMatchupsFromWarRoom(room) {
  const normalized = normalizeWarRoomConfig(room);
  return normalized.duels.map((duel) => ({
    id: duel.id,
    label: duel.label || `${duel.a.displayName} vs ${duel.b.displayName}`,
    state: duel.state || 'locked',
    visibility: duel.visibility || normalized.visibility || 'public',
    createdAt: duel.createdAt || null,
    updatedAt: duel.updatedAt || null,
    a: {
      name: duel.a.displayName,
      entryId: duel.a.id,
      ownerId: duel.a.ownerId || null,
      submittedAt: duel.a.submittedAt || null,
      picks: deepClone(duel.a.picks || {})
    },
    b: {
      name: duel.b.displayName,
      entryId: duel.b.id,
      ownerId: duel.b.ownerId || null,
      submittedAt: duel.b.submittedAt || null,
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

  window.WarRoomRoomModel = {
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
})();
