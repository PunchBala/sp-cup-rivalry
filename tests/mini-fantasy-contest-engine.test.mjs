import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MINI_FANTASY_BUDGET,
  buildMiniFantasyLeaderboard,
  buildMiniFantasyPlayerId,
  buildFixturePlayerPool,
  deriveCompletedMatchHistories,
  generateMiniFantasyPriceBook,
  getMiniFantasyOpenFixtures,
  validateMiniFantasyEntry
} from '../mini-fantasy/contest-engine.js';

test('deriveCompletedMatchHistories keeps zero-point appearances when playerMatches advanced', () => {
  const liveData = {
    meta: {
      scoreHistory: [
        {
          processedMatchCount: 1,
          snapshot: {
            meta: {
              aggregates: {
                playerMatches: {
                  'Player A': 1,
                  'Player B': 1
                }
              }
            },
            mvp: {
              values: {
                'Player A': { score: 40 },
                'Player B': { score: 5 }
              }
            }
          }
        },
        {
          processedMatchCount: 2,
          snapshot: {
            meta: {
              aggregates: {
                playerMatches: {
                  'Player A': 2,
                  'Player B': 1,
                  'Player C': 1
                }
              }
            },
            mvp: {
              values: {
                'Player A': { score: 40 },
                'Player B': { score: 5 },
                'Player C': { score: 60 }
              }
            }
          }
        }
      ]
    }
  };

  const schedule = [
    { match_no: 1, datetime_utc: '2026-04-08T14:00:00Z' },
    { match_no: 2, datetime_utc: '2026-04-09T14:00:00Z' }
  ];

  const histories = deriveCompletedMatchHistories(liveData, schedule);
  assert.deepEqual(histories.get('player a')?.match_points, [40, 0]);
  assert.equal(histories.get('player a')?.matches_played, 2);
  assert.deepEqual(histories.get('player b')?.match_points, [5]);
  assert.deepEqual(histories.get('player c')?.match_points, [60]);
});

test('getMiniFantasyOpenFixtures opens Match 14 now and later fixtures from the day-before window', () => {
  const schedule = [
    { match_no: 13, datetime_utc: '2026-04-07T14:00:00Z', home_team: 'Mumbai Indians', away_team: 'Rajasthan Royals' },
    { match_no: 14, datetime_utc: '2026-04-08T14:00:00Z', home_team: 'Delhi Capitals', away_team: 'Gujarat Titans' },
    { match_no: 15, datetime_utc: '2026-04-09T14:00:00Z', home_team: 'Kolkata Knight Riders', away_team: 'Lucknow Super Giants' },
    { match_no: 16, datetime_utc: '2026-04-10T14:00:00Z', home_team: 'Rajasthan Royals', away_team: 'Royal Challengers Bengaluru' }
  ];

  const openNow = getMiniFantasyOpenFixtures(schedule, new Date('2026-04-06T10:00:00Z'));
  assert.equal(openNow.launch.is_live, true);
  assert.deepEqual(openNow.fixtures.map((fixture) => fixture.match_no), [14]);

  const afterLaunch = getMiniFantasyOpenFixtures(schedule, new Date('2026-04-08T08:00:00Z'));
  assert.equal(afterLaunch.launch.is_live, true);
  assert.deepEqual(afterLaunch.fixtures.map((fixture) => fixture.match_no), [14, 15]);

  const nearLock = getMiniFantasyOpenFixtures(schedule, new Date('2026-04-08T13:59:00Z'));
  assert.deepEqual(nearLock.fixtures.map((fixture) => fixture.match_no), [15]);
});

