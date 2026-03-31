# WARROOM_RELEASE_CHECKLIST

Use this before merging any meaningful UI, scoring, worker, or data-pipeline change.

## Automated checks

- [ ] GitHub Actions `War Room tests` is green
- [ ] Golden engine tests passed
- [ ] Fixture engine tests passed
- [ ] Live-data contract test passed
- [ ] Browser smoke test passed
- [ ] Scheduled worker still validates `data/live.json`

## Manual scoreboard checks

- [ ] Page loads without blank sections or stuck placeholders
- [ ] Overall score updates for both matchups
- [ ] Fronts won count looks plausible
- [ ] Next match card renders real teams and venue
- [ ] Clutch tracker renders without layout breakage
- [ ] Worm graph renders if score history exists

## Rule-specific spot checks

- [ ] Alias case still works (`Tilak Varma` vs `N. Tilak Varma`)
- [ ] One ranked vs one unranked better-prediction case scores correctly
- [ ] Bottom-of-table fallback uses lower current rank
- [ ] Player better-prediction live #1 still gets 2 points where intended
- [ ] Team/table better-prediction rows do **not** get the player-style 2-point bonus
- [ ] Title winner row still applies 5 / 3 / 2 logic correctly

## Presentation sanity checks

- [ ] Live state pills still show correctly
- [ ] Live values appear only on stat-based player rows
- [ ] Smart insights are technically true, not just dramatic
- [ ] Roast corner still renders without breaking the page
- [ ] Stats tab still opens and populates

## Worker/output checks

- [ ] `data/live.json` was updated intentionally
- [ ] `fetchedAt` changed as expected
- [ ] Rankings still look like IPL 2026 only
- [ ] No obvious missing root sections in `data/live.json`

## Final ship check

- [ ] Hard refresh the deployed page after push
- [ ] Confirm the live site matches the local version you intended to ship
