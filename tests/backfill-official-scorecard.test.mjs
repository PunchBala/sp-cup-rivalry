import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';

import { convertOfficialScorecardInputToProviderShape } from '../scripts/backfill-official-scorecard.mjs';
import {
  buildMiniFantasyPlayerHistoriesFromProcessedMatches,
  rebuildHistoricalState,
  writeCachedScorecard
} from '../scripts/update-live-data.mjs';

async function makeTempCacheDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'manual-official-scorecard-'));
}

test('manual official scorecard conversion derives catches and stumpings from dismissal text', () => {
  const manual = {
    matchNo: 41,
    status: 'Sunrisers Hyderabad won by 6 wkts',
    matchWinner: 'Sunrisers Hyderabad',
    innings: [
      {
        team: 'Mumbai Indians',
        label: 'Mumbai Indians Inning 1',
        totalRuns: 180,
        wickets: 2,
        overs: '20',
        extras: { byes: 0, legByes: 0, wides: 4, noBalls: 0, penalties: 0 },
        batting: [
          { name: 'Will Jacks', dismissalText: 'c Ishan Kishan b Nitish Kumar Reddy', runs: 46, balls: 22, fours: 5, sixes: 3, strikeRate: 209.09 },
          { name: 'Ryan Rickelton', dismissalText: 'st Heinrich Klaasen b Pat Cummins', runs: 80, balls: 45, fours: 8, sixes: 3, strikeRate: 177.78 },
          { name: 'Surya Kumar Yadav', dismissalText: 'not out', runs: 50, balls: 33, fours: 4, sixes: 2, strikeRate: 151.52 }
        ],
        bowling: [
          { name: 'Pat Cummins', overs: '4', maidens: 0, runs: 30, wickets: 1, noBalls: 0, wides: 0, economy: 7.5, dots: 12 },
          { name: 'Nitish Kumar Reddy', overs: '4', maidens: 0, runs: 40, wickets: 1, noBalls: 0, wides: 4, economy: 10, dots: 4 },
          { name: 'Support Bowler', overs: '12', maidens: 0, runs: 110, wickets: 0, noBalls: 0, wides: 0, economy: 9.17, dots: 10 }
        ]
      },
      {
        team: 'Sunrisers Hyderabad',
        label: 'Sunrisers Hyderabad Inning 1',
        totalRuns: 181,
        wickets: 4,
        overs: '19.2',
        extras: { byes: 0, legByes: 1, wides: 2, noBalls: 0, penalties: 0 },
        batting: [
          { name: 'Abhishek Sharma', dismissalText: 'c Hardik Pandya b Jasprit Bumrah', runs: 70, balls: 35, fours: 5, sixes: 4, strikeRate: 200 },
          { name: 'Travis Head', dismissalText: 'c&b Will Jacks', runs: 20, balls: 12, fours: 2, sixes: 1, strikeRate: 166.67 },
          { name: 'Heinrich Klaasen', dismissalText: 'not out', runs: 60, balls: 30, fours: 5, sixes: 3, strikeRate: 200 },
          { name: 'Nitish Kumar Reddy', dismissalText: 'run out (Hardik Pandya)', runs: 10, balls: 7, fours: 0, sixes: 1, strikeRate: 142.86 },
          { name: 'Support Batter', dismissalText: 'b Support Bowler', runs: 18, balls: 32, fours: 1, sixes: 0, strikeRate: 56.25 }
        ],
        bowling: [
          { name: 'Jasprit Bumrah', overs: '4', maidens: 0, runs: 30, wickets: 1, noBalls: 0, wides: 1, economy: 7.5, dots: 8 },
          { name: 'Will Jacks', overs: '4', maidens: 0, runs: 45, wickets: 1, noBalls: 0, wides: 0, economy: 11.25, dots: 3 },
          { name: 'Support Bowler', overs: '11.2', maidens: 0, runs: 105, wickets: 2, noBalls: 0, wides: 1, economy: 9.26, dots: 14 }
        ]
      }
    ]
  };

  const provider = convertOfficialScorecardInputToProviderShape(
    manual,
    {
      id: 'match-41',
      name: 'Mumbai Indians vs Sunrisers Hyderabad, 41st Match, Indian Premier League 2026',
      venue: 'Wankhede Stadium, Mumbai',
      dateTimeGMT: '2026-04-29T14:00:00',
      teams: ['Mumbai Indians', 'Sunrisers Hyderabad']
    },
    {
      teamCodeByName: {
        'mumbai indians': 'MI',
        'sunrisers hyderabad': 'SRH'
      },
      seriesId: 'series-1'
    }
  );

  assert.equal(provider.teamInfo[0].shortname, 'MI');
  assert.equal(provider.teamInfo[1].shortname, 'SRH');
  assert.deepEqual(
    provider.scorecard[0].catching,
    [
      { catcher: { name: 'Ishan Kishan' }, catch: 1, stumped: 0 },
      { catcher: { name: 'Heinrich Klaasen' }, catch: 0, stumped: 1 }
    ]
  );
  assert.deepEqual(
    provider.scorecard[1].catching,
    [
      { catcher: { name: 'Hardik Pandya' }, catch: 1, stumped: 0 },
      { catcher: { name: 'Will Jacks' }, catch: 1, stumped: 0 }
    ]
  );
  assert.equal(provider.scorecard[0].bowling[0].dots, 12);
  assert.equal(provider.scorecard[0].extras.w, 4);
});

