import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
  average,
  calculateEligiblePercentiles,
  capPriceMovement,
  computeRecentAveragePoints,
  computeReliabilityFactor,
  generatePrices,
  mapPercentileToPrice,
  smoothPrice
} from '../mini-fantasy/pricing-engine.js';

function createJob(players) {
  return {
    job_meta: {
      season: 'IPL 2026',
      as_of_utc: '2026-04-06T23:59:59Z',
      price_min: 4,
      price_max: 10,
      recent_matches_window: 3,
      max_daily_price_step: 1,
      default_initial_price: 6,
      scoring_source: 'existing_mvp_points_formula_v1'
    },
    players
  };
}

test('helper functions stay deterministic around averages, reliability, smoothing, and caps', () => {
  assert.equal(average([]), 0);
  assert.equal(computeRecentAveragePoints([10, 20, 30, 40], 3), 30);
  assert.equal(computeReliabilityFactor(1), 0.25);
  assert.equal(computeReliabilityFactor(5), 1);
  assert.equal(mapPercentileToPrice(0), 4);
  assert.equal(mapPercentileToPrice(10), 4);
  assert.equal(mapPercentileToPrice(10.01), 5);
  assert.equal(mapPercentileToPrice(92), 9);
  assert.equal(mapPercentileToPrice(99), 10);
  assert.equal(smoothPrice(8, 10), 9);
  assert.equal(capPriceMovement(10, 8, 1, 4, 10), 9);
  assert.equal(capPriceMovement(3, 5, 1, 4, 10), 4);
});

test('eligible percentile calculation gives ties the same percentile', () => {
  const percentiles = calculateEligiblePercentiles([
    { player_id: 'a', adjusted_score: 50, adjusted_score_raw: 50 },
    { player_id: 'b', adjusted_score: 50, adjusted_score_raw: 50 },
    { player_id: 'c', adjusted_score: 10, adjusted_score_raw: 10 }
  ]);

  assert.equal(percentiles.get('a'), 75);
  assert.equal(percentiles.get('b'), 75);
  assert.equal(percentiles.get('c'), 0);
});

