# Mini Fantasy game layer

Mini Fantasy is a separate game mode from Duels.

This document covers the live contest layer that sits above the pricing engine.

## Entry availability

- first eligible fixture: `Match 14`
- `Match 14` opens early for entries now
- later fixtures open from the day before their start date
- every fixture locks at `start_time - 1 minute`

Earlier season data is still used to seed player prices, but user-facing entry windows are controlled by the contest layer.

## User flow

1. Sign in.
2. Open the `Mini Fantasy` tab.
3. See which fixtures are open for submission now and which one opens next.
4. Open one fixture and build a 4-player lineup.
5. Stay under `30` credits.
6. Include at least one player from each real team.
7. Include at least one batter and one bowler.
8. Choose one captain for a `1.5x` multiplier.
9. Save one entry per user per match.
10. Watch the global leaderboard rank every saved user by Mini Fantasy points.
11. Entry locks one minute before the match starts.

## Data sources

- [ipl_2026_schedule.json](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/ipl_2026_schedule.json)
- [ipl_2026_squads.json](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/ipl_2026_squads.json)
- [ipl_2026_team_roles.json](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/ipl_2026_team_roles.json)
- [data/live.json](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/data/live.json)
- [data/mini_fantasy_prices.json](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/data/mini_fantasy_prices.json)

## Core files

- [mini-fantasy/contest-engine.js](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/mini-fantasy/contest-engine.js)
- [mini-fantasy/pricing-engine.ts](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/mini-fantasy/pricing-engine.ts)
- [scripts/update-mini-fantasy-prices.mjs](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/scripts/update-mini-fantasy-prices.mjs)
- [index.html](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/index.html)

## Price handling

- Daily prices are generated from the shared season data layer.
- The browser reads the committed price book from `data/mini_fantasy_prices.json`.
- If a user saves an entry, that entry keeps its own fixture-specific `price_snapshot`.
- Later edits to that same entry reuse the snapshot so overnight repricing does not break the saved build.
- Uncapped players can be picked normally, but their price ceiling is `9` credits.

## Entry storage

Hosted backend:

- [duels-backend.js](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/duels-backend.js)
- [docs/duels_backend_supabase.sql](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/docs/duels_backend_supabase.sql)

Supabase table:

- `mini_fantasy_entries`

Each row stores:

- user id and handle
- season and match number
- fixture metadata
- selected player ids
- captain player id
- fixture price snapshot
- spent credits
- saved timestamps

If hosted backend is disabled, the page falls back to local browser storage for Mini Fantasy entries.

Leaderboard reads the same saved entries and aggregates them into a public ranking surface in the page.

## Locking

- A fixture becomes read-only at `start_time - 1 minute`.
- Backend RLS enforces that hosted entries cannot be inserted or updated after lock.
- Hosted reads are public so the global leaderboard can rank everyone in one table.
- The browser also disables editing when the fixture is locked.

## Tests

- [tests/mini-fantasy-pricing-engine.test.mjs](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/tests/mini-fantasy-pricing-engine.test.mjs)
- [tests/mini-fantasy-contest-engine.test.mjs](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/tests/mini-fantasy-contest-engine.test.mjs)
- [tests/page.smoke.spec.mjs](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/tests/page.smoke.spec.mjs)
