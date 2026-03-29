import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'live.json');

const API_KEY = process.env.CRICKETDATA_API_KEY;
const SERIES_ID = '87c62aac-bc3c-4738-ab93-19da0690488f';
const SERIES_INFO_URL = `https://api.cricapi.com/v1/series_info?apikey=${API_KEY}&offset=0&id=${SERIES_ID}`;
const SCORECARD_URL = (matchId) => `https://api.cricapi.com/v1/match_scorecard?apikey=${API_KEY}&offset=0&id=${matchId}`;

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
const CRICMETRIC_BOWLING_URL = 'https://www.cricmetric.com/series.py?series=ipl2026&show=bowling#';
const CRICMETRIC_DOTS_ENABLED = parseEnvBool(process.env.CRICMETRIC_DOTS_ENABLED, true);
const CRICMETRIC_MIN_REFRESH_MINUTES = parseEnvInt(process.env.CRICMETRIC_MIN_REFRESH_MINUTES, 120);

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

function isoNow() { return new Date().toISOString(); }
function nowMs() { return Date.now(); }
function safeArray(v) { return Array.isArray(v) ? v : []; }
function normalizeName(name) { return String(name || '').replace(/\s+/g, ' ').trim(); }
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
        lastDecision: null
      },
      cache: { seriesId: SERIES_ID, matchList: [] },
      processedMatchIds: [],
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
        lastLiveScorecardAt: null,
        lastLiveScorecardMatchId: null,
        lastBacklogProcessAt: null
      },
      cricmetricDots: {
        enabled: CRICMETRIC_DOTS_ENABLED,
        minRefreshMinutes: CRICMETRIC_MIN_REFRESH_MINUTES,
        lastFetchedAt: null,
        lastAttemptAt: null,
        lastSource: null,
        lastStatus: null,
        lastError: null
      },
      lastRun: {
        seriesInfoCalls: 0,
        scorecardCalls: 0,
        backlogProcessed: 0,
        backlogRemaining: 0,
        liveOverlayFetched: false,
        liveOverlayReused: false,
        liveOverlaySkippedReason: null
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
        aggregates: { ...fresh.meta.aggregates, ...(parsed.meta?.aggregates || {}) },
        liveOverlay: { ...fresh.meta.liveOverlay, ...(parsed.meta?.liveOverlay || {}) },
        scorecardBudget: { ...fresh.meta.scorecardBudget, ...(parsed.meta?.scorecardBudget || {}) },
        cricmetricDots: { ...fresh.meta.cricmetricDots, ...(parsed.meta?.cricmetricDots || {}) },
        lastRun: { ...fresh.meta.lastRun, ...(parsed.meta?.lastRun || {}) }
      }
    };
  } catch {
    return createEmptyLive();
  }
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
  if (json.status && json.status !== 'success') throw new Error(`API error: ${JSON.stringify(json)}`);
  return json;
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

function parseHtmlTableRows(html) {
  const tables = [...String(html || '').matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)];
  for (const tableMatch of tables) {
    const tableHtml = tableMatch[1];
    const rowMatches = [...tableHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
    const rows = rowMatches.map((row) => {
      const cells = [...row[1].matchAll(/<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((cell) => stripTags(cell[2]));
      return cells.filter((cell) => cell !== '');
    }).filter((cells) => cells.length);
    if (rows.length) return rows;
  }
  return [];
}

function parsePipeTableRows(text) {
  const lines = String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return lines
    .filter((line) => line.includes('|'))
    .map((line) => line.split('|').map((cell) => stripTags(cell)).filter(Boolean))
    .filter((cells) => cells.length >= 3);
}

function rowsToDotsPayload(rows, agg) {
  if (!rows.length) return null;

  const headerIndex = rows.findIndex((cells) => {
    const normalized = cells.map((cell) => normalizeLookupName(cell));
    return normalized.includes('player') && normalized.includes('dots');
  });
  if (headerIndex < 0) return null;

  const headers = rows[headerIndex].map((cell) => normalizeLookupName(cell));
  const playerIdx = headers.indexOf('player');
  const dotsIdx = headers.indexOf('dots');
  if (playerIdx < 0 || dotsIdx < 0) return null;

  const values = {};
  for (const cells of rows.slice(headerIndex + 1)) {
    if (cells.length <= Math.max(playerIdx, dotsIdx)) continue;
    const rawPlayer = cells[playerIdx];
    const dotsValue = Number.parseInt(String(cells[dotsIdx] || '').replace(/[^0-9-]/g, ''), 10);
    if (!rawPlayer || !Number.isFinite(dotsValue)) continue;
    const player = resolveCricmetricPlayerName(rawPlayer, agg);
    if (!player) continue;
    values[player] = Math.max(values[player] || 0, dotsValue);
  }

  const ordered = Object.entries(values)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name]) => name);

  if (!ordered.length) return null;
  return { ranking: ordered.slice(0, 10), extendedRanking: ordered, values };
}

