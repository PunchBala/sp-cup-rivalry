IPL 2026 Prediction War Room

What changed in this version:
- Auto-refresh mode
- Official IPL auto-fetch beta provider (browser proxy based)
- Smart insights panel
- Savage commentary panel
- Tonight watchlist
- Manual per-category override support
- Same exact Senthil vs Sai picks and scoring rules

How to use:
1. Open index.html
2. Start with Demo data to see everything working immediately
3. Switch provider to “Official IPL auto (beta)” and hit Refresh now
4. If an external category fails to parse, paste a tiny override JSON instead of editing the whole state
5. To share, host this folder on GitHub Pages / Vercel / Netlify

Honest note:
This is still subject to external site/proxy behavior because browser-only apps do not control IPL or proxy page shapes. The scoring engine and UI are complete; the live fetcher is best-effort and resilient, but not magic.
