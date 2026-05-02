create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  handle text not null unique,
  display_name text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.duels (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  room_slug text not null,
  label text not null,
  visibility text not null default 'public' check (visibility in ('public', 'unlisted', 'private')),
  state text not null default 'draft' check (state in ('draft', 'locked')),
  created_by_user_id uuid not null references auth.users (id) on delete cascade,
  created_by_handle text not null,
  ready_at timestamptz,
  starts_scoring_at timestamptz,
  starts_scoring_from_match_no integer,
  score_start_count integer,
  live_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.duel_entries (
  id uuid primary key default gen_random_uuid(),
  duel_id uuid not null references public.duels (id) on delete cascade,
  slot_index integer not null check (slot_index in (1, 2)),
  owner_user_id uuid references auth.users (id) on delete set null,
  owner_handle text,
  reserved_handle text,
  display_name text not null,
  picks jsonb not null default '{}'::jsonb,
  submitted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (duel_id, slot_index)
);

create table if not exists public.mini_fantasy_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  owner_handle text not null,
  display_name text not null default '',
  season text not null,
  match_no integer not null,
  home_team_code text not null,
  away_team_code text not null,
  fixture_label text not null,
  fixture_datetime_utc timestamptz not null,
  selected_player_ids jsonb not null default '[]'::jsonb,
  captain_player_id text,
  price_snapshot jsonb not null default '{}'::jsonb,
  spent_credits numeric(5,2) not null default 0,
  saved_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, season, match_no)
);

create table if not exists public.mini_fantasy_daily_bonus_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  owner_handle text not null,
  display_name text not null default '',
  season text not null,
  bonus_date_ist text not null,
  bonus_points integer not null default 5 check (bonus_points >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, season, bonus_date_ist)
);

alter table public.mini_fantasy_entries
  alter column spent_credits type numeric(5,2)
  using round(spent_credits::numeric, 2);

alter table public.mini_fantasy_entries
  alter column spent_credits set default 0;

create table if not exists public.mini_fantasy_leaderboard_rows (
  id uuid primary key default gen_random_uuid(),
  season text not null,
  owner_handle text not null,
  user_id uuid references auth.users (id) on delete set null,
  display_name text not null default '',
  rank integer not null,
  medal text,
  total_points numeric not null default 0,
  saved_entries integer not null default 0,
  scored_entries integer not null default 0,
  pending_entries integer not null default 0,
  latest_saved_at timestamptz,
  daily_bonus_points numeric not null default 0,
  missed_lock_points numeric not null default 0,
  new_player_baseline_points numeric not null default 0,
  completed_match_count integer not null default 0,
  matches jsonb not null default '[]'::jsonb,
  live_data_fetched_at timestamptz,
  generated_at timestamptz not null default timezone('utc', now()),
  unique (season, owner_handle)
);

create table if not exists public.mini_fantasy_live_provisional_snapshots (
  id uuid primary key default gen_random_uuid(),
  season text not null,
  match_no integer not null,
  fixture_label text not null default '',
  manual_input jsonb not null default '{}'::jsonb,
  snapshot jsonb not null default '{}'::jsonb,
  updated_by_user_id uuid references auth.users (id) on delete set null,
  updated_by_handle text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (season, match_no)
);

alter table public.mini_fantasy_entries
  add column if not exists display_name text not null default '';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists duels_set_updated_at on public.duels;
create trigger duels_set_updated_at
before update on public.duels
for each row execute procedure public.set_updated_at();

drop trigger if exists duel_entries_set_updated_at on public.duel_entries;
create trigger duel_entries_set_updated_at
before update on public.duel_entries
for each row execute procedure public.set_updated_at();

drop trigger if exists mini_fantasy_entries_set_updated_at on public.mini_fantasy_entries;
create trigger mini_fantasy_entries_set_updated_at
before update on public.mini_fantasy_entries
for each row execute procedure public.set_updated_at();

drop trigger if exists mini_fantasy_live_provisional_snapshots_set_updated_at on public.mini_fantasy_live_provisional_snapshots;
create trigger mini_fantasy_live_provisional_snapshots_set_updated_at
before update on public.mini_fantasy_live_provisional_snapshots
for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.duels enable row level security;
alter table public.duel_entries enable row level security;
alter table public.mini_fantasy_entries enable row level security;
alter table public.mini_fantasy_daily_bonus_claims enable row level security;
alter table public.mini_fantasy_leaderboard_rows enable row level security;
alter table public.mini_fantasy_live_provisional_snapshots enable row level security;

drop policy if exists "profiles are public readable" on public.profiles;
create policy "profiles are public readable"
on public.profiles
for select
using (true);

drop policy if exists "users manage their own profile" on public.profiles;
create policy "users manage their own profile"
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "users update their own profile" on public.profiles;
create policy "users update their own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "public duels are readable" on public.duels;
create policy "public duels are readable"
on public.duels
for select
using (visibility = 'public');

drop policy if exists "authenticated users create public duels" on public.duels;
create policy "authenticated users create public duels"
on public.duels
for insert
with check (
  auth.uid() = created_by_user_id
  and visibility = 'public'
  and created_by_handle <> ''
);

