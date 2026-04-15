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
export const MINI_FANTASY_LAUNCH_AT_UTC = '2026-04-06T00:00:00Z';
export const MINI_FANTASY_FIRST_OPEN_MATCH_NO = 14;
export const MINI_FANTASY_FIRST_MATCH_OPEN_AT_UTC = '2026-04-06T00:00:00Z';
export const MINI_FANTASY_TEAM_SIZE = 4;
export const MINI_FANTASY_BUDGET = 31;
export const MINI_FANTASY_CAPTAIN_MULTIPLIER = 1.5;
export const MINI_FANTASY_WINNING_TEAM_PLAYER_BONUS = 5;
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

// Keep Mini Fantasy uncapped pricing aligned with the same curated player pool used by Uncapped MVP.
const UNCAPPED_MVP_PLAYERS = Object.freeze([
  'Ayush Mhatre', 'Kartik Sharma', 'Urvil Patel', 'Ramakrishna Ghosh', 'Prashant Veer', 'Aman Khan',
  'Anshul Kamboj', 'Mukesh Choudhary', 'Shreyas Gopal', 'Gurjapneet Singh', 'Mahendra Singh Dhoni',
  'Sahil Parakh', 'Abishek Porel', 'Sameer Rizvi', 'Ashutosh Sharma', 'Vipraj Nigam', 'Ajay Mandal',
  'Tripurana Vijay', 'Madhav Tiwari', 'Auqib Nabi',
  'Kumar Kushagra', 'Anuj Rawat', 'Nishant Sindhu', 'Mohd. Arshad Khan', 'Rahul Tewatia', 'Shahrukh Khan',
  'Manav Suthar', 'Gurnoor Singh Brar', 'Ashok Sharma', 'Kulwant Khejroliya',
  'Angkrish Raghuvanshi', 'Tejasvi Singh', 'Anukul Roy', 'Sarthak Ranjan', 'Daksh Kamra', 'Vaibhav Arora',
  'Kartik Tyagi', 'Prashant Solanki', 'Saurabh Dubey',
  'Himmat Singh', 'Mukul Choudhary', 'Akshat Raghuwanshi', 'Abdul Samad', 'Arshin Kulkarni', 'Ayush Badoni',
  'M. Siddharth', 'Digvesh Singh', 'Akash Singh', 'Prince Yadav', 'Arjun Tendulkar', 'Naman Tiwari',
  'Mohsin Khan',
  'Robin Minz', 'Danish Malewar', 'Naman Dhir', 'Raj Angad Bawa', 'Atharva Ankolekar', 'Mayank Rawat',
  'Ashwani Kumar', 'Raghu Sharma', 'Mohammad Izhar',
  'Nehal Wadhera', 'Vishnu Vinod', 'Harnoor Pannu', 'Pyla Avinash', 'Prabhsimran Singh', 'Shashank Singh',
  'Harpreet Brar', 'Priyansh Arya', 'Musheer Khan', 'Suryansh Shedge', 'Vyshak Vijaykumar', 'Yash Thakur',
  'Pravin Dubey', 'Vishal Nishad',
  'Shubham Dubey', 'Vaibhav Suryavanshi', 'Ravi Singh', 'Aman Rao Perala', 'Yudhvir Singh Charak',
  'Sushant Mishra', 'Yash Raj Punja', 'Vignesh Puthur', 'Brijesh Sharma',
  'Swapnil Singh', 'Satvik Deswal', 'Mangesh Yadav', 'Vicky Ostwal', 'Vihaan Malhotra', 'Kanishk Chouhan',
  'Rasikh Dar', 'Suyash Sharma', 'Abhinandan Singh', 'Yash Dayal',
  'Aniket Verma', 'Smaran Ravichandran', 'Salil Arora', 'Harsh Dubey', 'Shivang Kumar', 'Krains Fuletra',
  'Zeeshan Ansari', 'Sakib Hussain', 'Onkar Tarmale', 'Amit Kumar', 'Praful Hinge'
]);

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

const UNCAPPED_MVP_PLAYER_KEYS = new Set(UNCAPPED_MVP_PLAYERS.map((name) => normalizeName(name)));

