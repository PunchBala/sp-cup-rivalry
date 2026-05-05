import {
  ENGINE_VERSION as PRICING_ENGINE_VERSION,
  DEFAULT_MISSED_FIXTURE_PENALTIES,
  DEFAULT_RANK_PRICE_BUCKETS,
  assignRankBucketPrices,
  clamp,
  computeAdjustedScore,
  computeLastMatchPoints,
  computeMissedFixturePenalty,
  computeRecentAveragePoints,
  computeReliabilityFactor,
  computeScoreBasis,
  computeSeasonAveragePoints,
  generatePrices,
  resolvePlayerPriceMax,
  roundTo
} from './pricing-engine.js';

export const MINI_FANTASY_ENGINE_VERSION = 'mini_fantasy_v1';
export const MINI_FANTASY_PRICE_BOOK_VERSION = 'mini_fantasy_price_book_v1';
export const MINI_FANTASY_OPEN_FIXTURE_PRICE_SNAPSHOT_VERSION = 'mini_fantasy_open_fixture_prices_v1';
export const MINI_FANTASY_LIVE_PROVISIONAL_VERSION = 'mini_fantasy_live_provisional_v1';
export const MINI_FANTASY_SEASON = 'IPL 2026';
export const MINI_FANTASY_LAUNCH_AT_UTC = '2026-04-06T00:00:00Z';
export const MINI_FANTASY_FIRST_OPEN_MATCH_NO = 14;
export const MINI_FANTASY_FIRST_MATCH_OPEN_AT_UTC = '2026-04-06T00:00:00Z';
export const MINI_FANTASY_TEAM_SIZE = 4;
export const MINI_FANTASY_BUDGET = 31;
export const MINI_FANTASY_CAPTAIN_MULTIPLIER = 1.5;
export const MINI_FANTASY_WINNING_TEAM_PLAYER_BONUS = 5;
export const MINI_FANTASY_APPEARANCE_PLAYER_BONUS = 2;
export const MINI_FANTASY_LOCK_OFFSET_MINUTES = 1;
export const MINI_FANTASY_DAILY_VISIT_BONUS_POINTS = 5;
export const MINI_FANTASY_DAILY_VISIT_TIME_ZONE = 'Asia/Kolkata';
export const MINI_FANTASY_NEW_PLAYER_BASELINE_POINTS = 40;
export const MINI_FANTASY_MISSED_LOCK_RATE = 0.4;
export const MINI_FANTASY_MISSED_LOCK_FIRST_CAP = 50;
export const MINI_FANTASY_MISSED_LOCK_LATE_CAP = 30;
export const MINI_FANTASY_MISSED_LOCK_FIRST_COUNT = 3;

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
  price_min: 4.5,
  price_max: 10,
  recent_matches_window: 3,
  max_daily_price_step: 2,
  price_increment: 0.5,
  rank_price_buckets: DEFAULT_RANK_PRICE_BUCKETS,
  smoothing: Object.freeze({
    old_price_weight: 0.4,
    target_price_weight: 0.6
  }),
  missed_fixture_penalties: DEFAULT_MISSED_FIXTURE_PENALTIES,
  default_initial_price: 6,
  scoring_source: 'existing_mvp_points_formula_v2_fours_bonus',
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

const MINI_FANTASY_MILESTONE_POINTS = Object.freeze({
  batting50: 10,
  batting100: 25,
  impact30: 8,
  bowling3w: 12,
  bowling4w: 20,
  bowling5w: 30
});

const MINI_FANTASY_DUCK_PENALTY = -5;
const MINI_FANTASY_FOUR_BONUS_POINTS = 1;
const MINI_FANTASY_WICKET_POINTS = 25;
const MINI_FANTASY_DOT_BALL_POINTS = 1.5;

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

