# Duels test coverage

This file keeps its old filename for continuity, but it now documents the current `Duels` test surface.

## What CI covers

- scoring engine regression tests
- fixture-driven engine checks against saved live snapshots
- duel-room model validation
- live-data contract validation
- worker schedule, quota, and scorecard-cache behavior
- page wiring for public duel browsing and hosted backend integration
- Playwright smoke for the board-first duel flow

## Main workflows

- [warroom-tests.yml](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/.github/workflows/warroom-tests.yml)
- [update-live-data.yml](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/.github/workflows/update-live-data.yml)

## CI unit and wiring suite

```bash
node --test \
  tests/warroom-engine.golden.test.mjs \
  tests/warroom-engine.fixtures.test.mjs \
  tests/live-data.contract.test.mjs \
  tests/warroom-room-model.test.mjs \
  tests/update-live-data.quota.test.mjs \
  tests/update-live-data.schedule.test.mjs \
  tests/update-live-data.scorecard-cache.test.mjs \
  tests/page.directory-wiring.test.mjs \
  tests/duels-backend.wiring.test.mjs
```

## Extra local coverage

Optional local checks that are useful while iterating:

```bash
node --test tests/page.alias-wiring.test.mjs
node scripts/validate-live-data.mjs data/live.json
node scripts/validate-war-room-config.mjs fixtures/war_room_sp_cup_2026.json fixtures/war_room_draft_example.json
```

## Smoke test

Install once:

```bash
npm install -D @playwright/test
npx playwright install chromium
```

Run:

```bash
python -m http.server 4173
npx playwright test tests/page.smoke.spec.mjs --reporter=line
```

## What the smoke test should prove

- the board-first page renders without runtime errors
- main duel surfaces are reachable
- the active duel renders score, metrics, worm, and live category board
- create, join, and manage flows do not crash the page
- layout and wording changes did not break the main user path

## Worker-specific protection

The live-data worker now has dedicated regression coverage for:

- CricketData quota, invalid-key, and temporary-block parsing
- schedule-gated vs forced refresh behavior
- scorecard cache reads and writes
- cache-backed historical rebuilds
- fresh paid scorecard call budget helpers
