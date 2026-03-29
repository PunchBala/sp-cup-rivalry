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

function isoNow() { return new Date().toISOString(); }
function nowMs() { return Date.now(); }
function safeArray(v) { return Array.isArray(v) ? v : []; }
function normalizeName(name) { return String(name || '').replace(/\s+/g, ' ').trim(); }

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
      aggregates: {
        battingRuns: {}, battingBalls: {}, battingSixes: {},
        bowlingWickets: {}, bowlingBalls: {}, catches: {},
        teamHighestScore: {}, standings: {}, bestBowlingFigures: {}
      },
      liveOverlay: { matchId: null, generatedAt: null, aggregates: null }
    },
    titleWinner: { winner: null, finalists: [], playoffs: [], ranking: [], extendedRanking: [] },
    orangeCap: { ranking: [], extendedRanking: [] },
    mostSixes: { ranking: [], extendedRanking: [] },
    purpleCap: { ranking: [], extendedRanking: [] },
    mostDots: { ranking: [], extendedRanking: [] },
    mvp: { ranking: [], extendedRanking: [] },
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

async function ensureDataDir() { await fs.mkdir(DATA_DIR, { recursive: true }); }

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
        liveOverlay: { ...fresh.meta.liveOverlay, ...(parsed.meta?.liveOverlay || {}) }
      }
    };
  } catch {
    return createEmptyLive();
  }
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { accept: 'application/json', 'user-agent': 'sp-cup-rivalry/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const json = await res.json();
  if (json.status && json.status !== 'success') throw new Error(`API error: ${JSON.stringify(json)}`);
  return json;
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
  if (!map[team]) map[team] = { played: 0, wins: 0, losses: 0, points: 0, runsFor: 0, ballsFaced: 0, runsAgainst: 0, ballsBowled: 0 };
  return map[team];
}

function addNumberMap(map, key, amount) {
  if (!key) return;
  map[key] = (map[key] || 0) + Number(amount || 0);
}

function updateBestBowlingFigure(bestMap, bowler, wickets, runs, balls) {
  if (!bowler) return;
  const cand = { wickets: Number(wickets || 0), runs: Number(runs || 0), balls: Number(balls || 0) };
  const ex = bestMap[bowler];
  if (!ex || cand.wickets > ex.wickets || (cand.wickets === ex.wickets && cand.runs < ex.runs) || (cand.wickets === ex.wickets && cand.runs === ex.runs && cand.balls < ex.balls)) {
    bestMap[bowler] = cand;
  }
}

function parseTeamFromInningName(inningName) {
  const raw = String(inningName || '');
  const idx = raw.toLowerCase().indexOf(' inning');
  return normalizeName(idx >= 0 ? raw.slice(0, idx) : raw);
}

function applyScorecardToAggregates(aggregates, scorecardData) {
  const inningsBlocks = safeArray(scorecardData.scorecard);
  const topScores = safeArray(scorecardData.score);

  for (const innings of inningsBlocks) {
    for (const bat of safeArray(innings.batting)) {
      const batter = normalizeName(bat?.batsman?.name);
      addNumberMap(aggregates.battingRuns, batter, bat?.r || 0);
      addNumberMap(aggregates.battingBalls, batter, bat?.b || 0);
      addNumberMap(aggregates.battingSixes, batter, bat?.['6s'] || 0);
    }
    for (const bowl of safeArray(innings.bowling)) {
      const bowler = normalizeName(bowl?.bowler?.name);
      const balls = oversToBalls(bowl?.o);
      addNumberMap(aggregates.bowlingWickets, bowler, bowl?.w || 0);
      addNumberMap(aggregates.bowlingBalls, bowler, balls);
      updateBestBowlingFigure(aggregates.bestBowlingFigures, bowler, bowl?.w || 0, bowl?.r || 0, balls);
    }
    for (const field of safeArray(innings.catching)) {
      const catcher = normalizeName(field?.catcher?.name);
      if (catcher) addNumberMap(aggregates.catches, catcher, field?.catch || 0);
    }
  }

  for (const scoreLine of topScores) {
    const team = parseTeamFromInningName(scoreLine?.inning);
    if (team) aggregates.teamHighestScore[team] = Math.max(Number(aggregates.teamHighestScore[team] || 0), Number(scoreLine?.r || 0));
  }

  const teams = safeArray(scorecardData.teams).map(normalizeName);
  if (teams.length === 2 && topScores.length >= 2) {
    const [teamA, teamB] = teams;
    const standingA = ensureStandingTeam(aggregates.standings, teamA);
    const standingB = ensureStandingTeam(aggregates.standings, teamB);
    standingA.played += 1; standingB.played += 1;
    const inningMap = {};
    for (const s of topScores) inningMap[parseTeamFromInningName(s?.inning)] = s;
    const sa = inningMap[teamA], sb = inningMap[teamB];
    if (sa && sb) {
      const ballsA = allOutUsesFullQuota(sa.w, oversToBalls(sa.o));
      const ballsB = allOutUsesFullQuota(sb.w, oversToBalls(sb.o));
      standingA.runsFor += Number(sa.r || 0); standingA.ballsFaced += ballsA; standingA.runsAgainst += Number(sb.r || 0); standingA.ballsBowled += ballsB;
      standingB.runsFor += Number(sb.r || 0); standingB.ballsFaced += ballsB; standingB.runsAgainst += Number(sa.r || 0); standingB.ballsBowled += ballsA;
    }
    const winner = normalizeName(scorecardData.matchWinner);
    if (winner === teamA) { standingA.wins += 1; standingA.points += 2; standingB.losses += 1; }
    else if (winner === teamB) { standingB.wins += 1; standingB.points += 2; standingA.losses += 1; }
  }
}

