# CricketData pipeline notes

Replace these files in your repo:

- `scripts/update-live-data.mjs`
- `.github/workflows/update-live-data.yml`
- `.github/workflows/warroom-tests.yml`
- `tests/update-live-data.quota.test.mjs`
- `tests/update-live-data.schedule.test.mjs`
- `index.html`
- `ipl_2026_schedule.json`
- `README.md`
- `WARROOM_ENGINE_TESTS.md`

Before running:

1. Regenerate your CricketData API key if needed.
2. In GitHub repo settings, create a secret named `CRICKETDATA_API_KEY`.
3. Keep the self-hosted runner running.
4. Push the files, then manually run **Update live IPL data** once.

## What this version does

- keeps graceful quota handling instead of failing the workflow red
- uses a **league-stage refresh plan** instead of aggressive every-15-minute polling
- only attempts provider updates inside these match windows:
  - 1 hour before a match
  - 4 hours after a match start
  - 5 hours after a match start
- handles double-headers cleanly by merging overlapping hourly windows
- stops the scheduled workflow after the announced league-stage schedule ends
- shows the league-stage schedule in the site
- renames the stats tab to **Nerd Room**

## Workflow cadence

GitHub Actions cannot express a different cron entry for every individual match date/time cleanly, so the workflow now uses a small fixed set of hourly cron buckets during the league stage:

- 09:00 UTC
- 13:00 UTC
- 14:00 UTC
- 15:00 UTC
- 18:00 UTC
- 19:00 UTC

The worker then checks the official league-stage schedule in `ipl_2026_schedule.json` and immediately skips unless the current run falls inside a real planned refresh window.

That means:

- no CricketData hit on a skipped bucket
- one-match days only fetch in the relevant windows
- double-header days fetch in the merged windows
- after the final league-stage window, the workflow has no further scheduled runs

## New schedule file

`ipl_2026_schedule.json` is now the shared league-stage source for:

- worker refresh planning
- the site schedule tab
- the “next planned update” pill

## Tests

This patch adds worker schedule coverage on top of the existing quota test.

Run locally from the repo root:

```bash
node --test tests/update-live-data.quota.test.mjs tests/update-live-data.schedule.test.mjs
```

