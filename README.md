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

`Mini Fantasy` is now a real sibling game mode in the app:

- one entry per user per eligible match
- 4-player team under a 31-credit budget
- at least 1 player from each real team
- at least 1 batter and 1 bowler
- one captain at `1.5x`
- Match 14 is open for entry now
- later fixtures open from the day before
- saved entries freeze their own fixture price snapshot
- a global leaderboard ranks users by Mini Fantasy points
- uncapped players are capped at `9.5` credits even if hot form would otherwise push them to `10`

Mini Fantasy stays isolated from duel scoring and duel UI at the data/model layer.

## Current product shape

- `Board` is the main viewing surface: scoreboard, live category board, worm, and key duel metrics
- `Mini Fantasy` is a separate tab with open-fixture awareness, a 4-slot lineup builder, a global leaderboard, and saved match entries
- `Nerd Room` shows deeper ranking and board context
- `Schedule` shows the fixture timeline used by the duel lifecycle
- `Profile`, `Create duel`, `Manage duel`, and `Browse duels` live in drawers so the main page stays board-first
- duels are public to view right now

## Architecture

### Front end

- [index.html](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/index.html)

Static browser app, duel lifecycle UI, pickers, drawers, live board, and page logic.

Mini Fantasy UI also lives here for now: fixture windowing, team builder, captain selection, and local/hosted entry flows.

### Duel room and scoring model

- [warroom-room-model.mjs](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/warroom-room-model.mjs)
- [warroom-room-model.js](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/warroom-room-model.js)
- [warroom-engine.js](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/warroom-engine.js)

These filenames are legacy, but they are still the live duel-first room model and scoring engine used by the app.

### Hosted backend

- [duels-backend.js](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/duels-backend.js)
- [duels-backend.config.js](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/duels-backend.config.js)
- [docs/DUELS_BACKEND_SETUP.md](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/docs/DUELS_BACKEND_SETUP.md)

Supabase-backed auth, public duel persistence, and Mini Fantasy match-entry persistence plus leaderboard reads. If backend config is disabled, the page falls back to local beta storage.

### Live data worker

- [scripts/update-live-data.mjs](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/scripts/update-live-data.mjs)
- [docs/LIVE_DATA_WORKER.md](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/docs/LIVE_DATA_WORKER.md)

Fetches IPL season data, updates `data/live.json`, caches completed scorecards, and pushes refresh commits through GitHub Actions.

### Mini Fantasy contest and pricing

- [mini-fantasy/contest-engine.js](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/mini-fantasy/contest-engine.js)
- [data/mini_fantasy_prices.json](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/data/mini_fantasy_prices.json)
- [ipl_2026_team_roles.json](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/ipl_2026_team_roles.json)
- [docs/MINI_FANTASY_GAME.md](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/docs/MINI_FANTASY_GAME.md)

- [mini-fantasy/pricing-engine.ts](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/mini-fantasy/pricing-engine.ts)
- [mini-fantasy/pricing-engine.js](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/mini-fantasy/pricing-engine.js)
- [docs/MINI_FANTASY_PRICING_ENGINE.md](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/docs/MINI_FANTASY_PRICING_ENGINE.md)

Contest helpers live in `mini-fantasy/contest-engine.js`, while the pure JSON-in/JSON-out pricing layer still lives in `mini-fantasy/pricing-engine.*`. Daily generated prices are committed into `data/mini_fantasy_prices.json`.

## Duel data model

Fixture-backed rooms use:

- `duelRecords`
- `entryRecords`

Hosted backend uses:

- `duels`
- `duel_entries`
- `profiles`
- `mini_fantasy_entries`

The product is duel-first in both cases.

The same display name can appear in multiple duels with different picks because identity is based on entry ids or owner ids, not display names.

## URL shape

- `?room=sp-cup-2026`
- `?room=sp-cup-2026&duel=senthil-vibeesh`

## Local development

Serve the site from the repo root:

```bash
npm run serve-static
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
  tests/mini-fantasy-contest-engine.test.mjs \
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

Daily price-book refresh from live season data:

```bash
node scripts/update-mini-fantasy-prices.mjs
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
- [docs/MINI_FANTASY_GAME.md](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/docs/MINI_FANTASY_GAME.md)
- [docs/MINI_FANTASY_PRICING_ENGINE.md](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/docs/MINI_FANTASY_PRICING_ENGINE.md)

## Legacy note

Some file names still say `warroom` because the project started there. The current product name and framing are `Duels`.