function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

function combineAggregates(baseAgg, overlayAgg) {
  const out = clone(baseAgg);
  if (!overlayAgg) return out;
  for (const key of ['battingRuns', 'battingBalls', 'battingSixes', 'bowlingWickets', 'bowlingBalls', 'catches']) {
    for (const [name, value] of Object.entries(overlayAgg[key] || {})) {
      out[key][name] = (out[key][name] || 0) + Number(value || 0);
    }
  }
  for (const [team, value] of Object.entries(overlayAgg.teamHighestScore || {})) out.teamHighestScore[team] = Math.max(out.teamHighestScore[team] || 0, value);
  for (const [bowler, fig] of Object.entries(overlayAgg.bestBowlingFigures || {})) updateBestBowlingFigure(out.bestBowlingFigures, bowler, fig.wickets, fig.runs, fig.balls);
  for (const [team, standing] of Object.entries(overlayAgg.standings || {})) {
    const target = ensureStandingTeam(out.standings, team);
    for (const [k, v] of Object.entries(standing)) target[k] = (target[k] || 0) + Number(v || 0);
  }
  return out;
}

function sortByValueDesc(mapObj) {
  return Object.entries(mapObj || {}).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name]) => name);
}

function buildStrikerRanking(agg) {
  const rows = [];
  for (const [player, totalRuns] of Object.entries(agg.battingRuns || {})) {
    const totalBalls = Number(agg.battingBalls[player] || 0);
    if (totalRuns >= STRIKER_MIN_RUNS && totalBalls > 0) rows.push([player, (100 * totalRuns) / totalBalls]);
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
  return { ranking: rows.map(([bowler]) => bowler), values: Object.fromEntries(rows.map(([bowler, sr]) => [bowler, Number(sr.toFixed(2))])) };
}

function buildBestFiguresRanking(agg) {
  const rows = Object.entries(agg.bestBowlingFigures || {}).map(([bowler, fig]) => [bowler, fig]);
  rows.sort((a, b) => b[1].wickets - a[1].wickets || a[1].runs - b[1].runs || a[1].balls - b[1].balls || a[0].localeCompare(b[0]));
  return { ranking: rows.map(([bowler]) => bowler), figures: Object.fromEntries(rows.map(([bowler, fig]) => [bowler, `${fig.wickets}/${fig.runs}`])) };
}

function standingNrr(s) {
  const oversFor = (s.ballsFaced || 0) / 6;
  const oversAgainst = (s.ballsBowled || 0) / 6;
  if (oversFor <= 0 || oversAgainst <= 0) return 0;
  return Number((((s.runsFor / oversFor) - (s.runsAgainst / oversAgainst))).toFixed(3));
}

function buildStandingsRanking(agg) {
  return Object.entries(agg.standings || {}).map(([team, s]) => [team, s, standingNrr(s)]).sort((a, b) => b[1].points - a[1].points || b[2] - a[2] || a[0].localeCompare(b[0])).map(([team]) => team);
}

function fillDerivedOutputs(live, agg) {
  const orange = sortByValueDesc(agg.battingRuns);
  const sixes = sortByValueDesc(agg.battingSixes);
  const wickets = sortByValueDesc(agg.bowlingWickets);
  const catches = sortByValueDesc(agg.catches);
  const teamHighest = Object.entries(agg.teamHighestScore || {}).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([team]) => team);
  const bestFigures = buildBestFiguresRanking(agg);
  const bowlSr = buildBowlingStrikeRateRanking(agg);
  const standings = buildStandingsRanking(agg);
  const striker = buildStrikerRanking(agg);

  live.orangeCap = { ranking: orange.slice(0, 10), extendedRanking: orange };
  live.mostSixes = { ranking: sixes.slice(0, 10), extendedRanking: sixes };
  live.purpleCap = { ranking: wickets.slice(0, 10), extendedRanking: wickets };
  live.highestScoreTeam = { ranking: teamHighest, extendedRanking: teamHighest, values: agg.teamHighestScore || {} };
  live.striker = { ranking: striker.slice(0, 10), extendedRanking: striker };
  live.bestBowlingFigures = { ranking: bestFigures.ranking.slice(0, 10), extendedRanking: bestFigures.ranking, figures: bestFigures.figures };
  live.bestBowlingStrikeRate = { ranking: bowlSr.ranking.slice(0, 10), extendedRanking: bowlSr.ranking, values: bowlSr.values };
  live.mostCatches = { ranking: catches.slice(0, 10), extendedRanking: catches, values: agg.catches || {} };
  live.titleWinner = { winner: standings[0] || null, finalists: standings.slice(0, 2), playoffs: standings.slice(0, 4), ranking: standings.slice(0, 10), extendedRanking: standings };
  live.tableBottom = { ranking: standings.slice(0, 10), extendedRanking: standings };
  live.mostDots = { ranking: [], extendedRanking: [] };
  live.mvp = { ranking: [], extendedRanking: [] };
  live.uncappedMvp = { ranking: [], extendedRanking: [] };
  live.fairPlay = { ranking: [], extendedRanking: [] };
  live.leastMvp = { ranking: [], extendedRanking: [] };
}

