const RECENT_AVERAGE_WEIGHT = 0.6;
const SEASON_AVERAGE_WEIGHT = 0.4;
const BASE_PRICE_WEIGHT = 0.7;
const TARGET_PRICE_WEIGHT = 0.3;
const FULL_CONFIDENCE_MATCHES = 4;
const TIE_EPSILON = 1e-9;
export const UNCAPPED_PLAYER_PRICE_MAX = 9;

export type PlayerRole = 'batter' | 'bowler' | 'all_rounder' | 'wicket_keeper';

export interface PricingPercentileBand {
  gt: number;
  lte: number;
  price: number;
}

export interface PricingJobMetaInput {
  season: string;
  as_of_utc: string;
  price_min: number;
  price_max: number;
  recent_matches_window: number;
  max_daily_price_step: number;
  default_initial_price: number;
  scoring_source: string;
  notes?: string;
}

export interface PricingPlayerInput {
  player_id: string;
  name: string;
  team: string;
  role: PlayerRole;
  is_uncapped?: boolean;
  pricing_eligible: boolean;
  old_price: number | null;
  initial_price: number | null;
  recovered_history?: boolean;
  match_points: number[];
  matches_played: number;
  last_match_played_at_utc: string | null;
}

export interface PricingJobInput {
  job_meta: PricingJobMetaInput;
  players: PricingPlayerInput[];
}

export interface PricingJobMetaOutput extends PricingJobMetaInput {
  engine_version: string;
}

export interface PricingSummary {
  total_players_received: number;
  eligible_players_ranked: number;
  price_rises: number;
  price_drops: number;
  price_unchanged: number;
}

export interface PricingPlayerOutput {
  player_id: string;
  name: string;
  team: string;
  role: PlayerRole;
  is_uncapped: boolean;
  pricing_eligible: boolean;
  old_price: number | null;
  initial_price: number | null;
  target_price: number;
  smoothed_price: number;
  final_price: number;
  price_change: number;
  matches_played: number;
  season_avg_points: number;
  recent_avg_points: number;
  last_match_points: number;
  score_basis: number;
  reliability_factor: number;
  adjusted_score: number;
  percentile: number;
  calculation_notes: string[];
  last_match_played_at_utc: string | null;
}

export interface PricingJobOutput {
  job_meta: PricingJobMetaOutput;
  summary: PricingSummary;
  players: PricingPlayerOutput[];
  generated_at_utc: string;
}

export interface PricingEngineConfig {
  engine_version: string;
  rules: {
    price_min: number;
    price_max: number;
    uncapped_price_max: number;
    recent_matches_window: number;
    max_daily_price_step: number;
    default_initial_price: number;
    score_basis_weights: {
      recent_avg_points: number;
      season_avg_points: number;
    };
    reliability: {
      type: 'linear_until_matches';
      full_confidence_matches: number;
    };
    smoothing: {
      old_price_weight: number;
      target_price_weight: number;
      rounding: 'nearest_integer';
    };
    percentile_price_bands: readonly PricingPercentileBand[];
    special_cases: {
      no_matches_played: 'retain_base_price';
      not_pricing_eligible: 'retain_base_price';
      missing_old_price: 'fallback_to_initial_or_default';
    };
  };
}

interface BasePriceResolution {
  basePrice: number;
  note: string;
}

interface EligibleRankingRecord {
  player_id: string;
  adjusted_score: number;
  adjusted_score_raw: number;
}

interface DerivedPlayerInputs {
  player: PricingPlayerInput;
  basePrice: number;
  maxDailyPriceStep: number;
  recoveredHistory: boolean;
  seasonAveragePoints: number;
  recentAveragePoints: number;
  lastMatchPoints: number;
  scoreBasis: number;
  reliabilityFactor: number;
  adjustedScoreRaw: number;
  adjustedScore: number;
  effectiveMatchesPlayed: number;
  notes: string[];
}

