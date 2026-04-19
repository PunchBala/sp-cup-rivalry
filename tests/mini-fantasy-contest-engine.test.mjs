import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MINI_FANTASY_BUDGET,
  MINI_FANTASY_NEW_PLAYER_BASELINE_POINTS,
  buildMiniFantasyLeaderboard,
  buildMiniFantasyFixturePointsIndex,
  buildMiniFantasyPlayerPointsIndex,
  buildMiniFantasyPlayerId,
  buildFixturePlayerPool,
  calculateMiniFantasyMissedLockPoints,
  deriveCompletedMatchHistories,
  generateMiniFantasyPriceBook,
  getMiniFantasyOpenFixtures,
  resolvePlayerHistory,
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
                  'Philip Salt': 1,
                  'Lungi Ngidi': 1
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
                  'Mohammed Shami': 2,
                  'Manimaran Siddharth': 1,
                  'Digvesh Singh Rathi': 1,
                  'Vijaykumar Vyshak': 2,
                  'Tilak Varma': 2,
                  'Vaibhav Sooryavanshi': 1,
                  'Suryakumar Yadav': 2,
                  'AM Ghazanfar': 2,
                  'Philip Salt': 2,
                  'Lungisani Ngidi': 1,
                  'Lungi Ngidi': 1
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
                'Philip Salt': { score: 67 },
                'Lungisani Ngidi': { score: 51 },
                'Lungi Ngidi': { score: 79 }
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
  assert.deepEqual(resolvePlayerHistory('Phil Salt', histories)?.match_points, [49, 18]);
  assert.deepEqual(resolvePlayerHistory('Lungisani Ngidi', histories)?.match_points, [28, 51]);
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
