(function(){
  const LEAGUE_MODEL_VERSION = 1;
  const VALID_TEMPLATE_IDS = ['ipl-classic-v1'];
  const VALID_VISIBILITY = ['public', 'unlisted', 'private'];
  const VALID_STATES = ['draft', 'locked'];
  const VALID_CATEGORY_KEYS = [
    'titleWinner','orangeCap','mostSixes','purpleCap','mostDots','mvp','uncappedMvp','fairPlay','highestScoreTeam','striker','bestBowlingFigures','bestBowlingStrikeRate','mostCatches','tableBottom','leastMvp'
  ];

  const VALID_TEMPLATE_ID_SET = new Set(VALID_TEMPLATE_IDS);
  const VALID_VISIBILITY_SET = new Set(VALID_VISIBILITY);
  const VALID_STATE_SET = new Set(VALID_STATES);
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

  function makePlayerId(name) {
    return normalizeSlug(name);
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

  function validatePlayerArray(players, errors, warnings) {
    if (!Array.isArray(players) || players.length < 2) {
      pushError(errors, 'players', 'must contain at least 2 players');
      return { playerIds: new Set() };
    }

    const playerIds = new Set();
    const playerNames = new Set();

    players.forEach((player, index) => {
      const path = `players[${index}]`;
      if (!player || typeof player !== 'object') {
        pushError(errors, path, 'must be an object');
        return;
      }

      const id = normalizeSlug(player.id || '');
      const name = normalizeWhitespace(player.name || '');

      if (!id) pushError(errors, `${path}.id`, 'must be a non-empty slug');
      if (!name) pushError(errors, `${path}.name`, 'must be a non-empty string');

      if (id) {
        if (playerIds.has(id)) pushError(errors, `${path}.id`, `duplicate player id '${id}'`);
        playerIds.add(id);
      }

      const loweredName = name.toLowerCase();
      if (loweredName) {
        if (playerNames.has(loweredName)) pushError(errors, `${path}.name`, `duplicate player name '${name}'`);
        playerNames.add(loweredName);
      }

      if (id && name) {
        const generatedId = makePlayerId(name);
        if (generatedId !== id) warnings.push(`${path}: id '${id}' does not match generated id '${generatedId}' from name`);
      }
    });

    return { playerIds };
  }

  function validatePickObject(pickObject, path, errors, { requireCompletePicks }) {
    if (!pickObject || typeof pickObject !== 'object' || Array.isArray(pickObject)) {
      pushError(errors, path, 'must be an object of category picks');
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
      if (!isNonEmptyString(pickObject[categoryKey])) pushError(errors, `${path}.${categoryKey}`, 'is required once the league is locked');
    }
  }

  function validateLeagueConfig(league, options = {}) {
    const errors = [];
    const warnings = [];
    const requireCompletePicks = options.requireCompletePicks ?? (league?.state === 'locked');

    if (!league || typeof league !== 'object' || Array.isArray(league)) {
      return { ok: false, errors: ['league: must be an object'], warnings };
    }

    if (Number(league.version) !== LEAGUE_MODEL_VERSION) pushError(errors, 'version', `must be ${LEAGUE_MODEL_VERSION}`);
    if (!isNonEmptyString(league.id)) pushError(errors, 'id', 'must be a non-empty string');
    if (!isNonEmptyString(league.name)) pushError(errors, 'name', 'must be a non-empty string');

    const slug = normalizeSlug(league.slug || '');
    if (!slug) pushError(errors, 'slug', 'must be a non-empty slug');
    if (league.id && slug && normalizeSlug(league.id) !== slug) warnings.push(`id '${league.id}' and slug '${league.slug}' normalize differently`);

    if (!VALID_TEMPLATE_ID_SET.has(league.templateId)) pushError(errors, 'templateId', `must be one of: ${VALID_TEMPLATE_IDS.join(', ')}`);
    if (!VALID_VISIBILITY_SET.has(league.visibility)) pushError(errors, 'visibility', `must be one of: ${VALID_VISIBILITY.join(', ')}`);
    if (!VALID_STATE_SET.has(league.state)) pushError(errors, 'state', `must be one of: ${VALID_STATES.join(', ')}`);

    const { playerIds } = validatePlayerArray(league.players, errors, warnings);

    if (!league.picks || typeof league.picks !== 'object' || Array.isArray(league.picks)) {
      pushError(errors, 'picks', 'must be an object keyed by player id');
    } else {
      for (const playerId of playerIds) validatePickObject(league.picks[playerId], `picks.${playerId}`, errors, { requireCompletePicks });
      for (const pickOwnerId of Object.keys(league.picks)) {
        if (!playerIds.has(pickOwnerId)) pushError(errors, `picks.${pickOwnerId}`, 'has no matching player in players[]');
      }
    }

    if (league.settings != null && (typeof league.settings !== 'object' || Array.isArray(league.settings))) pushError(errors, 'settings', 'must be an object when provided');

    return { ok: errors.length === 0, errors, warnings };
  }

  function assertValidLeagueConfig(league, options = {}) {
    const result = validateLeagueConfig(league, options);
    if (!result.ok) {
      throw new Error(['League validation failed:', ...result.errors.map((line) => `- ${line}`)].join('\n'));
    }
    return league;
  }

  function normalizeLeagueConfig(league) {
    assertValidLeagueConfig(league);
    const cloned = deepClone(league);
    cloned.slug = normalizeSlug(cloned.slug);
    cloned.id = normalizeWhitespace(cloned.id);
    cloned.name = normalizeWhitespace(cloned.name);
    cloned.players = cloned.players.map((player) => ({ ...player, id: normalizeSlug(player.id), name: normalizeWhitespace(player.name) }));
    return cloned;
  }

  function buildMatchupId(aId, bId) {
    return `${normalizeSlug(aId)}-${normalizeSlug(bId)}`;
  }

  function buildMatchupsFromLeague(league) {
    const normalized = normalizeLeagueConfig(league);
    const picksByPlayerId = normalized.picks || {};
    const matchups = [];
    for (let i = 0; i < normalized.players.length; i += 1) {
      for (let j = i + 1; j < normalized.players.length; j += 1) {
        const a = normalized.players[i];
        const b = normalized.players[j];
        matchups.push({
          id: buildMatchupId(a.id, b.id),
          label: `${a.name} vs ${b.name}`,
          a: { name: a.name, picks: deepClone(picksByPlayerId[a.id] || {}) },
          b: { name: b.name, picks: deepClone(picksByPlayerId[b.id] || {}) }
        });
      }
    }
    return matchups;
  }

  function createLocalLeagueAdapter(fixturesBySlug = {}) {
    const normalizedFixtures = Object.fromEntries(
      Object.entries(fixturesBySlug).map(([slug, league]) => [normalizeSlug(slug), normalizeLeagueConfig(league)])
    );

    return {
      listLeagueSlugs() { return Object.keys(normalizedFixtures).sort(); },
      loadLeagueBySlug(slug) {
        const key = normalizeSlug(slug);
        const league = normalizedFixtures[key];
        if (!league) throw new Error(`League fixture not found for slug '${slug}'`);
        return deepClone(league);
      },
      buildMatchups(slugOrLeague) {
        const league = typeof slugOrLeague === 'string' ? this.loadLeagueBySlug(slugOrLeague) : slugOrLeague;
        return buildMatchupsFromLeague(league);
      }
    };
  }

  window.WarRoomLeagueModel = {
    LEAGUE_MODEL_VERSION,
    VALID_TEMPLATE_IDS,
    VALID_VISIBILITY,
    VALID_STATES,
    VALID_CATEGORY_KEYS,
    normalizeWhitespace,
    normalizeSlug,
    makePlayerId,
    deepClone,
    validateLeagueConfig,
    assertValidLeagueConfig,
    normalizeLeagueConfig,
    buildMatchupId,
    buildMatchupsFromLeague,
    createLocalLeagueAdapter
  };
})();
