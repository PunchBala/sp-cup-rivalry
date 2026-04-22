import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const DEFAULT_MATCH_ID = 'e4f4995f-036e-451d-861e-42567c82d87f';

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function canonicalName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function rowPlayerName(row, keys) {
  for (const key of keys) {
    const value = row?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (value?.name) return String(value.name).trim();
  }
  return '';
}

function battingRows(innings) {
  return safeArray(innings?.batting || innings?.batsman);
}

function bowlingRows(innings) {
  return safeArray(innings?.bowling || innings?.bowler);
}

export function summarizeScorecardApiResponse(scorecard) {
  const innings = safeArray(scorecard?.scorecard).map((inning) => {
    const batting = battingRows(inning).map((row) => ({
      name: rowPlayerName(row, ['batsman', 'batter', 'name']),
      runs: numberOrNull(row.r ?? row.runs),
      balls: numberOrNull(row.b ?? row.balls),
      fours: numberOrNull(row['4s'] ?? row.fours),
      sixes: numberOrNull(row['6s'] ?? row.sixes),
      strikeRate: numberOrNull(row.sr ?? row.strikeRate)
    }));
    const bowling = bowlingRows(inning).map((row) => ({
      name: rowPlayerName(row, ['bowler', 'name']),
      overs: row.o ?? row.overs ?? null,
      runs: numberOrNull(row.r ?? row.runs),
      wickets: numberOrNull(row.w ?? row.wickets),
      dots: numberOrNull(row.dots ?? row.d)
    }));

    return {
      inning: inning?.inning || inning?.name || '',
      batters: batting.length,
      bowlers: bowling.length,
      batting,
      bowling
    };
  });

  return {
    id: scorecard?.id || null,
    name: scorecard?.name || '',
    status: scorecard?.status || '',
    matchStarted: Boolean(scorecard?.matchStarted),
    matchEnded: Boolean(scorecard?.matchEnded),
    matchWinner: scorecard?.matchWinner || '',
    score: safeArray(scorecard?.score).map((entry) => ({
      inning: entry?.inning || '',
      runs: numberOrNull(entry?.r ?? entry?.runs),
      wickets: numberOrNull(entry?.w ?? entry?.wickets),
      overs: entry?.o ?? entry?.overs ?? null
    })),
    innings
  };
}

export function evaluateScorecardSummary(summary, {
  expectedInnings = null,
  expectedPlayer = '',
  expectedRuns = null
} = {}) {
  const issues = [];
  const expectedInningsCount = numberOrNull(expectedInnings);
  const expectedRunsCount = numberOrNull(expectedRuns);

  if (expectedInningsCount !== null && summary.innings.length < expectedInningsCount) {
    issues.push(`expected at least ${expectedInningsCount} scorecard innings, got ${summary.innings.length}`);
  }

  let expectedPlayerRow = null;
  if (expectedPlayer) {
    const expectedKey = canonicalName(expectedPlayer);
    for (const inning of summary.innings) {
      expectedPlayerRow = inning.batting.find((row) => canonicalName(row.name) === expectedKey);
      if (expectedPlayerRow) break;
    }
    if (!expectedPlayerRow) {
      issues.push(`expected batting row for ${expectedPlayer}, but it was not present`);
    } else if (expectedRunsCount !== null && expectedPlayerRow.runs !== expectedRunsCount) {
      issues.push(`expected ${expectedPlayer} to have ${expectedRunsCount} runs, got ${expectedPlayerRow.runs}`);
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    expectedPlayerRow
  };
}

async function fetchScorecardWithKey({ apiKey, label, matchId }) {
  const url = `https://api.cricapi.com/v1/match_scorecard?apikey=${apiKey}&offset=0&id=${matchId}`;
  const response = await fetch(url);
  const body = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error(`${label} returned non-JSON HTTP ${response.status}: ${body.slice(0, 160)}`);
  }
  if (!response.ok || parsed.status === 'failure' || parsed.status === 'error') {
    throw new Error(`${label} scorecard fetch failed: ${parsed.reason || parsed.message || `HTTP ${response.status}`}`);
  }
  if (!parsed.data) {
    throw new Error(`${label} scorecard response did not include data`);
  }
  return parsed.data;
}

async function loadFreshScorecard({ matchId }) {
  if (process.env.DIAGNOSTIC_SCORECARD_FILE) {
    const raw = await fs.readFile(process.env.DIAGNOSTIC_SCORECARD_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed.data || parsed;
  }

  const keyCandidates = [
    ['primary', process.env.CRICKETDATA_API_KEY],
    ['fallback', process.env.CRICKETDATA_API_KEY_FALLBACK]
  ].filter(([, key]) => key);

  if (!keyCandidates.length) {
    throw new Error('Missing CRICKETDATA_API_KEY or CRICKETDATA_API_KEY_FALLBACK');
  }

  const errors = [];
  for (const [label, apiKey] of keyCandidates) {
    try {
      console.log(`Fetching fresh scorecard from CricketData using ${label} key for match ${matchId}`);
      return await fetchScorecardWithKey({ apiKey, label, matchId });
    } catch (error) {
      errors.push(`${label}: ${error.message}`);
    }
  }

  throw new Error(`All CricketData scorecard keys failed. ${errors.join(' | ')}`);
}

async function main() {
  const matchId = process.env.DIAGNOSTIC_SCORECARD_MATCH_ID || process.argv[2] || DEFAULT_MATCH_ID;
  const expectedPlayer = process.env.DIAGNOSTIC_SCORECARD_EXPECTED_PLAYER || 'Abhishek Sharma';
  const expectedRuns = process.env.DIAGNOSTIC_SCORECARD_EXPECTED_RUNS || '135';
  const expectedInnings = process.env.DIAGNOSTIC_SCORECARD_EXPECTED_INNINGS || '2';

  const scorecard = await loadFreshScorecard({ matchId });
  const summary = summarizeScorecardApiResponse(scorecard);
  const evaluation = evaluateScorecardSummary(summary, {
    expectedInnings,
    expectedPlayer,
    expectedRuns
  });

  console.log(JSON.stringify({
    matchId,
    expectations: {
      expectedInnings: numberOrNull(expectedInnings),
      expectedPlayer,
      expectedRuns: numberOrNull(expectedRuns)
    },
    summary: {
      name: summary.name,
      status: summary.status,
      matchEnded: summary.matchEnded,
      matchWinner: summary.matchWinner,
      score: summary.score,
      innings: summary.innings.map((inning) => ({
        inning: inning.inning,
        batters: inning.batters,
        bowlers: inning.bowlers,
        firstBatters: inning.batting.slice(0, 5),
        firstBowlers: inning.bowling.slice(0, 5)
      }))
    },
    expectedPlayerRow: evaluation.expectedPlayerRow,
    issues: evaluation.issues
  }, null, 2));

  if (!evaluation.ok) {
    console.error('Fresh scorecard diagnostic failed: CricketData is still returning an incomplete or unexpected scorecard.');
    process.exitCode = 1;
  } else {
    console.log('Fresh scorecard diagnostic passed: CricketData now has the expected completed scorecard shape.');
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((error) => {
    console.error(error?.stack || error?.message || String(error));
    process.exitCode = 1;
  });
}
