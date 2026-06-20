/**
 * MoneyMint API client + token store.
 *
 * Exposes a single global `mmApi` object used by storage.js and auth.js.
 * window.API_BASE_URL must be set in index.html BEFORE this file loads.
 */

const tokenStore = {
  getAccess:  ()        => localStorage.getItem('mt_access_token'),
  getRefresh: ()        => localStorage.getItem('mt_refresh_token'),
  set(access, refresh)  {
    if (access)  localStorage.setItem('mt_access_token',  access);
    if (refresh) localStorage.setItem('mt_refresh_token', refresh);
  },
  clear() {
    localStorage.removeItem('mt_access_token');
    localStorage.removeItem('mt_refresh_token');
  },
  isLoggedIn: () => !!localStorage.getItem('mt_access_token'),
};

// Prevent multiple simultaneous refresh calls (race condition guard)
let _refreshing = null;

async function _doRefresh() {
  const rt = tokenStore.getRefresh();
  if (!rt) throw new Error('No refresh token');
  const r = await fetch(`${window.API_BASE_URL}/api/auth/refresh`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ refreshToken: rt }),
  });
  if (!r.ok) { tokenStore.clear(); throw new Error('Session expired'); }
  const d = await r.json();
  tokenStore.set(d.accessToken, d.refreshToken);
  return d.accessToken;
}

async function _apiFetch(path, opts = {}) {
  const hdrs = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  const tok = tokenStore.getAccess();
  if (tok) hdrs['Authorization'] = `Bearer ${tok}`;

  let res = await fetch(`${window.API_BASE_URL}${path}`, { ...opts, headers: hdrs });

  // Auto-refresh on 401 and retry once
  if (res.status === 401 && tokenStore.getRefresh()) {
    if (!_refreshing) {
      _refreshing = _doRefresh().finally(() => { _refreshing = null; });
    }
    try {
      const newTok = await _refreshing;
      hdrs['Authorization'] = `Bearer ${newTok}`;
      res = await fetch(`${window.API_BASE_URL}${path}`, { ...opts, headers: hdrs });
    } catch { /* refresh failed — return the 401 as-is */ }
  }

  return res;
}

const mmApi = {
  tokenStore,

  // Used for auth endpoints (no bearer token, just plain POST)
  async authPost(path, body) {
    const r = await fetch(`${window.API_BASE_URL}${path}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Request failed');
    return d;
  },

  async get(path) {
    const r = await _apiFetch(path);
    return r.ok ? r.json() : null;
  },

  async post(path, body) {
    return _apiFetch(path, { method: 'POST', body: JSON.stringify(body) });
  },

  async put(path, body) {
    return _apiFetch(path, { method: 'PUT', body: JSON.stringify(body) });
  },

  async del(path) {
    return _apiFetch(path, { method: 'DELETE' });
  },
};
