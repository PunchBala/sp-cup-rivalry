# War Room V1 model

War Room V1 is **duel-first**, not league-first.

Each tab is an explicit duel with its own two sealed entry cards. That means the same display name can appear in multiple duels with different picks, as long as each entry has its own unique entry id.

## Shape

```json
{
  "version": 1,
  "id": "sp-cup-2026",
  "slug": "sp-cup-2026",
  "name": "SP Cup 2026",
  "templateId": "rivalry-war-room-v1",
  "visibility": "public",
  "state": "locked",
  "duels": [
    {
      "id": "senthil-sai",
      "label": "Senthil vs Sai",
      "state": "locked",
      "a": {
        "id": "senthil-sai-senthil",
        "displayName": "Senthil",
        "ownerId": "senthil",
        "picks": { "orangeCap": "KL Rahul" }
      },
      "b": {
        "id": "senthil-sai-sai",
        "displayName": "Sai",
        "ownerId": "sai",
        "picks": { "orangeCap": "Shubman Gill" }
      }
    }
  ]
}
```

## Rules

- a war room contains one or more explicit duels
- duel order is preserved exactly as provided
- duplicate **display names** are allowed across different duels
- duplicate **entry ids** are not allowed
- a locked duel must contain all category picks for both sides
- a draft duel may contain partial picks and stays in waiting mode in the UI

## Query params

- `?room=sp-cup-2026`
- `?room=sp-cup-2026&duel=senthil-vibeesh`

## Future fit

This model supports the future invite flow cleanly:
- user A owns duel entry A
- user B owns duel entry B
- duel turns live only when both entries are locked
