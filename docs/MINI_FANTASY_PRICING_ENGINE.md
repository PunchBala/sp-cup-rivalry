# Mini Fantasy pricing engine

Mini Fantasy is a separate game mode from Duels.

This document covers only the portable pricing layer that turns upstream player fantasy-point histories into daily integer player prices.

## Product framing

- `Duels` remains the sealed head-to-head prediction game
- `Mini Fantasy` is a per-match 4-player salary-cap game
- the pricing engine lives at the platform data layer and must stay independent from duel logic, UI, or database writes

## Contest availability note

Mini Fantasy contest entry windows belong to the separate contest layer.

Current live product behavior:

- `Match 14` is open for entry now
- later fixtures open from the day before
- the pricing layer stays independent from those UI and lock-window rules

The pricing engine can still use earlier completed-match point histories to seed fair starting prices.

## Pricing engine files

- [mini-fantasy/pricing-engine.ts](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/mini-fantasy/pricing-engine.ts)
- [mini-fantasy/pricing-engine.js](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/mini-fantasy/pricing-engine.js)
- [mini-fantasy/contest-engine.js](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/mini-fantasy/contest-engine.js)
- [scripts/generate-mini-fantasy-prices.mjs](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/scripts/generate-mini-fantasy-prices.mjs)
- [scripts/update-mini-fantasy-prices.mjs](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/scripts/update-mini-fantasy-prices.mjs)
- [tests/mini-fantasy-pricing-engine.test.mjs](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/tests/mini-fantasy-pricing-engine.test.mjs)

The TypeScript file is the typed source of truth. The JavaScript file is a checked-in runtime mirror so the current repo can execute and test the engine without introducing a TypeScript build step first.

## Engine contract

Primary export:

```ts
generatePrices(input: PricingJobInput): PricingJobOutput
```

Properties:

- pure function
- deterministic from JSON input
- no database dependency
- no framework dependency
- safe to run in a worker, cron, script, or backend service

## Core rules

Per eligible player, the engine derives:

- `season_avg_points`
- `recent_avg_points`
- `last_match_points`
- `matches_played`

Then:

- `score_basis = 0.6 * recent_avg_points + 0.4 * season_avg_points`
- `reliability_factor = min(1, matches_played / 4)`
- `adjusted_score = score_basis * reliability_factor`

Only `pricing_eligible = true` players are percentile-ranked.

Target price comes from percentile bands:

- `0-10 -> 4`
- `>10-25 -> 5`
- `>25-45 -> 6`
- `>45-65 -> 7`
- `>65-80 -> 8`
- `>80-92 -> 9`
- `>92-100 -> 10`

Then:

- smooth against base price using `0.7 old/base + 0.3 target`
- cap movement to `+/- 1` daily step by default
- clamp into `[4, 10]`

## Important V1 behaviors

- stars stay expensive because percentile ranking spans the whole eligible pool
- one great fringe match is dampened by the reliability factor
- inactive or not-eligible players retain base price
- players with zero matches retain base price
- if `matches_played` disagrees with `match_points.length`, the engine uses `match_points.length` and records a note
- tied `adjusted_score` values get the same percentile and same target price band

## Example job input

- [fixtures/mini_fantasy_pricing_job_example.json](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/fixtures/mini_fantasy_pricing_job_example.json)

## Local usage

From a JSON file:

```bash
node scripts/generate-mini-fantasy-prices.mjs fixtures/mini_fantasy_pricing_job_example.json
```

Or pipe JSON into stdin:

```bash
cat pricing-job.json | node scripts/generate-mini-fantasy-prices.mjs
```

From shared live season data:

```bash
node scripts/update-mini-fantasy-prices.mjs
```

## What this engine does not own

- contest entry windows
- fixture lock timing
- team validation rules
- captain multiplier scoring
- global leaderboards
- UI or database writes

Those belong to the Mini Fantasy contest layer that sits above pricing.

That contest layer is documented in [docs/MINI_FANTASY_GAME.md](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/docs/MINI_FANTASY_GAME.md).