test('direct dot balls in cached scorecards flow into manual backfill history rebuilds', async () => {
  const cacheDir = await makeTempCacheDir();
  const scorecard = convertOfficialScorecardInputToProviderShape(
    {
      matchNo: 41,
      status: 'Sunrisers Hyderabad won by 6 wkts',
      matchWinner: 'Sunrisers Hyderabad',
      innings: [
        {
          team: 'Mumbai Indians',
          label: 'Mumbai Indians Inning 1',
          totalRuns: 140,
          wickets: 2,
          overs: '20',
          extras: { byes: 0, legByes: 0, wides: 0, noBalls: 0, penalties: 0 },
          batting: [
            { name: 'Support Batter', dismissalText: 'c Keeper b Pat Cummins', runs: 80, balls: 70, fours: 6, sixes: 3, strikeRate: 114.29 },
            { name: 'Second Batter', dismissalText: 'b Pat Cummins', runs: 60, balls: 50, fours: 4, sixes: 2, strikeRate: 120 }
          ],
          bowling: [
            { name: 'Pat Cummins', overs: '4', maidens: 0, runs: 24, wickets: 2, noBalls: 0, wides: 0, economy: 6, dots: 12 },
            { name: 'Support Bowler', overs: '16', maidens: 0, runs: 116, wickets: 0, noBalls: 0, wides: 0, economy: 7.25, dots: 24 }
          ]
        },
        {
          team: 'Sunrisers Hyderabad',
          label: 'Sunrisers Hyderabad Inning 1',
          totalRuns: 141,
          wickets: 0,
          overs: '15',
          extras: { byes: 0, legByes: 1, wides: 0, noBalls: 0, penalties: 0 },
          batting: [
            { name: 'Abhishek Sharma', dismissalText: 'not out', runs: 70, balls: 45, fours: 8, sixes: 3, strikeRate: 155.56 },
            { name: 'Heinrich Klaasen', dismissalText: 'not out', runs: 70, balls: 44, fours: 5, sixes: 3, strikeRate: 159.09 }
          ],
          bowling: [
            { name: 'Jasprit Bumrah', overs: '4', maidens: 0, runs: 30, wickets: 0, noBalls: 0, wides: 0, economy: 7.5, dots: 6 },
            { name: 'Support Bowler', overs: '11', maidens: 0, runs: 110, wickets: 0, noBalls: 0, wides: 0, economy: 10, dots: 12 }
          ]
        }
      ]
    },
    {
      id: 'match-41',
      name: 'Mumbai Indians vs Sunrisers Hyderabad, 41st Match, Indian Premier League 2026',
      venue: 'Wankhede Stadium, Mumbai',
      dateTimeGMT: '2026-04-29T14:00:00',
      teams: ['Mumbai Indians', 'Sunrisers Hyderabad']
    },
    {
      teamCodeByName: {
        'mumbai indians': 'MI',
        'sunrisers hyderabad': 'SRH'
      }
    }
  );

  await writeCachedScorecard('match-41', scorecard, { cacheDir });

  const histories = await buildMiniFantasyPlayerHistoriesFromProcessedMatches(
    [{ id: 'match-41', match_no: 41, dateTimeGMT: '2026-04-29T14:00:00' }],
    null,
    {
      loadScorecard: async () => ({ source: 'cache', data: scorecard })
    }
  );

  assert.equal(histories['pat cummins'].points_by_match_no[41], 79);

  const rebuilt = await rebuildHistoricalState(
    ['match-41'],
    {
      meta: {
        scoreHistory: [
          {
            processedMatchCount: 0,
            fetchedAt: '2026-04-28T00:00:00Z',
            snapshot: { meta: { aggregates: { bowlingDots: {} } }, mostDots: { values: {} } }
          },
          {
            processedMatchCount: 1,
            fetchedAt: '2026-04-29T00:00:00Z',
            snapshot: { meta: { aggregates: { bowlingDots: { 'Pat Cummins': 4 } } }, mostDots: { values: { 'Pat Cummins': 4 } } }
          }
        ]
      }
    },
    {
      includeHistory: true,
      loadScorecard: async () => ({ source: 'cache', data: scorecard })
    }
  );

  assert.equal(rebuilt.aggregates.bowlingDots['pat cummins'], 12);
});
