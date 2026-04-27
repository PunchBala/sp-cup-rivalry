import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCurrentProcessedMatchRefs,
  buildMiniFantasyPlayerHistoriesFromProcessedMatches,
  endedUnprocessedMatches,
  canUseFreshScorecardCall,
  completedScorecardIntegrityIssues,
  findMissingScorecardCaches,
  freshScorecardBudgetRemaining,
  incompleteCompletedScorecardDetails,
  inferProcessedMatchKeys,
  isIncompleteCompletedScorecardError,
  matchKeyForMatch,
  readCachedScorecard,
  repairKnownLivePlayerAliasesDeep,
  repairScoreHistoryGaps,
  rebuildHistoricalState,
  writeCachedScorecard
} from '../scripts/update-live-data.mjs';

function stripZeroEntries(mapObj = {}) {
  return Object.fromEntries(
    Object.entries(mapObj || {}).filter(([, value]) => Number(value || 0) !== 0)
  );
}

function makeFinalScorecard({
  teams,
  winner,
  status = null,
  omitScore = false,
  batter,
  bowler,
  catcher,
  runs,
  balls,
  sixes,
  wickets,
  concededRuns,
  overs,
  stumpings = 0,
  scoreA,
  scoreB
}) {
  return {
    teams,
    matchWinner: winner,
    status: status || (winner === 'No Winner' ? 'No result' : `${winner} won`),
    scorecard: [
      {
        batting: [{
          batsman: { name: batter },
          r: runs,
          b: balls,
          '6s': sixes
        }],
        bowling: [
          {
            bowler: { name: bowler },
            o: overs,
            w: wickets,
            r: concededRuns
          },
          {
            bowler: { name: `${teams[1]} Support Bowler` },
            o: '16',
            w: Math.max(0, 6 - wickets),
            r: Math.max(0, scoreA - concededRuns)
          }
        ],
        catching: [{
          catcher: { name: catcher },
          catch: 1,
          stumped: stumpings
        }],
        extras: {},
        inning: `${teams[0]} Inning 1`
      },
      {
        batting: [{
          batsman: { name: `${teams[1]} Batter` },
          r: scoreB,
          b: Math.max(1, scoreB),
          '6s': Math.max(0, Math.floor(scoreB / 30))
        }],
        bowling: [{
          bowler: { name: `${teams[0]} Bowler` },
          o: '20',
          w: 8,
          r: scoreB
        }],
        catching: [{
          catcher: { name: `${teams[0]} Catcher` },
          catch: 1
        }],
        extras: {},
        inning: `${teams[1]} Inning 1`
      }
    ],
    score: omitScore ? [] : [
      { inning: `${teams[0]} Inning 1`, r: scoreA, w: 6, o: '20' },
      { inning: `${teams[1]} Inning 1`, r: scoreB, w: 8, o: '20' }
    ]
  };
}

async function makeTempCacheDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'warroom-scorecards-'));
}

test('scorecard cache round-trips and reports missing cached matches', async () => {
  const cacheDir = await makeTempCacheDir();
  const scorecard = makeFinalScorecard({
    teams: ['Chennai Super Kings', 'Mumbai Indians'],
    winner: 'Chennai Super Kings',
    batter: 'Ruturaj Gaikwad',
    bowler: 'Jasprit Bumrah',
    catcher: 'MS Dhoni',
    runs: 72,
    balls: 44,
    sixes: 4,
    wickets: 2,
    concededRuns: 28,
    overs: '4',
    scoreA: 181,
    scoreB: 164
  });

  await writeCachedScorecard('match-1', scorecard, { cacheDir });

  const cached = await readCachedScorecard('match-1', { cacheDir });
  const missing = await findMissingScorecardCaches(['match-1', 'match-2'], { cacheDir });

  assert.deepEqual(cached, scorecard);
  assert.deepEqual(missing, ['match-2']);
});

test('fresh scorecard budget helper hard-stops paid calls once the run cap is reached', () => {
  const live = {
    meta: {
      lastRun: {
        scorecardCalls: 1
      }
    }
  };

  assert.equal(freshScorecardBudgetRemaining(live, 1), 0);
  assert.equal(canUseFreshScorecardCall(live, 1, 1), false);
  assert.equal(freshScorecardBudgetRemaining({ meta: { lastRun: { scorecardCalls: 0 } } }, 2), 2);
  assert.equal(canUseFreshScorecardCall({ meta: { lastRun: { scorecardCalls: 0 } } }, 1, 2), true);
});

test('completed scorecard integrity check catches final-score shells with partial player scorecards', () => {
  const partial = {
    matchEnded: true,
    score: [
      { inning: 'Sunrisers Hyderabad Inning 1', r: 242, w: 2, o: 20 },
      { inning: 'Delhi Capitals Inning 1', r: 195, w: 9, o: 20 }
    ],
    scorecard: [
      {
        inning: 'Sunrisers Hyderabad Inning 1',
        batting: [{ batsman: { name: 'Abhishek Sharma' }, r: 75 }]
      }
    ]
  };

  assert.deepEqual(
    completedScorecardIntegrityIssues(partial),
    [
      'final score has 2 innings but scorecard has 1',
      'Sunrisers Hyderabad Inning 1 top-level total 242 is 167 runs above batting rows total 75'
    ]
  );
});