test('generatePrices applies ranking, smoothing, capping, inactive handling, and sorting', () => {
  const output = generatePrices(
    createJob([
      {
        player_id: 'alpha_star',
        name: 'Alpha Star',
        team: 'AAA',
        role: 'batter',
        pricing_eligible: true,
        old_price: 8,
        initial_price: 8,
        match_points: [60, 60, 60, 60],
        matches_played: 4,
        last_match_played_at_utc: '2026-04-06T18:30:00Z'
      },
      {
        player_id: 'alpha_fringe',
        name: 'Alpha Fringe',
        team: 'AAA',
        role: 'all_rounder',
        pricing_eligible: true,
        old_price: 5,
        initial_price: 5,
        match_points: [90],
        matches_played: 1,
        last_match_played_at_utc: '2026-04-06T18:30:00Z'
      },
      {
        player_id: 'beta_reliable',
        name: 'Beta Reliable',
        team: 'BBB',
        role: 'bowler',
        pricing_eligible: true,
        old_price: 7,
        initial_price: 7,
        match_points: [40, 40, 40, 40],
        matches_played: 4,
        last_match_played_at_utc: '2026-04-05T18:30:00Z'
      },
      {
        player_id: 'gamma_mismatch',
        name: 'Gamma Mismatch',
        team: 'CCC',
        role: 'bowler',
        pricing_eligible: true,
        old_price: 6,
        initial_price: 6,
        match_points: [20, 30],
        matches_played: 5,
        last_match_played_at_utc: '2026-04-04T18:30:00Z'
      },
      {
        player_id: 'delta_rookie',
        name: 'Delta Rookie',
        team: 'DDD',
        role: 'bowler',
        pricing_eligible: true,
        old_price: null,
        initial_price: 6,
        match_points: [],
        matches_played: 0,
        last_match_played_at_utc: null
      },
      {
        player_id: 'echo_inactive',
        name: 'Echo Inactive',
        team: 'EEE',
        role: 'wicket_keeper',
        pricing_eligible: false,
        old_price: 6,
        initial_price: 6,
        match_points: [99, 99],
        matches_played: 2,
        last_match_played_at_utc: '2026-04-03T18:30:00Z'
      }
    ])
  );

  assert.deepEqual(output.summary, {
    total_players_received: 6,
    eligible_players_ranked: 5,
    price_rises: 2,
    price_drops: 0,
    price_unchanged: 4
  });

  assert.deepEqual(
    output.players.map((player) => `${player.team}:${player.name}:${player.final_price}`),
    [
      'AAA:Alpha Star:9',
      'AAA:Alpha Fringe:6',
      'BBB:Beta Reliable:7',
      'CCC:Gamma Mismatch:6',
      'DDD:Delta Rookie:6',
      'EEE:Echo Inactive:6'
    ]
  );

  const alphaStar = output.players.find((player) => player.player_id === 'alpha_star');
  assert.equal(alphaStar.target_price, 10);
  assert.equal(alphaStar.smoothed_price, 9);
  assert.equal(alphaStar.final_price, 9);
  assert.equal(alphaStar.price_change, 1);
  assert.equal(alphaStar.percentile, 100);

  const alphaFringe = output.players.find((player) => player.player_id === 'alpha_fringe');
  assert.equal(alphaFringe.reliability_factor, 0.25);
  assert.equal(alphaFringe.adjusted_score, 22.5);
  assert.equal(alphaFringe.final_price, 6);
  assert.match(alphaFringe.calculation_notes.join(' '), /smoothing/i);

  const gammaMismatch = output.players.find((player) => player.player_id === 'gamma_mismatch');
  assert.equal(gammaMismatch.matches_played, 2);
  assert.match(gammaMismatch.calculation_notes.join(' '), /did not match match_points length/i);

  const deltaRookie = output.players.find((player) => player.player_id === 'delta_rookie');
  assert.equal(deltaRookie.final_price, 6);
  assert.equal(deltaRookie.price_change, 0);
  assert.match(deltaRookie.calculation_notes.join(' '), /No matches played; retained base price/i);

  const echoInactive = output.players.find((player) => player.player_id === 'echo_inactive');
  assert.equal(echoInactive.percentile, 0);
  assert.equal(echoInactive.final_price, 6);
  assert.match(echoInactive.calculation_notes.join(' '), /Not pricing eligible; retained base price/i);
});

test('generatePrices keeps equal adjusted scores on the same target price band', () => {
  const output = generatePrices(
    createJob([
      {
        player_id: 'tie_a',
        name: 'Tie A',
        team: 'AAA',
        role: 'batter',
        pricing_eligible: true,
        old_price: 7,
        initial_price: 7,
        match_points: [50, 50, 50, 50],
        matches_played: 4,
        last_match_played_at_utc: '2026-04-06T18:30:00Z'
      },
      {
        player_id: 'tie_b',
        name: 'Tie B',
        team: 'BBB',
        role: 'bowler',
        pricing_eligible: true,
        old_price: 8,
        initial_price: 8,
        match_points: [50, 50, 50, 50],
        matches_played: 4,
        last_match_played_at_utc: '2026-04-06T18:30:00Z'
      },
      {
        player_id: 'tie_c',
        name: 'Tie C',
        team: 'CCC',
        role: 'bowler',
        pricing_eligible: true,
        old_price: 5,
        initial_price: 5,
        match_points: [10, 10, 10, 10],
        matches_played: 4,
        last_match_played_at_utc: '2026-04-06T18:30:00Z'
      }
    ])
  );

  const tieA = output.players.find((player) => player.player_id === 'tie_a');
  const tieB = output.players.find((player) => player.player_id === 'tie_b');
  const tieC = output.players.find((player) => player.player_id === 'tie_c');

  assert.equal(tieA.percentile, tieB.percentile);
  assert.equal(tieA.target_price, tieB.target_price);
  assert.equal(tieA.target_price, 8);
  assert.equal(tieC.target_price, 4);
});

