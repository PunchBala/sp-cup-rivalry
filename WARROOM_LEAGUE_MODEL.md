# War Room league model

This is the V1-ready local league data contract.

## Why this exists

The current app already has strong protection for:
- scoring rules
- live data shape
- smoke tests

V1 introduces a new failure class: malformed saved leagues, missing picks, duplicate players, or bad category keys. This model protects that before Supabase is added.

## Core league shape

A valid league JSON must include:
- `version`
- `id`
- `slug`
- `name`
- `templateId`
- `visibility`
- `state`
- `players[]`
- `picks{}`

## Current template

- `ipl-classic-v1`

## States

- `draft` → incomplete picks allowed
- `locked` → all picks required

## Files added in Phase E

- `warroom-league-model.mjs` → schema helpers, validator, matchup builder, local adapter
- `scripts/validate-league-config.mjs` → direct validator for fixture or future exported league JSON
- `fixtures/league_sp_cup_2026.json` → locked real league fixture using current picks
- `fixtures/league_draft_example.json` → draft fixture proving incomplete picks can still validate
- `tests/league-model.test.mjs` → product-model tests

## Why the adapter matters

The local adapter gives V1 a clean seam:
- today: load from fixture JSON
- later: load from Supabase

The rest of the app can consume matchup objects without caring where the league came from.

## Expected future flow

1. Load league by slug from adapter
2. Validate league config
3. Build pairwise matchups from league players + picks
4. Feed those matchups into the existing scoring engine

That means the existing scoring engine remains the scoring truth, while the league model becomes the product-data truth.