test('completed scorecard integrity check catches settled totals with stale batting rows', () => {
  const staleTwoInnings = {
    matchEnded: true,
    status: 'Sunrisers Hyderabad won by 47 runs',
    matchWinner: 'Sunrisers Hyderabad',
    score: [
      { inning: 'Sunrisers Hyderabad Inning 1', r: 242, w: 2, o: 20 },
      { inning: 'Delhi Capitals Inning 1', r: 195, w: 9, o: 20 }
    ],
    scorecard: [
      {
        inning: 'Sunrisers Hyderabad Inning 1',
        batting: [
          { batsman: { name: 'Abhishek Sharma' }, r: 75 },
          { batsman: { name: 'Travis Head' }, r: 37 },
          { batsman: { name: 'Ishan Kishan' }, r: 22 }
        ],
        bowling: [
          { bowler: { name: 'Mukesh Kumar' }, r: 20, nb: 0, wd: 1 },
          { bowler: { name: 'Nitish Rana' }, r: 32, nb: 0, wd: 2 }
        ]
      },
      {
        inning: 'Delhi Capitals Inning 1',
        batting: [
          { batsman: { name: 'KL Rahul' }, r: 37 },
          { batsman: { name: 'Nitish Rana' }, r: 57 }
        ],
        bowling: [
          { bowler: { name: 'Eshan Malinga' }, r: 32, nb: 0, wd: 0 },
          { bowler: { name: 'Sakib Hussain' }, r: 29, nb: 0, wd: 1 }
        ]
      }
    ]
  };

  assert.deepEqual(
    completedScorecardIntegrityIssues(staleTwoInnings),
    [
      'Sunrisers Hyderabad Inning 1 top-level total 242 is 108 runs above batting rows total 134',
      'Delhi Capitals Inning 1 top-level total 195 is 101 runs above batting rows total 94'
    ]
  );
});

test('completed scorecard integrity check accepts valid scorecards with byes or leg byes missing from provider extras', () => {
  const completeWithUnlistedLegByes = {
    matchEnded: true,
    status: 'Rajasthan Royals won by 40 runs',
    matchWinner: 'Rajasthan Royals',
    score: [
      { inning: 'Rajasthan Royals Inning 1', r: 159, w: 6, o: 20 },
      { inning: 'Lucknow Super Giants Inning 1', r: 119, w: 10, o: 18 }
    ],
    scorecard: [
      {
        inning: 'Rajasthan Royals Inning 1',
        batting: [
          { batsman: { name: 'Yashasvi Jaiswal' }, r: 22 },
          { batsman: { name: 'Vaibhav Sooryavanshi' }, r: 8 },
          { batsman: { name: 'Dhruv Jurel' }, r: 0 },
          { batsman: { name: 'Riyan Parag' }, r: 20 },
          { batsman: { name: 'Shimron Hetmyer' }, r: 22 },
          { batsman: { name: 'Ravindra Jadeja' }, r: 43 },
          { batsman: { name: 'Donovan Ferreira' }, r: 20 },
          { batsman: { name: 'Shubham Dubey' }, r: 19 }
        ],
        bowling: [
          { bowler: { name: 'Mohammed Shami' }, r: 30, nb: 0, wd: 3 },
          { bowler: { name: 'Prince Yadav' }, r: 29, nb: 0, wd: 0 },
          { bowler: { name: 'Mohsin Khan' }, r: 17, nb: 0, wd: 0 },
          { bowler: { name: 'Mayank Yadav' }, r: 56, nb: 0, wd: 1 },
          { bowler: { name: 'Digvesh Singh Rathi' }, r: 26, nb: 0, wd: 0 }
        ]
      },
      {
        inning: 'Lucknow Super Giants Inning 1',
        batting: [
          { batsman: { name: 'Mitchell Marsh' }, r: 55 },
          { batsman: { name: 'Ayush Badoni' }, r: 0 },
          { batsman: { name: 'Rishabh Pant' }, r: 0 },
          { batsman: { name: 'Aiden Markram' }, r: 0 },
          { batsman: { name: 'Nicholas Pooran' }, r: 22 },
          { batsman: { name: 'Himmat Singh' }, r: 15 },
          { batsman: { name: 'Mukul Choudhary' }, r: 7 },
          { batsman: { name: 'Mohammed Shami' }, r: 6 },
          { batsman: { name: 'Mayank Yadav' }, r: 5 },
          { batsman: { name: 'Digvesh Singh Rathi' }, r: 2 },
          { batsman: { name: 'Mohsin Khan' }, r: 0 }
        ],
        bowling: [
          { bowler: { name: 'Jofra Archer' }, r: 20, nb: 0, wd: 1 },
          { bowler: { name: 'Nandre Burger' }, r: 27, nb: 0, wd: 0 },
          { bowler: { name: 'Brijesh Sharma' }, r: 18, nb: 0, wd: 1 },
          { bowler: { name: 'Ravindra Jadeja' }, r: 29, nb: 0, wd: 1 },
          { bowler: { name: 'Ravi Bishnoi' }, r: 23, nb: 0, wd: 2 }
        ]
      }
    ]
  };

  assert.deepEqual(completedScorecardIntegrityIssues(completeWithUnlistedLegByes), []);
});