test('generatePrices caps uncapped players at 9 credits even if their rank maps to 10', () => {
  const output = generatePrices(
    createJob([
      {
        player_id: 'sameer_rizvi',
        name: 'Sameer Rizvi',
        team: 'DC',
        role: 'batter',
        is_uncapped: true,
        pricing_eligible: true,
        old_price: 10,
        initial_price: 10,
        match_points: [96, 111],
        matches_played: 2,
        last_match_played_at_utc: '2026-04-06T18:30:00Z'
      },
      {
        player_id: 'steady_veteran',
        name: 'Steady Veteran',
        team: 'MI',
        role: 'bowler',
        pricing_eligible: true,
        old_price: 8,
        initial_price: 8,
        match_points: [40, 40, 40, 40],
        matches_played: 4,
        last_match_played_at_utc: '2026-04-06T18:30:00Z'
      }
    ])
  );

  const sameer = output.players.find((player) => player.player_id === 'sameer_rizvi');
  assert.equal(sameer.is_uncapped, true);
  assert.equal(sameer.target_price, 9);
  assert.equal(sameer.smoothed_price, 9);
  assert.equal(sameer.final_price, 9);
  assert.equal(sameer.price_change, -1);
  assert.match(sameer.calculation_notes.join(' '), /uncapped player price ceiling applied at 9 credits/i);
});

test('generatePrices snaps recovered histories to the corrected target price', () => {
  const output = generatePrices(
    createJob([
      {
        player_id: 'vaibhav_fix',
        name: 'Vaibhav Suryavanshi',
        team: 'RR',
        role: 'batter',
        is_uncapped: true,
        pricing_eligible: true,
        old_price: 6,
        initial_price: 6,
        recovered_history: true,
        match_points: [61, 52, 57],
        matches_played: 3,
        last_match_played_at_utc: '2026-04-08T18:30:00Z'
      },
      {
        player_id: 'steady_star',
        name: 'Steady Star',
        team: 'AAA',
        role: 'batter',
        pricing_eligible: true,
        old_price: 8,
        initial_price: 8,
        match_points: [45, 44, 43, 42],
        matches_played: 4,
        last_match_played_at_utc: '2026-04-08T18:30:00Z'
      },
      {
        player_id: 'depth_piece',
        name: 'Depth Piece',
        team: 'BBB',
        role: 'bowler',
        pricing_eligible: true,
        old_price: 6,
        initial_price: 6,
        match_points: [10, 12],
        matches_played: 2,
        last_match_played_at_utc: '2026-04-08T18:30:00Z'
      }
    ])
  );

  const vaibhav = output.players.find((player) => player.player_id === 'vaibhav_fix');
  assert.equal(vaibhav.smoothed_price, vaibhav.target_price);
  assert.equal(vaibhav.final_price, vaibhav.target_price);
  assert.ok(vaibhav.final_price > 6);
  assert.match(vaibhav.calculation_notes.join(' '), /Recovered real match history/i);
});

test('pricing example fixture returns stable JSON-shaped output', async () => {
  const fixturePath = path.resolve(process.cwd(), 'fixtures', 'mini_fantasy_pricing_job_example.json');
  const raw = await fs.readFile(fixturePath, 'utf8');
  const output = generatePrices(JSON.parse(raw));

  assert.equal(output.job_meta.engine_version, 'pricing_v1');
  assert.equal(output.summary.total_players_received, 4);
  assert.equal(Array.isArray(output.players), true);
  assert.equal(output.generated_at_utc, '2026-04-06T23:59:59Z');
});
