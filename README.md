# CricketData pipeline notes

Replace these files in your repo:

- `scripts/update-live-data.mjs`
- `.github/workflows/update-live-data.yml`

Before running:

1. Regenerate your CricketData API key.
2. In GitHub repo settings, create a secret named `CRICKETDATA_API_KEY`.
3. Keep the self-hosted runner running.
4. Run the workflow once manually.

## What this version does

- uses CricketData instead of scraping websites
- refreshes every 5 minutes during game windows
- limits quiet refreshes to roughly 5 per day
- incrementally processes ended matches
- computes these categories:
  - orange cap
  - most sixes
  - purple cap
  - highest team score
  - striker
  - best bowling figures
  - best bowling strike rate
  - most catches
  - title standings
  - bottom standings

## Not computed yet

- most dots
- MVP
- uncapped MVP
- fair play
- least MVP