test('completed scorecard integrity check exempts no-result and abandoned matches', () => {
  const abandoned = {
    matchEnded: true,
    status: 'No result (rain)',
    matchWinner: 'No Winner',
    score: [
      { inning: 'Kolkata Knight Riders Inning 1', r: 210, w: 4, o: 20 },
      { inning: 'Punjab Kings Inning 1', r: 0, w: 0, o: 0 }
    ],
    scorecard: [
      {
        inning: 'Kolkata Knight Riders Inning 1',
        batting: [{ batsman: { name: 'Rinku Singh' }, r: 12 }]
      }
    ]
  };

  assert.deepEqual(completedScorecardIntegrityIssues(abandoned), []);
});

test('incomplete completed scorecard errors are normalized as retryable not-ready scorecards', () => {
  const error = new Error('Incomplete completed scorecard for match-31');
  error.code = 'CRICKETDATA_INCOMPLETE_SCORECARD';
  error.matchId = 'match-31';
  error.integrityIssues = ['final score has 2 innings but scorecard has 1'];

  assert.equal(isIncompleteCompletedScorecardError(error), true);
  assert.deepEqual(incompleteCompletedScorecardDetails(error), {
    reason: 'incomplete_completed_scorecard',
    rawReason: 'final score has 2 innings but scorecard has 1',
    matchId: 'match-31',
    integrityIssues: ['final score has 2 innings but scorecard has 1']
  });
});

test('historical rebuild tracks cache hits separately from paid API scorecard calls', async () => {
  const scorecards = {
    'match-1': makeFinalScorecard({
      teams: ['Punjab Kings', 'Delhi Capitals'],
      winner: 'Punjab Kings',
      batter: 'Prabhsimran Singh',
      bowler: 'Kuldeep Yadav',
      catcher: 'Shashank Singh',
      runs: 61,
      balls: 36,
      sixes: 3,
      wickets: 2,
      concededRuns: 31,
      overs: '4',
      scoreA: 176,
      scoreB: 161
    }),
    'match-2': makeFinalScorecard({
      teams: ['Royal Challengers Bengaluru', 'Rajasthan Royals'],
      winner: 'Royal Challengers Bengaluru',
      batter: 'Virat Kohli',
      bowler: 'Jofra Archer',
      catcher: 'Rajat Patidar',
      runs: 88,
      balls: 50,
      sixes: 5,
      wickets: 1,
      concededRuns: 38,
      overs: '4',
      scoreA: 189,
      scoreB: 175
    })
  };

  const rebuilt = await rebuildHistoricalState(
    ['match-1', 'match-2'],
    {
      meta: {
        scoreHistory: [{ processedMatchCount: 0, fetchedAt: '2026-04-01T00:00:00.000Z' }]
      }
    },
    {
      includeHistory: true,
      loadScorecard: async (matchId) => ({
        data: scorecards[matchId],
        source: matchId === 'match-1' ? 'cache' : 'api-force-refresh'
      })
    }
  );

  assert.equal(rebuilt.cacheHits, 1);
  assert.equal(rebuilt.apiCalls, 1);
  assert.equal(rebuilt.scoreHistory.length, 3);
  assert.equal(rebuilt.scoreHistory[1].processedMatchCount, 1);
  assert.equal(rebuilt.scoreHistory[2].processedMatchCount, 2);
  assert.equal(rebuilt.aggregates.battingRuns['Prabhsimran Singh'], 61);
  assert.equal(rebuilt.aggregates.battingRuns['Virat Kohli'], 88);
});

test('historical rebuild falls back to prior score history when a processed match cache is missing', async () => {
  const scorecards = {
    'match-1': makeFinalScorecard({
      teams: ['Punjab Kings', 'Delhi Capitals'],
      winner: 'Punjab Kings',
      batter: 'Prabhsimran Singh',
      bowler: 'Kuldeep Yadav',
      catcher: 'Shashank Singh',
      runs: 61,
      balls: 36,
      sixes: 3,
      wickets: 2,
      concededRuns: 31,
      overs: '4',
      scoreA: 176,
      scoreB: 161
    }),
    'match-2': makeFinalScorecard({
      teams: ['Royal Challengers Bengaluru', 'Rajasthan Royals'],
      winner: 'Royal Challengers Bengaluru',
      batter: 'Virat Kohli',
      bowler: 'Jofra Archer',
      catcher: 'Rajat Patidar',
      runs: 88,
      balls: 50,
      sixes: 5,
      wickets: 1,
      concededRuns: 38,
      overs: '4',
      scoreA: 189,
      scoreB: 175
    })
  };

  const baseLive = {
    meta: {
      scoreHistory: [{ processedMatchCount: 0, fetchedAt: '2026-04-01T00:00:00.000Z' }]
    }
  };

  const fullHistory = await rebuildHistoricalState(
    ['match-1', 'match-2'],
    baseLive,
    {
      includeHistory: true,
      loadScorecard: async (matchId) => ({
        data: scorecards[matchId],
        source: 'cache'
      })
    }
  );

  const rebuilt = await rebuildHistoricalState(
    ['match-1', 'match-2'],
    {
      meta: {
        scoreHistory: fullHistory.scoreHistory
      }
    },
    {
      includeHistory: true,
      loadScorecard: async (matchId) => {
        if (matchId === 'match-2') {
          throw new Error('Missing cached scorecard for processed match match-2');
        }
        return { data: scorecards[matchId], source: 'cache' };
      }
    }
  );

  assert.equal(rebuilt.cacheHits, 1);
  assert.equal(rebuilt.apiCalls, 0);
  assert.equal(rebuilt.historyFallbacks, 1);
  assert.deepEqual(rebuilt.aggregates.battingRuns, fullHistory.aggregates.battingRuns);
  assert.deepEqual(rebuilt.aggregates.catches, fullHistory.aggregates.catches);
  assert.deepEqual(stripZeroEntries(rebuilt.aggregates.stumpings), stripZeroEntries(fullHistory.aggregates.stumpings));
  assert.equal(rebuilt.scoreHistory.length, 3);
  assert.deepEqual(
    rebuilt.scoreHistory[2].snapshot.meta.aggregates.battingRuns,
    fullHistory.scoreHistory[2].snapshot.meta.aggregates.battingRuns
  );
  assert.deepEqual(
    stripZeroEntries(rebuilt.scoreHistory[2].snapshot.meta.aggregates.stumpings),
    stripZeroEntries(fullHistory.scoreHistory[2].snapshot.meta.aggregates.stumpings)
  );
});

