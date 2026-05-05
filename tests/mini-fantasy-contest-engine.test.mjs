import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MINI_FANTASY_BUDGET,
  MINI_FANTASY_NEW_PLAYER_BASELINE_POINTS,
  buildMiniFantasyEntryAuditLog,
  buildMiniFantasyLeaderboard,
  buildMiniFantasyFixturePointsIndex,
  buildMiniFantasyPlayerRecordFromStats,
  buildMiniFantasyPlayerPointsIndex,
  buildMiniFantasyPlayerId,
  buildFixturePlayerPool,
  generateMiniFantasyOpenFixturePriceSnapshots,
  calculateMiniFantasyMissedLockPoints,
  deriveCompletedMatchHistories,
  generateMiniFantasyPriceBook,
  getMiniFantasyFixtureOpenAtUtc,
  getMiniFantasyOpenFixtures,
  getMiniFantasyWinningTeamCode,
  resolvePlayerHistory,
  serializeMiniFantasyLeaderboardRows,
  scoreMiniFantasyEntry,
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

test('getMiniFantasyWinningTeamCode treats super-over-decided ties as real winners', () => {
  const liveData = {
    meta: {
      cache: {
        matchList: [
          {
            matchNo: 38,
            status: 'Match tied (Kolkata Knight Riders won the Super Over)',
            teams: ['Lucknow Super Giants', 'Kolkata Knight Riders']
          }
        ]
      }
    }
  };
  const schedule = [
    {
      match_no: 38,
      home_team: 'Lucknow Super Giants',
      away_team: 'Kolkata Knight Riders'
    }
  ];

  assert.equal(
    getMiniFantasyWinningTeamCode({ liveData, schedule, matchNo: 38 }),
    'KKR'
  );
});

test('buildMiniFantasyPlayerRecordFromStats uses the same live scoring breakdown as the fixture engine', () => {
  const record = buildMiniFantasyPlayerRecordFromStats({
    runs: 52,
    battingBalls: 28,
    fours: 4,
    sixes: 3,
    wickets: 2,
    bowlingBalls: 24,
    runsConceded: 18,
    catches: 1,
    dotBalls: 9,
    dismissed: true
  });

  assert.equal(record.appeared, true);
  assert.equal(record.points, 167.5);
  assert.deepEqual(record.base_breakdown, {
    runs: 52,
    fours: 4,
    sixes: 3,
    wickets: 2,
    dot_balls: 9,
    catches: 1,
    stumpings: 0,
    batting_balls: 28,
    bowling_balls: 24,
    bowling_runs_conceded: 18,
    milestone_counts: {
      batting50s: 1,
      batting100s: 0,
      impact30s: 1,
      bowling3w: 0,
      bowling4w: 0,
      bowling5w: 0,
      ducks: 0
    },
    runs_points: 52,
    four_bonus_points: 4,
    sixes_bonus_points: 6,
    wicket_points: 50,
    dot_ball_points: 13.5,
    catch_points: 8,
    stumping_points: 0,
    strike_rate_bonus_points: 8,
    economy_bonus_points: 8,
    milestone_bonus_points: 18,
    duck_penalty_points: 0,
    total_points: 167.5
  });
});

