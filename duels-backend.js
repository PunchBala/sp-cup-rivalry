(function(){
  const DEFAULTS = {
    provider: 'supabase',
    enabled: false,
    projectName: 'Duels backend',
    supabaseUrl: '',
    supabaseAnonKey: '',
    authStorageKey: 'sp-cup-duels-remote-session-v1',
    tables: {
      profiles: 'profiles',
      duels: 'duels',
      duelEntries: 'duel_entries',
      miniFantasyEntries: 'mini_fantasy_entries',
      miniFantasyDailyBonuses: 'mini_fantasy_daily_bonus_claims',
      miniFantasyLeaderboardRows: 'mini_fantasy_leaderboard_rows'
    }
  };

  function normalizeWhitespace(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
  }

  function normalizeSlug(value) {
    return normalizeWhitespace(value)
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function emailLocalPart(email) {
    return normalizeWhitespace(String(email || '').split('@')[0] || '');
  }

  function fallbackDisplayNameFromEmail(email) {
    const local = emailLocalPart(email);
    return normalizeWhitespace(local.replace(/[._-]+/g, ' '));
  }

  function deriveFallbackIdentity(user, email) {
    const metadata = user?.user_metadata || {};
    const safeEmail = normalizeWhitespace(user?.email || email || '');
    const displayName = normalizeWhitespace(
      metadata.display_name
      || metadata.displayName
      || metadata.name
      || fallbackDisplayNameFromEmail(safeEmail)
      || 'Duels player'
    );
    const ownerId = normalizeSlug(
      metadata.handle
      || metadata.ownerId
      || emailLocalPart(safeEmail)
      || displayName
    );
    return {
      displayName,
      ownerId: ownerId || normalizeSlug(`player-${String(user?.id || '').slice(0, 6)}`) || 'duels-player'
    };
  }

  function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function readStoredJson(key, fallback = null) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function writeStoredJson(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  function removeStoredJson(key) {
    try {
      window.localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  function parseResponsePayload(text) {
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  function firstArrayItem(value) {
    return Array.isArray(value) ? value[0] || null : value;
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

  function buildBundleLabel(duelRow, orderedEntries) {
    const names = (orderedEntries || [])
      .map((entry) => normalizeWhitespace(entry?.displayName || entry?.display_name || ''))
      .filter(Boolean);
    if (names.length >= 2) return `${names[0]} vs ${names[1]}`;
    return normalizeWhitespace(duelRow?.label || names.join(' vs '));
  }

  function makeBundleFromRows(duelRow, entryRows) {
    if (!duelRow) return null;
    const duelSlug = normalizeSlug(duelRow.slug || duelRow.id || '');
    if (!duelSlug) return null;
    const orderedEntries = (entryRows || [])
      .slice()
      .sort((a, b) => Number(a.slot_index || 0) - Number(b.slot_index || 0))
      .map((entry) => ({
        id: `${duelSlug}-slot-${Number(entry.slot_index || 0) || 0}`,
        backendId: entry.id || null,
        duelId: duelSlug,
        slotIndex: Number(entry.slot_index || 0) || null,
        ownerId: entry.owner_handle || null,
        ownerUserId: entry.owner_user_id || null,
        reservedOwnerId: entry.reserved_handle || null,
        displayName: normalizeWhitespace(entry.display_name || `Player ${entry.slot_index || ''}`),
        createdAt: entry.created_at || null,
        updatedAt: entry.updated_at || null,
        submittedAt: entry.submitted_at || null,
        picks: cloneJson(entry.picks || {})
      }));

    return {
      source: 'backend',
      backendProvider: 'supabase',
      roomSlug: normalizeSlug(duelRow.room_slug || ''),
      duelRecord: {
        id: duelSlug,
        backendId: duelRow.id || null,
        label: buildBundleLabel(duelRow, orderedEntries),
        visibility: duelRow.visibility || 'public',
        state: duelRow.state || 'draft',
        createdByUserId: duelRow.created_by_user_id || null,
        createdByHandle: duelRow.created_by_handle || null,
        createdAt: duelRow.created_at || null,
        updatedAt: duelRow.updated_at || null,
        readyAt: duelRow.ready_at || null,
        startsScoringAt: duelRow.starts_scoring_at || null,
        startsScoringFromMatchNo: duelRow.starts_scoring_from_match_no || null,
        scoreStartCount: duelRow.score_start_count || null,
        liveAt: duelRow.live_at || null,
        entryIds: orderedEntries.map((entry) => entry.id)
      },
      entryRecords: orderedEntries
    };
  }

  function createDisabledBackend(rawConfig = {}) {
    const config = Object.assign({}, DEFAULTS, rawConfig || {});
    const disabledError = () => new Error('Hosted Duels backend is not configured yet.');
    return {
      enabled: false,
      provider: config.provider || 'local',
      label: 'Local beta storage',
      config,
      async bootstrap() { return null; },
      async getCurrentUser() { return null; },
      async signUp() { throw disabledError(); },
      async signIn() { throw disabledError(); },
      async signOut() { return true; },
      async listPublicBundles() { return []; },
        async createPublicDuel() { throw disabledError(); },
        async claimOpenEntry() { throw disabledError(); },
        async saveOwnedEntry() { throw disabledError(); },
        async listMiniFantasyEntries() { return []; },
        async listPublicMiniFantasyEntries() { return []; },
        async listPublicMiniFantasyProfiles() { return []; },
        async listPublicMiniFantasyDailyBonuses() { return []; },
        async listMiniFantasyLeaderboardRows() { return []; },
        async claimMiniFantasyDailyBonus() { throw disabledError(); },
        async upsertMiniFantasyEntry() { throw disabledError(); }
      };
  }

  function createSupabaseBackend(rawConfig = {}) {
    const config = Object.assign({}, DEFAULTS, rawConfig || {});
    config.tables = Object.assign({}, DEFAULTS.tables, rawConfig.tables || {});
    const baseUrl = String(config.supabaseUrl || '').replace(/\/+$/, '');
    const anonKey = normalizeWhitespace(config.supabaseAnonKey || '');
    if (!config.enabled || !baseUrl || !anonKey) {
      return createDisabledBackend(config);
    }

    let session = readStoredJson(config.authStorageKey, null);

    async function requestJson(url, { method = 'GET', headers = {}, body } = {}) {
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

    async function authRequest(path, { method = 'GET', body = null, accessToken = null } = {}) {
      const headers = {
        apikey: anonKey
      };
      if (body != null) headers['Content-Type'] = 'application/json';
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
      return requestJson(`${baseUrl}/auth/v1${path}`, { method, headers, body });
    }

    async function restRequest(table, { method = 'GET', query = null, body = null, accessToken = null, prefer = null } = {}) {
      const url = new URL(`${baseUrl}/rest/v1/${table}`);
      if (query && typeof query === 'object') {
        Object.entries(query).forEach(([key, value]) => {
          if (value != null && value !== '') url.searchParams.set(key, value);
        });
      }
      const headers = {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken || anonKey}`
      };
      if (body != null) headers['Content-Type'] = 'application/json';
      if (prefer) headers.Prefer = prefer;
      return requestJson(url.toString(), { method, headers, body });
    }

    function storeSession(nextSession) {
      session = nextSession ? cloneJson(nextSession) : null;
      if (nextSession) {
        writeStoredJson(config.authStorageKey, session);
      } else {
        removeStoredJson(config.authStorageKey);
      }
      return session;
    }

    function sessionNeedsRefresh(nextSession = session) {
      const expiresAt = Number(nextSession?.expires_at || 0) * 1000;
      if (!expiresAt) return false;
      return (Date.now() + 60 * 1000) >= expiresAt;
    }

    async function ensureFreshSession() {
      if (!session) return null;
      if (!session.refresh_token) return session;
      if (!sessionNeedsRefresh(session)) return session;
      try {
        const refreshed = await authRequest('/token?grant_type=refresh_token', {
          method: 'POST',
          body: { refresh_token: session.refresh_token }
        });
        if (refreshed?.access_token) {
          storeSession(refreshed);
          return session;
        }
      } catch (error) {
        console.warn('Supabase session refresh failed', error);
      }
      storeSession(null);
      return null;
    }

    async function fetchAuthedUser() {
      const activeSession = await ensureFreshSession();
      if (!activeSession?.access_token) return null;
      return authRequest('/user', {
        method: 'GET',
        accessToken: activeSession.access_token
      });
    }

    async function fetchProfile(userId, accessToken) {
      if (!userId) return null;
      const rows = await restRequest(config.tables.profiles, {
        method: 'GET',
        query: {
          select: 'id,handle,display_name,email,created_at',
          id: `eq.${userId}`
        },
        accessToken
      });
      return firstArrayItem(rows);
    }

    async function fetchProfilesByIds(userIds = [], accessToken) {
      const ids = [...new Set((Array.isArray(userIds) ? userIds : []).map((value) => normalizeWhitespace(value)).filter(Boolean))];
      if (!ids.length) return [];
      const rows = await restRequest(config.tables.profiles, {
        method: 'GET',
        query: {
          select: 'id,handle,display_name,email,created_at',
          id: `in.(${ids.join(',')})`
        },
        accessToken
      });
      return Array.isArray(rows) ? rows : [];
    }

    async function upsertProfile(profile, accessToken) {
      const payload = {
        id: profile.id,
        email: profile.email || null,
        display_name: profile.display_name,
        handle: profile.handle
      };
      const rows = await restRequest(config.tables.profiles, {
        method: 'POST',
        query: {
          on_conflict: 'id',
          select: 'id,handle,display_name,email,created_at'
        },
        body: payload,
        accessToken,
        prefer: 'resolution=merge-duplicates,return=representation'
      });
      return firstArrayItem(rows);
    }

    function profileToCurrentUser(user, profile) {
      if (!user) return null;
      const metadata = user.user_metadata || {};
      const displayName = normalizeWhitespace(profile?.display_name || metadata.display_name || user.email || '');
      const ownerId = normalizeSlug(profile?.handle || metadata.handle || displayName);
      if (!displayName || !ownerId) return null;
      return {
        userId: user.id || null,
        email: user.email || profile?.email || null,
        displayName,
        ownerId,
        createdAt: profile?.created_at || null,
        authSource: 'supabase'
      };
    }

    async function enrichMiniFantasyEntriesWithProfiles(rows = [], accessToken) {
      const safeRows = Array.isArray(rows) ? rows : [];
      const profiles = await fetchProfilesByIds(safeRows.map((row) => row?.user_id), accessToken).catch(() => []);
      if (!profiles.length) return safeRows;
      const profileById = new Map(
        profiles
          .filter((profile) => normalizeWhitespace(profile?.id))
          .map((profile) => [normalizeWhitespace(profile.id), profile])
      );
      return safeRows.map((row) => {
        const profile = profileById.get(normalizeWhitespace(row?.user_id || ''));
        if (!profile) return row;
        return {
          ...row,
          display_name: normalizeWhitespace(profile.display_name || row?.display_name || row?.owner_handle || ''),
          owner_handle: normalizeSlug(profile.handle || row?.owner_handle || '')
        };
      });
    }

    async function currentUserProfile() {
      try {
        const activeSession = await ensureFreshSession();
        if (!activeSession?.access_token) return null;
        const user = await fetchAuthedUser();
        if (!user?.id) return null;
        const profile = await fetchProfile(user.id, activeSession.access_token).catch(() => null);
        return profileToCurrentUser(user, profile);
      } catch (error) {
        console.warn('Supabase current user lookup failed', error);
        return null;
      }
    }

    async function loadBundleRowsBySlug(duelSlug, accessToken) {
      const duelRows = await restRequest(config.tables.duels, {
        method: 'GET',
        query: {
          select: 'id,slug,room_slug,label,visibility,state,created_at,updated_at,ready_at,starts_scoring_at,starts_scoring_from_match_no,score_start_count,live_at,created_by_user_id,created_by_handle',
          slug: `eq.${normalizeSlug(duelSlug)}`
        },
        accessToken
      });
      const duelRow = firstArrayItem(duelRows);
      if (!duelRow?.id) return null;
      const entryRows = await restRequest(config.tables.duelEntries, {
        method: 'GET',
        query: {
          select: 'id,duel_id,slot_index,owner_user_id,owner_handle,reserved_handle,display_name,picks,submitted_at,created_at,updated_at',
          duel_id: `eq.${duelRow.id}`,
          order: 'slot_index.asc'
        },
        accessToken
      });
      return { duelRow, entryRows: Array.isArray(entryRows) ? entryRows : [] };
    }

function normalizeMiniFantasyEntryRow(row) {
  if (!row) return null;
  return {
    id: row.id || null,
    userId: row.user_id || null,
    ownerHandle: normalizeSlug(row.owner_handle || ''),
    displayName: normalizeWhitespace(row.display_name || row.owner_handle || ''),
    season: normalizeWhitespace(row.season || ''),
    matchNo: Number(row.match_no || 0) || null,
    homeTeamCode: normalizeWhitespace(row.home_team_code || ''),
        awayTeamCode: normalizeWhitespace(row.away_team_code || ''),
        fixtureLabel: normalizeWhitespace(row.fixture_label || ''),
        fixtureDatetimeUtc: row.fixture_datetime_utc || null,
        selectedPlayerIds: Array.isArray(row.selected_player_ids) ? row.selected_player_ids.filter(Boolean) : [],
        captainPlayerId: normalizeWhitespace(row.captain_player_id || '') || null,
        priceSnapshot: cloneJson(row.price_snapshot || {}),
        spentCredits: Number(row.spent_credits || 0) || 0,
        savedAt: row.saved_at || null,
        createdAt: row.created_at || null,
        updatedAt: row.updated_at || null
      };
    }

    function normalizeMiniFantasyProfileRow(row) {
      if (!row) return null;
      return {
        id: row.id || null,
        userId: row.id || null,
        handle: normalizeSlug(row.handle || ''),
        ownerHandle: normalizeSlug(row.handle || ''),
        displayName: normalizeWhitespace(row.display_name || row.handle || ''),
        email: normalizeWhitespace(row.email || '') || null,
        createdAt: row.created_at || null,
        created_at: row.created_at || null
      };
    }

    function normalizeMiniFantasyDailyBonusRow(row) {
      if (!row) return null;
      return {
        id: row.id || null,
        userId: row.user_id || null,
        ownerHandle: normalizeSlug(row.owner_handle || ''),
        displayName: normalizeWhitespace(row.display_name || row.owner_handle || ''),
        season: normalizeWhitespace(row.season || ''),
        bonusDateIst: normalizeWhitespace(row.bonus_date_ist || ''),
        bonus_date_ist: normalizeWhitespace(row.bonus_date_ist || ''),
        bonusPoints: Number(row.bonus_points || 0) || 0,
        bonus_points: Number(row.bonus_points || 0) || 0,
        createdAt: row.created_at || null,
        created_at: row.created_at || null
      };
    }

    function normalizeMiniFantasyLeaderboardRow(row) {
      if (!row) return null;
      return {
        id: row.id || null,
        season: normalizeWhitespace(row.season || ''),
        ownerHandle: normalizeSlug(row.owner_handle || ''),
        owner_handle: normalizeSlug(row.owner_handle || ''),
        userId: row.user_id || null,
        user_id: row.user_id || null,
        displayName: normalizeWhitespace(row.display_name || row.owner_handle || ''),
        display_name: normalizeWhitespace(row.display_name || row.owner_handle || ''),
        rank: Number(row.rank || 0) || 0,
        medal: normalizeWhitespace(row.medal || '') || null,
        totalPoints: Number(row.total_points || 0) || 0,
        total_points: Number(row.total_points || 0) || 0,
        savedEntries: Number(row.saved_entries || 0) || 0,
        saved_entries: Number(row.saved_entries || 0) || 0,
        scoredEntries: Number(row.scored_entries || 0) || 0,
        scored_entries: Number(row.scored_entries || 0) || 0,
        pendingEntries: Number(row.pending_entries || 0) || 0,
        pending_entries: Number(row.pending_entries || 0) || 0,
        latestSavedAt: row.latest_saved_at || null,
        latest_saved_at: row.latest_saved_at || null,
        dailyBonusPoints: Number(row.daily_bonus_points || 0) || 0,
        daily_bonus_points: Number(row.daily_bonus_points || 0) || 0,
        missedLockPoints: Number(row.missed_lock_points || 0) || 0,
        missed_lock_points: Number(row.missed_lock_points || 0) || 0,
        newPlayerBaselinePoints: Number(row.new_player_baseline_points || 0) || 0,
        new_player_baseline_points: Number(row.new_player_baseline_points || 0) || 0,
        completedMatchCount: Number(row.completed_match_count || 0) || 0,
        completed_match_count: Number(row.completed_match_count || 0) || 0,
        matches: cloneJson(row.matches || []),
        liveDataFetchedAt: row.live_data_fetched_at || null,
        live_data_fetched_at: row.live_data_fetched_at || null,
        snapshotVersion: normalizeWhitespace(row.snapshot_version || '') || null,
        snapshot_version: normalizeWhitespace(row.snapshot_version || '') || null,
        generatedAt: row.generated_at || null,
        generated_at: row.generated_at || null
      };
    }

    return {
      enabled: true,
      provider: 'supabase',
      label: config.projectName || 'Supabase',
      config,

      async bootstrap() {
        return currentUserProfile();
      },

      async getCurrentUser() {
        return currentUserProfile();
      },

      async signUp({ email, password, displayName, ownerId }) {
        const safeEmail = normalizeWhitespace(email || '');
        const safePassword = String(password || '');
        const safeDisplayName = normalizeWhitespace(displayName || '');
        const safeOwnerId = normalizeSlug(ownerId || safeDisplayName);
        if (!safeEmail || !safePassword || !safeDisplayName || !safeOwnerId) {
          throw new Error('Display name, handle, email, and password are all required to create an account.');
        }
        const payload = await authRequest('/signup', {
          method: 'POST',
          body: {
            email: safeEmail,
            password: safePassword,
            data: {
              display_name: safeDisplayName,
              handle: safeOwnerId
            }
          }
        });
        if (!payload?.session?.access_token || !payload?.user?.id) {
          throw new Error('Signup succeeded but there is no active session yet. Disable email confirmation or confirm the account first, then sign in.');
        }
        storeSession(payload.session);
        await upsertProfile({
          id: payload.user.id,
          email: safeEmail,
          display_name: safeDisplayName,
          handle: safeOwnerId
        }, payload.session.access_token);
        return currentUserProfile();
      },

      async signIn({ email, password, displayName = '', ownerId = '' }) {
        const safeEmail = normalizeWhitespace(email || '');
        const safePassword = String(password || '');
        if (!safeEmail || !safePassword) {
          throw new Error('Email and password are required to sign in.');
        }
        const payload = await authRequest('/token?grant_type=password', {
          method: 'POST',
          body: {
            email: safeEmail,
            password: safePassword
          }
        });
        if (!payload?.access_token || !payload?.user?.id) {
          throw new Error('Could not start a backend session for this account.');
        }
        storeSession(payload);
        let profile = await fetchProfile(payload.user.id, payload.access_token).catch(() => null);
        if (!profile) {
          const fallbackIdentity = deriveFallbackIdentity(payload.user, safeEmail);
          const requestedDisplayName = normalizeWhitespace(displayName || fallbackIdentity.displayName || '');
          const requestedOwnerId = normalizeSlug(ownerId || fallbackIdentity.ownerId || requestedDisplayName);
          try {
            profile = await upsertProfile({
              id: payload.user.id,
              email: payload.user.email || safeEmail,
              display_name: requestedDisplayName,
              handle: requestedOwnerId
            }, payload.access_token);
          } catch (error) {
            const fallbackHandle = normalizeSlug(`${requestedOwnerId || 'player'}-${String(payload.user.id || '').slice(0, 6)}`);
            profile = await upsertProfile({
              id: payload.user.id,
              email: payload.user.email || safeEmail,
              display_name: requestedDisplayName || fallbackIdentity.displayName,
              handle: fallbackHandle || 'duels-player'
            }, payload.access_token).catch(() => {
              throw new Error('This account signed in, but its Duels profile could not be repaired automatically. Please contact support and mention profile repair.');
            });
          }
        }
        return profileToCurrentUser(payload.user, profile);
      },

      async signOut() {
        const activeSession = await ensureFreshSession();
        if (activeSession?.access_token) {
          try {
            await authRequest('/logout', {
              method: 'POST',
              accessToken: activeSession.access_token
            });
          } catch (error) {
            console.warn('Supabase logout failed', error);
          }
        }
        storeSession(null);
        return true;
      },

      async listPublicBundles(roomSlug) {
        const safeRoomSlug = normalizeSlug(roomSlug || '');
        if (!safeRoomSlug) return [];
        const duelRows = await restRequest(config.tables.duels, {
          method: 'GET',
          query: {
            select: 'id,slug,room_slug,label,visibility,state,created_at,updated_at,ready_at,starts_scoring_at,starts_scoring_from_match_no,score_start_count,live_at,created_by_user_id,created_by_handle',
            room_slug: `eq.${safeRoomSlug}`,
            visibility: 'eq.public',
            order: 'updated_at.desc.nullslast,created_at.desc'
          }
        });
        if (!Array.isArray(duelRows) || !duelRows.length) return [];
        const ids = duelRows.map((row) => row.id).filter(Boolean);
        const entryRows = await restRequest(config.tables.duelEntries, {
          method: 'GET',
          query: {
            select: 'id,duel_id,slot_index,owner_user_id,owner_handle,reserved_handle,display_name,picks,submitted_at,created_at,updated_at',
            duel_id: `in.(${ids.join(',')})`,
            order: 'slot_index.asc'
          }
        });
        const entriesByDuel = new Map();
        (Array.isArray(entryRows) ? entryRows : []).forEach((entry) => {
          const key = entry.duel_id;
          if (!entriesByDuel.has(key)) entriesByDuel.set(key, []);
          entriesByDuel.get(key).push(entry);
        });
        return duelRows
          .map((duelRow) => makeBundleFromRows(duelRow, entriesByDuel.get(duelRow.id) || []))
          .filter(Boolean);
      },

      async createPublicDuel({ roomSlug, duelSlug, currentUser }) {
        const activeSession = await ensureFreshSession();
        if (!activeSession?.access_token || !currentUser?.userId) {
          throw new Error('Sign in with a backend account before creating a persisted duel.');
        }
        const safeRoomSlug = normalizeSlug(roomSlug || '');
        const safeDuelSlug = normalizeSlug(duelSlug || '');
        const openSlotName = 'Open challenger';
        if (!safeRoomSlug || !safeDuelSlug) {
          throw new Error('Could not create a persisted duel because the room or duel slug was missing.');
        }
        const duelRows = await restRequest(config.tables.duels, {
          method: 'POST',
          query: {
            select: 'id,slug,room_slug,label,visibility,state,created_at,updated_at,ready_at,starts_scoring_at,starts_scoring_from_match_no,score_start_count,live_at,created_by_user_id,created_by_handle'
          },
          body: {
            slug: safeDuelSlug,
            room_slug: safeRoomSlug,
            label: `${currentUser.displayName} vs ${openSlotName}`,
            visibility: 'public',
            state: 'draft',
            created_by_user_id: currentUser.userId,
            created_by_handle: currentUser.ownerId
          },
          accessToken: activeSession.access_token,
          prefer: 'return=representation'
        });
        const duelRow = firstArrayItem(duelRows);
        if (!duelRow?.id) throw new Error('The backend created no duel row.');
        const entryRows = await restRequest(config.tables.duelEntries, {
          method: 'POST',
          query: {
            select: 'id,duel_id,slot_index,owner_user_id,owner_handle,reserved_handle,display_name,picks,submitted_at,created_at,updated_at'
          },
          body: [
            {
              duel_id: duelRow.id,
              slot_index: 1,
              owner_user_id: currentUser.userId,
              owner_handle: currentUser.ownerId,
              reserved_handle: null,
              display_name: currentUser.displayName,
              picks: {}
            },
            {
              duel_id: duelRow.id,
              slot_index: 2,
              owner_user_id: null,
              owner_handle: null,
              reserved_handle: null,
              display_name: openSlotName,
              picks: {}
            }
          ],
          accessToken: activeSession.access_token,
          prefer: 'return=representation'
        });
        return makeBundleFromRows(duelRow, entryRows);
      },

      async claimOpenEntry({ duelSlug, currentUser }) {
        const activeSession = await ensureFreshSession();
        if (!activeSession?.access_token || !currentUser?.userId) {
          throw new Error('Sign in with a backend account before joining a persisted duel.');
        }
        const loaded = await loadBundleRowsBySlug(duelSlug, activeSession.access_token);
        if (!loaded?.duelRow) throw new Error('That persisted duel could not be found.');
        const ownEntry = loaded.entryRows.find((entry) => entry.owner_user_id === currentUser.userId || normalizeSlug(entry.owner_handle || '') === normalizeSlug(currentUser.ownerId || ''));
        if (ownEntry) {
          return makeBundleFromRows(loaded.duelRow, loaded.entryRows);
        }
        const openEntry = loaded.entryRows.find((entry) => !entry.owner_user_id && !normalizeWhitespace(entry.owner_handle || ''));
        if (!openEntry) throw new Error('This duel has no open slot left to claim.');
        const reservedHandle = normalizeSlug(openEntry.reserved_handle || '');
        if (reservedHandle && reservedHandle !== normalizeSlug(currentUser.ownerId || '')) {
          throw new Error(`This duel slot is reserved for @${reservedHandle}.`);
        }
        const updatedAt = new Date().toISOString();
        await restRequest(config.tables.duelEntries, {
          method: 'PATCH',
          query: {
            id: `eq.${openEntry.id}`,
            select: 'id'
          },
          body: {
            owner_user_id: currentUser.userId,
            owner_handle: currentUser.ownerId,
            display_name: currentUser.displayName,
            updated_at: updatedAt
          },
          accessToken: activeSession.access_token,
          prefer: 'return=representation'
        });
        const nextEntryRows = loaded.entryRows.map((entry) => (
          entry.id === openEntry.id
            ? {
                ...entry,
                owner_user_id: currentUser.userId,
                owner_handle: currentUser.ownerId,
                display_name: currentUser.displayName,
                updated_at: updatedAt
              }
            : entry
        ));
        await restRequest(config.tables.duels, {
          method: 'PATCH',
          query: {
            id: `eq.${loaded.duelRow.id}`,
            select: 'id'
          },
          body: {
            label: buildBundleLabel(loaded.duelRow, nextEntryRows),
            updated_at: updatedAt
          },
          accessToken: activeSession.access_token,
          prefer: 'return=representation'
        });
        const refreshed = await loadBundleRowsBySlug(duelSlug, activeSession.access_token);
        return makeBundleFromRows(refreshed.duelRow, refreshed.entryRows);
      },

      async saveOwnedEntry({ duelSlug, currentUser, picks, submittedAt = null }) {
        const activeSession = await ensureFreshSession();
        if (!activeSession?.access_token || !currentUser?.userId) {
          throw new Error('Sign in with a backend account before saving persisted duel picks.');
        }
        const loaded = await loadBundleRowsBySlug(duelSlug, activeSession.access_token);
        if (!loaded?.duelRow) throw new Error('That persisted duel could not be found.');
        const ownEntry = loaded.entryRows.find((entry) => entry.owner_user_id === currentUser.userId || normalizeSlug(entry.owner_handle || '') === normalizeSlug(currentUser.ownerId || ''));
        if (!ownEntry) throw new Error('This duel does not contain an editable slot for your account.');
        await restRequest(config.tables.duelEntries, {
          method: 'PATCH',
          query: {
            id: `eq.${ownEntry.id}`,
            select: 'id'
          },
          body: {
            owner_user_id: currentUser.userId,
            owner_handle: currentUser.ownerId,
            display_name: currentUser.displayName,
            picks: cloneJson(picks || {}),
            submitted_at: submittedAt || null,
            updated_at: new Date().toISOString()
          },
          accessToken: activeSession.access_token,
          prefer: 'return=representation'
        });
        await restRequest(config.tables.duels, {
          method: 'PATCH',
          query: {
            id: `eq.${loaded.duelRow.id}`,
            select: 'id'
          },
          body: {
            updated_at: new Date().toISOString()
          },
          accessToken: activeSession.access_token,
          prefer: 'return=representation'
        });
        const refreshed = await loadBundleRowsBySlug(duelSlug, activeSession.access_token);
        return makeBundleFromRows(refreshed.duelRow, refreshed.entryRows);
      },

      async listMiniFantasyEntries({ season, currentUser }) {
        const activeSession = await ensureFreshSession();
        if (!activeSession?.access_token || !currentUser?.userId) {
          return [];
        }
        const safeSeason = normalizeWhitespace(season || '');
        const rows = await restRequest(config.tables.miniFantasyEntries, {
          method: 'GET',
          query: {
            select: 'id,user_id,owner_handle,display_name,season,match_no,home_team_code,away_team_code,fixture_label,fixture_datetime_utc,selected_player_ids,captain_player_id,price_snapshot,spent_credits,saved_at,created_at,updated_at',
            user_id: `eq.${currentUser.userId}`,
            ...(safeSeason ? { season: `eq.${safeSeason}` } : {}),
            order: 'fixture_datetime_utc.asc.nullslast,match_no.asc'
          },
          accessToken: activeSession.access_token
        });
        const enrichedRows = await enrichMiniFantasyEntriesWithProfiles(rows, activeSession.access_token);
        return enrichedRows.map(normalizeMiniFantasyEntryRow).filter(Boolean);
      },

      async listPublicMiniFantasyEntries({ season, currentUser } = {}) {
        const activeSession = await ensureFreshSession();
        const safeSeason = normalizeWhitespace(season || '');
        const publicVisibleAtUtc = new Date(Date.now() + 60 * 1000).toISOString();
        const rows = await restRequest(config.tables.miniFantasyEntries, {
          method: 'GET',
          query: {
            select: 'id,user_id,owner_handle,display_name,season,match_no,home_team_code,away_team_code,fixture_label,fixture_datetime_utc,selected_player_ids,captain_player_id,price_snapshot,spent_credits,saved_at,created_at,updated_at',
            ...(safeSeason ? { season: `eq.${safeSeason}` } : {}),
            fixture_datetime_utc: `lte.${publicVisibleAtUtc}`,
            order: 'saved_at.desc.nullslast,fixture_datetime_utc.asc.nullslast,match_no.asc'
          },
          accessToken: activeSession?.access_token || currentUser?.accessToken || null
        });
        const enrichedRows = await enrichMiniFantasyEntriesWithProfiles(rows, activeSession?.access_token || currentUser?.accessToken || null);
        return enrichedRows.map(normalizeMiniFantasyEntryRow).filter(Boolean);
      },

      async listPublicMiniFantasyProfiles({ currentUser } = {}) {
        const activeSession = await ensureFreshSession();
        const rows = await restRequest(config.tables.profiles, {
          method: 'GET',
          query: {
            select: 'id,handle,display_name,email,created_at',
            order: 'created_at.asc.nullslast'
          },
          accessToken: activeSession?.access_token || currentUser?.accessToken || null
        });
        return (Array.isArray(rows) ? rows : []).map(normalizeMiniFantasyProfileRow).filter(Boolean);
      },

      async listPublicMiniFantasyDailyBonuses({ season, currentUser } = {}) {
        const activeSession = await ensureFreshSession();
        const safeSeason = normalizeWhitespace(season || '');
        const rows = await restRequest(config.tables.miniFantasyDailyBonuses, {
          method: 'GET',
          query: {
            select: 'id,user_id,owner_handle,display_name,season,bonus_date_ist,bonus_points,created_at',
            ...(safeSeason ? { season: `eq.${safeSeason}` } : {}),
            order: 'bonus_date_ist.asc.nullslast,created_at.asc.nullslast'
          },
          accessToken: activeSession?.access_token || currentUser?.accessToken || null
        });
        return (Array.isArray(rows) ? rows : []).map(normalizeMiniFantasyDailyBonusRow).filter(Boolean);
      },

      async listMiniFantasyLeaderboardRows({ season, currentUser } = {}) {
        const activeSession = await ensureFreshSession();
        const safeSeason = normalizeWhitespace(season || '');
        const rows = await restRequest(config.tables.miniFantasyLeaderboardRows, {
          method: 'GET',
          query: {
            select: 'id,season,owner_handle,user_id,display_name,rank,medal,total_points,saved_entries,scored_entries,pending_entries,latest_saved_at,daily_bonus_points,missed_lock_points,new_player_baseline_points,completed_match_count,matches,live_data_fetched_at,snapshot_version,generated_at',
            ...(safeSeason ? { season: `eq.${safeSeason}` } : {}),
            order: 'rank.asc,total_points.desc'
          },
          accessToken: activeSession?.access_token || currentUser?.accessToken || null
        });
        return (Array.isArray(rows) ? rows : []).map(normalizeMiniFantasyLeaderboardRow).filter(Boolean);
      },

      async claimMiniFantasyDailyBonus({ currentUser, season, bonusDateIst, bonusPoints }) {
        const activeSession = await ensureFreshSession();
        if (!activeSession?.access_token || !currentUser?.userId) {
          throw new Error('Sign in with a backend account before claiming the Mini Fantasy visit bonus.');
        }
        const safeSeason = normalizeWhitespace(season || '');
        const safeBonusDateIst = normalizeWhitespace(bonusDateIst || '');
        if (!safeSeason || !safeBonusDateIst) {
          throw new Error('Mini Fantasy daily visit bonus needs both season and India date.');
        }
        const rows = await restRequest(config.tables.miniFantasyDailyBonuses, {
          method: 'POST',
          query: {
            on_conflict: 'user_id,season,bonus_date_ist',
            select: 'id,user_id,owner_handle,display_name,season,bonus_date_ist,bonus_points,created_at'
          },
          body: {
            user_id: currentUser.userId,
            owner_handle: currentUser.ownerId,
            display_name: normalizeWhitespace(currentUser.displayName || currentUser.ownerId || ''),
            season: safeSeason,
            bonus_date_ist: safeBonusDateIst,
            bonus_points: 5
          },
          accessToken: activeSession.access_token,
          prefer: 'resolution=merge-duplicates,return=representation'
        });
        return normalizeMiniFantasyDailyBonusRow(firstArrayItem(rows));
      },

      async upsertMiniFantasyEntry({ currentUser, entry }) {
        const activeSession = await ensureFreshSession();
        if (!activeSession?.access_token || !currentUser?.userId) {
          throw new Error('Sign in with a backend account before saving Mini Fantasy picks.');
        }
        const safeSeason = normalizeWhitespace(entry?.season || '');
        const matchNo = Number(entry?.matchNo || 0);
        if (!safeSeason || !matchNo) {
          throw new Error('Mini Fantasy save needs a season and match number.');
        }
        const rows = await restRequest(config.tables.miniFantasyEntries, {
          method: 'POST',
          query: {
            on_conflict: 'user_id,season,match_no',
            select: 'id,user_id,owner_handle,display_name,season,match_no,home_team_code,away_team_code,fixture_label,fixture_datetime_utc,selected_player_ids,captain_player_id,price_snapshot,spent_credits,saved_at,created_at,updated_at'
          },
          body: {
            user_id: currentUser.userId,
            owner_handle: currentUser.ownerId,
            display_name: normalizeWhitespace(entry?.displayName || currentUser.displayName || currentUser.ownerId || ''),
            season: safeSeason,
            match_no: matchNo,
            home_team_code: normalizeWhitespace(entry?.homeTeamCode || ''),
            away_team_code: normalizeWhitespace(entry?.awayTeamCode || ''),
            fixture_label: normalizeWhitespace(entry?.fixtureLabel || ''),
            fixture_datetime_utc: entry?.fixtureDatetimeUtc || null,
            selected_player_ids: cloneJson(entry?.selectedPlayerIds || []),
            captain_player_id: normalizeWhitespace(entry?.captainPlayerId || '') || null,
            price_snapshot: cloneJson(entry?.priceSnapshot || {}),
            spent_credits: Number(entry?.spentCredits || 0) || 0,
            saved_at: entry?.savedAt || new Date().toISOString()
          },
          accessToken: activeSession.access_token,
          prefer: 'resolution=merge-duplicates,return=representation'
        });
        return normalizeMiniFantasyEntryRow(firstArrayItem(rows));
      }
    };
  }

  window.createDuelsBackend = function createDuelsBackend(rawConfig = {}) {
    const config = Object.assign({}, DEFAULTS, rawConfig || {});
    if ((config.provider || 'supabase') === 'supabase') {
      return createSupabaseBackend(config);
    }
    return createDisabledBackend(config);
  };

  window.DUELS_BACKEND_API = window.createDuelsBackend(window.DUELS_BACKEND_CONFIG || {});
})();
