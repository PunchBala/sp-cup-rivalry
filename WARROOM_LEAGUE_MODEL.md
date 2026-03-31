# War Room league model (V1A)

The war room is now fixture-backed instead of hardcoding rivalry tabs inside `index.html`.

## What changed

- `warroom-league-model.js` provides a browser-safe league loader/validator API.
- `fixtures/league_sp_cup_2026.json` is the default locked league used by the page.
- `fixtures/league_draft_example.json` is a draft fixture that proves incomplete picks are allowed before lock.
- `index.html` loads a league fixture, validates it, builds matchup tabs, then renders the normal war room.

## URL parameters

- `?league=sp-cup-2026` loads a specific league fixture.
- `?matchup=sai-vibeesh` opens a specific matchup tab after the league is loaded.

Example:

```text
/index.html?league=sp-cup-2026&matchup=sai-vibeesh
```

## Current fixture path strategy

`index.html` currently maps known league slugs to local fixture files:

- `sp-cup-2026` → `fixtures/league_sp_cup_2026.json`
- `draft-example` → `fixtures/league_draft_example.json`

This is the V1A bridge to BaaS.
Later, the same loading contract can be swapped to Supabase reads without reworking the page-level rivalry rendering.

## Validation rules

League fixtures must satisfy the league model:

- version must match the current model version
- at least 2 players
- unique player ids and names
- valid category keys only
- locked leagues must have complete picks
- draft leagues may be incomplete

## V1A goal

Get the page to render from a real league document, not from hardcoded matchup constants.
That makes the app product-shaped before any backend write flow arrives.
