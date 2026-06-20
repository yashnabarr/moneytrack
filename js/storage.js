/**
 * localStorage wrapper + background API sync.
 *
 * Public API is unchanged from the original offline version:
 *   storage.get(key, fallback)
 *   storage.save(key, data)
 *   storage.remove(key)
 *
 * When the user is signed in (mmApi.tokenStore.isLoggedIn()), every call to
 * storage.save() for app-data keys (transactions / budgets / goals) also fires
 * a background sync to the server — creates, updates, and deletes derived by
 * diffing the old list against the new list.
 *
 * loadFromApi()  — call once after login to hydrate localStorage from the server.
 * initializeDefaultData() — unchanged; still called at boot.
 */

// Map from localStorage key → REST endpoint
const _API_ENDPOINTS = {
  mt_transactions: '/api/transactions',
  mt_budgets:      '/api/budgets',
  mt_goals:        '/api/goals',
};

const storage = {
  save(key, data) {
    try {
      const old = this.get(key, []);
      localStorage.setItem(key, JSON.stringify(data));

      // Fire-and-forget sync only for app-data keys when authenticated
      if (mmApi.tokenStore.isLoggedIn() && _API_ENDPOINTS[key]) {
        _syncDiff(key, Array.isArray(old) ? old : [], Array.isArray(data) ? data : []);
      }
      return true;
    } catch (e) { console.error('storage.save failed', e); return false; }
  },

  get(key, fallback = null) {
    try {
      const r = localStorage.getItem(key);
      return r ? JSON.parse(r) : fallback;
    } catch (e) { console.error('storage.get failed', e); return fallback; }
  },

  remove(key) { localStorage.removeItem(key); },
};

/**
 * Diff oldList vs newList and call the appropriate API endpoints.
 * Items are matched by their `id` field.
 * This runs asynchronously in the background — UI is never blocked.
 */
function _syncDiff(key, oldList, newList) {
  const endpoint = _API_ENDPOINTS[key];
  const oldMap   = new Map(oldList.map(x => [x.id, x]));
  const newMap   = new Map(newList.map(x => [x.id, x]));

  // Created — in new but not in old
  newList.forEach(item => {
    if (!oldMap.has(item.id)) {
      mmApi.post(endpoint, item).catch(e => console.error('sync create failed', e));
    }
  });

  // Updated — in both, but content changed
  newList.forEach(item => {
    if (oldMap.has(item.id)) {
      const prev = oldMap.get(item.id);
      if (JSON.stringify(prev) !== JSON.stringify(item)) {
        mmApi.put(`${endpoint}/${item.id}`, item).catch(e => console.error('sync update failed', e));
      }
    }
  });

  // Deleted — in old but not in new
  oldList.forEach(item => {
    if (!newMap.has(item.id)) {
      mmApi.del(`${endpoint}/${item.id}`).catch(e => console.error('sync delete failed', e));
    }
  });
}

/**
 * Fetch all user data from the server and populate localStorage.
 * Called once after a successful login so the user sees their server-side data.
 * Uses localStorage.setItem directly to avoid triggering _syncDiff.
 */
async function loadFromApi() {
  try {
    const data = await mmApi.get('/api/user/data');
    if (!data) return;
    localStorage.setItem(KEYS.transactions, JSON.stringify(data.transactions || []));
    localStorage.setItem(KEYS.budgets,      JSON.stringify(data.budgets      || []));
    localStorage.setItem(KEYS.goals,        JSON.stringify(data.goals        || []));
  } catch (e) {
    console.error('loadFromApi failed', e);
  }
}

/** Ensure empty buckets exist on first boot (unchanged from original). */
function initializeDefaultData() {
  if (storage.get(KEYS.transactions) === null) storage.save(KEYS.transactions, []);
  if (storage.get(KEYS.budgets)      === null) storage.save(KEYS.budgets,      []);
  if (storage.get(KEYS.goals)        === null) storage.save(KEYS.goals,        []);
}
