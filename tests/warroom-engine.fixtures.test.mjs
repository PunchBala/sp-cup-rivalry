import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEngine() {
  const enginePath = path.resolve(__dirname, '../warroom-engine.js');
  const source = fs.readFileSync(enginePath, 'utf8');
  const context = {
    window: {},
    console,
    setTimeout,
    clearTimeout
  };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'warroom-engine.js' });
  return context.window.WarRoomEngine;
}

const engine = loadEngine();

function loadFixture(name) {
  const raw = fs.readFileSync(path.resolve(__dirname, `../fixtures/${name}`), 'utf8');
  return JSON.parse(raw);
}

function category(key) {
  const found = engine.CATEGORIES.find((item) => item.key === key);
  assert.ok(found, `Category ${key} should exist`);
  return found;
}

function resultFor(key, pickA, pickB, liveSource) {
  return engine.getCategoryResult(
    category(key),
    { a: { name: 'Senthil', picks: { [key]: pickA } }, b: { name: 'Sai', picks: { [key]: pickB } } },
    liveSource
  );
}

test('early-season fixture still produces a populated board for the default matchup', () => {
  const liveSource = loadFixture('live_early_season.json');
  const matchup = {
    a: {
      name: 'Senthil',
      picks: {
        titleWinner: 'MI',
        orangeCap: 'KL Rahul',
        mostSixes: 'Vaibhav Suryavanshi',
        purpleCap: 'Yuzvendra Chahal',
        mostDots: 'Prasidh Krishna',
        mvp: 'KL Rahul',
        uncappedMvp: 'Auqib Nabi',
        fairPlay: 'PBKS',
        highestScoreTeam: 'PBKS',
        striker: 'Dewald Brevis',
        bestBowlingFigures: 'Akeal Hosein',
        bestBowlingStrikeRate: 'Josh Hazlewood',
        mostCatches: 'Dewald Brevis',
        tableBottom: 'KKR',
        leastMvp: 'MS Dhoni'
      }
    },
    b: {
      name: 'Sai',
      picks: {
        titleWinner: 'RCB',
        orangeCap: 'Shubman Gill',
        mostSixes: 'Nicholas Pooran',
        purpleCap: 'Rashid Khan',
        mostDots: 'Trent Boult',
        mvp: 'Shreyas Iyer',
        uncappedMvp: 'Prashant Veer',
        fairPlay: 'GT',
        highestScoreTeam: 'LSG',
        striker: 'Phil Salt',
        bestBowlingFigures: 'Harshal Patel',
        bestBowlingStrikeRate: 'Rashid Khan',
        mostCatches: 'Virat Kohli',
        tableBottom: 'SRH',
        leastMvp: 'Cameron Green'
      }
    }
  };

  const result = engine.computeMatchup(matchup, liveSource);
  assert.equal(result.rows.length, 15);
  assert.equal(result.rows.find((row) => row.category.key === 'titleWinner').a, 3);
  assert.equal(result.rows.find((row) => row.category.key === 'titleWinner').b, 5);
  assert.equal(result.rows.find((row) => row.category.key === 'mostDots').b, 2);
  assert.equal(result.rows.find((row) => row.category.key === 'tableBottom').b, 1);
  assert.ok(result.totalA >= 0 && result.totalB > result.totalA, 'fixture should produce a non-empty non-default total');
});