function endedUnprocessedMatches(matchList, processedIds) {
  const set = new Set(processedIds || []);
  return safeArray(matchList).filter((m) => m.matchEnded && !set.has(m.id));
}

function liveMatchCandidate(matchList) {
  return safeArray(matchList).find((m) => m.matchStarted && !m.matchEnded) || null;
}

async function processScorecard(matchId) {
  const json = await fetchJson(SCORECARD_URL(matchId));
  return json.data;
}

async function main() {
  if (!API_KEY) throw new Error('Missing CRICKETDATA_API_KEY environment variable');
  await ensureDataDir();
  const live = await readExistingLive();
  resetDailySchedulerIfNeeded(live);

  const decision = decideRefreshMode(live, nowMs());
  live.meta.scheduler.lastDecision = { at: isoNow(), ...decision };
  if (!decision.shouldRefresh) {
    console.log(`Skip: ${decision.reason}`);
    return;
  }

  const seriesJson = await fetchJson(SERIES_INFO_URL);
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
  const finalizedAgg = live.meta.aggregates || createEmptyLive().meta.aggregates;

  const endedBacklog = endedUnprocessedMatches(matchList, live.meta.processedMatchIds);
  const activeMatch = liveMatchCandidate(matchList);

  for (const match of endedBacklog) {
    const scorecard = await processScorecard(match.id);
    applyScorecardToAggregates(finalizedAgg, scorecard);
    processedIds.add(match.id);
  }

  let overlayAgg = null;
  if (activeMatch && !processedIds.has(activeMatch.id)) {
    const scorecard = await processScorecard(activeMatch.id);
    overlayAgg = createEmptyLive().meta.aggregates;
    applyScorecardToAggregates(overlayAgg, scorecard);
    live.meta.liveOverlay = { matchId: activeMatch.id, generatedAt: isoNow(), aggregates: overlayAgg };
  } else {
    live.meta.liveOverlay = { matchId: null, generatedAt: isoNow(), aggregates: null };
  }

  live.meta.processedMatchIds = [...processedIds];
  live.meta.aggregates = finalizedAgg;
  const combinedAgg = combineAggregates(finalizedAgg, overlayAgg);
  fillDerivedOutputs(live, combinedAgg);

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
    mostDots: { ok: false, source: 'unsupported', error: 'Not computed yet from this source' },
    mvp: { ok: false, source: 'unsupported', error: 'Not computed yet from this source' },
    uncappedMvp: { ok: false, source: 'unsupported', error: 'Not computed yet from this source' },
    fairPlay: { ok: false, source: 'unsupported', error: 'Not computed yet from this source' },
    leastMvp: { ok: false, source: 'unsupported', error: 'Not computed yet from this source' }
  };

  live.fetchedAt = isoNow();
  live.scrapeStatus = `ok (${live.meta.processedMatchIds.length} processed matches${activeMatch ? ', live overlay active' : ''})`;

  await fs.writeFile(DATA_FILE, JSON.stringify(live, null, 2), 'utf8');
  console.log(`Updated live.json using CricketData. Processed matches: ${live.meta.processedMatchIds.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
