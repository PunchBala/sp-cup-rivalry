import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, validateLiveData } from '../scripts/validate-live-data.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function repoPath(...parts) {
  return path.resolve(__dirname, '..', ...parts);
}

test('data/live.json satisfies the live data contract', async () => {
  const live = await readJson(repoPath('data', 'live.json'));
  const errors = validateLiveData(live);
  assert.deepEqual(errors, []);
});

test('validator catches missing required ranking arrays', async () => {
  const live = await readJson(repoPath('data', 'live.json'));
  delete live.orangeCap.ranking;
  const errors = validateLiveData(live);
  assert.ok(errors.some((line) => line.includes('live.orangeCap.ranking')));
});

test('validator catches malformed title race arrays', async () => {
  const live = await readJson(repoPath('data', 'live.json'));
  live.titleWinner.finalists = 'RCB, MI';
  const errors = validateLiveData(live);
  assert.ok(errors.some((line) => line.includes('live.titleWinner.finalists')));
});

test('validator catches non-numeric category values', async () => {
  const live = await readJson(repoPath('data', 'live.json'));
  const firstKey = Object.keys(live.mostCatches.values || {})[0] || 'Virat Kohli';
  live.mostCatches.values[firstKey] = 'three';
  const errors = validateLiveData(live);
  assert.ok(errors.some((line) => line.includes(`live.mostCatches.values.${firstKey}`)));
});

test('validator catches malformed mostDots scrape report fallback fields', async () => {
  const live = await readJson(repoPath('data', 'live.json'));
  live.scrapeReport.mostDots.ok = false;
  delete live.scrapeReport.mostDots.rows;
  live.scrapeReport.mostDots.reason = 'refresh interval not reached';
  live.scrapeReport.mostDots.cachedRows = '104';
  const errors = validateLiveData(live);
  assert.ok(errors.some((line) => line.includes('live.scrapeReport.mostDots.cachedRows')));
});

test('validator catches malformed costControl contract fields', async () => {
  const live = await readJson(repoPath('data', 'live.json'));
  live.scrapeReport.costControl.historicalReplayApiFallbackAllowed = 'true';
  const errors = validateLiveData(live);
  assert.ok(errors.some((line) => line.includes('live.scrapeReport.costControl.historicalReplayApiFallbackAllowed')));
});
