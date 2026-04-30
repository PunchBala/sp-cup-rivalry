# Manual Official Scorecard Backfill

Use this fallback when CricketData exposes the match result but does **not** expose a usable scorecard yet.

The goal is:

1. copy the official IPL scorecard into a small local JSON file
2. validate the arithmetic before we trust it
3. convert it into our cached `data/scorecards/<match-id>.json`
4. rebuild `data/live.json` from caches only

This keeps the normal scorer and normal historical replay path in charge, instead of hand-editing season totals.

## Commands

Scaffold a blank template for a match:

```powershell
& "C:\actions-runner\externals\node20\bin\node.exe" scripts\backfill-official-scorecard.mjs --init --match 41
```

That writes a file like:

```text
manual-scorecards/match-41.official.json
```

Dry-run a filled template without changing repo data:

```powershell
& "C:\actions-runner\externals\node20\bin\node.exe" scripts\backfill-official-scorecard.mjs --input manual-scorecards/match-41.official.json --dry-run
```

Apply the backfill:

```powershell
& "C:\actions-runner\externals\node20\bin\node.exe" scripts\backfill-official-scorecard.mjs --input manual-scorecards/match-41.official.json
```

## Input rules

The input file mirrors the official IPL scorecard tables:

- one object per innings
- batting rows with dismissal text copied from the official scorecard
- bowling rows with overs, runs, wickets, wides, no-balls, economy, and dots
- extras split into byes, leg-byes, wides, no-balls, and penalties

The script validates:

- batting runs + extras = innings total
- bowling runs + byes/leg-byes/penalties = innings total
- dismissed batter count = innings wickets
- converted scorecard still passes the same cache integrity checks used for CricketData scorecards

If any of those checks fail, the script stops and prints the reason instead of writing bad data.

## After apply

The command updates:

- `data/scorecards/<match-id>.json`
- `data/live.json`

Then commit those files like a normal data chore.

If Mini Fantasy leaderboard rows are already precomputed in Supabase, republish them after the commit:

```powershell
$env:SUPABASE_URL='https://...'
$env:SUPABASE_SERVICE_ROLE_KEY='...'
& "C:\actions-runner\externals\node20\bin\node.exe" scripts\publish-mini-fantasy-leaderboard.mjs
```

## Notes

- This is a **fallback tool**, not a replacement for CricketData.
- Once the provider scorecard works again, normal refreshes can continue as usual.
- Because open and locked scoring both rebuild from the same cache pipeline, this is safer than hand-editing aggregates.
