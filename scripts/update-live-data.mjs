import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'live.json');
const SCORECARD_CACHE_DIR = path.join(DATA_DIR, 'scorecards');
const SCHEDULE_FILE = path.join(ROOT, 'ipl_2026_schedule.json');

const API_KEY = process.env.CRICKETDATA_API_KEY;
const FALLBACK_API_KEY = process.env.CRICKETDATA_API_KEY_FALLBACK;
const FORCE_REFRESH = parseEnvBool(process.env.CRICKETDATA_FORCE_REFRESH, false);
const SERIES_ID = '87c62aac-bc3c-4738-ab93-19da0690488f';

const QUIET_REFRESHES_PER_DAY = 5;
const QUIET_REFRESH_MINUTES = Math.floor((24 * 60) / QUIET_REFRESHES_PER_DAY);
const LIVE_REFRESH_MINUTES = 5;
const PRE_MATCH_WINDOW_MINUTES = 20;
const MATCH_WINDOW_MINUTES = 360;
const BOWLING_SR_MIN_BALLS = 72;
const STRIKER_MIN_RUNS = 100;

// Credit optimisation knobs.
// Defaults are conservative for the free plan:
// - post-match scorecards are processed once and cached forever
// - live scorecard polling is OFF unless you explicitly enable it
// - backlog catch-up is capped so a missed day does not nuke credits in one run
const LIVE_SCORECARD_ENABLED = parseEnvBool(process.env.CRICKETDATA_ENABLE_LIVE_SCORECARD, false);
const LIVE_SCORECARD_INTERVAL_MINUTES = parseEnvInt(process.env.CRICKETDATA_LIVE_SCORECARD_INTERVAL_MINUTES, 30);
const MAX_BACKLOG_SCORECARDS_PER_RUN = parseEnvInt(process.env.CRICKETDATA_MAX_BACKLOG_SCORECARDS_PER_RUN, 2);
const MAX_FRESH_SCORECARD_CALLS_PER_RUN = parseEnvNonNegativeInt(process.env.CRICKETDATA_MAX_FRESH_SCORECARD_CALLS_PER_RUN, 1);
const ALLOW_HISTORICAL_REPLAY_API = parseEnvBool(process.env.CRICKETDATA_ALLOW_HISTORICAL_REPLAY, false);
const IPLT20_MOST_DOTS_ENABLED = parseEnvBool(process.env.IPLT20_MOST_DOTS_ENABLED, true);
const IPLT20_MOST_DOTS_MIN_REFRESH_MINUTES = parseEnvInt(process.env.IPLT20_MOST_DOTS_MIN_REFRESH_MINUTES, 120);
const IPLT20_MOST_DOTS_FEED_URL = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/feeds/stats/284-mostdotballsbowledtournament.js?callback=onmostdotballsbowledtournament';
const IPLT20_FAIRPLAY_ENABLED = parseEnvBool(process.env.IPLT20_FAIRPLAY_ENABLED, true);
const IPLT20_FAIRPLAY_FEED_URL = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/feeds/stats/2026-fairplayList.js?callback=onFairplayAward';
const AGGREGATE_SCHEMA_VERSION = 2;
const LEAST_MVP_MIN_MATCHES = 5;
const UNCAPPED_MVP_PLAYERS = [
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
];
const PLAYER_KEY_ALIASES = {
  // Keep this tiny. Only canonicalize genuinely recurring data-provider variants.
  'vaibhav sooryavanshi': 'vaibhav suryavanshi'
};
const UNCAPPED_MVP_PLAYER_KEYS = new Set(UNCAPPED_MVP_PLAYERS.map((name) => canonicalPlayerPoolKey(name)));

const CRICMETRIC_MANUAL_NAME_ALIASES = {
  // Keep this tiny. Only use manual overrides for genuinely weird edge cases
  // that the generated alias system cannot resolve safely.
};

function parseEnvBool(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'y', 'on'].includes(String(value).trim().toLowerCase());
}

