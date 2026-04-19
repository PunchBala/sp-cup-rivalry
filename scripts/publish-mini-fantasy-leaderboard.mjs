import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  MINI_FANTASY_SEASON,
  buildMiniFantasyLeaderboard,
  serializeMiniFantasyLeaderboardRows
} from '../mini-fantasy/contest-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const DEFAULT_SUPABASE_URL = 'https://qvigsvrxahuopeuefizy.supabase.co';
const PAGE_SIZE = 1000;

function normalizeWhitespace(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function parseResponsePayload(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function errorMessageFromPayload(payload, fallback) {
  if (!payload) return fallback;
  if (typeof payload === 'string') return payload || fallback;
  return payload.msg
    || payload.message
    || payload.error_description
    || payload.error
    || payload.hint
    || fallback;
}

async function readJson(relativePath) {
  const absolutePath = path.resolve(ROOT, relativePath);
  const raw = await fs.readFile(absolutePath, 'utf8');
  return JSON.parse(raw);
}

async function requestJson(url, { method = 'GET', headers = {}, body = null } = {}) {
  const response = await fetch(url, {
    method,
    headers,
    body: body == null ? undefined : JSON.stringify(body)
  });
  const payload = parseResponsePayload(await response.text());
  if (!response.ok) {
    throw new Error(errorMessageFromPayload(payload, `Request failed: HTTP ${response.status}`));
  }
  return payload;
}

function buildRestHeaders(serviceRoleKey, extraHeaders = {}) {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    ...extraHeaders
  };
}

async function fetchAllRows(baseUrl, serviceRoleKey, table, query = {}) {
  const results = [];
  for (let start = 0; ; start += PAGE_SIZE) {
    const url = new URL(`/rest/v1/${table}`, baseUrl);
    Object.entries(query).forEach(([key, value]) => {
      if (value != null && value !== '') {
        url.searchParams.set(key, value);
      }
    });
    const response = await fetch(url, {
      method: 'GET',
      headers: buildRestHeaders(serviceRoleKey, {
        Range: `${start}-${start + PAGE_SIZE - 1}`,
        Prefer: 'count=exact'
      })
    });
    const payload = parseResponsePayload(await response.text());
    if (!response.ok) {
      throw new Error(errorMessageFromPayload(payload, `Request failed: HTTP ${response.status}`));
    }
    const rows = Array.isArray(payload) ? payload : [];
    results.push(...rows);
    if (rows.length < PAGE_SIZE) break;
  }
  return results;
}

async function deleteSeasonRows(baseUrl, serviceRoleKey, season) {
  const url = new URL('/rest/v1/mini_fantasy_leaderboard_rows', baseUrl);
  url.searchParams.set('season', `eq.${season}`);
  await requestJson(url.toString(), {
    method: 'DELETE',
    headers: buildRestHeaders(serviceRoleKey, {
      Prefer: 'return=minimal'
    })
  });
}

async function insertRows(baseUrl, serviceRoleKey, rows = []) {
  if (!rows.length) return;
  for (let start = 0; start < rows.length; start += PAGE_SIZE) {
    const chunk = rows.slice(start, start + PAGE_SIZE);
    const url = new URL('/rest/v1/mini_fantasy_leaderboard_rows', baseUrl);
    url.searchParams.set('on_conflict', 'season,owner_handle');
    await requestJson(url.toString(), {
      method: 'POST',
      headers: buildRestHeaders(serviceRoleKey, {
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal'
      }),
      body: chunk
    });
  }
}

async function main() {
  const supabaseUrl = normalizeWhitespace(process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL);
  const serviceRoleKey = normalizeWhitespace(process.env.SUPABASE_SERVICE_ROLE_KEY || '');
  const season = normalizeWhitespace(process.env.MINI_FANTASY_SEASON || MINI_FANTASY_SEASON) || MINI_FANTASY_SEASON;
  if (!supabaseUrl || !serviceRoleKey) {
    console.log('Mini Fantasy leaderboard publish skipped: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
    return;
  }

  const [liveData, scheduleData, squads] = await Promise.all([
    readJson('data/live.json'),
    readJson('ipl_2026_schedule.json'),
    readJson('ipl_2026_squads.json')
  ]);
  const schedule = Array.isArray(scheduleData?.matches) ? scheduleData.matches : [];
  const publicVisibleAtUtc = new Date(Date.now() + 60 * 1000).toISOString();

  const [entries, profiles, dailyBonuses] = await Promise.all([
    fetchAllRows(supabaseUrl, serviceRoleKey, 'mini_fantasy_entries', {
      select: 'id,user_id,owner_handle,display_name,season,match_no,home_team_code,away_team_code,fixture_label,fixture_datetime_utc,selected_player_ids,captain_player_id,price_snapshot,spent_credits,saved_at,created_at,updated_at',
      season: `eq.${season}`,
      fixture_datetime_utc: `lte.${publicVisibleAtUtc}`,
      order: 'saved_at.desc.nullslast,fixture_datetime_utc.asc.nullslast,match_no.asc'
    }),
    fetchAllRows(supabaseUrl, serviceRoleKey, 'profiles', {
      select: 'id,handle,display_name,email,created_at',
      order: 'created_at.asc.nullslast'
    }),
    fetchAllRows(supabaseUrl, serviceRoleKey, 'mini_fantasy_daily_bonus_claims', {
      select: 'id,user_id,owner_handle,display_name,season,bonus_date_ist,bonus_points,created_at',
      season: `eq.${season}`,
      order: 'bonus_date_ist.asc.nullslast,created_at.asc.nullslast'
    }).catch((error) => {
      console.warn('Mini Fantasy daily bonus rows skipped during publish:', error.message);
      return [];
    })
  ]);

  const leaderboard = buildMiniFantasyLeaderboard({
    entries,
    liveData,
    schedule,
    squads,
    profiles,
    dailyBonuses
  });
  const rows = serializeMiniFantasyLeaderboardRows({
    leaderboard,
    season,
    liveData,
    generatedAtUtc: new Date().toISOString()
  });

  await deleteSeasonRows(supabaseUrl, serviceRoleKey, season);
  await insertRows(supabaseUrl, serviceRoleKey, rows);

  console.log(
    `Published ${rows.length} Mini Fantasy leaderboard rows for ${season} using live snapshot ${liveData?.fetchedAt || 'unknown'}.`
  );
}

main().catch((error) => {
  console.error('Mini Fantasy leaderboard publish failed:', error);
  process.exitCode = 1;
});