test('deriveCompletedMatchHistories ignores stale precomputed histories when scoreHistory has newer completed matches', () => {
  const liveData = {
    meta: {
      miniFantasyPlayerHistories: {
        'player a': {
          player_name: 'Player A',
          match_points: [40],
          points_by_match_no: { 1: 40 },
          matches_played: 1,
          last_match_played_at_utc: '2026-04-08T14:00:00Z'
        },
        'player b': {
          player_name: 'Player B',
          match_points: [5],
          points_by_match_no: { 1: 5 },
          matches_played: 1,
          last_match_played_at_utc: '2026-04-08T14:00:00Z'
        }
      },
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

test('resolvePlayerHistory matches safe alias variations used by squad lists', () => {
  const liveData = {
    meta: {
      scoreHistory: [
        {
          processedMatchCount: 1,
          snapshot: {
            meta: {
              aggregates: {
                playerMatches: {
                  'Mohammed Shami': 1,
                  'Manimaran Siddharth': 1,
                  'Digvesh Singh Rathi': 1,
                  'Vijaykumar Vyshak': 1,
                  'Tilak Varma': 1,
                  'Vaibhav Sooryavanshi': 1,
                  'Suryakumar Yadav': 1,
                  'AM Ghazanfar': 1,
                  'Auqib Nabi Dar': 1,
                  'Philip Salt': 1,
                  'Lungi Ngidi': 1,
                  'Lhuan-dre Pretorius': 1
                }
              }
            },
            mvp: {
              values: {
                'Mohammed Shami': { score: 20 },
                'Manimaran Siddharth': { score: 30 },
                'Digvesh Singh Rathi': { score: 10 },
                'Vijaykumar Vyshak': { score: 25 },
                'Tilak Varma': { score: 15 },
                'Vaibhav Sooryavanshi': { score: 52 },
                'Suryakumar Yadav': { score: 33 },
                'AM Ghazanfar': { score: 44 },
                'Auqib Nabi Dar': { score: 14 },
                'Philip Salt': { score: 49 },
                'Lungi Ngidi': { score: 28 },
                'Lhuan-dre Pretorius': { score: 35 }
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
                  'Mohammed Shami': 2,
                  'Manimaran Siddharth': 1,
                  'Digvesh Singh Rathi': 1,
                  'Vijaykumar Vyshak': 2,
                  'Tilak Varma': 2,
                  'Vaibhav Sooryavanshi': 1,
                  'Suryakumar Yadav': 2,
                  'AM Ghazanfar': 2,
                  'Auqib Nabi': 2,
                  'Philip Salt': 2,
                  'Lungisani Ngidi': 1,
                  'Lungi Ngidi': 1,
                  'Lhuan-dre Pretorius': 2
                }
              }
            },
            mvp: {
              values: {
                'Mohammed Shami': { score: 50 },
                'Manimaran Siddharth': { score: 30 },
                'Digvesh Singh Rathi': { score: 10 },
                'Vijaykumar Vyshak': { score: 60 },
                'Tilak Varma': { score: 25 },
                'Vaibhav Sooryavanshi': { score: 52 },
                'Suryakumar Yadav': { score: 83 },
                'AM Ghazanfar': { score: 96 },
                'Auqib Nabi': { score: 23 },
                'Philip Salt': { score: 67 },
                'Lungisani Ngidi': { score: 51 },
                'Lungi Ngidi': { score: 79 },
                'Lhuan-dre Pretorius': { score: 80 }
              }
            }
          }
        }
      ]
    }
  };

  const histories = deriveCompletedMatchHistories(liveData, [
    { match_no: 1, datetime_utc: '2026-04-01T14:00:00Z' },
    { match_no: 2, datetime_utc: '2026-04-02T14:00:00Z' }
  ]);

  assert.deepEqual(resolvePlayerHistory('Mohammad Shami', histories)?.match_points, [20, 30]);
  assert.deepEqual(resolvePlayerHistory('M. Siddharth', histories)?.match_points, [30]);
  assert.deepEqual(resolvePlayerHistory('Digvesh Singh', histories)?.match_points, [10]);
  assert.deepEqual(resolvePlayerHistory('Vyshak Vijaykumar', histories)?.match_points, [25, 35]);
  assert.deepEqual(resolvePlayerHistory('N. Tilak Varma', histories)?.match_points, [15, 10]);
  assert.deepEqual(resolvePlayerHistory('Vaibhav Suryavanshi', histories)?.match_points, [52]);
  assert.deepEqual(resolvePlayerHistory('Surya Kumar Yadav', histories)?.match_points, [33, 50]);
  assert.deepEqual(resolvePlayerHistory('Allah Ghazanfar', histories)?.match_points, [44, 52]);
  assert.deepEqual(resolvePlayerHistory('Auqib Nabi', histories)?.match_points, [14, 9]);
  assert.deepEqual(resolvePlayerHistory('Phil Salt', histories)?.match_points, [49, 18]);
  assert.deepEqual(resolvePlayerHistory('Lungisani Ngidi', histories)?.match_points, [28, 51]);
  assert.deepEqual(resolvePlayerHistory('Lhuan-dre Pretorious', histories)?.match_points, [35, 45]);
});

test('buildMiniFantasyPlayerPointsIndex keeps completed fixture points for Surya Kumar Yadav aliases', () => {
  const liveData = {
    meta: {
      scoreHistory: [
        {
          processedMatchCount: 1,
          fetchedAt: '2026-04-01T17:00:00Z',
          snapshot: {
            meta: {
              aggregates: {
                playerMatches: {
                  'Suryakumar Yadav': 1
                }
              }
            },
            mvp: {
              values: {
                'Suryakumar Yadav': { score: 33 }
              }
            }
          }
        },
        {
          processedMatchCount: 2,
          fetchedAt: '2026-04-02T17:00:00Z',
          snapshot: {
            meta: {
              aggregates: {
                playerMatches: {
                  'Suryakumar Yadav': 2
                }
              }
            },
            mvp: {
              values: {
                'Suryakumar Yadav': { score: 83 }
              }
            }
          }
        }
      ]
    }
  };
  const schedule = [
    { match_no: 1, datetime_utc: '2026-04-01T14:00:00Z' },
    { match_no: 2, datetime_utc: '2026-04-02T14:00:00Z' }
  ];
  const squads = {
    MI: ['Surya Kumar Yadav']
  };

  const pointsIndex = buildMiniFantasyPlayerPointsIndex({
    liveData,
    schedule,
    squads
  });

  assert.deepEqual(pointsIndex.get(buildMiniFantasyPlayerId('MI', 'Surya Kumar Yadav')), {
    player_id: buildMiniFantasyPlayerId('MI', 'Surya Kumar Yadav'),
    name: 'Surya Kumar Yadav',
    team: 'MI',
    match_points: [33, 50],
    points_by_match_no: { 1: 33, 2: 50 },
    matches_played: 2,
    last_match_played_at_utc: '2026-04-02T14:00:00Z'
  });
});

test('scoreMiniFantasyEntry keeps completed fixture points for legacy alias player ids', () => {
  const liveData = {
    meta: {
      scoreHistory: [
        {
          processedMatchCount: 1,
          fetchedAt: '2026-04-01T17:00:00Z',
          snapshot: {
            meta: {
              aggregates: {
                playerMatches: {
                  'Philip Salt': 1
                }
              }
            },
            mvp: {
              values: {
                'Philip Salt': { score: 49 }
              }
            }
          }
        }
      ]
    }
  };
  const schedule = [
    { match_no: 1, datetime_utc: '2026-04-01T14:00:00Z', home_team: 'Royal Challengers Bengaluru', away_team: 'Mumbai Indians' }
  ];
  const squads = {
    RCB: ['Phil Salt']
  };

  const score = scoreMiniFantasyEntry({
    entry: {
      matchNo: 1,
      selectedPlayerIds: [buildMiniFantasyPlayerId('RCB', 'Philip Salt')],
      captainPlayerId: buildMiniFantasyPlayerId('RCB', 'Philip Salt')
    },
    liveData,
    schedule,
    squads
  });

  assert.equal(score.points_by_player_id[buildMiniFantasyPlayerId('RCB', 'Philip Salt')], 49);
  assert.equal(score.appeared_by_player_id[buildMiniFantasyPlayerId('RCB', 'Philip Salt')], true);
  assert.equal(score.scored_points_by_player_id[buildMiniFantasyPlayerId('RCB', 'Philip Salt')], 76.5);
  assert.equal(score.total_points, 76.5);
});

test('buildMiniFantasyFixturePointsIndex merges split precomputed alias histories for completed fixtures', () => {
  const liveData = {
    meta: {
      miniFantasyPlayerHistories: {
        'mohammad shami': {
          player_name: 'Mohammad Shami',
          match_points: [99, 22.5],
          points_by_match_no: { 1: 99, 32: 22.5 },
          matches_played: 2,
          last_match_played_at_utc: '2026-04-22T14:00:00Z'
        },
        'mohammed shami': {
          player_name: 'Mohammed Shami',
          match_points: [23, 48, 14, 34, -5, 23, 50],
          points_by_match_no: { 5: 23, 10: 48, 15: 14, 19: 34, 23: -5, 29: 23, 32: 50 },
          matches_played: 7,
          last_match_played_at_utc: '2026-04-22T14:00:00Z'
        }
      },
      scoreHistory: [
        {
          processedMatchCount: 32
        }
      ],
      cache: {
        matchList: [
          {
            matchNo: 32,
            status: 'Rajasthan Royals won by 40 runs',
            teams: ['Rajasthan Royals', 'Lucknow Super Giants']
          }
        ]
      }
    }
  };
  const schedule = [
    {
      match_no: 32,
      datetime_utc: '2026-04-22T14:00:00Z',
      home_team: 'Rajasthan Royals',
      away_team: 'Lucknow Super Giants'
    }
  ];
  const squads = {
    LSG: ['Mohammad Shami']
  };

  const pointsIndex = buildMiniFantasyFixturePointsIndex({
    liveData,
    schedule,
    squads,
    matchNo: 32
  });
  const shamiId = buildMiniFantasyPlayerId('LSG', 'Mohammad Shami');
  const score = scoreMiniFantasyEntry({
    entry: {
      matchNo: 32,
      selectedPlayerIds: [shamiId],
      captainPlayerId: ''
    },
    liveData,
    schedule,
    squads
  });

  assert.equal(pointsIndex.get(shamiId), 72.5);
  assert.equal(score.points_by_player_id[shamiId], 72.5);
  assert.equal(score.scored_points_by_player_id[shamiId], 74.5);
  assert.equal(score.total_points, 74.5);
});

test('buildMiniFantasyFixturePointsIndex does not collide same-initial same-surname players', () => {
  const schedule = [
    { match_no: 15, datetime_utc: '2026-04-09T14:00:00Z' },
    { match_no: 16, datetime_utc: '2026-04-10T14:00:00Z' }
  ];
  const squads = {
    RCB: ['Suyash Sharma'],
    RR: ['Sandeep Sharma']
  };
  const liveData = {
    meta: {
      scoreHistory: [
        {
          processedMatchCount: 15,
          snapshot: {
            meta: {
              aggregates: {
                playerMatches: {
                  'Suyash Sharma': 2,
                  'Sandeep Sharma': 3
                }
              }
            },
            mvp: {
              values: {
                'Suyash Sharma': { score: 64.5 },
                'Sandeep Sharma': { score: 69.5 }
              }
            }
          }
        },
        {
          processedMatchCount: 16,
          snapshot: {
            meta: {
              aggregates: {
                playerMatches: {
                  'Suyash Sharma': 2,
                  'Sandeep Sharma': 4
                }
              }
            },
            mvp: {
              values: {
                'Suyash Sharma': { score: 64.5 },
                'Sandeep Sharma': { score: 95 }
              }
            }
          }
        }
      ]
    }
  };

  const pointsIndex = buildMiniFantasyFixturePointsIndex({
    liveData,
    schedule,
    squads,
    matchNo: 16
  });

  assert.equal(pointsIndex.get(buildMiniFantasyPlayerId('RCB', 'Suyash Sharma')), 0);
  assert.equal(pointsIndex.get(buildMiniFantasyPlayerId('RR', 'Sandeep Sharma')), 25.5);
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

test('getMiniFantasyFixtureOpenAtUtc honors an explicit fixture override without affecting the day-before default', () => {
  const fixture = {
    match_no: 39,
    datetime_utc: '2026-04-27T14:00:00Z',
    mini_fantasy_opens_at_utc: '2026-04-26T15:00:00Z'
  };

  assert.equal(getMiniFantasyFixtureOpenAtUtc(fixture), '2026-04-26T15:00:00.000Z');
  assert.equal(
    getMiniFantasyFixtureOpenAtUtc({ match_no: 40, datetime_utc: '2026-04-28T14:00:00Z' }),
    '2026-04-27T00:00:00.000Z'
  );
});

test('generateMiniFantasyOpenFixturePriceSnapshots preserves already-open fixture prices across later global refreshes', () => {
  const schedule = [
    {
      match_no: 39,
      datetime_utc: '2026-04-27T14:00:00Z',
      home_team: 'Royal Challengers Bengaluru',
      away_team: 'Delhi Capitals',
      mini_fantasy_opens_at_utc: '2026-04-26T15:00:00Z'
    },
    {
      match_no: 40,
      datetime_utc: '2026-04-28T14:00:00Z',
      home_team: 'Rajasthan Royals',
      away_team: 'Punjab Kings',
      mini_fantasy_opens_at_utc: '2026-04-27T11:00:00Z'
    }
  ];
  const squads = {
    RCB: ['Virat Kohli'],
    DC: ['KL Rahul'],
    RR: ['Vaibhav Suryavanshi'],
    PBKS: ['Shreyas Iyer']
  };
  const teamRoles = {
    teams: {
      RCB: { players: { 'Virat Kohli': 'batter' } },
      DC: { players: { 'KL Rahul': 'wicket_keeper' } },
      RR: { players: { 'Vaibhav Suryavanshi': 'batter' } },
      PBKS: { players: { 'Shreyas Iyer': 'batter' } }
    }
  };
  const initialPriceBook = {
    generated_at_utc: '2026-04-26T15:05:00Z',
    players: [
      { player_id: buildMiniFantasyPlayerId('RCB', 'Virat Kohli'), final_price: 9 },
      { player_id: buildMiniFantasyPlayerId('DC', 'KL Rahul'), final_price: 8.5 },
      { player_id: buildMiniFantasyPlayerId('RR', 'Vaibhav Suryavanshi'), final_price: 9 },
      { player_id: buildMiniFantasyPlayerId('PBKS', 'Shreyas Iyer'), final_price: 9 }
    ]
  };

  const initialSnapshots = generateMiniFantasyOpenFixturePriceSnapshots({
    schedule,
    squads,
    teamRoles,
    priceBook: initialPriceBook,
    asOfUtc: '2026-04-27T08:00:00Z'
  });

  const refreshedPriceBook = {
    generated_at_utc: '2026-04-27T18:00:00Z',
    players: [
      { player_id: buildMiniFantasyPlayerId('RCB', 'Virat Kohli'), final_price: 9.5 },
      { player_id: buildMiniFantasyPlayerId('DC', 'KL Rahul'), final_price: 9.5 },
      { player_id: buildMiniFantasyPlayerId('RR', 'Vaibhav Suryavanshi'), final_price: 8.5 },
      { player_id: buildMiniFantasyPlayerId('PBKS', 'Shreyas Iyer'), final_price: 9.5 }
    ]
  };

  const refreshedSnapshots = generateMiniFantasyOpenFixturePriceSnapshots({
    schedule,
    squads,
    teamRoles,
    priceBook: refreshedPriceBook,
    previousSnapshots: initialSnapshots,
    asOfUtc: '2026-04-27T12:00:00Z'
  });

  const byMatch = new Map(refreshedSnapshots.fixtures.map((fixture) => [fixture.match_no, fixture]));
  assert.equal(byMatch.get(39).price_snapshot[buildMiniFantasyPlayerId('RCB', 'Virat Kohli')].final_price, 9);
  assert.equal(byMatch.get(39).price_snapshot[buildMiniFantasyPlayerId('DC', 'KL Rahul')].final_price, 8.5);
  assert.equal(byMatch.get(40).price_snapshot[buildMiniFantasyPlayerId('RR', 'Vaibhav Suryavanshi')].final_price, 8.5);
  assert.equal(byMatch.get(40).price_snapshot[buildMiniFantasyPlayerId('PBKS', 'Shreyas Iyer')].final_price, 9.5);
});

test('generateMiniFantasyOpenFixturePriceSnapshots adds newly available fixture players without repricing existing open ones', () => {
  const schedule = [
    {
      match_no: 39,
      datetime_utc: '2026-04-27T14:00:00Z',
      home_team: 'Royal Challengers Bengaluru',
      away_team: 'Delhi Capitals',
      mini_fantasy_opens_at_utc: '2026-04-26T15:00:00Z'
    }
  ];
  const initialSquads = {
    RCB: ['Virat Kohli'],
    DC: ['KL Rahul']
  };
  const refreshedSquads = {
    RCB: ['Virat Kohli', 'Jacob Bethell'],
    DC: ['KL Rahul']
  };
  const teamRoles = {
    teams: {
      RCB: { players: { 'Virat Kohli': 'batter', 'Jacob Bethell': 'all_rounder' } },
      DC: { players: { 'KL Rahul': 'wicket_keeper' } }
    }
  };
  const initialPriceBook = {
    generated_at_utc: '2026-04-26T15:05:00Z',
    players: [
      { player_id: buildMiniFantasyPlayerId('RCB', 'Virat Kohli'), final_price: 9 },
      { player_id: buildMiniFantasyPlayerId('DC', 'KL Rahul'), final_price: 8.5 }
    ]
  };
  const initialSnapshots = generateMiniFantasyOpenFixturePriceSnapshots({
    schedule,
    squads: initialSquads,
    teamRoles,
    priceBook: initialPriceBook,
    asOfUtc: '2026-04-27T08:00:00Z'
  });
  const refreshedPriceBook = {
    generated_at_utc: '2026-04-27T18:00:00Z',
    players: [
      { player_id: buildMiniFantasyPlayerId('RCB', 'Virat Kohli'), final_price: 9.5 },
      { player_id: buildMiniFantasyPlayerId('RCB', 'Jacob Bethell'), final_price: 7.5 },
      { player_id: buildMiniFantasyPlayerId('DC', 'KL Rahul'), final_price: 9.5 }
    ]
  };

  const refreshedSnapshots = generateMiniFantasyOpenFixturePriceSnapshots({
    schedule,
    squads: refreshedSquads,
    teamRoles,
    priceBook: refreshedPriceBook,
    previousSnapshots: initialSnapshots,
    asOfUtc: '2026-04-27T10:00:00Z'
  });

  const snapshot = refreshedSnapshots.fixtures[0].price_snapshot;
  assert.equal(snapshot[buildMiniFantasyPlayerId('RCB', 'Virat Kohli')].final_price, 9);
  assert.equal(snapshot[buildMiniFantasyPlayerId('DC', 'KL Rahul')].final_price, 8.5);
  assert.equal(snapshot[buildMiniFantasyPlayerId('RCB', 'Jacob Bethell')].final_price, 7.5);
});

test('buildMiniFantasyFixturePointsIndex derives live match points from the current snapshot delta', () => {
  const schedule = [
    { match_no: 14, datetime_utc: '2026-04-08T14:00:00Z' },
    { match_no: 15, datetime_utc: '2026-04-09T14:00:00Z' }
  ];
  const squads = {
    GT: ['Mohammed Shami', 'Sai Sudharsan'],
    DC: ['Kuldeep Yadav']
  };
  const liveData = {
    fetchedAt: '2026-04-09T15:15:00Z',
    meta: {
      scoreHistory: [
        {
          processedMatchCount: 14,
          snapshot: {
            meta: {
              aggregates: {
                playerMatches: {
                  'Mohammed Shami': 2,
                  'Sai Sudharsan': 2,
                  'Kuldeep Yadav': 2
                }
              }
            },
            mvp: {
              values: {
                'Mohammed Shami': { score: 45 },
                'Sai Sudharsan': { score: 80 },
                'Kuldeep Yadav': { score: 34 }
              }
            }
          }
        }
      ],
      aggregates: {
        playerMatches: {
          'Mohammed Shami': 3,
          'Sai Sudharsan': 3,
          'Kuldeep Yadav': 2
        }
      }
    },
    mvp: {
      values: {
        'Mohammed Shami': { score: 63 },
        'Sai Sudharsan': { score: 95 },
        'Kuldeep Yadav': { score: 34 }
      }
    }
  };

  const pointsIndex = buildMiniFantasyFixturePointsIndex({
    liveData,
    schedule,
    squads,
    matchNo: 15
  });

  assert.equal(pointsIndex.get(buildMiniFantasyPlayerId('GT', 'Mohammed Shami')), 18);
  assert.equal(pointsIndex.get(buildMiniFantasyPlayerId('GT', 'Sai Sudharsan')), 15);
  assert.equal(pointsIndex.get(buildMiniFantasyPlayerId('DC', 'Kuldeep Yadav')), 0);
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
    { player_id: 'dc_c', name: 'DC All-rounder', team: 'DC', role: 'all_rounder', final_price: 5, pricing_eligible: true },
    { player_id: 'gt_a', name: 'GT All-rounder', team: 'GT', role: 'all_rounder', final_price: 7, pricing_eligible: true },
    { player_id: 'gt_b', name: 'GT Keeper', team: 'GT', role: 'wicket_keeper', final_price: 6, pricing_eligible: true },
    { player_id: 'gt_c', name: 'GT Bowler', team: 'GT', role: 'bowler', final_price: 10, pricing_eligible: true }
  ];

  const valid = validateMiniFantasyEntry({
    fixture,
    selectedPlayerIds: ['dc_b', 'gt_a', 'gt_b', 'gt_c'],
    captainPlayerId: 'gt_b',
    playerPool: pool
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.total_cost, 30);
  assert.equal(valid.budget_remaining, MINI_FANTASY_BUDGET - 30);

  const halfCreditValid = validateMiniFantasyEntry({
    fixture,
    selectedPlayerIds: ['dc_a', 'dc_b', 'gt_a', 'gt_b'],
    captainPlayerId: 'dc_a',
    playerPool: [
      ...pool.filter((player) => player.player_id !== 'dc_a' && player.player_id !== 'dc_b' && player.player_id !== 'gt_a' && player.player_id !== 'gt_b'),
      { player_id: 'dc_a', name: 'DC Batter', team: 'DC', role: 'batter', final_price: 8.5, pricing_eligible: true },
      { player_id: 'dc_b', name: 'DC Bowler', team: 'DC', role: 'bowler', final_price: 7.5, pricing_eligible: true },
      { player_id: 'gt_a', name: 'GT All-rounder', team: 'GT', role: 'all_rounder', final_price: 8.5, pricing_eligible: true },
      { player_id: 'gt_b', name: 'GT Keeper', team: 'GT', role: 'wicket_keeper', final_price: 6, pricing_eligible: true }
    ]
  });
  assert.equal(halfCreditValid.valid, true);
  assert.equal(halfCreditValid.total_cost, 30.5);
  assert.equal(halfCreditValid.budget_remaining, 0.5);

  const invalid = validateMiniFantasyEntry({
    fixture,
    selectedPlayerIds: ['dc_b', 'dc_c', 'gt_a', 'gt_c'],
    captainPlayerId: 'gt_c',
    playerPool: pool,
    budget: MINI_FANTASY_BUDGET - 3
  });
  assert.equal(invalid.valid, false);
  assert.match(invalid.errors.join(' | '), /Squad budget exceeded/);
  assert.match(invalid.errors.join(' | '), /batter or wicket keeper/);
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
  assert.equal(priceBook.players.find((player) => player.name === 'DC Batter')?.season_total_points, 62);
  assert.equal(priceBook.players.find((player) => player.name === 'GT Bowler')?.season_total_points, 18);
  assert.equal(priceBook.players.find((player) => player.name === 'DC Batter')?.last_match_points, 62);
  assert.equal(priceBook.players.find((player) => player.name === 'GT Bowler')?.last_match_points, 18);

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
  assert.equal(pool.find((player) => player.name === 'DC Batter')?.season_total_points, 62);
  assert.equal(pool.find((player) => player.name === 'GT Bowler')?.season_total_points, 18);
  assert.equal(pool.find((player) => player.name === 'DC Batter')?.last_match_points, 62);
  assert.equal(pool.find((player) => player.name === 'GT Bowler')?.last_match_points, 18);

  const legacyPriceBook = {
    ...priceBook,
    players: priceBook.players.map((player) => {
      const legacyPlayer = { ...player };
      delete legacyPlayer.season_total_points;
      return legacyPlayer;
    })
  };

  const legacyPool = buildFixturePlayerPool({
    fixture: {
      match_no: 14,
      home_team: 'Delhi Capitals',
      away_team: 'Gujarat Titans',
      home_team_code: 'DC',
      away_team_code: 'GT'
    },
    priceBook: legacyPriceBook,
    squads,
    teamRoles
  });

  assert.equal(legacyPool.find((player) => player.name === 'DC Batter')?.season_total_points, 62);
  assert.equal(legacyPool.find((player) => player.name === 'GT Bowler')?.season_total_points, 18);
});

test('generateMiniFantasyPriceBook matches Allah Ghazanfar against AM Ghazanfar history', () => {
  const liveData = {
    fetchedAt: '2026-04-18T00:10:00Z',
    meta: {
      scoreHistory: [
        {
          processedMatchCount: 1,
          snapshot: {
            meta: {
              aggregates: {
                playerMatches: {
                  'AM Ghazanfar': 1
                }
              }
            },
            mvp: {
              values: {
                'AM Ghazanfar': { score: 44 }
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
                  'AM Ghazanfar': 2
                }
              }
            },
            mvp: {
              values: {
                'AM Ghazanfar': { score: 96 }
              }
            }
          }
        }
      ]
    }
  };
  const schedule = [
    { match_no: 1, datetime_utc: '2026-04-10T14:00:00Z', home_team: 'Mumbai Indians', away_team: 'Chennai Super Kings' },
    { match_no: 2, datetime_utc: '2026-04-12T14:00:00Z', home_team: 'Mumbai Indians', away_team: 'Delhi Capitals' }
  ];
  const squads = {
    MI: ['Allah Ghazanfar']
  };
  const teamRoles = {
    teams: {
      MI: { players: { 'Allah Ghazanfar': 'bowler' } }
    }
  };

  const priceBook = generateMiniFantasyPriceBook({
    liveData,
    schedule,
    squads,
    teamRoles,
    asOfUtc: '2026-04-18T00:10:00Z'
  });

  const player = priceBook.players.find((entry) => entry.name === 'Allah Ghazanfar');
  assert.ok(player);
  assert.equal(player.matches_played, 2);
  assert.equal(player.season_total_points, 96);
  assert.equal(player.last_match_points, 52);
  assert.equal(player.final_price > 6, true);
});

test('generateMiniFantasyPriceBook matches Phil Salt and Lungisani Ngidi against split history aliases', () => {
  const liveData = {
    fetchedAt: '2026-04-18T00:10:00Z',
    meta: {
      scoreHistory: [
        {
          processedMatchCount: 1,
          snapshot: {
            meta: {
              aggregates: {
                playerMatches: {
                  'Philip Salt': 1,
                  'Lungi Ngidi': 1
                }
              }
            },
            mvp: {
              values: {
                'Philip Salt': { score: 49 },
                'Lungi Ngidi': { score: 28 }
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
                  'Philip Salt': 2,
                  'Lungi Ngidi': 1,
                  'Lungisani Ngidi': 1
                }
              }
            },
            mvp: {
              values: {
                'Philip Salt': { score: 67 },
                'Lungi Ngidi': { score: 28 },
                'Lungisani Ngidi': { score: 51 }
              }
            }
          }
        }
      ]
    }
  };
  const schedule = [
    { match_no: 1, datetime_utc: '2026-04-17T14:00:00Z' },
    { match_no: 2, datetime_utc: '2026-04-18T14:00:00Z' }
  ];
  const squads = {
    RCB: ['Phil Salt'],
    DC: ['Lungisani Ngidi']
  };
  const teamRoles = {
    teams: {
      RCB: { players: { 'Phil Salt': 'wicket_keeper' } },
      DC: { players: { 'Lungisani Ngidi': 'bowler' } }
    }
  };

  const priceBook = generateMiniFantasyPriceBook({
    liveData,
    schedule,
    squads,
    teamRoles,
    asOfUtc: '2026-04-18T00:10:00Z'
  });

  const salt = priceBook.players.find((entry) => entry.name === 'Phil Salt');
  const ngidi = priceBook.players.find((entry) => entry.name === 'Lungisani Ngidi');
  assert.ok(salt);
  assert.equal(salt.matches_played, 2);
  assert.equal(salt.season_total_points, 67);
  assert.equal(salt.last_match_points, 18);
  assert.ok(ngidi);
  assert.equal(ngidi.matches_played, 2);
  assert.equal(ngidi.season_total_points, 79);
  assert.equal(ngidi.last_match_points, 51);
});

test('generateMiniFantasyPriceBook matches Lhuan-dre Pretorious against Pretorius history', () => {
  const liveData = {
    fetchedAt: '2026-04-18T00:10:00Z',
    meta: {
      scoreHistory: [
        {
          processedMatchCount: 1,
          snapshot: {
            meta: {
              aggregates: {
                playerMatches: {
                  'Lhuan-dre Pretorius': 1
                }
              }
            },
            mvp: {
              values: {
                'Lhuan-dre Pretorius': { score: 35 }
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
                  'Lhuan-dre Pretorius': 2
                }
              }
            },
            mvp: {
              values: {
                'Lhuan-dre Pretorius': { score: 80 }
              }
            }
          }
        }
      ]
    }
  };
  const schedule = [
    { match_no: 1, datetime_utc: '2026-04-17T14:00:00Z' },
    { match_no: 2, datetime_utc: '2026-04-18T14:00:00Z' }
  ];
  const squads = {
    RR: ['Lhuan-dre Pretorious']
  };
  const teamRoles = {
    teams: {
      RR: { players: { 'Lhuan-dre Pretorius': 'wicket_keeper' } }
    }
  };

  const priceBook = generateMiniFantasyPriceBook({
    liveData,
    schedule,
    squads,
    teamRoles,
    asOfUtc: '2026-04-18T00:10:00Z'
  });

  const pretorious = priceBook.players.find((entry) => entry.name === 'Lhuan-dre Pretorious');
  assert.ok(pretorious);
  assert.equal(pretorious.matches_played, 2);
  assert.equal(pretorious.season_total_points, 80);
  assert.equal(pretorious.last_match_points, 45);
});

test('generateMiniFantasyPriceBook marks uncapped players and caps them at 9.5 credits', () => {
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
    asOfUtc: '2026-04-08T00:10:00Z',
    jobMeta: {
      rank_price_buckets: [
        { price: 10, slots: 1 },
        { price: 9.5, slots: 1 }
      ]
    }
  });

  const sameer = priceBook.players.find((player) => player.player_id === buildMiniFantasyPlayerId('DC', 'Sameer Rizvi'));
  assert.equal(sameer.is_uncapped, true);
  assert.equal(sameer.final_price, 9.5);
  assert.match(sameer.calculation_notes.join(' '), /uncapped player price ceiling applied at 9.5 credits/i);
});