export const ENGINE_VERSION = 'pricing_v1';

export const DEFAULT_PERCENTILE_PRICE_BANDS: readonly PricingPercentileBand[] = Object.freeze([
  { gt: 0, lte: 10, price: 4 },
  { gt: 10, lte: 25, price: 5 },
  { gt: 25, lte: 45, price: 6 },
  { gt: 45, lte: 65, price: 7 },
  { gt: 65, lte: 80, price: 8 },
  { gt: 80, lte: 92, price: 9 },
  { gt: 92, lte: 100, price: 10 }
]);

export const PRICING_ENGINE_CONFIG_V1: PricingEngineConfig = Object.freeze({
  engine_version: ENGINE_VERSION,
  rules: {
    price_min: 4,
    price_max: 10,
    uncapped_price_max: UNCAPPED_PLAYER_PRICE_MAX,
    recent_matches_window: 3,
    max_daily_price_step: 1,
    default_initial_price: 6,
    score_basis_weights: {
      recent_avg_points: RECENT_AVERAGE_WEIGHT,
      season_avg_points: SEASON_AVERAGE_WEIGHT
    },
    reliability: {
      type: 'linear_until_matches',
      full_confidence_matches: FULL_CONFIDENCE_MATCHES
    },
    smoothing: {
      old_price_weight: BASE_PRICE_WEIGHT,
      target_price_weight: TARGET_PRICE_WEIGHT,
      rounding: 'nearest_integer'
    },
    percentile_price_bands: DEFAULT_PERCENTILE_PRICE_BANDS,
    special_cases: {
      no_matches_played: 'retain_base_price',
      not_pricing_eligible: 'retain_base_price',
      missing_old_price: 'fallback_to_initial_or_default'
    }
  }
});

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function roundTo(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function average(values: number[]): number {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }

  const total = values.reduce((sum, value) => sum + Number(value || 0), 0);
  return total / values.length;
}

export function getRecentMatchPoints(matchPoints: number[], windowSize: number): number[] {
  if (!Array.isArray(matchPoints) || matchPoints.length === 0) {
    return [];
  }

  const normalizedWindow = Math.max(1, Math.trunc(windowSize || 0));
  return matchPoints.slice(-normalizedWindow);
}

export function computeSeasonAveragePoints(matchPoints: number[]): number {
  return roundTo(average(matchPoints), 2);
}

export function computeRecentAveragePoints(matchPoints: number[], windowSize: number): number {
  return roundTo(average(getRecentMatchPoints(matchPoints, windowSize)), 2);
}

export function computeLastMatchPoints(matchPoints: number[]): number {
  if (!Array.isArray(matchPoints) || matchPoints.length === 0) {
    return 0;
  }

  return Number(matchPoints[matchPoints.length - 1] || 0);
}

export function computeScoreBasis(recentAveragePoints: number, seasonAveragePoints: number): number {
  return roundTo(
    RECENT_AVERAGE_WEIGHT * recentAveragePoints + SEASON_AVERAGE_WEIGHT * seasonAveragePoints,
    2
  );
}

export function computeReliabilityFactor(
  matchesPlayed: number,
  fullConfidenceMatches = FULL_CONFIDENCE_MATCHES
): number {
  if (!Number.isFinite(matchesPlayed) || matchesPlayed <= 0) {
    return 0;
  }

  return roundTo(clamp(matchesPlayed / fullConfidenceMatches, 0, 1), 4);
}

export function computeAdjustedScore(scoreBasis: number, reliabilityFactor: number): number {
  return roundTo(scoreBasis * reliabilityFactor, 2);
}

