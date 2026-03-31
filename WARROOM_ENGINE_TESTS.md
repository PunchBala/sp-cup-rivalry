# War Room tests

These tests protect the scoring engine, the worker refresh logic, and the basic page render.

## What is covered

- golden rule tests for scoring and alias logic
- fixture-driven tests against saved `live.json` snapshots
- worker quota handling tests
- worker league-stage refresh-window tests
- a browser smoke test that loads `index.html`, injects fixture live data, and checks the main board renders

## Local scoring and worker tests

Run these from the repo root:

```bash
node --test tests/warroom-engine.golden.test.mjs tests/warroom-engine.fixtures.test.mjs tests/update-live-data.quota.test.mjs tests/update-live-data.schedule.test.mjs
```

## Local page smoke test

This uses Playwright.

Install the runner once:

```bash
npm install -D @playwright/test
npx playwright install chromium
```

Start a simple local server from the repo root in one terminal:

```bash
python -m http.server 4173
```

Then run the smoke test in another terminal:

```bash
npx playwright test tests/page.smoke.spec.mjs --reporter=line
```

## GitHub Actions

`.github/workflows/warroom-tests.yml` runs automatically on:

- push
- pull request
- manual workflow dispatch

It runs:

1. the scoring tests
2. the worker quota + schedule tests
3. the Playwright smoke test

## Schedule note

The worker schedule tests validate the league-stage refresh plan driven by `ipl_2026_schedule.json`:

- 1 hour before a match
- 4 hours after match start
- 5 hours after match start

This is what keeps the worker conservative on the free plan.