test('generateMiniFantasyPriceBook penalizes players who keep missing team fixtures', () => {
  const liveData = {
    fetchedAt: '2026-04-10T00:10:00Z',
    meta: {
      scoreHistory: [
        {
          processedMatchCount: 14,
          snapshot: {
            meta: { aggregates: { playerMatches: { 'Active Star': 1 } } },
            mvp: { values: { 'Active Star': { score: 50 } } }
          }
        },
        {
          processedMatchCount: 15,
          snapshot: {
            meta: { aggregates: { playerMatches: { 'Active Star': 2 } } },
            mvp: { values: { 'Active Star': { score: 105 } } }
          }
        },
        {
          processedMatchCount: 16,
          snapshot: {
            meta: { aggregates: { playerMatches: { 'Active Star': 3 } } },
            mvp: { values: { 'Active Star': { score: 150 } } }
          }
        }
      ]
    }
  };
  const schedule = [
    { match_no: 14, datetime_utc: '2026-04-08T14:00:00Z', home_team: 'Kolkata Knight Riders', away_team: 'Mumbai Indians' },
    { match_no: 15, datetime_utc: '2026-04-09T14:00:00Z', home_team: 'Kolkata Knight Riders', away_team: 'Delhi Capitals' },
    { match_no: 16, datetime_utc: '2026-04-10T14:00:00Z', home_team: 'Lucknow Super Giants', away_team: 'Kolkata Knight Riders' }
  ];
  const squads = {
    KKR: ['Active Star', 'Missed Bench']
  };
  const teamRoles = {
    teams: {
      KKR: {
        players: {
          'Active Star': 'batter',
          'Missed Bench': 'batter'
        }
      }
    }
  };

  const priceBook = generateMiniFantasyPriceBook({
    liveData,
    schedule,
    squads,
    teamRoles,
    asOfUtc: '2026-04-10T00:10:00Z',
    jobMeta: {
      rank_price_buckets: [
        { price: 10, slots: 1 },
        { price: 5, slots: 1 }
      ]
    }
  });

  const missedBench = priceBook.players.find((player) => player.player_id === buildMiniFantasyPlayerId('KKR', 'Missed Bench'));
  assert.equal(missedBench.matches_played, 0);
  assert.equal(missedBench.missed_fixture_streak, 3);
  assert.equal(missedBench.target_price, 4.5);
  assert.equal(missedBench.final_price, 4.5);
  assert.match(missedBench.calculation_notes.join(' '), /missed-fixture penalty/i);
});

