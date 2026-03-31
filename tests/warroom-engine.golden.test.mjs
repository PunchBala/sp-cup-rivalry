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

function category(key) {
  const found = engine.CATEGORIES.find((item) => item.key === key);
  assert.ok(found, `Category ${key} should exist`);
  return found;
}

function matchupFor(key, pickA, pickB) {
  return {
    a: { name: 'Senthil', picks: { [key]: pickA } },
    b: { name: 'Sai', picks: { [key]: pickB } }
  };
}

function resultFor(key, pickA, pickB, liveCategoryData) {
  const liveSource = { [key]: liveCategoryData };
  return engine.getCategoryResult(category(key), matchupFor(key, pickA, pickB), liveSource);
}

test('player alias matching resolves Tilak Varma against N. Tilak Varma', () => {
  assert.equal(engine.matchesPick('Tilak Varma', 'N. Tilak Varma'), true);
  assert.equal(engine.matchesPick('Phil Salt', 'Philip Salt'), true);
  const state = engine.describePickLiveState(
    category('mostCatches'),
    'Tilak Varma',
    { ranking: ['N. Tilak Varma', 'Rinku Singh'], extendedRanking: ['N. Tilak Varma', 'Rinku Singh'] }
  );
  assert.equal(state, 'Live: #1');
});

test('top-5 fallback awards one point when only one pick is ranked outside the top 5', () => {
  const result = resultFor('mostDots', 'Jasprit Bumrah', 'Trent Boult', {
    ranking: ['Jacob Duffy', 'Bhuvneshwar Kumar', 'Kartik Tyagi', 'Vaibhav Arora', 'Abhinandan Singh'],
    extendedRanking: ['Jacob Duffy', 'Bhuvneshwar Kumar', 'Kartik Tyagi', 'Vaibhav Arora', 'Abhinandan Singh', 'Hardik Pandya', 'Shardul Thakur', 'Trent Boult']
  });
  assert.deepEqual({ a: result.a, b: result.b, rankA: result.rankA, rankB: result.rankB }, { a: 0, b: 1, rankA: null, rankB: 8 });
});

test('table bottom uses current lower rank as the better prediction before a final loser exists', () => {
  const result = resultFor('tableBottom', 'KKR', 'SRH', {
    ranking: ['Royal Challengers Bengaluru', 'Mumbai Indians', 'Kolkata Knight Riders', 'Sunrisers Hyderabad'],
    extendedRanking: ['Royal Challengers Bengaluru', 'Mumbai Indians', 'Kolkata Knight Riders', 'Sunrisers Hyderabad']
  });
  assert.deepEqual({ a: result.a, b: result.b, rankA: result.rankA, rankB: result.rankB }, { a: 0, b: 1, rankA: 3, rankB: 4 });
});

test('player-based better-prediction categories award 2 points when the winning pick is live #1', () => {
  const result = resultFor('mostCatches', 'Tilak Varma', 'Rinku Singh', {
    ranking: ['N. Tilak Varma', 'Rinku Singh', 'Virat Kohli'],
    extendedRanking: ['N. Tilak Varma', 'Rinku Singh', 'Virat Kohli']
  });
  assert.deepEqual({ a: result.a, b: result.b, rankA: result.rankA, rankB: result.rankB }, { a: 2, b: 0, rankA: 1, rankB: 2 });
});

test('team-based better-prediction categories do not receive the rank-1 bonus', () => {
  const result = resultFor('highestScoreTeam', 'MI', 'LSG', {
    ranking: ['Mumbai Indians', 'Royal Challengers Bengaluru', 'Lucknow Super Giants'],
    extendedRanking: ['Mumbai Indians', 'Royal Challengers Bengaluru', 'Lucknow Super Giants']
  });
  assert.deepEqual({ a: result.a, b: result.b, rankA: result.rankA, rankB: result.rankB }, { a: 1, b: 0, rankA: 1, rankB: 3 });
});

test('uncapped MVP behaves like a better-prediction category and uses ranking fallback', () => {
  const result = resultFor('uncappedMvp', 'Auqib Nabi', 'Prashant Veer', {
    ranking: ['Auqib Nabi', 'Prashant Veer', 'Priyansh Arya'],
    extendedRanking: ['Auqib Nabi', 'Prashant Veer', 'Priyansh Arya']
  });
  assert.deepEqual({ a: result.a, b: result.b, rankA: result.rankA, rankB: result.rankB }, { a: 2, b: 0, rankA: 1, rankB: 2 });
});

