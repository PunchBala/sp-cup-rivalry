import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isCricketDataFallbackEligibleError,
  isCricketDataQuotaError,
  isCricketDataScorecardNotFoundError,
  parseCricketDataQuotaDetails,
  parseCricketDataScorecardNotFoundDetails
} from '../scripts/update-live-data.mjs';

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

test('detects quota exceeded errors when the provider returns spaced reason text', () => {
  const error = new Error('API error');
  error.api = {
    apikey: '***',
    hitsToday: 103,
    hitsUsed: 1,
    hitsLimit: 100,
    status: 'failure',
    reason: 'hits today exceeded hits limit'
  };

  assert.equal(isCricketDataQuotaError(error), true);
  assert.equal(parseCricketDataQuotaDetails(error)?.reason, 'hits_today_exceeded_hits_limit');
});

test('detects quota exceeded errors when the provider prefixes the reason and nests usage in info', () => {
  const error = new Error('API error');
  error.api = {
    apikey: '***',
    info: {
      hitsToday: 114,
      hitsUsed: 10,
      hitsLimit: 100,
      credits: 0
    },
    status: 'failure',
    reason: 'Blocking since hits today exceeded hits limit'
  };

  assert.equal(isCricketDataQuotaError(error), true);
  assert.deepEqual(parseCricketDataQuotaDetails(error), {
    reason: 'hits_today_exceeded_hits_limit',
    hitsToday: 114,
    hitsUsed: 10,
    hitsLimit: 100,
    status: 'failure',
    apikey: '***'
  });
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

  const spacedQuotaError = new Error('API error');
  spacedQuotaError.api = { status: 'failure', reason: 'hits today exceeded hits limit' };

  const prefixedQuotaError = new Error('API error');
  prefixedQuotaError.api = { status: 'failure', reason: 'Blocking since hits today exceeded hits limit' };

  const temporaryBlockError = new Error('API error');
  temporaryBlockError.api = { status: 'failure', reason: 'Blocked for 15 minutes' };

  const invalidKeyError = new Error('API error');
  invalidKeyError.api = { status: 'failure', reason: 'invalid_api_key' };

  const reversedInvalidKeyError = new Error('API error');
  reversedInvalidKeyError.api = { status: 'failure', reason: 'api_key_invalid' };

  const genericError = new Error('API error');
  genericError.api = { status: 'failure', reason: 'rate_limited' };

  assert.equal(isCricketDataFallbackEligibleError(quotaError), true);
  assert.equal(isCricketDataFallbackEligibleError(spacedQuotaError), true);
  assert.equal(isCricketDataFallbackEligibleError(prefixedQuotaError), true);
  assert.equal(isCricketDataFallbackEligibleError(temporaryBlockError), true);
  assert.equal(isCricketDataFallbackEligibleError(invalidKeyError), true);
  assert.equal(isCricketDataFallbackEligibleError(reversedInvalidKeyError), true);
  assert.equal(isCricketDataFallbackEligibleError(genericError), false);
});

test('fallback retry still works when the provider payload is only embedded in the error message', () => {
  const temporaryBlockMessageError = new Error('API error: {"status":"failure","reason":"Blocked for 15 minutes"}');
  const quotaMessageError = new Error('API error: {"status":"failure","reason":"Blocking since hits today exceeded hits limit","info":{"hitsToday":114,"hitsUsed":10,"hitsLimit":100,"credits":0}}');

  assert.equal(isCricketDataFallbackEligibleError(temporaryBlockMessageError), true);
  assert.equal(isCricketDataFallbackEligibleError(quotaMessageError), true);
  assert.deepEqual(parseCricketDataQuotaDetails(quotaMessageError), {
    reason: 'hits_today_exceeded_hits_limit',
    hitsToday: 114,
    hitsUsed: 10,
    hitsLimit: 100,
    status: 'failure',
    apikey: null
  });
});

test('detects scorecard not found failures without treating them as fallback-eligible', () => {
  const error = new Error('API error');
  error.api = {
    apikey: '***',
    status: 'failure',
    reason: 'ERR: Scorecard 547b47e3-b2d9-4f51-8a49-8e7e4c946a6e not found'
  };

  assert.equal(isCricketDataScorecardNotFoundError(error), true);
  assert.equal(isCricketDataFallbackEligibleError(error), false);
  assert.deepEqual(parseCricketDataScorecardNotFoundDetails(error), {
    reason: 'scorecard_not_found',
    rawReason: 'ERR: Scorecard 547b47e3-b2d9-4f51-8a49-8e7e4c946a6e not found',
    matchId: '547b47e3-b2d9-4f51-8a49-8e7e4c946a6e',
    status: 'failure',
    apikey: '***'
  });
});

test('detects scorecard not found failures when the provider payload is embedded in the error message', () => {
  const error = new Error('API error: {"status":"failure","reason":"ERR: Scorecard 547b47e3-b2d9-4f51-8a49-8e7e4c946a6e not found"}');

  assert.equal(isCricketDataScorecardNotFoundError(error), true);
  assert.equal(parseCricketDataScorecardNotFoundDetails(error)?.matchId, '547b47e3-b2d9-4f51-8a49-8e7e4c946a6e');
});
