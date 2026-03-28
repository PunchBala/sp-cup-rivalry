# IPL 2026 Prediction War Room — worker-fed build

This version stops scraping IPL and ESPN pages from the browser.

The site stays a static `index.html`, but a Playwright worker updates `data/live.json` on GitHub Actions. The page reads that JSON and scores everything from there.

## Files

- `index.html` — frontend
- `data/live.json` — latest normalized snapshot consumed by the frontend
- `scripts/update-live-data.mjs` — Playwright worker
- `.github/workflows/update-live-data.yml` — scheduled refresh job

## What changed

- Browser no longer tries to scrape JS-rendered IPL or ESPN pages directly.
- Frontend fetches `./data/live.json`.
- Worker visits the exact source pages in a real browser and extracts the tables/cards.
- Fair Play, Uncapped MVP, Highest Team Score, Bottom of Table, and Least MVP now follow the logic you specified.
- Live rank is shown next to picks when the worker has ranking data.

## Before you push

Make sure these files are in the repo root exactly as provided:

- `index.html`
- `package.json`
- `scripts/update-live-data.mjs`
- `.github/workflows/update-live-data.yml`
- `data/live.json`

## First run

1. Commit and push this file set.
2. Open the **Actions** tab in GitHub.
3. Run **Update live IPL data** manually once.
4. Wait for `data/live.json` to be committed by the workflow.
5. Open the site and hard refresh.

## Notes

- The worker is scheduled every 15 minutes.
- The worker stores screenshots/HTML in `debug/` if a scrape step fails.
- Because this was built without live internet access in this environment, the selectors are written to be robust but may still need one round of tuning against the real pages once you run the workflow.
