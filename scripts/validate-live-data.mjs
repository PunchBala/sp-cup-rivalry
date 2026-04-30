import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isIsoString(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function push(errors, pathLabel, message) {
  errors.push(`${pathLabel}: ${message}`);
}

function expectObject(errors, value, pathLabel, { nullable = false, optional = false } = {}) {
  if (value === undefined) {
    if (!optional) push(errors, pathLabel, 'is required');
    return false;
  }
  if (value === null) {
    if (!nullable) push(errors, pathLabel, 'must not be null');
    return nullable;
  }
  if (!isObject(value)) {
    push(errors, pathLabel, 'must be an object');
    return false;
  }
  return true;
}

function expectArrayOfStrings(errors, value, pathLabel, { optional = false } = {}) {
  if (value === undefined) {
    if (!optional) push(errors, pathLabel, 'is required');
    return false;
  }
  if (!Array.isArray(value)) {
    push(errors, pathLabel, 'must be an array');
    return false;
  }
  value.forEach((item, index) => {
    if (typeof item !== 'string') push(errors, `${pathLabel}[${index}]`, 'must be a string');
  });
  return true;
}

function expectString(errors, value, pathLabel, { nullable = false, optional = false, iso = false } = {}) {
  if (value === undefined) {
    if (!optional) push(errors, pathLabel, 'is required');
    return false;
  }
  if (value === null) {
    if (!nullable) push(errors, pathLabel, 'must not be null');
    return nullable;
  }
  if (typeof value !== 'string') {
    push(errors, pathLabel, 'must be a string');
    return false;
  }
  if (iso && !isIsoString(value)) push(errors, pathLabel, 'must be an ISO date string');
  return true;
}

function expectNumber(errors, value, pathLabel, { optional = false } = {}) {
  if (value === undefined) {
    if (!optional) push(errors, pathLabel, 'is required');
    return false;
  }
  if (typeof value !== 'number' || Number.isNaN(value)) {
    push(errors, pathLabel, 'must be a number');
    return false;
  }
  return true;
}

function expectBoolean(errors, value, pathLabel, { optional = false } = {}) {
  if (value === undefined) {
    if (!optional) push(errors, pathLabel, 'is required');
    return false;
  }
  if (typeof value !== 'boolean') {
    push(errors, pathLabel, 'must be a boolean');
    return false;
  }
  return true;
}

function expectRecord(errors, value, pathLabel, { optional = false, valueType = 'any' } = {}) {
  if (value === undefined) {
    if (!optional) push(errors, pathLabel, 'is required');
    return false;
  }
  if (!isObject(value)) {
    push(errors, pathLabel, 'must be an object');
    return false;
  }
  if (valueType === 'string') {
    for (const [k, v] of Object.entries(value)) {
      if (typeof v !== 'string') push(errors, `${pathLabel}.${k}`, 'must be a string');
    }
  } else if (valueType === 'number') {
    for (const [k, v] of Object.entries(value)) {
      if (typeof v !== 'number' || Number.isNaN(v)) push(errors, `${pathLabel}.${k}`, 'must be a number');
    }
  } else if (valueType === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (!isObject(v)) push(errors, `${pathLabel}.${k}`, 'must be an object');
    }
  }
  return true;
}

function validateStandings(errors, standings, pathLabel) {
  if (!expectRecord(errors, standings, pathLabel, { valueType: 'object' })) return;
  for (const [team, row] of Object.entries(standings)) {
    for (const field of ['played', 'wins', 'losses', 'points', 'runsFor', 'ballsFaced', 'runsAgainst', 'ballsBowled']) {
      expectNumber(errors, row[field], `${pathLabel}.${team}.${field}`);
    }
  }
}

function validateFigureMap(errors, figures, pathLabel) {
  if (!expectRecord(errors, figures, pathLabel, { valueType: 'object' })) return;
  for (const [player, row] of Object.entries(figures)) {
    expectNumber(errors, row.wickets, `${pathLabel}.${player}.wickets`);
    expectNumber(errors, row.runs, `${pathLabel}.${player}.runs`);
    expectNumber(errors, row.balls, `${pathLabel}.${player}.balls`);
  }
}