test('generateMiniFantasyPriceBook skips no-result fixtures when counting missed streaks', () => {
  const liveData = {
    fetchedAt: '2026-04-10T00:10:00Z',
    meta: {
      cache: {
        matchList: [
          {
            matchNo: 15,
            status: 'No result (due to rain)',
            teams: ['Kolkata Knight Riders', 'Delhi Capitals']
          }
        ]
      },
      scoreHistory: [
        {
          processedMatchCount: 14,
          snapshot: {
            meta: { aggregates: { playerMatches: { 'Active Star': 1 } } },
            mvp: { values: { 'Active Star': { score: 50 } } }
          }
        },
        {
          processedMatchCount: 15,
          snapshot: {
            meta: { aggregates: { playerMatches: { 'Active Star': 1 } } },
            mvp: { values: { 'Active Star': { score: 50 } } }
          }
        },
        {
          processedMatchCount: 16,
          snapshot: {
            meta: { aggregates: { playerMatches: { 'Active Star': 2 } } },
            mvp: { values: { 'Active Star': { score: 105 } } }
          }
        }
      ]
    }
  };
  const schedule = [
    { match_no: 14, datetime_utc: '2026-04-08T14:00:00Z', home_team: 'Kolkata Knight Riders', away_team: 'Mumbai Indians' },
    { match_no: 15, datetime_utc: '2026-04-09T14:00:00Z', home_team: 'Kolkata Knight Riders', away_team: 'Delhi Capitals' },
    { match_no: 16, datetime_utc: '2026-04-10T14:00:00Z', home_team: 'Lucknow Super Giants', away_team: 'Kolkata Knight Riders' }
  ];
  const squads = {
    KKR: ['Active Star', 'Missed Bench']
  };
  const teamRoles = {
    teams: {
      KKR: {
        players: {
          'Active Star': 'batter',
          'Missed Bench': 'batter'
        }
      }
    }
  };

  const priceBook = generateMiniFantasyPriceBook({
    liveData,
    schedule,
    squads,
    teamRoles,
    asOfUtc: '2026-04-10T00:10:00Z',
    jobMeta: {
      rank_price_buckets: [
        { price: 10, slots: 1 },
        { price: 6, slots: 1 }
      ]
    }
  });

  const missedBench = priceBook.players.find((player) => player.player_id === buildMiniFantasyPlayerId('KKR', 'Missed Bench'));
  assert.equal(missedBench.matches_played, 0);
  assert.equal(missedBench.missed_fixture_streak, 2);
  assert.equal(missedBench.target_price, 5.5);
  assert.equal(missedBench.final_price, 5.5);
  assert.match(missedBench.calculation_notes.join(' '), /missed-fixture penalty/i);
});

