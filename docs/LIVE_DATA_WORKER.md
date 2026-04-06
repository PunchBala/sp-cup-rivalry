# Live data worker

The live duel board does not call CricketData directly from the browser. It reads a committed snapshot:

- [data/live.json](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/data/live.json)

Mini Fantasy also reads a committed daily price book:

- [data/mini_fantasy_prices.json](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/data/mini_fantasy_prices.json)

That snapshot is refreshed by:

- [scripts/update-live-data.mjs](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/scripts/update-live-data.mjs)
- [update-live-data.yml](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/.github/workflows/update-live-data.yml)

## Runtime

- runs on GitHub-hosted Actions, not a laptop-bound self-hosted runner
- supports scheduled refresh windows and manual forced refresh
- writes `data/live.json`
- writes `data/mini_fantasy_prices.json`
- writes cached completed scorecards under `data/scorecards/`

## APIs used

- `series_info`
- `match_scorecard`
- official IPLT20 feeds for most dots and fair play

## Secrets

Workflow secrets:

- `CRICKETDATA_API_KEY`
- `CRICKETDATA_API_KEY_FALLBACK`

Current behavior:

- primary key is tried first
- fallback key is tried only for eligible provider failures such as quota, invalid key, or temporary block

## Credit protection

The worker has multiple guardrails now:

1. Completed scorecards are cached locally.
2. Historical replay is cache-first.
3. Historical replay does not re-burn old paid scorecards by default.
4. Backlog catch-up is capped.
5. Live scorecard polling is off unless explicitly enabled.
6. Fresh paid scorecard calls are hard-capped per run.

Important env knobs:

- `CRICKETDATA_ENABLE_LIVE_SCORECARD`
- `CRICKETDATA_LIVE_SCORECARD_INTERVAL_MINUTES`
- `CRICKETDATA_MAX_BACKLOG_SCORECARDS_PER_RUN`
- `CRICKETDATA_MAX_FRESH_SCORECARD_CALLS_PER_RUN`
- `CRICKETDATA_ALLOW_HISTORICAL_REPLAY`
- `CRICKETDATA_FORCE_REFRESH`

Default safety posture:

- no aggressive live polling
- no expensive full historical replay
- one fresh paid scorecard call per run unless you explicitly raise the cap

## Manual run behavior

A GitHub manual run (`workflow_dispatch`) sets forced refresh, which bypasses the schedule gate, but the worker still obeys:

- cache usage
- fallback-key rules
- fresh paid scorecard budget

## Outputs to inspect

When debugging, check:

- `meta.lastRun`
- `meta.providerStatus`
- `scrapeReport.costControl`
- `meta.scoreHistory`
- `data/mini_fantasy_prices.json`
- cached files in `data/scorecards/`

These fields tell you:

- how many paid scorecard calls happened
- how many cached scorecards were reused
- whether budget was exhausted
- whether fallback key was used
- whether historical replay was skipped

## Tests

Worker coverage lives in:

- [tests/update-live-data.quota.test.mjs](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/tests/update-live-data.quota.test.mjs)
- [tests/update-live-data.schedule.test.mjs](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/tests/update-live-data.schedule.test.mjs)
- [tests/update-live-data.scorecard-cache.test.mjs](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/tests/update-live-data.scorecard-cache.test.mjs)
- [tests/live-data.contract.test.mjs](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/tests/live-data.contract.test.mjs)

## Operational expectation

For a normal new completed match:

- `1` paid `match_scorecard` call is expected
- the result should be cached
- future rebuilds should reuse the cache instead of paying again