// Keep a conservative alias map for common score-feed spelling drift.
const NAME_TOKEN_ALIASES = Object.freeze({
  mohd: 'mohammad',
  mohd0: 'mohammad',
  mohds: 'mohammad',
  mohamad: 'mohammad',
  mohamed: 'mohammad',
  mohammed: 'mohammad',
  mohammedh: 'mohammad',
  mohamad0: 'mohammad',
  md: 'mohammad',
  sooryavanshi: 'suryavanshi',
  sooryanvanshi: 'suryavanshi'
});

const NAME_TOKEN_EXPANSIONS = Object.freeze({
  suryakumar: Object.freeze(['surya', 'kumar'])
});

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

export function resolveMiniFantasyPlayerTeamCode(playerId = '') {
  const teamCode = String(playerId || '').split('_')[0].toUpperCase();
  return TEAM_CODE_TO_NAME[teamCode] ? teamCode : '';
}

export function currentRoleOverride(teamCode, playerName) {
  const teamOverrides = ROLE_OVERRIDES[String(teamCode || '').toUpperCase()] || {};
  return teamOverrides[normalizeName(playerName)] || null;
}

function tokenizeName(value) {
  return normalizeName(value).split(' ').filter(Boolean);
}

function normalizeAliasToken(token) {
  return NAME_TOKEN_ALIASES[token] || token;
}

function tokenizeAliasName(value, { dropInitials = false } = {}) {
  return tokenizeName(value)
    .flatMap((token) => {
      const normalized = normalizeAliasToken(token);
      const expanded = NAME_TOKEN_EXPANSIONS[normalized];
      return expanded ? [...expanded] : [normalized];
    })
    .filter((token) => !dropInitials || token.length > 1);
}

function addAliasKey(keys, tokens) {
  const normalizedTokens = (Array.isArray(tokens) ? tokens : []).filter(Boolean);
  if (!normalizedTokens.length) return;
  keys.add(normalizedTokens.join(' '));
  if (normalizedTokens.length > 1) {
    keys.add([...normalizedTokens].sort().join(' '));
  }
}

function buildNameAliasKeys(value) {
  const rawTokens = tokenizeAliasName(value);
  const significantTokens = tokenizeAliasName(value, { dropInitials: true });
  const keys = new Set();

  addAliasKey(keys, rawTokens);
  if (significantTokens.length && significantTokens.length !== rawTokens.length) {
    addAliasKey(keys, significantTokens);
  }

  if (rawTokens.length >= 3) {
    addAliasKey(keys, [rawTokens[0], rawTokens[rawTokens.length - 1]]);
    addAliasKey(keys, rawTokens.slice(0, 2));
  }

  if (significantTokens.length >= 2) {
    addAliasKey(keys, [significantTokens[0], significantTokens[significantTokens.length - 1]]);
    addAliasKey(keys, [significantTokens[0].charAt(0), significantTokens[significantTokens.length - 1]]);
    if (significantTokens.length >= 3) {
      addAliasKey(keys, significantTokens.slice(0, 2));
      addAliasKey(keys, [significantTokens[0].charAt(0), significantTokens[1]]);
    }
  }

  return [...keys].filter(Boolean);
}

function countSharedAliasTokens(a, b) {
  const tokensA = new Set(tokenizeAliasName(a, { dropInitials: true }));
  const tokensB = new Set(tokenizeAliasName(b, { dropInitials: true }));
  let shared = 0;
  tokensA.forEach((token) => {
    if (tokensB.has(token)) shared += 1;
  });
  return shared;
}

function areAliasTokensSubset(a, b) {
  return a.length > 0 && a.every((token) => b.includes(token));
}