export function resolveBasePrice(
  player: Pick<PricingPlayerInput, 'old_price' | 'initial_price'>,
  defaultInitialPrice: number
): BasePriceResolution {
  if (Number.isFinite(player.old_price)) {
    return {
      basePrice: Math.round(player.old_price as number),
      note: 'Used old_price for smoothing'
    };
  }

  if (Number.isFinite(player.initial_price)) {
    return {
      basePrice: Math.round(player.initial_price as number),
      note: 'Missing old_price; used initial_price as base'
    };
  }

  return {
    basePrice: Math.round(defaultInitialPrice),
    note: 'Missing old_price and initial_price; used default initial price'
  };
}

export function mapPercentileToPrice(
  percentile: number,
  bands: readonly PricingPercentileBand[] = DEFAULT_PERCENTILE_PRICE_BANDS
): number {
  if (!Array.isArray(bands) || bands.length === 0) {
    return PRICING_ENGINE_CONFIG_V1.rules.price_min;
  }

  if (percentile <= 0) {
    return bands[0].price;
  }

  const matchingBand = bands.find((band) => percentile > band.gt && percentile <= band.lte);
  return matchingBand ? matchingBand.price : bands[bands.length - 1].price;
}

export function smoothPrice(basePrice: number, targetPrice: number): number {
  return Math.round(BASE_PRICE_WEIGHT * basePrice + TARGET_PRICE_WEIGHT * targetPrice);
}

export function capPriceMovement(
  candidatePrice: number,
  basePrice: number,
  maxDailyStep: number,
  priceMin: number,
  priceMax: number
): number {
  const boundedStep = clamp(candidatePrice, basePrice - maxDailyStep, basePrice + maxDailyStep);
  return clamp(boundedStep, priceMin, priceMax);
}

export function resolvePlayerPriceMax(
  player: Pick<PricingPlayerInput, 'is_uncapped'>,
  priceMax: number
): number {
  return player.is_uncapped ? Math.min(priceMax, UNCAPPED_PLAYER_PRICE_MAX) : priceMax;
}

export function calculateEligiblePercentiles(players: EligibleRankingRecord[]): Map<string, number> {
  const percentileMap = new Map<string, number>();
  if (!Array.isArray(players) || players.length === 0) {
    return percentileMap;
  }

  // Average-rank percentile keeps tied adjusted scores on the same price band.
  const sorted = [...players]
    .map((player) => ({
      ...player,
      scoreKey: roundTo(player.adjusted_score_raw ?? player.adjusted_score ?? 0, 6)
    }))
    .sort((a, b) => {
      if (Math.abs(b.scoreKey - a.scoreKey) > TIE_EPSILON) {
        return b.scoreKey - a.scoreKey;
      }
      return a.player_id.localeCompare(b.player_id);
    });

  if (sorted.length === 1) {
    percentileMap.set(sorted[0].player_id, 100);
    return percentileMap;
  }

  let index = 0;
  while (index < sorted.length) {
    const groupStart = index;
    const scoreKey = sorted[index].scoreKey;

    while (index + 1 < sorted.length && Math.abs(sorted[index + 1].scoreKey - scoreKey) <= TIE_EPSILON) {
      index += 1;
    }

    const groupEnd = index;
    const averageRank = (groupStart + 1 + groupEnd + 1) / 2;
    const percentile = roundTo(((sorted.length - averageRank) / (sorted.length - 1)) * 100, 2);

    for (let cursor = groupStart; cursor <= groupEnd; cursor += 1) {
      percentileMap.set(sorted[cursor].player_id, percentile);
    }

    index += 1;
  }

  return percentileMap;
}

function normalizeMatchHistory(player: PricingPlayerInput): {
  matchPoints: number[];
  effectiveMatchesPlayed: number;
  notes: string[];
} {
  const notes: string[] = [];
  const matchPoints = Array.isArray(player.match_points)
    ? player.match_points.map((points) => Number(points || 0))
    : [];
  const declaredMatchesPlayed = Number.isFinite(player.matches_played)
    ? Math.max(0, Math.trunc(player.matches_played))
    : 0;

  let effectiveMatchesPlayed = declaredMatchesPlayed;
  if (matchPoints.length !== declaredMatchesPlayed) {
    effectiveMatchesPlayed = matchPoints.length;
    notes.push(
      `matches_played (${declaredMatchesPlayed}) did not match match_points length (${matchPoints.length}); used match_points length for calculations`
    );
  }

  return {
    matchPoints,
    effectiveMatchesPlayed,
    notes
  };
}

