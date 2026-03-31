# War Room tests

## Engine and data-model tests

Run from the repo root:

```bash
node --test tests/warroom-engine.golden.test.mjs tests/warroom-engine.fixtures.test.mjs tests/live-data.contract.test.mjs tests/league-model.test.mjs
```

## League fixture validation

Validate the shipped local league fixtures:

```bash
node scripts/validate-league-config.mjs fixtures/league_sp_cup_2026.json fixtures/league_draft_example.json
```

## Browser smoke

The browser smoke test now covers V1A fixture-backed league loading:

- loads `?league=sp-cup-2026`
- checks dynamic rivalry tabs are present
- checks the war room renders from the loaded league
- checks a URL-selected matchup opens correctly

Use it through Playwright in CI or your local Playwright setup.
