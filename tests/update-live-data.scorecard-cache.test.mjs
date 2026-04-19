import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  endedUnprocessedMatches,
  canUseFreshScorecardCall,
  findMissingScorecardCaches,
  freshScorecardBudgetRemaining,
  inferProcessedMatchKeys,
  buildMiniFantasyPlayerHistoriesFromProcessedMatches,
  matchKeyForMatch,
  readCachedScorecard,
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
        source: matchId === 'match-1' ? 'cache' : 'api'
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

test('mini fantasy histories score batting strike-rate bonus from the fixture itself', async () => {
  const histories = await buildMiniFantasyPlayerHistoriesFromProcessedMatches(
    [
      { id: 'match-1', match_no: 1, dateTimeGMT: '2026-04-18T10:00:00Z' },
      { id: 'match-2', match_no: 2, dateTimeGMT: '2026-04-19T10:00:00Z' }
    ],
    null,
    {
      loadScorecard: async (matchId) => ({
        data: matchId === 'match-1'
          ? makeFinalScorecard({
            teams: ['Rajasthan Royals', 'Kolkata Knight Riders'],
            winner: 'Rajasthan Royals',
            batter: 'Vaibhav Suryavanshi',
            bowler: 'Varun Chakaravarthy',
            catcher: 'Sanju Samson',
            runs: 10,
            balls: 15,
            sixes: 0,
            wickets: 1,
            concededRuns: 22,
            overs: '4',
            scoreA: 150,
            scoreB: 141
          })
          : makeFinalScorecard({
            teams: ['Rajasthan Royals', 'Kolkata Knight Riders'],
            winner: 'Rajasthan Royals',
            batter: 'Vaibhav Suryavanshi',
            bowler: 'Varun Chakaravarthy',
            catcher: 'Sanju Samson',
            runs: 46,
            balls: 28,
            sixes: 2,
            wickets: 1,
            concededRuns: 14,
            overs: '4',
            scoreA: 189,
            scoreB: 161
          }),
        source: 'cache'
      })
    }
  );

  assert.equal(histories['vaibhav suryavanshi']?.points_by_match_no?.[2], 55);
});

test('mini fantasy histories score bowling economy bonus from the fixture itself', async () => {
  const histories = await buildMiniFantasyPlayerHistoriesFromProcessedMatches(
    [
      { id: 'match-1', match_no: 1, dateTimeGMT: '2026-04-19T10:00:00Z' }
    ],
    null,
    {
      loadScorecard: async () => ({
        data: makeFinalScorecard({
          teams: ['Rajasthan Royals', 'Kolkata Knight Riders'],
          winner: 'Kolkata Knight Riders',
          batter: 'Yashasvi Jaiswal',
          bowler: 'Varun Chakaravarthy',
          catcher: 'Sunil Narine',
          runs: 32,
          balls: 22,
          sixes: 1,
          wickets: 3,
          concededRuns: 14,
          overs: '4',
          scoreA: 161,
          scoreB: 189
        }),
        source: 'cache'
      })
    }
  );

  assert.equal(histories['varun chakaravarthy']?.points_by_match_no?.[1], 80);
});

test('mini fantasy histories store points under fallback processed matchNo values', async () => {
  const histories = await buildMiniFantasyPlayerHistoriesFromProcessedMatches(
    [
      { id: 'match-40', matchNo: 40, dateTimeGMT: '2026-05-01T10:00:00Z' }
    ],
    null,
    {
      loadScorecard: async () => ({
        data: makeFinalScorecard({
          teams: ['Royal Challengers Bengaluru', 'Mumbai Indians'],
          winner: 'Royal Challengers Bengaluru',
          batter: 'Phil Salt',
          bowler: 'Jasprit Bumrah',
          catcher: 'Rajat Patidar',
          runs: 30,
          balls: 18,
          sixes: 2,
          wickets: 1,
          concededRuns: 24,
          overs: '4',
          scoreA: 182,
          scoreB: 161
        }),
        source: 'cache'
      })
    }
  );

  assert.equal(histories['phil salt']?.points_by_match_no?.[40], 39);
  assert.equal(histories['phil salt']?.points_by_match_no?.[1], undefined);
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