test('validateMiniFantasyEntry enforces budget, team split, and role minimums', () => {
  const fixture = {
    home_team: 'Delhi Capitals',
    away_team: 'Gujarat Titans',
    home_team_code: 'DC',
    away_team_code: 'GT'
  };
  const pool = [
    { player_id: 'dc_a', name: 'DC Batter', team: 'DC', role: 'batter', final_price: 8, pricing_eligible: true },
    { player_id: 'dc_b', name: 'DC Bowler', team: 'DC', role: 'bowler', final_price: 7, pricing_eligible: true },
    { player_id: 'gt_a', name: 'GT All-rounder', team: 'GT', role: 'all_rounder', final_price: 7, pricing_eligible: true },
    { player_id: 'gt_b', name: 'GT Keeper', team: 'GT', role: 'wicket_keeper', final_price: 6, pricing_eligible: true },
    { player_id: 'gt_c', name: 'GT Bowler', team: 'GT', role: 'bowler', final_price: 10, pricing_eligible: true }
  ];

  const valid = validateMiniFantasyEntry({
    fixture,
    selectedPlayerIds: ['dc_a', 'dc_b', 'gt_a', 'gt_b'],
    captainPlayerId: 'dc_a',
    playerPool: pool
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.total_cost, 28);
  assert.equal(valid.budget_remaining, MINI_FANTASY_BUDGET - 28);

  const invalid = validateMiniFantasyEntry({
    fixture,
    selectedPlayerIds: ['dc_a', 'dc_b', 'gt_c', 'gt_b'],
    captainPlayerId: 'gt_c',
    playerPool: pool,
    budget: 30
  });
  assert.equal(invalid.valid, false);
  assert.match(invalid.errors.join(' | '), /Squad budget exceeded/);
});

test('generateMiniFantasyPriceBook and buildFixturePlayerPool work from live history plus squad roles', () => {
  const liveData = {
    fetchedAt: '2026-04-08T00:10:00Z',
    meta: {
      scoreHistory: [
        {
          processedMatchCount: 1,
          snapshot: {
            meta: { aggregates: { playerMatches: { 'DC Batter': 1, 'GT Bowler': 1 } } },
            mvp: { values: { 'DC Batter': { score: 62 }, 'GT Bowler': { score: 18 } } }
          }
        }
      ]
    }
  };
  const schedule = [
    {
      match_no: 14,
      datetime_utc: '2026-04-08T14:00:00Z',
      home_team: 'Delhi Capitals',
      away_team: 'Gujarat Titans'
    }
  ];
  const squads = {
    DC: ['DC Batter', 'DC Bowler'],
    GT: ['GT Bowler', 'GT Keeper']
  };
  const teamRoles = {
    teams: {
      DC: { players: { 'DC Batter': 'batter', 'DC Bowler': 'bowler' } },
      GT: { players: { 'GT Bowler': 'bowler', 'GT Keeper': 'wicket_keeper' } }
    }
  };

  const priceBook = generateMiniFantasyPriceBook({
    liveData,
    schedule,
    squads,
    teamRoles,
    asOfUtc: '2026-04-08T00:10:00Z'
  });

  assert.equal(priceBook.players.length, 4);
  assert.equal(priceBook.summary.total_players_received, 4);

  const pool = buildFixturePlayerPool({
    fixture: {
      match_no: 14,
      home_team: 'Delhi Capitals',
      away_team: 'Gujarat Titans',
      home_team_code: 'DC',
      away_team_code: 'GT'
    },
    priceBook,
    squads,
    teamRoles
  });

  assert.equal(pool.length, 4);
  assert.equal(pool[0].team <= pool[pool.length - 1].team, true);
});

test('generateMiniFantasyPriceBook marks uncapped players and caps them at 9 credits', () => {
  const liveData = {
    fetchedAt: '2026-04-08T00:10:00Z',
    meta: {
      scoreHistory: [
        {
          processedMatchCount: 1,
          snapshot: {
            meta: { aggregates: { playerMatches: { 'Sameer Rizvi': 1, 'Veteran Bowler': 1 } } },
            mvp: { values: { 'Sameer Rizvi': { score: 105 }, 'Veteran Bowler': { score: 30 } } }
          }
        },
        {
          processedMatchCount: 2,
          snapshot: {
            meta: { aggregates: { playerMatches: { 'Sameer Rizvi': 2, 'Veteran Bowler': 2 } } },
            mvp: { values: { 'Sameer Rizvi': { score: 207 }, 'Veteran Bowler': { score: 62 } } }
          }
        }
      ]
    }
  };
  const schedule = [
    {
      match_no: 14,
      datetime_utc: '2026-04-08T14:00:00Z',
      home_team: 'Delhi Capitals',
      away_team: 'Mumbai Indians'
    }
  ];
  const squads = {
    DC: ['Sameer Rizvi'],
    MI: ['Veteran Bowler']
  };
  const teamRoles = {
    teams: {
      DC: { players: { 'Sameer Rizvi': 'batter' } },
      MI: { players: { 'Veteran Bowler': 'bowler' } }
    }
  };

  const priceBook = generateMiniFantasyPriceBook({
    liveData,
    schedule,
    squads,
    teamRoles,
    asOfUtc: '2026-04-08T00:10:00Z'
  });

  const sameer = priceBook.players.find((player) => player.player_id === buildMiniFantasyPlayerId('DC', 'Sameer Rizvi'));
  assert.equal(sameer.is_uncapped, true);
  assert.equal(sameer.final_price, 9);
  assert.match(sameer.calculation_notes.join(' '), /uncapped player price ceiling applied at 9 credits/i);
});

test('buildMiniFantasyLeaderboard ranks saved users by scored mini fantasy points', () => {
  const liveData = {
    meta: {
      scoreHistory: [
        {
          processedMatchCount: 14,
          snapshot: {
            meta: {
              aggregates: {
                playerMatches: {
                  'DC Batter': 1,
                  'DC Bowler': 1,
                  'GT Bowler': 1,
                  'GT Keeper': 1
                }
              }
            },
            mvp: {
              values: {
                'DC Batter': { score: 40 },
                'DC Bowler': { score: 20 },
                'GT Bowler': { score: 10 },
                'GT Keeper': { score: 12 }
              }
            }
          }
        }
      ]
    }
  };
  const schedule = [
    { match_no: 14, datetime_utc: '2026-04-08T14:00:00Z', home_team: 'Delhi Capitals', away_team: 'Gujarat Titans' }
  ];
  const squads = {
    DC: ['DC Batter', 'DC Bowler'],
    GT: ['GT Bowler', 'GT Keeper']
  };

  const leaderboard = buildMiniFantasyLeaderboard({
    entries: [
      {
        ownerHandle: 'senthil',
        matchNo: 14,
        selectedPlayerIds: [
          buildMiniFantasyPlayerId('DC', 'DC Batter'),
          buildMiniFantasyPlayerId('DC', 'DC Bowler'),
          buildMiniFantasyPlayerId('GT', 'GT Bowler'),
          buildMiniFantasyPlayerId('GT', 'GT Keeper')
        ],
        captainPlayerId: buildMiniFantasyPlayerId('DC', 'DC Batter')
      },
      {
        ownerHandle: 'sai',
        matchNo: 14,
        selectedPlayerIds: [
          buildMiniFantasyPlayerId('DC', 'DC Batter'),
          buildMiniFantasyPlayerId('DC', 'DC Bowler'),
          buildMiniFantasyPlayerId('GT', 'GT Bowler'),
          buildMiniFantasyPlayerId('GT', 'GT Keeper')
        ],
        captainPlayerId: buildMiniFantasyPlayerId('GT', 'GT Keeper')
      }
    ],
    liveData,
    schedule,
    squads
  });

  assert.equal(leaderboard.completed_match_count, 14);
  assert.equal(leaderboard.rows[0].owner_handle, 'senthil');
  assert.equal(leaderboard.rows[0].medal, 'gold');
  assert.equal(leaderboard.rows[1].medal, 'silver');
  assert.equal(leaderboard.rows[0].total_points, 102);
  assert.equal(leaderboard.rows[1].total_points, 88);
});
