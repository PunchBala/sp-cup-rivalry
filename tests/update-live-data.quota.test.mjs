import test from 'node:test';
import assert from 'node:assert/strict';

import { isCricketDataFallbackEligibleError, isCricketDataQuotaError, parseCricketDataQuotaDetails } from '../scripts/update-live-data.mjs';

test('detects quota exceeded errors from attached API payload', () => {
  const error = new Error('API error');
  error.api = {
    apikey: '***',
    info: '{}',
    hitsToday: 106,
    hitsUsed: 1,
    hitsLimit: 100,
    credits: 0,
    status: 'failure',
    reason: 'hits_today_exceeded_hits_limit'
  };

  assert.equal(isCricketDataQuotaError(error), true);
  assert.deepEqual(parseCricketDataQuotaDetails(error), {
    reason: 'hits_today_exceeded_hits_limit',
    hitsToday: 106,
    hitsUsed: 1,
    hitsLimit: 100,
    status: 'failure',
    apikey: '***'
  });
});

test('detects quota exceeded errors from legacy error messages', () => {
  const error = new Error('API error: {"hitsToday":106,"hitsUsed":1,"hitsLimit":100,"status":"failure","reason":"hits_today_exceeded_hits_limit"}');

  assert.equal(isCricketDataQuotaError(error), true);
  assert.equal(parseCricketDataQuotaDetails(error)?.hitsLimit, 100);
});

test('ignores non-quota API failures', () => {
  const error = new Error('API error');
  error.api = {
    status: 'failure',
    reason: 'invalid_api_key'
  };

  assert.equal(isCricketDataQuotaError(error), false);
  assert.equal(parseCricketDataQuotaDetails(error), null);
});

test('fallback retry is allowed for quota and invalid-key failures only', () => {
  const quotaError = new Error('API error');
  quotaError.api = { status: 'failure', reason: 'hits_today_exceeded_hits_limit' };

  const invalidKeyError = new Error('API error');
  invalidKeyError.api = { status: 'failure', reason: 'invalid_api_key' };

  const genericError = new Error('API error');
  genericError.api = { status: 'failure', reason: 'rate_limited' };

  assert.equal(isCricketDataFallbackEligibleError(quotaError), true);
  assert.equal(isCricketDataFallbackEligibleError(invalidKeyError), true);
  assert.equal(isCricketDataFallbackEligibleError(genericError), false);
});
