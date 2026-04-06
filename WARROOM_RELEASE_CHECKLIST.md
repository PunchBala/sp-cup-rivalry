# Duels release checklist

This file keeps the old filename, but it is now the release checklist for the live `Duels` product.

## Before shipping app changes

1. Run the main test suite from [warroom-tests.yml](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/.github/workflows/warroom-tests.yml).
2. Validate [data/live.json](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/data/live.json).
3. Validate the shipped room fixtures.
4. Open the page and confirm:
   - board loads
   - scoreboard renders
   - live category board renders
   - worm renders
   - next match renders
   - `Board`, `Nerd Room`, and `Schedule` all switch cleanly
5. If duel UI changed, confirm:
   - `Profile` drawer works
   - `Create duel` works
   - `Manage duel` only shows when appropriate
   - `Browse duels` does not crowd the main board
6. If auth/backend changed, confirm:
   - create account
   - sign in
   - create public duel
   - join duel by link or code
   - only the entry owner can save their picks
7. Check mobile layout for drawers, pickers, and long duel codes.

## Before shipping live-data worker changes

1. Re-run:
   - quota parsing tests
   - schedule tests
   - scorecard-cache tests
   - live-data contract test
2. Confirm the worker still:
   - uses the primary API key first
   - fails over to the fallback key only on eligible provider failures
   - caches completed scorecards under `data/scorecards`
   - respects the fresh paid scorecard budget per run
3. Confirm [update-live-data.yml](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/.github/workflows/update-live-data.yml) still commits both `data/live.json` and cached scorecards when they change.

## Before shipping documentation changes

1. Update [README.md](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/README.md) if product behavior changed.
2. Update the model, backend, and worker docs if the rules changed.
3. Remove or rewrite any docs that still describe the old league-first or rivalry-tab product.

## Final checks

1. Push and confirm GitHub Actions stays green.
2. If the change touches live scoring, watch the next worker run.
3. If the change touches core duel flow, test one real duel end to end before considering it settled.
