# Duels room model

This file keeps its legacy filename, but it documents the current duel-first product model.

## Product rules

- a room contains one or more duels
- a duel has exactly two entries
- entries may belong to real backend users or remain open until a challenger joins
- the same person can appear in multiple duels with different picks
- a duel is public to view right now
- opponent picks stay hidden until the duel is clash-free and live

## Lifecycle

The UI derives these states per duel:

- `draft`
  One or both sides are incomplete or unsubmitted.
- `clash`
  Both sides submitted, but one or more categories have the same pick on both sides.
- `armed`
  Both sides are complete, submitted, clash-free, and frozen. The duel is waiting for its scoring start match.
- `live`
  The duel has started scoring from its assigned match onward.

## Scoring start

- a duel does not score earlier completed matches
- once a duel is clash-free and frozen, it starts from the next not-yet-started IPL match
- worm/history starts from that duel activation point, not from season start

## Fixture-backed room shape

```json
{
  "version": 1,
  "slug": "sp-cup-2026",
  "name": "SP Cup 2026",
  "visibility": "public",
  "state": "locked",
  "duelRecords": [
    {
      "id": "senthil-vibeesh",
      "label": "Senthil vs Vibeesh",
      "visibility": "public",
      "state": "locked",
      "entryIds": [
        "senthil-vibeesh-senthil",
        "senthil-vibeesh-vibeesh"
      ]
    }
  ],
  "entryRecords": [
    {
      "id": "senthil-vibeesh-senthil",
      "duelId": "senthil-vibeesh",
      "displayName": "Senthil",
      "ownerId": "senthil",
      "picks": {
        "orangeCap": "KL Rahul"
      }
    },
    {
      "id": "senthil-vibeesh-vibeesh",
      "duelId": "senthil-vibeesh",
      "displayName": "Vibeesh",
      "ownerId": "vibeesh",
      "picks": {
        "orangeCap": "Shubman Gill"
      }
    }
  ]
}
```

## Hosted backend shape

Supabase uses:

- `profiles`
- `duels`
- `duel_entries`

The backend stores ownership and persistence. The front end currently derives:

- clashes
- armed/live timing
- duel start match number
- opponent reveal timing

## Identity rules

- duplicate display names across different duels are allowed
- duplicate entry ids are not allowed
- display names are cosmetic
- owner ids or backend user ids are the real participant identity

## Create / join model

- `Create duel` creates a duel with the creator in slot 1
- slot 2 starts as an open challenger slot
- the creator shares a duel link or duel code
- the challenger signs in, opens the link or code, and claims the open slot

## Query params

- `?room=sp-cup-2026`
- `?room=sp-cup-2026&duel=senthil-vibeesh`

## Generator support

Manual fixture creation is handled by:

- [scripts/generate-war-room-duel.mjs](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/scripts/generate-war-room-duel.mjs)

That script creates one `duelRecord` plus two `entryRecords` from a simple manifest.
