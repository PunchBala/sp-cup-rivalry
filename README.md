# IPL 2026 Prediction Duels

Static-first web app for IPL game modes built on a shared cricket data layer.

The live product today is `Duels`, a sealed head-to-head game where:

- each duel has exactly two entries
- users create a duel, share a link or duel code, and a challenger joins the open slot
- both sides submit 15 category picks
- duplicate picks across the duel are flagged as `clashes`
- opponent picks stay hidden until the duel is clash-free, frozen, and live
- scoring starts only from the duel's activation match onward

The app is hosted as a static site, with live cricket data refreshed into `data/live.json` by GitHub Actions.

Mini Fantasy now has a separate portable pricing engine in the repo. It is intentionally isolated from duel scoring and duel UI.

## Current product shape

- `Board` is the main viewing surface: scoreboard, live category board, worm, and key duel metrics
- `Nerd Room` shows deeper ranking and board context
- `Schedule` shows the fixture timeline used by the duel lifecycle
- `Profile`, `Create duel`, `Manage duel`, and `Browse duels` live in drawers so the main page stays board-first
- duels are public to view right now

## Architecture

### Front end

- [index.html](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/index.html)

Static browser app, duel lifecycle UI, pickers, drawers, live board, and page logic.

### Duel room and scoring model

- [warroom-room-model.mjs](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/warroom-room-model.mjs)
- [warroom-room-model.js](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/warroom-room-model.js)
- [warroom-engine.js](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/warroom-engine.js)

These filenames are legacy, but they are still the live duel-first room model and scoring engine used by the app.

### Hosted backend

- [duels-backend.js](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/duels-backend.js)
- [duels-backend.config.js](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/duels-backend.config.js)
- [docs/DUELS_BACKEND_SETUP.md](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/docs/DUELS_BACKEND_SETUP.md)

Supabase-backed auth and public duel persistence. If backend config is disabled, the page falls back to local beta storage.

### Live data worker

- [scripts/update-live-data.mjs](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/scripts/update-live-data.mjs)
- [docs/LIVE_DATA_WORKER.md](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/docs/LIVE_DATA_WORKER.md)

Fetches IPL season data, updates `data/live.json`, caches completed scorecards, and pushes refresh commits through GitHub Actions.

### Mini Fantasy pricing engine

- [mini-fantasy/pricing-engine.ts](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/mini-fantasy/pricing-engine.ts)
- [mini-fantasy/pricing-engine.js](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/mini-fantasy/pricing-engine.js)
- [docs/MINI_FANTASY_PRICING_ENGINE.md](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/docs/MINI_FANTASY_PRICING_ENGINE.md)

Pure JSON-in/JSON-out pricing layer for the upcoming Mini Fantasy mode. It consumes upstream per-player fantasy-point histories and emits daily integer player prices with explanation metadata.

## Duel data model

Fixture-backed rooms use:

- `duelRecords`
- `entryRecords`

Hosted backend uses:

- `duels`
- `duel_entries`
- `profiles`

The product is duel-first in both cases.

The same display name can appear in multiple duels with different picks because identity is based on entry ids or owner ids, not display names.

## URL shape

- `?room=sp-cup-2026`
- `?room=sp-cup-2026&duel=senthil-vibeesh`

## Local development

Serve the site from the repo root:

```bash
python -m http.server 4173
```

Then open:

```text
http://127.0.0.1:4173/index.html?room=sp-cup-2026
```

## Tests

Primary CI workflow:

- [warroom-tests.yml](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/.github/workflows/warroom-tests.yml)

Local test command:

```bash
node --test \
  tests/warroom-engine.golden.test.mjs \
  tests/warroom-engine.fixtures.test.mjs \
  tests/live-data.contract.test.mjs \
  tests/warroom-room-model.test.mjs \
  tests/mini-fantasy-pricing-engine.test.mjs \
  tests/update-live-data.quota.test.mjs \
  tests/update-live-data.schedule.test.mjs \
  tests/update-live-data.scorecard-cache.test.mjs \
  tests/page.directory-wiring.test.mjs \
  tests/duels-backend.wiring.test.mjs
```

Smoke test:

```bash
npx playwright test tests/page.smoke.spec.mjs --reporter=line
```

## Manual duel generation

Admin-friendly fixture generation lives in:

- [scripts/generate-war-room-duel.mjs](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/scripts/generate-war-room-duel.mjs)
- [manifests/duel_manifest_example.json](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/manifests/duel_manifest_example.json)

Example:

```bash
node scripts/generate-war-room-duel.mjs manifests/duel_manifest_example.json --room fixtures/war_room_sp_cup_2026.json
```

This prints:

- duel id
- share URL
- fixture payload with one `duelRecord` and two `entryRecords`

## Mini Fantasy pricing generation

Example:

```bash
node scripts/generate-mini-fantasy-prices.mjs fixtures/mini_fantasy_pricing_job_example.json
```

This prints one JSON pricing job output with:

- derived averages and adjusted scores
- target, smoothed, and final prices
- human-readable calculation notes
- summary counts for rises, drops, and unchanged players

## Key docs

- [WARROOM_V1_MODEL.md](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/WARROOM_V1_MODEL.md)
- [WARROOM_ENGINE_TESTS.md](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/WARROOM_ENGINE_TESTS.md)
- [WARROOM_RELEASE_CHECKLIST.md](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/WARROOM_RELEASE_CHECKLIST.md)
- [docs/DUELS_BACKEND_SETUP.md](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/docs/DUELS_BACKEND_SETUP.md)
- [docs/LIVE_DATA_WORKER.md](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/docs/LIVE_DATA_WORKER.md)
- [docs/MINI_FANTASY_PRICING_ENGINE.md](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/docs/MINI_FANTASY_PRICING_ENGINE.md)

## Legacy note

Some file names still say `warroom` because the project started there. The current product name and framing are `Duels`.
