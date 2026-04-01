# War Room V1 seal patch

Replace these files in your branch:

- `index.html`
- `warroom-room-model.js`
- `warroom-room-model.mjs`
- `warroom-engine.js`
- `WARROOM_ENGINE_TESTS.md`
- `WARROOM_V1_MODEL.md`
- `.github/workflows/warroom-tests.yml`
- `tests/warroom-room-model.test.mjs`
- `tests/page.smoke.spec.mjs`
- `tests/warroom-engine.golden.test.mjs`
- `tests/warroom-engine.fixtures.test.mjs`
- `tests/live-data.contract.test.mjs`
- `tests/update-live-data.quota.test.mjs`
- `tests/update-live-data.schedule.test.mjs`
- `scripts/validate-war-room-config.mjs`
- `scripts/validate-live-data.mjs`
- `fixtures/war_room_sp_cup_2026.json`
- `fixtures/war_room_draft_example.json`
- `fixtures/live_early_season.json`
- `fixtures/live_weird_aliases.json`
- `fixtures/live_thresholds.json`
- `ipl_2026_schedule.json`
- `ipl_2026_squads.json`

## What changed

- War Room V1 is now **duel-first**, not league-first
- duel tabs come from explicit duel fixtures, not auto-generated pairings
- duplicate display names across different duels are supported cleanly
- `Senthil vs Sai` and `Senthil vs Vibeesh` can each have their own Senthil picks
- future invite flow has a clean path because each duel side is now its own entry object

## Query params

- `?room=sp-cup-2026`
- `?room=sp-cup-2026&duel=senthil-vibeesh`
