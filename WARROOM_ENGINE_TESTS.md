# War Room tests

These tests protect the scoring engine and catch basic page breakages before you push a broken board.

## What is covered

- golden rule tests for scoring and alias logic
- fixture-driven tests against saved `live.json` snapshots
- a browser smoke test that loads `index.html`, injects fixture live data, and checks the main board renders

## Local engine tests

Run these from the repo root:

```bash
node --test tests/warroom-engine.golden.test.mjs tests/warroom-engine.fixtures.test.mjs
```

If they pass, Node exits normally and prints a passing summary.
If they fail, Node prints which test failed and exits with an error.

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

1. the Node engine tests
2. the Playwright smoke test

So in GitHub you will get:

- green check when tests pass
- red X when tests fail

## Fixture files

- `fixtures/live_early_season.json` — real early-season snapshot
- `fixtures/live_weird_aliases.json` — alias-heavy synthetic cases
- `fixtures/live_thresholds.json` — qualification-threshold synthetic cases
