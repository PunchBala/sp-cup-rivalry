# War Room test commands

Run from repo root.

## Engine + live-data + league-model tests

```bash
node --test tests/warroom-engine.golden.test.mjs tests/warroom-engine.fixtures.test.mjs tests/live-data.contract.test.mjs tests/league-model.test.mjs
```

## Direct validators

Validate the current live data payload:

```bash
node scripts/validate-live-data.mjs data/live.json
```

Validate shipped or exported league JSON:

```bash
node scripts/validate-league-config.mjs fixtures/league_sp_cup_2026.json fixtures/league_draft_example.json
```

## What Phase E adds

- league schema helpers in `warroom-league-model.mjs`
- local adapter for fixture-driven league loading
- validation for locked vs draft league states
- pairwise matchup generation from saved league data
- regression tests for malformed league data
