# Manual Mini Fantasy Live Provisional

Use this when the normal live API is unreliable but we still want in-match Mini Fantasy movement from the official IPL scorecard screenshots.

What it does:
- builds `data/mini_fantasy_live_provisional.json`
- affects Mini Fantasy live views only
- does not change duel season stats or authoritative final scoring
- is automatically ignored once the real completed-match scoring catches up

## 1. Create a scaffold

```powershell
& "C:\actions-runner\externals\node20\bin\node.exe" scripts\build-mini-fantasy-live-provisional.mjs --init --match 44
```

That creates:

`manual-live/match-44.live.json`

## 2. Fill it from the official IPL scorecard screenshot

For each innings, copy:
- total runs
- wickets
- overs
- extras
- batting rows
- bowling rows with dots

Keep dismissal text as close to the official scorecard as possible, because catches and stumpings are derived from it.

## 3. Dry-run the validation

```powershell
& "C:\actions-runner\externals\node20\bin\node.exe" scripts\build-mini-fantasy-live-provisional.mjs --input manual-live/match-44.live.json --dry-run
```

The dry-run checks:
- innings totals
- wicket counts
- bowling overs
- bowling runs after byes/leg-byes
- player-name matching against the fixture squads

If it fails, fix the manual file first.

## 4. Apply the provisional update

```powershell
& "C:\actions-runner\externals\node20\bin\node.exe" scripts\build-mini-fantasy-live-provisional.mjs --input manual-live/match-44.live.json
```

That writes:

`data/mini_fantasy_live_provisional.json`

## 5. Push it

Commit and push `manual-live/...` plus `data/mini_fantasy_live_provisional.json`.

Once deployed, Mini Fantasy locked-team views and the live rail will show:
- live fixture points
- overall plus live points
- a clear manual-refresh label

## 6. Clear it when needed

If we want to remove the provisional overlay manually:

```powershell
& "C:\actions-runner\externals\node20\bin\node.exe" scripts\build-mini-fantasy-live-provisional.mjs --clear
```

Normally this is optional, because once the authoritative final scoring lands, the UI falls back to the final completed-match path automatically.
