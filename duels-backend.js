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
      duelEntries: 'duel_entries'
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
        label: normalizeWhitespace(duelRow.label || orderedEntries.map((entry) => entry.displayName).join(' vs ')),
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
      async saveOwnedEntry() { throw disabledError(); }
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
          select: 'id,handle,display_name,email',
          id: `eq.${userId}`
        },
        accessToken
      });
      return firstArrayItem(rows);
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
          select: 'id,handle,display_name,email'
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
        authSource: 'supabase'
      };
    }

    async function currentUserProfile() {
      const activeSession = await ensureFreshSession();
      if (!activeSession?.access_token) return null;
      const user = await fetchAuthedUser();
      if (!user?.id) return null;
      const profile = await fetchProfile(user.id, activeSession.access_token).catch(() => null);
      return profileToCurrentUser(user, profile);
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
          const safeDisplayName = normalizeWhitespace(displayName || payload.user.user_metadata?.display_name || '');
          const safeOwnerId = normalizeSlug(ownerId || payload.user.user_metadata?.handle || safeDisplayName);
          if (!safeDisplayName || !safeOwnerId) {
            throw new Error('This account is missing a Duels profile. Sign in with display name and handle filled once so the profile can be created.');
          }
          profile = await upsertProfile({
            id: payload.user.id,
            email: payload.user.email || safeEmail,
            display_name: safeDisplayName,
            handle: safeOwnerId
          }, payload.access_token);
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
            updated_at: new Date().toISOString()
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
