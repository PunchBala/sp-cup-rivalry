import {
  ENGINE_VERSION as PRICING_ENGINE_VERSION,
  calculateEligiblePercentiles,
  computeAdjustedScore,
  computeLastMatchPoints,
  computeRecentAveragePoints,
  computeReliabilityFactor,
  computeScoreBasis,
  computeSeasonAveragePoints,
  generatePrices,
  mapPercentileToPrice,
  roundTo
} from './pricing-engine.js';

export const MINI_FANTASY_ENGINE_VERSION = 'mini_fantasy_v1';
export const MINI_FANTASY_PRICE_BOOK_VERSION = 'mini_fantasy_price_book_v1';
export const MINI_FANTASY_SEASON = 'IPL 2026';
export const MINI_FANTASY_LAUNCH_AT_UTC = '2026-04-08T00:00:00Z';
export const MINI_FANTASY_FIRST_OPEN_MATCH_NO = 14;
export const MINI_FANTASY_TEAM_SIZE = 4;
export const MINI_FANTASY_BUDGET = 30;
export const MINI_FANTASY_CAPTAIN_MULTIPLIER = 1.5;
export const MINI_FANTASY_LOCK_OFFSET_MINUTES = 1;

export const TEAM_CODE_TO_NAME = Object.freeze({
  MI: 'Mumbai Indians',
  RCB: 'Royal Challengers Bengaluru',
  CSK: 'Chennai Super Kings',
  SRH: 'Sunrisers Hyderabad',
  LSG: 'Lucknow Super Giants',
  GT: 'Gujarat Titans',
  DC: 'Delhi Capitals',
  PBKS: 'Punjab Kings',
  RR: 'Rajasthan Royals',
  KKR: 'Kolkata Knight Riders'
});

export const TEAM_NAME_TO_CODE = Object.freeze(
  Object.fromEntries(Object.entries(TEAM_CODE_TO_NAME).map(([code, name]) => [name, code]))
);

const DEFAULT_PRICE_JOB_META = Object.freeze({
  price_min: 4,
  price_max: 10,
  recent_matches_window: 3,
  max_daily_price_step: 1,
  default_initial_price: 6,
  scoring_source: 'existing_mvp_points_formula_v1',
  notes: 'Daily pricing refresh after all completed matches for the day'
});

const ROLE_OVERRIDES = Object.freeze({
  CSK: Object.freeze({
    'matthew william short': 'batter',
    'aman khan': 'all_rounder',
    'zak foulkes': 'all_rounder',
    'spencer johnson': 'bowler'
  }),
  DC: Object.freeze({
    'prithvi shaw': 'batter',
    'ajay mandal': 'all_rounder',
    'auqib nabi': 'all_rounder',
    'lungisani ngidi': 'bowler'
  }),
  GT: Object.freeze({
    'mohd arshad khan': 'all_rounder',
    'sai kishore': 'bowler',
    'gurnoor singh brar': 'all_rounder',
    'kulwant khejroliya': 'bowler'
  }),
  KKR: Object.freeze({
    'tejasvi singh': 'wicket_keeper',
    'blessing muzarabani': 'bowler',
    'saurabh dubey': 'bowler',
    'navdeep saini': 'bowler'
  }),
  LSG: Object.freeze({
    'shahbaz ahamad': 'all_rounder',
    'mohammad shami': 'bowler',
    'm siddharth': 'bowler',
    'digvesh singh': 'bowler',
    'akash singh': 'bowler',
    'mayank yadav': 'bowler'
  }),
  MI: Object.freeze({
    'surya kumar yadav': 'batter',
    'n tilak varma': 'batter',
    'raj angad bawa': 'all_rounder',
    'mohammad izhar': 'bowler',
    'allah ghazanfar': 'bowler'
  }),
  PBKS: Object.freeze({
    'harnoor pannu': 'batter',
    'mitch owen': 'all_rounder',
    'vyshak vijaykumar': 'bowler',
    'pravin dubey': 'bowler'
  }),
  RR: Object.freeze({
    'vaibhav suryavanshi': 'batter',
    'lhuan dre pretorious': 'wicket_keeper',
    'dasun shanaka': 'all_rounder'
  }),
  RCB: Object.freeze({
    'phil salt': 'wicket_keeper',
    'rasikh dar': 'bowler'
  }),
  SRH: Object.freeze({
    'david payne': 'bowler'
  })
});