test('stable processed match keys prevent duplicate backlog when CricketData rotates match ids', () => {
  const live = {
    meta: {
      processedMatchIds: ['old-match-1', 'old-match-2']
    }
  };
  const matchList = [
    {
      id: 'new-match-1',
      name: 'Royal Challengers Bengaluru vs Sunrisers Hyderabad, 1st Match, Indian Premier League 2026',
      dateTimeGMT: '2026-03-28T00:00:00',
      teams: ['Royal Challengers Bengaluru', 'Sunrisers Hyderabad'],
      matchEnded: true
    },
    {
      id: 'new-match-2',
      name: 'Mumbai Indians vs Kolkata Knight Riders, 2nd Match, Indian Premier League 2026',
      dateTimeGMT: '2026-03-29T00:00:00',
      teams: ['Mumbai Indians', 'Kolkata Knight Riders'],
      matchEnded: true
    },
    {
      id: 'new-match-3',
      name: 'Rajasthan Royals vs Chennai Super Kings, 3rd Match, Indian Premier League 2026',
      dateTimeGMT: '2026-03-30T00:00:00',
      teams: ['Rajasthan Royals', 'Chennai Super Kings'],
      matchEnded: true
    }
  ].map((match) => ({ ...match, matchKey: matchKeyForMatch(match) }));

  const processedKeys = inferProcessedMatchKeys(live, matchList);
  const backlog = endedUnprocessedMatches(matchList, live.meta.processedMatchIds, processedKeys);

  assert.deepEqual(processedKeys, ['match:1', 'match:2']);
  assert.equal(backlog.length, 1);
  assert.equal(backlog[0].id, 'new-match-3');
});

test('current processed refs rebuild includes matches added after the initial processed-ref snapshot', () => {
  const matchList = [
    {
      id: 'match-1',
      name: 'Punjab Kings vs Delhi Capitals, 1st Match, Indian Premier League 2026',
      dateTimeGMT: '2026-03-28T00:00:00',
      teams: ['Punjab Kings', 'Delhi Capitals'],
      matchEnded: true,
      matchKey: 'match:1'
    },
    {
      id: 'match-2',
      name: 'Mumbai Indians vs Chennai Super Kings, 2nd Match, Indian Premier League 2026',
      dateTimeGMT: '2026-03-29T00:00:00',
      teams: ['Mumbai Indians', 'Chennai Super Kings'],
      matchEnded: true,
      matchKey: 'match:2'
    }
  ];

  const staleProcessedRefs = [{ id: 'match-1', matchKey: 'match:1' }];
  const live = {
    meta: {
      processedMatchIds: ['match-1', 'match-2'],
      processedMatchKeys: ['match:1', 'match:2']
    }
  };

  const currentProcessedRefs = buildCurrentProcessedMatchRefs(live, matchList);

  assert.deepEqual(staleProcessedRefs.map((match) => match.id), ['match-1']);
  assert.deepEqual(currentProcessedRefs.map((match) => match.id), ['match-1', 'match-2']);
  assert.equal(currentProcessedRefs[1].matchKey, 'match:2');
});

test('current processed refs rebuild reattaches stored match:number keys to schedule rows', () => {
  const matchList = [
    {
      id: 'uuid-35',
      match_no: 35,
      fixture: 'Mumbai Indians vs Chennai Super Kings',
      datetime_utc: '2026-04-25T10:00:00Z'
    },
    {
      id: 'uuid-36',
      match_no: 36,
      fixture: 'Sunrisers Hyderabad vs Rajasthan Royals',
      datetime_utc: '2026-04-25T14:00:00Z'
    }
  ];
  const live = {
    meta: {
      processedMatchIds: ['legacy-35', 'legacy-36'],
      processedMatchKeys: ['match:35', 'match:36']
    }
  };

  const currentProcessedRefs = buildCurrentProcessedMatchRefs(live, matchList);

  assert.deepEqual(currentProcessedRefs.map((match) => match.id), ['uuid-35', 'uuid-36']);
  assert.equal(currentProcessedRefs[1].datetime_utc, '2026-04-25T14:00:00Z');
  assert.equal(currentProcessedRefs[1].match_no, 36);
});

