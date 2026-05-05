import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRefreshDecision,
  buildScheduledRefreshInstants,
  canonicalPlayerPoolKey,
  createScheduleDecision,
  needsScoreHistoryBackfill,
  nextScheduledRefreshAt,
  refreshDerivedOutputs,
  readLeagueStageSchedule
} from '../scripts/update-live-data.mjs';

const schedule = await readLeagueStageSchedule(new URL('../ipl_2026_schedule.json', import.meta.url));

test('builds the expected first refresh windows for a 14:00 UTC match', () => {
  const oneMatch = [schedule[0]];
  const planned = buildScheduledRefreshInstants(oneMatch).map((dt) => dt.toISOString());
  assert.deepEqual(planned, [
    '2026-03-28T13:00:00.000Z',
    '2026-03-28T18:00:00.000Z',
    '2026-03-28T19:00:00.000Z',
    '2026-03-28T20:00:00.000Z',
    '2026-03-28T21:00:00.000Z'
  ]);
});

test('runs during a planned refresh bucket and skips outside it', () => {
  const yes = createScheduleDecision(schedule, new Date('2026-04-01T13:05:00Z'));
  const no = createScheduleDecision(schedule, new Date('2026-04-01T09:05:00Z'));

  assert.equal(yes.shouldRefresh, true);
  assert.equal(yes.mode, 'scheduled_window');
  assert.equal(no.shouldRefresh, false);
  assert.equal(no.mode, 'outside_scheduled_window');
});

test('merges overlapping double-header refresh buckets correctly', () => {
  const day = schedule.filter((entry) => entry.date_utc === '2026-04-04');
  const planned = buildScheduledRefreshInstants(day).map((dt) => dt.toISOString().slice(0, 13));
  assert.deepEqual(planned, [
    '2026-04-04T09',
    '2026-04-04T13',
    '2026-04-04T14',
    '2026-04-04T15',
    '2026-04-04T16',
    '2026-04-04T17',
    '2026-04-04T18',
    '2026-04-04T19',
    '2026-04-04T20',
    '2026-04-04T21'
  ]);
});

test('reports no future refresh once the league-stage plan is complete', () => {
  const afterFinal = new Date('2026-05-24T22:05:00Z');
  assert.equal(nextScheduledRefreshAt(schedule, afterFinal), null);

  const decision = createScheduleDecision(schedule, afterFinal);
  assert.equal(decision.shouldRefresh, false);
  assert.equal(decision.mode, 'schedule_complete');
});

test('force refresh bypasses the scheduled bucket gate for manual workflow runs', () => {
  const forced = buildRefreshDecision(schedule, new Date('2026-04-02T15:05:00Z'), { forceRefresh: true });

  assert.equal(forced.shouldRefresh, true);
  assert.equal(forced.mode, 'forced_refresh');
  assert.equal(forced.reason, 'forced refresh requested');
  assert.equal(forced.nextPlannedAt, '2026-04-02T18:00:00.000Z');
});

test('uncapped MVP player-pool key normalizer handles provider spelling variants', () => {
  assert.equal(canonicalPlayerPoolKey('Auqib Nabi Dar'), 'auqib nabi');
  assert.equal(canonicalPlayerPoolKey('Vaibhav Sooryavanshi'), 'vaibhav suryavanshi');
  assert.equal(canonicalPlayerPoolKey('Vaibhav Suryavanshi'), 'vaibhav suryavanshi');
});

test('score-history backfill is required when a completed-game checkpoint is missing', () => {
  const live = {
    meta: {
      processedMatchIds: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'],
      scoreHistory: [
        { processedMatchCount: 0, snapshot: {} },
        { processedMatchCount: 2, snapshot: {} },
        { processedMatchCount: 3, snapshot: {} },
        { processedMatchCount: 4, snapshot: {} }
      ]
    }
  };

  assert.equal(needsScoreHistoryBackfill(live), true);
});

test('refreshDerivedOutputs merges lowercase dot totals into display-name MVP rows', () => {
  const live = {
    mostDots: {
      ranking: ['anshul kamboj', 'bhuvneshwar kumar'],
      extendedRanking: ['anshul kamboj', 'bhuvneshwar kumar'],
      values: {
        'anshul kamboj': 94,
        'bhuvneshwar kumar': 94
      }
    },
    meta: {
      aggregates: {
        battingRuns: { 'Bhuvneshwar Kumar': 27, 'Anshul Kamboj': 39 },
        battingBalls: { 'Bhuvneshwar Kumar': 24, 'Anshul Kamboj': 30 },
        battingFours: { 'Bhuvneshwar Kumar': 3, 'Anshul Kamboj': 2 },
        battingSixes: { 'Bhuvneshwar Kumar': 0, 'Anshul Kamboj': 2 },
        bowlingWickets: { 'Bhuvneshwar Kumar': 17, 'Anshul Kamboj': 17 },
        bowlingBalls: { 'Bhuvneshwar Kumar': 167, 'Anshul Kamboj': 102 },
        bowlingRunsConceded: { 'Bhuvneshwar Kumar': 210, 'Anshul Kamboj': 214 },
        catches: { 'Bhuvneshwar Kumar': 1, 'Anshul Kamboj': 2 },
        stumpings: {},
        bowlingDots: { 'bhuvneshwar kumar': 94, 'anshul kamboj': 94 },
        battingFifties: {},
        battingHundreds: {},
        battingImpact30s: {},
        battingDucks: {},
        bowling3w: { 'Bhuvneshwar Kumar': 5, 'Anshul Kamboj': 5 },
        bowling4w: {},
        bowling5w: {},
        playerMatches: { 'Bhuvneshwar Kumar': 9, 'Anshul Kamboj': 10 },
        teamHighestScore: {},
        standings: {},
        bestBowlingFigures: {}
      }
    }
  };

  refreshDerivedOutputs(live);

  assert.equal(live.mostDots.values['Bhuvneshwar Kumar'], 94);
  assert.equal(live.mostDots.values['Anshul Kamboj'], 94);
  assert.equal(live.mostDots.values['bhuvneshwar kumar'], undefined);
  assert.equal(live.mostDots.values['anshul kamboj'], undefined);
  assert.equal(live.mvp.values['Bhuvneshwar Kumar']?.dotBalls, 94);
  assert.equal(live.mvp.values['Anshul Kamboj']?.dotBalls, 94);
  assert.equal(live.mvp.values['bhuvneshwar kumar'], undefined);
  assert.equal(live.mvp.values['anshul kamboj'], undefined);
});