function toNumber(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

export function normalizeWhitespace(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

export function normalizeName(value) {
  return normalizeWhitespace(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .toLowerCase()
    .trim();
}

export function slugify(value) {
  return normalizeWhitespace(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function buildMiniFantasyPlayerId(teamCode, playerName) {
  return `${String(teamCode || '').toLowerCase()}_${slugify(playerName)}`;
}

export function currentRoleOverride(teamCode, playerName) {
  const teamOverrides = ROLE_OVERRIDES[String(teamCode || '').toUpperCase()] || {};
  return teamOverrides[normalizeName(playerName)] || null;
}

function tokenizeName(value) {
  return normalizeName(value).split(' ').filter(Boolean);
}

function tokenOverlapScore(a, b) {
  const tokensA = tokenizeName(a);
  const tokensB = tokenizeName(b);
  if (!tokensA.length || !tokensB.length) return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  let shared = 0;
  setA.forEach((token) => {
    if (setB.has(token)) shared += 1;
  });
  return shared / Math.max(setA.size, setB.size);
}

function resolveRoleFromTeamMap(teamCode, playerName, teamMap = {}) {
  const override = currentRoleOverride(teamCode, playerName);
  if (override) return override;

  const normalized = normalizeName(playerName);
  if (teamMap[normalized]) return teamMap[normalized];

  const entries = Object.entries(teamMap);
  let best = null;
  entries.forEach(([candidateName, role]) => {
    const score = tokenOverlapScore(candidateName, normalized);
    if (score < 0.5) return;
    if (!best || score > best.score) {
      best = { role, score };
    }
  });

  return best?.role || null;
}

export function buildTeamRoleLookup(teamRolesData = {}) {
  const teams = teamRolesData?.teams || {};
  return Object.fromEntries(
    Object.entries(teams).map(([teamCode, teamEntry]) => [
      teamCode,
      Object.fromEntries(
        Object.entries(teamEntry?.players || {}).map(([playerName, role]) => [normalizeName(playerName), role])
      )
    ])
  );
}

export function resolveFixtureTeamCode(value) {
  if (!value) return '';
  const directCode = String(value || '').toUpperCase();
  if (TEAM_CODE_TO_NAME[directCode]) return directCode;
  return TEAM_NAME_TO_CODE[normalizeWhitespace(value)] || '';
}

export function getFixtureDateKeyLocal(date, locale = undefined) {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

export function getLaunchStatus(schedule = [], now = new Date(), options = {}) {
  const launchAtUtc = options.launch_at_utc || MINI_FANTASY_LAUNCH_AT_UTC;
  const firstOpenMatchNo = Number(options.first_open_match_no || MINI_FANTASY_FIRST_OPEN_MATCH_NO);
  const launchMs = Date.parse(launchAtUtc);
  const nextLaunchFixture = (Array.isArray(schedule) ? schedule : []).find((fixture) => Number(fixture.match_no) >= firstOpenMatchNo) || null;
  const isLive = Number.isFinite(launchMs) ? now.getTime() >= launchMs : true;
  return {
    is_live: isLive,
    launch_at_utc: launchAtUtc,
    first_open_match_no: firstOpenMatchNo,
    next_launch_fixture: nextLaunchFixture
  };
}

export function getMiniFantasyOpenFixtures(schedule = [], now = new Date(), options = {}) {
  const firstOpenMatchNo = Number(options.first_open_match_no || MINI_FANTASY_FIRST_OPEN_MATCH_NO);
  const lockOffsetMinutes = Number(options.lock_offset_minutes || MINI_FANTASY_LOCK_OFFSET_MINUTES);
  const launchStatus = getLaunchStatus(schedule, now, options);
  const todayKey = getFixtureDateKeyLocal(now);
  const tomorrow = new Date(now.getTime());
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = getFixtureDateKeyLocal(tomorrow);

  const candidates = (Array.isArray(schedule) ? schedule : [])
    .filter((fixture) => Number(fixture.match_no) >= firstOpenMatchNo)
    .map((fixture) => {
      const startMs = Date.parse(fixture.datetime_utc || '');
      const lockMs = startMs - lockOffsetMinutes * 60 * 1000;
      const fixtureDate = Number.isFinite(startMs) ? new Date(startMs) : null;
      const dateKey = fixtureDate ? getFixtureDateKeyLocal(fixtureDate) : '';
      return {
        ...fixture,
        home_team_code: resolveFixtureTeamCode(fixture.home_team),
        away_team_code: resolveFixtureTeamCode(fixture.away_team),
        starts_at_utc: fixture.datetime_utc || null,
        locks_at_utc: Number.isFinite(lockMs) ? new Date(lockMs).toISOString() : null,
        is_today: dateKey === todayKey,
        is_tomorrow: dateKey === tomorrowKey,
        is_locked: !Number.isFinite(lockMs) || now.getTime() >= lockMs
      };
    })
    .filter((fixture) => fixture.is_today || fixture.is_tomorrow)
    .filter((fixture) => !fixture.is_locked)
    .sort((a, b) => Date.parse(a.datetime_utc || '') - Date.parse(b.datetime_utc || ''));

  return {
    launch: launchStatus,
    fixtures: launchStatus.is_live ? candidates : []
  };
}

export function deriveCompletedMatchHistories(liveData = {}, schedule = []) {
  const scoreHistory = Array.isArray(liveData?.meta?.scoreHistory) ? liveData.meta.scoreHistory : [];
  const ordered = [...scoreHistory].sort((a, b) => Number(a.processedMatchCount || 0) - Number(b.processedMatchCount || 0));
  const histories = new Map();
  let previousPlayerMatches = {};
  let previousScores = {};

  function ensureHistory(playerName) {
    const canonical = normalizeName(playerName);
    if (!histories.has(canonical)) {
      histories.set(canonical, {
        player_name: playerName,
        match_points: [],
        matches_played: 0,
        last_match_played_at_utc: null
      });
    }
    return histories.get(canonical);
  }

  ordered.forEach((entry) => {
    const snapshot = entry?.snapshot || {};
    const currentPlayerMatches = snapshot?.meta?.aggregates?.playerMatches || {};
    const currentScoreValues = snapshot?.mvp?.values || {};
    const scoreLookup = Object.fromEntries(
      Object.entries(currentScoreValues).map(([playerName, payload]) => [playerName, toNumber(payload?.score, 0)])
    );
    const allNames = new Set([
      ...Object.keys(previousPlayerMatches),
      ...Object.keys(currentPlayerMatches),
      ...Object.keys(previousScores),
      ...Object.keys(scoreLookup)
    ]);
    const matchNo = Number(entry?.processedMatchCount || 0);
    const scheduledFixture = (Array.isArray(schedule) ? schedule : []).find((fixture) => Number(fixture.match_no) === matchNo) || null;
    const playedAt = scheduledFixture?.datetime_utc || entry?.fetchedAt || null;

    allNames.forEach((playerName) => {
      const currentMatches = toNumber(currentPlayerMatches[playerName], 0);
      const previousMatches = toNumber(previousPlayerMatches[playerName], 0);
      const matchDelta = currentMatches - previousMatches;
      if (matchDelta <= 0) return;

      const currentScore = toNumber(scoreLookup[playerName], 0);
      const previousScore = toNumber(previousScores[playerName], 0);
      const scoreDelta = roundTo(currentScore - previousScore, 2);
      const history = ensureHistory(playerName);
      for (let step = 0; step < matchDelta; step += 1) {
        history.match_points.push(step === 0 ? scoreDelta : 0);
      }
      history.matches_played += matchDelta;
      history.last_match_played_at_utc = playedAt;
    });

    previousPlayerMatches = currentPlayerMatches;
    previousScores = scoreLookup;
  });

  return histories;
}

export function seedInitialPriceMap(players = [], jobMeta = DEFAULT_PRICE_JOB_META) {
  const eligiblePlayers = (Array.isArray(players) ? players : [])
    .filter((player) => player.pricing_eligible)
    .map((player) => {
      const seasonAveragePoints = computeSeasonAveragePoints(player.match_points || []);
      const recentAveragePoints = computeRecentAveragePoints(player.match_points || [], jobMeta.recent_matches_window);
      const scoreBasis = computeScoreBasis(recentAveragePoints, seasonAveragePoints);
      const reliabilityFactor = computeReliabilityFactor(player.matches_played || 0);
      const adjustedScore = computeAdjustedScore(scoreBasis, reliabilityFactor);
      return {
        player_id: player.player_id,
        adjusted_score: adjustedScore
      };
    });
  const percentiles = calculateEligiblePercentiles(eligiblePlayers);
  const seedMap = new Map();
  (Array.isArray(players) ? players : []).forEach((player) => {
    if (!player.pricing_eligible || !Number(player.matches_played || 0)) {
      seedMap.set(player.player_id, jobMeta.default_initial_price);
      return;
    }
    const percentile = percentiles.get(player.player_id) ?? 0;
    seedMap.set(player.player_id, mapPercentileToPrice(percentile));
  });
  return seedMap;
}

function buildPreviousPriceMap(previousPriceBook = null) {
  const map = new Map();
  const players = Array.isArray(previousPriceBook?.players) ? previousPriceBook.players : [];
  players.forEach((player) => {
    map.set(player.player_id, player);
  });
  return map;
}

export function buildPricingJobFromLiveData({
  liveData = {},
  schedule = [],
  squads = {},
  teamRoles = {},
  previousPriceBook = null,
  asOfUtc = new Date().toISOString(),
  season = MINI_FANTASY_SEASON,
  jobMeta = {}
} = {}) {
  const effectiveMeta = {
    season,
    as_of_utc: asOfUtc,
    ...DEFAULT_PRICE_JOB_META,
    ...(jobMeta || {})
  };
  const roleLookup = buildTeamRoleLookup(teamRoles);
  const previousPrices = buildPreviousPriceMap(previousPriceBook);
  const historyMap = deriveCompletedMatchHistories(liveData, schedule);

  const players = [];
  Object.entries(squads || {}).forEach(([teamCode, squadPlayers]) => {
    (Array.isArray(squadPlayers) ? squadPlayers : []).forEach((playerName) => {
      const canonicalName = normalizeName(playerName);
      const history = historyMap.get(canonicalName) || {
        match_points: [],
        matches_played: 0,
        last_match_played_at_utc: null
      };
      const role = resolveRoleFromTeamMap(teamCode, playerName, roleLookup[teamCode] || {});
      const playerId = buildMiniFantasyPlayerId(teamCode, playerName);
      const previous = previousPrices.get(playerId);
      players.push({
        player_id: playerId,
        name: playerName,
        team: teamCode,
        role: role || 'batter',
        pricing_eligible: Boolean(role),
        old_price: Number.isFinite(previous?.final_price) ? previous.final_price : null,
        initial_price: Number.isFinite(previous?.final_price) ? previous.final_price : null,
        match_points: [...(history.match_points || [])],
        matches_played: Number(history.matches_played || 0),
        last_match_played_at_utc: history.last_match_played_at_utc || null
      });
    });
  });

  const seededInitialPrices = seedInitialPriceMap(players, effectiveMeta);
  players.forEach((player) => {
    if (player.old_price == null && player.initial_price == null) {
      player.initial_price = seededInitialPrices.get(player.player_id) ?? effectiveMeta.default_initial_price;
    }
  });

  return {
    job_meta: effectiveMeta,
    players
  };
}

export function generateMiniFantasyPriceBook(options = {}) {
  const input = buildPricingJobFromLiveData(options);
  const output = generatePrices(input);
  return {
    job_meta: {
      ...output.job_meta,
      engine_version: MINI_FANTASY_PRICE_BOOK_VERSION,
      pricing_engine_version: PRICING_ENGINE_VERSION,
      launch_at_utc: MINI_FANTASY_LAUNCH_AT_UTC,
      first_open_match_no: MINI_FANTASY_FIRST_OPEN_MATCH_NO
    },
    summary: output.summary,
    players: output.players,
    generated_at_utc: output.generated_at_utc
  };
}

export function buildPriceMap(priceBook = {}) {
  const map = new Map();
  (Array.isArray(priceBook?.players) ? priceBook.players : []).forEach((player) => {
    map.set(player.player_id, player);
  });
  return map;
}

export function buildFixturePlayerPool({
  fixture,
  priceBook = null,
  squads = {},
  teamRoles = {}
} = {}) {
  if (!fixture) return [];
  const teamCodes = [fixture.home_team_code || resolveFixtureTeamCode(fixture.home_team), fixture.away_team_code || resolveFixtureTeamCode(fixture.away_team)]
    .filter(Boolean);
  const roleLookup = buildTeamRoleLookup(teamRoles);
  const priceMap = buildPriceMap(priceBook);

  return teamCodes.flatMap((teamCode) => {
    const squadPlayers = Array.isArray(squads?.[teamCode]) ? squads[teamCode] : [];
    return squadPlayers.map((playerName) => {
      const playerId = buildMiniFantasyPlayerId(teamCode, playerName);
      const price = priceMap.get(playerId);
      const role = resolveRoleFromTeamMap(teamCode, playerName, roleLookup[teamCode] || {});
      return {
        player_id: playerId,
        name: playerName,
        team: teamCode,
        team_name: TEAM_CODE_TO_NAME[teamCode] || teamCode,
        role: role || 'batter',
        pricing_eligible: price?.pricing_eligible ?? Boolean(role),
        final_price: Number.isFinite(price?.final_price) ? price.final_price : DEFAULT_PRICE_JOB_META.default_initial_price,
        old_price: price?.old_price ?? null,
        matches_played: Number(price?.matches_played || 0),
        adjusted_score: Number(price?.adjusted_score || 0),
        last_match_played_at_utc: price?.last_match_played_at_utc || null
      };
    });
  })
    .filter((player) => player.pricing_eligible)
    .sort((a, b) => a.team.localeCompare(b.team) || b.final_price - a.final_price || a.name.localeCompare(b.name));
}

export function buildEntryPriceSnapshot(playerPool = []) {
  return Object.fromEntries(
    (Array.isArray(playerPool) ? playerPool : []).map((player) => [
      player.player_id,
      {
        player_id: player.player_id,
        name: player.name,
        team: player.team,
        role: player.role,
        final_price: player.final_price,
        pricing_eligible: player.pricing_eligible
      }
    ])
  );
}

export function applyPriceSnapshotToPool(playerPool = [], priceSnapshot = {}) {
  if (!priceSnapshot || typeof priceSnapshot !== 'object' || !Object.keys(priceSnapshot).length) {
    return Array.isArray(playerPool) ? [...playerPool] : [];
  }
  return (Array.isArray(playerPool) ? playerPool : []).map((player) => {
    const snap = priceSnapshot[player.player_id];
    if (!snap) return player;
    return {
      ...player,
      final_price: Number.isFinite(snap.final_price) ? snap.final_price : player.final_price,
      pricing_eligible: snap.pricing_eligible ?? player.pricing_eligible
    };
  });
}

export function isFixtureLocked(fixture, now = new Date(), lockOffsetMinutes = MINI_FANTASY_LOCK_OFFSET_MINUTES) {
  const startMs = Date.parse(fixture?.datetime_utc || fixture?.starts_at_utc || '');
  if (!Number.isFinite(startMs)) return true;
  return now.getTime() >= (startMs - lockOffsetMinutes * 60 * 1000);
}

export function validateMiniFantasyEntry({
  fixture,
  selectedPlayerIds = [],
  captainPlayerId = '',
  playerPool = [],
  budget = MINI_FANTASY_BUDGET
} = {}) {
  const errors = [];
  const poolById = new Map((Array.isArray(playerPool) ? playerPool : []).map((player) => [player.player_id, player]));
  const uniqueSelectedIds = [...new Set((Array.isArray(selectedPlayerIds) ? selectedPlayerIds : []).filter(Boolean))];
  const selectedPlayers = uniqueSelectedIds.map((playerId) => poolById.get(playerId)).filter(Boolean);

  if (uniqueSelectedIds.length !== MINI_FANTASY_TEAM_SIZE) {
    errors.push(`Pick exactly ${MINI_FANTASY_TEAM_SIZE} players.`);
  }

  if (selectedPlayers.length !== uniqueSelectedIds.length) {
    errors.push('All selected players must come from the fixture pool.');
  }

  if (!captainPlayerId || !uniqueSelectedIds.includes(captainPlayerId)) {
    errors.push('Choose one captain from your four picks.');
  }

  const totalCost = roundTo(selectedPlayers.reduce((sum, player) => sum + Number(player.final_price || 0), 0), 2);
  if (totalCost > budget) {
    errors.push(`Squad budget exceeded: ${totalCost} / ${budget} credits.`);
  }

  const fixtureTeams = new Set([
    fixture?.home_team_code || resolveFixtureTeamCode(fixture?.home_team),
    fixture?.away_team_code || resolveFixtureTeamCode(fixture?.away_team)
  ].filter(Boolean));
  const teamCounts = {};
  const roleCounts = {};

  selectedPlayers.forEach((player) => {
    teamCounts[player.team] = (teamCounts[player.team] || 0) + 1;
    roleCounts[player.role] = (roleCounts[player.role] || 0) + 1;
  });

  const teamPresence = [...fixtureTeams].every((teamCode) => (teamCounts[teamCode] || 0) >= 1);
  if (!teamPresence) {
    errors.push('Pick at least one player from each fixture team.');
  }

  if ((roleCounts.batter || 0) < 1) {
    errors.push('Pick at least one batter.');
  }

  if ((roleCounts.bowler || 0) < 1) {
    errors.push('Pick at least one bowler.');
  }

  return {
    valid: errors.length === 0,
    errors,
    selected_players: selectedPlayers,
    total_cost: totalCost,
    budget_remaining: roundTo(budget - totalCost, 2),
    team_counts: teamCounts,
    role_counts: roleCounts
  };
}

export function scoreMiniFantasyLineup({
  selectedPlayerIds = [],
  captainPlayerId = '',
  pointsByPlayerId = {}
} = {}) {
  const selected = [...new Set((Array.isArray(selectedPlayerIds) ? selectedPlayerIds : []).filter(Boolean))];
  let total = 0;
  selected.forEach((playerId) => {
    const rawPoints = toNumber(pointsByPlayerId[playerId], 0);
    const multiplier = playerId === captainPlayerId ? MINI_FANTASY_CAPTAIN_MULTIPLIER : 1;
    total += rawPoints * multiplier;
  });
  return roundTo(total, 2);
}
