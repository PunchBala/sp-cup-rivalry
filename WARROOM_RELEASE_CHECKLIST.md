# War Room release checklist

Before pushing a scoring or league-data change:

1. Run engine, fixture, contract, and league-model tests.
2. Validate `data/live.json` directly.
3. Validate the shipped league fixtures directly.
4. Open the page and confirm:
   - scoreboard renders
   - live board renders
   - next match renders
   - stats tab renders
   - at least one insight is technically true
   - roast corner still renders
5. If league-model files changed, confirm:
   - locked leagues reject missing picks
   - draft leagues still allow incomplete picks
   - duplicate player names are rejected
   - matchup generation order is sane
6. Push and confirm GitHub Actions stays green.