function parseCricmetricDots(text, agg) {
  return rowsToDotsPayload(parseHtmlTableRows(text), agg) || rowsToDotsPayload(parsePipeTableRows(text), agg);
}

async function fetchCricmetricDots(agg) {
  const directUrl = CRICMETRIC_BOWLING_URL.replace(/#$/, '');
  const proxyUrl = `https://r.jina.ai/http://${directUrl.replace(/^https?:\/\//, '')}`;
  const attempts = [
    { url: directUrl, source: 'cricmetric-direct' },
    { url: proxyUrl, source: 'cricmetric-via-jina' }
  ];

  const errors = [];
  for (const attempt of attempts) {
    try {
      const text = await fetchText(attempt.url);
      const parsed = parseCricmetricDots(text, agg);
      if (parsed?.extendedRanking?.length) {
        return { ...parsed, source: attempt.source };
      }
      errors.push(`${attempt.source}: table-not-found`);
    } catch (error) {
      errors.push(`${attempt.source}: ${error.message}`);
    }
  }

  throw new Error(errors.join(' | '));
}

function shouldFetchCricmetricDots(live, decision, currentMs, backlogProcessed) {
  if (!CRICMETRIC_DOTS_ENABLED) return { fetch: false, reason: 'cricmetric dots disabled' };
  if (backlogProcessed > 0) return { fetch: true, reason: 'completed match backlog processed' };
  if (decision.mode === 'live_window') return { fetch: false, reason: 'skip during live window without completed backlog' };
  const minsSinceLast = minutesSince(live.meta.cricmetricDots?.lastFetchedAt, currentMs);
  if (minsSinceLast >= CRICMETRIC_MIN_REFRESH_MINUTES) return { fetch: true, reason: 'refresh interval reached' };
  return { fetch: false, reason: 'refresh interval not reached' };
}

function resetDailySchedulerIfNeeded(live) {
  const today = londonDayKey();
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

function fillDerivedOutputs(live, agg, dotsPayload = null) {
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
  live.mvp = {
    ranking: safeArray(mvp.ranking).slice(0, 10),
    extendedRanking: safeArray(mvp.ranking),
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
  live.uncappedMvp = { ranking: [], extendedRanking: [] };
  live.fairPlay = { ranking: [], extendedRanking: [] };
  live.leastMvp = { ranking: [], extendedRanking: [] };
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

async function processScorecard(matchId) {
  const json = await fetchJson(SCORECARD_URL(matchId));
  return json.data;
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

async function main() {
  if (!API_KEY) throw new Error('Missing CRICKETDATA_API_KEY environment variable');

  await ensureDataDir();

  const live = await readExistingLive();
  resetDailySchedulerIfNeeded(live);

  live.meta.scorecardBudget.liveEnabled = LIVE_SCORECARD_ENABLED;
  live.meta.scorecardBudget.liveIntervalMinutes = LIVE_SCORECARD_INTERVAL_MINUTES;
  live.meta.scorecardBudget.maxBacklogPerRun = MAX_BACKLOG_SCORECARDS_PER_RUN;
  live.meta.cricmetricDots.enabled = CRICMETRIC_DOTS_ENABLED;
  live.meta.cricmetricDots.minRefreshMinutes = CRICMETRIC_MIN_REFRESH_MINUTES;
  live.meta.lastRun = {
    seriesInfoCalls: 0,
    scorecardCalls: 0,
    backlogProcessed: 0,
    backlogRemaining: 0,
    liveOverlayFetched: false,
    liveOverlayReused: false,
    liveOverlaySkippedReason: null
  };

  const currentMs = nowMs();
  const decision = decideRefreshMode(live, currentMs);
  live.meta.scheduler.lastDecision = { at: isoNow(), ...decision };

  if (!decision.shouldRefresh) {
    console.log(`Skip: ${decision.reason}`);
    return;
  }

  const seriesJson = await fetchJson(SERIES_INFO_URL);
  live.meta.lastRun.seriesInfoCalls = 1;

  const matchList = safeArray(seriesJson.data?.matchList).map(toMinimalMatch);
  live.meta.cache.matchList = matchList;
  live.meta.scheduler.lastSeriesInfoAt = isoNow();

  if (decision.mode === 'quiet_window') {
    live.meta.scheduler.quietRefreshesUsed += 1;
    live.meta.scheduler.lastQuietRefreshAt = isoNow();
  } else {
    live.meta.scheduler.lastLiveRefreshAt = isoNow();
  }

  const processedIds = new Set(live.meta.processedMatchIds || []);
  const finalizedAgg = live.meta.aggregates || createEmptyAggregates();

  const endedBacklog = endedUnprocessedMatches(matchList, live.meta.processedMatchIds);
  const backlogToProcess = endedBacklog.slice(0, MAX_BACKLOG_SCORECARDS_PER_RUN);
  const backlogRemaining = Math.max(0, endedBacklog.length - backlogToProcess.length);
  const activeMatch = liveMatchCandidate(matchList);

  for (const match of backlogToProcess) {
    const scorecard = await processScorecard(match.id);
    live.meta.lastRun.scorecardCalls += 1;
    applyScorecardToAggregates(finalizedAgg, scorecard, { isFinal: true });
    processedIds.add(match.id);
    live.meta.lastRun.backlogProcessed += 1;
  }

  live.meta.lastRun.backlogRemaining = backlogRemaining;
  if (backlogToProcess.length > 0) {
    live.meta.scorecardBudget.lastBacklogProcessAt = isoNow();
  }

  let overlayAgg = null;
  const liveScorecardDecision = shouldFetchLiveScorecard(live, activeMatch, currentMs);

  if (activeMatch && !processedIds.has(activeMatch.id) && liveScorecardDecision.fetch) {
    const scorecard = await processScorecard(activeMatch.id);
    live.meta.lastRun.scorecardCalls += 1;
    live.meta.lastRun.liveOverlayFetched = true;
    overlayAgg = createEmptyAggregates();
    applyScorecardToAggregates(overlayAgg, scorecard, { isFinal: false });
    live.meta.liveOverlay = {
      matchId: activeMatch.id,
      generatedAt: isoNow(),
      aggregates: overlayAgg,
      status: activeMatch.status,
      source: `match_scorecard (${liveScorecardDecision.reason})`
    };
    live.meta.scorecardBudget.lastLiveScorecardAt = isoNow();
    live.meta.scorecardBudget.lastLiveScorecardMatchId = activeMatch.id;
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

  const combinedAgg = combineAggregates(finalizedAgg, overlayAgg);

  let dotsPayload = live.mostDots || { ranking: [], extendedRanking: [], values: {} };
  const dotsDecision = shouldFetchCricmetricDots(live, decision, currentMs, live.meta.lastRun.backlogProcessed);
  let dotsReport = {
    ok: false,
    source: 'Cricmetric bowling leaderboard',
    method: 'parsed Dots column from bowling table',
    reason: dotsDecision.reason
  };

  if (dotsDecision.fetch) {
    live.meta.cricmetricDots.lastAttemptAt = isoNow();
    try {
      dotsPayload = await fetchCricmetricDots(combinedAgg);
      live.meta.cricmetricDots.lastFetchedAt = isoNow();
      live.meta.cricmetricDots.lastSource = dotsPayload.source;
      live.meta.cricmetricDots.lastStatus = 'ok';
      live.meta.cricmetricDots.lastError = null;
      combinedAgg.bowlingDots = { ...(dotsPayload.values || {}) };
      dotsReport = {
        ok: true,
        source: dotsPayload.source,
        method: 'parsed Dots column from Cricmetric bowling leaderboard',
        rows: dotsPayload.extendedRanking.length
      };
    } catch (error) {
      live.meta.cricmetricDots.lastStatus = 'error';
      live.meta.cricmetricDots.lastError = error.message;
      dotsReport = {
        ok: false,
        source: 'Cricmetric bowling leaderboard',
        method: 'parsed Dots column from bowling table',
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

  fillDerivedOutputs(live, combinedAgg, dotsPayload);

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
    mvp: { ok: true, source: 'CricketData + Cricmetric', method: 'custom formula using runs, sixes, wickets, dot balls, catches, strike-rate bonus, economy bonus and milestone bonuses' },
    uncappedMvp: { ok: false, source: 'unsupported', error: 'Not computed yet from this source' },
    fairPlay: { ok: false, source: 'unsupported', error: 'Not computed yet from this source' },
    leastMvp: { ok: false, source: 'unsupported', error: 'Not computed yet from this source' },
    costControl: {
      ok: true,
      source: 'worker',
      method: 'cached completed matches forever, capped backlog catch-up, throttled live scorecards',
      liveScorecardsEnabled: LIVE_SCORECARD_ENABLED,
      liveScorecardIntervalMinutes: LIVE_SCORECARD_INTERVAL_MINUTES,
      maxBacklogScorecardsPerRun: MAX_BACKLOG_SCORECARDS_PER_RUN,
      scorecardCallsThisRun: live.meta.lastRun.scorecardCalls,
      backlogRemaining
    }
  };

  live.fetchedAt = isoNow();
  live.scrapeStatus = `ok (${live.meta.processedMatchIds.length} processed matches${activeMatch ? ', live match tracked' : ''}, ${live.meta.lastRun.scorecardCalls} scorecard call${live.meta.lastRun.scorecardCalls === 1 ? '' : 's'} this run${backlogRemaining ? `, ${backlogRemaining} backlog remaining` : ''})`;

  await fs.writeFile(DATA_FILE, JSON.stringify(live, null, 2), 'utf8');

  console.log(
    `Updated live.json. Series info calls: ${live.meta.lastRun.seriesInfoCalls}. Scorecard calls: ${live.meta.lastRun.scorecardCalls}. Backlog processed: ${live.meta.lastRun.backlogProcessed}. Backlog remaining: ${backlogRemaining}. Live overlay: ${live.meta.liveOverlay.source || 'none'}.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
