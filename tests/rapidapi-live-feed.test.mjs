import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assessRapidApiPayload,
  summarizeProbeReports,
  summarizeRapidApiPayload
} from '../scripts/diagnose-rapidapi-live-feed.mjs';

test('RapidAPI live probe marks rich live payloads as strong', () => {
  const payload = {
    type: 'live',
    matchInfo: { matchId: '123', status: 'Live', overs: '12.3' },
    live: {
      batting: [
        { name: 'Abhishek Sharma', runs: 54, balls: 28, fours: 6, sixes: 3, sr: 192.85 }
      ],
      bowling: [
        { name: 'Bhuvneshwar Kumar', overs: '3', runs: 18, wickets: 2, dots: 9 }
      ]
    }
  };

  const summary = summarizeRapidApiPayload(payload);
  const assessment = assessRapidApiPayload(summary);

  assert.equal(summary.samples.batterSamples.length, 1);
  assert.equal(summary.samples.bowlerSamples.length, 1);
  assert.equal(assessment.suitability, 'strong');
  assert.equal(assessment.provisionalMiniFantasyReady, true);
  assert.equal(assessment.dotBallReady, true);
});

test('RapidAPI live probe marks dot-ball-missing payloads as partial', () => {
  const payload = {
    data: {
      currentInnings: {
        batsmen: [
          { name: 'Virat Kohli', r: 44, b: 25, '4s': 5, '6s': 1, sr: 176 }
        ],
        bowlers: [
          { name: 'Rashid Khan', o: '4', r: 26, w: 2 }
        ],
        score: '90/2',
        overs: '10.0'
      }
    }
  };

  const summary = summarizeRapidApiPayload(payload);
  const assessment = assessRapidApiPayload(summary);

  assert.equal(assessment.suitability, 'partial');
  assert.equal(assessment.provisionalMiniFantasyReady, true);
  assert.equal(assessment.dotBallReady, false);
  assert.match(assessment.reasons.join(' '), /dot-ball/i);
});

test('RapidAPI live probe summarizes mixed endpoint results', () => {
  const reports = [
    { assessment: { suitability: 'strong' } },
    { assessment: { suitability: 'partial' } },
    { assessment: { suitability: 'poor' } }
  ];

  const summary = summarizeProbeReports(reports);

  assert.deepEqual(summary, {
    total: 3,
    strong: 1,
    partial: 1,
    poor: 1,
    overallSuitability: 'partial'
  });
});
