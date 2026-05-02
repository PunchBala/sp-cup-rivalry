# RapidAPI live feed probe

Use this when we want to test a third-party live cricket feed for **provisional Mini Fantasy only** before trusting it with any in-game UI.

## What it does

- runs on GitHub Actions, not your laptop
- fetches one RapidAPI endpoint
- or several endpoints in one run
- prints the payload shape
- tells us whether it looks:
  - `strong`
  - `partial`
  - `poor`

The probe checks for the main ingredients we need for provisional live scoring:

- batter rows with runs and balls
- bowler rows with overs, runs, and wickets
- over progression
- dot-ball fields

## Secret to add

Add this GitHub Actions secret:

- `LIVE_PROVISIONAL_RAPIDAPI_KEY`

## Workflow

Run:

- `Actions`
- `Probe live provisional cricket feed`

Inputs:

- `request_urls`
  - paste one or more full endpoint URLs from the RapidAPI playground
  - put each URL on its own line
- `rapidapi_host`
  - copy the `X-RapidAPI-Host` value shown by RapidAPI
- `label`
  - any friendly name you want
- `fail_on_weak`
  - leave `false` while exploring
  - set `true` only if you want the workflow to fail when nothing strong is found

## How to read the result

The job prints:

- per-endpoint:
  - top-level keys
  - array locations
  - detected score/wicket/dot/over fields
  - sample batter rows
  - sample bowler rows
  - an assessment
- plus an overall summary showing how many endpoints were `strong`, `partial`, or `poor`

Assessment meanings:

- `strong`
  - good enough to start a provisional live Mini Fantasy worker test
- `partial`
  - probably usable for a trial, but one or more scoring fields are missing
- `poor`
  - not rich enough for provisional player scoring

## Important scope

This probe is **not** final scoring.

Even if it passes, we still keep:

- CricketData
- manual official scorecard backfill

for authoritative final scoring and season replay.

## Good first batch to try

For this Cricbuzz RapidAPI listing, try a few likely shapes in one run:

```text
https://free-cricbuzz-cricket-api.p.rapidapi.com/cricket-livescores
https://free-cricbuzz-cricket-api.p.rapidapi.com/cricket-match-scoreboard?matchid=151976
https://free-cricbuzz-cricket-api.p.rapidapi.com/cricket-match-info?matchid=151976
```

That lets us compare:
- list/live feed shape
- match scoreboard shape
- match metadata shape

without needing three separate workflow runs.
