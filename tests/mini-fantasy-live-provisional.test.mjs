import test from 'node:test';
import assert from 'node:assert/strict';

import { buildMiniFantasyLiveProvisionalPayload } from '../scripts/build-mini-fantasy-live-provisional.mjs';

test('buildMiniFantasyLiveProvisionalPayload converts official-style innings into provisional Mini Fantasy player points', () => {
  const payload = buildMiniFantasyLiveProvisionalPayload({
    manualInput: {
      matchNo: 44,
      updatedAtUtc: '2026-05-02T15:20:00Z',
      status: 'Sunrisers Hyderabad 31/1 after 1.0 over',
      innings: [
        {
          team: 'Sunrisers Hyderabad',
          totalRuns: 31,
          wickets: 1,
          overs: '1.0',
          extras: { byes: 0, legByes: 0, wides: 1, noBalls: 0, penalties: 0 },
          batting: [
            { name: 'Travis Head', dismissalText: 'c Ryan Rickelton b Trent Boult', runs: 30, balls: 10, fours: 2, sixes: 3 },
            { name: 'Heinrich Klaasen', dismissalText: 'not out', runs: 0, balls: 0, fours: 0, sixes: 0 }
          ],
          bowling: [
            { name: 'Trent Boult', overs: '1', maidens: 0, runs: 31, wickets: 1, dots: 2 }
          ]
        }
      ]
    },
    fixture: {
      match_no: 44,
      fixture: 'Sunrisers Hyderabad vs Mumbai Indians',
      home_team: 'Mumbai Indians',
      away_team: 'Sunrisers Hyderabad',
      home_team_code: 'MI',
      away_team_code: 'SRH'
    },
    squads: {
      MI: ['Ryan Rickelton', 'Trent Boult'],
      SRH: ['Travis Head', 'Heinrich Klaasen']
    },
    teamRoles: {
      teams: {
        MI: {
          players: {
            'Ryan Rickelton': 'wicket_keeper',
            'Trent Boult': 'bowler'
          }
        },
        SRH: {
          players: {
            'Travis Head': 'batter',
            'Heinrich Klaasen': 'wicket_keeper'
          }
        }
      }
    }
  });

  assert.equal(payload.match_no, 44);
  assert.equal(payload.players.length, 3);
  assert.deepEqual(payload.players.map((player) => [player.name, player.points]), [
    ['Travis Head', 52],
    ['Trent Boult', 29],
    ['Ryan Rickelton', 8]
  ]);

  const boult = payload.players.find((player) => player.name === 'Trent Boult');
  assert.ok(boult);
  assert.equal(boult.base_breakdown.wicket_points, 25);
  assert.equal(boult.base_breakdown.dot_ball_points, 4);

  const rickelton = payload.players.find((player) => player.name === 'Ryan Rickelton');
  assert.ok(rickelton);
  assert.equal(rickelton.base_breakdown.catch_points, 8);
});