test('weird-alias fixture keeps alias-heavy categories scoreable', () => {
  const liveSource = loadFixture('live_weird_aliases.json');
  const orange = resultFor('orangeCap', 'Phil Salt', 'Abishek Sharma', liveSource);
  const catches = resultFor('mostCatches', 'Tilak Varma', 'Rinku Singh', liveSource);
  const strikeRate = resultFor('bestBowlingStrikeRate', 'AM Ghazanfar', 'Varun Chakravarthy', liveSource);
  const uncapped = resultFor('uncappedMvp', 'AM Ghazanfar', 'Tilak Varma', liveSource);

  assert.deepEqual({ a: orange.a, b: orange.b, rankA: orange.rankA, rankB: orange.rankB }, { a: 4, b: 3, rankA: 1, rankB: 2 });
  assert.deepEqual({ a: catches.a, b: catches.b, rankA: catches.rankA, rankB: catches.rankB }, { a: 2, b: 0, rankA: 1, rankB: 2 });
  assert.deepEqual({ a: strikeRate.a, b: strikeRate.b, rankA: strikeRate.rankA, rankB: strikeRate.rankB }, { a: 2, b: 0, rankA: 1, rankB: 2 });
  assert.deepEqual({ a: uncapped.a, b: uncapped.b, rankA: uncapped.rankA, rankB: uncapped.rankB }, { a: 2, b: 0, rankA: 1, rankB: 2 });
});

test('threshold fixture keeps qualification-sensitive categories honest', () => {
  const liveSource = loadFixture('live_thresholds.json');
  const striker = resultFor('striker', 'Dewald Brevis', 'Phil Salt', liveSource);
  const bowlingSr = resultFor('bestBowlingStrikeRate', 'Harshal Patel', 'Jasprit Bumrah', liveSource);
  const leastMvp = resultFor('leastMvp', 'Rajat Patidar', 'Rishabh Pant', liveSource);

  assert.deepEqual({ a: striker.a, b: striker.b, rankA: striker.rankA, rankB: striker.rankB }, { a: 0, b: 2, rankA: null, rankB: 1 });
  assert.deepEqual({ a: bowlingSr.a, b: bowlingSr.b, rankA: bowlingSr.rankA, rankB: bowlingSr.rankB }, { a: 0, b: 2, rankA: null, rankB: 1 });
  assert.deepEqual({ a: leastMvp.a, b: leastMvp.b, rankA: leastMvp.rankA, rankB: leastMvp.rankB }, { a: 1, b: 0, rankA: 3, rankB: 2 });
});


test('competition ranking with ties uses shared ranks and skips ahead for lower values', () => {
  const liveSource = {
    meta: {
      aggregates: {
        catches: {
          'Devdutt Padikkal': 3,
          'Arshdeep Singh': 2,
          'Dhruv Jurel': 2,
          'Heinrich Klaasen': 2,
          'N. Tilak Varma': 2,
          'Shubman Gill': 2,
          'Abhinandan Singh': 1
        },
        battingRuns: {}, battingBalls: {}, battingSixes: {}, bowlingWickets: {}, bowlingBalls: {}, bowlingDots: {}, standings: {}, playerMatches: {}
      }
    },
    mostCatches: {
      ranking: [
        'Devdutt Padikkal',
        'Arshdeep Singh',
        'Dhruv Jurel',
        'Heinrich Klaasen',
        'N. Tilak Varma'
      ],
      extendedRanking: [
        'Devdutt Padikkal',
        'Arshdeep Singh',
        'Dhruv Jurel',
        'Heinrich Klaasen',
        'N. Tilak Varma',
        'Shubman Gill',
        'Abhinandan Singh'
      ],
      values: {
        'Devdutt Padikkal': 3,
        'Arshdeep Singh': 2,
        'Dhruv Jurel': 2,
        'Heinrich Klaasen': 2,
        'N. Tilak Varma': 2,
        'Shubman Gill': 2,
        'Abhinandan Singh': 1
      }
    }
  };

  const tied = resultFor('mostCatches', 'Arshdeep Singh', 'Shubman Gill', liveSource);
  const lower = resultFor('mostCatches', 'Abhinandan Singh', 'Shubman Gill', liveSource);

  assert.deepEqual({ a: tied.a, b: tied.b, rankA: tied.rankA, rankB: tied.rankB }, { a: 0, b: 0, rankA: 2, rankB: 2 });
  assert.deepEqual({ a: lower.a, b: lower.b, rankA: lower.rankA, rankB: lower.rankB }, { a: 0, b: 1, rankA: 7, rankB: 2 });
});
