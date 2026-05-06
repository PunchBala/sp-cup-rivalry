import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildCurrentProcessedMatchRefs,
  buildMiniFantasyPlayerHistoriesFromProcessedMatches,
  completedScorecardIntegrityIssues,
  endedUnprocessedMatches,
  findMissingProcessedScorecardRefs,
  inferProcessedMatchKeys,
  matchKeyForMatch,
  readCachedScorecard,
  rebuildHistoricalState,
  refreshDerivedOutputs,
  repairKnownLivePlayerAliasesDeep,
  writeCachedScorecard
} from './update-live-data.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_FILE = path.join(ROOT_DIR, 'data', 'live.json');
const SQUADS_FILE = path.join(ROOT_DIR, 'ipl_2026_squads.json');
const SCORECARD_CACHE_DIR = path.join(ROOT_DIR, 'data', 'scorecards');
const MANUAL_SCORECARD_DIR = path.join(ROOT_DIR, 'manual-scorecards');

const USAGE = `Usage:
  node scripts/backfill-official-scorecard.mjs --init --match 41 [--output manual-scorecards/match-41.json]
  node scripts/backfill-official-scorecard.mjs --input manual-scorecards/match-41.json
  node scripts/backfill-official-scorecard.mjs --input manual-scorecards/match-41.json --dry-run

Input schema:
  {
    "matchNo": 41,
    "matchId": "optional-provider-id",
    "status": "Sunrisers Hyderabad won by 6 wkts",
    "matchWinner": "Sunrisers Hyderabad",
    "tossWinner": "Mumbai Indians",
    "tossChoice": "bat",
    "innings": [
      {
        "team": "Mumbai Indians",
        "label": "Mumbai Indians Inning 1",
        "totalRuns": 243,
        "wickets": 5,
        "overs": "20",
        "extras": { "byes": 0, "legByes": 1, "wides": 7, "noBalls": 0, "penalties": 0 },
        "batting": [
          { "name": "Will Jacks", "dismissalText": "c Ishan Kishan b Nitish Kumar Reddy", "runs": 46, "balls": 22, "fours": 5, "sixes": 3, "strikeRate": 209.09 }
        ],
        "bowling": [
          { "name": "Pat Cummins", "overs": "4", "maidens": 0, "runs": 39, "wickets": 0, "noBalls": 0, "wides": 0, "economy": 9.75, "dots": 5 }
        ],
        "fielding": [
          { "name": "Ishan Kishan", "catches": 1, "stumpings": 0 }
        ]
      }
    ]
  }`;