function mergeHistoryMatches(playerName, histories = []) {
  const mergedPoints = {};
  let resolvedName = normalizeWhitespace(playerName);
  let lastMatchPlayedAtUtc = null;

  histories.forEach((history) => {
    const pointsByMatchNo = history?.points_by_match_no || {};
    Object.entries(pointsByMatchNo).forEach(([matchNo, points]) => {
      const numericMatchNo = Number(matchNo);
      if (!Number.isFinite(numericMatchNo) || numericMatchNo <= 0) return;
      mergedPoints[numericMatchNo] = mergedPoints[numericMatchNo] == null
        ? roundTo(toNumber(points, 0), 2)
        : Math.max(mergedPoints[numericMatchNo], roundTo(toNumber(points, 0), 2));
    });
    if (!resolvedName || String(history?.player_name || '').length > resolvedName.length) {
      resolvedName = normalizeWhitespace(history?.player_name || resolvedName);
    }
    const playedAt = history?.last_match_played_at_utc || null;
    if (playedAt && (!lastMatchPlayedAtUtc || Date.parse(playedAt) > Date.parse(lastMatchPlayedAtUtc))) {
      lastMatchPlayedAtUtc = playedAt;
    }
  });

  const orderedMatchNos = Object.keys(mergedPoints).map(Number).sort((a, b) => a - b);
  return {
    player_name: resolvedName || normalizeWhitespace(playerName),
    match_points: orderedMatchNos.map((matchNo) => mergedPoints[matchNo]),
    points_by_match_no: Object.fromEntries(orderedMatchNos.map((matchNo) => [matchNo, mergedPoints[matchNo]])),
    matches_played: orderedMatchNos.length,
    last_match_played_at_utc: lastMatchPlayedAtUtc
  };
}