drop policy if exists "duel creators update their duel rows" on public.duels;
create policy "duel creators update their duel rows"
on public.duels
for update
using (auth.uid() = created_by_user_id)
with check (auth.uid() = created_by_user_id);

drop policy if exists "public duel entries are readable" on public.duel_entries;
create policy "public duel entries are readable"
on public.duel_entries
for select
using (
  exists (
    select 1
    from public.duels
    where duels.id = duel_entries.duel_id
      and duels.visibility = 'public'
  )
);

drop policy if exists "creators insert duel entries" on public.duel_entries;
create policy "creators insert duel entries"
on public.duel_entries
for insert
with check (
  exists (
    select 1
    from public.duels
    where duels.id = duel_entries.duel_id
      and duels.created_by_user_id = auth.uid()
  )
);

drop policy if exists "participants claim or update their own duel entry" on public.duel_entries;
create policy "participants claim or update their own duel entry"
on public.duel_entries
for update
using (
  owner_user_id is null
  or owner_user_id = auth.uid()
)
with check (
  owner_user_id = auth.uid()
  and (
    reserved_handle is null
    or exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and lower(profiles.handle) = lower(duel_entries.reserved_handle)
    )
  )
);

drop policy if exists "users read their own mini fantasy entries" on public.mini_fantasy_entries;
drop policy if exists "mini fantasy entries are public readable" on public.mini_fantasy_entries;
drop policy if exists "locked mini fantasy entries are public readable" on public.mini_fantasy_entries;

create policy "users read their own mini fantasy entries"
on public.mini_fantasy_entries
for select
using (auth.uid() = user_id);

create policy "locked mini fantasy entries are public readable"
on public.mini_fantasy_entries
for select
using (
  timezone('utc', now()) >= fixture_datetime_utc - interval '1 minute'
);

drop policy if exists "users insert their own mini fantasy entries before lock" on public.mini_fantasy_entries;
create policy "users insert their own mini fantasy entries before lock"
on public.mini_fantasy_entries
for insert
with check (
  auth.uid() = user_id
  and match_no >= 14
  and timezone('utc', now()) < fixture_datetime_utc - interval '1 minute'
);

drop policy if exists "users update their own mini fantasy entries before lock" on public.mini_fantasy_entries;
create policy "users update their own mini fantasy entries before lock"
on public.mini_fantasy_entries
for update
using (
  auth.uid() = user_id
  and timezone('utc', now()) < fixture_datetime_utc - interval '1 minute'
)
with check (
  auth.uid() = user_id
  and match_no >= 14
  and timezone('utc', now()) < fixture_datetime_utc - interval '1 minute'
);

drop policy if exists "mini fantasy daily bonuses are public readable" on public.mini_fantasy_daily_bonus_claims;
create policy "mini fantasy daily bonuses are public readable"
on public.mini_fantasy_daily_bonus_claims
for select
using (true);

drop policy if exists "mini fantasy leaderboard rows are public readable" on public.mini_fantasy_leaderboard_rows;
create policy "mini fantasy leaderboard rows are public readable"
on public.mini_fantasy_leaderboard_rows
for select
using (true);

drop policy if exists "mini fantasy live provisional snapshots are public readable" on public.mini_fantasy_live_provisional_snapshots;
create policy "mini fantasy live provisional snapshots are public readable"
on public.mini_fantasy_live_provisional_snapshots
for select
using (true);

drop policy if exists "senthil manages mini fantasy live provisional snapshots" on public.mini_fantasy_live_provisional_snapshots;
create policy "senthil manages mini fantasy live provisional snapshots"
on public.mini_fantasy_live_provisional_snapshots
for insert
with check (
  auth.uid() = updated_by_user_id
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and lower(profiles.handle) = 'senthil'
  )
);

drop policy if exists "senthil updates mini fantasy live provisional snapshots" on public.mini_fantasy_live_provisional_snapshots;
create policy "senthil updates mini fantasy live provisional snapshots"
on public.mini_fantasy_live_provisional_snapshots
for update
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and lower(profiles.handle) = 'senthil'
  )
)
with check (
  auth.uid() = updated_by_user_id
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and lower(profiles.handle) = 'senthil'
  )
);

drop policy if exists "senthil deletes mini fantasy live provisional snapshots" on public.mini_fantasy_live_provisional_snapshots;
create policy "senthil deletes mini fantasy live provisional snapshots"
on public.mini_fantasy_live_provisional_snapshots
for delete
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and lower(profiles.handle) = 'senthil'
  )
);

drop policy if exists "users claim their own mini fantasy daily bonus" on public.mini_fantasy_daily_bonus_claims;
create policy "users claim their own mini fantasy daily bonus"
on public.mini_fantasy_daily_bonus_claims
for insert
with check (
  auth.uid() = user_id
  and season <> ''
  and bonus_date_ist <> ''
  and bonus_points = 5
  and bonus_date_ist = to_char(timezone('Asia/Kolkata', now()), 'YYYY-MM-DD')
);