function parseArgs(argv) {
  const options = {
    init: false,
    dryRun: false,
    match: null,
    input: null,
    output: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--init') {
      options.init = true;
      continue;
    }
    if (token === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (token === '--match') {
      options.match = argv[index + 1] || null;
      index += 1;
      continue;
    }
    if (token === '--input') {
      options.input = argv[index + 1] || null;
      index += 1;
      continue;
    }
    if (token === '--output') {
      options.output = argv[index + 1] || null;
      index += 1;
      continue;
    }
    if (token === '--help' || token === '-h') {
      console.log(USAGE);
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  return options;
}

function normalizeName(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeKey(value) {
  return normalizeName(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundTo(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round((Number(value || 0) + Number.EPSILON) * factor) / factor;
}

function oversToBalls(value) {
  if (value === null || value === undefined || value === '') return 0;
  const text = String(value).trim();
  const [whole, remainder] = text.split('.');
  return (Number(whole || 0) * 6) + Number(remainder || 0);
}

function buildTeamCodeByNameMap(squads) {
  const out = {};
  const fullNames = {
    CSK: 'Chennai Super Kings',
    DC: 'Delhi Capitals',
    GT: 'Gujarat Titans',
    KKR: 'Kolkata Knight Riders',
    LSG: 'Lucknow Super Giants',
    MI: 'Mumbai Indians',
    PBKS: 'Punjab Kings',
    RR: 'Rajasthan Royals',
    RCB: 'Royal Challengers Bengaluru',
    SRH: 'Sunrisers Hyderabad'
  };
  for (const [code] of Object.entries(squads || {})) {
    const fullName = fullNames[code];
    if (fullName) out[normalizeKey(fullName)] = code;
  }
  return out;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function loadLiveSnapshot() {
  return repairKnownLivePlayerAliasesDeep(await readJson(DATA_FILE));
}

async function loadTeamCodeMap() {
  return buildTeamCodeByNameMap(await readJson(SQUADS_FILE));
}

function findMatchRef(live, { matchNo = null, matchId = null } = {}) {
  const matchList = safeArray(live?.meta?.cache?.matchList);
  if (matchId) {
    const direct = matchList.find((match) => String(match?.id || '') === String(matchId));
    if (direct) return direct;
  }

  const numericMatchNo = Number(matchNo || 0);
  if (Number.isFinite(numericMatchNo) && numericMatchNo > 0) {
    const direct = matchList.find((match) => Number(match?.matchNo || 0) === numericMatchNo);
    if (direct) return direct;
  }

  return null;
}

function defaultOutputPath(matchRef) {
  const matchNo = Number(matchRef?.matchNo || 0);
  const fileName = matchNo ? `match-${matchNo}.official.json` : `${String(matchRef?.id || 'manual-scorecard')}.official.json`;
  return path.join(MANUAL_SCORECARD_DIR, fileName);
}

function scaffoldOfficialTemplate(matchRef) {
  const [teamA, teamB] = safeArray(matchRef?.teams);
  return {
    matchNo: Number(matchRef?.matchNo || 0) || null,
    matchId: String(matchRef?.id || ''),
    status: normalizeName(matchRef?.status || ''),
    matchWinner: '',
    tossWinner: '',
    tossChoice: '',
    innings: [
      {
        team: teamA || '',
        label: teamA ? `${teamA} Inning 1` : '',
        totalRuns: 0,
        wickets: 0,
        overs: '',
        extras: { byes: 0, legByes: 0, wides: 0, noBalls: 0, penalties: 0 },
        batting: [],
        bowling: [],
        fielding: []
      },
      {
        team: teamB || '',
        label: teamB ? `${teamB} Inning 1` : '',
        totalRuns: 0,
        wickets: 0,
        overs: '',
        extras: { byes: 0, legByes: 0, wides: 0, noBalls: 0, penalties: 0 },
        batting: [],
        bowling: [],
        fielding: []
      }
    ]
  };
}

function stripAnnotation(name) {
  return normalizeName(String(name || '').replace(/\((?:sub|wk|c|wk\/c|wk\(c\)|c\/wk|wk\/c)\)/gi, '').replace(/\(sub\)/gi, ''));
}

function inferDismissalEntities(dismissalText) {
  const text = normalizeName(dismissalText);
  const lower = text.toLowerCase();
  if (!text || lower === 'not out' || lower === 'batting') return {};

  const clean = (value) => stripAnnotation(value);
  const caughtAndBowled = text.match(/^c(?:&| and )b\s+(.+)$/i);
  if (caughtAndBowled) {
    const bowlerName = clean(caughtAndBowled[1]);
    return { dismissal: 'caught and bowled', bowlerName, catcherName: bowlerName, catches: 1, stumpings: 0 };
  }

  const stumped = text.match(/^st\s+(.+?)\s+b\s+(.+)$/i);
  if (stumped) {
    return {
      dismissal: 'stumped',
      catcherName: clean(stumped[1]),
      bowlerName: clean(stumped[2]),
      catches: 0,
      stumpings: 1
    };
  }

  const caught = text.match(/^c\s+(?:\(sub\)\s*)?(.+?)\s+b\s+(.+)$/i);
  if (caught) {
    return {
      dismissal: 'caught',
      catcherName: clean(caught[1]),
      bowlerName: clean(caught[2]),
      catches: 1,
      stumpings: 0
    };
  }

  const bowled = text.match(/^b\s+(.+)$/i);
  if (bowled) return { dismissal: 'bowled', bowlerName: clean(bowled[1]) };

  const lbw = text.match(/^lbw\s+b\s+(.+)$/i);
  if (lbw) return { dismissal: 'lbw', bowlerName: clean(lbw[1]) };

  const hitWicket = text.match(/^hit wicket b\s+(.+)$/i);
  if (hitWicket) return { dismissal: 'hit wicket', bowlerName: clean(hitWicket[1]) };

  const runOut = text.match(/^run out(?:\s*\((.+)\))?$/i);
  if (runOut) return { dismissal: 'run out', fielderText: clean(runOut[1] || '') };

  return {};
}

function mergeFieldingRows(derivedRows = [], manualRows = []) {
  const byName = new Map();
  const add = (name, catches = 0, stumpings = 0) => {
    const cleanName = stripAnnotation(name);
    if (!cleanName) return;
    const entry = byName.get(cleanName) || { catcher: { name: cleanName }, catch: 0, stumped: 0 };
    entry.catch += Number(catches || 0);
    entry.stumped += Number(stumpings || 0);
    byName.set(cleanName, entry);
  };

  safeArray(derivedRows).forEach((row) => add(row?.catcher?.name, row?.catch, row?.stumped));
  safeArray(manualRows).forEach((row) => add(row?.name || row?.player || row?.catcher, row?.catches, row?.stumpings));

  return [...byName.values()].filter((row) => Number(row.catch || 0) > 0 || Number(row.stumped || 0) > 0);
}

function convertOfficialBattingRow(row) {
  const dismissalText = normalizeName(row?.dismissalText || row?.dismissal || row?.['dismissal-text'] || '');
  const dismissal = inferDismissalEntities(dismissalText);
  const battingRow = {
    batsman: { name: normalizeName(row?.name) },
    'dismissal-text': dismissalText || 'not out',
    r: toNumber(row?.runs),
    b: toNumber(row?.balls),
    '4s': toNumber(row?.fours),
    '6s': toNumber(row?.sixes),
    sr: roundTo(toNumber(row?.strikeRate), 2)
  };
  if (dismissal.dismissal) battingRow.dismissal = dismissal.dismissal;
  if (dismissal.bowlerName) battingRow.bowler = { name: dismissal.bowlerName };
  if (dismissal.catcherName) battingRow.catcher = { name: dismissal.catcherName };
  return battingRow;
}

function convertOfficialBowlingRow(row) {
  return {
    bowler: { name: normalizeName(row?.name) },
    o: String(row?.overs ?? ''),
    m: toNumber(row?.maidens),
    r: toNumber(row?.runs),
    w: toNumber(row?.wickets),
    nb: toNumber(row?.noBalls),
    wd: toNumber(row?.wides),
    eco: roundTo(toNumber(row?.economy), 2),
    dots: toNumber(row?.dots)
  };
}

function buildCatchingRowsFromOfficialInnings(innings) {
  const derived = safeArray(innings?.batting).map((row) => {
    const dismissal = inferDismissalEntities(row?.dismissalText || row?.dismissal || row?.['dismissal-text']);
    if (!dismissal.catcherName && !dismissal.stumpings) return null;
    return {
      catcher: { name: dismissal.catcherName },
      catch: Number(dismissal.catches || 0),
      stumped: Number(dismissal.stumpings || 0)
    };
  }).filter(Boolean);

  return mergeFieldingRows(derived, innings?.fielding);
}

function inningsExtrasObject(extras = {}) {
  return {
    b: toNumber(extras?.byes),
    lb: toNumber(extras?.legByes),
    w: toNumber(extras?.wides),
    nb: toNumber(extras?.noBalls),
    p: toNumber(extras?.penalties)
  };
}

function inningsExtrasRuns(extras = {}) {
  return Object.values(inningsExtrasObject(extras)).reduce((sum, value) => sum + Number(value || 0), 0);
}

function validateOfficialInnings(innings, expectedTeams = []) {
  const errors = [];
  const team = normalizeName(innings?.team);
  if (!team) errors.push('team is required');
  if (team && expectedTeams.length && !expectedTeams.includes(team)) {
    errors.push(`team "${team}" is not one of ${expectedTeams.join(', ')}`);
  }

  const batting = safeArray(innings?.batting);
  const bowling = safeArray(innings?.bowling);
  const totalRuns = toNumber(innings?.totalRuns, NaN);
  const wickets = toNumber(innings?.wickets, NaN);
  const overs = String(innings?.overs ?? '').trim();
  if (!Number.isFinite(totalRuns)) errors.push('totalRuns is required');
  if (!Number.isFinite(wickets)) errors.push('wickets is required');
  if (!overs) errors.push('overs is required');

  const battingRuns = batting.reduce((sum, row) => sum + toNumber(row?.runs), 0);
  const extrasRuns = inningsExtrasRuns(innings?.extras);
  const bowlingRuns = bowling.reduce((sum, row) => sum + toNumber(row?.runs), 0);
  const byesAndLegByesAndPenalties = toNumber(innings?.extras?.byes) + toNumber(innings?.extras?.legByes) + toNumber(innings?.extras?.penalties);
  const dismissedBatters = batting.filter((row) => normalizeName(row?.dismissalText || row?.dismissal).toLowerCase() !== 'not out').length;

  if (Number.isFinite(totalRuns) && battingRuns + extrasRuns !== totalRuns) {
    errors.push(`batting runs ${battingRuns} + extras ${extrasRuns} does not equal totalRuns ${totalRuns}`);
  }
  if (Number.isFinite(totalRuns) && bowlingRuns + byesAndLegByesAndPenalties !== totalRuns) {
    errors.push(`bowling runs ${bowlingRuns} + byes/leg-byes/penalties ${byesAndLegByesAndPenalties} does not equal totalRuns ${totalRuns}`);
  }
  if (Number.isFinite(wickets) && dismissedBatters !== wickets) {
    errors.push(`dismissed batter count ${dismissedBatters} does not equal wickets ${wickets}`);
  }

  for (const row of batting) {
    if (!normalizeName(row?.name)) errors.push(`batting row is missing name in ${team}`);
  }
  for (const row of bowling) {
    if (!normalizeName(row?.name)) errors.push(`bowling row is missing name in ${team}`);
  }

  return errors;
}

export function convertOfficialScorecardInputToProviderShape(manualInput, matchRef, { teamCodeByName = {}, seriesId = null } = {}) {
  const matchWinner = normalizeName(manualInput?.matchWinner);
  const status = normalizeName(manualInput?.status || matchRef?.status || '');
  const teams = safeArray(matchRef?.teams).map(normalizeName).filter(Boolean);
  const innings = safeArray(manualInput?.innings);
  if (innings.length !== 2) {
    throw new Error(`Expected exactly 2 innings in official scorecard input, received ${innings.length}`);
  }

  const validationErrors = innings.flatMap((entry, index) => validateOfficialInnings(entry, teams).map((error) => `Innings ${index + 1}: ${error}`));
  if (validationErrors.length) {
    throw new Error(`Official scorecard validation failed:\n- ${validationErrors.join('\n- ')}`);
  }

  const providerInnings = innings.map((entry, index) => {
    const label = normalizeName(entry?.label || `${normalizeName(entry?.team)} Inning ${index + 1}`);
    return {
      inning: label,
      totals: {
        r: toNumber(entry?.totalRuns),
        w: toNumber(entry?.wickets),
        o: String(entry?.overs ?? '')
      },
      batting: safeArray(entry?.batting).map(convertOfficialBattingRow),
      bowling: safeArray(entry?.bowling).map(convertOfficialBowlingRow),
      catching: buildCatchingRowsFromOfficialInnings(entry),
      extras: inningsExtrasObject(entry?.extras)
    };
  });

  const providerScore = providerInnings.map((entry) => ({
    inning: entry.inning,
    r: toNumber(entry?.totals?.r),
    w: toNumber(entry?.totals?.w),
    o: String(entry?.totals?.o ?? '')
  }));

  const providerScorecard = {
    id: String(manualInput?.matchId || matchRef?.id || ''),
    name: normalizeName(matchRef?.name || manualInput?.name || ''),
    matchType: 't20',
    status,
    venue: normalizeName(matchRef?.venue || manualInput?.venue || ''),
    date: String(matchRef?.dateTimeGMT || manualInput?.dateTimeGMT || '').slice(0, 10),
    dateTimeGMT: String(matchRef?.dateTimeGMT || manualInput?.dateTimeGMT || ''),
    teams,
    teamInfo: teams.map((team) => ({
      name: team,
      shortname: teamCodeByName[normalizeKey(team)] || ''
    })),
    score: providerScore,
    tossWinner: normalizeName(manualInput?.tossWinner || ''),
    tossChoice: normalizeName(manualInput?.tossChoice || '').toLowerCase(),
    matchWinner,
    matchStarted: true,
    matchEnded: true,
    series_id: seriesId || undefined,
    scorecard: providerInnings
  };

  const integrityIssues = completedScorecardIntegrityIssues(providerScorecard);
  if (integrityIssues.length) {
    throw new Error(`Converted scorecard failed cache integrity checks:\n- ${integrityIssues.join('\n- ')}`);
  }

  return providerScorecard;
}

export function markManualBackfillMatchRefEnded(matchRef, providerScorecard) {
  if (!matchRef || typeof matchRef !== 'object') return matchRef;
  matchRef.matchStarted = true;
  matchRef.matchEnded = true;
  const status = normalizeName(providerScorecard?.status);
  if (status) matchRef.status = status;
  return matchRef;
}

function buildMostDotsPayload(values = {}, source = 'Manual official scorecard backfill') {
  const normalizedValues = Object.fromEntries(
    Object.entries(values || {})
      .map(([name, value]) => [normalizeName(name), Number(value || 0)])
      .filter(([name, value]) => name && Number.isFinite(value) && value > 0)
  );
  const extendedRanking = Object.entries(normalizedValues)
    .sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0) || a[0].localeCompare(b[0]))
    .map(([name]) => name);
  return {
    ranking: extendedRanking.slice(0, 10),
    extendedRanking,
    values: normalizedValues,
    source
  };
}

async function writeOfficialTemplate(matchRef, outputPath) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const template = scaffoldOfficialTemplate(matchRef);
  await fs.writeFile(outputPath, `${JSON.stringify(template, null, 2)}\n`, 'utf8');
  return outputPath;
}

async function updateLiveFromManualCache(live, { inputPath = null } = {}) {
  const matchList = safeArray(live?.meta?.cache?.matchList);
  const processedKeys = inferProcessedMatchKeys(live, matchList);
  const currentProcessedRefs = buildCurrentProcessedMatchRefs(live, matchList);
  const currentProcessedIds = currentProcessedRefs.map((ref) => ref?.id).filter(Boolean);
  const endedBacklog = endedUnprocessedMatches(matchList, currentProcessedIds, processedKeys);

  const cacheReadyBacklog = [];
  for (const match of endedBacklog) {
    const cached = await readCachedScorecard(match?.id, { cacheDir: SCORECARD_CACHE_DIR });
    if (!cached) break;
    cacheReadyBacklog.push(match);
  }

  const replayRefs = [...currentProcessedRefs, ...cacheReadyBacklog];
  const replayIds = replayRefs.map((ref) => ref?.id).filter(Boolean);
  const rebuilt = await rebuildHistoricalState(
    replayIds,
    live,
    {
      includeHistory: true,
      loadScorecard: async (matchId) => {
        const cached = await readCachedScorecard(matchId, { cacheDir: SCORECARD_CACHE_DIR });
        if (!cached) throw new Error(`Missing cached scorecard for ${matchId}`);
        return { source: 'cache', data: cached };
      }
    }
  );

  live.meta.processedMatchIds = replayIds;
  live.meta.processedMatchKeys = replayRefs.map((ref) => ref?.matchKey || matchKeyForMatch(ref)).filter(Boolean);
  live.meta.aggregates = rebuilt.aggregates;
  live.meta.scoreHistory = rebuilt.scoreHistory;
  live.meta.miniFantasyPlayerHistories = await buildMiniFantasyPlayerHistoriesFromProcessedMatches(
    replayRefs,
    live,
    {
      loadScorecard: async (matchId) => {
        const cached = await readCachedScorecard(matchId, { cacheDir: SCORECARD_CACHE_DIR });
        if (!cached) throw new Error(`Missing cached scorecard for ${matchId}`);
        return { source: 'cache', data: cached };
      }
    }
  );

  live.mostDots = buildMostDotsPayload(live.meta.aggregates.bowlingDots, 'Manual official scorecard backfill');
  refreshDerivedOutputs(live);

  const missingProcessedRefs = await findMissingProcessedScorecardRefs(replayRefs, { cacheDir: SCORECARD_CACHE_DIR });
  const remainingBacklog = endedUnprocessedMatches(matchList, replayIds, live.meta.processedMatchKeys);
  const deferredIds = new Set([
    ...safeArray(live?.meta?.lastRun?.deferredScorecardMatchIds).map((value) => String(value || '').trim()).filter(Boolean),
    ...missingProcessedRefs.map((ref) => String(ref?.id || '').trim()).filter(Boolean)
  ]);
  replayIds.forEach((matchId) => deferredIds.delete(String(matchId)));

  live.meta.lastRun = {
    ...(live.meta.lastRun || {}),
    scorecardCalls: 0,
    scorecardCacheHits: replayIds.length,
    backlogProcessed: cacheReadyBacklog.length,
    backlogRemaining: remainingBacklog.length + missingProcessedRefs.length,
    missingProcessedScorecards: missingProcessedRefs.length,
    missingProcessedScorecardMatchIds: missingProcessedRefs.map((ref) => ref?.id).filter(Boolean),
    missingProcessedScorecardReason: missingProcessedRefs.length ? 'manual backfill run left processed matches without cached scorecards' : null,
    deferredScorecardMatchIds: [...deferredIds],
    deferredScorecardReason: deferredIds.size ? 'manual backfill run still has unresolved scorecard backlog' : null,
    manualOfficialBackfill: {
      at: new Date().toISOString(),
      inputPath: inputPath ? path.relative(ROOT_DIR, inputPath) : null,
      replayedMatches: replayIds.length
    }
  };

  if (live.scrapeReport?.costControl && typeof live.scrapeReport.costControl === 'object') {
    live.scrapeReport.costControl.backlogRemaining = live.meta.lastRun.backlogRemaining;
  }

  live.fetchedAt = new Date().toISOString();
  live.scrapeStatus = `ok (${live.meta.processedMatchIds.length} processed matches, manual official scorecard backfill applied${live.meta.lastRun.backlogRemaining ? `, ${live.meta.lastRun.backlogRemaining} backlog remaining` : ''})`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.init) {
    if (!options.match) throw new Error('--match is required with --init');
    const live = await loadLiveSnapshot();
    const matchRef = findMatchRef(live, { matchNo: options.match, matchId: options.match });
    if (!matchRef) throw new Error(`Could not find match ${options.match} in data/live.json cache`);
    const outputPath = path.resolve(ROOT_DIR, options.output || defaultOutputPath(matchRef));
    await writeOfficialTemplate(matchRef, outputPath);
    console.log(`Wrote manual official scorecard template: ${path.relative(ROOT_DIR, outputPath)}`);
    return;
  }

  if (!options.input) {
    console.log(USAGE);
    throw new Error('--input is required unless using --init');
  }

  const inputPath = path.resolve(ROOT_DIR, options.input);
  const live = await loadLiveSnapshot();
  const teamCodeByName = await loadTeamCodeMap();
  const manualInput = await readJson(inputPath);
  const matchRef = findMatchRef(live, { matchNo: manualInput?.matchNo, matchId: manualInput?.matchId });
  if (!matchRef) {
    throw new Error(`Could not resolve match ${manualInput?.matchNo || manualInput?.matchId || '(unknown)'} from current live match cache`);
  }

  const providerScorecard = convertOfficialScorecardInputToProviderShape(
    manualInput,
    matchRef,
    {
      teamCodeByName,
      seriesId: live?.meta?.cache?.seriesId || null
    }
  );

  if (options.dryRun) {
    console.log(JSON.stringify({
      ok: true,
      mode: 'dry-run',
      matchId: providerScorecard.id,
      matchNo: Number(matchRef?.matchNo || 0) || null,
      teams: providerScorecard.teams,
      status: providerScorecard.status,
      score: providerScorecard.score,
      cachedFile: path.relative(ROOT_DIR, path.join(SCORECARD_CACHE_DIR, `${providerScorecard.id}.json`))
    }, null, 2));
    return;
  }

  markManualBackfillMatchRefEnded(matchRef, providerScorecard);
  await writeCachedScorecard(providerScorecard.id, providerScorecard, { cacheDir: SCORECARD_CACHE_DIR });
  await updateLiveFromManualCache(live, { inputPath });
  await fs.writeFile(DATA_FILE, `${JSON.stringify(live, null, 2)}\n`, 'utf8');

  console.log(JSON.stringify({
    ok: true,
    mode: 'apply',
    matchId: providerScorecard.id,
    matchNo: Number(matchRef?.matchNo || 0) || null,
    cachedFile: path.relative(ROOT_DIR, path.join(SCORECARD_CACHE_DIR, `${providerScorecard.id}.json`)),
    processedMatches: live?.meta?.processedMatchIds?.length || 0,
    backlogRemaining: live?.meta?.lastRun?.backlogRemaining || 0,
    nextAction: 'Commit data/live.json and the new data/scorecards/<match-id>.json, then republish the Mini Fantasy leaderboard snapshot if needed.'
  }, null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error?.message || error);
    process.exitCode = 1;
  });
}
