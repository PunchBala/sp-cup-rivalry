# Duels backend setup

The site still runs as a static page, but it can now switch from browser-only beta storage to a real hosted backend for auth and public duel records.

## Recommended provider

Use Supabase for the first real backend pass:

- real email/password auth
- public readable duel tables
- browser-safe anon key for the static client
- Row Level Security for create, join, and submit flows

## Files to fill in

Update [duels-backend.config.js](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/duels-backend.config.js):

- `enabled: true`
- `supabaseUrl`
- `supabaseAnonKey`
- optional `projectName`

The anon key is public-safe for a browser app. Do not place the service role key in the site.

## Database setup

1. Create a Supabase project.
2. In SQL Editor, run [docs/duels_backend_supabase.sql](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/docs/duels_backend_supabase.sql).
3. In Auth settings, enable email/password sign-in.
4. For the smoothest V1 flow, disable mandatory email confirmation, or be ready to confirm accounts before first sign-in.
5. Add your GitHub Pages site URL to the allowed site URLs in Supabase Auth.

## What the page does once configured

- `Create account` uses Supabase Auth plus a `profiles` row
- `Sign in` restores a persisted browser session
- `Create public duel` writes a `duels` row plus 2 `duel_entries`
- `Join duel` claims the open second slot
- `Submit picks` updates the caller's owned entry record
- public duel browsing reads directly from backend records

## Current scope

This first backend pass intentionally keeps a few things client-derived:

- clash detection
- armed/live timing
- duel start match number
- opponent reveal timing

Those still come from the existing duel-first front-end rules, which keeps the rollout small and compatible with the static site.

## Fallback behavior

If backend config is left disabled or blank:

- the site stays on the existing local beta flow
- Playwright and wiring tests still use the local path
- featured fixture duels keep working as before