test('repairs missing score-history checkpoints from the nearest earlier snapshot', async () => {
  const scorecards = {
    'match-1': makeFinalScorecard({
      teams: ['Punjab Kings', 'Delhi Capitals'],
      winner: 'Punjab Kings',
      batter: 'Prabhsimran Singh',
      bowler: 'Kuldeep Yadav',
      catcher: 'Shashank Singh',
      runs: 61,
      balls: 36,
      sixes: 3,
      wickets: 2,
      concededRuns: 31,
      overs: '4',
      scoreA: 176,
      scoreB: 161
    }),
    'match-2': makeFinalScorecard({
      teams: ['Royal Challengers Bengaluru', 'Rajasthan Royals'],
      winner: 'Royal Challengers Bengaluru',
      batter: 'Virat Kohli',
      bowler: 'Jofra Archer',
      catcher: 'Rajat Patidar',
      runs: 88,
      balls: 50,
      sixes: 5,
      wickets: 1,
      concededRuns: 38,
      overs: '4',
      scoreA: 189,
      scoreB: 175
    }),
    'match-3': makeFinalScorecard({
      teams: ['Mumbai Indians', 'Lucknow Super Giants'],
      winner: 'Lucknow Super Giants',
      batter: 'Nicholas Pooran',
      bowler: 'Jasprit Bumrah',
      catcher: 'Rohit Sharma',
      runs: 54,
      balls: 31,
      sixes: 4,
      wickets: 2,
      concededRuns: 29,
      overs: '4',
      scoreA: 167,
      scoreB: 171
    })
  };

  const baseLive = {
    mostDots: { ranking: [], extendedRanking: [], values: {} },
    fairPlay: { winner: null, ranking: [], extendedRanking: [], values: {}, updatedAt: null, source: null },
    meta: {
      scoreHistory: [{ processedMatchCount: 0, fetchedAt: '2026-04-01T00:00:00.000Z' }]
    }
  };

  const throughOneMatch = await rebuildHistoricalState(
    ['match-1'],
    baseLive,
    {
      includeHistory: true,
      loadScorecard: async (matchId) => ({ data: scorecards[matchId], source: 'cache' })
    }
  );

  const live = {
    ...baseLive,
    meta: {
      processedMatchIds: ['legacy-1', 'legacy-2', 'legacy-3'],
      processedMatchKeys: ['match:1', 'match:2', 'match:3'],
      scoreHistory: throughOneMatch.scoreHistory
    }
  };

  const repaired = await repairScoreHistoryGaps(
    live,
    [
      { id: 'match-1', matchKey: 'match:1' },
      { id: 'match-2', matchKey: 'match:2' },
      { id: 'match-3', matchKey: 'match:3' }
    ],
    {
      loadScorecard: async (matchId) => ({ data: scorecards[matchId], source: matchId === 'match-2' ? 'api' : 'cache' })
    }
  );

  const repairedCounts = live.meta.scoreHistory.map((entry) => entry.processedMatchCount);
  const repairedSnapshot = live.meta.scoreHistory.find((entry) => entry.processedMatchCount === 2);

  assert.equal(repaired.repaired, 1);
  assert.equal(repaired.apiCalls, 1);
  assert.equal(repaired.cacheHits, 0);
  assert.deepEqual(repairedCounts, [0, 1, 2]);
  assert.equal(repairedSnapshot.snapshot.meta.aggregates.battingRuns['Virat Kohli'], 88);
});

test('defers incomplete completed scorecards during score-history gap repair', async () => {
  const scorecards = {
    'match-1': makeFinalScorecard({
      teams: ['Punjab Kings', 'Delhi Capitals'],
      winner: 'Punjab Kings',
      batter: 'Prabhsimran Singh',
      bowler: 'Kuldeep Yadav',
      catcher: 'Shashank Singh',
      runs: 61,
      balls: 36,
      sixes: 3,
      wickets: 2,
      concededRuns: 31,
      overs: '4',
      scoreA: 176,
      scoreB: 161
    })
  };

  const baseLive = {
    mostDots: { ranking: [], extendedRanking: [], values: {} },
    fairPlay: { winner: null, ranking: [], extendedRanking: [], values: {}, updatedAt: null, source: null },
    meta: {
      scoreHistory: [{ processedMatchCount: 0, fetchedAt: '2026-04-01T00:00:00.000Z' }]
    }
  };
  const throughOneMatch = await rebuildHistoricalState(
    ['match-1'],
    baseLive,
    {
      includeHistory: true,
      loadScorecard: async (matchId) => ({ data: scorecards[matchId], source: 'cache' })
    }
  );
  const live = {
    ...baseLive,
    meta: {
      lastRun: {},
      scorecardBudget: {},
      scoreHistory: throughOneMatch.scoreHistory
    }
  };
  const incompleteError = new Error('Incomplete completed scorecard for match-2');
  incompleteError.code = 'CRICKETDATA_INCOMPLETE_SCORECARD';
  incompleteError.matchId = 'match-2';
  incompleteError.integrityIssues = ['final score has 2 innings but scorecard has 1'];

  const repaired = await repairScoreHistoryGaps(
    live,
    [
      { id: 'match-1', matchKey: 'match:1' },
      { id: 'match-2', matchKey: 'match:2' },
      { id: 'match-3', matchKey: 'match:3' }
    ],
    {
      loadScorecard: async (matchId) => {
        if (matchId === 'match-2') throw incompleteError;
        return { data: scorecards[matchId], source: 'cache' };
      }
    }
  );

  assert.equal(repaired.repaired, 0);
  assert.equal(live.meta.lastRun.deferredScorecards, 1);
  assert.deepEqual(live.meta.lastRun.deferredScorecardMatchIds, ['match-2']);
  assert.match(live.meta.lastRun.deferredScorecardReason, /score history gap 2/);
  assert.match(live.meta.lastRun.deferredScorecardReason, /final score has 2 innings but scorecard has 1/);
});