test('generateMiniFantasyPriceBook keeps alias-matched LSG bowlers from falling back to blank stats', () => {
  const liveData = {
    fetchedAt: '2026-04-08T00:10:00Z',
    meta: {
      scoreHistory: [
        {
          processedMatchCount: 5,
          snapshot: {
            meta: {
              aggregates: {
                playerMatches: {
                  'Mohammed Shami': 1,
                  'Manimaran Siddharth': 1,
                  'Veteran Bowler': 1
                }
              }
            },
            mvp: {
              values: {
                'Mohammed Shami': { score: 23 },
                'Manimaran Siddharth': { score: 30 },
                'Veteran Bowler': { score: 10 }
              }
            }
          }
        },
        {
          processedMatchCount: 10,
          snapshot: {
            meta: {
              aggregates: {
                playerMatches: {
                  'Mohammed Shami': 2,
                  'Manimaran Siddharth': 1,
                  'Veteran Bowler': 2
                }
              }
            },
            mvp: {
              values: {
                'Mohammed Shami': { score: 69 },
                'Manimaran Siddharth': { score: 30 },
                'Veteran Bowler': { score: 20 }
              }
            }
          }
        }
      ]
    }
  };
  const schedule = [
    { match_no: 5, datetime_utc: '2026-04-01T14:00:00Z', home_team: 'Lucknow Super Giants', away_team: 'Mumbai Indians' },
    { match_no: 10, datetime_utc: '2026-04-05T14:00:00Z', home_team: 'Lucknow Super Giants', away_team: 'Rajasthan Royals' },
    { match_no: 14, datetime_utc: '2026-04-08T14:00:00Z', home_team: 'Lucknow Super Giants', away_team: 'Delhi Capitals' }
  ];
  const squads = {
    LSG: ['Mohammad Shami', 'M. Siddharth'],
    DC: ['Veteran Bowler']
  };
  const teamRoles = {
    teams: {
      LSG: {
        players: {
          'Mohammad Shami': 'bowler',
          'M. Siddharth': 'bowler'
        }
      },
      DC: {
        players: {
          'Veteran Bowler': 'bowler'
        }
      }
    }
  };

  const priceBook = generateMiniFantasyPriceBook({
    liveData,
    schedule,
    squads,
    teamRoles,
    asOfUtc: '2026-04-08T00:10:00Z'
  });

  const shami = priceBook.players.find((player) => player.player_id === buildMiniFantasyPlayerId('LSG', 'Mohammad Shami'));
  const siddharth = priceBook.players.find((player) => player.player_id === buildMiniFantasyPlayerId('LSG', 'M. Siddharth'));

  assert.equal(shami.matches_played, 2);
  assert.equal(shami.last_match_played_at_utc, '2026-04-05T14:00:00Z');
  assert.ok(shami.final_price > 6);
  assert.equal(siddharth.matches_played, 1);
  assert.equal(siddharth.last_match_played_at_utc, '2026-04-01T14:00:00Z');
});

