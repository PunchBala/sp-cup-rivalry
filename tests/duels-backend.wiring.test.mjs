import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

test('backend config, adapter, and setup docs are present for real auth + duel and mini fantasy records', async () => {
  const root = process.cwd();
  const [configJs, backendJs, setupDoc, schemaSql] = await Promise.all([
    fs.readFile(path.resolve(root, 'duels-backend.config.js'), 'utf8'),
    fs.readFile(path.resolve(root, 'duels-backend.js'), 'utf8'),
    fs.readFile(path.resolve(root, 'docs/DUELS_BACKEND_SETUP.md'), 'utf8'),
    fs.readFile(path.resolve(root, 'docs/duels_backend_supabase.sql'), 'utf8')
  ]);

  assert.match(configJs, /DUELS_BACKEND_CONFIG/);
  assert.match(configJs, /supabaseUrl/);
  assert.match(configJs, /supabaseAnonKey/);
  assert.match(configJs, /miniFantasyLeaderboardRows/);

  assert.match(backendJs, /createDuelsBackend/);
  assert.match(backendJs, /signUp/);
  assert.match(backendJs, /signIn/);
  assert.match(backendJs, /listPublicBundles/);
  assert.match(backendJs, /createPublicDuel/);
  assert.match(backendJs, /claimOpenEntry/);
  assert.match(backendJs, /function buildBundleLabel\(/);
  assert.match(backendJs, /label:\s*buildBundleLabel\(duelRow,\s*orderedEntries\)/);
  assert.match(backendJs, /label:\s*buildBundleLabel\(loaded\.duelRow,\s*nextEntryRows\)/);
  assert.match(backendJs, /saveOwnedEntry/);
  assert.match(backendJs, /listMiniFantasyEntries/);
  assert.match(backendJs, /listPublicMiniFantasyEntries/);
  assert.match(backendJs, /listMiniFantasyLeaderboardRows/);
  assert.match(backendJs, /snapshot_version/);
  assert.match(backendJs, /fixture_datetime_utc:\s*`lte\.\$\{publicVisibleAtUtc\}`/);
  assert.match(backendJs, /upsertMiniFantasyEntry/);

  assert.match(setupDoc, /Supabase/i);
  assert.match(setupDoc, /duels-backend\.config\.js/);
  assert.match(setupDoc, /duels_backend_supabase\.sql/);

  assert.match(schemaSql, /create table if not exists public\.profiles/i);
  assert.match(schemaSql, /create table if not exists public\.duels/i);
  assert.match(schemaSql, /create table if not exists public\.duel_entries/i);
  assert.match(schemaSql, /create table if not exists public\.mini_fantasy_entries/i);
  assert.match(schemaSql, /create table if not exists public\.mini_fantasy_leaderboard_rows/i);
  assert.match(schemaSql, /add column if not exists snapshot_version text/i);
  assert.match(schemaSql, /create policy "users read their own mini fantasy entries"/i);
  assert.match(schemaSql, /create policy "locked mini fantasy entries are public readable"/i);
  assert.match(schemaSql, /create policy "mini fantasy leaderboard rows are public readable"/i);
  assert.match(schemaSql, /enable row level security/i);
});