const EXPLICIT_NAME_ALIASES = Object.freeze({
  'auqib nabi': Object.freeze([
    'auqib nabi dar'
  ]),
  'auqib nabi dar': Object.freeze([
    'auqib nabi'
  ]),
  'mohammad shami': Object.freeze([
    'mohammed shami'
  ]),
  'mohammed shami': Object.freeze([
    'mohammad shami'
  ]),
  'phil salt': Object.freeze([
    'philip salt'
  ]),
  'philip salt': Object.freeze([
    'phil salt'
  ]),
  'lhuan dre pretorious': Object.freeze([
    'lhuan dre pretorius'
  ]),
  'lhuan dre pretorius': Object.freeze([
    'lhuan dre pretorious'
  ]),
  'lungi ngidi': Object.freeze([
    'lungisani ngidi'
  ]),
  'lungisani ngidi': Object.freeze([
    'lungi ngidi'
  ]),
  'varun chakravarthy': Object.freeze([
    'varun chakaravarthy'
  ]),
  'varun chakaravarthy': Object.freeze([
    'varun chakravarthy'
  ]),
  'allah ghazanfar': Object.freeze([
    'am ghazanfar',
    'allah mohammad ghazanfar',
    'allah mohammed ghazanfar',
    'allah mohammad ghafanzar'
  ]),
  'am ghazanfar': Object.freeze([
    'allah ghazanfar',
    'allah mohammad ghazanfar',
    'allah mohammed ghazanfar',
    'allah mohammad ghafanzar'
  ]),
  'allah mohammad ghazanfar': Object.freeze([
    'allah ghazanfar',
    'am ghazanfar',
    'allah mohammed ghazanfar',
    'allah mohammad ghafanzar'
  ]),
  'allah mohammed ghazanfar': Object.freeze([
    'allah ghazanfar',
    'am ghazanfar',
    'allah mohammad ghazanfar',
    'allah mohammad ghafanzar'
  ]),
  'allah mohammad ghafanzar': Object.freeze([
    'allah ghazanfar',
    'am ghazanfar',
    'allah mohammad ghazanfar',
    'allah mohammad ghazanfar'
  ])
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

function buildMiniFantasyAliasPlayerIds(teamCode, playerName) {
  const canonicalPlayerId = buildMiniFantasyPlayerId(teamCode, playerName);
  const normalized = normalizeName(playerName);
  const aliases = Array.isArray(EXPLICIT_NAME_ALIASES[normalized]) ? EXPLICIT_NAME_ALIASES[normalized] : [];
  return [...new Set(
    aliases
      .map((aliasName) => buildMiniFantasyPlayerId(teamCode, aliasName))
      .filter((playerId) => playerId && playerId !== canonicalPlayerId)
  )];
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
  const normalizedValue = normalizeName(value);

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

  (EXPLICIT_NAME_ALIASES[normalizedValue] || []).forEach((aliasName) => {
    addAliasKey(keys, tokenizeAliasName(aliasName));
    addAliasKey(keys, tokenizeAliasName(aliasName, { dropInitials: true }));
  });

  return [...keys].filter(Boolean);
}

function hasExplicitAliasMatch(targetName, candidateName) {
  const targetAliases = EXPLICIT_NAME_ALIASES[normalizeName(targetName)] || [];
  const candidateAliases = EXPLICIT_NAME_ALIASES[normalizeName(candidateName)] || [];
  const normalizedCandidate = normalizeName(candidateName);
  const normalizedTarget = normalizeName(targetName);
  return targetAliases.some((alias) => normalizeName(alias) === normalizedCandidate)
    || candidateAliases.some((alias) => normalizeName(alias) === normalizedTarget);
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

const HISTORY_KEY_ALIASES = Object.freeze({
  'auqib nabi dar': 'auqib nabi',
  'mohammed shami': 'mohammad shami',
  'vaibhav sooryavanshi': 'vaibhav suryavanshi'
});

function canonicalHistoryKey(value) {
  const normalized = normalizeName(value);
  const tokenCanonical = tokenizeAliasName(value).join(' ').trim();
  return HISTORY_KEY_ALIASES[tokenCanonical]
    || HISTORY_KEY_ALIASES[normalized]
    || tokenCanonical
    || normalized;
}

function mergeCanonicalSnapshotScore(existingScore, incomingScore) {
  if (existingScore == null) return roundTo(toNumber(incomingScore, 0), 2);
  if (incomingScore == null) return roundTo(toNumber(existingScore, 0), 2);

  const existing = roundTo(toNumber(existingScore, 0), 2);
  const incoming = roundTo(toNumber(incomingScore, 0), 2);
  if (Math.abs(existing) < 0.01) return incoming;
  if (Math.abs(incoming) < 0.01) return existing;

  if (existing < 0 && incoming < 0) {
    return Math.min(existing, incoming);
  }
  if (existing > 0 && incoming > 0) {
    return Math.max(existing, incoming);
  }
  return Math.abs(existing) >= Math.abs(incoming) ? existing : incoming;
}

function mergeOverlappingMatchPoints(existingPoints, incomingPoints) {
  if (existingPoints == null) return roundTo(toNumber(incomingPoints, 0), 2);
  if (incomingPoints == null) return roundTo(toNumber(existingPoints, 0), 2);

  const existing = roundTo(toNumber(existingPoints, 0), 2);
  const incoming = roundTo(toNumber(incomingPoints, 0), 2);

  if (Math.abs(existing - incoming) < 0.01) return existing;
  if (Math.abs(existing) < 0.01 || Math.abs(incoming) < 0.01) return Math.max(existing, incoming);
  return roundTo(existing + incoming, 2);
}

function normalizeHistoryRecord(rawHistory = {}) {
  return {
    player_name: rawHistory.player_name || rawHistory.playerName || '',
    match_points: Array.isArray(rawHistory.match_points)
      ? rawHistory.match_points.map((points) => roundTo(toNumber(points, 0), 2))
      : [],
    points_by_match_no: Object.fromEntries(
      Object.entries(rawHistory.points_by_match_no || {})
        .map(([matchNo, points]) => [Number(matchNo), roundTo(toNumber(points, 0), 2)])
        .filter(([matchNo]) => Number.isFinite(matchNo) && matchNo > 0)
    ),
    matches_played: Math.max(0, Math.trunc(toNumber(rawHistory.matches_played, 0))),
    last_match_played_at_utc: rawHistory.last_match_played_at_utc || null
  };
}

function mergeHistoryRecord(existingHistory = null, incomingHistory = {}) {
  const base = existingHistory ? normalizeHistoryRecord(existingHistory) : null;
  const incoming = normalizeHistoryRecord(incomingHistory);
  if (!base) return incoming;

  const mergedPointsByMatchNo = { ...(base.points_by_match_no || {}) };
  Object.entries(incoming.points_by_match_no || {}).forEach(([matchNo, points]) => {
    const numericMatchNo = Number(matchNo);
    if (!Number.isFinite(numericMatchNo) || numericMatchNo <= 0) return;
    mergedPointsByMatchNo[numericMatchNo] = mergeOverlappingMatchPoints(
      mergedPointsByMatchNo[numericMatchNo],
      points
    );
  });

  const orderedMatchNos = Object.keys(mergedPointsByMatchNo).map(Number).sort((a, b) => a - b);
  const baseName = normalizeWhitespace(base.player_name || '');
  const incomingName = normalizeWhitespace(incoming.player_name || '');
  const lastPlayedAt = [base.last_match_played_at_utc, incoming.last_match_played_at_utc]
    .filter(Boolean)
    .sort((a, b) => Date.parse(a) - Date.parse(b))
    .pop() || null;

  return {
    player_name: incomingName.length > baseName.length ? incomingName : (baseName || incomingName),
    match_points: orderedMatchNos.map((matchNo) => mergedPointsByMatchNo[matchNo]),
    points_by_match_no: Object.fromEntries(orderedMatchNos.map((matchNo) => [matchNo, mergedPointsByMatchNo[matchNo]])),
    matches_played: orderedMatchNos.length,
    last_match_played_at_utc: lastPlayedAt
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
    const explicitAliasMatch = hasExplicitAliasMatch(playerName, candidateName);
    const subsetMatch =
      areAliasTokensSubset(targetSignificantTokens, candidateTokens) ||
      areAliasTokensSubset(candidateTokens, targetSignificantTokens);
    const overlap =
      sharedTokens / Math.max(new Set(targetSignificantTokens).size || 1, new Set(candidateTokens).size || 1);
    const directAliasMatch = buildNameAliasKeys(candidateName).some((aliasKey) => targetAliasKeys.has(aliasKey));
    if (!directAliasMatch && sharedTokens < 2) {
      return;
    }
    if (!explicitAliasMatch && !subsetMatch && overlap < 0.67) {
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

function getDatePartsInTimeZone(dateValue, timeZone = 'UTC') {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  if (!year || !month || !day) return null;
  return { year, month, day };
}

export function formatDateKeyInTimeZone(dateValue, timeZone = 'UTC') {
  const parts = getDatePartsInTimeZone(dateValue, timeZone);
  return parts ? `${parts.year}-${parts.month}-${parts.day}` : '';
}

function fixtureLockTimeUtc(fixture, lockOffsetMinutes = MINI_FANTASY_LOCK_OFFSET_MINUTES) {
  const startMs = Date.parse(fixture?.datetime_utc || fixture?.starts_at_utc || '');
  if (!Number.isFinite(startMs)) return null;
  return new Date(startMs - lockOffsetMinutes * 60 * 1000).toISOString();
}

export function isMiniFantasyFixtureDayInTimeZone(schedule = [], dateValue = new Date(), timeZone = MINI_FANTASY_DAILY_VISIT_TIME_ZONE) {
  const targetDateKey = formatDateKeyInTimeZone(dateValue, timeZone);
  if (!targetDateKey) return false;
  return (Array.isArray(schedule) ? schedule : []).some((fixture) => formatDateKeyInTimeZone(fixture?.datetime_utc, timeZone) === targetDateKey);
}

function completedMiniFantasyFixtures(schedule = [], liveData = {}) {
  const completedMatchCount = getCompletedMiniFantasyMatchCount(liveData);
  return (Array.isArray(schedule) ? schedule : [])
    .filter((fixture) => Number(fixture?.match_no || 0) >= MINI_FANTASY_FIRST_OPEN_MATCH_NO)
    .filter((fixture) => Number(fixture?.match_no || 0) <= completedMatchCount)
    .map((fixture) => ({
      ...fixture,
      match_no: Number(fixture?.match_no || 0) || null,
      lock_at_utc: fixtureLockTimeUtc(fixture)
    }))
    .filter((fixture) => fixture.match_no)
    .sort((a, b) => Number(a.match_no || 0) - Number(b.match_no || 0));
}

function profileCreatedAtUtc(profile = {}) {
  return normalizeWhitespace(profile?.created_at || profile?.createdAt || '');
}

function profileUserId(profile = {}) {
  return normalizeWhitespace(profile?.user_id || profile?.userId || profile?.id || '');
}

function profileHandle(profile = {}) {
  return normalizeWhitespace(profile?.owner_handle || profile?.ownerHandle || profile?.handle || '');
}

function profileDisplayName(profile = {}) {
  return normalizeWhitespace(profile?.display_name || profile?.displayName || '');
}

function dailyBonusHandle(bonus = {}) {
  return normalizeWhitespace(bonus?.owner_handle || bonus?.ownerHandle || bonus?.handle || '');
}

function dailyBonusUserId(bonus = {}) {
  return normalizeWhitespace(bonus?.user_id || bonus?.userId || bonus?.id || '');
}

function dailyBonusDateKey(bonus = {}) {
  return normalizeWhitespace(bonus?.bonus_date_ist || bonus?.bonusDateIst || bonus?.date_ist || bonus?.dateKey || '');
}

function dailyBonusPoints(bonus = {}) {
  return toNumber(
    bonus?.bonus_points
    ?? bonus?.bonusPoints
    ?? MINI_FANTASY_DAILY_VISIT_BONUS_POINTS,
    MINI_FANTASY_DAILY_VISIT_BONUS_POINTS
  );
}

export function calculateMiniFantasyMissedLockPoints(averageLockedScore, missedLockCount) {
  const cap = missedLockCount <= MINI_FANTASY_MISSED_LOCK_FIRST_COUNT
    ? MINI_FANTASY_MISSED_LOCK_FIRST_CAP
    : MINI_FANTASY_MISSED_LOCK_LATE_CAP;
  return {
    cap,
    total: roundTo(Math.min(toNumber(averageLockedScore, 0) * MINI_FANTASY_MISSED_LOCK_RATE, cap), 2)
  };
}

function participantIdentityKey({ ownerHandle = '', userId = '' } = {}) {
  const safeHandle = normalizeWhitespace(ownerHandle).toLowerCase();
  if (safeHandle) return `handle:${safeHandle}`;
  const safeUserId = normalizeWhitespace(userId);
  return safeUserId ? `user:${safeUserId}` : '';
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
  const explicitOpenMs = Date.parse(fixture?.mini_fantasy_opens_at_utc || '');
  if (Number.isFinite(explicitOpenMs)) {
    return new Date(explicitOpenMs).toISOString();
  }
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
  const precomputedHistories = liveData?.meta?.miniFantasyPlayerHistories;
  if (precomputedHistories && typeof precomputedHistories === 'object' && Object.keys(precomputedHistories).length) {
    const scoreHistory = Array.isArray(liveData?.meta?.scoreHistory) ? liveData.meta.scoreHistory : [];
    const latestProcessedMatchCount = scoreHistory.reduce(
      (max, entry) => Math.max(max, Math.trunc(toNumber(entry?.processedMatchCount, 0))),
      0
    );
    const histories = new Map();
    Object.entries(precomputedHistories).forEach(([fallbackKey, rawHistory]) => {
      if (!rawHistory || typeof rawHistory !== 'object') return;
      const canonicalKey = canonicalHistoryKey(rawHistory.player_name || rawHistory.playerName || fallbackKey);
      histories.set(canonicalKey, mergeHistoryRecord(histories.get(canonicalKey), rawHistory));
    });
    let maxHistoryMatchNo = 0;
    histories.forEach((history) => {
      Object.keys(history?.points_by_match_no || {}).forEach((matchNo) => {
        maxHistoryMatchNo = Math.max(maxHistoryMatchNo, Math.trunc(toNumber(matchNo, 0)));
      });
    });
    const historiesAreFreshEnough = latestProcessedMatchCount <= 0 || maxHistoryMatchNo >= latestProcessedMatchCount;
    if (histories.size && historiesAreFreshEnough) return histories;
  }

  const scoreHistory = Array.isArray(liveData?.meta?.scoreHistory) ? liveData.meta.scoreHistory : [];
  const ordered = [...scoreHistory].sort((a, b) => Number(a.processedMatchCount || 0) - Number(b.processedMatchCount || 0));
  const histories = new Map();
  let previousPlayerMatches = {};
  let previousScores = {};

  function ensureHistory(playerName) {
    const canonical = canonicalHistoryKey(playerName);
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
    const currentPlayerMatches = snapshotPlayerMatches(snapshot);
    const scoreLookup = snapshotMvpScoreLookup(snapshot);
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

function getLatestCompletedMiniFantasyMatchNo(liveData = {}, historyMap = new Map()) {
  const scoreHistory = Array.isArray(liveData?.meta?.scoreHistory) ? liveData.meta.scoreHistory : [];
  const latestScoreHistoryMatchNo = scoreHistory.reduce(
    (max, entry) => Math.max(max, Math.trunc(toNumber(entry?.processedMatchCount, 0))),
    0
  );
  let latestHistoryMatchNo = 0;
  if (historyMap instanceof Map) {
    historyMap.forEach((history) => {
      Object.keys(history?.points_by_match_no || {}).forEach((matchNo) => {
        latestHistoryMatchNo = Math.max(latestHistoryMatchNo, Math.trunc(toNumber(matchNo, 0)));
      });
    });
  }
  return Math.max(latestScoreHistoryMatchNo, latestHistoryMatchNo, 0);
}

function buildMiniFantasyNoResultMatchSet(liveData = {}) {
  const noResultMatchNos = new Set();
  cachedMiniFantasyMatchList(liveData).forEach((match) => {
    const matchNo = Math.trunc(toNumber(match?.matchNo, 0));
    if (matchNo > 0 && isMiniFantasyNoResultStatus(match?.status || '')) {
      noResultMatchNos.add(matchNo);
    }
  });
  return noResultMatchNos;
}

function buildTeamCompletedFixtureMap(schedule = [], latestCompletedMatchNo = 0, liveData = {}) {
  const teamFixtureMap = new Map();
  const noResultMatchNos = buildMiniFantasyNoResultMatchSet(liveData);
  (Array.isArray(schedule) ? schedule : []).forEach((fixture) => {
    const matchNo = Math.trunc(toNumber(fixture?.match_no, 0));
    if (matchNo <= 0 || matchNo > latestCompletedMatchNo || noResultMatchNos.has(matchNo)) return;
    const teamCodes = [
      fixture?.home_team_code || resolveFixtureTeamCode(fixture?.home_team),
      fixture?.away_team_code || resolveFixtureTeamCode(fixture?.away_team)
    ].filter(Boolean);
    teamCodes.forEach((teamCode) => {
      if (!teamFixtureMap.has(teamCode)) {
        teamFixtureMap.set(teamCode, []);
      }
      teamFixtureMap.get(teamCode).push(matchNo);
    });
  });

  teamFixtureMap.forEach((matchNos) => {
    matchNos.sort((left, right) => left - right);
  });
  return teamFixtureMap;
}

function calculateConsecutiveMissedFixtures(teamCode = '', history = {}, teamCompletedFixtureMap = new Map()) {
  const completedFixtures = teamCompletedFixtureMap.get(teamCode) || [];
  if (!completedFixtures.length) return 0;
  const playedMatchNos = new Set(
    Object.keys(history?.points_by_match_no || {})
      .map((matchNo) => Math.trunc(toNumber(matchNo, 0)))
      .filter((matchNo) => matchNo > 0)
  );
  let streak = 0;
  for (let index = completedFixtures.length - 1; index >= 0; index -= 1) {
    const matchNo = completedFixtures[index];
    if (playedMatchNos.has(matchNo)) break;
    streak += 1;
  }
  return streak;
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
          adjusted_score: adjustedScore,
          adjusted_score_raw: adjustedScore
        };
      });
  const targetPrices = assignRankBucketPrices(eligiblePlayers, jobMeta.rank_price_buckets || DEFAULT_RANK_PRICE_BUCKETS);
  const seedMap = new Map();
  (Array.isArray(players) ? players : []).forEach((player) => {
    if (!player.pricing_eligible) {
      seedMap.set(player.player_id, jobMeta.default_initial_price);
      return;
    }
    const priceMax = resolvePlayerPriceMax(player, jobMeta.price_max);
    const rawTargetPrice = targetPrices.get(player.player_id) ?? jobMeta.default_initial_price;
    const penalizedTargetPrice = clamp(
      rawTargetPrice - computeMissedFixturePenalty(player.missed_fixture_streak, jobMeta.missed_fixture_penalties),
      jobMeta.price_min,
      priceMax
    );
    seedMap.set(player.player_id, penalizedTargetPrice);
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
    const latestCompletedMatchNo = getLatestCompletedMiniFantasyMatchNo(liveData, historyMap);
    const teamCompletedFixtureMap = buildTeamCompletedFixtureMap(schedule, latestCompletedMatchNo, liveData);

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
        const missedFixtureStreak = calculateConsecutiveMissedFixtures(teamCode, history, teamCompletedFixtureMap);
        players.push({
          player_id: playerId,
          name: playerName,
          team: teamCode,
          role: role || 'batter',
        is_uncapped: UNCAPPED_MVP_PLAYER_KEYS.has(canonicalName),
        pricing_eligible: Boolean(role),
          old_price: Number.isFinite(previous?.final_price) ? previous.final_price : null,
          initial_price: Number.isFinite(previous?.final_price) ? previous.final_price : null,
          recovered_history: Number(previous?.matches_played || 0) === 0 && Number(history.matches_played || 0) > 0,
          match_points: [...(history.match_points || [])],
          points_by_match_no: { ...(history.points_by_match_no || {}) },
          matches_played: Number(history.matches_played || 0),
          missed_fixture_streak: missedFixtureStreak,
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

function mergeOpenFixturePriceSnapshot(previousSnapshot = {}, currentSnapshot = {}) {
  const merged = {};
  Object.entries(currentSnapshot && typeof currentSnapshot === 'object' ? currentSnapshot : {}).forEach(([playerId, currentMeta]) => {
    const previousMeta = previousSnapshot && typeof previousSnapshot === 'object' ? previousSnapshot[playerId] : null;
    merged[playerId] = previousMeta
      ? {
          ...currentMeta,
          final_price: Number.isFinite(Number(previousMeta.final_price)) ? Number(previousMeta.final_price) : currentMeta.final_price,
          is_uncapped: previousMeta.is_uncapped ?? currentMeta.is_uncapped,
          pricing_eligible: previousMeta.pricing_eligible ?? currentMeta.pricing_eligible
        }
      : currentMeta;
  });
  return merged;
}

export function generateMiniFantasyOpenFixturePriceSnapshots(options = {}) {
  const {
    schedule = [],
    squads = {},
    teamRoles = {},
    priceBook = null,
    previousSnapshots = null,
    asOfUtc = new Date().toISOString(),
    season = MINI_FANTASY_SEASON
  } = options;

  const now = new Date(asOfUtc);
  const availability = getMiniFantasyFixtureAvailability(schedule, now, {
    launch_at_utc: MINI_FANTASY_LAUNCH_AT_UTC,
    first_open_match_no: MINI_FANTASY_FIRST_OPEN_MATCH_NO,
    first_match_open_at_utc: MINI_FANTASY_FIRST_MATCH_OPEN_AT_UTC
  });
  const previousFixtureMap = new Map(
    (Array.isArray(previousSnapshots?.fixtures) ? previousSnapshots.fixtures : [])
      .map((fixture) => [Number(fixture?.match_no || 0), fixture])
      .filter(([matchNo]) => Number.isFinite(matchNo) && matchNo > 0)
  );

  return {
    version: MINI_FANTASY_OPEN_FIXTURE_PRICE_SNAPSHOT_VERSION,
    season,
    generated_at_utc: asOfUtc,
    source_price_book_generated_at_utc: priceBook?.generated_at_utc || null,
    fixtures: availability.fixtures.map((fixture) => {
      const matchNo = Number(fixture.match_no || 0);
      const existing = previousFixtureMap.get(matchNo) || null;
      const currentPool = buildFixturePlayerPool({
        fixture,
        priceBook,
        squads,
        teamRoles
      });
      const currentSnapshot = buildEntryPriceSnapshot(currentPool);
      const priceSnapshot = existing?.price_snapshot
        ? mergeOpenFixturePriceSnapshot(existing.price_snapshot, currentSnapshot)
        : currentSnapshot;

      return {
        season,
        match_no: matchNo,
        fixture_label: fixture.fixture || `${fixture.home_team} vs ${fixture.away_team}`,
        home_team_code: fixture.home_team_code || resolveFixtureTeamCode(fixture.home_team),
        away_team_code: fixture.away_team_code || resolveFixtureTeamCode(fixture.away_team),
        opens_at_utc: fixture.opens_at_utc || getMiniFantasyFixtureOpenAtUtc(fixture),
        locks_at_utc: fixture.locks_at_utc || null,
        snapshot_created_at_utc: existing?.snapshot_created_at_utc || asOfUtc,
        source_price_book_generated_at_utc: existing?.source_price_book_generated_at_utc || priceBook?.generated_at_utc || asOfUtc,
        player_count: Object.keys(priceSnapshot).length,
        price_snapshot: priceSnapshot
      };
    })
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
      const matchesPlayed = Number(price?.matches_played || 0);
      const seasonTotalPoints = Number.isFinite(Number(price?.season_total_points))
        ? Number(price.season_total_points)
        : (matchesPlayed && Number.isFinite(Number(price?.season_avg_points))
          ? roundTo(Number(price.season_avg_points) * matchesPlayed, 2)
          : 0);
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
        matches_played: matchesPlayed,
        season_total_points: seasonTotalPoints,
        last_match_points: Number(price?.last_match_points || 0),
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
  appearedByPlayerId = {},
  playerTeamById = {},
  winningTeamCode = '',
  winningPlayerBonus = MINI_FANTASY_WINNING_TEAM_PLAYER_BONUS,
  appearancePlayerBonus = MINI_FANTASY_APPEARANCE_PLAYER_BONUS,
  noResult = false
} = {}) {
  const selected = [...new Set((Array.isArray(selectedPlayerIds) ? selectedPlayerIds : []).filter(Boolean))];
  const resolvedWinningTeamCode = resolveFixtureTeamCode(winningTeamCode);
  const winnerBonusPerPlayer = toNumber(winningPlayerBonus, 0);
  const appearanceBonusPerPlayer = toNumber(appearancePlayerBonus, 0);
  let total = 0;
  selected.forEach((playerId) => {
    const rawPoints = noResult ? 0 : toNumber(pointsByPlayerId[playerId], 0);
    const appeared = noResult ? false : Boolean(appearedByPlayerId[playerId]);
    const playerTeamCode = resolveFixtureTeamCode(playerTeamById[playerId] || resolveMiniFantasyPlayerTeamCode(playerId));
    const appearanceBonus = appeared ? appearanceBonusPerPlayer : 0;
    const winnerBonus = resolvedWinningTeamCode && playerTeamCode === resolvedWinningTeamCode ? winnerBonusPerPlayer : 0;
    const eligiblePoints = rawPoints + appearanceBonus + winnerBonus;
    const multiplier = playerId === captainPlayerId ? MINI_FANTASY_CAPTAIN_MULTIPLIER : 1;
    total += eligiblePoints * multiplier;
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
      const playerId = buildMiniFantasyPlayerId(teamCode, playerName);
      const payload = {
        player_id: playerId,
        name: playerName,
        team: teamCode,
        match_points: [...(history?.match_points || [])],
        points_by_match_no: { ...(history?.points_by_match_no || {}) },
        matches_played: Number(history?.matches_played || 0),
        last_match_played_at_utc: history?.last_match_played_at_utc || null
      };
      index.set(playerId, payload);
      buildMiniFantasyAliasPlayerIds(teamCode, playerName).forEach((aliasPlayerId) => {
        if (index.has(aliasPlayerId)) return;
        index.set(aliasPlayerId, {
          ...payload,
          player_id: aliasPlayerId
        });
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

function mergeMvpStatValue(existingValue, incomingValue) {
  if (existingValue == null) return roundTo(toNumber(incomingValue, 0), 2);
  if (incomingValue == null) return roundTo(toNumber(existingValue, 0), 2);
  const existing = roundTo(toNumber(existingValue, 0), 2);
  const incoming = roundTo(toNumber(incomingValue, 0), 2);
  return Math.abs(incoming) > Math.abs(existing) ? incoming : existing;
}

function mergeMvpBonusPayload(existingBonus = {}, incomingBonus = {}) {
  const merged = { ...(existingBonus || {}) };
  [
    'sr',
    'economy',
    'ducks',
    'batting50s',
    'batting100s',
    'impact30s',
    'bowling3w',
    'bowling4w',
    'bowling5w'
  ].forEach((key) => {
    merged[key] = mergeMvpStatValue(existingBonus?.[key], incomingBonus?.[key]);
  });
  return merged;
}

function mergeMvpValuePayload(existingPayload = {}, incomingPayload = {}) {
  return {
    score: mergeMvpStatValue(existingPayload?.score, incomingPayload?.score),
    runs: mergeMvpStatValue(existingPayload?.runs, incomingPayload?.runs),
    fours: mergeMvpStatValue(existingPayload?.fours, incomingPayload?.fours),
    sixes: mergeMvpStatValue(existingPayload?.sixes, incomingPayload?.sixes),
    wickets: mergeMvpStatValue(existingPayload?.wickets, incomingPayload?.wickets),
    dotBalls: mergeMvpStatValue(existingPayload?.dotBalls, incomingPayload?.dotBalls),
    catches: mergeMvpStatValue(existingPayload?.catches, incomingPayload?.catches),
    stumpings: mergeMvpStatValue(existingPayload?.stumpings, incomingPayload?.stumpings),
    battingStrikeRate: mergeMvpStatValue(existingPayload?.battingStrikeRate, incomingPayload?.battingStrikeRate),
    economy: mergeMvpStatValue(existingPayload?.economy, incomingPayload?.economy),
    bonuses: mergeMvpBonusPayload(existingPayload?.bonuses || {}, incomingPayload?.bonuses || {})
  };
}

function snapshotMvpValuePayloadLookup(snapshot = {}) {
  const rawValues = snapshot?.mvp?.values && typeof snapshot.mvp.values === 'object' ? snapshot.mvp.values : {};
  return Object.entries(rawValues).reduce((lookup, [playerName, payload]) => {
    const canonical = canonicalHistoryKey(playerName);
    lookup.set(canonical, mergeMvpValuePayload(lookup.get(canonical), payload || {}));
    return lookup;
  }, new Map());
}

function positiveDelta(currentValue, previousValue) {
  return roundTo(Math.max(0, toNumber(currentValue, 0) - toNumber(previousValue, 0)), 2);
}

function signedDelta(currentValue, previousValue) {
  return roundTo(toNumber(currentValue, 0) - toNumber(previousValue, 0), 2);
}

function buildMiniFantasyBaseBreakdown(currentPayload = {}, previousPayload = {}) {
  const runs = positiveDelta(currentPayload?.runs, previousPayload?.runs);
  const fours = positiveDelta(currentPayload?.fours, previousPayload?.fours);
  const sixes = positiveDelta(currentPayload?.sixes, previousPayload?.sixes);
  const wickets = positiveDelta(currentPayload?.wickets, previousPayload?.wickets);
  const dotBalls = positiveDelta(currentPayload?.dotBalls, previousPayload?.dotBalls);
  const catches = positiveDelta(currentPayload?.catches, previousPayload?.catches);
  const stumpings = positiveDelta(currentPayload?.stumpings, previousPayload?.stumpings);

  const strikeRateBonusPoints = signedDelta(currentPayload?.bonuses?.sr, previousPayload?.bonuses?.sr);
  const economyBonusPoints = signedDelta(currentPayload?.bonuses?.economy, previousPayload?.bonuses?.economy);

  const batting50s = positiveDelta(currentPayload?.bonuses?.batting50s, previousPayload?.bonuses?.batting50s);
  const batting100s = positiveDelta(currentPayload?.bonuses?.batting100s, previousPayload?.bonuses?.batting100s);
  const impact30s = positiveDelta(currentPayload?.bonuses?.impact30s, previousPayload?.bonuses?.impact30s);
  const bowling3w = positiveDelta(currentPayload?.bonuses?.bowling3w, previousPayload?.bonuses?.bowling3w);
  const bowling4w = positiveDelta(currentPayload?.bonuses?.bowling4w, previousPayload?.bonuses?.bowling4w);
  const bowling5w = positiveDelta(currentPayload?.bonuses?.bowling5w, previousPayload?.bonuses?.bowling5w);
  const ducks = positiveDelta(currentPayload?.bonuses?.ducks, previousPayload?.bonuses?.ducks);

  const runsPoints = runs;
  const fourBonusPoints = roundTo(fours * MINI_FANTASY_FOUR_BONUS_POINTS, 2);
  const sixesBonusPoints = roundTo(sixes * 2, 2);
  const wicketPoints = roundTo(wickets * MINI_FANTASY_WICKET_POINTS, 2);
  const dotBallPoints = roundTo(dotBalls * MINI_FANTASY_DOT_BALL_POINTS, 2);
  const catchPoints = roundTo(catches * 8, 2);
  const stumpingPoints = roundTo(stumpings * 12, 2);
  const milestoneBonusPoints = roundTo(
    (batting50s * MINI_FANTASY_MILESTONE_POINTS.batting50) +
    (batting100s * MINI_FANTASY_MILESTONE_POINTS.batting100) +
    (impact30s * MINI_FANTASY_MILESTONE_POINTS.impact30) +
    (bowling3w * MINI_FANTASY_MILESTONE_POINTS.bowling3w) +
    (bowling4w * MINI_FANTASY_MILESTONE_POINTS.bowling4w) +
    (bowling5w * MINI_FANTASY_MILESTONE_POINTS.bowling5w),
    2
  );
  const duckPenaltyPoints = roundTo(ducks * MINI_FANTASY_DUCK_PENALTY, 2);
  const totalPoints = roundTo(
    runsPoints +
    fourBonusPoints +
    sixesBonusPoints +
    wicketPoints +
    dotBallPoints +
    catchPoints +
    stumpingPoints +
    strikeRateBonusPoints +
    economyBonusPoints +
    milestoneBonusPoints +
    duckPenaltyPoints,
    2
  );

  return {
    runs,
    fours,
    sixes,
    wickets,
    dot_balls: dotBalls,
    catches,
    stumpings,
    milestone_counts: {
      batting50s,
      batting100s,
      impact30s,
      bowling3w,
      bowling4w,
      bowling5w,
      ducks
    },
    runs_points: runsPoints,
    four_bonus_points: fourBonusPoints,
    sixes_bonus_points: sixesBonusPoints,
    wicket_points: wicketPoints,
    dot_ball_points: dotBallPoints,
    catch_points: catchPoints,
    stumping_points: stumpingPoints,
    strike_rate_bonus_points: strikeRateBonusPoints,
    economy_bonus_points: economyBonusPoints,
    milestone_bonus_points: milestoneBonusPoints,
    duck_penalty_points: duckPenaltyPoints,
    total_points: totalPoints
  };
}

function calculateMiniFantasyStrikeRateBonusPoints(runs = 0, balls = 0) {
  const numericRuns = toNumber(runs, 0);
  const numericBalls = toNumber(balls, 0);
  if (numericBalls <= 0 || (numericRuns < 30 && numericBalls < 10)) return 0;
  const strikeRate = (100 * numericRuns) / numericBalls;
  if (strikeRate > 170) return 8;
  if (strikeRate > 150) return 5;
  if (strikeRate > 130) return 2;
  if (strikeRate < 100) return -5;
  return 0;
}

function calculateMiniFantasyEconomyBonusPoints(runsConceded = 0, ballsBowled = 0) {
  const numericRunsConceded = toNumber(runsConceded, 0);
  const numericBallsBowled = toNumber(ballsBowled, 0);
  if (numericBallsBowled < 12) return 0;
  const economyRate = (numericRunsConceded * 6) / numericBallsBowled;
  if (economyRate < 6) return 8;
  if (economyRate < 7) return 5;
  if (economyRate < 8) return 2;
  if (economyRate > 10) return -5;
  return 0;
}

export function buildMiniFantasyPlayerRecordFromStats({
  runs = 0,
  battingBalls = 0,
  fours = 0,
  sixes = 0,
  wickets = 0,
  bowlingBalls = 0,
  runsConceded = 0,
  catches = 0,
  stumpings = 0,
  dotBalls = 0,
  dismissed = false
} = {}) {
  const numericRuns = Math.max(0, roundTo(toNumber(runs, 0), 2));
  const numericBattingBalls = Math.max(0, Math.trunc(toNumber(battingBalls, 0)));
  const numericFours = Math.max(0, Math.trunc(toNumber(fours, 0)));
  const numericSixes = Math.max(0, Math.trunc(toNumber(sixes, 0)));
  const numericWickets = Math.max(0, Math.trunc(toNumber(wickets, 0)));
  const numericBowlingBalls = Math.max(0, Math.trunc(toNumber(bowlingBalls, 0)));
  const numericRunsConceded = Math.max(0, roundTo(toNumber(runsConceded, 0), 2));
  const numericCatches = Math.max(0, Math.trunc(toNumber(catches, 0)));
  const numericStumpings = Math.max(0, Math.trunc(toNumber(stumpings, 0)));
  const numericDotBalls = Math.max(0, Math.trunc(toNumber(dotBalls, 0)));

  const batting50s = numericRuns >= 50 ? 1 : 0;
  const batting100s = numericRuns >= 100 ? 1 : 0;
  const impact30s = numericRuns >= 30 ? 1 : 0;
  const ducks = dismissed && numericRuns === 0 ? 1 : 0;
  const bowling3w = numericWickets >= 3 ? 1 : 0;
  const bowling4w = numericWickets >= 4 ? 1 : 0;
  const bowling5w = numericWickets >= 5 ? 1 : 0;

  const runsPoints = numericRuns;
  const fourBonusPoints = roundTo(numericFours * MINI_FANTASY_FOUR_BONUS_POINTS, 2);
  const sixesBonusPoints = roundTo(numericSixes * 2, 2);
  const wicketPoints = roundTo(numericWickets * MINI_FANTASY_WICKET_POINTS, 2);
  const dotBallPoints = roundTo(numericDotBalls * MINI_FANTASY_DOT_BALL_POINTS, 2);
  const catchPoints = roundTo(numericCatches * 8, 2);
  const stumpingPoints = roundTo(numericStumpings * 12, 2);
  const strikeRateBonusPoints = calculateMiniFantasyStrikeRateBonusPoints(numericRuns, numericBattingBalls);
  const economyBonusPoints = calculateMiniFantasyEconomyBonusPoints(numericRunsConceded, numericBowlingBalls);
  const milestoneBonusPoints = roundTo(
    (batting50s * MINI_FANTASY_MILESTONE_POINTS.batting50) +
    (batting100s * MINI_FANTASY_MILESTONE_POINTS.batting100) +
    (impact30s * MINI_FANTASY_MILESTONE_POINTS.impact30) +
    (bowling3w * MINI_FANTASY_MILESTONE_POINTS.bowling3w) +
    (bowling4w * MINI_FANTASY_MILESTONE_POINTS.bowling4w) +
    (bowling5w * MINI_FANTASY_MILESTONE_POINTS.bowling5w),
    2
  );
  const duckPenaltyPoints = roundTo(ducks * MINI_FANTASY_DUCK_PENALTY, 2);
  const totalPoints = roundTo(
    runsPoints +
    fourBonusPoints +
    sixesBonusPoints +
    wicketPoints +
    dotBallPoints +
    catchPoints +
    stumpingPoints +
    strikeRateBonusPoints +
    economyBonusPoints +
    milestoneBonusPoints +
    duckPenaltyPoints,
    2
  );
  const appeared = numericBattingBalls > 0
    || numericBowlingBalls > 0
    || numericCatches > 0
    || numericStumpings > 0
    || numericRuns > 0
    || numericWickets > 0
    || numericDotBalls > 0
    || numericRunsConceded > 0
    || Boolean(dismissed);

  return {
    points: totalPoints,
    appeared,
    base_breakdown: {
      runs: numericRuns,
      fours: numericFours,
      sixes: numericSixes,
      wickets: numericWickets,
      dot_balls: numericDotBalls,
      catches: numericCatches,
      stumpings: numericStumpings,
      batting_balls: numericBattingBalls,
      bowling_balls: numericBowlingBalls,
      bowling_runs_conceded: numericRunsConceded,
      milestone_counts: {
        batting50s,
        batting100s,
        impact30s,
        bowling3w,
        bowling4w,
        bowling5w,
        ducks
      },
      runs_points: runsPoints,
      four_bonus_points: fourBonusPoints,
      sixes_bonus_points: sixesBonusPoints,
      wicket_points: wicketPoints,
      dot_ball_points: dotBallPoints,
      catch_points: catchPoints,
      stumping_points: stumpingPoints,
      strike_rate_bonus_points: strikeRateBonusPoints,
      economy_bonus_points: economyBonusPoints,
      milestone_bonus_points: milestoneBonusPoints,
      duck_penalty_points: duckPenaltyPoints,
      total_points: totalPoints
    }
  };
}

function mergeSnapshotAggregateValue(existingValue, incomingValue) {
  if (existingValue == null) return roundTo(toNumber(incomingValue, 0), 2);
  if (incomingValue == null) return roundTo(toNumber(existingValue, 0), 2);
  const existing = roundTo(toNumber(existingValue, 0), 2);
  const incoming = roundTo(toNumber(incomingValue, 0), 2);
  return Math.abs(incoming) > Math.abs(existing) ? incoming : existing;
}

function snapshotAggregateLookup(snapshot = {}, aggregateKey = '') {
  const rawValues = snapshot?.meta?.aggregates?.[aggregateKey];
  return Object.entries(rawValues && typeof rawValues === 'object' ? rawValues : {}).reduce((lookup, [playerName, value]) => {
    const canonical = canonicalHistoryKey(playerName);
    lookup.set(canonical, mergeSnapshotAggregateValue(lookup.get(canonical), value));
    return lookup;
  }, new Map());
}

function buildMiniFantasyAggregateBreakdownLookup(currentSnapshot = {}, previousSnapshot = {}) {
  const aggregateKeys = [
    'battingRuns',
    'battingBalls',
    'battingFours',
    'battingSixes',
    'bowlingWickets',
    'bowlingBalls',
    'bowlingRunsConceded',
    'catches',
    'stumpings',
    'bowlingDots',
    'battingFifties',
    'battingHundreds',
    'battingImpact30s',
    'battingDucks',
    'bowling3w',
    'bowling4w',
    'bowling5w'
  ];
  const currentLookups = Object.fromEntries(aggregateKeys.map((key) => [key, snapshotAggregateLookup(currentSnapshot, key)]));
  const previousLookups = Object.fromEntries(aggregateKeys.map((key) => [key, snapshotAggregateLookup(previousSnapshot, key)]));
  const breakdownLookup = new Map();
  const canonicalNames = new Set(
    aggregateKeys.flatMap((key) => [
      ...currentLookups[key].keys(),
      ...previousLookups[key].keys()
    ])
  );

  canonicalNames.forEach((canonicalName) => {
    const runs = positiveDelta(currentLookups.battingRuns.get(canonicalName), previousLookups.battingRuns.get(canonicalName));
    const battingBalls = positiveDelta(currentLookups.battingBalls.get(canonicalName), previousLookups.battingBalls.get(canonicalName));
    const fours = positiveDelta(currentLookups.battingFours.get(canonicalName), previousLookups.battingFours.get(canonicalName));
    const sixes = positiveDelta(currentLookups.battingSixes.get(canonicalName), previousLookups.battingSixes.get(canonicalName));
    const wickets = positiveDelta(currentLookups.bowlingWickets.get(canonicalName), previousLookups.bowlingWickets.get(canonicalName));
    const bowlingBalls = positiveDelta(currentLookups.bowlingBalls.get(canonicalName), previousLookups.bowlingBalls.get(canonicalName));
    const runsConceded = positiveDelta(currentLookups.bowlingRunsConceded.get(canonicalName), previousLookups.bowlingRunsConceded.get(canonicalName));
    const catches = positiveDelta(currentLookups.catches.get(canonicalName), previousLookups.catches.get(canonicalName));
    const stumpings = positiveDelta(currentLookups.stumpings.get(canonicalName), previousLookups.stumpings.get(canonicalName));
    const dotBalls = positiveDelta(currentLookups.bowlingDots.get(canonicalName), previousLookups.bowlingDots.get(canonicalName));
    const batting50s = positiveDelta(currentLookups.battingFifties.get(canonicalName), previousLookups.battingFifties.get(canonicalName));
    const batting100s = positiveDelta(currentLookups.battingHundreds.get(canonicalName), previousLookups.battingHundreds.get(canonicalName));
    const impact30s = positiveDelta(currentLookups.battingImpact30s.get(canonicalName), previousLookups.battingImpact30s.get(canonicalName));
    const ducks = positiveDelta(currentLookups.battingDucks.get(canonicalName), previousLookups.battingDucks.get(canonicalName));
    const bowling3w = positiveDelta(currentLookups.bowling3w.get(canonicalName), previousLookups.bowling3w.get(canonicalName));
    const bowling4w = positiveDelta(currentLookups.bowling4w.get(canonicalName), previousLookups.bowling4w.get(canonicalName));
    const bowling5w = positiveDelta(currentLookups.bowling5w.get(canonicalName), previousLookups.bowling5w.get(canonicalName));

    const runsPoints = runs;
    const fourBonusPoints = roundTo(fours * MINI_FANTASY_FOUR_BONUS_POINTS, 2);
    const sixesBonusPoints = roundTo(sixes * 2, 2);
    const wicketPoints = roundTo(wickets * MINI_FANTASY_WICKET_POINTS, 2);
    const dotBallPoints = roundTo(dotBalls * MINI_FANTASY_DOT_BALL_POINTS, 2);
    const catchPoints = roundTo(catches * 8, 2);
    const stumpingPoints = roundTo(stumpings * 12, 2);
    const strikeRateBonusPoints = calculateMiniFantasyStrikeRateBonusPoints(runs, battingBalls);
    const economyBonusPoints = calculateMiniFantasyEconomyBonusPoints(runsConceded, bowlingBalls);
    const milestoneBonusPoints = roundTo(
      (batting50s * MINI_FANTASY_MILESTONE_POINTS.batting50) +
      (batting100s * MINI_FANTASY_MILESTONE_POINTS.batting100) +
      (impact30s * MINI_FANTASY_MILESTONE_POINTS.impact30) +
      (bowling3w * MINI_FANTASY_MILESTONE_POINTS.bowling3w) +
      (bowling4w * MINI_FANTASY_MILESTONE_POINTS.bowling4w) +
      (bowling5w * MINI_FANTASY_MILESTONE_POINTS.bowling5w),
      2
    );
    const duckPenaltyPoints = roundTo(ducks * MINI_FANTASY_DUCK_PENALTY, 2);
    const totalPoints = roundTo(
      runsPoints +
      fourBonusPoints +
      sixesBonusPoints +
      wicketPoints +
      dotBallPoints +
      catchPoints +
      stumpingPoints +
      strikeRateBonusPoints +
      economyBonusPoints +
      milestoneBonusPoints +
      duckPenaltyPoints,
      2
    );

    const hasSignal = [
      runs,
      battingBalls,
      fours,
      sixes,
      wickets,
      bowlingBalls,
      runsConceded,
      catches,
      stumpings,
      dotBalls,
      batting50s,
      batting100s,
      impact30s,
      ducks,
      bowling3w,
      bowling4w,
      bowling5w
    ].some((value) => Math.abs(toNumber(value, 0)) > 0.001);
    if (!hasSignal) return;

    breakdownLookup.set(canonicalName, {
      runs,
      fours,
      sixes,
      wickets,
      dot_balls: dotBalls,
      catches,
      stumpings,
      batting_balls: battingBalls,
      bowling_balls: bowlingBalls,
      bowling_runs_conceded: runsConceded,
      milestone_counts: {
        batting50s,
        batting100s,
        impact30s,
        bowling3w,
        bowling4w,
        bowling5w,
        ducks
      },
      runs_points: runsPoints,
      four_bonus_points: fourBonusPoints,
      sixes_bonus_points: sixesBonusPoints,
      wicket_points: wicketPoints,
      dot_ball_points: dotBallPoints,
      catch_points: catchPoints,
      stumping_points: stumpingPoints,
      strike_rate_bonus_points: strikeRateBonusPoints,
      economy_bonus_points: economyBonusPoints,
      milestone_bonus_points: milestoneBonusPoints,
      duck_penalty_points: duckPenaltyPoints,
      total_points: totalPoints
    });
  });

  return breakdownLookup;
}

function buildMiniFantasySnapshotBreakdownLookup({
  liveData = {},
  matchNo = null,
  completedMatchCount = undefined
} = {}) {
  const targetMatchNo = Number(matchNo || 0) || null;
  if (!targetMatchNo) return new Map();

  const scoreHistory = [...(Array.isArray(liveData?.meta?.scoreHistory) ? liveData.meta.scoreHistory : [])]
    .sort((a, b) => toNumber(a?.processedMatchCount, 0) - toNumber(b?.processedMatchCount, 0));
  const resolvedCompletedMatchCount = Number.isFinite(Number(completedMatchCount))
    ? Number(completedMatchCount)
    : getCompletedMiniFantasyMatchCount(liveData);

  let currentSnapshot = null;
  let previousSnapshot = null;

  if (targetMatchNo <= resolvedCompletedMatchCount) {
    const targetIndex = scoreHistory.findIndex((entry) => Number(entry?.processedMatchCount || 0) === targetMatchNo);
    if (targetIndex === -1) return new Map();
    currentSnapshot = scoreHistory[targetIndex]?.snapshot || null;
    previousSnapshot = targetIndex > 0 ? (scoreHistory[targetIndex - 1]?.snapshot || null) : null;
  } else if (targetMatchNo === resolvedCompletedMatchCount + 1) {
    currentSnapshot = liveData || null;
    previousSnapshot = latestCompletedScoreHistoryEntry(liveData)?.snapshot || null;
  } else {
    return new Map();
  }

  const aggregateLookup = buildMiniFantasyAggregateBreakdownLookup(currentSnapshot || {}, previousSnapshot || {});
  const currentLookup = snapshotMvpValuePayloadLookup(currentSnapshot || {});
  const previousLookup = snapshotMvpValuePayloadLookup(previousSnapshot || {});
  const breakdownLookup = new Map();
  const canonicalNames = new Set([...aggregateLookup.keys(), ...currentLookup.keys(), ...previousLookup.keys()]);
  canonicalNames.forEach((canonicalName) => {
    if (aggregateLookup.has(canonicalName)) {
      breakdownLookup.set(canonicalName, aggregateLookup.get(canonicalName));
      return;
    }
    breakdownLookup.set(
      canonicalName,
      buildMiniFantasyBaseBreakdown(currentLookup.get(canonicalName) || {}, previousLookup.get(canonicalName) || {})
    );
  });
  return breakdownLookup;
}

function resolveMiniFantasySnapshotBreakdown(playerName = '', breakdownLookup = new Map()) {
  if (!(breakdownLookup instanceof Map) || !normalizeWhitespace(playerName)) return null;
  const candidateKeys = [...new Set(buildNameAliasKeys(playerName).map((alias) => canonicalHistoryKey(alias)))];
  for (const candidateKey of candidateKeys) {
    if (breakdownLookup.has(candidateKey)) {
      return breakdownLookup.get(candidateKey);
    }
  }
  return null;
}

function snapshotPlayerMatches(snapshot = {}) {
  const rawMatches = snapshot?.meta?.aggregates?.playerMatches || {};
  return Object.entries(rawMatches).reduce((canonicalized, [playerName, matches]) => {
    const canonical = canonicalHistoryKey(playerName);
    const numericMatches = Math.max(0, Math.trunc(toNumber(matches, 0)));
    canonicalized[canonical] = Math.max(
      Math.max(0, Math.trunc(toNumber(canonicalized[canonical], 0))),
      numericMatches
    );
    return canonicalized;
  }, {});
}

function snapshotMvpScoreLookup(snapshot = {}) {
  const currentScoreValues = snapshot?.mvp?.values || {};
  return Object.entries(currentScoreValues).reduce((canonicalized, [playerName, payload]) => {
    const canonical = canonicalHistoryKey(playerName);
    canonicalized[canonical] = mergeCanonicalSnapshotScore(canonicalized[canonical], payload?.score);
    return canonicalized;
  }, {});
}

function hasFixturePoints(pointsByMatchNo = {}, matchNo = null) {
  const targetMatchNo = Number(matchNo || 0) || null;
  if (!targetMatchNo || !pointsByMatchNo || typeof pointsByMatchNo !== 'object') return false;
  return Object.prototype.hasOwnProperty.call(pointsByMatchNo, targetMatchNo);
}

function buildMiniFantasyLiveDeltaHistoryMap({
  liveData = {},
  schedule = [],
  matchNo = null
} = {}) {
  const targetMatchNo = Number(matchNo || 0) || null;
  const liveDeltaHistories = new Map();
  if (!targetMatchNo) return liveDeltaHistories;

  const lastCompletedEntry = latestCompletedScoreHistoryEntry(liveData);
  const previousSnapshot = lastCompletedEntry?.snapshot || {};
  const currentSnapshot = liveData || {};
  const previousMatches = snapshotPlayerMatches(previousSnapshot);
  const currentMatches = snapshotPlayerMatches(currentSnapshot);
  const previousScores = snapshotMvpScoreLookup(previousSnapshot);
  const currentScores = snapshotMvpScoreLookup(currentSnapshot);
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
    const canonical = canonicalHistoryKey(playerName);
    liveDeltaHistories.set(canonical, mergeHistoryRecord(liveDeltaHistories.get(canonical), {
      player_name: playerName,
      match_points: [livePoints],
      points_by_match_no: { [targetMatchNo]: livePoints },
      matches_played: matchDelta,
      last_match_played_at_utc: playedAt
    }));
  });

  return liveDeltaHistories;
}

function buildMiniFantasyFixturePlayerRecordMap({
  liveData = {},
  schedule = [],
  squads = {},
  matchNo = null,
  playerPointsIndex = null,
  completedMatchCount = undefined,
  liveDeltaHistoryMap = null
} = {}) {
  const targetMatchNo = Number(matchNo || 0) || null;
  const recordMap = new Map();
  if (!targetMatchNo) return recordMap;

  const baseIndex = playerPointsIndex instanceof Map
    ? playerPointsIndex
    : buildMiniFantasyPlayerPointsIndex({ liveData, schedule, squads });
  const resolvedCompletedMatchCount = Number.isFinite(Number(completedMatchCount))
    ? Number(completedMatchCount)
    : getCompletedMiniFantasyMatchCount(liveData);
  const breakdownLookup = buildMiniFantasySnapshotBreakdownLookup({
    liveData,
    matchNo: targetMatchNo,
    completedMatchCount: resolvedCompletedMatchCount
  });

  if (targetMatchNo <= resolvedCompletedMatchCount) {
    baseIndex.forEach((payload, playerId) => {
      const pointsByMatchNo = payload?.points_by_match_no || {};
      const baseBreakdown = resolveMiniFantasySnapshotBreakdown(payload?.name || '', breakdownLookup);
      const record = {
        points: toNumber(pointsByMatchNo[targetMatchNo], 0),
        appeared: hasFixturePoints(pointsByMatchNo, targetMatchNo),
        base_breakdown: baseBreakdown && typeof baseBreakdown === 'object'
          ? { ...baseBreakdown, total_points: toNumber(pointsByMatchNo[targetMatchNo], 0) }
          : null
      };
      recordMap.set(playerId, record);
      const teamCode = payload?.team || resolveMiniFantasyPlayerTeamCode(playerId);
      const playerName = payload?.name || '';
      buildMiniFantasyAliasPlayerIds(teamCode, playerName).forEach((aliasPlayerId) => {
        if (recordMap.has(aliasPlayerId)) return;
        recordMap.set(aliasPlayerId, { ...record });
      });
    });
    return recordMap;
  }

  if (targetMatchNo !== resolvedCompletedMatchCount + 1) {
    return recordMap;
  }

  const liveDeltaHistories = liveDeltaHistoryMap instanceof Map
    ? liveDeltaHistoryMap
    : buildMiniFantasyLiveDeltaHistoryMap({ liveData, schedule, matchNo: targetMatchNo });

  Object.entries(squads || {}).forEach(([teamCode, squadPlayers]) => {
    (Array.isArray(squadPlayers) ? squadPlayers : []).forEach((playerName) => {
      const playerId = buildMiniFantasyPlayerId(teamCode, playerName);
      const history = resolvePlayerHistory(playerName, liveDeltaHistories);
      const pointsByMatchNo = history?.points_by_match_no || {};
      const baseBreakdown = resolveMiniFantasySnapshotBreakdown(playerName, breakdownLookup);
      const record = {
        points: toNumber(pointsByMatchNo[targetMatchNo], 0),
        appeared: hasFixturePoints(pointsByMatchNo, targetMatchNo),
        base_breakdown: baseBreakdown && typeof baseBreakdown === 'object'
          ? { ...baseBreakdown, total_points: toNumber(pointsByMatchNo[targetMatchNo], 0) }
          : null
      };
      recordMap.set(playerId, record);
      buildMiniFantasyAliasPlayerIds(teamCode, playerName).forEach((aliasPlayerId) => {
        if (recordMap.has(aliasPlayerId)) return;
        recordMap.set(aliasPlayerId, { ...record });
      });
    });
  });

  return recordMap;
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
  buildMiniFantasyFixturePlayerRecordMap({ liveData, schedule, squads, matchNo }).forEach((record, playerId) => {
    pointsIndex.set(playerId, toNumber(record?.points, 0));
  });
  return pointsIndex;
}

function cachedMiniFantasyMatchList(liveData = {}) {
  return Array.isArray(liveData?.meta?.cache?.matchList) ? liveData.meta.cache.matchList : [];
}

function isMiniFantasyNoResultStatus(statusText = '') {
  const status = normalizeWhitespace(statusText).toLowerCase();
  if (!status) return false;
  return status.includes('no result') || status.includes('abandon') || status.includes('abandoned') || status.includes('washout');
}

function resolveMiniFantasyStatusWinner(cachedMatch = null, fixture = null) {
  const candidateTeams = [
    ...(Array.isArray(cachedMatch?.teams) ? cachedMatch.teams : []),
    fixture?.home_team,
    fixture?.away_team
  ]
    .map((team) => normalizeWhitespace(team))
    .filter(Boolean);
  const status = normalizeWhitespace(cachedMatch?.status || '');
  if (!status) return '';
  const lowerStatus = status.toLowerCase();
  return [...new Set(candidateTeams)]
    .sort((a, b) => b.length - a.length)
    .find((team) => {
      const lowerTeam = team.toLowerCase();
      const teamIndex = lowerStatus.indexOf(lowerTeam);
      if (teamIndex === -1) return false;
      return /\bwon\b/.test(lowerStatus.slice(teamIndex));
    }) || '';
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
  if (isMiniFantasyNoResultStatus(status)) return '';

  const statusWinner = resolveMiniFantasyStatusWinner(cachedMatch, fixture);
  if (statusWinner) return resolveFixtureTeamCode(statusWinner);
  if (/tied|tie\b/i.test(status)) return '';

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

export function isMiniFantasyNoResultFixture({
  liveData = {},
  matchNo = null
} = {}) {
  const targetMatchNo = Number(matchNo || 0) || null;
  if (!targetMatchNo) return false;
  const cachedMatch = cachedMiniFantasyMatchList(liveData).find((match) => Number(match?.matchNo || 0) === targetMatchNo) || null;
  return isMiniFantasyNoResultStatus(cachedMatch?.status || '');
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

function calculateMiniFantasyAppearanceBonus({
  selectedPlayerIds = [],
  appearedByPlayerId = {},
  appearancePlayerBonus = MINI_FANTASY_APPEARANCE_PLAYER_BONUS
} = {}) {
  const bonusPerPlayer = toNumber(appearancePlayerBonus, 0);
  if (bonusPerPlayer <= 0) return 0;
  return roundTo(
    [...new Set((Array.isArray(selectedPlayerIds) ? selectedPlayerIds : []).filter(Boolean))]
      .reduce((total, playerId) => total + (appearedByPlayerId[playerId] ? bonusPerPlayer : 0), 0),
    2
  );
}

function fallbackMiniFantasyPlayerName(playerId = '') {
  const raw = normalizeWhitespace(playerId || '').split('_').slice(1).join(' ') || normalizeWhitespace(playerId || '');
  if (!raw) return 'Unknown player';
  return raw
    .split('-')
    .map((part) => (part ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : ''))
    .join(' ')
    .trim() || raw;
}

export function scoreMiniFantasyEntry({
  entry = {},
  liveData = {},
  schedule = [],
  squads = {},
  fixtureRecordMap = null,
  winningTeamCode = undefined,
  noResult = undefined,
  completedMatchCount = undefined
} = {}) {
  const matchNo = Number(entry?.matchNo || entry?.match_no || 0) || null;
  const resolvedCompletedMatchCount = Number.isFinite(Number(completedMatchCount))
    ? Number(completedMatchCount)
    : getCompletedMiniFantasyMatchCount(liveData);
  const selectedPlayerIds = Array.isArray(entry?.selectedPlayerIds) ? entry.selectedPlayerIds : (Array.isArray(entry?.selected_player_ids) ? entry?.selected_player_ids : []);
  const captainPlayerId = entry?.captainPlayerId || entry?.captain_player_id || '';
  const resolvedFixtureRecordMap = fixtureRecordMap instanceof Map
    ? fixtureRecordMap
    : buildMiniFantasyFixturePlayerRecordMap({
        liveData,
        schedule,
        squads,
        matchNo,
        completedMatchCount: resolvedCompletedMatchCount
      });
  const pointsByPlayerId = Object.fromEntries(selectedPlayerIds.map((playerId) => [playerId, toNumber(resolvedFixtureRecordMap.get(playerId)?.points, 0)]));
  const appearedByPlayerId = Object.fromEntries(selectedPlayerIds.map((playerId) => [playerId, Boolean(resolvedFixtureRecordMap.get(playerId)?.appeared)]));
  const playerTeamById = Object.fromEntries(selectedPlayerIds.map((playerId) => [playerId, resolveMiniFantasyPlayerTeamCode(playerId)]));
  const resolvedNoResult = typeof noResult === 'boolean'
    ? noResult
    : (matchNo && matchNo <= resolvedCompletedMatchCount
        ? isMiniFantasyNoResultFixture({ liveData, matchNo })
        : false);
  const resolvedWinningTeamCode = typeof winningTeamCode === 'string'
    ? winningTeamCode
    : (matchNo && matchNo <= resolvedCompletedMatchCount
        ? (resolvedNoResult ? '' : getMiniFantasyWinningTeamCode({ liveData, schedule, matchNo }))
        : '');
  const totalPoints = matchNo && matchNo <= resolvedCompletedMatchCount
    ? scoreMiniFantasyLineup({
        selectedPlayerIds,
        captainPlayerId,
        pointsByPlayerId,
        appearedByPlayerId,
        playerTeamById,
        winningTeamCode: resolvedWinningTeamCode,
        noResult: resolvedNoResult
      })
    : 0;
  const scoredPointsByPlayerId = {};
  const appearanceBonusByPlayerId = {};
  const winnerBonusByPlayerId = {};
  const eligiblePointsByPlayerId = {};
  const baseBreakdownByPlayerId = {};
  selectedPlayerIds.forEach((playerId) => {
    const basePoints = resolvedNoResult ? 0 : toNumber(pointsByPlayerId[playerId], 0);
    const appeared = resolvedNoResult ? false : Boolean(appearedByPlayerId[playerId]);
    const appearanceBonus = appeared ? MINI_FANTASY_APPEARANCE_PLAYER_BONUS : 0;
    const winnerBonus = !resolvedNoResult && resolveFixtureTeamCode(playerTeamById[playerId]) === resolveFixtureTeamCode(resolvedWinningTeamCode)
      ? MINI_FANTASY_WINNING_TEAM_PLAYER_BONUS
      : 0;
    const eligiblePoints = basePoints + appearanceBonus + winnerBonus;
    const multiplier = playerId === captainPlayerId ? MINI_FANTASY_CAPTAIN_MULTIPLIER : 1;
    const recordBreakdown = resolvedFixtureRecordMap.get(playerId)?.base_breakdown;
    appearanceBonusByPlayerId[playerId] = appearanceBonus;
    winnerBonusByPlayerId[playerId] = winnerBonus;
    eligiblePointsByPlayerId[playerId] = eligiblePoints;
    scoredPointsByPlayerId[playerId] = roundTo(eligiblePoints * multiplier, 2);
    baseBreakdownByPlayerId[playerId] = recordBreakdown && typeof recordBreakdown === 'object'
      ? {
          ...recordBreakdown,
          total_points: basePoints
        }
      : null;
  });
  return {
    match_no: matchNo,
    is_scored: Boolean(matchNo && matchNo <= resolvedCompletedMatchCount),
    is_no_result: Boolean(resolvedNoResult),
    total_points: totalPoints,
    points_by_player_id: pointsByPlayerId,
    appeared_by_player_id: appearedByPlayerId,
    appearance_bonus_by_player_id: appearanceBonusByPlayerId,
    winner_bonus_by_player_id: winnerBonusByPlayerId,
    eligible_points_by_player_id: eligiblePointsByPlayerId,
    scored_points_by_player_id: scoredPointsByPlayerId,
    base_breakdown_by_player_id: baseBreakdownByPlayerId,
    winning_team_code: resolvedWinningTeamCode || null,
    winner_bonus_points: calculateMiniFantasyWinningTeamBonus({
      selectedPlayerIds,
      playerTeamById,
      winningTeamCode: resolvedWinningTeamCode
    }),
    appearance_bonus_points: resolvedNoResult ? 0 : calculateMiniFantasyAppearanceBonus({
      selectedPlayerIds,
      appearedByPlayerId
    })
  };
}

export function buildMiniFantasyEntryAuditLog({
  entry = {},
  score = null,
  liveData = {},
  schedule = [],
  squads = {},
  fixtureRecordMap = null,
  winningTeamCode = undefined,
  noResult = undefined,
  completedMatchCount = undefined
} = {}) {
  if (!entry) return null;
  const selectedPlayerIds = Array.isArray(entry?.selectedPlayerIds)
    ? entry.selectedPlayerIds.filter(Boolean)
    : (Array.isArray(entry?.selected_player_ids) ? entry?.selected_player_ids.filter(Boolean) : []);
  const captainPlayerId = normalizeWhitespace(entry?.captainPlayerId || entry?.captain_player_id || '');
  const priceSnapshot = entry?.priceSnapshot && typeof entry.priceSnapshot === 'object'
    ? entry.priceSnapshot
    : (entry?.price_snapshot && typeof entry.price_snapshot === 'object' ? entry.price_snapshot : {});
  const resolvedScore = score && typeof score === 'object'
    ? score
    : scoreMiniFantasyEntry({
        entry,
        liveData,
        schedule,
        squads,
        fixtureRecordMap,
        winningTeamCode,
        noResult,
        completedMatchCount
      });

  const pointsByPlayerId = resolvedScore?.points_by_player_id || {};
  const appearanceBonusByPlayerId = resolvedScore?.appearance_bonus_by_player_id || {};
  const winnerBonusByPlayerId = resolvedScore?.winner_bonus_by_player_id || {};
  const eligiblePointsByPlayerId = resolvedScore?.eligible_points_by_player_id || {};
  const scoredPointsByPlayerId = resolvedScore?.scored_points_by_player_id || {};
  const baseBreakdownByPlayerId = resolvedScore?.base_breakdown_by_player_id || {};

  const players = selectedPlayerIds.map((playerId) => {
    const snapshot = priceSnapshot?.[playerId] || {};
    const isCaptain = captainPlayerId === playerId;
    const teamCode = normalizeWhitespace(snapshot.team || resolveMiniFantasyPlayerTeamCode(playerId) || '');
    const basePoints = toNumber(pointsByPlayerId[playerId], 0);
    const appearanceBonus = toNumber(appearanceBonusByPlayerId[playerId], 0);
    const winnerBonus = toNumber(winnerBonusByPlayerId[playerId], 0);
    const eligiblePoints = Number.isFinite(Number(eligiblePointsByPlayerId[playerId]))
      ? Number(eligiblePointsByPlayerId[playerId])
      : roundTo(basePoints + appearanceBonus + winnerBonus, 2);
    const captainMultiplier = isCaptain ? MINI_FANTASY_CAPTAIN_MULTIPLIER : 1;
    const scoredPoints = Number.isFinite(Number(scoredPointsByPlayerId[playerId]))
      ? Number(scoredPointsByPlayerId[playerId])
      : roundTo(eligiblePoints * captainMultiplier, 2);
    const baseBreakdown = baseBreakdownByPlayerId?.[playerId] && typeof baseBreakdownByPlayerId[playerId] === 'object'
      ? {
          ...baseBreakdownByPlayerId[playerId],
          total_points: basePoints
        }
      : null;
    return {
      player_id: playerId,
      name: normalizeWhitespace(snapshot.name || fallbackMiniFantasyPlayerName(playerId)) || fallbackMiniFantasyPlayerName(playerId),
      team: teamCode,
      role: normalizeWhitespace(snapshot.role || '') || '',
      price: toNumber(snapshot.final_price, 0),
      points: basePoints,
      base_breakdown: baseBreakdown,
      appearance_bonus: appearanceBonus,
      winner_bonus: winnerBonus,
      eligible_points: eligiblePoints,
      captain_multiplier: captainMultiplier,
      scored_points: scoredPoints,
      is_captain: isCaptain
    };
  });

  const bestPick = [...players].sort((a, b) => b.scored_points - a.scored_points || a.name.localeCompare(b.name))[0] || null;

  return {
    version: 'mini_fantasy_entry_audit_v1',
    match_no: Number(entry?.matchNo || entry?.match_no || 0) || null,
    total_points: toNumber(resolvedScore?.total_points, 0),
    spent_credits: toNumber(entry?.spentCredits ?? entry?.spent_credits, 0),
    saved_at: entry?.savedAt || entry?.saved_at || entry?.updatedAt || entry?.updated_at || null,
    selected_player_ids: selectedPlayerIds,
    captain_player_id: captainPlayerId || null,
    winning_team_code: normalizeWhitespace(resolvedScore?.winning_team_code || '') || null,
    is_no_result: Boolean(resolvedScore?.is_no_result),
    appearance_bonus_points: toNumber(resolvedScore?.appearance_bonus_points, 0),
    winner_bonus_points: toNumber(resolvedScore?.winner_bonus_points, 0),
    best_pick_player_id: bestPick?.player_id || null,
    players
  };
}

export function buildMiniFantasyLeaderboard({
  entries = [],
  liveData = {},
  schedule = [],
  squads = {},
  profiles = [],
  dailyBonuses = []
} = {}) {
  const completedMatchCount = getCompletedMiniFantasyMatchCount(liveData);
  const launchMs = Date.parse(MINI_FANTASY_LAUNCH_AT_UTC);
  const completedFixtures = completedMiniFantasyFixtures(schedule, liveData);
  const grouped = new Map();
  const profileByKey = new Map();
  const playerPointsIndex = buildMiniFantasyPlayerPointsIndex({ liveData, schedule, squads });
  const fixtureScoreContextCache = new Map();
  const liveDeltaHistoryCache = new Map();

  (Array.isArray(profiles) ? profiles : []).forEach((profile) => {
    const ownerHandle = profileHandle(profile);
    const userId = profileUserId(profile);
    const key = participantIdentityKey({ ownerHandle, userId });
    if (!key) return;
    profileByKey.set(key, {
      owner_handle: ownerHandle,
      user_id: userId || null,
      display_name: profileDisplayName(profile) || ownerHandle || userId,
      created_at: profileCreatedAtUtc(profile) || null
    });
  });

  function ensureParticipant(seed = {}) {
    const ownerHandle = normalizeWhitespace(seed?.owner_handle || seed?.ownerHandle || seed?.handle || '');
    const userId = normalizeWhitespace(seed?.user_id || seed?.userId || seed?.id || '');
    const key = participantIdentityKey({ ownerHandle, userId });
    if (!key) return null;
    const profile = profileByKey.get(key) || {};
    const existing = grouped.get(key) || {
      key,
      owner_handle: ownerHandle || profile.owner_handle || '',
      user_id: userId || profile.user_id || null,
      display_name: normalizeWhitespace(seed?.display_name || seed?.displayName || profile.display_name || ownerHandle || userId || 'Mini Fantasy player'),
      created_at: normalizeWhitespace(profile.created_at || seed?.created_at || seed?.createdAt || '') || null,
      total_points: 0,
      saved_entries: 0,
      scored_entries: 0,
      pending_entries: 0,
      latest_saved_at: null,
      daily_bonus_points: 0,
      missed_lock_points: 0,
      new_player_baseline_points: 0,
      matches: [],
      _missed_lock_count: 0
    };
    existing.owner_handle = existing.owner_handle || ownerHandle || profile.owner_handle || '';
    existing.user_id = existing.user_id || userId || profile.user_id || null;
    existing.key = existing.key || key;
    existing.display_name = normalizeWhitespace(existing.display_name || seed?.display_name || seed?.displayName || profile.display_name || existing.owner_handle || existing.user_id || 'Mini Fantasy player');
    existing.created_at = existing.created_at || normalizeWhitespace(profile.created_at || seed?.created_at || seed?.createdAt || '') || null;
    grouped.set(key, existing);
    return existing;
  }

  function getFixtureScoreContext(matchNo) {
    const targetMatchNo = Number(matchNo || 0) || null;
    if (!targetMatchNo) {
      return {
        fixtureRecordMap: new Map(),
        winningTeamCode: '',
        noResult: false
      };
    }
    if (fixtureScoreContextCache.has(targetMatchNo)) {
      return fixtureScoreContextCache.get(targetMatchNo);
    }
    const noResult = targetMatchNo <= completedMatchCount
      ? isMiniFantasyNoResultFixture({ liveData, matchNo: targetMatchNo })
      : false;
    let liveDeltaHistoryMap = null;
    if (targetMatchNo === completedMatchCount + 1) {
      if (!liveDeltaHistoryCache.has(targetMatchNo)) {
        liveDeltaHistoryCache.set(targetMatchNo, buildMiniFantasyLiveDeltaHistoryMap({ liveData, schedule, matchNo: targetMatchNo }));
      }
      liveDeltaHistoryMap = liveDeltaHistoryCache.get(targetMatchNo);
    }
    const context = {
      fixtureRecordMap: buildMiniFantasyFixturePlayerRecordMap({
        liveData,
        schedule,
        squads,
        matchNo: targetMatchNo,
        playerPointsIndex,
        completedMatchCount,
        liveDeltaHistoryMap
      }),
      winningTeamCode: targetMatchNo <= completedMatchCount && !noResult
        ? getMiniFantasyWinningTeamCode({ liveData, schedule, matchNo: targetMatchNo })
        : '',
      noResult
    };
    fixtureScoreContextCache.set(targetMatchNo, context);
    return context;
  }

  const normalizedEntries = (Array.isArray(entries) ? entries : [])
    .map((entry) => {
      const ownerHandle = normalizeWhitespace(entry?.ownerHandle || entry?.owner_handle || '');
      const userId = normalizeWhitespace(entry?.userId || entry?.user_id || '');
      const matchNo = Number(entry?.matchNo || entry?.match_no || 0) || null;
      const key = participantIdentityKey({ ownerHandle, userId });
      if (!key || !matchNo) return null;
      const row = ensureParticipant({
        owner_handle: ownerHandle,
        user_id: userId,
        display_name: normalizeWhitespace(entry?.displayName || entry?.display_name || ''),
        created_at: entry?.createdAt || entry?.created_at || null
      });
      const fixtureContext = getFixtureScoreContext(matchNo);
      const score = scoreMiniFantasyEntry({
        entry,
        liveData,
        schedule,
        squads,
        fixtureRecordMap: fixtureContext.fixtureRecordMap,
        winningTeamCode: fixtureContext.winningTeamCode,
        noResult: fixtureContext.noResult,
        completedMatchCount
      });
      const normalized = {
        key,
        owner_handle: row?.owner_handle || ownerHandle,
        user_id: row?.user_id || userId || null,
        display_name: row?.display_name || normalizeWhitespace(entry?.displayName || entry?.display_name || ownerHandle || userId),
        match_no: matchNo,
        saved_at: entry?.savedAt || entry?.saved_at || entry?.updatedAt || entry?.updated_at || null,
        selected_player_ids: Array.isArray(entry?.selectedPlayerIds)
          ? entry.selectedPlayerIds.filter(Boolean)
          : (Array.isArray(entry?.selected_player_ids) ? entry.selected_player_ids.filter(Boolean) : []),
        captain_player_id: entry?.captainPlayerId || entry?.captain_player_id || null,
        price_snapshot: entry?.priceSnapshot && typeof entry.priceSnapshot === 'object'
          ? entry.priceSnapshot
          : (entry?.price_snapshot && typeof entry.price_snapshot === 'object' ? entry.price_snapshot : {}),
        spent_credits: toNumber(entry?.spentCredits ?? entry?.spent_credits, 0),
        total_points: toNumber(score.total_points, 0),
        is_scored: Boolean(score.is_scored),
        is_no_result: Boolean(score.is_no_result),
        score
      };
      if (row) {
        row.total_points = roundTo(row.total_points + normalized.total_points, 2);
        row.saved_entries += 1;
        row.scored_entries += normalized.is_scored ? 1 : 0;
        row.pending_entries += normalized.is_scored ? 0 : 1;
        row.latest_saved_at = [row.latest_saved_at, normalized.saved_at].filter(Boolean).sort().slice(-1)[0] || row.latest_saved_at;
      }
      return normalized;
    })
    .filter(Boolean);

  const entryByMatchAndParticipant = new Map();
  const completedEntriesByMatch = new Map();
  normalizedEntries.forEach((entry) => {
    entryByMatchAndParticipant.set(`${entry.match_no}:${entry.key}`, entry);
    if (!entry.is_scored) return;
    if (!completedEntriesByMatch.has(entry.match_no)) completedEntriesByMatch.set(entry.match_no, []);
    completedEntriesByMatch.get(entry.match_no).push(entry);
  });

  (Array.isArray(dailyBonuses) ? dailyBonuses : []).forEach((bonus) => {
    const row = ensureParticipant({
      owner_handle: dailyBonusHandle(bonus),
      user_id: dailyBonusUserId(bonus),
      display_name: normalizeWhitespace(bonus?.display_name || bonus?.displayName || '')
    });
    if (!row) return;
    row.daily_bonus_points = roundTo(row.daily_bonus_points + dailyBonusPoints(bonus), 2);
  });

  completedFixtures.forEach((fixture) => {
    const matchNo = Number(fixture?.match_no || 0) || null;
    if (!matchNo) return;
    const scoredEntries = completedEntriesByMatch.get(matchNo) || [];
    const lockedCount = scoredEntries.length;
    const averageLockedScore = lockedCount
      ? roundTo(scoredEntries.reduce((total, entry) => total + toNumber(entry.total_points, 0), 0) / lockedCount, 2)
      : 0;
    const lockMs = Date.parse(fixture?.lock_at_utc || fixture?.datetime_utc || '');

    [...grouped.values()].forEach((row) => {
      const entry = entryByMatchAndParticipant.get(`${matchNo}:${row.key}`);
      if (entry) {
        const auditLog = buildMiniFantasyEntryAuditLog({
          entry: {
            match_no: entry.match_no,
            selected_player_ids: entry.selected_player_ids,
            captain_player_id: entry.captain_player_id,
            price_snapshot: entry.price_snapshot,
            spent_credits: entry.spent_credits,
            saved_at: entry.saved_at
          },
          score: entry.score
        });
        row.matches.push({
          match_no: matchNo,
          total_points: entry.total_points,
          is_scored: true,
          source: 'locked_entry',
          captain_player_id: entry.captain_player_id,
          is_no_result: entry.is_no_result,
          spent_credits: auditLog?.spent_credits ?? 0,
          saved_at: auditLog?.saved_at || null,
          audit_log: auditLog,
          summary: entry.is_no_result
            ? 'No result: everyone finishes on 0 for this fixture.'
            : `Locked team score: ${roundTo(entry.total_points, 2)} points.`
        });
        return;
      }

      const createdMs = Date.parse(row.created_at || '');
      const joinedAfterLock = Number.isFinite(createdMs) && Number.isFinite(lockMs) && createdMs > lockMs;
      const joinedAfterLaunch = Number.isFinite(createdMs) && Number.isFinite(launchMs) && createdMs > launchMs;
      if (joinedAfterLock && joinedAfterLaunch) {
        row.total_points = roundTo(row.total_points + MINI_FANTASY_NEW_PLAYER_BASELINE_POINTS, 2);
        row.new_player_baseline_points = roundTo(row.new_player_baseline_points + MINI_FANTASY_NEW_PLAYER_BASELINE_POINTS, 2);
        row.matches.push({
          match_no: matchNo,
          total_points: MINI_FANTASY_NEW_PLAYER_BASELINE_POINTS,
          is_scored: true,
          source: 'new_player_baseline',
          captain_player_id: null,
          is_no_result: false,
          summary: `New-player catch-up: ${MINI_FANTASY_NEW_PLAYER_BASELINE_POINTS} baseline points for a completed fixture before joining.`
        });
        return;
      }

      if (!lockedCount) {
        row.matches.push({
          match_no: matchNo,
          total_points: 0,
          is_scored: true,
          source: 'no_locked_teams',
          captain_player_id: null,
          is_no_result: false,
          summary: 'Nobody locked a team for this fixture, so no fallback points were awarded.'
        });
        return;
      }

      row._missed_lock_count += 1;
      const relief = calculateMiniFantasyMissedLockPoints(averageLockedScore, row._missed_lock_count);
      row.total_points = roundTo(row.total_points + relief.total, 2);
      row.missed_lock_points = roundTo(row.missed_lock_points + relief.total, 2);
      row.matches.push({
        match_no: matchNo,
        total_points: relief.total,
        is_scored: true,
        source: 'missed_lock_relief',
        captain_player_id: null,
        is_no_result: false,
        average_locked_score: averageLockedScore,
        missed_lock_count: row._missed_lock_count,
        cap: relief.cap,
        summary: `Missed-lock relief: 40% of the fixture average (${roundTo(averageLockedScore, 2)}) capped at ${relief.cap}.`
      });
    });
  });

  grouped.forEach((row) => {
    row.total_points = roundTo(row.total_points + row.daily_bonus_points, 2);
    row.matches.sort((a, b) => Number(a.match_no || 0) - Number(b.match_no || 0));
    delete row._missed_lock_count;
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

export function serializeMiniFantasyLeaderboardRows({
  leaderboard = null,
  season = MINI_FANTASY_SEASON,
  liveData = {},
  generatedAtUtc = new Date().toISOString()
} = {}) {
  const safeSeason = normalizeWhitespace(season || MINI_FANTASY_SEASON) || MINI_FANTASY_SEASON;
  const safeGeneratedAt = normalizeWhitespace(generatedAtUtc || new Date().toISOString()) || new Date().toISOString();
  const liveDataFetchedAt = normalizeWhitespace(liveData?.fetchedAt || liveData?.meta?.fetchedAt || '') || null;
  const completedMatchCount = Number(leaderboard?.completed_match_count || 0) || 0;
  const rows = Array.isArray(leaderboard?.rows) ? leaderboard.rows : [];

  return rows
    .map((row, index) => {
      const ownerHandle = normalizeWhitespace(row?.owner_handle || row?.ownerHandle || '');
      if (!ownerHandle) return null;
      return {
        season: safeSeason,
        owner_handle: ownerHandle,
        user_id: normalizeWhitespace(row?.user_id || row?.userId || '') || null,
        display_name: normalizeWhitespace(row?.display_name || row?.displayName || ownerHandle),
        rank: Number(row?.rank || 0) || index + 1,
        medal: normalizeWhitespace(row?.medal || '') || null,
        total_points: roundTo(toNumber(row?.total_points, 0), 2),
        saved_entries: Number(row?.saved_entries || 0) || 0,
        scored_entries: Number(row?.scored_entries || 0) || 0,
        pending_entries: Number(row?.pending_entries || 0) || 0,
        latest_saved_at: row?.latest_saved_at || null,
        daily_bonus_points: roundTo(toNumber(row?.daily_bonus_points, 0), 2),
        missed_lock_points: roundTo(toNumber(row?.missed_lock_points, 0), 2),
        new_player_baseline_points: roundTo(toNumber(row?.new_player_baseline_points, 0), 2),
        completed_match_count: completedMatchCount,
        matches: JSON.parse(JSON.stringify(Array.isArray(row?.matches) ? row.matches : [])),
        live_data_fetched_at: liveDataFetchedAt,
        generated_at: safeGeneratedAt
      };
    })
    .filter(Boolean);
}
