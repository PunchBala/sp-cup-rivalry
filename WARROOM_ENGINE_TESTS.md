# WARROOM_ENGINE_TESTS

## Local commands

Run the scoring-engine tests:

```bash
node --test tests/warroom-engine.golden.test.mjs tests/warroom-engine.fixtures.test.mjs
```

Run the live-data contract test:

```bash
node --test tests/live-data.contract.test.mjs
```

Validate the current worker output directly:

```bash
node scripts/validate-live-data.mjs data/live.json
```

Run everything the main CI job runs:

```bash
node --test tests/warroom-engine.golden.test.mjs tests/warroom-engine.fixtures.test.mjs tests/live-data.contract.test.mjs && node scripts/validate-live-data.mjs data/live.json
```

## What pass/fail looks like

- **Pass**: Node prints passing test output and exits normally.
- **Fail**: Node prints the failing test name or contract errors and exits with a non-zero status.

## What GitHub Actions now checks

The `warroom-tests.yml` workflow now verifies:

- golden scoring rules
- fixture-based scoring behavior
- the current `data/live.json` contract
- the browser smoke test

The scheduled live-data worker also validates `data/live.json` before committing it.