function validateRankedCategory(errors, category, pathLabel, opts = {}) {
  if (!expectObject(errors, category, pathLabel)) return;
  expectArrayOfStrings(errors, category.ranking, `${pathLabel}.ranking`);
  expectArrayOfStrings(errors, category.extendedRanking, `${pathLabel}.extendedRanking`, { optional: !!opts.extendedOptional });
  if (opts.values === 'number') expectRecord(errors, category.values, `${pathLabel}.values`, { optional: !!opts.valuesOptional, valueType: 'number' });
  if (opts.values === 'object') expectRecord(errors, category.values, `${pathLabel}.values`, { optional: !!opts.valuesOptional, valueType: 'object' });
  if (opts.figures) expectRecord(errors, category.figures, `${pathLabel}.figures`, { valueType: 'string' });
  if (opts.winner) expectString(errors, category.winner, `${pathLabel}.winner`, { nullable: true });
  if (opts.finalists) expectArrayOfStrings(errors, category.finalists, `${pathLabel}.finalists`);
  if (opts.playoffs) expectArrayOfStrings(errors, category.playoffs, `${pathLabel}.playoffs`);
}

function validateScrapeReportEntry(errors, entry, pathLabel, { allowFalse = false } = {}) {
  if (!expectObject(errors, entry, pathLabel)) return;
  expectBoolean(errors, entry.ok, `${pathLabel}.ok`);
  expectString(errors, entry.source, `${pathLabel}.source`);
  expectString(errors, entry.method, `${pathLabel}.method`);
  if (!allowFalse && entry.ok === false) {
    push(errors, `${pathLabel}.ok`, 'must be true');
  }
}

function validateScrapeReport(errors, scrapeReport, pathLabel) {
  if (!expectObject(errors, scrapeReport, pathLabel)) return;

  [
    'orangeCap',
    'mostSixes',
    'purpleCap',
    'highestScoreTeam',
    'striker',
    'bestBowlingFigures',
    'bestBowlingStrikeRate',
    'mostCatches',
    'titleWinner',
    'tableBottom',
    'mvp',
    'uncappedMvp',
    'fairPlay',
    'leastMvp'
  ].forEach((key) => validateScrapeReportEntry(errors, scrapeReport[key], `${pathLabel}.${key}`, { allowFalse: key === 'fairPlay' }));

  validateScrapeReportEntry(errors, scrapeReport.mostDots, `${pathLabel}.mostDots`, { allowFalse: true });
  if (expectObject(errors, scrapeReport.mostDots, `${pathLabel}.mostDots`)) {
    if (scrapeReport.mostDots.ok) {
      expectNumber(errors, scrapeReport.mostDots.rows, `${pathLabel}.mostDots.rows`);
    } else {
      expectString(errors, scrapeReport.mostDots.reason, `${pathLabel}.mostDots.reason`, { optional: true });
      expectString(errors, scrapeReport.mostDots.error, `${pathLabel}.mostDots.error`, { optional: true });
      expectString(errors, scrapeReport.mostDots.fallback, `${pathLabel}.mostDots.fallback`, { optional: true });
      expectNumber(errors, scrapeReport.mostDots.cachedRows, `${pathLabel}.mostDots.cachedRows`, { optional: true });
    }
  }

  validateScrapeReportEntry(errors, scrapeReport.costControl, `${pathLabel}.costControl`, { allowFalse: true });
  if (expectObject(errors, scrapeReport.costControl, `${pathLabel}.costControl`)) {
    expectBoolean(errors, scrapeReport.costControl.liveScorecardsEnabled, `${pathLabel}.costControl.liveScorecardsEnabled`, { optional: true });
    expectNumber(errors, scrapeReport.costControl.liveScorecardIntervalMinutes, `${pathLabel}.costControl.liveScorecardIntervalMinutes`, { optional: true });
    expectNumber(errors, scrapeReport.costControl.maxBacklogScorecardsPerRun, `${pathLabel}.costControl.maxBacklogScorecardsPerRun`, { optional: true });
    expectNumber(errors, scrapeReport.costControl.maxFreshScorecardCallsPerRun, `${pathLabel}.costControl.maxFreshScorecardCallsPerRun`, { optional: true });
    expectBoolean(errors, scrapeReport.costControl.historicalReplayApiFallbackAllowed, `${pathLabel}.costControl.historicalReplayApiFallbackAllowed`, { optional: true });
    expectNumber(errors, scrapeReport.costControl.scorecardCallsThisRun, `${pathLabel}.costControl.scorecardCallsThisRun`);
    expectNumber(errors, scrapeReport.costControl.backlogRemaining, `${pathLabel}.costControl.backlogRemaining`);
    expectBoolean(errors, scrapeReport.costControl.quotaExceeded, `${pathLabel}.costControl.quotaExceeded`, { optional: true });
    expectBoolean(errors, scrapeReport.costControl.providerFailure, `${pathLabel}.costControl.providerFailure`, { optional: true });
    expectString(errors, scrapeReport.costControl.reason, `${pathLabel}.costControl.reason`, { optional: true });
    expectNumber(errors, scrapeReport.costControl.hitsToday, `${pathLabel}.costControl.hitsToday`, { optional: true });
    expectNumber(errors, scrapeReport.costControl.hitsLimit, `${pathLabel}.costControl.hitsLimit`, { optional: true });
    expectNumber(errors, scrapeReport.costControl.scorecardCacheHitsThisRun, `${pathLabel}.costControl.scorecardCacheHitsThisRun`, { optional: true });
    expectArrayOfStrings(errors, scrapeReport.costControl.forcedScorecardRefetchIds, `${pathLabel}.costControl.forcedScorecardRefetchIds`, { optional: true });
    expectNumber(errors, scrapeReport.costControl.forcedScorecardRefetches, `${pathLabel}.costControl.forcedScorecardRefetches`, { optional: true });
    expectBoolean(errors, scrapeReport.costControl.historicalReplaySkipped, `${pathLabel}.costControl.historicalReplaySkipped`, { optional: true });
    expectNumber(errors, scrapeReport.costControl.historicalReplayMissingCaches, `${pathLabel}.costControl.historicalReplayMissingCaches`, { optional: true });
    expectBoolean(errors, scrapeReport.costControl.freshScorecardBudgetExhausted, `${pathLabel}.costControl.freshScorecardBudgetExhausted`, { optional: true });
    expectNumber(errors, scrapeReport.costControl.freshScorecardBudgetSkips, `${pathLabel}.costControl.freshScorecardBudgetSkips`, { optional: true });
    expectNumber(errors, scrapeReport.costControl.freshScorecardBudgetRemaining, `${pathLabel}.costControl.freshScorecardBudgetRemaining`, { optional: true });
    expectNumber(errors, scrapeReport.costControl.failoversThisRun, `${pathLabel}.costControl.failoversThisRun`, { optional: true });
  }
}