test('fair play uses better-prediction fallback from current ranking without rank-1 bonus', () => {
  const result = resultFor('fairPlay', 'CSK', 'DC', {
    ranking: ['CSK', 'GT', 'DC'],
    extendedRanking: ['CSK', 'GT', 'DC']
  });
  assert.deepEqual({ a: result.a, b: result.b, rankA: result.rankA, rankB: result.rankB }, { a: 1, b: 0, rankA: 1, rankB: 3 });
});

test('title category awards winner/finalist/playoff points correctly', () => {
  const result = resultFor('titleWinner', 'RCB', 'MI', {
    winner: 'Royal Challengers Bengaluru',
    finalists: ['Royal Challengers Bengaluru', 'Mumbai Indians'],
    playoffs: ['Royal Challengers Bengaluru', 'Mumbai Indians', 'Kolkata Knight Riders', 'Sunrisers Hyderabad'],
    ranking: ['Royal Challengers Bengaluru', 'Mumbai Indians', 'Kolkata Knight Riders', 'Sunrisers Hyderabad'],
    extendedRanking: ['Royal Challengers Bengaluru', 'Mumbai Indians', 'Kolkata Knight Riders', 'Sunrisers Hyderabad']
  });
  assert.deepEqual({ a: result.a, b: result.b }, { a: 5, b: 3 });
});

test('least MVP keeps lower-rank-wins logic', () => {
  const result = resultFor('leastMvp', 'MS Dhoni', 'Cameron Green', {
    ranking: ['Player A', 'Player B', 'Cameron Green', 'Player C', 'MS Dhoni'],
    extendedRanking: ['Player A', 'Player B', 'Cameron Green', 'Player C', 'MS Dhoni']
  });
  assert.deepEqual({ a: result.a, b: result.b, rankA: result.rankA, rankB: result.rankB }, { a: 1, b: 0, rankA: 5, rankB: 3 });
});

test('computeMatchup totals remain stable for a mixed-rule mini-board', () => {
  const liveSource = {
    mostDots: {
      ranking: ['Jacob Duffy', 'Bhuvneshwar Kumar', 'Kartik Tyagi', 'Vaibhav Arora', 'Abhinandan Singh'],
      extendedRanking: ['Jacob Duffy', 'Bhuvneshwar Kumar', 'Kartik Tyagi', 'Vaibhav Arora', 'Abhinandan Singh', 'Hardik Pandya', 'Shardul Thakur', 'Trent Boult']
    },
    tableBottom: {
      ranking: ['Royal Challengers Bengaluru', 'Mumbai Indians', 'Kolkata Knight Riders', 'Sunrisers Hyderabad'],
      extendedRanking: ['Royal Challengers Bengaluru', 'Mumbai Indians', 'Kolkata Knight Riders', 'Sunrisers Hyderabad']
    },
    mostCatches: {
      ranking: ['N. Tilak Varma', 'Rinku Singh'],
      extendedRanking: ['N. Tilak Varma', 'Rinku Singh']
    },
    highestScoreTeam: {
      ranking: ['Mumbai Indians', 'Royal Challengers Bengaluru', 'Lucknow Super Giants'],
      extendedRanking: ['Mumbai Indians', 'Royal Challengers Bengaluru', 'Lucknow Super Giants']
    }
  };

  const matchup = {
    a: {
      name: 'Senthil',
      picks: {
        mostDots: 'Jasprit Bumrah',
        tableBottom: 'KKR',
        mostCatches: 'Tilak Varma',
        highestScoreTeam: 'MI'
      }
    },
    b: {
      name: 'Sai',
      picks: {
        mostDots: 'Trent Boult',
        tableBottom: 'SRH',
        mostCatches: 'Rinku Singh',
        highestScoreTeam: 'LSG'
      }
    }
  };

  const result = engine.computeMatchup(matchup, liveSource);
  const rows = Object.fromEntries(result.rows.map((row) => [row.category.key, { a: row.a, b: row.b, stateA: row.pickALiveState, stateB: row.pickBLiveState }]));

  assert.deepEqual(rows.mostDots, { a: 0, b: 1, stateA: 'Live: unranked', stateB: 'Live: #8' });
  assert.deepEqual(rows.tableBottom, { a: 0, b: 1, stateA: 'Live: #3', stateB: 'Live: #4' });
  assert.deepEqual(rows.mostCatches, { a: 2, b: 0, stateA: 'Live: #1', stateB: 'Live: #2' });
  assert.deepEqual(rows.highestScoreTeam, { a: 1, b: 0, stateA: 'Live: #1', stateB: 'Live: #3' });
  assert.deepEqual({ totalA: result.totalA, totalB: result.totalB }, { totalA: 3, totalB: 2 });
});
