# War Room tests

These tests protect the scoring engine, the duel-first war room model, and the page smoke path.

## What is covered

- golden rule tests for scoring and alias logic
- fixture-driven tests against saved `live.json` snapshots
- war-room model tests for explicit duels and duplicate display names across duels
- a browser smoke test that loads `index.html`, injects fixture live data, and checks the duel tabs render

## Local test commands

Run these from the repo root:

```bash
node --test tests/warroom-engine.golden.test.mjs tests/warroom-engine.fixtures.test.mjs tests/live-data.contract.test.mjs tests/warroom-room-model.test.mjs tests/update-live-data.quota.test.mjs tests/update-live-data.schedule.test.mjs tests/page.alias-wiring.test.mjs
node scripts/validate-live-data.mjs data/live.json
node scripts/validate-war-room-config.mjs fixtures/war_room_sp_cup_2026.json fixtures/war_room_draft_example.json
```

## Local page smoke test

Install the runner once:

```bash
npm install -D @playwright/test
npx playwright install chromium
```

Start a local server from the repo root:

```bash
python -m http.server 4173
```

Then run:

```bash
npx playwright test tests/page.smoke.spec.mjs --reporter=line
```


## Extra runtime alias coverage

- `tests/page.alias-wiring.test.mjs` protects the page runtime from drifting back to team-only alias matching.
- This catches cases like `Vaibhav Sooryavanshi`, `V Suryavanshi`, and `Tilak Varma` style display variants before they silently become `Live: unranked`.