export function validateLiveData(data) {
  const errors = [];

  if (!expectObject(errors, data, 'live')) return errors;

  expectNumber(errors, data.season, 'live.season');
  expectString(errors, data.provider, 'live.provider');
  expectString(errors, data.source, 'live.source');
  expectString(errors, data.fetchedAt, 'live.fetchedAt', { nullable: true, iso: true });
  expectString(errors, data.scrapeStatus, 'live.scrapeStatus');
  validateScrapeReport(errors, data.scrapeReport, 'live.scrapeReport');

  if (expectObject(errors, data.meta, 'live.meta')) {
    if (expectObject(errors, data.meta.scheduler, 'live.meta.scheduler')) {
      expectString(errors, data.meta.scheduler.dayKey, 'live.meta.scheduler.dayKey');
      expectNumber(errors, data.meta.scheduler.quietRefreshesUsed, 'live.meta.scheduler.quietRefreshesUsed');
      expectString(errors, data.meta.scheduler.lastQuietRefreshAt, 'live.meta.scheduler.lastQuietRefreshAt', { nullable: true, iso: true });
      expectString(errors, data.meta.scheduler.lastLiveRefreshAt, 'live.meta.scheduler.lastLiveRefreshAt', { nullable: true, iso: true });
      expectString(errors, data.meta.scheduler.lastSeriesInfoAt, 'live.meta.scheduler.lastSeriesInfoAt', { nullable: true, iso: true });
      expectObject(errors, data.meta.scheduler.lastDecision, 'live.meta.scheduler.lastDecision', { nullable: true });
      expectString(errors, data.meta.scheduler.nextPlannedRefreshAt, 'live.meta.scheduler.nextPlannedRefreshAt', { nullable: true, iso: true });
      expectString(errors, data.meta.scheduler.nextPlannedMode, 'live.meta.scheduler.nextPlannedMode', { nullable: true });
      expectString(errors, data.meta.scheduler.nextPlannedReason, 'live.meta.scheduler.nextPlannedReason', { nullable: true });
      expectString(errors, data.meta.scheduler.nextPlannedCalculatedAt, 'live.meta.scheduler.nextPlannedCalculatedAt', { nullable: true, iso: true });
    }

    if (expectObject(errors, data.meta.cache, 'live.meta.cache')) {
      expectString(errors, data.meta.cache.seriesId, 'live.meta.cache.seriesId');
      if (Array.isArray(data.meta.cache.matchList)) {
        data.meta.cache.matchList.forEach((match, index) => {
          if (!expectObject(errors, match, `live.meta.cache.matchList[${index}]`)) return;
          expectString(errors, match.id, `live.meta.cache.matchList[${index}].id`);
          expectString(errors, match.name, `live.meta.cache.matchList[${index}].name`);
          expectString(errors, match.status, `live.meta.cache.matchList[${index}].status`);
          expectString(errors, match.dateTimeGMT, `live.meta.cache.matchList[${index}].dateTimeGMT`, { iso: true });
          expectArrayOfStrings(errors, match.teams, `live.meta.cache.matchList[${index}].teams`);
          expectBoolean(errors, match.matchStarted, `live.meta.cache.matchList[${index}].matchStarted`);
          expectBoolean(errors, match.matchEnded, `live.meta.cache.matchList[${index}].matchEnded`);
          expectString(errors, match.venue, `live.meta.cache.matchList[${index}].venue`, { nullable: true });
        });
      } else {
        push(errors, 'live.meta.cache.matchList', 'must be an array');
      }
    }

    if (data.meta.processedMatchIds !== undefined && !Array.isArray(data.meta.processedMatchIds)) {
      push(errors, 'live.meta.processedMatchIds', 'must be an array');
    }

    if (expectObject(errors, data.meta.aggregates, 'live.meta.aggregates')) {
      const agg = data.meta.aggregates;
      const numericMaps = [
        'battingRuns','battingBalls','battingSixes','bowlingWickets','bowlingBalls','bowlingRunsConceded',
        'catches','teamHighestScore','bowlingDots','battingFifties','battingHundreds','battingImpact30s',
        'bowling3w','bowling4w','bowling5w','playerMatches'
      ];
      numericMaps.forEach((key) => expectRecord(errors, agg[key], `live.meta.aggregates.${key}`, { valueType: 'number' }));
      validateStandings(errors, agg.standings, 'live.meta.aggregates.standings');
      validateFigureMap(errors, agg.bestBowlingFigures, 'live.meta.aggregates.bestBowlingFigures');
    }

    if (expectObject(errors, data.meta.liveOverlay, 'live.meta.liveOverlay')) {
      expectString(errors, data.meta.liveOverlay.matchId, 'live.meta.liveOverlay.matchId', { nullable: true });
      expectString(errors, data.meta.liveOverlay.generatedAt, 'live.meta.liveOverlay.generatedAt', { nullable: true, iso: true });
      if (data.meta.liveOverlay.aggregates !== null && data.meta.liveOverlay.aggregates !== undefined && !isObject(data.meta.liveOverlay.aggregates)) {
        push(errors, 'live.meta.liveOverlay.aggregates', 'must be an object or null');
      }
      expectString(errors, data.meta.liveOverlay.status, 'live.meta.liveOverlay.status', { nullable: true });
      expectString(errors, data.meta.liveOverlay.source, 'live.meta.liveOverlay.source', { nullable: true });
    }

    if (expectObject(errors, data.meta.scorecardBudget, 'live.meta.scorecardBudget')) {
      expectBoolean(errors, data.meta.scorecardBudget.liveEnabled, 'live.meta.scorecardBudget.liveEnabled');
      expectNumber(errors, data.meta.scorecardBudget.liveIntervalMinutes, 'live.meta.scorecardBudget.liveIntervalMinutes');
      expectNumber(errors, data.meta.scorecardBudget.maxBacklogPerRun, 'live.meta.scorecardBudget.maxBacklogPerRun');
      expectString(errors, data.meta.scorecardBudget.lastLiveScorecardAt, 'live.meta.scorecardBudget.lastLiveScorecardAt', { nullable: true, iso: true });
      expectString(errors, data.meta.scorecardBudget.lastLiveScorecardMatchId, 'live.meta.scorecardBudget.lastLiveScorecardMatchId', { nullable: true });
      expectString(errors, data.meta.scorecardBudget.lastBacklogProcessAt, 'live.meta.scorecardBudget.lastBacklogProcessAt', { nullable: true, iso: true });
    }

    if (expectObject(errors, data.meta.officialMostDots, 'live.meta.officialMostDots')) {
      expectBoolean(errors, data.meta.officialMostDots.enabled, 'live.meta.officialMostDots.enabled');
      expectNumber(errors, data.meta.officialMostDots.minRefreshMinutes, 'live.meta.officialMostDots.minRefreshMinutes');
      expectString(errors, data.meta.officialMostDots.lastFetchedAt, 'live.meta.officialMostDots.lastFetchedAt', { nullable: true, iso: true });
      expectString(errors, data.meta.officialMostDots.lastAttemptAt, 'live.meta.officialMostDots.lastAttemptAt', { nullable: true, iso: true });
      expectString(errors, data.meta.officialMostDots.lastSource, 'live.meta.officialMostDots.lastSource', { nullable: true });
      expectString(errors, data.meta.officialMostDots.lastStatus, 'live.meta.officialMostDots.lastStatus', { nullable: true });
      expectString(errors, data.meta.officialMostDots.lastError, 'live.meta.officialMostDots.lastError', { nullable: true });
    }

    if (expectObject(errors, data.meta.lastRun, 'live.meta.lastRun')) {
      ['seriesInfoCalls', 'scorecardCalls', 'backlogProcessed', 'backlogRemaining'].forEach((key) =>
        expectNumber(errors, data.meta.lastRun[key], `live.meta.lastRun.${key}`)
      );
      ['liveOverlayFetched', 'liveOverlayReused'].forEach((key) =>
        expectBoolean(errors, data.meta.lastRun[key], `live.meta.lastRun.${key}`)
      );
      expectString(errors, data.meta.lastRun.liveOverlaySkippedReason, 'live.meta.lastRun.liveOverlaySkippedReason', { nullable: true });
    }

    expectNumber(errors, data.meta.aggregateSchemaVersion, 'live.meta.aggregateSchemaVersion');
  }

  validateRankedCategory(errors, data.titleWinner, 'live.titleWinner', { winner: true, finalists: true, playoffs: true });
  validateRankedCategory(errors, data.orangeCap, 'live.orangeCap');
  validateRankedCategory(errors, data.mostSixes, 'live.mostSixes');
  validateRankedCategory(errors, data.purpleCap, 'live.purpleCap');
  validateRankedCategory(errors, data.mostDots, 'live.mostDots', { values: 'number' });
  validateRankedCategory(errors, data.mvp, 'live.mvp', { values: 'object' });
  validateRankedCategory(errors, data.uncappedMvp, 'live.uncappedMvp', { values: 'object', valuesOptional: true });
  validateRankedCategory(errors, data.fairPlay, 'live.fairPlay', { winner: true, values: 'object', valuesOptional: true });
  validateRankedCategory(errors, data.highestScoreTeam, 'live.highestScoreTeam', { values: 'number' });
  validateRankedCategory(errors, data.striker, 'live.striker');
  validateRankedCategory(errors, data.bestBowlingFigures, 'live.bestBowlingFigures', { figures: true });
  validateRankedCategory(errors, data.bestBowlingStrikeRate, 'live.bestBowlingStrikeRate', { values: 'number' });
  validateRankedCategory(errors, data.mostCatches, 'live.mostCatches', { values: 'number' });
  validateRankedCategory(errors, data.tableBottom, 'live.tableBottom');
  validateRankedCategory(errors, data.leastMvp, 'live.leastMvp', { values: 'object' });

  return errors;
}

export async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function main() {
  const target = process.argv[2]
    ? path.resolve(process.cwd(), process.argv[2])
    : path.resolve(__dirname, '../data/live.json');

  let data;
  try {
    data = await readJson(target);
  } catch (error) {
    console.error(`âŒ Could not read ${target}`);
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  const errors = validateLiveData(data);
  if (errors.length) {
    console.error(`âŒ Live data contract failed for ${target}`);
    errors.forEach((line) => console.error(`- ${line}`));
    process.exit(1);
  }

  console.log(`âœ… Live data contract passed for ${target}`);
}

const directRun = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (directRun) {
  main();
}
