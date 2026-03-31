import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildScheduledRefreshInstants,
  createScheduleDecision,
  nextScheduledRefreshAt,
  readLeagueStageSchedule
} from '../scripts/update-live-data.mjs';

const schedule = await readLeagueStageSchedule(new URL('../ipl_2026_schedule.json', import.meta.url));

test('builds the expected first refresh windows for a 14:00 UTC match', () => {
  const oneMatch = [schedule[0]];
  const planned = buildScheduledRefreshInstants(oneMatch).map((dt) => dt.toISOString());
  assert.deepEqual(planned, [
    '2026-03-28T13:00:00.000Z',
    '2026-03-28T18:00:00.000Z',
    '2026-03-28T19:00:00.000Z'
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
    '2026-04-04T18',
    '2026-04-04T19'
  ]);
});

test('reports no future refresh once the league-stage plan is complete', () => {
  const afterFinal = new Date('2026-05-24T20:05:00Z');
  assert.equal(nextScheduledRefreshAt(schedule, afterFinal), null);

  const decision = createScheduleDecision(schedule, afterFinal);
  assert.equal(decision.shouldRefresh, false);
  assert.equal(decision.mode, 'schedule_complete');
});
