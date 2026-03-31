# War Room engine tests

Replace/add these items in your repo:

- `warroom-engine.js`
- `tests/warroom-engine.golden.test.mjs`

Run the golden tests with:

```bash
node --test tests/warroom-engine.golden.test.mjs
```

What these tests lock down:

- player alias matching (`Tilak Varma` vs `N. Tilak Varma`, `Phil Salt` vs `Philip Salt`)
- top-5 fallback scoring when one pick is ranked outside the visible top 5
- bottom-of-table lower-rank fallback
- rank-1 bonus only for selected player better-prediction categories
- no rank-1 bonus for team better-prediction categories
- `uncappedMvp` and `fairPlay` ranking fallback behavior
- title winner / finalist / playoff scoring
- least-MVP lower-rank-wins logic
- mixed matchup total stability

Expected result right now:

- 10 tests
- 10 passing
