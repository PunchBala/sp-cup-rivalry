import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const DEFAULT_LABEL = 'RapidAPI live cricket feed probe';
const DEFAULT_MAX_PATHS = 12;
const DEFAULT_MAX_SAMPLES = 5;
const DEFAULT_FAIL_ON_WEAK = false;

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function trimString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function lowerKeys(object) {
  return Object.keys(object || {}).map((key) => key.toLowerCase());
}

function hasAnyKey(keys, candidates) {
  return candidates.some((candidate) => keys.includes(candidate));
}

function pushUnique(list, value, max = DEFAULT_MAX_PATHS) {
  if (!value || list.includes(value) || list.length >= max) return;
  list.push(value);
}

function summarizePrimitive(value) {
  if (typeof value === 'string') return value.slice(0, 120);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  return null;
}

function parseBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  const text = trimString(value).toLowerCase();
  if (!text) return fallback;
  if (['1', 'true', 'yes', 'y', 'on'].includes(text)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(text)) return false;
  return fallback;
}

function splitProbeUrls(value) {
  return trimString(value)
    .split(/[\r\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function extractPlayerName(object) {
  const candidates = [
    'name',
    'player',
    'batsman',
    'batter',
    'bowler',
    'striker',
    'nonStriker',
    'fielder'
  ];
  for (const key of candidates) {
    const value = object?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (value?.name) return String(value.name).trim();
  }
  return '';
}

function looksLikeBatterRow(object) {
  if (!isPlainObject(object)) return false;
  const keys = lowerKeys(object);
  const hasName = extractPlayerName(object).length > 0;
  const hasRuns = hasAnyKey(keys, ['runs', 'r']);
  const hasBalls = hasAnyKey(keys, ['balls', 'b']);
  return hasName && hasRuns && hasBalls;
}

function looksLikeBowlerRow(object) {
  if (!isPlainObject(object)) return false;
  const keys = lowerKeys(object);
  const hasName = extractPlayerName(object).length > 0;
  const hasOvers = hasAnyKey(keys, ['overs', 'o']);
  const hasRuns = hasAnyKey(keys, ['runs', 'r']);
  const hasWickets = hasAnyKey(keys, ['wickets', 'w', 'wkts']);
  return hasName && hasOvers && hasRuns && hasWickets;
}

function summarizeBatterRow(row) {
  return {
    name: extractPlayerName(row),
    runs: numberOrNull(row.runs ?? row.r),
    balls: numberOrNull(row.balls ?? row.b),
    fours: numberOrNull(row.fours ?? row['4s']),
    sixes: numberOrNull(row.sixes ?? row['6s']),
    strikeRate: numberOrNull(row.strikeRate ?? row.sr)
  };
}

function summarizeBowlerRow(row) {
  return {
    name: extractPlayerName(row),
    overs: trimString(row.overs ?? row.o) || row.overs || row.o || null,
    runs: numberOrNull(row.runs ?? row.r),
    wickets: numberOrNull(row.wickets ?? row.w ?? row.wkts),
    dots: numberOrNull(row.dots ?? row.dotBalls ?? row.d)
  };
}

function walkNode(node, path, visitor, seen = new WeakSet()) {
  if (!node || typeof node !== 'object') return;
  if (seen.has(node)) return;
  seen.add(node);

  visitor(node, path);

  if (Array.isArray(node)) {
    node.forEach((entry, index) => walkNode(entry, `${path}[${index}]`, visitor, seen));
    return;
  }

  for (const [key, value] of Object.entries(node)) {
    const childPath = `${path}.${key}`;
    if (value && typeof value === 'object') {
      walkNode(value, childPath, visitor, seen);
    }
  }
}

export function summarizeRapidApiPayload(payload) {
  const topLevelKeys = isPlainObject(payload) ? Object.keys(payload) : [];
  const arraySummaries = [];
  const dotSignalPaths = [];
  const wicketSignalPaths = [];
  const overSignalPaths = [];
  const battingSignalPaths = [];
  const bowlingSignalPaths = [];
  const scoreSignalPaths = [];
  const matchIdPaths = [];
  const batterSamples = [];
  const bowlerSamples = [];

  walkNode(payload, '$', (node, path) => {
    if (Array.isArray(node)) {
      if (arraySummaries.length < DEFAULT_MAX_PATHS) {
        arraySummaries.push({ path, length: node.length });
      }
      return;
    }

    if (!isPlainObject(node)) return;

    for (const [key, value] of Object.entries(node)) {
      const lowerKey = key.toLowerCase();
      const keyPath = `${path}.${key}`;
      if (['dots', 'dot', 'dotballs', 'dot_balls'].includes(lowerKey)) pushUnique(dotSignalPaths, keyPath);
      if (['wickets', 'wicket', 'wkts', 'w'].includes(lowerKey)) pushUnique(wicketSignalPaths, keyPath);
      if (['overs', 'over', 'o'].includes(lowerKey)) pushUnique(overSignalPaths, keyPath);
      if (['batsman', 'batter', 'batters', 'batting', 'striker', 'nonstriker'].includes(lowerKey)) pushUnique(battingSignalPaths, keyPath);
      if (['bowler', 'bowlers', 'bowling'].includes(lowerKey)) pushUnique(bowlingSignalPaths, keyPath);
      if (['score', 'runs', 'run', 'r'].includes(lowerKey)) pushUnique(scoreSignalPaths, keyPath);
      if (['matchid', 'match_id', 'id'].includes(lowerKey) && typeof value !== 'object') pushUnique(matchIdPaths, keyPath);
    }

    if (looksLikeBatterRow(node) && batterSamples.length < DEFAULT_MAX_SAMPLES) {
      batterSamples.push({ path, row: summarizeBatterRow(node) });
    }

    if (looksLikeBowlerRow(node) && bowlerSamples.length < DEFAULT_MAX_SAMPLES) {
      bowlerSamples.push({ path, row: summarizeBowlerRow(node) });
    }
  });

  return {
    topLevelKeys,
    arraySummaries,
    signals: {
      dotSignalPaths,
      wicketSignalPaths,
      overSignalPaths,
      battingSignalPaths,
      bowlingSignalPaths,
      scoreSignalPaths,
      matchIdPaths
    },
    samples: {
      batterSamples,
      bowlerSamples
    }
  };
}

export function assessRapidApiPayload(summary) {
  const batterReady = safeArray(summary?.samples?.batterSamples).length > 0;
  const bowlerReady = safeArray(summary?.samples?.bowlerSamples).length > 0;
  const wicketReady = safeArray(summary?.signals?.wicketSignalPaths).length > 0;
  const overReady = safeArray(summary?.signals?.overSignalPaths).length > 0;
  const dotBallReady = safeArray(summary?.signals?.dotSignalPaths).length > 0;

  let suitability = 'poor';
  if (batterReady && bowlerReady && wicketReady && overReady && dotBallReady) {
    suitability = 'strong';
  } else if (batterReady && bowlerReady && wicketReady && overReady) {
    suitability = 'partial';
  }

  const reasons = [];
  if (!batterReady) reasons.push('No batter-style player rows detected');
  if (!bowlerReady) reasons.push('No bowler-style player rows detected');
  if (!wicketReady) reasons.push('No wicket field detected');
  if (!overReady) reasons.push('No over progression field detected');
  if (!dotBallReady) reasons.push('No dot-ball field detected');

  return {
    suitability,
    provisionalMiniFantasyReady: batterReady && bowlerReady && wicketReady && overReady,
    dotBallReady,
    reasons
  };
}

export function summarizeProbeReports(reports) {
  const normalized = safeArray(reports);
  const counts = {
    total: normalized.length,
    strong: 0,
    partial: 0,
    poor: 0
  };

  for (const report of normalized) {
    const suitability = report?.assessment?.suitability;
    if (suitability === 'strong') counts.strong += 1;
    else if (suitability === 'partial') counts.partial += 1;
    else counts.poor += 1;
  }

  let overallSuitability = 'poor';
  if (counts.total > 0 && counts.poor === 0 && counts.partial === 0) {
    overallSuitability = 'strong';
  } else if (counts.strong > 0 || counts.partial > 0) {
    overallSuitability = 'partial';
  }

  return {
    ...counts,
    overallSuitability
  };
}

async function fetchProbePayload({ requestUrl, rapidApiHost, rapidApiKey }) {
  const response = await fetch(requestUrl, {
    headers: {
      'Accept': 'application/json',
      'X-RapidAPI-Key': rapidApiKey,
      'X-RapidAPI-Host': rapidApiHost
    }
  });

  const body = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error(`RapidAPI probe returned non-JSON HTTP ${response.status}: ${body.slice(0, 200)}`);
  }

  if (!response.ok) {
    throw new Error(`RapidAPI probe failed HTTP ${response.status}: ${JSON.stringify(parsed).slice(0, 300)}`);
  }

  return parsed;
}

async function loadProbeTargets() {
  const fixtureFile = process.env.RAPIDAPI_PROBE_FILE;
  if (fixtureFile) {
    const raw = await fs.readFile(fixtureFile, 'utf8');
    return [{
      requestUrl: fixtureFile,
      rapidApiHost: null,
      payload: JSON.parse(raw)
    }];
  }

  const requestUrls = splitProbeUrls(
    process.env.RAPIDAPI_PROBE_URLS
    || process.env.RAPIDAPI_PROBE_URL
    || process.argv.slice(2).join('\n')
  );
  if (requestUrls.length === 0) {
    throw new Error('Missing RAPIDAPI_PROBE_URLS / RAPIDAPI_PROBE_URL (or CLI URL arguments)');
  }

  const rapidApiKey = process.env.RAPIDAPI_KEY || process.env.LIVE_PROVISIONAL_RAPIDAPI_KEY;
  if (!rapidApiKey) {
    throw new Error('Missing RAPIDAPI_KEY or LIVE_PROVISIONAL_RAPIDAPI_KEY');
  }

  const rapidApiHost = process.env.RAPIDAPI_HOST || process.env.LIVE_PROVISIONAL_RAPIDAPI_HOST || process.argv[3] || '';
  if (!rapidApiHost) {
    throw new Error('Missing RAPIDAPI_HOST or LIVE_PROVISIONAL_RAPIDAPI_HOST');
  }

  const targets = [];
  for (const requestUrl of requestUrls) {
    const payload = await fetchProbePayload({ requestUrl, rapidApiHost, rapidApiKey });
    targets.push({
      requestUrl,
      rapidApiHost,
      payload
    });
  }
  return targets;
}

async function main() {
  const label = process.env.RAPIDAPI_PROBE_LABEL || DEFAULT_LABEL;
  const failOnWeak = parseBoolean(process.env.RAPIDAPI_PROBE_FAIL_ON_WEAK, DEFAULT_FAIL_ON_WEAK);
  const loadedTargets = await loadProbeTargets();
  const reports = loadedTargets.map((loaded) => {
    const payload = loaded?.payload ?? loaded;
    const summary = summarizeRapidApiPayload(payload);
    const assessment = assessRapidApiPayload(summary);
    return {
      requestUrl: loaded?.requestUrl || null,
      rapidApiHost: loaded?.rapidApiHost || null,
      topLevelKeys: summary.topLevelKeys,
      arraySummaries: summary.arraySummaries,
      signals: summary.signals,
      samples: summary.samples,
      assessment
    };
  });
  const probeSummary = summarizeProbeReports(reports);

  console.log(JSON.stringify({
    label,
    failOnWeak,
    summary: probeSummary,
    reports
  }, null, 2));

  if (probeSummary.overallSuitability === 'strong') {
    console.log('RapidAPI live feed probe looks strong enough to test provisional Mini Fantasy live scoring.');
    return;
  }

  if (probeSummary.overallSuitability === 'partial') {
    console.error('RapidAPI live feed probe found partially usable endpoints. Review the report before using them for provisional live scoring.');
  } else {
    console.error('RapidAPI live feed probe did not find a rich enough payload for provisional Mini Fantasy live scoring yet.');
  }

  if (failOnWeak) {
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((error) => {
    console.error(error?.stack || error?.message || String(error));
    process.exitCode = 1;
  });
}