test('standings award one point each for no-result matches', async () => {
  const rebuilt = await rebuildHistoricalState(
    ['match-12'],
    {
      meta: {
        scoreHistory: [{ processedMatchCount: 0, fetchedAt: '2026-04-01T00:00:00.000Z' }]
      }
    },
    {
      includeHistory: true,
      loadScorecard: async () => ({
        data: makeFinalScorecard({
          teams: ['Kolkata Knight Riders', 'Punjab Kings'],
          winner: 'No Winner',
          status: 'No result (due to rain)',
          batter: 'Venkatesh Iyer',
          bowler: 'Arshdeep Singh',
          catcher: 'Andre Russell',
          runs: 25,
          balls: 14,
          sixes: 2,
          wickets: 1,
          concededRuns: 18,
          overs: '3',
          scoreA: 25,
          scoreB: 0
        }),
        source: 'cache'
      })
    }
  );

  const kkr = rebuilt.aggregates.standings['Kolkata Knight Riders'];
  const pbks = rebuilt.aggregates.standings['Punjab Kings'];

  assert.equal(kkr.played, 1);
  assert.equal(pbks.played, 1);
  assert.equal(kkr.noResult, 1);
  assert.equal(pbks.noResult, 1);
  assert.equal(kkr.points, 1);
  assert.equal(pbks.points, 1);
});

test('standings treat super-over-decided ties as wins and losses, not no-results', async () => {
  const rebuilt = await rebuildHistoricalState(
    ['match-38'],
    {
      meta: {
        scoreHistory: [{ processedMatchCount: 0, fetchedAt: '2026-04-01T00:00:00.000Z' }]
      }
    },
    {
      includeHistory: true,
      loadScorecard: async () => ({
        data: makeFinalScorecard({
          teams: ['Lucknow Super Giants', 'Kolkata Knight Riders'],
          winner: 'No Winner',
          status: 'Match tied (Kolkata Knight Riders won the Super Over)',
          batter: 'Rinku Singh',
          bowler: 'Avesh Khan',
          catcher: 'Andre Russell',
          runs: 52,
          balls: 29,
          sixes: 3,
          wickets: 2,
          concededRuns: 28,
          overs: '4',
          scoreA: 155,
          scoreB: 155
        }),
        source: 'cache'
      })
    }
  );

  const lsg = rebuilt.aggregates.standings['Lucknow Super Giants'];
  const kkr = rebuilt.aggregates.standings['Kolkata Knight Riders'];

  assert.equal(kkr.played, 1);
  assert.equal(lsg.played, 1);
  assert.equal(kkr.wins, 1);
  assert.equal(kkr.points, 2);
  assert.equal(kkr.noResult, 0);
  assert.equal(lsg.losses, 1);
  assert.equal(lsg.points, 0);
  assert.equal(lsg.noResult, 0);
});

test('historical replay snapshots apply the 10-ball strike-rate gate and duck penalty in MVP scoring', async () => {
  const rebuilt = await rebuildHistoricalState(
    ['match-14'],
    {
      meta: {
        scoreHistory: [{ processedMatchCount: 0, fetchedAt: '2026-04-01T00:00:00.000Z' }]
      }
    },
    {
      includeHistory: true,
      loadScorecard: async () => ({
        data: {
          teams: ['Mumbai Indians', 'Sunrisers Hyderabad'],
          matchWinner: 'Mumbai Indians',
          status: 'Mumbai Indians won by 12 runs',
          scorecard: [
            {
              batting: [{
                batsman: { name: 'Surya Kumar Yadav' },
                r: 18,
                b: 10,
                '6s': 2,
                dismissal: 'caught'
              }],
              bowling: [{
                bowler: { name: 'Pat Cummins' },
                o: '4',
                w: 2,
                r: 30
              }],
              catching: [{
                catcher: { name: 'Jitesh Sharma' },
                catch: 0,
                stumped: 1
              }],
              extras: {},
              inning: 'Mumbai Indians Inning 1'
            },
            {
              batting: [{
                batsman: { name: 'Travis Head' },
                r: 0,
                b: 1,
                '6s': 0,
                'dismissal-text': 'bowled'
              }],
              bowling: [{
                bowler: { name: 'Jasprit Bumrah' },
                o: '4',
                w: 1,
                r: 18
              }],
              catching: [],
              extras: {},
              inning: 'Sunrisers Hyderabad Inning 1'
            }
          ],
          score: [
            { inning: 'Mumbai Indians Inning 1', r: 150, w: 6, o: '20' },
            { inning: 'Sunrisers Hyderabad Inning 1', r: 138, w: 9, o: '20' }
          ]
        },
        source: 'cache'
      })
    }
  );

  const snapshot = rebuilt.scoreHistory.find((entry) => entry.processedMatchCount === 1)?.snapshot;
  assert.equal(snapshot?.mvp?.values?.['Surya Kumar Yadav']?.score, 30);
  assert.equal(snapshot?.mvp?.values?.['Travis Head']?.score, -5);
  assert.equal(snapshot?.mvp?.values?.['Jitesh Sharma']?.score, 12);
});