test('buildMiniFantasyLeaderboard ranks saved users by scored mini fantasy points', () => {
  const liveData = {
    meta: {
      cache: {
        matchList: [
          {
            matchNo: 14,
            status: 'Delhi Capitals won by 6 wkts',
            teams: ['Delhi Capitals', 'Gujarat Titans']
          }
        ]
      },
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
        displayName: 'Senthil',
        matchNo: 14,
        spentCredits: 30.5,
        savedAt: '2026-04-08T13:58:00Z',
        selectedPlayerIds: [
          buildMiniFantasyPlayerId('DC', 'DC Batter'),
          buildMiniFantasyPlayerId('DC', 'DC Bowler'),
          buildMiniFantasyPlayerId('GT', 'GT Bowler'),
          buildMiniFantasyPlayerId('GT', 'GT Keeper')
        ],
        captainPlayerId: buildMiniFantasyPlayerId('DC', 'DC Batter'),
        priceSnapshot: {
          [buildMiniFantasyPlayerId('DC', 'DC Batter')]: { name: 'DC Batter', team: 'DC', role: 'batter', final_price: 9 },
          [buildMiniFantasyPlayerId('DC', 'DC Bowler')]: { name: 'DC Bowler', team: 'DC', role: 'bowler', final_price: 7 },
          [buildMiniFantasyPlayerId('GT', 'GT Bowler')]: { name: 'GT Bowler', team: 'GT', role: 'bowler', final_price: 6 },
          [buildMiniFantasyPlayerId('GT', 'GT Keeper')]: { name: 'GT Keeper', team: 'GT', role: 'wicket_keeper', final_price: 8.5 }
        }
      },
      {
        ownerHandle: 'sai',
        displayName: 'Sai',
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
  assert.equal(leaderboard.rows[0].display_name, 'Senthil');
  assert.equal(leaderboard.rows[0].medal, 'gold');
  assert.equal(leaderboard.rows[1].medal, 'silver');
  assert.equal(leaderboard.rows[0].total_points, 123.5);
  assert.equal(leaderboard.rows[1].total_points, 107);
  assert.equal(leaderboard.rows[0].matches[0].source, 'locked_entry');
  assert.equal(leaderboard.rows[0].matches[0].spent_credits, 30.5);
  assert.equal(leaderboard.rows[0].matches[0].saved_at, '2026-04-08T13:58:00Z');
  assert.equal(leaderboard.rows[0].matches[0].audit_log.players.length, 4);
  assert.equal(leaderboard.rows[0].matches[0].audit_log.captain_player_id, buildMiniFantasyPlayerId('DC', 'DC Batter'));
  assert.equal(leaderboard.rows[0].matches[0].audit_log.best_pick_player_id, buildMiniFantasyPlayerId('DC', 'DC Batter'));
  assert.equal(leaderboard.rows[0].matches[0].audit_log.players[0].captain_multiplier, 1.5);
  assert.equal(leaderboard.rows[0].matches[0].audit_log.players[0].scored_points, 70.5);
});

test('buildMiniFantasyEntryAuditLog includes per-player score breakdown, captain, credits, and save timestamp', () => {
  const entry = {
    matchNo: 14,
    spentCredits: 30.5,
    savedAt: '2026-04-08T13:58:00Z',
    selectedPlayerIds: [
      buildMiniFantasyPlayerId('DC', 'DC Batter'),
      buildMiniFantasyPlayerId('DC', 'DC Bowler'),
      buildMiniFantasyPlayerId('GT', 'GT Bowler'),
      buildMiniFantasyPlayerId('GT', 'GT Keeper')
    ],
    captainPlayerId: buildMiniFantasyPlayerId('DC', 'DC Batter'),
    priceSnapshot: {
      [buildMiniFantasyPlayerId('DC', 'DC Batter')]: { name: 'DC Batter', team: 'DC', role: 'batter', final_price: 9 },
      [buildMiniFantasyPlayerId('DC', 'DC Bowler')]: { name: 'DC Bowler', team: 'DC', role: 'bowler', final_price: 7 },
      [buildMiniFantasyPlayerId('GT', 'GT Bowler')]: { name: 'GT Bowler', team: 'GT', role: 'bowler', final_price: 6 },
      [buildMiniFantasyPlayerId('GT', 'GT Keeper')]: { name: 'GT Keeper', team: 'GT', role: 'wicket_keeper', final_price: 8.5 }
    }
  };
  const score = {
    total_points: 123.5,
    is_no_result: false,
    winning_team_code: 'DC',
    appearance_bonus_points: 8,
    winner_bonus_points: 10,
    points_by_player_id: {
      [buildMiniFantasyPlayerId('DC', 'DC Batter')]: 40,
      [buildMiniFantasyPlayerId('DC', 'DC Bowler')]: 20,
      [buildMiniFantasyPlayerId('GT', 'GT Bowler')]: 10,
      [buildMiniFantasyPlayerId('GT', 'GT Keeper')]: 12
    },
    appearance_bonus_by_player_id: {
      [buildMiniFantasyPlayerId('DC', 'DC Batter')]: 2,
      [buildMiniFantasyPlayerId('DC', 'DC Bowler')]: 2,
      [buildMiniFantasyPlayerId('GT', 'GT Bowler')]: 2,
      [buildMiniFantasyPlayerId('GT', 'GT Keeper')]: 2
    },
    winner_bonus_by_player_id: {
      [buildMiniFantasyPlayerId('DC', 'DC Batter')]: 5,
      [buildMiniFantasyPlayerId('DC', 'DC Bowler')]: 5,
      [buildMiniFantasyPlayerId('GT', 'GT Bowler')]: 0,
      [buildMiniFantasyPlayerId('GT', 'GT Keeper')]: 0
    },
    eligible_points_by_player_id: {
      [buildMiniFantasyPlayerId('DC', 'DC Batter')]: 47,
      [buildMiniFantasyPlayerId('DC', 'DC Bowler')]: 27,
      [buildMiniFantasyPlayerId('GT', 'GT Bowler')]: 12,
      [buildMiniFantasyPlayerId('GT', 'GT Keeper')]: 14
    },
    scored_points_by_player_id: {
      [buildMiniFantasyPlayerId('DC', 'DC Batter')]: 70.5,
      [buildMiniFantasyPlayerId('DC', 'DC Bowler')]: 27,
      [buildMiniFantasyPlayerId('GT', 'GT Bowler')]: 12,
      [buildMiniFantasyPlayerId('GT', 'GT Keeper')]: 14
    },
    base_breakdown_by_player_id: {
      [buildMiniFantasyPlayerId('DC', 'DC Batter')]: {
        runs_points: 40,
        sixes_bonus_points: 0,
        wicket_points: 0,
        dot_ball_points: 0,
        catch_points: 0,
        stumping_points: 0,
        strike_rate_bonus_points: 0,
        economy_bonus_points: 0,
        milestone_bonus_points: 0,
        duck_penalty_points: 0,
        total_points: 40
      }
    }
  };

  const audit = buildMiniFantasyEntryAuditLog({ entry, score });

  assert.equal(audit.version, 'mini_fantasy_entry_audit_v1');
  assert.equal(audit.spent_credits, 30.5);
  assert.equal(audit.saved_at, '2026-04-08T13:58:00Z');
  assert.equal(audit.captain_player_id, buildMiniFantasyPlayerId('DC', 'DC Batter'));
  assert.equal(audit.best_pick_player_id, buildMiniFantasyPlayerId('DC', 'DC Batter'));
  assert.equal(audit.players[0].name, 'DC Batter');
  assert.equal(audit.players[0].appearance_bonus, 2);
  assert.equal(audit.players[0].winner_bonus, 5);
  assert.equal(audit.players[0].eligible_points, 47);
  assert.equal(audit.players[0].captain_multiplier, 1.5);
  assert.equal(audit.players[0].scored_points, 70.5);
  assert.equal(audit.players[0].base_breakdown.runs_points, 40);
  assert.equal(audit.players[0].base_breakdown.total_points, 40);
});

test('buildMiniFantasyEntryAuditLog derives base breakdown from score history snapshots when score detail is absent', () => {
  const playerId = buildMiniFantasyPlayerId('DC', 'DC Batter');
  const liveData = {
    meta: {
      scoreHistory: [
        {
          processedMatchCount: 13,
          snapshot: {
            meta: {
              aggregates: {
                playerMatches: {
                  'DC Batter': 1
                }
              }
            },
            mvp: {
              values: {
                'DC Batter': {
                  score: 50,
                  runs: 50,
                  sixes: 1,
                  wickets: 0,
                  dotBalls: 0,
                  catches: 0,
                  stumpings: 0,
                  bonuses: {
                    sr: 0,
                    economy: 0,
                    ducks: 0,
                    batting50s: 1,
                    batting100s: 0,
                    impact30s: 0,
                    bowling3w: 0,
                    bowling4w: 0,
                    bowling5w: 0
                  }
                }
              }
            }
          }
        },
        {
          processedMatchCount: 14,
          snapshot: {
            meta: {
              aggregates: {
                playerMatches: {
                  'DC Batter': 2
                }
              }
            },
            mvp: {
              values: {
                'DC Batter': {
                  score: 97,
                  runs: 80,
                  sixes: 3,
                  wickets: 0,
                  dotBalls: 0,
                  catches: 1,
                  stumpings: 0,
                  bonuses: {
                    sr: 5,
                    economy: 0,
                    ducks: 0,
                    batting50s: 1,
                    batting100s: 0,
                    impact30s: 0,
                    bowling3w: 0,
                    bowling4w: 0,
                    bowling5w: 0
                  }
                }
              }
            }
          }
        }
      ]
    }
  };
  const entry = {
    matchNo: 14,
    selectedPlayerIds: [playerId],
    captainPlayerId: '',
    priceSnapshot: {
      [playerId]: { name: 'DC Batter', team: 'DC', role: 'batter', final_price: 9 }
    }
  };
  const schedule = [
    { match_no: 14, datetime_utc: '2026-04-08T14:00:00Z', home_team: 'Delhi Capitals', away_team: 'Gujarat Titans' }
  ];
  const squads = {
    DC: ['DC Batter']
  };

  const audit = buildMiniFantasyEntryAuditLog({ entry, liveData, schedule, squads });

  assert.equal(audit.players[0].points, 47);
  assert.equal(audit.players[0].base_breakdown.runs_points, 30);
  assert.equal(audit.players[0].base_breakdown.sixes_bonus_points, 4);
  assert.equal(audit.players[0].base_breakdown.catch_points, 8);
  assert.equal(audit.players[0].base_breakdown.strike_rate_bonus_points, 5);
  assert.equal(audit.players[0].base_breakdown.total_points, 47);
});

test('buildMiniFantasyEntryAuditLog resolves aggregate breakdowns across Mohammed-name drift', () => {
  const playerId = buildMiniFantasyPlayerId('GT', 'Mohammed Siraj');
  const liveData = {
    meta: {
      scoreHistory: [
        {
          processedMatchCount: 41,
          snapshot: {
            meta: {
              aggregates: {
                playerMatches: {
                  'Mohammed Siraj': 8
                },
                bowlingWickets: {
                  'Mohammed Siraj': 8
                },
                bowlingBalls: {
                  'Mohammed Siraj': 174
                },
                bowlingRunsConceded: {
                  'Mohammed Siraj': 230
                },
                bowlingDots: {
                  'mohammed siraj': 98
                },
                catches: {
                  'Mohammed Siraj': 3
                },
                battingDucks: {
                  'Mohammed Siraj': 1
                }
              }
            },
            mvp: {
              values: {
                'Mohammed Siraj': {
                  score: 161,
                  runs: 0,
                  sixes: 0,
                  wickets: 8,
                  dotBalls: 0,
                  catches: 3,
                  stumpings: 0,
                  bonuses: {
                    sr: 0,
                    economy: 2,
                    ducks: 1,
                    batting50s: 0,
                    batting100s: 0,
                    impact30s: 0,
                    bowling3w: 0,
                    bowling4w: 0,
                    bowling5w: 0
                  }
                }
              }
            }
          }
        },
        {
          processedMatchCount: 42,
          snapshot: {
            meta: {
              aggregates: {
                playerMatches: {
                  'Mohammed Siraj': 9
                },
                bowlingWickets: {
                  'Mohammed Siraj': 9
                },
                bowlingBalls: {
                  'Mohammed Siraj': 198
                },
                bowlingRunsConceded: {
                  'Mohammed Siraj': 268
                },
                bowlingDots: {
                  'mohammed siraj': 110
                },
                catches: {
                  'Mohammed Siraj': 3
                },
                battingDucks: {
                  'Mohammed Siraj': 1
                }
              }
            },
            mvp: {
              values: {
                'Mohammed Siraj': {
                  score: 199,
                  runs: 0,
                  sixes: 0,
                  wickets: 9,
                  dotBalls: 0,
                  catches: 3,
                  stumpings: 0,
                  bonuses: {
                    sr: 0,
                    economy: 0,
                    ducks: 1,
                    batting50s: 0,
                    batting100s: 0,
                    impact30s: 0,
                    bowling3w: 0,
                    bowling4w: 0,
                    bowling5w: 0
                  }
                }
              }
            }
          }
        }
      ]
    }
  };
  const entry = {
    matchNo: 42,
    selectedPlayerIds: [playerId],
    captainPlayerId: '',
    priceSnapshot: {
      [playerId]: { name: 'Mohammed Siraj', team: 'GT', role: 'bowler', final_price: 7.5 }
    }
  };
  const schedule = [
    { match_no: 42, datetime_utc: '2026-04-30T14:00:00Z', home_team: 'Gujarat Titans', away_team: 'Royal Challengers Bengaluru' }
  ];
  const squads = {
    GT: ['Mohammed Siraj']
  };

  const audit = buildMiniFantasyEntryAuditLog({ entry, liveData, schedule, squads });

  assert.equal(audit.players[0].points, 38);
  assert.equal(audit.players[0].base_breakdown.wicket_points, 25);
  assert.equal(audit.players[0].base_breakdown.dot_ball_points, 18);
  assert.equal(audit.players[0].base_breakdown.economy_bonus_points, 0);
  assert.equal(audit.players[0].base_breakdown.total_points, 38);
});

test('buildMiniFantasyLeaderboard adds missed-lock relief, daily visit bonus, and new-player baseline points', () => {
  const liveData = {
    meta: {
      cache: {
        matchList: [
          {
            matchNo: 14,
            status: 'Delhi Capitals won by 6 wkts',
            teams: ['Delhi Capitals', 'Gujarat Titans']
          }
        ]
      },
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
        userId: 'user-senthil',
        ownerHandle: 'senthil',
        displayName: 'Senthil',
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
        userId: 'user-sai',
        ownerHandle: 'sai',
        displayName: 'Sai',
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
    squads,
    profiles: [
      { id: 'user-senthil', handle: 'senthil', display_name: 'Senthil', created_at: '2026-04-05T09:00:00Z' },
      { id: 'user-sai', handle: 'sai', display_name: 'Sai', created_at: '2026-04-05T09:00:00Z' },
      { id: 'user-kavi', handle: 'kavison', display_name: 'Kavison', created_at: '2026-04-05T09:00:00Z' },
      { id: 'user-new', handle: 'newbie', display_name: 'Newbie', created_at: '2026-04-09T09:00:00Z' }
    ],
    dailyBonuses: [
      { user_id: 'user-kavi', owner_handle: 'kavison', display_name: 'Kavison', bonus_date_ist: '2026-04-08', bonus_points: 5 },
      { user_id: 'user-new', owner_handle: 'newbie', display_name: 'Newbie', bonus_date_ist: '2026-04-09', bonus_points: 5 }
    ]
  });

  const senthil = leaderboard.rows.find((row) => row.owner_handle === 'senthil');
  const kavi = leaderboard.rows.find((row) => row.owner_handle === 'kavison');
  const newbie = leaderboard.rows.find((row) => row.owner_handle === 'newbie');

  assert.equal(senthil.total_points, 123.5);
  assert.equal(kavi.total_points, 51.1);
  assert.equal(kavi.daily_bonus_points, 5);
  assert.equal(kavi.missed_lock_points, 46.1);
  assert.equal(kavi.matches[0].source, 'missed_lock_relief');
  assert.equal(newbie.total_points, MINI_FANTASY_NEW_PLAYER_BASELINE_POINTS + 5);
  assert.equal(newbie.new_player_baseline_points, MINI_FANTASY_NEW_PLAYER_BASELINE_POINTS);
  assert.equal(newbie.daily_bonus_points, 5);
  assert.equal(newbie.matches[0].source, 'new_player_baseline');
});

test('buildMiniFantasyLeaderboard uses profile created_at ahead of first saved-entry timestamp for baseline classification', () => {
  const liveData = {
    meta: {
      cache: {
        matchList: [
          {
            matchNo: 14,
            status: 'Delhi Capitals won by 6 wkts',
            teams: ['Delhi Capitals', 'Gujarat Titans']
          }
        ]
      },
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
        userId: 'user-early',
        ownerHandle: 'earlybird',
        displayName: 'Early Bird',
        createdAt: '2026-04-10T09:00:00Z',
        matchNo: 14,
        selectedPlayerIds: [
          buildMiniFantasyPlayerId('DC', 'DC Batter'),
          buildMiniFantasyPlayerId('DC', 'DC Bowler'),
          buildMiniFantasyPlayerId('GT', 'GT Bowler'),
          buildMiniFantasyPlayerId('GT', 'GT Keeper')
        ],
        captainPlayerId: buildMiniFantasyPlayerId('DC', 'DC Batter')
      }
    ],
    liveData,
    schedule,
    squads,
    profiles: [
      { id: 'user-early', handle: 'earlybird', display_name: 'Early Bird', created_at: '2026-04-05T09:00:00Z' }
    ]
  });

  const earlyBird = leaderboard.rows.find((row) => row.owner_handle === 'earlybird');
  assert.equal(earlyBird.new_player_baseline_points, 0);
  assert.equal(earlyBird.missed_lock_points, 0);
  assert.equal(earlyBird.matches[0].source, 'locked_entry');
  assert.equal(earlyBird.saved_entries, 1);
});