function parseEnvInt(value, fallback) {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseEnvNonNegativeInt(value, fallback) {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function buildSeriesInfoUrl(apiKey) {
  return `https://api.cricapi.com/v1/series_info?apikey=${apiKey}&offset=0&id=${SERIES_ID}`;
}

function buildScorecardUrl(apiKey, matchId) {
  return `https://api.cricapi.com/v1/match_scorecard?apikey=${apiKey}&offset=0&id=${matchId}`;
}


const SCHEDULE_REFRESH_OFFSETS_HOURS = [-1, 4, 5];

export async function readLeagueStageSchedule(scheduleFile = SCHEDULE_FILE) {
  const raw = await fs.readFile(scheduleFile, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('ipl_2026_schedule.json must be an array');
  return parsed.filter(Boolean);
}

export function buildScheduledRefreshInstants(scheduleEntries, offsetsHours = SCHEDULE_REFRESH_OFFSETS_HOURS) {
  const seen = new Set();
  const instants = [];
  for (const match of scheduleEntries || []) {
    const startMs = Date.parse(match?.datetime_utc || '');
    if (!Number.isFinite(startMs)) continue;
    for (const offsetHours of offsetsHours) {
      const refreshMs = startMs + (offsetHours * 60 * 60 * 1000);
      const bucket = refreshBucketKey(refreshMs);
      if (seen.has(bucket)) continue;
      seen.add(bucket);
      instants.push(new Date(refreshMs));
    }
  }
  instants.sort((a, b) => a - b);
  return instants;
}

export function refreshBucketKey(value) {
  const dt = value instanceof Date ? value : new Date(value);
  return Number.isFinite(dt.getTime()) ? dt.toISOString().slice(0, 13) : '';
}

export function isScheduledRefreshBucket(scheduleEntries, currentValue) {
  const currentBucket = refreshBucketKey(currentValue);
  if (!currentBucket) return false;
  return buildScheduledRefreshInstants(scheduleEntries).some((dt) => refreshBucketKey(dt) === currentBucket);
}

export function nextScheduledRefreshAt(scheduleEntries, currentValue) {
  const now = currentValue instanceof Date ? currentValue : new Date(currentValue);
  return buildScheduledRefreshInstants(scheduleEntries).find((dt) => dt.getTime() > now.getTime()) || null;
}

export function lastScheduledRefreshAt(scheduleEntries) {
  const plan = buildScheduledRefreshInstants(scheduleEntries);
  return plan.length ? plan[plan.length - 1] : null;
}

export function createScheduleDecision(scheduleEntries, currentValue) {
  const now = currentValue instanceof Date ? currentValue : new Date(currentValue);
  const last = lastScheduledRefreshAt(scheduleEntries);
  const next = nextScheduledRefreshAt(scheduleEntries, now);
  const inBucket = isScheduledRefreshBucket(scheduleEntries, now);

  if (!scheduleEntries?.length) {
    return {
      shouldRefresh: false,
      mode: 'schedule_missing',
      reason: 'league-stage refresh schedule is missing',
      nextPlannedAt: null
    };
  }

  if (last && now.getTime() > last.getTime() + (59 * 60 * 1000)) {
    return {
      shouldRefresh: false,
      mode: 'schedule_complete',
      reason: 'league-stage refresh plan has completed',
      nextPlannedAt: null
    };
  }

  if (!inBucket) {
    return {
      shouldRefresh: false,
      mode: 'outside_scheduled_window',
      reason: 'outside planned refresh windows',
      nextPlannedAt: next ? next.toISOString() : null
    };
  }

  return {
    shouldRefresh: true,
    mode: 'scheduled_window',
    reason: 'inside planned refresh window',
    nextPlannedAt: next ? next.toISOString() : null
  };
}

export function buildRefreshDecision(scheduleEntries, currentValue, options = {}) {
  if (options.forceRefresh) {
    const next = nextScheduledRefreshAt(scheduleEntries, currentValue);
    return {
      shouldRefresh: true,
      mode: 'forced_refresh',
      reason: 'forced refresh requested',
      nextPlannedAt: next ? next.toISOString() : null
    };
  }
  return createScheduleDecision(scheduleEntries, currentValue);
}


function isoNow() { return new Date().toISOString(); }
function nowMs() { return Date.now(); }
function safeArray(v) { return Array.isArray(v) ? v : []; }
function normalizeName(name) { return String(name || '').replace(/\s+/g, ' ').trim(); }
function normalizePlayerKey(name) { return normalizeName(name).toLowerCase().replace(/\./g, '').trim(); }
export function canonicalPlayerPoolKey(name) {
  const normalized = normalizePlayerKey(name);
  return PLAYER_KEY_ALIASES[normalized] || normalized;
}
function minutesSince(iso, currentMs = Date.now()) { return iso ? (currentMs - Date.parse(iso)) / 60000 : Infinity; }

function londonDayKey(ms = Date.now()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date(ms));
}

function oversToBalls(value) {
  if (value === null || value === undefined || value === '') return 0;
  const s = String(value).trim();
  const [whole, frac] = s.split('.');
  return (Number(whole || 0) * 6) + Number(frac || 0);
}

function allOutUsesFullQuota(wickets, balls, quota = 120) {
  return Number(wickets || 0) >= 10 ? quota : balls;
}

function createEmptyAggregates() {
  return {
    battingRuns: {},
    battingBalls: {},
    battingSixes: {},
    bowlingWickets: {},
    bowlingBalls: {},
    bowlingRunsConceded: {},
    catches: {},
    teamHighestScore: {},
    standings: {},
    bestBowlingFigures: {},
    bowlingDots: {},
    battingFifties: {},
    battingHundreds: {},
    battingImpact30s: {},
    bowling3w: {},
    bowling4w: {},
    bowling5w: {},
    playerMatches: {}
  };
}

function createEmptyLive() {
  return {
    season: 2026,
    provider: 'CricketData.org',
    source: 'data/live.json',
    fetchedAt: null,
    scrapeStatus: 'not_started',
    scrapeReport: {},
    meta: {
      scheduler: {
        dayKey: londonDayKey(),
        quietRefreshesUsed: 0,
        lastQuietRefreshAt: null,
        lastLiveRefreshAt: null,
        lastSeriesInfoAt: null,
        lastDecision: null,
        nextPlannedRefreshAt: null,
        nextPlannedMode: null,
        nextPlannedReason: null,
        nextPlannedCalculatedAt: null
      },
      cache: { seriesId: SERIES_ID, matchList: [] },
      processedMatchIds: [],
      scoreHistory: [],
      aggregates: createEmptyAggregates(),
      liveOverlay: {
        matchId: null,
        generatedAt: null,
        aggregates: null,
        status: null,
        source: null
      },
      scorecardBudget: {
        liveEnabled: LIVE_SCORECARD_ENABLED,
        liveIntervalMinutes: LIVE_SCORECARD_INTERVAL_MINUTES,
        maxBacklogPerRun: MAX_BACKLOG_SCORECARDS_PER_RUN,
        maxFreshPerRun: MAX_FRESH_SCORECARD_CALLS_PER_RUN,
        lastLiveScorecardAt: null,
        lastLiveScorecardMatchId: null,
        lastBacklogProcessAt: null,
        lastBudgetExhaustedAt: null,
        lastBudgetSkipReason: null
      },
      officialMostDots: {
        enabled: IPLT20_MOST_DOTS_ENABLED,
        minRefreshMinutes: IPLT20_MOST_DOTS_MIN_REFRESH_MINUTES,
        lastFetchedAt: null,
        lastAttemptAt: null,
        lastSource: null,
        lastStatus: null,
        lastError: null
      },
      lastRun: {
        seriesInfoCalls: 0,
        scorecardCalls: 0,
        scorecardCacheHits: 0,
        backlogProcessed: 0,
        backlogRemaining: 0,
        liveOverlayFetched: false,
        liveOverlayReused: false,
        liveOverlaySkippedReason: null,
        historicalReplaySkipped: false,
        historicalReplayMissingCaches: 0,
        historicalReplayUsedApiFallback: false,
        historicalReplayReason: null,
        freshScorecardBudgetExhausted: false,
        freshScorecardBudgetSkips: 0
      },
      aggregateSchemaVersion: AGGREGATE_SCHEMA_VERSION,
      providerStatus: {
        state: 'ok',
        lastAttemptAt: null,
        lastErrorAt: null,
        reason: null,
        hitsToday: null,
        hitsLimit: null
      }
    },
    titleWinner: { winner: null, finalists: [], playoffs: [], ranking: [], extendedRanking: [] },
    orangeCap: { ranking: [], extendedRanking: [] },
    mostSixes: { ranking: [], extendedRanking: [] },
    purpleCap: { ranking: [], extendedRanking: [] },
    mostDots: { ranking: [], extendedRanking: [], values: {} },
    mvp: { ranking: [], extendedRanking: [], values: {}, formula: null },
    uncappedMvp: { ranking: [], extendedRanking: [] },
    fairPlay: { ranking: [], extendedRanking: [] },
    highestScoreTeam: { ranking: [], extendedRanking: [], values: {} },
    striker: { ranking: [], extendedRanking: [] },
    bestBowlingFigures: { ranking: [], extendedRanking: [], figures: {} },
    bestBowlingStrikeRate: { ranking: [], extendedRanking: [], values: {} },
    mostCatches: { ranking: [], extendedRanking: [], values: {} },
    tableBottom: { ranking: [], extendedRanking: [] },
    leastMvp: { ranking: [], extendedRanking: [] }
  };
}

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(SCORECARD_CACHE_DIR, { recursive: true });
}

async function readExistingLive() {
  try {
    const parsed = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
    const fresh = createEmptyLive();
    return {
      ...fresh,
      ...parsed,
      meta: {
        ...fresh.meta,
        ...(parsed.meta || {}),
        scheduler: { ...fresh.meta.scheduler, ...(parsed.meta?.scheduler || {}) },
        cache: { ...fresh.meta.cache, ...(parsed.meta?.cache || {}) },
        processedMatchIds: Array.isArray(parsed.meta?.processedMatchIds) ? parsed.meta.processedMatchIds : [],
        scoreHistory: Array.isArray(parsed.meta?.scoreHistory) ? parsed.meta.scoreHistory : [],
        aggregates: { ...fresh.meta.aggregates, ...(parsed.meta?.aggregates || {}) },
        liveOverlay: { ...fresh.meta.liveOverlay, ...(parsed.meta?.liveOverlay || {}) },
        scorecardBudget: { ...fresh.meta.scorecardBudget, ...(parsed.meta?.scorecardBudget || {}) },
        officialMostDots: { ...fresh.meta.officialMostDots, ...((parsed.meta?.officialMostDots || parsed.meta?.cricmetricDots) || {}) },
        lastRun: { ...fresh.meta.lastRun, ...(parsed.meta?.lastRun || {}) },
        providerStatus: { ...fresh.meta.providerStatus, ...(parsed.meta?.providerStatus || {}) },
        aggregateSchemaVersion: Number(parsed.meta?.aggregateSchemaVersion || fresh.meta.aggregateSchemaVersion || 1)
      }
    };
  } catch {
    return createEmptyLive();
  }
}

function makeApiError(json) {
  const error = new Error(`API error: ${JSON.stringify(json)}`);
  error.code = 'CRICKETDATA_API_ERROR';
  error.api = json;
  return error;
}

function scorecardCachePath(matchId, cacheDir = SCORECARD_CACHE_DIR) {
  const safeMatchId = String(matchId || '').replace(/[^a-z0-9_-]+/gi, '_');
  return path.join(cacheDir, `${safeMatchId}.json`);
}

export async function readCachedScorecard(matchId, { cacheDir = SCORECARD_CACHE_DIR } = {}) {
  try {
    const raw = await fs.readFile(scorecardCachePath(matchId, cacheDir), 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.data && typeof parsed.data === 'object') return parsed.data;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export async function writeCachedScorecard(matchId, scorecard, { cacheDir = SCORECARD_CACHE_DIR } = {}) {
  await fs.mkdir(cacheDir, { recursive: true });
  await fs.writeFile(
    scorecardCachePath(matchId, cacheDir),
    JSON.stringify({
      matchId,
      cachedAt: isoNow(),
      data: scorecard
    }, null, 2),
    'utf8'
  );
}

export async function findMissingScorecardCaches(matchIds, { cacheDir = SCORECARD_CACHE_DIR } = {}) {
  const missing = [];
  for (const matchId of safeArray(matchIds)) {
    const cached = await readCachedScorecard(matchId, { cacheDir });
    if (!cached) missing.push(matchId);
  }
  return missing;
}

function tryParseApiPayloadFromError(error) {
  if (error?.api && typeof error.api === 'object') return error.api;
  const message = String(error?.message || '');
  const marker = 'API error:';
  const index = message.indexOf(marker);
  if (index < 0) return null;
  try {
    return JSON.parse(message.slice(index + marker.length).trim());
  } catch {
    return null;
  }
}

function normalizeCricketDataReason(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function parseCricketDataQuotaDetails(error) {
  const payload = tryParseApiPayloadFromError(error);
  if (!payload) return null;
  const normalizedReason = normalizeCricketDataReason(payload?.reason);
  if (!normalizedReason.includes('hits_today_exceeded_hits_limit')) return null;
  const info = payload?.info && typeof payload.info === 'object' ? payload.info : {};
  return {
    reason: 'hits_today_exceeded_hits_limit',
    hitsToday: Number(payload.hitsToday ?? info.hitsToday ?? 0) || null,
    hitsUsed: Number(payload.hitsUsed ?? info.hitsUsed ?? 0) || null,
    hitsLimit: Number(payload.hitsLimit ?? info.hitsLimit ?? 0) || null,
    status: String(payload.status || 'failure'),
    apikey: payload.apikey || null
  };
}

export function isCricketDataQuotaError(error) {
  return Boolean(parseCricketDataQuotaDetails(error));
}

function parseCricketDataFailureDetails(error) {
  const payload = tryParseApiPayloadFromError(error);
  if (!payload) return null;
  const info = payload?.info && typeof payload.info === 'object' ? payload.info : {};
  return {
    reason: normalizeCricketDataReason(payload.reason || 'provider_error'),
    hitsToday: Number(payload.hitsToday ?? info.hitsToday ?? 0) || null,
    hitsLimit: Number(payload.hitsLimit ?? info.hitsLimit ?? 0) || null,
    status: String(payload.status || 'failure'),
    apikey: payload.apikey || null
  };
}

export function isCricketDataFallbackEligibleError(error) {
  const payload = tryParseApiPayloadFromError(error);
  if (!payload) return false;
  const reason = normalizeCricketDataReason(payload.reason || '');
  return (
    reason.includes('hits_today_exceeded_hits_limit') ||
    reason === 'invalid_api_key' ||
    reason === 'api_key_invalid' ||
    reason.startsWith('blocked_for_')
  );
}

function setProviderStatusOk(live) {
  live.meta.providerStatus = {
    ...(live.meta.providerStatus || {}),
    state: 'ok',
    lastErrorAt: null,
    reason: null,
    hitsToday: null,
    hitsLimit: null
  };
}

function applyProviderDelayState(live, details) {
  const delayAt = isoNow();
  live.meta.providerStatus = {
    ...(live.meta.providerStatus || {}),
    state: 'quota_exceeded',
    lastErrorAt: delayAt,
    reason: details.reason,
    hitsToday: details.hitsToday,
    hitsLimit: details.hitsLimit
  };

  const lastGoodAt = live.fetchedAt ? new Date(live.fetchedAt).toISOString() : null;
  const fallbackText = lastGoodAt ? `showing last good data from ${lastGoodAt}` : 'no previous successful live snapshot yet';
  live.scrapeStatus = `delayed (CricketData quota reached; ${fallbackText})`;
  live.scrapeReport = {
    ...(live.scrapeReport || {}),
    costControl: {
      ok: false,
      source: 'worker',
      method: 'provider quota exceeded; kept previous live snapshot',
      quotaExceeded: true,
      hitsToday: details.hitsToday,
      hitsLimit: details.hitsLimit,
      scorecardCallsThisRun: live.meta?.lastRun?.scorecardCalls || 0,
      backlogRemaining: live.meta?.lastRun?.backlogRemaining || 0
    }
  };
}

function applyProviderSafeExitState(live, details) {
  const failureAt = isoNow();
  live.meta.providerStatus = {
    ...(live.meta.providerStatus || {}),
    state: details.reason === 'invalid_api_key' ? 'auth_error' : 'provider_error',
    lastErrorAt: failureAt,
    reason: details.reason,
    hitsToday: details.hitsToday,
    hitsLimit: details.hitsLimit
  };

  const lastGoodAt = live.fetchedAt ? new Date(live.fetchedAt).toISOString() : null;
  const fallbackText = lastGoodAt ? `showing last good data from ${lastGoodAt}` : 'no previous successful live snapshot yet';
  live.scrapeStatus = `delayed (CricketData ${details.reason}; ${fallbackText})`;
  live.scrapeReport = {
    ...(live.scrapeReport || {}),
    costControl: {
      ok: false,
      source: 'worker',
      method: 'provider fallback exhausted; kept previous live snapshot',
      providerFailure: true,
      reason: details.reason,
      hitsToday: details.hitsToday,
      hitsLimit: details.hitsLimit,
      scorecardCallsThisRun: live.meta?.lastRun?.scorecardCalls || 0,
      failoversThisRun: live.meta?.lastRun?.cricketDataFailovers || 0,
      backlogRemaining: live.meta?.lastRun?.backlogRemaining || 0
    }
  };
}

export function freshScorecardBudgetRemaining(live, maxFreshPerRun = MAX_FRESH_SCORECARD_CALLS_PER_RUN) {
  const allowed = Number.isFinite(Number(maxFreshPerRun)) ? Number(maxFreshPerRun) : MAX_FRESH_SCORECARD_CALLS_PER_RUN;
  const used = Number(live?.meta?.lastRun?.scorecardCalls || 0);
  return Math.max(0, allowed - used);
}

export function canUseFreshScorecardCall(live, requiredCalls = 1, maxFreshPerRun = MAX_FRESH_SCORECARD_CALLS_PER_RUN) {
  return freshScorecardBudgetRemaining(live, maxFreshPerRun) >= Math.max(0, Number(requiredCalls || 0));
}

function noteFreshScorecardBudgetSkip(live, reason) {
  live.meta.lastRun.freshScorecardBudgetExhausted = true;
  live.meta.lastRun.freshScorecardBudgetSkips = Number(live.meta.lastRun.freshScorecardBudgetSkips || 0) + 1;
  live.meta.scorecardBudget.lastBudgetExhaustedAt = isoNow();
  live.meta.scorecardBudget.lastBudgetSkipReason = reason;
}

function normalizeScorecardResult(result) {
  if (result && typeof result === 'object' && result.data && typeof result.data === 'object') {
    return {
      data: result.data,
      source: result.source || 'unknown'
    };
  }
  return {
    data: result,
    source: 'unknown'
  };
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      accept: 'application/json',
      'user-agent': 'sp-cup-rivalry/1.1'
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const json = await res.json();
  if (json.status && json.status !== 'success') throw makeApiError(json);
  return json;
}

function cricketDataProviders() {
  const providers = [];
  if (API_KEY) providers.push({ key: API_KEY, tier: 'primary' });
  if (FALLBACK_API_KEY && FALLBACK_API_KEY !== API_KEY) providers.push({ key: FALLBACK_API_KEY, tier: 'fallback' });
  return providers;
}

async function fetchCricketDataJson(buildUrl, live) {
  const providers = cricketDataProviders();
  if (!providers.length) throw new Error('Missing CRICKETDATA_API_KEY environment variable');

  let lastError = null;
  for (let index = 0; index < providers.length; index += 1) {
    const provider = providers[index];
    try {
      const json = await fetchJson(buildUrl(provider.key));
      live.meta.providerStatus = {
        ...(live.meta.providerStatus || {}),
        activeKeyTier: provider.tier,
        fallbackAvailable: providers.length > 1
      };
      return json;
    } catch (error) {
      lastError = error;
      live.meta.providerStatus = {
        ...(live.meta.providerStatus || {}),
        activeKeyTier: provider.tier,
        fallbackAvailable: providers.length > 1
      };
      const canFailOver = index < providers.length - 1 && isCricketDataFallbackEligibleError(error);
      if (!canFailOver) throw error;
      live.meta.lastRun.cricketDataFailovers = Number(live.meta.lastRun.cricketDataFailovers || 0) + 1;
      live.meta.providerStatus.lastFallbackAt = isoNow();
      live.meta.providerStatus.lastFallbackReason = tryParseApiPayloadFromError(error)?.reason || error.message || 'fallback-triggered';
    }
  }
  throw lastError || new Error('CricketData request failed');
}

async function fetchText(url, extraHeaders = {}) {
  const res = await fetch(url, {
    headers: {
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'cache-control': 'no-cache',
      pragma: 'no-cache',
      referer: 'https://www.cricmetric.com/',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      ...extraHeaders
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n || 0)));
}

function stripTags(value) {
  return decodeHtmlEntities(String(value || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function normalizeLookupName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleCaseName(value) {
  return String(value || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function initialsForName(name) {
  const parts = normalizeLookupName(name).split(' ').filter(Boolean);
  if (!parts.length) return '';
  return parts.slice(0, -1).map((part) => part[0]).join('');
}

function playerCandidateNames(agg) {
  return [...new Set([
    ...Object.keys(agg.bowlingWickets || {}),
    ...Object.keys(agg.bestBowlingFigures || {}),
    ...Object.keys(agg.battingRuns || {}),
    ...Object.keys(agg.catches || {})
  ].filter(Boolean))];
}

function addAlias(aliasMap, collisions, alias, fullName) {
  const normAlias = normalizeLookupName(alias);
  if (!normAlias) return;
  if (!aliasMap.has(normAlias)) {
    aliasMap.set(normAlias, fullName);
    return;
  }
  if (aliasMap.get(normAlias) !== fullName) {
    aliasMap.delete(normAlias);
    collisions.add(normAlias);
  }
}

function buildCricmetricAliasMap(fullNames) {
  const aliasMap = new Map();
  const collisions = new Set();

  for (const fullName of fullNames) {
    const normFull = normalizeLookupName(fullName);
    const parts = normFull.split(' ').filter(Boolean);
    if (!parts.length) continue;

    const surname = parts.at(-1);
    const given = parts.slice(0, -1);
    const aliases = new Set([normFull]);

    if (parts.length >= 2) {
      aliases.add(`${parts[0]} ${surname}`);
      aliases.add(`${parts[0][0]} ${surname}`);
    }

    if (given.length) {
      const joinedInitials = given.map((part) => part[0]).join('');
      const spacedInitials = given.map((part) => part[0]).join(' ');
      aliases.add(`${joinedInitials} ${surname}`);
      aliases.add(`${spacedInitials} ${surname}`);
      aliases.add(`${given[0][0]} ${surname}`);
      aliases.add(`${given[0]} ${surname}`);
    }

    if (parts.length === 3) {
      aliases.add(`${parts[0]} ${parts[1][0]} ${surname}`);
      aliases.add(`${parts[0][0]} ${parts[1][0]} ${surname}`);
      aliases.add(`${parts[0][0]} ${parts[1]} ${surname}`);
    }

    for (const alias of aliases) addAlias(aliasMap, collisions, alias, fullName);
  }

  for (const alias of collisions) aliasMap.delete(alias);
  return aliasMap;
}

function resolveCricmetricPlayerName(rawName, agg) {
  const trimmed = stripTags(rawName);
  if (!trimmed) return '';

  const rawNorm = normalizeLookupName(trimmed);
  const manualAlias = CRICMETRIC_MANUAL_NAME_ALIASES[rawNorm];
  if (manualAlias) return manualAlias;

  const candidates = playerCandidateNames(agg);
  const aliasMap = buildCricmetricAliasMap(candidates);

  const direct = candidates.find((candidate) => normalizeLookupName(candidate) === rawNorm);
  if (direct) return direct;

  const generatedAlias = aliasMap.get(rawNorm);
  if (generatedAlias) return generatedAlias;

  return titleCaseName(trimmed);
}


function parseJsonpPayload(text) {
  const source = String(text || '').trim();
  const callbackMatch = source.match(/^([A-Za-z0-9_$]+)\s*\(/);
  if (!callbackMatch) throw new Error('jsonp-callback-not-found');
  const callbackName = callbackMatch[1];
  let payload;
  const sandbox = {
    [callbackName]: (data) => {
      payload = data;
    }
  };
  vm.runInNewContext(source, sandbox, { timeout: 2000 });
  if (!payload) throw new Error('jsonp-payload-not-found');
  return payload;
}

function numOrNull(value) {
  const n = Number.parseFloat(String(value ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function rowsToFairPlayPayload(payload) {
  const rows = safeArray(payload?.fairplayTotal);
  if (!rows.length) return null;

  const ranking = [];
  const values = {};
  for (const row of rows) {
    const team = normalizeName(row?.TeamFullName || row?.TeamName || row?.teamFullName || row?.teamName || '');
    if (!team) continue;
    ranking.push(team);
    values[team] = {
      matches: numOrNull(row?.No ?? row?.Matches ?? row?.matches),
      average: numOrNull(row?.Average ?? row?.Avg ?? row?.average),
      points: numOrNull(row?.Points ?? row?.Point ?? row?.TotalPoints ?? row?.TP ?? row?.points),
      raw: row
    };
  }

  if (!ranking.length) return null;
  return {
    winner: ranking[0] || null,
    ranking: ranking.slice(0, 10),
    extendedRanking: ranking,
    values,
    updatedAt: safeArray(payload?.dateModifiedOn)[0] || null,
    source: 'IPLT20 official fairplay feed'
  };
}

async function fetchOfficialFairPlay() {
  const text = await fetchText(IPLT20_FAIRPLAY_FEED_URL, {
    accept: 'application/javascript,text/javascript,*/*;q=0.8',
    referer: 'https://www.iplt20.com/stats/2026'
  });
  const payload = parseJsonpPayload(text);
  const parsed = rowsToFairPlayPayload(payload);
  if (!parsed?.extendedRanking?.length) throw new Error('fairplay-data-not-found');
  return parsed;
}

function rowsToOfficialMostDotsPayload(payload, agg) {
  const rows = safeArray(payload?.mostdotballsbowledtournament);
  if (!rows.length) return null;

  const values = {};
  for (const row of rows) {
    const rawPlayer = row?.BowlerName || row?.bowlerName || row?.PlayerName || row?.playerName || '';
    const dotsValue = numOrNull(row?.DotBallsBowled ?? row?.dotBallsBowled ?? row?.Dots ?? row?.dots);
    if (!rawPlayer || !Number.isFinite(dotsValue)) continue;
    const player = resolveCricmetricPlayerName(rawPlayer, agg);
    if (!player) continue;
    values[player] = Math.max(values[player] || 0, dotsValue);
  }

  const ordered = Object.entries(values)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name]) => name);

  if (!ordered.length) return null;
  return {
    ranking: ordered.slice(0, 10),
    extendedRanking: ordered,
    values,
    updatedAt: safeArray(payload?.dateModifiedOn)[0] || null,
    source: "IPLT20 official most dots feed"
  };
}

async function fetchOfficialMostDots(agg) {
  const text = await fetchText(IPLT20_MOST_DOTS_FEED_URL, {
    accept: "application/javascript,text/javascript,*/*;q=0.8",
    referer: "https://www.iplt20.com/stats/2026"
  });
  const payload = parseJsonpPayload(text);
  const parsed = rowsToOfficialMostDotsPayload(payload, agg);
  if (!parsed?.extendedRanking?.length) throw new Error("most-dots-data-not-found");
  return parsed;
}

function shouldFetchOfficialMostDots(live, decision, currentMs, backlogProcessed) {
  if (!IPLT20_MOST_DOTS_ENABLED) return { fetch: false, reason: "official most dots disabled" };
  if (backlogProcessed > 0) return { fetch: true, reason: "completed match backlog processed" };
  if (decision.mode === "live_window") return { fetch: false, reason: "skip during live window without completed backlog" };
  const minsSinceLast = minutesSince(live.meta.officialMostDots?.lastFetchedAt, currentMs);
  if (minsSinceLast >= IPLT20_MOST_DOTS_MIN_REFRESH_MINUTES) return { fetch: true, reason: "refresh interval reached" };
  return { fetch: false, reason: "refresh interval not reached" };
}

function resetDailySchedulerIfNeeded(live, currentMs = Date.now()) {
  const today = londonDayKey(currentMs);
  if (live.meta.scheduler.dayKey !== today) {
    live.meta.scheduler.dayKey = today;
    live.meta.scheduler.quietRefreshesUsed = 0;
    live.meta.scheduler.lastQuietRefreshAt = null;
    live.meta.scheduler.lastLiveRefreshAt = null;
  }
}

function toMinimalMatch(m) {
  return {
    id: m.id,
    name: m.name,
    status: m.status,
    dateTimeGMT: m.dateTimeGMT,
    teams: safeArray(m.teams),
    matchStarted: !!m.matchStarted,
    matchEnded: !!m.matchEnded,
    venue: m.venue
  };
}

function isWithinGameWindow(match, currentMs) {
  const startMs = Date.parse(match.dateTimeGMT);
  if (!Number.isFinite(startMs)) return false;
  return currentMs >= (startMs - PRE_MATCH_WINDOW_MINUTES * 60000) && currentMs <= (startMs + MATCH_WINDOW_MINUTES * 60000);
}

function decideRefreshMode(live, currentMs) {
  const cachedMatches = safeArray(live.meta.cache.matchList);
  const gameWindowNow = cachedMatches.some((m) => isWithinGameWindow(m, currentMs));
  const lastQuiet = live.meta.scheduler.lastQuietRefreshAt ? Date.parse(live.meta.scheduler.lastQuietRefreshAt) : 0;
  const lastLive = live.meta.scheduler.lastLiveRefreshAt ? Date.parse(live.meta.scheduler.lastLiveRefreshAt) : 0;
  const minutesSinceQuiet = lastQuiet ? (currentMs - lastQuiet) / 60000 : Infinity;
  const minutesSinceLive = lastLive ? (currentMs - lastLive) / 60000 : Infinity;

  if (gameWindowNow) {
    if (minutesSinceLive >= LIVE_REFRESH_MINUTES) return { shouldRefresh: true, mode: 'live_window', reason: 'within game window' };
    return { shouldRefresh: false, mode: 'live_window_skip', reason: 'live refresh interval not reached' };
  }

  if (live.meta.scheduler.quietRefreshesUsed < QUIET_REFRESHES_PER_DAY && minutesSinceQuiet >= QUIET_REFRESH_MINUTES) {
    return { shouldRefresh: true, mode: 'quiet_window', reason: 'quiet refresh slot available' };
  }

  return { shouldRefresh: false, mode: 'skip', reason: 'outside game time and quiet refresh budget exhausted or interval not reached' };
}

function calculateNextPlannedRefresh(live, currentMs, horizonHours = 48) {
  const horizonMs = horizonHours * 60 * 60 * 1000;
  const baseScheduler = JSON.parse(JSON.stringify(live.meta.scheduler || {}));
  const cachedMatches = safeArray(live.meta?.cache?.matchList);

  for (let probeMs = currentMs + 1000; probeMs <= currentMs + horizonMs; probeMs += 1000) {
    const probeLive = {
      meta: {
        scheduler: JSON.parse(JSON.stringify(baseScheduler)),
        cache: { matchList: cachedMatches }
      }
    };
    resetDailySchedulerIfNeeded(probeLive, probeMs);
    const decision = decideRefreshMode(probeLive, probeMs);
    if (decision.shouldRefresh) {
      return {
        at: new Date(probeMs).toISOString(),
        mode: decision.mode,
        reason: decision.reason
      };
    }
  }

  return null;
}

function ensureStandingTeam(map, team) {
  if (!map[team]) {
    map[team] = {
      played: 0,
      wins: 0,
      losses: 0,
      points: 0,
      runsFor: 0,
      ballsFaced: 0,
      runsAgainst: 0,
      ballsBowled: 0
    };
  }
  return map[team];
}

function addNumberMap(map, key, amount) {
  if (!key) return;
  map[key] = (map[key] || 0) + Number(amount || 0);
}

function incrementCountMap(map, key) {
  if (!key) return;
  map[key] = (map[key] || 0) + 1;
}

function updateBestBowlingFigure(bestMap, bowler, wickets, runs, balls) {
  if (!bowler) return;
  const cand = {
    wickets: Number(wickets || 0),
    runs: Number(runs || 0),
    balls: Number(balls || 0)
  };
  const ex = bestMap[bowler];
  if (
    !ex ||
    cand.wickets > ex.wickets ||
    (cand.wickets === ex.wickets && cand.runs < ex.runs) ||
    (cand.wickets === ex.wickets && cand.runs === ex.runs && cand.balls < ex.balls)
  ) {
    bestMap[bowler] = cand;
  }
}

function parseTeamFromInningName(inningName) {
  const raw = String(inningName || '');
  const idx = raw.toLowerCase().indexOf(' inning');
  return normalizeName(idx >= 0 ? raw.slice(0, idx) : raw);
}

function applyScorecardToAggregates(aggregates, scorecardData, { isFinal = true } = {}) {
  const inningsBlocks = safeArray(scorecardData.scorecard);
  const topScores = safeArray(scorecardData.score);
  const participants = new Set();

  for (const innings of inningsBlocks) {
    for (const bat of safeArray(innings.batting)) {
      const batter = normalizeName(bat?.batsman?.name);
      if (batter) participants.add(batter);
      const runs = Number(bat?.r || 0);
      const balls = Number(bat?.b || 0);
      addNumberMap(aggregates.battingRuns, batter, runs);
      addNumberMap(aggregates.battingBalls, batter, balls);
      addNumberMap(aggregates.battingSixes, batter, bat?.['6s'] || 0);
      if (runs >= 100) incrementCountMap(aggregates.battingHundreds, batter);
      if (runs >= 50) incrementCountMap(aggregates.battingFifties, batter);
      if (runs >= 30 && balls > 0 && balls < 15) incrementCountMap(aggregates.battingImpact30s, batter);
    }

    for (const bowl of safeArray(innings.bowling)) {
      const bowler = normalizeName(bowl?.bowler?.name);
      if (bowler) participants.add(bowler);
      const balls = oversToBalls(bowl?.o);
      const wickets = Number(bowl?.w || 0);
      addNumberMap(aggregates.bowlingWickets, bowler, wickets);
      addNumberMap(aggregates.bowlingBalls, bowler, balls);
      addNumberMap(aggregates.bowlingRunsConceded, bowler, bowl?.r || 0);
      updateBestBowlingFigure(aggregates.bestBowlingFigures, bowler, wickets, bowl?.r || 0, balls);
      if (wickets >= 3) incrementCountMap(aggregates.bowling3w, bowler);
      if (wickets >= 4) incrementCountMap(aggregates.bowling4w, bowler);
      if (wickets >= 5) incrementCountMap(aggregates.bowling5w, bowler);
    }

    for (const field of safeArray(innings.catching)) {
      const catcher = normalizeName(field?.catcher?.name);
      if (catcher) {
        participants.add(catcher);
        addNumberMap(aggregates.catches, catcher, field?.catch || 0);
      }
    }
  }

  for (const player of participants) incrementCountMap(aggregates.playerMatches, player);

  for (const scoreLine of topScores) {
    const team = parseTeamFromInningName(scoreLine?.inning);
    if (team) {
      aggregates.teamHighestScore[team] = Math.max(Number(aggregates.teamHighestScore[team] || 0), Number(scoreLine?.r || 0));
    }
  }

  if (!isFinal) return;

  const teams = safeArray(scorecardData.teams).map(normalizeName);
  if (teams.length === 2 && topScores.length >= 2) {
    const [teamA, teamB] = teams;
    const standingA = ensureStandingTeam(aggregates.standings, teamA);
    const standingB = ensureStandingTeam(aggregates.standings, teamB);
    standingA.played += 1;
    standingB.played += 1;

    const inningMap = {};
    for (const s of topScores) inningMap[parseTeamFromInningName(s?.inning)] = s;

    const sa = inningMap[teamA];
    const sb = inningMap[teamB];
    if (sa && sb) {
      const ballsA = allOutUsesFullQuota(sa.w, oversToBalls(sa.o));
      const ballsB = allOutUsesFullQuota(sb.w, oversToBalls(sb.o));
      standingA.runsFor += Number(sa.r || 0);
      standingA.ballsFaced += ballsA;
      standingA.runsAgainst += Number(sb.r || 0);
      standingA.ballsBowled += ballsB;

      standingB.runsFor += Number(sb.r || 0);
      standingB.ballsFaced += ballsB;
      standingB.runsAgainst += Number(sa.r || 0);
      standingB.ballsBowled += ballsA;
    }

    const winner = normalizeName(scorecardData.matchWinner);
    if (winner === teamA) {
      standingA.wins += 1;
      standingA.points += 2;
      standingB.losses += 1;
    } else if (winner === teamB) {
      standingB.wins += 1;
      standingB.points += 2;
      standingA.losses += 1;
    }
  }
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function combineAggregates(baseAgg, overlayAgg) {
  const out = clone(baseAgg);
  if (!overlayAgg) return out;

  for (const key of ['battingRuns', 'battingBalls', 'battingSixes', 'bowlingWickets', 'bowlingBalls', 'bowlingRunsConceded', 'catches', 'bowlingDots', 'battingFifties', 'battingHundreds', 'battingImpact30s', 'bowling3w', 'bowling4w', 'bowling5w', 'playerMatches']) {
    for (const [name, value] of Object.entries(overlayAgg[key] || {})) {
      out[key][name] = (out[key][name] || 0) + Number(value || 0);
    }
  }

  for (const [team, value] of Object.entries(overlayAgg.teamHighestScore || {})) {
    out.teamHighestScore[team] = Math.max(out.teamHighestScore[team] || 0, value);
  }

  for (const [bowler, fig] of Object.entries(overlayAgg.bestBowlingFigures || {})) {
    updateBestBowlingFigure(out.bestBowlingFigures, bowler, fig.wickets, fig.runs, fig.balls);
  }

  for (const [team, standing] of Object.entries(overlayAgg.standings || {})) {
    const target = ensureStandingTeam(out.standings, team);
    for (const [k, v] of Object.entries(standing)) target[k] = (target[k] || 0) + Number(v || 0);
  }

  return out;
}

function sortByValueDesc(mapObj) {
  return Object.entries(mapObj || {})
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name]) => name);
}

function buildStrikerRanking(agg) {
  const rows = [];
  for (const [player, totalRuns] of Object.entries(agg.battingRuns || {})) {
    const totalBalls = Number(agg.battingBalls[player] || 0);
    if (totalRuns >= STRIKER_MIN_RUNS && totalBalls > 0) {
      rows.push([player, (100 * totalRuns) / totalBalls]);
    }
  }
  rows.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return rows.map(([player]) => player);
}

function buildBowlingStrikeRateRanking(agg) {
  const rows = [];
  for (const [bowler, wickets] of Object.entries(agg.bowlingWickets || {})) {
    const balls = Number(agg.bowlingBalls[bowler] || 0);
    if (balls >= BOWLING_SR_MIN_BALLS && Number(wickets) > 0) rows.push([bowler, balls / Number(wickets)]);
  }
  rows.sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]));
  return {
    ranking: rows.map(([bowler]) => bowler),
    values: Object.fromEntries(rows.map(([bowler, sr]) => [bowler, Number(sr.toFixed(2))]))
  };
}

function buildBestFiguresRanking(agg) {
  const rows = Object.entries(agg.bestBowlingFigures || {}).map(([bowler, fig]) => [bowler, fig]);
  rows.sort(
    (a, b) =>
      b[1].wickets - a[1].wickets ||
      a[1].runs - b[1].runs ||
      a[1].balls - b[1].balls ||
      a[0].localeCompare(b[0])
  );
  return {
    ranking: rows.map(([bowler]) => bowler),
    figures: Object.fromEntries(rows.map(([bowler, fig]) => [bowler, `${fig.wickets}/${fig.runs}`]))
  };
}

function standingNrr(s) {
  const oversFor = (s.ballsFaced || 0) / 6;
  const oversAgainst = (s.ballsBowled || 0) / 6;
  if (oversFor <= 0 || oversAgainst <= 0) return 0;
  return Number((((s.runsFor / oversFor) - (s.runsAgainst / oversAgainst))).toFixed(3));
}

function buildStandingsRanking(agg) {
  return Object.entries(agg.standings || {})
    .map(([team, s]) => [team, s, standingNrr(s)])
    .sort((a, b) => b[1].points - a[1].points || b[2] - a[2] || a[0].localeCompare(b[0]))
    .map(([team]) => team);
}


function battingStrikeRateBonus(runs, balls) {
  if (runs < 30 || balls <= 0) return 0;
  const sr = (100 * runs) / balls;
  if (sr > 170) return 8;
  if (sr > 150) return 5;
  if (sr > 130) return 2;
  if (sr < 100) return -5;
  return 0;
}

function bowlingEconomyBonus(runsConceded, balls) {
  if (balls < 12 || balls <= 0) return 0;
  const econ = (runsConceded * 6) / balls;
  if (econ < 6) return 8;
  if (econ < 7) return 5;
  if (econ < 8) return 2;
  if (econ > 10) return -5;
  return 0;
}

function buildMvpRanking(agg, dotsValues) {
  const players = [...new Set([
    ...Object.keys(agg.battingRuns || {}),
    ...Object.keys(agg.battingSixes || {}),
    ...Object.keys(agg.bowlingWickets || {}),
    ...Object.keys(dotsValues || {}),
    ...Object.keys(agg.catches || {})
  ])].filter(Boolean);

  const rows = players.map((player) => {
    const runs = Number(agg.battingRuns[player] || 0);
    const balls = Number(agg.battingBalls[player] || 0);
    const sixes = Number(agg.battingSixes[player] || 0);
    const wickets = Number(agg.bowlingWickets[player] || 0);
    const dotBalls = Number(dotsValues[player] || 0);
    const catches = Number(agg.catches[player] || 0);
    const runsConceded = Number(agg.bowlingRunsConceded[player] || 0);

    const battingBase = runs + (sixes * 2);
    const bowlingBase = (wickets * 20) + (dotBalls * 1.5);
    const fieldingBase = catches * 8;
    const srBonus = battingStrikeRateBonus(runs, balls);
    const econBonus = bowlingEconomyBonus(runsConceded, Number(agg.bowlingBalls[player] || 0));
    const milestoneBonus =
      (Number(agg.battingFifties[player] || 0) * 10) +
      (Number(agg.battingHundreds[player] || 0) * 25) +
      (Number(agg.battingImpact30s[player] || 0) * 8) +
      (Number(agg.bowling3w[player] || 0) * 12) +
      (Number(agg.bowling4w[player] || 0) * 20) +
      (Number(agg.bowling5w[player] || 0) * 30);

    const score = battingBase + bowlingBase + fieldingBase + srBonus + econBonus + milestoneBonus;

    return [player, {
      score: Number(score.toFixed(2)),
      runs,
      sixes,
      wickets,
      dotBalls,
      catches,
      battingStrikeRate: balls > 0 ? Number(((100 * runs) / balls).toFixed(2)) : null,
      economy: Number(agg.bowlingBalls[player] || 0) > 0 ? Number((((runsConceded * 6) / Number(agg.bowlingBalls[player] || 0))).toFixed(2)) : null,
      matches: Number(agg.playerMatches[player] || 0),
      bonuses: {
        sr: srBonus,
        economy: econBonus,
        batting50s: Number(agg.battingFifties[player] || 0),
        batting100s: Number(agg.battingHundreds[player] || 0),
        impact30s: Number(agg.battingImpact30s[player] || 0),
        bowling3w: Number(agg.bowling3w[player] || 0),
        bowling4w: Number(agg.bowling4w[player] || 0),
        bowling5w: Number(agg.bowling5w[player] || 0)
      }
    }];
  });

  rows.sort((a, b) => b[1].score - a[1].score || a[0].localeCompare(b[0]));
  return {
    ranking: rows.map(([player]) => player),
    values: Object.fromEntries(rows)
  };
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function createScoreHistorySnapshotFromAggregates(agg, baseLive = null) {
  const snapshot = createEmptyLive();
  snapshot.meta.aggregates = cloneJson(agg || createEmptyAggregates());
  fillDerivedOutputs(
    snapshot,
    snapshot.meta.aggregates,
    baseLive?.mostDots ? {
      ranking: safeArray(baseLive.mostDots.ranking),
      extendedRanking: safeArray(baseLive.mostDots.extendedRanking),
      values: cloneJson(baseLive.mostDots.values || {})
    } : null,
    baseLive?.fairPlay ? {
      winner: baseLive.fairPlay.winner || null,
      ranking: safeArray(baseLive.fairPlay.ranking),
      extendedRanking: safeArray(baseLive.fairPlay.extendedRanking),
      values: cloneJson(baseLive.fairPlay.values || {}),
      updatedAt: baseLive.fairPlay.updatedAt || null,
      source: baseLive.fairPlay.source || null
    } : null
  );
  return snapshot;
}

function historyEntryCount(entry) {
  const count = Number(entry?.processedMatchCount ?? entry?.matchCount ?? entry?.completedMatches ?? entry?.processedMatches ?? 0);
  return Number.isFinite(count) && count >= 0 ? count : 0;
}

export function needsScoreHistoryBackfill(live) {
  const processedCount = safeArray(live?.meta?.processedMatchIds).length;
  if (processedCount <= 0) return false;
  const counts = new Set(safeArray(live?.meta?.scoreHistory).map((entry) => historyEntryCount(entry)));
  if (!counts.has(0)) return true;
  for (let count = 1; count < processedCount; count += 1) {
    if (!counts.has(count)) return true;
  }
  return false;
}

function upsertScoreHistorySnapshot(live, processedMatchCount, fetchedAt = isoNow()) {
  const existing = safeArray(live.meta.scoreHistory);
  const byCount = new Map(existing.map((entry) => [historyEntryCount(entry), entry]));
  if (!byCount.has(0)) {
    byCount.set(0, {
      processedMatchCount: 0,
      fetchedAt,
      snapshot: createEmptyLive()
    });
  }
  byCount.set(processedMatchCount, {
    processedMatchCount,
    fetchedAt,
    snapshot: createScoreHistorySnapshotFromAggregates(live.meta.aggregates, live)
  });
  live.meta.scoreHistory = Array.from(byCount.values()).sort((a, b) => historyEntryCount(a) - historyEntryCount(b));
}

export async function rebuildHistoricalState(processedIds, baseLive = null, { includeHistory = false, loadScorecard = null } = {}) {
  const rebuilt = createEmptyAggregates();
  const history = includeHistory ? [{
    processedMatchCount: 0,
    fetchedAt: baseLive?.meta?.scoreHistory?.find((entry) => historyEntryCount(entry) === 0)?.fetchedAt || null,
    snapshot: createEmptyLive()
  }] : null;
  let cacheHits = 0;
  let apiCalls = 0;
  const resolveScorecard = loadScorecard || ((matchId) => processScorecard(matchId, baseLive, {
    preferCache: true,
    allowApiFallback: ALLOW_HISTORICAL_REPLAY_API
  }));

  for (const matchId of processedIds) {
    const scorecardResult = normalizeScorecardResult(await resolveScorecard(matchId));
    if (scorecardResult.source === 'cache') cacheHits += 1;
    if (scorecardResult.source === 'api') apiCalls += 1;
    applyScorecardToAggregates(rebuilt, scorecardResult.data, { isFinal: true });
    if (includeHistory) {
      history.push({
        processedMatchCount: history.length,
        fetchedAt: isoNow(),
        snapshot: createScoreHistorySnapshotFromAggregates(rebuilt, baseLive)
      });
    }
  }

  return includeHistory
    ? { aggregates: rebuilt, scoreHistory: history, cacheHits, apiCalls }
    : { aggregates: rebuilt, cacheHits, apiCalls };
}

function fillDerivedOutputs(live, agg, dotsPayload = null, fairPlayPayload = null) {
  const orange = sortByValueDesc(agg.battingRuns);
  const sixes = sortByValueDesc(agg.battingSixes);
  const wickets = sortByValueDesc(agg.bowlingWickets);
  const catches = sortByValueDesc(agg.catches);
  const teamHighest = Object.entries(agg.teamHighestScore || {})
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([team]) => team);
  const bestFigures = buildBestFiguresRanking(agg);
  const bowlSr = buildBowlingStrikeRateRanking(agg);
  const standings = buildStandingsRanking(agg);
  const striker = buildStrikerRanking(agg);
  const dots = dotsPayload?.extendedRanking?.length ? dotsPayload : (live.mostDots || { ranking: [], extendedRanking: [], values: {} });

  live.orangeCap = { ranking: orange.slice(0, 10), extendedRanking: orange };
  live.mostSixes = { ranking: sixes.slice(0, 10), extendedRanking: sixes };
  live.purpleCap = { ranking: wickets.slice(0, 10), extendedRanking: wickets };
  live.highestScoreTeam = { ranking: teamHighest, extendedRanking: teamHighest, values: agg.teamHighestScore || {} };
  live.striker = { ranking: striker.slice(0, 10), extendedRanking: striker };
  live.bestBowlingFigures = {
    ranking: bestFigures.ranking.slice(0, 10),
    extendedRanking: bestFigures.ranking,
    figures: bestFigures.figures
  };
  live.bestBowlingStrikeRate = {
    ranking: bowlSr.ranking.slice(0, 10),
    extendedRanking: bowlSr.ranking,
    values: bowlSr.values
  };
  live.mostCatches = { ranking: catches.slice(0, 10), extendedRanking: catches, values: agg.catches || {} };
  live.titleWinner = {
    winner: standings[0] || null,
    finalists: standings.slice(0, 2),
    playoffs: standings.slice(0, 4),
    ranking: standings.slice(0, 10),
    extendedRanking: standings
  };
  live.tableBottom = { ranking: standings.slice(0, 10), extendedRanking: standings };
  live.mostDots = {
    ranking: safeArray(dots.ranking).slice(0, 10),
    extendedRanking: safeArray(dots.extendedRanking),
    values: dots.values || {}
  };
  const mvp = buildMvpRanking(agg, dots.values || {});
  const mvpExtendedRanking = safeArray(mvp.ranking);
  const leastMvpExtendedRanking = mvpExtendedRanking.filter((player) => Number(agg.playerMatches?.[player] || 0) >= LEAST_MVP_MIN_MATCHES);
  const leastMvpValues = Object.fromEntries(
    leastMvpExtendedRanking
      .filter((player) => mvp.values && mvp.values[player])
      .map((player) => [player, mvp.values[player]])
  );

  live.mvp = {
    ranking: mvpExtendedRanking.slice(0, 10),
    extendedRanking: mvpExtendedRanking,
    values: mvp.values,
    formula: 'Runs + (Sixes×2) + (Wickets×20) + (Dot balls×1.5) + (Catches×8) + batting SR bonus + bowling economy bonus + milestone bonuses',
    milestoneRules: {
      batting50: 10,
      batting100: 25,
      impact30Under15Balls: 8,
      bowling3w: 12,
      bowling4w: 20,
      bowling5w: 30
    },
    bonusRules: {
      battingStrikeRate: { gt170: 8, gt150: 5, gt130: 2, lt100: -5, minRuns: 30 },
      economy: { lt6: 8, lt7: 5, lt8: 2, gt10: -5, minBalls: 12 }
    }
  };

  const uncappedMvpExtendedRanking = mvpExtendedRanking.filter((player) => UNCAPPED_MVP_PLAYER_KEYS.has(canonicalPlayerPoolKey(player)));
  const uncappedMvpValues = Object.fromEntries(
    uncappedMvpExtendedRanking
      .filter((player) => mvp.values && mvp.values[player])
      .map((player) => [player, mvp.values[player]])
  );

  live.uncappedMvp = {
    ranking: uncappedMvpExtendedRanking.slice(0, 10),
    extendedRanking: uncappedMvpExtendedRanking,
    values: uncappedMvpValues,
    source: 'custom MVP ranking filtered to user-provided uncapped player pool'
  };

  const fairPlay = fairPlayPayload?.extendedRanking?.length
    ? fairPlayPayload
    : (live.fairPlay || { winner: null, ranking: [], extendedRanking: [], values: {} });

  live.fairPlay = {
    winner: fairPlay.winner || safeArray(fairPlay.extendedRanking)[0] || null,
    ranking: safeArray(fairPlay.ranking).slice(0, 10),
    extendedRanking: safeArray(fairPlay.extendedRanking),
    values: fairPlay.values || {},
    updatedAt: fairPlay.updatedAt || null,
    source: fairPlay.source || null
  };

  live.leastMvp = {
    ranking: leastMvpExtendedRanking.slice(0, 10),
    extendedRanking: leastMvpExtendedRanking,
    values: leastMvpValues,
    minMatches: LEAST_MVP_MIN_MATCHES,
    formulaSource: 'custom MVP ranking filtered to players with minimum match requirement'
  };
}

function endedUnprocessedMatches(matchList, processedIds) {
  const set = new Set(processedIds || []);
  return safeArray(matchList)
    .filter((m) => m.matchEnded && !set.has(m.id))
    .sort((a, b) => Date.parse(a.dateTimeGMT) - Date.parse(b.dateTimeGMT));
}

function liveMatchCandidate(matchList) {
  return safeArray(matchList).find((m) => m.matchStarted && !m.matchEnded) || null;
}

async function processScorecard(matchId, live, { preferCache = false, allowApiFallback = true } = {}) {
  if (preferCache) {
    const cached = await readCachedScorecard(matchId);
    if (cached) return { data: cached, source: 'cache' };
    if (!allowApiFallback) {
      throw new Error(`Missing cached scorecard for processed match ${matchId}`);
    }
  }

  const json = await fetchCricketDataJson((apiKey) => buildScorecardUrl(apiKey, matchId), live);
  await writeCachedScorecard(matchId, json.data);
  return { data: json.data, source: 'api' };
}

function shouldFetchLiveScorecard(live, activeMatch, currentMs) {
  if (!activeMatch) return { fetch: false, reason: 'no active match' };
  if (!LIVE_SCORECARD_ENABLED) return { fetch: false, reason: 'live scorecards disabled' };

  const sameMatch = live.meta.scorecardBudget.lastLiveScorecardMatchId === activeMatch.id;
  const minsSinceLast = minutesSince(live.meta.scorecardBudget.lastLiveScorecardAt, currentMs);

  if (!sameMatch) return { fetch: true, reason: 'new active match' };
  if (minsSinceLast >= LIVE_SCORECARD_INTERVAL_MINUTES) return { fetch: true, reason: 'live scorecard interval reached' };
  return { fetch: false, reason: 'live scorecard interval not reached' };
}

function reusableOverlayAggregates(live, activeMatch) {
  if (!activeMatch) return null;
  if (live.meta.liveOverlay?.matchId !== activeMatch.id) return null;
  return live.meta.liveOverlay?.aggregates || null;
}


function countKeys(mapObj) {
  return Object.keys(mapObj || {}).length;
}

function needsHistoricalAggregateBackfill(live) {
  const processedCount = safeArray(live.meta.processedMatchIds).length;
  if (!processedCount) return false;
  if (Number(live.meta.aggregateSchemaVersion || 0) < AGGREGATE_SCHEMA_VERSION) return true;

  const agg = live.meta.aggregates || createEmptyAggregates();
  const criticalMaps = [
    agg.bowlingRunsConceded,
    agg.playerMatches,
    agg.battingFifties,
    agg.battingHundreds,
    agg.battingImpact30s,
    agg.bowling3w,
    agg.bowling4w,
    agg.bowling5w
  ];
  return criticalMaps.some((mapObj) => countKeys(mapObj) === 0);
}

async function main() {
  if (!API_KEY && !FALLBACK_API_KEY) throw new Error('Missing CRICKETDATA_API_KEY environment variable');

  await ensureDataDir();

  const live = await readExistingLive();
  resetDailySchedulerIfNeeded(live);

  live.meta.scorecardBudget.liveEnabled = LIVE_SCORECARD_ENABLED;
  live.meta.scorecardBudget.liveIntervalMinutes = LIVE_SCORECARD_INTERVAL_MINUTES;
  live.meta.scorecardBudget.maxBacklogPerRun = MAX_BACKLOG_SCORECARDS_PER_RUN;
  live.meta.scorecardBudget.maxFreshPerRun = MAX_FRESH_SCORECARD_CALLS_PER_RUN;
  live.meta.officialMostDots.enabled = IPLT20_MOST_DOTS_ENABLED;
  live.meta.officialMostDots.minRefreshMinutes = IPLT20_MOST_DOTS_MIN_REFRESH_MINUTES;
  live.meta.lastRun = {
    seriesInfoCalls: 0,
    scorecardCalls: 0,
    scorecardCacheHits: 0,
    backlogProcessed: 0,
    backlogRemaining: 0,
    liveOverlayFetched: false,
    liveOverlayReused: false,
    liveOverlaySkippedReason: null,
    cricketDataFailovers: 0,
    historicalReplaySkipped: false,
    historicalReplayMissingCaches: 0,
    historicalReplayUsedApiFallback: false,
    historicalReplayReason: null,
    freshScorecardBudgetExhausted: false,
    freshScorecardBudgetSkips: 0
  };
  live.meta.scorecardBudget.lastBudgetExhaustedAt = null;
  live.meta.scorecardBudget.lastBudgetSkipReason = null;
  live.meta.providerStatus = {
    ...(live.meta.providerStatus || {}),
    lastAttemptAt: isoNow(),
    activeKeyTier: live.meta?.providerStatus?.activeKeyTier || null,
    fallbackAvailable: Boolean(FALLBACK_API_KEY && FALLBACK_API_KEY !== API_KEY),
    lastFallbackAt: live.meta?.providerStatus?.lastFallbackAt || null,
    lastFallbackReason: live.meta?.providerStatus?.lastFallbackReason || null
  };

  const scheduleEntries = await readLeagueStageSchedule();
  const now = new Date();
  const currentMs = now.getTime();
  const decision = buildRefreshDecision(scheduleEntries, now, { forceRefresh: FORCE_REFRESH });
  live.meta.scheduler.lastDecision = { at: isoNow(), ...decision };
  live.meta.scheduler.nextPlannedRefreshAt = decision.nextPlannedAt || null;
  live.meta.scheduler.nextPlannedMode = decision.nextPlannedAt ? 'scheduled_window' : null;
  live.meta.scheduler.nextPlannedReason = decision.nextPlannedAt ? 'league-stage refresh plan' : decision.reason;
  live.meta.scheduler.nextPlannedCalculatedAt = isoNow();

  if (!decision.shouldRefresh) {
    live.fetchedAt = isoNow();
    live.scrapeStatus = `skipped (${decision.mode}: ${decision.reason})`;
    live.scrapeReport = {
      costControl: {
        ok: true,
        source: 'worker',
        method: 'scheduled league-stage windows, cached completed matches forever, capped backlog catch-up, throttled live scorecards',
        skipped: true,
        mode: decision.mode,
        reason: decision.reason,
        liveScorecardsEnabled: LIVE_SCORECARD_ENABLED,
        liveScorecardIntervalMinutes: LIVE_SCORECARD_INTERVAL_MINUTES,
        maxBacklogScorecardsPerRun: MAX_BACKLOG_SCORECARDS_PER_RUN,
        maxFreshScorecardCallsPerRun: MAX_FRESH_SCORECARD_CALLS_PER_RUN,
        scorecardCallsThisRun: live.meta.lastRun.scorecardCalls,
        backlogRemaining: live.meta.lastRun.backlogRemaining
      }
    };
    await fs.writeFile(DATA_FILE, JSON.stringify(live, null, 2), 'utf8');
    console.log(`Skip: ${decision.reason}`);
    return;
  }

  try {
    const seriesJson = await fetchCricketDataJson((apiKey) => buildSeriesInfoUrl(apiKey), live);
    live.meta.lastRun.seriesInfoCalls = 1;

  const matchList = safeArray(seriesJson.data?.matchList).map(toMinimalMatch);
  live.meta.cache.matchList = matchList;
  live.meta.scheduler.lastSeriesInfoAt = isoNow();

  live.meta.scheduler.lastLiveRefreshAt = isoNow();

  const nextPlanned = nextScheduledRefreshAt(scheduleEntries, new Date());
  live.meta.scheduler.nextPlannedRefreshAt = nextPlanned ? nextPlanned.toISOString() : null;
  live.meta.scheduler.nextPlannedMode = nextPlanned ? 'scheduled_window' : null;
  live.meta.scheduler.nextPlannedReason = nextPlanned ? 'league-stage refresh plan' : 'league-stage refresh plan completed';
  live.meta.scheduler.nextPlannedCalculatedAt = isoNow();

  const processedIds = new Set(live.meta.processedMatchIds || []);
  let finalizedAgg = live.meta.aggregates || createEmptyAggregates();

  const requiresHistoricalBackfill = needsHistoricalAggregateBackfill(live);
  const requiresScoreHistoryBackfill = needsScoreHistoryBackfill(live);
  let appliedHistoricalBackfill = false;
  if (requiresHistoricalBackfill || requiresScoreHistoryBackfill) {
    const historicalReplayMissingCaches = await findMissingScorecardCaches(live.meta.processedMatchIds || []);

    if (historicalReplayMissingCaches.length && !ALLOW_HISTORICAL_REPLAY_API) {
      live.meta.lastRun.historicalReplaySkipped = true;
      live.meta.lastRun.historicalReplayMissingCaches = historicalReplayMissingCaches.length;
      live.meta.lastRun.historicalReplayReason = `cache-only replay skipped; ${historicalReplayMissingCaches.length} cached scorecard${historicalReplayMissingCaches.length === 1 ? '' : 's'} missing`;
    } else if (historicalReplayMissingCaches.length > freshScorecardBudgetRemaining(live)) {
      live.meta.lastRun.historicalReplaySkipped = true;
      live.meta.lastRun.historicalReplayMissingCaches = historicalReplayMissingCaches.length;
      live.meta.lastRun.historicalReplayReason = `fresh scorecard budget exhausted before historical replay (${historicalReplayMissingCaches.length} fresh call${historicalReplayMissingCaches.length === 1 ? '' : 's'} needed)`;
      noteFreshScorecardBudgetSkip(live, 'historical replay');
    } else {
      const rebuiltState = await rebuildHistoricalState(
        live.meta.processedMatchIds || [],
        live,
        {
          includeHistory: requiresScoreHistoryBackfill,
          loadScorecard: (matchId) => processScorecard(matchId, live, {
            preferCache: true,
            allowApiFallback: ALLOW_HISTORICAL_REPLAY_API
          })
        }
      );
      finalizedAgg = rebuiltState.aggregates;
      if (requiresScoreHistoryBackfill) {
        live.meta.scoreHistory = rebuiltState.scoreHistory;
      }
      live.meta.lastRun.scorecardCalls += rebuiltState.apiCalls;
      live.meta.lastRun.scorecardCacheHits += rebuiltState.cacheHits;
      live.meta.lastRun.historicalReplayUsedApiFallback = rebuiltState.apiCalls > 0;
      appliedHistoricalBackfill = true;
    }
  }
  if (requiresHistoricalBackfill && appliedHistoricalBackfill) {
    live.meta.aggregateSchemaVersion = AGGREGATE_SCHEMA_VERSION;
  }

  const endedBacklog = endedUnprocessedMatches(matchList, live.meta.processedMatchIds);
  const backlogToProcess = endedBacklog.slice(0, MAX_BACKLOG_SCORECARDS_PER_RUN);
  const activeMatch = liveMatchCandidate(matchList);

  for (const match of backlogToProcess) {
    if (!(await readCachedScorecard(match.id)) && !canUseFreshScorecardCall(live, 1)) {
      noteFreshScorecardBudgetSkip(live, `backlog match ${match.id}`);
      break;
    }
    const scorecardResult = await processScorecard(match.id, live, { preferCache: true });
    if (scorecardResult.source === 'cache') {
      live.meta.lastRun.scorecardCacheHits += 1;
    } else {
      live.meta.lastRun.scorecardCalls += 1;
    }
    applyScorecardToAggregates(finalizedAgg, scorecardResult.data, { isFinal: true });
    processedIds.add(match.id);
    live.meta.lastRun.backlogProcessed += 1;
  }

  const backlogRemaining = Math.max(0, endedBacklog.length - live.meta.lastRun.backlogProcessed);
  live.meta.lastRun.backlogRemaining = backlogRemaining;
  if (live.meta.lastRun.backlogProcessed > 0) {
    live.meta.scorecardBudget.lastBacklogProcessAt = isoNow();
  }

  let overlayAgg = null;
  const liveScorecardDecision = shouldFetchLiveScorecard(live, activeMatch, currentMs);

  if (activeMatch && !processedIds.has(activeMatch.id) && liveScorecardDecision.fetch) {
    if (!canUseFreshScorecardCall(live, 1)) {
      noteFreshScorecardBudgetSkip(live, `live overlay ${activeMatch.id}`);
      live.meta.lastRun.liveOverlaySkippedReason = 'fresh scorecard budget exhausted';
      overlayAgg = reusableOverlayAggregates(live, activeMatch);
      live.meta.lastRun.liveOverlayReused = !!overlayAgg;
      live.meta.liveOverlay = {
        matchId: activeMatch.id,
        generatedAt: overlayAgg ? live.meta.liveOverlay.generatedAt : isoNow(),
        aggregates: overlayAgg,
        status: activeMatch.status,
        source: overlayAgg ? 'reused cached live overlay' : 'series_info only'
      };
    } else {
      const scorecardResult = await processScorecard(activeMatch.id, live);
      if (scorecardResult.source === 'cache') {
        live.meta.lastRun.scorecardCacheHits += 1;
      } else {
        live.meta.lastRun.scorecardCalls += 1;
      }
      live.meta.lastRun.liveOverlayFetched = true;
      overlayAgg = createEmptyAggregates();
      applyScorecardToAggregates(overlayAgg, scorecardResult.data, { isFinal: false });
      live.meta.liveOverlay = {
        matchId: activeMatch.id,
        generatedAt: isoNow(),
        aggregates: overlayAgg,
        status: activeMatch.status,
        source: `match_scorecard (${liveScorecardDecision.reason})`
      };
      live.meta.scorecardBudget.lastLiveScorecardAt = isoNow();
      live.meta.scorecardBudget.lastLiveScorecardMatchId = activeMatch.id;
    }
  } else if (activeMatch && !processedIds.has(activeMatch.id)) {
    overlayAgg = reusableOverlayAggregates(live, activeMatch);
    live.meta.lastRun.liveOverlayReused = !!overlayAgg;
    live.meta.lastRun.liveOverlaySkippedReason = liveScorecardDecision.reason;
    live.meta.liveOverlay = {
      matchId: activeMatch.id,
      generatedAt: overlayAgg ? live.meta.liveOverlay.generatedAt : isoNow(),
      aggregates: overlayAgg,
      status: activeMatch.status,
      source: overlayAgg ? 'reused cached live overlay' : 'series_info only'
    };
  } else {
    live.meta.liveOverlay = {
      matchId: null,
      generatedAt: isoNow(),
      aggregates: null,
      status: null,
      source: null
    };
  }

  live.meta.processedMatchIds = [...processedIds];
  live.meta.aggregates = finalizedAgg;
  live.meta.aggregateSchemaVersion = AGGREGATE_SCHEMA_VERSION;

  const combinedAgg = combineAggregates(finalizedAgg, overlayAgg);

  let dotsPayload = live.mostDots || { ranking: [], extendedRanking: [], values: {} };
  const dotsDecision = shouldFetchOfficialMostDots(live, decision, currentMs, live.meta.lastRun.backlogProcessed);
  let dotsReport = {
    ok: false,
    source: 'IPLT20 official most dots feed',
    method: 'parsed JSONP mostdotballsbowledtournament feed from Sports Mechanic stats feed',
    reason: dotsDecision.reason
  };

  if (dotsDecision.fetch) {
    live.meta.officialMostDots.lastAttemptAt = isoNow();
    try {
      dotsPayload = await fetchOfficialMostDots(combinedAgg);
      live.meta.officialMostDots.lastFetchedAt = isoNow();
      live.meta.officialMostDots.lastSource = dotsPayload.source;
      live.meta.officialMostDots.lastStatus = 'ok';
      live.meta.officialMostDots.lastError = null;
      combinedAgg.bowlingDots = { ...(dotsPayload.values || {}) };
      dotsReport = {
        ok: true,
        source: dotsPayload.source,
        method: 'parsed JSONP mostdotballsbowledtournament feed from Sports Mechanic stats feed',
        rows: dotsPayload.extendedRanking.length
      };
    } catch (error) {
      live.meta.officialMostDots.lastStatus = 'error';
      live.meta.officialMostDots.lastError = error.message;
      dotsReport = {
        ok: false,
        source: 'IPLT20 official most dots feed',
        method: 'parsed JSONP mostdotballsbowledtournament feed from Sports Mechanic stats feed',
        error: error.message,
        fallback: safeArray(live.mostDots?.extendedRanking).length ? 'kept previous mostDots snapshot' : 'no previous mostDots snapshot'
      };
    }
  } else {
    if (safeArray(live.mostDots?.extendedRanking).length) {
      combinedAgg.bowlingDots = { ...(live.mostDots.values || {}) };
      dotsReport.cachedRows = live.mostDots.extendedRanking.length;
    }
  }

  let fairPlayPayload = live.fairPlay || { winner: null, ranking: [], extendedRanking: [], values: {} };
  let fairPlayReport = {
    ok: false,
    source: 'IPLT20 official fairplay feed',
    method: 'parsed JSONP fairplayTotal table from Sports Mechanic stats feed'
  };

  if (IPLT20_FAIRPLAY_ENABLED) {
    try {
      fairPlayPayload = await fetchOfficialFairPlay();
      fairPlayReport = {
        ok: true,
        source: fairPlayPayload.source,
        method: 'parsed JSONP fairplayTotal table from Sports Mechanic stats feed',
        rows: fairPlayPayload.extendedRanking.length,
        updatedAt: fairPlayPayload.updatedAt
      };
    } catch (error) {
      fairPlayReport = {
        ok: false,
        source: 'IPLT20 official fairplay feed',
        method: 'parsed JSONP fairplayTotal table from Sports Mechanic stats feed',
        error: error.message,
        fallback: safeArray(live.fairPlay?.extendedRanking).length ? 'kept previous fairPlay snapshot' : 'no previous fairPlay snapshot'
      };
    }
  } else {
    fairPlayReport.reason = 'fairplay feed disabled';
    if (safeArray(live.fairPlay?.extendedRanking).length) fairPlayReport.fallback = 'kept previous fairPlay snapshot';
  }

  fillDerivedOutputs(live, combinedAgg, dotsPayload, fairPlayPayload);

  live.scrapeReport = {
    orangeCap: { ok: true, source: 'CricketData scorecards', method: 'computed season total runs' },
    mostSixes: { ok: true, source: 'CricketData scorecards', method: 'computed season total sixes' },
    purpleCap: { ok: true, source: 'CricketData scorecards', method: 'computed season total wickets' },
    highestScoreTeam: { ok: true, source: 'CricketData scorecards', method: 'computed team max innings score' },
    striker: { ok: true, source: 'CricketData scorecards', method: 'computed strike rate with minimum 100 runs' },
    bestBowlingFigures: { ok: true, source: 'CricketData scorecards', method: 'best single spell sorted by wickets then runs' },
    bestBowlingStrikeRate: { ok: true, source: 'CricketData scorecards', method: 'computed balls per wicket with minimum 72 balls' },
    mostCatches: { ok: true, source: 'CricketData scorecards', method: 'computed season total catches' },
    titleWinner: { ok: true, source: 'CricketData scorecards', method: 'computed standings from completed matches' },
    tableBottom: { ok: true, source: 'CricketData scorecards', method: 'computed standings from completed matches' },
    mostDots: dotsReport,
    mvp: { ok: true, source: 'CricketData + IPLT20 official Most Dots', method: 'custom formula using runs, sixes, wickets, dot balls, catches, strike-rate bonus, economy bonus and milestone bonuses' },
    uncappedMvp: { ok: true, source: 'custom MVP ranking', method: 'filtered to the provided uncapped player pool, then compares picks by their positions in the custom MVP ranking' },
    fairPlay: fairPlayReport,
    leastMvp: { ok: true, source: 'custom MVP ranking', method: `lower in custom MVP ranking wins, filtered to players with minimum ${LEAST_MVP_MIN_MATCHES} matches` },
    costControl: {
      ok: true,
      source: 'worker',
      method: 'scheduled league-stage windows, cached completed matches forever, cache-first historical replay, capped backlog catch-up, throttled live scorecards',
      liveScorecardsEnabled: LIVE_SCORECARD_ENABLED,
      liveScorecardIntervalMinutes: LIVE_SCORECARD_INTERVAL_MINUTES,
      maxBacklogScorecardsPerRun: MAX_BACKLOG_SCORECARDS_PER_RUN,
      maxFreshScorecardCallsPerRun: MAX_FRESH_SCORECARD_CALLS_PER_RUN,
      historicalReplayApiFallbackAllowed: ALLOW_HISTORICAL_REPLAY_API,
      scorecardCallsThisRun: live.meta.lastRun.scorecardCalls,
      scorecardCacheHitsThisRun: live.meta.lastRun.scorecardCacheHits,
      historicalReplaySkipped: live.meta.lastRun.historicalReplaySkipped,
      historicalReplayMissingCaches: live.meta.lastRun.historicalReplayMissingCaches,
      freshScorecardBudgetExhausted: live.meta.lastRun.freshScorecardBudgetExhausted,
      freshScorecardBudgetSkips: live.meta.lastRun.freshScorecardBudgetSkips,
      freshScorecardBudgetRemaining: freshScorecardBudgetRemaining(live),
      backlogRemaining
    }
  };

    setProviderStatusOk(live);
    live.fetchedAt = isoNow();
    live.scrapeStatus = `ok (${live.meta.processedMatchIds.length} processed matches${activeMatch ? ', live match tracked' : ''}, ${live.meta.lastRun.scorecardCalls} scorecard call${live.meta.lastRun.scorecardCalls === 1 ? '' : 's'} this run${live.meta.lastRun.scorecardCacheHits ? `, ${live.meta.lastRun.scorecardCacheHits} cached scorecard${live.meta.lastRun.scorecardCacheHits === 1 ? '' : 's'} reused` : ''}${live.meta.lastRun.freshScorecardBudgetExhausted ? ', fresh scorecard budget exhausted' : ''}${backlogRemaining ? `, ${backlogRemaining} backlog remaining` : ''})`;
    upsertScoreHistorySnapshot(live, live.meta.processedMatchIds.length, live.fetchedAt);

    await fs.writeFile(DATA_FILE, JSON.stringify(live, null, 2), 'utf8');

    console.log(
      `Updated live.json. Series info calls: ${live.meta.lastRun.seriesInfoCalls}. Scorecard calls: ${live.meta.lastRun.scorecardCalls}. Cached scorecards reused: ${live.meta.lastRun.scorecardCacheHits}. Fresh budget exhausted: ${live.meta.lastRun.freshScorecardBudgetExhausted}. Backlog processed: ${live.meta.lastRun.backlogProcessed}. Backlog remaining: ${backlogRemaining}. Live overlay: ${live.meta.liveOverlay.source || 'none'}.`
    );
  } catch (error) {
    if (isCricketDataQuotaError(error)) {
      const details = parseCricketDataQuotaDetails(error);
      applyProviderDelayState(live, details);
      await fs.writeFile(DATA_FILE, JSON.stringify(live, null, 2), 'utf8');
      console.warn(`CricketData quota reached (${details.hitsToday}/${details.hitsLimit}). Keeping previous live snapshot.`);
      return;
    }
    if (isCricketDataFallbackEligibleError(error)) {
      const details = parseCricketDataFailureDetails(error) || { reason: 'provider_error', hitsToday: null, hitsLimit: null };
      applyProviderSafeExitState(live, details);
      await fs.writeFile(DATA_FILE, JSON.stringify(live, null, 2), 'utf8');
      console.warn(`CricketData fallback exhausted (${details.reason}). Keeping previous live snapshot.`);
      return;
    }
    throw error;
  }
}

function isDirectRun() {
  const argv1 = process.argv[1];
  if (!argv1) return false;
  return import.meta.url === pathToFileURL(argv1).href;
}

if (isDirectRun()) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
