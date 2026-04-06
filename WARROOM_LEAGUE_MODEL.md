# League-model note

This document is intentionally short because the old league-first model is no longer the active product path.

## Current status

- the live product is duel-first
- the main page loads rooms and duels, not generated round-robin rivalry tabs
- new work should target the duel-room model and backend duel records

## What remains

- [warroom-league-model.mjs](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/warroom-league-model.mjs) still exists as historical or bridge code
- it may still be useful for reference or old fixture experiments
- it is not the recommended base for new product work

## Use instead

- [WARROOM_V1_MODEL.md](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/WARROOM_V1_MODEL.md)
- [warroom-room-model.mjs](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/warroom-room-model.mjs)
- [duels-backend.js](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/duels-backend.js)

## Rule of thumb

If a new feature is about:

- create duel
- join duel
- submit picks
- clash resolution
- armed/live duel timing
- public duel browsing

then it belongs on the duel-first path, not the league-first path.