function createCalculationNotes(
  player: PricingPlayerInput,
  derived: DerivedPlayerInputs & { percentile: number },
  targetPrice: number,
  smoothedPrice: number,
  finalPrice: number,
  uncappedCapApplied: boolean
): string[] {
  const notes = [...derived.notes];

  if (!player.pricing_eligible) {
    notes.push('Not pricing eligible; retained base price');
    return notes;
  }

  if (derived.effectiveMatchesPlayed === 0) {
    notes.push('No matches played; retained base price');
    return notes;
  }

  if (derived.recoveredHistory) {
    notes.push('Recovered real match history from a previously blank price; used the corrected target price immediately');
  }

  if (targetPrice !== derived.basePrice) {
    notes.push(`Target price mapped from percentile ${roundTo(derived.percentile, 2)}`);
  }

  if (smoothedPrice !== targetPrice) {
    notes.push('Applied smoothing against the target price');
  }

  if (finalPrice !== smoothedPrice) {
    const direction = finalPrice > smoothedPrice ? '+' : '-';
    notes.push(`Price movement capped to ${direction}${derived.maxDailyPriceStep} daily step`);
  }

  if (player.old_price == null) {
    notes.push('Missing historical old_price; reported price_change as 0 for initialization');
  }

  if (uncappedCapApplied) {
    notes.push(`Uncapped player price ceiling applied at ${UNCAPPED_PLAYER_PRICE_MAX} credits`);
  }

  return notes;
}

function derivePlayerInputs(player: PricingPlayerInput, jobMeta: PricingJobMetaInput): DerivedPlayerInputs {
  const { basePrice, note } = resolveBasePrice(player, jobMeta.default_initial_price);
  const { matchPoints, effectiveMatchesPlayed, notes: historyNotes } = normalizeMatchHistory(player);
  const seasonAveragePoints = computeSeasonAveragePoints(matchPoints);
  const recentAveragePoints = computeRecentAveragePoints(matchPoints, jobMeta.recent_matches_window);
  const lastMatchPoints = computeLastMatchPoints(matchPoints);
  const scoreBasis = computeScoreBasis(recentAveragePoints, seasonAveragePoints);
  const reliabilityFactor = computeReliabilityFactor(effectiveMatchesPlayed);
  const adjustedScoreRaw = scoreBasis * reliabilityFactor;
  const adjustedScore = computeAdjustedScore(scoreBasis, reliabilityFactor);

  return {
    player,
    basePrice,
    maxDailyPriceStep: jobMeta.max_daily_price_step,
    recoveredHistory: Boolean(player.recovered_history) && effectiveMatchesPlayed > 0,
    seasonAveragePoints,
    recentAveragePoints,
    lastMatchPoints,
    scoreBasis,
    reliabilityFactor,
    adjustedScoreRaw,
    adjustedScore,
    effectiveMatchesPlayed,
    notes: [note, ...historyNotes]
  };
}

