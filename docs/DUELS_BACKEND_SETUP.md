# Duels backend setup

The site is still a static page, but it can switch from local beta storage to a real hosted backend for auth and public duel records.

## Recommended provider

Use Supabase for the current backend pass:

- real email/password auth
- browser-safe anon key for the static client
- public-readable duel records
- Row Level Security for create, join, and submit flows

## Files involved

- [duels-backend.config.js](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/duels-backend.config.js)
- [duels-backend.js](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/duels-backend.js)
- [docs/duels_backend_supabase.sql](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/docs/duels_backend_supabase.sql)

## Config values

Update [duels-backend.config.js](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/duels-backend.config.js):

- `enabled: true`
- `supabaseUrl`
- `supabaseAnonKey`
- optional `projectName`

Use the Supabase `anon` key only. Do not place the service-role key in frontend code.

## Database setup

1. Create a Supabase project.
2. In SQL Editor, run [docs/duels_backend_supabase.sql](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/docs/duels_backend_supabase.sql).
3. In `Authentication -> Sign In / Providers`, enable email/password signups.
4. For the easiest testing flow, disable mandatory email confirmation.
5. In `Authentication -> URL Configuration`, add your site URL and redirect URLs.

## Current hosted behavior

Once configured:

- `Create account` creates an auth user plus a `profiles` row
- `Sign in` restores a persisted session
- `Create duel` writes one `duels` row and two `duel_entries`
- slot 1 belongs to the creator
- slot 2 starts as an open challenger slot
- the creator shares a duel link or duel code
- the challenger signs in and claims the open slot
- `Submit picks` updates the caller's owned entry
- public duel browsing reads directly from backend records

## Current scope

The backend owns:

- users and profiles
- public duel rows
- duel entries
- entry ownership
- persisted submitted picks

The front end still derives:

- clashes
- armed/live lifecycle transitions
- duel scoring start match
- opponent reveal timing

That is intentional for the current product phase.

## Public vs private

Right now duels are public by default because the product is still in early social and traction mode.

The schema supports:

- `public`
- `unlisted`
- `private`

But the active product flow is public duels first.

## Fallback behavior

If hosted config is disabled or blank:

- the site falls back to local beta storage
- shipped fixture duels still work
- local create and join flow still works for testing

## Operational note

Hosted auth and backend persistence do not replace the live-data worker. The live duel board still reads season data from:

- [data/live.json](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/data/live.json)

That worker is documented separately in [docs/LIVE_DATA_WORKER.md](/C:/Users/Senthil%20Murugan/OneDrive%20-%20Raptor%20Aerospace%20Ltd/Documents/sp%20cup%20rivalry/docs/LIVE_DATA_WORKER.md).
