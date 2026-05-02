import {
  MINI_FANTASY_LIVE_PROVISIONAL_VERSION,
  TEAM_CODE_TO_NAME,
  buildFixturePlayerPool,
  buildMiniFantasyPlayerRecordFromStats,
  normalizeName,
  normalizeWhitespace
} from './contest-engine.js';

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundTo(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round((Number(value || 0) + Number.EPSILON) * factor) / factor;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function oversToBalls(value) {
  if (value === null || value === undefined || value === '') return 0;
  const text = String(value).trim();
  const [whole, remainder] = text.split('.');
  return (Number(whole || 0) * 6) + Number(remainder || 0);
}

function stripAnnotation(value) {
  return normalizeWhitespace(
    String(value || '')
      .replace(/\((?:wk|wk\/c|c|sub|rp|cs)\)/gi, '')
      .replace(/\((?:c|wk)\)/gi, '')
  );
}

function dismissalKey(value) {
  return normalizeWhitespace(value || '').toLowerCase();
}

function inferDismissalEntities(dismissalText) {
  const text = normalizeWhitespace(dismissalText || '');
  const lower = text.toLowerCase();
  if (!text || lower === 'not out' || lower === 'batting') return {};

  const clean = (value) => stripAnnotation(value);
  const caughtAndBowled = text.match(/^c(?:&| and )b\s+(.+)$/i);
  if (caughtAndBowled) {
    const bowlerName = clean(caughtAndBowled[1]);
    return { bowlerName, catcherName: bowlerName, catches: 1, stumpings: 0 };
  }

  const stumped = text.match(/^st\s+(.+?)\s+b\s+(.+)$/i);
  if (stumped) {
    return {
      catcherName: clean(stumped[1]),
      bowlerName: clean(stumped[2]),
      catches: 0,
      stumpings: 1
    };
  }

  const caught = text.match(/^c\s+(?:\(sub\)\s*)?(.+?)\s+b\s+(.+)$/i);
  if (caught) {
    return {
      catcherName: clean(caught[1]),
      bowlerName: clean(caught[2]),
      catches: 1,
      stumpings: 0
    };
  }

  const bowled = text.match(/^(?:lbw\s+)?b\s+(.+)$/i);
  if (bowled) {
    return { bowlerName: clean(bowled[1]), catches: 0, stumpings: 0 };
  }

  return {};
}

export function createMiniFantasyLiveProvisionalEmptyPayload() {
  return {
    version: MINI_FANTASY_LIVE_PROVISIONAL_VERSION,
    generated_at_utc: null,
    updated_at_utc: null,
    match_no: null,
    fixture_label: '',
    home_team_code: '',
    away_team_code: '',
    source: 'official_ipl_screenshot',
    status: 'inactive',
    note: '',
    winning_team_code: '',
    is_no_result: false,
    players: []
  };
}

function normalizeScheduleFixture(rawFixture = {}) {
  return {
    ...rawFixture,
    match_no: Number(rawFixture.match_no || 0) || null,
    home_team_code: String(rawFixture.home_team_code || '').toUpperCase()
      || Object.entries(TEAM_CODE_TO_NAME).find(([, name]) => name === rawFixture.home_team)?.[0]
      || '',
    away_team_code: String(rawFixture.away_team_code || '').toUpperCase()
      || Object.entries(TEAM_CODE_TO_NAME).find(([, name]) => name === rawFixture.away_team)?.[0]
      || '',
    fixture: normalizeWhitespace(rawFixture.fixture || `${rawFixture.away_team || ''} vs ${rawFixture.home_team || ''}`)
  };
}

function buildFixtureTeamLookup(fixture = {}) {
  const lookup = new Map();
  const pairs = [
    [fixture.home_team_code, fixture.home_team],
    [fixture.away_team_code, fixture.away_team]
  ];
  pairs.forEach(([teamCode, teamName]) => {
    const normalizedCode = String(teamCode || '').toUpperCase();
    const normalizedName = normalizeName(teamName || TEAM_CODE_TO_NAME[normalizedCode] || '');
    if (normalizedCode) lookup.set(normalizedCode, normalizedCode);
    if (normalizedName) lookup.set(normalizedName, normalizedCode);
    const canonicalName = normalizeName(TEAM_CODE_TO_NAME[normalizedCode] || '');
    if (canonicalName) lookup.set(canonicalName, normalizedCode);
  });
  return lookup;
}

function resolveTeamCode(teamValue, fixtureTeamLookup) {
  const raw = normalizeWhitespace(teamValue || '');
  if (!raw) return '';
  const upper = raw.toUpperCase();
  if (fixtureTeamLookup.has(upper)) return fixtureTeamLookup.get(upper);
  const normalized = normalizeName(raw);
  return fixtureTeamLookup.get(normalized) || '';
}

function buildPlayerLookup(playerPool = []) {
  const byTeam = new Map();
  (Array.isArray(playerPool) ? playerPool : []).forEach((player) => {
    const teamCode = String(player?.team || '').toUpperCase();
    if (!teamCode) return;
    if (!byTeam.has(teamCode)) byTeam.set(teamCode, []);
    byTeam.get(teamCode).push(player);
  });
  return byTeam;
}

function scorePlayerName(candidateName, playerName) {
  const candidateKey = normalizeName(candidateName);
  const playerKey = normalizeName(playerName);
  if (!candidateKey || !playerKey) return -1;
  if (candidateKey === playerKey) return 100;

  const candidateTokens = candidateKey.split(' ').filter(Boolean);
  const playerTokens = playerKey.split(' ').filter(Boolean);
  const playerTokenSet = new Set(playerTokens);
  const shared = candidateTokens.filter((token) => playerTokenSet.has(token));
  if (!shared.length) return -1;
  const allShared = shared.length === Math.min(candidateTokens.length, playerTokens.length);
  return (allShared ? 60 : 20) + shared.length;
}

function resolveFixturePlayer(playerLookup, teamCode, rawName) {
  const players = playerLookup.get(String(teamCode || '').toUpperCase()) || [];
  const cleanedName = stripAnnotation(rawName);
  let best = null;
  players.forEach((player) => {
    const score = scorePlayerName(cleanedName, player.name);
    if (score < 0) return;
    if (!best || score > best.score || (score === best.score && String(player.name || '').length > String(best.player?.name || '').length)) {
      best = { score, player };
    }
  });
  return best?.player || null;
}

export function createMiniFantasyLiveTemplate(fixture = {}) {
  return {
    matchNo: Number(fixture.match_no || 0) || null,
    updatedAtUtc: '',
    status: '',
    note: 'Manual refresh from official IPL scorecard screenshot.',
    winningTeamCode: '',
    isNoResult: false,
    innings: [
      {
        team: fixture.home_team || TEAM_CODE_TO_NAME[fixture.home_team_code] || '',
        totalRuns: 0,
        wickets: 0,
        overs: '',
        extras: { byes: 0, legByes: 0, wides: 0, noBalls: 0, penalties: 0 },
        batting: [],
        bowling: []
      },
      {
        team: fixture.away_team || TEAM_CODE_TO_NAME[fixture.away_team_code] || '',
        totalRuns: 0,
        wickets: 0,
        overs: '',
        extras: { byes: 0, legByes: 0, wides: 0, noBalls: 0, penalties: 0 },
        batting: [],
        bowling: []
      }
    ]
  };
}

function buildExtrasTotal(extras = {}) {
  return roundTo(
    toNumber(extras?.byes, 0) +
    toNumber(extras?.legByes, 0) +
    toNumber(extras?.wides, 0) +
    toNumber(extras?.noBalls, 0) +
    toNumber(extras?.penalties, 0),
    2
  );
}

function createPlayerState(player) {
  return {
    player_id: player.player_id,
    name: player.name,
    team: player.team,
    role: player.role,
    stats: {
      runs: 0,
      battingBalls: 0,
      sixes: 0,
      wickets: 0,
      bowlingBalls: 0,
      runsConceded: 0,
      catches: 0,
      stumpings: 0,
      dotBalls: 0,
      dismissed: false
    }
  };
}

function ensurePlayerState(stateById, player) {
  const playerId = String(player?.player_id || '');
  if (!playerId) return null;
  if (!stateById.has(playerId)) {
    stateById.set(playerId, createPlayerState(player));
  }
  return stateById.get(playerId);
}

function createIssueCollector() {
  const issues = [];
  return {
    add(message) {
      issues.push(String(message || 'Unknown validation issue'));
    },
    all() {
      return issues;
    },
    assertEmpty() {
      if (!issues.length) return;
      throw new Error(`Mini Fantasy live provisional validation failed:\n- ${issues.join('\n- ')}`);
    }
  };
}

export function buildMiniFantasyLiveProvisionalPayload({
  manualInput = {},
  fixture = {},
  squads = {},
  teamRoles = {}
} = {}) {
  const normalizedFixture = normalizeScheduleFixture(fixture);
  const matchNo = Number(manualInput?.matchNo || manualInput?.match_no || normalizedFixture.match_no || 0) || null;
  if (!matchNo) {
    throw new Error('Manual live payload is missing a valid matchNo.');
  }
  if (!normalizedFixture?.home_team_code || !normalizedFixture?.away_team_code) {
    throw new Error(`Fixture metadata for Match ${matchNo} is incomplete.`);
  }

  const playerPool = buildFixturePlayerPool({
    fixture: normalizedFixture,
    priceBook: { players: [] },
    squads,
    teamRoles
  });
  const playerLookup = buildPlayerLookup(playerPool);
  const fixtureTeamLookup = buildFixtureTeamLookup(normalizedFixture);
  const stateById = new Map();
  const validation = createIssueCollector();

  safeArray(manualInput?.innings).forEach((innings, inningsIndex) => {
    const inningsTeamCode = resolveTeamCode(innings?.team, fixtureTeamLookup);
    if (!inningsTeamCode) {
      validation.add(`Innings ${inningsIndex + 1}: could not resolve batting team "${innings?.team || ''}".`);
      return;
    }
    const bowlingTeamCode = inningsTeamCode === normalizedFixture.home_team_code
      ? normalizedFixture.away_team_code
      : normalizedFixture.home_team_code;
    const battingRows = safeArray(innings?.batting);
    const bowlingRows = safeArray(innings?.bowling);
    const extras = innings?.extras && typeof innings.extras === 'object' ? innings.extras : {};
    const expectedRuns = roundTo(toNumber(innings?.totalRuns, 0), 2);
    const battingRuns = roundTo(battingRows.reduce((total, batter) => total + toNumber(batter?.runs, 0), 0), 2);
    const extrasTotal = buildExtrasTotal(extras);
    if (Math.abs((battingRuns + extrasTotal) - expectedRuns) > 0.11) {
      validation.add(`Innings ${inningsIndex + 1}: batting runs ${battingRuns} plus extras ${extrasTotal} did not match total ${expectedRuns}.`);
    }

    const dismissedCount = battingRows.filter((batter) => {
      const key = dismissalKey(batter?.dismissalText || '');
      return key && key !== 'not out' && key !== 'batting';
    }).length;
    const expectedWickets = Math.max(0, Math.trunc(toNumber(innings?.wickets, 0)));
    if (dismissedCount !== expectedWickets) {
      validation.add(`Innings ${inningsIndex + 1}: dismissals ${dismissedCount} did not match wickets ${expectedWickets}.`);
    }

    battingRows.forEach((batter) => {
      const player = resolveFixturePlayer(playerLookup, inningsTeamCode, batter?.name);
      if (!player) {
        validation.add(`Innings ${inningsIndex + 1}: could not match batter "${batter?.name || ''}" to ${inningsTeamCode}.`);
        return;
      }
      const state = ensurePlayerState(stateById, player);
      state.stats.runs = roundTo(state.stats.runs + toNumber(batter?.runs, 0), 2);
      state.stats.battingBalls += Math.max(0, Math.trunc(toNumber(batter?.balls, 0)));
      state.stats.sixes += Math.max(0, Math.trunc(toNumber(batter?.sixes, 0)));
      const key = dismissalKey(batter?.dismissalText || '');
      if (key && key !== 'not out' && key !== 'batting') {
        state.stats.dismissed = true;
      }

      const dismissal = inferDismissalEntities(batter?.dismissalText || '');
      if (dismissal?.bowlerName) {
        const bowler = resolveFixturePlayer(playerLookup, bowlingTeamCode, dismissal.bowlerName);
        if (!bowler) {
          validation.add(`Innings ${inningsIndex + 1}: could not match bowler "${dismissal.bowlerName}" from dismissal "${batter?.dismissalText || ''}".`);
        }
      }
      if (dismissal?.catcherName && (dismissal.catches || dismissal.stumpings)) {
        const fielder = resolveFixturePlayer(playerLookup, bowlingTeamCode, dismissal.catcherName);
        if (!fielder) {
          validation.add(`Innings ${inningsIndex + 1}: could not match fielder "${dismissal.catcherName}" from dismissal "${batter?.dismissalText || ''}".`);
        } else {
          const fielderState = ensurePlayerState(stateById, fielder);
          fielderState.stats.catches += Math.max(0, Math.trunc(toNumber(dismissal.catches, 0)));
          fielderState.stats.stumpings += Math.max(0, Math.trunc(toNumber(dismissal.stumpings, 0)));
        }
      }
    });

    bowlingRows.forEach((bowlerRow) => {
      const bowler = resolveFixturePlayer(playerLookup, bowlingTeamCode, bowlerRow?.name);
      if (!bowler) {
        validation.add(`Innings ${inningsIndex + 1}: could not match bowler "${bowlerRow?.name || ''}" to ${bowlingTeamCode}.`);
        return;
      }
      const state = ensurePlayerState(stateById, bowler);
      state.stats.bowlingBalls += oversToBalls(bowlerRow?.overs);
      state.stats.runsConceded = roundTo(state.stats.runsConceded + toNumber(bowlerRow?.runs, 0), 2);
      state.stats.wickets += Math.max(0, Math.trunc(toNumber(bowlerRow?.wickets, 0)));
      state.stats.dotBalls += Math.max(0, Math.trunc(toNumber(bowlerRow?.dots, 0)));
    });

    const totalBowlingBalls = bowlingRows.reduce((total, bowlerRow) => total + oversToBalls(bowlerRow?.overs), 0);
    const expectedBowlingBalls = oversToBalls(innings?.overs);
    if (totalBowlingBalls !== expectedBowlingBalls) {
      validation.add(`Innings ${inningsIndex + 1}: bowling balls ${totalBowlingBalls} did not match overs ${innings?.overs || '0'} (${expectedBowlingBalls} balls).`);
    }
    const expectedBowlingRuns = roundTo(expectedRuns - toNumber(extras?.byes, 0) - toNumber(extras?.legByes, 0), 2);
    const bowlingRuns = roundTo(bowlingRows.reduce((total, bowlerRow) => total + toNumber(bowlerRow?.runs, 0), 0), 2);
    if (Math.abs(bowlingRuns - expectedBowlingRuns) > 0.11) {
      validation.add(`Innings ${inningsIndex + 1}: bowlers conceded ${bowlingRuns} but expected ${expectedBowlingRuns} after removing byes/leg-byes.`);
    }
  });

  validation.assertEmpty();

  const generatedAtUtc = new Date().toISOString();
  const updatedAtUtc = normalizeWhitespace(manualInput?.updatedAtUtc || manualInput?.updated_at_utc || '') || generatedAtUtc;
  const players = [...stateById.values()]
    .map((state) => {
      const record = buildMiniFantasyPlayerRecordFromStats(state.stats);
      return {
        player_id: state.player_id,
        name: state.name,
        team: state.team,
        role: state.role,
        appeared: record.appeared,
        points: record.points,
        base_breakdown: record.base_breakdown
      };
    })
    .filter((player) => player.appeared || Math.abs(toNumber(player.points, 0)) > 0.001)
    .sort((a, b) => Number(b.points || 0) - Number(a.points || 0) || String(a.name || '').localeCompare(String(b.name || '')));

  return {
    version: MINI_FANTASY_LIVE_PROVISIONAL_VERSION,
    generated_at_utc: generatedAtUtc,
    updated_at_utc: updatedAtUtc,
    match_no: matchNo,
    fixture_label: normalizedFixture.fixture || `${normalizedFixture.away_team || ''} vs ${normalizedFixture.home_team || ''}`,
    home_team_code: normalizedFixture.home_team_code,
    away_team_code: normalizedFixture.away_team_code,
    source: 'official_ipl_screenshot',
    status: normalizeWhitespace(manualInput?.status || '') || 'Manual live provisional update',
    note: normalizeWhitespace(manualInput?.note || '') || 'Manual refresh from official IPL scorecard screenshot.',
    winning_team_code: String(manualInput?.winningTeamCode || manualInput?.winning_team_code || '').toUpperCase(),
    is_no_result: Boolean(manualInput?.isNoResult || manualInput?.is_no_result),
    players
  };
}

export function buildMiniFantasyLiveProvisionalSummary(payload = {}) {
  return {
    matchNo: Number(payload?.match_no || 0) || null,
    status: payload?.status || '',
    playerCount: Array.isArray(payload?.players) ? payload.players.length : 0,
    topPlayers: safeArray(payload?.players).slice(0, 5).map((player) => ({
      name: player.name,
      team: player.team,
      points: player.points
    }))
  };
}