export function generatePrices(input: PricingJobInput): PricingJobOutput {
  const derivedPlayers = input.players.map((player) => derivePlayerInputs(player, input.job_meta));
  const eligibleRankingPool: EligibleRankingRecord[] = derivedPlayers
    .filter((entry) => entry.player.pricing_eligible)
    .map((entry) => ({
      player_id: entry.player.player_id,
      adjusted_score: entry.adjustedScore,
      adjusted_score_raw: entry.adjustedScoreRaw
    }));
  const percentiles = calculateEligiblePercentiles(eligibleRankingPool);

  const players = derivedPlayers
    .map((entry): PricingPlayerOutput => {
      const playerPriceMax = resolvePlayerPriceMax(entry.player, input.job_meta.price_max);
      const percentile = entry.player.pricing_eligible ? percentiles.get(entry.player.player_id) ?? 0 : 0;
      const rawTargetPrice = entry.player.pricing_eligible
        ? mapPercentileToPrice(percentile)
        : entry.basePrice;
      const targetPrice = clamp(rawTargetPrice, input.job_meta.price_min, playerPriceMax);

      // Keep brand-new or inactive players stable until they have usable ranked history.
      const rawSmoothedPrice =
        entry.recoveredHistory
          ? targetPrice
          : entry.player.pricing_eligible && entry.effectiveMatchesPlayed > 0
          ? smoothPrice(entry.basePrice, targetPrice)
          : entry.basePrice;
      const smoothedPrice = clamp(rawSmoothedPrice, input.job_meta.price_min, playerPriceMax);

      const finalPrice =
        entry.recoveredHistory
          ? clamp(targetPrice, input.job_meta.price_min, playerPriceMax)
          : entry.player.pricing_eligible && entry.effectiveMatchesPlayed > 0
          ? capPriceMovement(
              smoothedPrice,
              entry.basePrice,
              input.job_meta.max_daily_price_step,
              input.job_meta.price_min,
              playerPriceMax
            )
          : clamp(entry.basePrice, input.job_meta.price_min, playerPriceMax);

      const priceChange = entry.player.old_price == null ? 0 : finalPrice - Math.round(entry.player.old_price);
      const uncappedCapApplied = Boolean(entry.player.is_uncapped) && (
        rawTargetPrice > playerPriceMax ||
        rawSmoothedPrice > playerPriceMax ||
        entry.basePrice > playerPriceMax
      );
      const calculationNotes = createCalculationNotes(
        entry.player,
        { ...entry, percentile },
        targetPrice,
        smoothedPrice,
        finalPrice,
        uncappedCapApplied
      );

      return {
        player_id: entry.player.player_id,
        name: entry.player.name,
        team: entry.player.team,
        role: entry.player.role,
        is_uncapped: Boolean(entry.player.is_uncapped),
        pricing_eligible: entry.player.pricing_eligible,
        old_price: entry.player.old_price,
        initial_price: entry.player.initial_price,
        target_price: targetPrice,
        smoothed_price: smoothedPrice,
        final_price: finalPrice,
        price_change: priceChange,
        matches_played: entry.effectiveMatchesPlayed,
        season_avg_points: entry.seasonAveragePoints,
        recent_avg_points: entry.recentAveragePoints,
        last_match_points: entry.lastMatchPoints,
        score_basis: entry.scoreBasis,
        reliability_factor: entry.reliabilityFactor,
        adjusted_score: entry.adjustedScore,
        percentile,
        calculation_notes: calculationNotes,
        last_match_played_at_utc: entry.player.last_match_played_at_utc
      };
    })
    .sort((left, right) => {
      const teamCompare = left.team.localeCompare(right.team);
      if (teamCompare !== 0) {
        return teamCompare;
      }

      if (right.final_price !== left.final_price) {
        return right.final_price - left.final_price;
      }

      return left.name.localeCompare(right.name);
    });

  const summary = players.reduce<PricingSummary>(
    (accumulator, player) => {
      if (player.price_change > 0) {
        accumulator.price_rises += 1;
      } else if (player.price_change < 0) {
        accumulator.price_drops += 1;
      } else {
        accumulator.price_unchanged += 1;
      }

      return accumulator;
    },
    {
      total_players_received: input.players.length,
      eligible_players_ranked: eligibleRankingPool.length,
      price_rises: 0,
      price_drops: 0,
      price_unchanged: 0
    }
  );

  return {
    job_meta: {
      ...input.job_meta,
      engine_version: ENGINE_VERSION
    },
    summary,
    players,
    generated_at_utc: input.job_meta.as_of_utc
  };
}