test('serializeMiniFantasyLeaderboardRows keeps the leaderboard snapshot shape stable for database publishing', () => {
  const rows = serializeMiniFantasyLeaderboardRows({
    leaderboard: {
      completed_match_count: 14,
      rows: [
        {
          owner_handle: 'senthil',
          user_id: 'user-senthil',
          display_name: 'Senthil',
          rank: 1,
          medal: 'gold',
          total_points: 123.5,
          saved_entries: 2,
          scored_entries: 2,
          pending_entries: 0,
          latest_saved_at: '2026-04-10T15:00:00Z',
          daily_bonus_points: 5,
          missed_lock_points: 10,
          new_player_baseline_points: 40,
          matches: [
            {
              match_no: 14,
              total_points: 83.5,
              source: 'locked_entry',
              spent_credits: 30.5,
              saved_at: '2026-04-08T13:58:00Z',
              audit_log: {
                version: 'mini_fantasy_entry_audit_v1',
                spent_credits: 30.5,
                players: [
                  {
                    player_id: 'dc_dc-batter',
                    name: 'DC Batter',
                    scored_points: 70.5
                  }
                ]
              }
            }
          ]
        }
      ]
    },
    liveData: {
      fetchedAt: '2026-04-19T10:00:00Z'
    },
    generatedAtUtc: '2026-04-19T10:05:00Z'
  });

  assert.deepEqual(rows, [
    {
      season: 'IPL 2026',
      owner_handle: 'senthil',
      user_id: 'user-senthil',
      display_name: 'Senthil',
      rank: 1,
      medal: 'gold',
      total_points: 123.5,
      saved_entries: 2,
      scored_entries: 2,
      pending_entries: 0,
      latest_saved_at: '2026-04-10T15:00:00Z',
      daily_bonus_points: 5,
      missed_lock_points: 10,
      new_player_baseline_points: 40,
      completed_match_count: 14,
      matches: [
        {
          match_no: 14,
          total_points: 83.5,
          source: 'locked_entry',
          spent_credits: 30.5,
          saved_at: '2026-04-08T13:58:00Z',
          audit_log: {
            version: 'mini_fantasy_entry_audit_v1',
            spent_credits: 30.5,
            players: [
              {
                player_id: 'dc_dc-batter',
                name: 'DC Batter',
                scored_points: 70.5
              }
            ]
          }
        }
      ],
      live_data_fetched_at: '2026-04-19T10:00:00Z',
      generated_at: '2026-04-19T10:05:00Z'
    }
  ]);
});

