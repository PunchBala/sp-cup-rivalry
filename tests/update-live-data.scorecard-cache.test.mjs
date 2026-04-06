import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  canUseFreshScorecardCall,
  findMissingScorecardCaches,
  freshScorecardBudgetRemaining,
  readCachedScorecard,
  rebuildHistoricalState,
  writeCachedScorecard
} from '../scripts/update-live-data.mjs';

function makeFinalScorecard({
  teams,
  winner,
  batter,
  bowler,
  catcher,
  runs,
  balls,
  sixes,
  wickets,
  concededRuns,
  overs,
  scoreA,
  scoreB
}) {
  return {
    teams,
    matchWinner: winner,
    scorecard: [{
      batting: [{
        batsman: { name: batter },
        r: runs,
        b: balls,
        '6s': sixes
      }],
      bowling: [{
        bowler: { name: bowler },
        o: overs,
        w: wickets,
        r: concededRuns
      }],
      catching: [{
        catcher: { name: catcher },
        catch: 1
      }]
    }],
    score: [
      { inning: `${teams[0]} Innings`, r: scoreA, w: 6, o: '20' },
      { inning: `${teams[1]} Innings`, r: scoreB, w: 8, o: '20' }
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
