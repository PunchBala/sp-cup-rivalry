const RECENT_AVERAGE_WEIGHT = 0.6;
const SEASON_AVERAGE_WEIGHT = 0.4;
const BASE_PRICE_WEIGHT = 0.7;
const TARGET_PRICE_WEIGHT = 0.3;
const FULL_CONFIDENCE_MATCHES = 4;
const TIE_EPSILON = 1e-9;
export const UNCAPPED_PLAYER_PRICE_MAX = 9;

export const ENGINE_VERSION = 'pricing_v1';

export const DEFAULT_PERCENTILE_PRICE_BANDS = Object.freeze([
  { gt: 0, lte: 10, price: 4 },
  { gt: 10, lte: 25, price: 5 },
  { gt: 25, lte: 45, price: 6 },
  { gt: 45, lte: 65, price: 7 },
  { gt: 65, lte: 80, price: 8 },
  { gt: 80, lte: 92, price: 9 },
  { gt: 92, lte: 100, price: 10 }
]);

export const PRICING_ENGINE_CONFIG_V1 = Object.freeze({
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

export function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function roundTo(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function average(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }

  const total = values.reduce((sum, value) => sum + Number(value || 0), 0);
  return total / values.length;
}

export function getRecentMatchPoints(matchPoints, windowSize) {
  if (!Array.isArray(matchPoints) || matchPoints.length === 0) {
    return [];
  }

  const normalizedWindow = Math.max(1, Math.trunc(windowSize || 0));
  return matchPoints.slice(-normalizedWindow);
}

export function computeSeasonAveragePoints(matchPoints) {
  return roundTo(average(matchPoints), 2);
}

export function computeRecentAveragePoints(matchPoints, windowSize) {
  return roundTo(average(getRecentMatchPoints(matchPoints, windowSize)), 2);
}

export function computeLastMatchPoints(matchPoints) {
  if (!Array.isArray(matchPoints) || matchPoints.length === 0) {
    return 0;
  }

  return Number(matchPoints[matchPoints.length - 1] || 0);
}

export function computeScoreBasis(recentAveragePoints, seasonAveragePoints) {
  return roundTo(
    RECENT_AVERAGE_WEIGHT * recentAveragePoints + SEASON_AVERAGE_WEIGHT * seasonAveragePoints,
    2
  );
}

export function computeReliabilityFactor(matchesPlayed, fullConfidenceMatches = FULL_CONFIDENCE_MATCHES) {
  if (!Number.isFinite(matchesPlayed) || matchesPlayed <= 0) {
    return 0;
  }

  return roundTo(clamp(matchesPlayed / fullConfidenceMatches, 0, 1), 4);
}

export function computeAdjustedScore(scoreBasis, reliabilityFactor) {
  return roundTo(scoreBasis * reliabilityFactor, 2);
}

export function resolveBasePrice(player, defaultInitialPrice) {
  if (Number.isFinite(player.old_price)) {
    return {
      basePrice: Math.round(player.old_price),
      note: 'Used old_price for smoothing'
    };
  }

  if (Number.isFinite(player.initial_price)) {
    return {
      basePrice: Math.round(player.initial_price),
      note: 'Missing old_price; used initial_price as base'
    };
  }

  return {
    basePrice: Math.round(defaultInitialPrice),
    note: 'Missing old_price and initial_price; used default initial price'
  };
}

export function mapPercentileToPrice(percentile, bands = DEFAULT_PERCENTILE_PRICE_BANDS) {
  if (!Array.isArray(bands) || bands.length === 0) {
    return PRICING_ENGINE_CONFIG_V1.rules.price_min;
  }

  if (percentile <= 0) {
    return bands[0].price;
  }

  const matchingBand = bands.find((band) => percentile > band.gt && percentile <= band.lte);
  return matchingBand ? matchingBand.price : bands[bands.length - 1].price;
}

export function smoothPrice(basePrice, targetPrice) {
  return Math.round(BASE_PRICE_WEIGHT * basePrice + TARGET_PRICE_WEIGHT * targetPrice);
}

export function capPriceMovement(candidatePrice, basePrice, maxDailyStep, priceMin, priceMax) {
  const boundedStep = clamp(candidatePrice, basePrice - maxDailyStep, basePrice + maxDailyStep);
  return clamp(boundedStep, priceMin, priceMax);
}

export function resolvePlayerPriceMax(player, priceMax) {
  return player?.is_uncapped ? Math.min(priceMax, UNCAPPED_PLAYER_PRICE_MAX) : priceMax;
}

export function calculateEligiblePercentiles(players) {
  const percentileMap = new Map();
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

function normalizeMatchHistory(player) {
  const notes = [];
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

function createCalculationNotes(player, derived, targetPrice, smoothedPrice, finalPrice, uncappedCapApplied) {
  const notes = [...derived.notes];

  if (!player.pricing_eligible) {
    notes.push('Not pricing eligible; retained base price');
    return notes;
  }

  if (derived.effectiveMatchesPlayed === 0) {
    notes.push('No matches played; retained base price');
    return notes;
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

function derivePlayerInputs(player, jobMeta) {
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

export function generatePrices(input) {
  const derivedPlayers = input.players.map((player) => derivePlayerInputs(player, input.job_meta));
  const eligibleRankingPool = derivedPlayers
    .filter((entry) => entry.player.pricing_eligible)
    .map((entry) => ({
      player_id: entry.player.player_id,
      adjusted_score: entry.adjustedScore,
      adjusted_score_raw: entry.adjustedScoreRaw
    }));
  const percentiles = calculateEligiblePercentiles(eligibleRankingPool);

  const players = derivedPlayers
    .map((entry) => {
      const playerPriceMax = resolvePlayerPriceMax(entry.player, input.job_meta.price_max);
      const percentile = entry.player.pricing_eligible ? percentiles.get(entry.player.player_id) ?? 0 : 0;
      const rawTargetPrice = entry.player.pricing_eligible
        ? mapPercentileToPrice(percentile)
        : entry.basePrice;
      const targetPrice = clamp(rawTargetPrice, input.job_meta.price_min, playerPriceMax);

      // Keep brand-new or inactive players stable until they have usable ranked history.
      const rawSmoothedPrice =
        entry.player.pricing_eligible && entry.effectiveMatchesPlayed > 0
          ? smoothPrice(entry.basePrice, targetPrice)
          : entry.basePrice;
      const smoothedPrice = clamp(rawSmoothedPrice, input.job_meta.price_min, playerPriceMax);

      const finalPrice =
        entry.player.pricing_eligible && entry.effectiveMatchesPlayed > 0
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
      const calculationNotes = createCalculationNotes(entry.player, { ...entry, percentile }, targetPrice, smoothedPrice, finalPrice, uncappedCapApplied);

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

  const summary = players.reduce(
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
