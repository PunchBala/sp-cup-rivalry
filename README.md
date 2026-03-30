# IPL 2026 Prediction War Room

Live IPL 2026 prediction tracker for head-to-head season bets.

This version uses a CricketData-powered worker for live data refreshes and a canonical entity-matching layer for player and team picks, so scoring no longer depends on fragile raw string matching.

## Files to replace in your repo

- `index.html`
- `scripts/update-live-data.mjs`
- `.github/workflows/update-live-data.yml`
- `ipl_2026_squads.json`

## New file required

Add this file to the repo root:

- `ipl_2026_squads.json`

This squad map is now the source of truth for player-team tagging.

## Before running

1. Regenerate your CricketData API key.
2. In GitHub repo settings, create a secret named `CRICKETDATA_API_KEY`.
3. Keep the self-hosted runner running.
4. Add `ipl_2026_squads.json` to the repo root.
5. Run the workflow once manually.

## What this version does

- uses CricketData instead of brittle scraping for core season stats
- refreshes every 5 minutes during live match windows
- limits quiet refreshes to roughly 5 per day outside live windows
- incrementally processes completed matches instead of recomputing everything every run
- computes these categories:
  - orange cap
  - most sixes
  - purple cap
  - most dots
  - MVP
  - uncapped MVP
  - fair play
  - highest team score
  - striker
  - best bowling figures
  - best bowling strike rate
  - most catches
  - title standings
  - bottom standings
  - least MVP

## Architecture change: canonical entity matching

This update changes the app from string-based comparison to identity-based comparison.

### Before
- picks and live data were compared using raw or lightly normalized text
- abbreviations and alternate spellings could score incorrectly
- examples of drift:
  - `Boult` vs `Trent Boult`
  - `Phil Salt` vs `Philip Salt`
  - `Abishek Sharma` vs `Abhishek Sharma`
  - `Varun Chakravarthy` vs `Varun Chakaravarthy`
  - `MI` vs `Mumbai Indians`

### Now
- each pick is resolved to a canonical `playerId` or `teamId`
- each live row is resolved the same way before ranking and scoring
- UI still shows friendly names, but scoring uses canonical identity underneath

## What the entity layer fixes

- top-5 and better-rank categories no longer break because of naming drift
- one-ranked-vs-one-unranked logic is more reliable because both sides are tagged first
- team abbreviation picks now match full team names from live feeds
- worker aggregates are normalized toward canonical squad names before they reach the frontend

## Alias handling included

Common live-data drift is handled automatically, including cases like:

- `Boult` -> `Trent Boult`
- `Phil Salt` / `Philip Salt`
- `Abishek Sharma` / `Abhishek Sharma`
- `Varun Chakravarthy` / `Varun Chakaravarthy`
- `AM Ghazanfar` / `Allah Ghazanfar`
- team abbreviations like `MI`, `RCB`, `PBKS`, `SRH`

## Worker behaviour

The worker now:

- loads `ipl_2026_squads.json`
- canonicalizes player names from scorecards before updating aggregates
- keeps the existing live refresh budgeting and cached completed-match behaviour
- continues writing output to `data/live.json`

## Frontend behaviour

The frontend now:

- resolves both locked picks and live leaderboard rows through the entity index
- compares picks by canonical identity instead of plain text
- keeps your current UI and scoring system while making the matching layer more robust

## Validation done

- `node --check` passed for the updated worker
- script extraction plus syntax check passed for the updated `index.html`

## Practical repo note

For GitHub Pages, your deployed site should still use the repo root `index.html`.
If you downloaded a differently named file during patching, copy its contents into the root `index.html` before pushing.