test('calculateMiniFantasyMissedLockPoints lowers the cap after the third missed lock', () => {
  assert.deepEqual(calculateMiniFantasyMissedLockPoints(200, 1), {
    cap: 50,
    total: 50
  });
  assert.deepEqual(calculateMiniFantasyMissedLockPoints(200, 4), {
    cap: 30,
    total: 30
  });
});

test('scoreMiniFantasyEntry applies appearance and winning bonuses before captain multiplier and zeroes no-result fixtures', () => {
  const entry = {
    matchNo: 14,
    selectedPlayerIds: [
      buildMiniFantasyPlayerId('DC', 'DC Batter'),
      buildMiniFantasyPlayerId('DC', 'DC Bowler'),
      buildMiniFantasyPlayerId('GT', 'GT Bowler'),
      buildMiniFantasyPlayerId('GT', 'GT Keeper')
    ],
    captainPlayerId: buildMiniFantasyPlayerId('DC', 'DC Batter')
  };
  const schedule = [
    { match_no: 14, datetime_utc: '2026-04-08T14:00:00Z', home_team: 'Delhi Capitals', away_team: 'Gujarat Titans' }
  ];
  const squads = {
    DC: ['DC Batter', 'DC Bowler'],
    GT: ['GT Bowler', 'GT Keeper']
  };
  const scoredLiveData = {
    meta: {
      cache: {
        matchList: [
          {
            matchNo: 14,
            status: 'Delhi Capitals won by 6 wkts',
            teams: ['Delhi Capitals', 'Gujarat Titans']
          }
        ]
      },
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

  const scored = scoreMiniFantasyEntry({
    entry,
    liveData: scoredLiveData,
    schedule,
    squads
  });
  assert.equal(scored.total_points, 123.5);
  assert.equal(scored.appearance_bonus_points, 8);
  assert.equal(scored.winner_bonus_points, 10);
  assert.equal(scored.winning_team_code, 'DC');
  assert.equal(scored.scored_points_by_player_id[buildMiniFantasyPlayerId('DC', 'DC Batter')], 70.5);
  assert.equal(scored.scored_points_by_player_id[buildMiniFantasyPlayerId('DC', 'DC Bowler')], 27);
  assert.equal(scored.scored_points_by_player_id[buildMiniFantasyPlayerId('GT', 'GT Bowler')], 12);
  assert.equal(scored.scored_points_by_player_id[buildMiniFantasyPlayerId('GT', 'GT Keeper')], 14);

  const noResult = scoreMiniFantasyEntry({
    entry,
    liveData: {
      meta: {
        cache: {
          matchList: [
            {
              matchNo: 14,
              status: 'No result (due to rain)',
              teams: ['Delhi Capitals', 'Gujarat Titans']
            }
          ]
        },
        scoreHistory: scoredLiveData.meta.scoreHistory
      }
    },
    schedule,
    squads
  });
  assert.equal(noResult.total_points, 0);
  assert.equal(noResult.appearance_bonus_points, 0);
  assert.equal(noResult.winner_bonus_points, 0);
  assert.equal(noResult.winning_team_code, null);
  assert.equal(noResult.is_no_result, true);
  assert.equal(noResult.scored_points_by_player_id[buildMiniFantasyPlayerId('DC', 'DC Batter')], 0);
});