test('historical mini fantasy replay canonicalizes split player aliases before diffing match overlays', async () => {
  const baseLive = {
    meta: {
      scoreHistory: [
        {
          processedMatchCount: 31,
          snapshot: {
            meta: {
              aggregates: {
                battingRuns: {
                  'Mohammed Shami': 14
                },
                battingBalls: {
                  'Mohammed Shami': 11
                },
                battingSixes: {
                  'Mohammed Shami': 1
                },
                bowlingWickets: {
                  'Mohammed Shami': 5
                },
                bowlingBalls: {
                  'Mohammed Shami': 138
                },
                bowlingRunsConceded: {
                  'Mohammed Shami': 186
                },
                bowlingDots: {
                  'Mohammad Shami': 66
                },
                playerMatches: {
                  'Mohammed Shami': 6
                }
              }
            }
          }
        },
        {
          processedMatchCount: 32,
          snapshot: {
            meta: {
              aggregates: {
                battingRuns: {
                  'Mohammed Shami': 20
                },
                battingBalls: {
                  'Mohammed Shami': 15
                },
                battingSixes: {
                  'Mohammed Shami': 2
                },
                bowlingWickets: {
                  'Mohammed Shami': 7
                },
                bowlingBalls: {
                  'Mohammed Shami': 162
                },
                bowlingRunsConceded: {
                  'Mohammed Shami': 216
                },
                bowlingDots: {
                  'Mohammad Shami': 81
                },
                playerMatches: {
                  'Mohammed Shami': 7
                }
              }
            }
          }
        }
      ]
    }
  };

  const histories = await buildMiniFantasyPlayerHistoriesFromProcessedMatches(
    Array.from({ length: 32 }, (_, index) => ({
      id: `match-${index + 1}`,
      match_no: index + 1,
      dateTimeGMT: '2026-04-22T14:00:00Z'
    })),
    baseLive,
    {
      loadScorecard: async () => {
        throw new Error('Missing cached scorecard for processed match');
      }
    }
  );

  assert.equal(histories['mohammad shami']?.points_by_match_no?.[32], 72.5);
  assert.equal(histories['mohammad shami']?.matches_played, 1);
  assert.equal(histories['mohammed shami'], undefined);
});

test('live alias repair merges split Auqib Nabi keys from cached snapshots', () => {
  const repaired = repairKnownLivePlayerAliasesDeep({
    mvp: {
      ranking: ['Auqib Nabi', 'Auqib Nabi Dar'],
      values: {
        'Auqib Nabi': {
          score: 15,
          runs: 0,
          dotBalls: 10,
          matches: 0,
          battingStrikeRate: null,
          economy: null,
          bonuses: { economy: 0 }
        },
        'Auqib Nabi Dar': {
          score: -1,
          runs: 4,
          dotBalls: 0,
          matches: 3,
          battingStrikeRate: 200,
          economy: 13.43,
          bonuses: { economy: -5 }
        }
      }
    },
    mostDots: {
      ranking: ['Auqib Nabi'],
      values: {
        'Auqib Nabi': 10
      }
    },
    meta: {
      aggregates: {
        battingRuns: { 'Auqib Nabi Dar': 4 },
        bowlingDots: { 'Auqib Nabi': 10 },
        playerMatches: { 'Auqib Nabi Dar': 3 }
      }
    }
  });

  assert.deepEqual(repaired.mvp.ranking, ['Auqib Nabi']);
  assert.equal(repaired.mvp.values['Auqib Nabi']?.score, 14);
  assert.equal(repaired.mvp.values['Auqib Nabi']?.runs, 4);
  assert.equal(repaired.mvp.values['Auqib Nabi']?.dotBalls, 10);
  assert.equal(repaired.mvp.values['Auqib Nabi']?.matches, 3);
  assert.equal(repaired.mvp.values['Auqib Nabi']?.battingStrikeRate, 200);
  assert.equal(repaired.mvp.values['Auqib Nabi']?.economy, 13.43);
  assert.equal(repaired.mvp.values['Auqib Nabi']?.bonuses?.economy, -5);
  assert.equal(repaired.mvp.values['Auqib Nabi Dar'], undefined);
  assert.equal(repaired.meta.aggregates.battingRuns['Auqib Nabi'], 4);
  assert.equal(repaired.meta.aggregates.bowlingDots['Auqib Nabi'], 10);
  assert.equal(repaired.meta.aggregates.playerMatches['Auqib Nabi'], 3);
});