export function resolvePlayerHistory(playerName, historyMap = new Map()) {
  if (!(historyMap instanceof Map) || !normalizeWhitespace(playerName)) {
    return null;
  }

  const targetAliasKeys = new Set(buildNameAliasKeys(playerName));
  const targetSignificantTokens = tokenizeAliasName(playerName, { dropInitials: true });
  const matches = [];

  historyMap.forEach((history, fallbackKey) => {
    const candidateName = history?.player_name || fallbackKey;
    const candidateTokens = tokenizeAliasName(candidateName, { dropInitials: true });
    const sharedTokens = countSharedAliasTokens(playerName, candidateName);
    const subsetMatch =
      areAliasTokensSubset(targetSignificantTokens, candidateTokens) ||
      areAliasTokensSubset(candidateTokens, targetSignificantTokens);
    const overlap =
      sharedTokens / Math.max(new Set(targetSignificantTokens).size || 1, new Set(candidateTokens).size || 1);
    const directAliasMatch = buildNameAliasKeys(candidateName).some((aliasKey) => targetAliasKeys.has(aliasKey));
    if (!directAliasMatch && sharedTokens < 2) {
      return;
    }
    if (!subsetMatch && overlap < 0.67) {
      return;
    }
    matches.push(history);
  });

  if (!matches.length) return null;
  return mergeHistoryMatches(playerName, matches);
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

function startOfUtcDayMs(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return Number.NaN;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function getMiniFantasyFixtureOpenAtUtc(fixture, options = {}) {
  const firstOpenMatchNo = Number(options.first_open_match_no || MINI_FANTASY_FIRST_OPEN_MATCH_NO);
  const firstMatchOpenAtUtc = options.first_match_open_at_utc || MINI_FANTASY_FIRST_MATCH_OPEN_AT_UTC;
  const startMs = Date.parse(fixture?.datetime_utc || fixture?.starts_at_utc || '');
  if (!Number.isFinite(startMs)) return null;
  const regularOpenMs = startOfUtcDayMs(startMs) - 24 * 60 * 60 * 1000;
  if (Number(fixture?.match_no || 0) === firstOpenMatchNo) {
    const firstOpenMs = Date.parse(firstMatchOpenAtUtc);
    const effectiveMs = Number.isFinite(firstOpenMs) ? Math.min(firstOpenMs, regularOpenMs) : regularOpenMs;
    return new Date(effectiveMs).toISOString();
  }
  return new Date(regularOpenMs).toISOString();
}

export function getMiniFantasyFixtureAvailability(schedule = [], now = new Date(), options = {}) {
  const firstOpenMatchNo = Number(options.first_open_match_no || MINI_FANTASY_FIRST_OPEN_MATCH_NO);
  const lockOffsetMinutes = Number(options.lock_offset_minutes || MINI_FANTASY_LOCK_OFFSET_MINUTES);
  const launchStatus = getLaunchStatus(schedule, now, options);
  const availability = (Array.isArray(schedule) ? schedule : [])
    .filter((fixture) => Number(fixture.match_no) >= firstOpenMatchNo)
    .map((fixture) => {
      const startMs = Date.parse(fixture.datetime_utc || '');
      const lockMs = startMs - lockOffsetMinutes * 60 * 1000;
      const opensAtUtc = getMiniFantasyFixtureOpenAtUtc(fixture, options);
      const openMs = Date.parse(opensAtUtc || '');
      const isLocked = !Number.isFinite(lockMs) || now.getTime() >= lockMs;
      const isOpen = Number.isFinite(openMs) && now.getTime() >= openMs && !isLocked;
      return {
        ...fixture,
        home_team_code: resolveFixtureTeamCode(fixture.home_team),
        away_team_code: resolveFixtureTeamCode(fixture.away_team),
        starts_at_utc: fixture.datetime_utc || null,
        opens_at_utc: opensAtUtc,
        locks_at_utc: Number.isFinite(lockMs) ? new Date(lockMs).toISOString() : null,
        is_open: isOpen,
        is_locked: isLocked,
        availability_status: isLocked ? 'locked' : isOpen ? 'open' : 'upcoming'
      };
    })
    .sort((a, b) => Date.parse(a.datetime_utc || '') - Date.parse(b.datetime_utc || ''));

  return {
    launch: launchStatus,
    fixtures: availability.filter((fixture) => fixture.is_open),
    availability
  };
}

export function getMiniFantasyOpenFixtures(schedule = [], now = new Date(), options = {}) {
  const availability = getMiniFantasyFixtureAvailability(schedule, now, options);
  return {
    launch: availability.launch,
    fixtures: availability.fixtures,
    availability: availability.availability
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
        points_by_match_no: {},
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
        const effectiveMatchNo = Math.max(1, matchNo - (matchDelta - 1) + step);
        const matchPoints = step === matchDelta - 1 ? scoreDelta : 0;
        history.match_points.push(matchPoints);
        history.points_by_match_no[effectiveMatchNo] = matchPoints;
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
      const history = resolvePlayerHistory(playerName, historyMap) || {
        match_points: [],
        points_by_match_no: {},
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
        is_uncapped: UNCAPPED_MVP_PLAYER_KEYS.has(canonicalName),
        pricing_eligible: Boolean(role),
        old_price: Number.isFinite(previous?.final_price) ? previous.final_price : null,
        initial_price: Number.isFinite(previous?.final_price) ? previous.final_price : null,
        recovered_history: Boolean(previous) && Number(previous?.matches_played || 0) === 0 && Number(history.matches_played || 0) > 0,
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
        is_uncapped: price?.is_uncapped ?? UNCAPPED_MVP_PLAYER_KEYS.has(normalizeName(playerName)),
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
        is_uncapped: Boolean(player.is_uncapped),
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
      is_uncapped: snap.is_uncapped ?? player.is_uncapped,
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

  const batterLikeCount = (roleCounts.batter || 0) + (roleCounts.wicket_keeper || 0);
  if (batterLikeCount < 1) {
    errors.push('Pick at least one batter or wicket keeper.');
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
  pointsByPlayerId = {},
  playerTeamById = {},
  winningTeamCode = '',
  winningPlayerBonus = MINI_FANTASY_WINNING_TEAM_PLAYER_BONUS
} = {}) {
  const selected = [...new Set((Array.isArray(selectedPlayerIds) ? selectedPlayerIds : []).filter(Boolean))];
  let total = 0;
  selected.forEach((playerId) => {
    const rawPoints = toNumber(pointsByPlayerId[playerId], 0);
    const multiplier = playerId === captainPlayerId ? MINI_FANTASY_CAPTAIN_MULTIPLIER : 1;
    total += rawPoints * multiplier;
  });
  total += calculateMiniFantasyWinningTeamBonus({
    selectedPlayerIds: selected,
    playerTeamById,
    winningTeamCode,
    winningPlayerBonus
  });
  return roundTo(total, 2);
}

export function getCompletedMiniFantasyMatchCount(liveData = {}) {
  const scoreHistory = Array.isArray(liveData?.meta?.scoreHistory) ? liveData.meta.scoreHistory : [];
  return scoreHistory.reduce((best, item) => Math.max(best, Number(item?.processedMatchCount || 0)), 0);
}

export function buildMiniFantasyPlayerPointsIndex({
  liveData = {},
  schedule = [],
  squads = {}
} = {}) {
  const historyMap = deriveCompletedMatchHistories(liveData, schedule);
  const index = new Map();
  Object.entries(squads || {}).forEach(([teamCode, squadPlayers]) => {
    (Array.isArray(squadPlayers) ? squadPlayers : []).forEach((playerName) => {
      const history = resolvePlayerHistory(playerName, historyMap);
      index.set(buildMiniFantasyPlayerId(teamCode, playerName), {
        player_id: buildMiniFantasyPlayerId(teamCode, playerName),
        name: playerName,
        team: teamCode,
        match_points: [...(history?.match_points || [])],
        points_by_match_no: { ...(history?.points_by_match_no || {}) },
        matches_played: Number(history?.matches_played || 0),
        last_match_played_at_utc: history?.last_match_played_at_utc || null
      });
    });
  });
  return index;
}

function latestCompletedScoreHistoryEntry(liveData = {}) {
  const ordered = [...(Array.isArray(liveData?.meta?.scoreHistory) ? liveData.meta.scoreHistory : [])]
    .sort((a, b) => toNumber(a?.processedMatchCount, 0) - toNumber(b?.processedMatchCount, 0));
  return ordered.length ? ordered[ordered.length - 1] : null;
}

function snapshotPlayerMatches(snapshot = {}) {
  return snapshot?.meta?.aggregates?.playerMatches || {};
}

function snapshotMvpScoreLookup(snapshot = {}) {
  const currentScoreValues = snapshot?.mvp?.values || {};
  return Object.fromEntries(
    Object.entries(currentScoreValues).map(([playerName, payload]) => [playerName, toNumber(payload?.score, 0)])
  );
}

export function buildMiniFantasyFixturePointsIndex({
  liveData = {},
  schedule = [],
  squads = {},
  matchNo = null
} = {}) {
  const targetMatchNo = Number(matchNo || 0) || null;
  const pointsIndex = new Map();
  if (!targetMatchNo) return pointsIndex;

  const baseIndex = buildMiniFantasyPlayerPointsIndex({ liveData, schedule, squads });
  const completedMatchCount = getCompletedMiniFantasyMatchCount(liveData);

  if (targetMatchNo <= completedMatchCount) {
    baseIndex.forEach((payload, playerId) => {
      pointsIndex.set(playerId, toNumber(payload?.points_by_match_no?.[targetMatchNo], 0));
    });
    return pointsIndex;
  }

  if (targetMatchNo !== completedMatchCount + 1) {
    return pointsIndex;
  }

  const lastCompletedEntry = latestCompletedScoreHistoryEntry(liveData);
  const previousSnapshot = lastCompletedEntry?.snapshot || {};
  const currentSnapshot = liveData || {};
  const previousMatches = snapshotPlayerMatches(previousSnapshot);
  const currentMatches = snapshotPlayerMatches(currentSnapshot);
  const previousScores = snapshotMvpScoreLookup(previousSnapshot);
  const currentScores = snapshotMvpScoreLookup(currentSnapshot);
  const liveDeltaHistories = new Map();
  const playedAt = ((Array.isArray(schedule) ? schedule : []).find((fixture) => Number(fixture?.match_no || 0) === targetMatchNo) || {}).datetime_utc || liveData?.fetchedAt || null;

  const allNames = new Set([
    ...Object.keys(previousMatches),
    ...Object.keys(currentMatches),
    ...Object.keys(previousScores),
    ...Object.keys(currentScores)
  ]);

  allNames.forEach((playerName) => {
    const currentPlayerMatches = toNumber(currentMatches[playerName], 0);
    const previousPlayerMatches = toNumber(previousMatches[playerName], 0);
    const matchDelta = currentPlayerMatches - previousPlayerMatches;
    if (matchDelta <= 0) return;
    const livePoints = roundTo(toNumber(currentScores[playerName], 0) - toNumber(previousScores[playerName], 0), 2);
    liveDeltaHistories.set(normalizeName(playerName), {
      player_name: playerName,
      match_points: [livePoints],
      points_by_match_no: { [targetMatchNo]: livePoints },
      matches_played: matchDelta,
      last_match_played_at_utc: playedAt
    });
  });

  Object.entries(squads || {}).forEach(([teamCode, squadPlayers]) => {
    (Array.isArray(squadPlayers) ? squadPlayers : []).forEach((playerName) => {
      const playerId = buildMiniFantasyPlayerId(teamCode, playerName);
      const history = resolvePlayerHistory(playerName, liveDeltaHistories);
      pointsIndex.set(playerId, toNumber(history?.points_by_match_no?.[targetMatchNo], 0));
    });
  });

  return pointsIndex;
}

function cachedMiniFantasyMatchList(liveData = {}) {
  return Array.isArray(liveData?.meta?.cache?.matchList) ? liveData.meta.cache.matchList : [];
}

export function getMiniFantasyWinningTeamCode({
  liveData = {},
  schedule = [],
  matchNo = null
} = {}) {
  const targetMatchNo = Number(matchNo || 0) || null;
  if (!targetMatchNo) return '';

  const cachedMatch = cachedMiniFantasyMatchList(liveData).find((match) => Number(match?.matchNo || 0) === targetMatchNo) || null;
  const fixture = (Array.isArray(schedule) ? schedule : []).find((item) => Number(item?.match_no || 0) === targetMatchNo) || null;
  const status = normalizeWhitespace(cachedMatch?.status || '');
  if (!status || /^match starts\b/i.test(status) || /^live\b/i.test(status)) return '';
  if (/no result|abandoned|tied|tie\b/i.test(status)) return '';

  const candidateTeams = [
    ...(Array.isArray(cachedMatch?.teams) ? cachedMatch.teams : []),
    fixture?.home_team,
    fixture?.away_team
  ]
    .map((team) => normalizeWhitespace(team))
    .filter(Boolean);

  const lowerStatus = status.toLowerCase();
  const matchedTeam = [...new Set(candidateTeams)]
    .sort((a, b) => b.length - a.length)
    .find((team) => lowerStatus.includes(team.toLowerCase()));

  return resolveFixtureTeamCode(matchedTeam || '');
}

function calculateMiniFantasyWinningTeamBonus({
  selectedPlayerIds = [],
  playerTeamById = {},
  winningTeamCode = '',
  winningPlayerBonus = MINI_FANTASY_WINNING_TEAM_PLAYER_BONUS
} = {}) {
  const resolvedWinningTeamCode = resolveFixtureTeamCode(winningTeamCode);
  const bonusPerPlayer = toNumber(winningPlayerBonus, 0);
  if (!resolvedWinningTeamCode || bonusPerPlayer <= 0) return 0;

  return roundTo(
    [...new Set((Array.isArray(selectedPlayerIds) ? selectedPlayerIds : []).filter(Boolean))]
      .reduce((total, playerId) => {
        const playerTeamCode = resolveFixtureTeamCode(playerTeamById[playerId] || resolveMiniFantasyPlayerTeamCode(playerId));
        return total + (playerTeamCode === resolvedWinningTeamCode ? bonusPerPlayer : 0);
      }, 0),
    2
  );
}

export function scoreMiniFantasyEntry({
  entry = {},
  liveData = {},
  schedule = [],
  squads = {}
} = {}) {
  const matchNo = Number(entry?.matchNo || entry?.match_no || 0) || null;
  const completedMatchCount = getCompletedMiniFantasyMatchCount(liveData);
  const pointsIndex = buildMiniFantasyPlayerPointsIndex({ liveData, schedule, squads });
  const selectedPlayerIds = Array.isArray(entry?.selectedPlayerIds) ? entry.selectedPlayerIds : [];
  const pointsByPlayerId = Object.fromEntries(
    selectedPlayerIds.map((playerId) => [
      playerId,
      pointsIndex.get(playerId)?.points_by_match_no?.[matchNo] || 0
    ])
  );
  const playerTeamById = Object.fromEntries(selectedPlayerIds.map((playerId) => [playerId, resolveMiniFantasyPlayerTeamCode(playerId)]));
  const winningTeamCode = matchNo && matchNo <= completedMatchCount
    ? getMiniFantasyWinningTeamCode({ liveData, schedule, matchNo })
    : '';
  const totalPoints = matchNo && matchNo <= completedMatchCount
    ? scoreMiniFantasyLineup({
        selectedPlayerIds,
        captainPlayerId: entry?.captainPlayerId || '',
        pointsByPlayerId,
        playerTeamById,
        winningTeamCode
      })
    : 0;
  return {
    match_no: matchNo,
    is_scored: Boolean(matchNo && matchNo <= completedMatchCount),
    total_points: totalPoints,
    points_by_player_id: pointsByPlayerId,
    winning_team_code: winningTeamCode || null,
    winner_bonus_points: calculateMiniFantasyWinningTeamBonus({
      selectedPlayerIds,
      playerTeamById,
      winningTeamCode
    })
  };
}

export function buildMiniFantasyLeaderboard({
  entries = [],
  liveData = {},
  schedule = [],
  squads = {}
} = {}) {
  const pointsIndex = buildMiniFantasyPlayerPointsIndex({ liveData, schedule, squads });
  const completedMatchCount = getCompletedMiniFantasyMatchCount(liveData);
  const grouped = new Map();

  (Array.isArray(entries) ? entries : []).forEach((entry) => {
    const ownerHandle = normalizeWhitespace(entry?.ownerHandle || entry?.owner_handle || '');
    const displayName = normalizeWhitespace(entry?.displayName || entry?.display_name || ownerHandle || '');
    if (!ownerHandle) return;
    const matchNo = Number(entry?.matchNo || entry?.match_no || 0) || null;
    const selectedPlayerIds = entry?.selectedPlayerIds || entry?.selected_player_ids || [];
    const pointsByPlayerId = Object.fromEntries(
      (Array.isArray(selectedPlayerIds) ? selectedPlayerIds : []).map((playerId) => [
        playerId,
        pointsIndex.get(playerId)?.points_by_match_no?.[matchNo] || 0
      ])
    );
    const scored = Boolean(matchNo && matchNo <= completedMatchCount);
    const playerTeamById = Object.fromEntries(
      (Array.isArray(selectedPlayerIds) ? selectedPlayerIds : []).map((playerId) => [playerId, resolveMiniFantasyPlayerTeamCode(playerId)])
    );
    const winningTeamCode = scored ? getMiniFantasyWinningTeamCode({ liveData, schedule, matchNo }) : '';
    const totalPoints = scored
      ? scoreMiniFantasyLineup({
          selectedPlayerIds,
          captainPlayerId: entry?.captainPlayerId || entry?.captain_player_id || '',
          pointsByPlayerId,
          playerTeamById,
          winningTeamCode
        })
      : 0;
    const existing = grouped.get(ownerHandle) || {
      owner_handle: ownerHandle,
      display_name: displayName,
      total_points: 0,
      saved_entries: 0,
      scored_entries: 0,
      pending_entries: 0,
      latest_saved_at: null,
      matches: []
    };
    if (!existing.display_name && displayName) existing.display_name = displayName;
    existing.total_points = roundTo(existing.total_points + totalPoints, 2);
    existing.saved_entries += 1;
    existing.scored_entries += scored ? 1 : 0;
    existing.pending_entries += scored ? 0 : 1;
    existing.latest_saved_at = [existing.latest_saved_at, entry?.savedAt || entry?.saved_at || entry?.updatedAt || entry?.updated_at || null]
      .filter(Boolean)
      .sort()
      .slice(-1)[0] || existing.latest_saved_at;
    existing.matches.push({
      match_no: matchNo,
      total_points: totalPoints,
      is_scored: scored,
      captain_player_id: entry?.captainPlayerId || entry?.captain_player_id || null
    });
    grouped.set(ownerHandle, existing);
  });

  const medalByIndex = ['gold', 'silver', 'bronze'];
  const rows = [...grouped.values()]
    .sort((a, b) =>
      b.total_points - a.total_points ||
      b.scored_entries - a.scored_entries ||
      b.saved_entries - a.saved_entries ||
      a.owner_handle.localeCompare(b.owner_handle)
    )
    .map((row, index) => ({
      ...row,
      rank: index + 1,
      medal: medalByIndex[index] || null
    }));

  return {
    completed_match_count: completedMatchCount,
    rows
  };
}
