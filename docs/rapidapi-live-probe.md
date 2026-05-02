# RapidAPI live feed probe

Use this when we want to test a third-party live cricket feed for **provisional Mini Fantasy only** before trusting it with any in-game UI.

## What it does

- runs on GitHub Actions, not your laptop
- fetches one RapidAPI endpoint
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

- `request_url`
  - paste the exact full endpoint URL from the RapidAPI playground
- `rapidapi_host`
  - copy the `X-RapidAPI-Host` value shown by RapidAPI
- `label`
  - any friendly name you want

## How to read the result

The job prints:

- top-level keys
- array locations
- detected score/wicket/dot/over fields
- sample batter rows
- sample bowler rows
- an assessment

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