test('historical mini fantasy replay ignores contaminated pre-match dot snapshots', async () => {
  const baseLive = {
    meta: {
      scoreHistory: [
        {
          processedMatchCount: 34,
          fetchedAt: '2026-04-24T20:10:46.839Z',
          snapshot: {
            meta: {
              aggregates: {
                battingRuns: {},
                battingBalls: {},
                battingSixes: {},
                bowlingWickets: {},
                bowlingBalls: {},
                bowlingRunsConceded: {},
                bowlingDots: {},
                catches: {},
                stumpings: {},
                battingFifties: {},
                battingHundreds: {},
                battingImpact30s: {},
                battingDucks: {},
                bowling3w: {},
                bowling4w: {},
                bowling5w: {},
                playerMatches: {}
              }
            },
            mostDots: {
              values: {
                'Jofra Archer': 75,
                'Nandre Burger': 65
              }
            }
          }
        },
        {
          processedMatchCount: 35,
          fetchedAt: '2026-04-25T17:11:39.861Z',
          snapshot: {
            meta: {
              aggregates: {
                battingRuns: {},
                battingBalls: {},
                battingSixes: {},
                bowlingWickets: {},
                bowlingBalls: {},
                bowlingRunsConceded: {},
                bowlingDots: {},
                catches: {},
                stumpings: {},
                battingFifties: {},
                battingHundreds: {},
                battingImpact30s: {},
                battingDucks: {},
                bowling3w: {},
                bowling4w: {},
                bowling5w: {},
                playerMatches: {}
              }
            },
            mostDots: {
              values: {
                'Jofra Archer': 82,
                'Nandre Burger': 72,
                'Pat Cummins': 12
              }
            }
          }
        },
        {
          processedMatchCount: 36,
          fetchedAt: '2026-04-25T21:54:58.497Z',
          snapshot: {
            meta: {
              aggregates: {
                battingRuns: {},
                battingBalls: {},
                battingSixes: {},
                bowlingWickets: {
                  'Pat Cummins': 1
                },
                bowlingBalls: {
                  'Pat Cummins': 24
                },
                bowlingRunsConceded: {
                  'Pat Cummins': 27
                },
                bowlingDots: {},
                catches: {},
                stumpings: {},
                battingFifties: {},
                battingHundreds: {},
                battingImpact30s: {},
                battingDucks: {},
                bowling3w: {},
                bowling4w: {},
                bowling5w: {},
                playerMatches: {
                  'Pat Cummins': 1
                }
              }
            },
            mostDots: {
              values: {
                'Jofra Archer': 88,
                'Nandre Burger': 74,
                'Pat Cummins': 12
              }
            }
          }
        }
      ]
    }
  };

  const histories = await buildMiniFantasyPlayerHistoriesFromProcessedMatches(
    Array.from({ length: 36 }, (_, index) => ({
      id: `match-${index + 1}`,
      match_no: index + 1,
      dateTimeGMT: index === 34
        ? '2026-04-25T14:00:00Z'
        : index === 35
          ? '2026-04-25T10:00:00Z'
          : '2026-04-20T14:00:00Z'
    })),
    baseLive,
    {
      loadScorecard: async () => {
        throw new Error('Missing cached scorecard for processed match');
      }
    }
  );

  assert.equal(histories['pat cummins']?.points_by_match_no?.[35], undefined);
  assert.equal(histories['pat cummins']?.points_by_match_no?.[36], 43);
  assert.equal(histories['pat cummins']?.matches_played, 1);
});

test('standings still update when scorecard omits the top-level score summary', async () => {
  const rebuilt = await rebuildHistoricalState(
    ['match-13'],
    {
      meta: {
        scoreHistory: [{ processedMatchCount: 0, fetchedAt: '2026-04-01T00:00:00.000Z' }]
      }
    },
    {
      includeHistory: true,
      loadScorecard: async () => ({
        data: makeFinalScorecard({
          teams: ['Rajasthan Royals', 'Mumbai Indians'],
          winner: 'Rajasthan Royals',
          status: 'Rajasthan Royals won by 3 wickets (match reduced to 18 overs due to rain)',
          omitScore: true,
          batter: 'Yashasvi Jaiswal',
          bowler: 'Jasprit Bumrah',
          catcher: 'Sanju Samson',
          runs: 123,
          balls: 90,
          sixes: 7,
          wickets: 2,
          concededRuns: 24,
          overs: '4',
          scoreA: 123,
          scoreB: 96
        }),
        source: 'cache'
      })
    }
  );

  const rr = rebuilt.aggregates.standings['Rajasthan Royals'];
  const mi = rebuilt.aggregates.standings['Mumbai Indians'];

  assert.equal(rr.played, 1);
  assert.equal(rr.wins, 1);
  assert.equal(rr.points, 2);
  assert.equal(mi.played, 1);
  assert.equal(mi.losses, 1);
  assert.equal(rr.runsFor, 123);
  assert.equal(mi.runsFor, 96);
});

test('highest team score canonicalizes malformed inning labels and keeps one max per team', async () => {
  const scorecard = makeFinalScorecard({
    teams: ['Gujarat Titans', 'Rajasthan Royals'],
    winner: 'Rajasthan Royals',
    batter: 'Sai Sudharsan',
    bowler: 'Jofra Archer',
    catcher: 'Sanju Samson',
    runs: 84,
    balls: 51,
    sixes: 4,
    wickets: 2,
    concededRuns: 33,
    overs: '4',
    scoreA: 204,
    scoreB: 210
  });
  scorecard.score = [
    { inning: 'Gujarat Titans,Rajasthan Royals Inning 1', r: 204, w: 4, o: '20' },
    { inning: 'rajasthan royals Inning 1', r: 210, w: 5, o: '20' }
  ];
  scorecard.scorecard[0].inning = 'Gujarat Titans,Rajasthan Royals Inning 1';
  scorecard.scorecard[1].inning = 'rajasthan royals Inning 1';

  const rebuilt = await rebuildHistoricalState(
    ['match-9'],
    {
      meta: {
        scoreHistory: [{ processedMatchCount: 0, fetchedAt: '2026-04-01T00:00:00.000Z' }]
      }
    },
    {
      includeHistory: true,
      loadScorecard: async () => ({ data: scorecard, source: 'cache' })
    }
  );

  assert.deepEqual(rebuilt.aggregates.teamHighestScore, {
    'Gujarat Titans': 204,
    'Rajasthan Royals': 210
  });
});
