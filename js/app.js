/**
 * App orchestrator.
 *
 *   - Reports & Settings views (small enough to live here)
 *   - Shared modal dispatcher (modalHTML / readForm / saver)
 *   - Top-level render() — swaps between landing / auth / app screens and
 *     wires every interaction.
 *   - Boot logic at the bottom.
 *
 * Loaded last so it can reference every other module.
 */

/* =========================================================
   REPORTS
   ========================================================= */

function reportsHTML() {
  const tx = storage.get(KEYS.transactions, []);
  const head = `
    <div class="page-head">
      <div><h1>Reports</h1><p>Summaries of your financial activity over time.</p></div>
      <div class="an-actions">
        <button class="btn-primary" data-action="print">${icon("print")} Print</button>
        <button class="btn-primary" data-action="export">${icon("download")} Export CSV</button>
      </div>
    </div>`;
  if (tx.length === 0) return head + `<div class="empty">${icon("description")}No data to report yet. Add some transactions first.</div>`;

  const months = monthlyTotals(6);
  const rows = months.map(m => {
    const net = m.income - m.expense;
    return `<tr>
      <td style="padding:12px 8px;font-weight:600">${m.label}</td>
      <td style="padding:12px 8px;text-align:right;color:var(--primary)" class="tnum">${money(m.income)}</td>
      <td style="padding:12px 8px;text-align:right;color:var(--error)" class="tnum">${money(m.expense)}</td>
      <td style="padding:12px 8px;text-align:right;font-weight:600;color:${net < 0 ? "var(--error)" : "var(--on-surface)"}" class="tnum">${money(net)}</td>
    </tr>`;
  }).join("");
  const tIncome = months.reduce((s, m) => s + m.income, 0);
  const tExpense = months.reduce((s, m) => s + m.expense, 0);

  return `
    ${head}
    <div class="card">
      <div class="card-head"><h3>Last 6 Months</h3></div>
      <table style="width:100%;border-collapse:collapse;font-size:15px">
        <thead><tr style="border-bottom:2px solid var(--container-highest);text-align:left;color:var(--on-surface-variant);font-size:13px">
          <th style="padding:8px">Month</th><th style="padding:8px;text-align:right">Income</th>
          <th style="padding:8px;text-align:right">Expenses</th><th style="padding:8px;text-align:right">Net</th>
        </tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr style="border-top:2px solid var(--container-highest);font-weight:700">
          <td style="padding:12px 8px">Total</td>
          <td style="padding:12px 8px;text-align:right;color:var(--primary)" class="tnum">${money(tIncome)}</td>
          <td style="padding:12px 8px;text-align:right;color:var(--error)" class="tnum">${money(tExpense)}</td>
          <td style="padding:12px 8px;text-align:right" class="tnum">${money(tIncome - tExpense)}</td>
        </tr></tfoot>
      </table>
    </div>`;
}

/* =========================================================
   PREFERENCES (UI settings persisted to localStorage)
   Stored under a dedicated key that is NOT part of the server
   sync map, so saving here never triggers an API write.
   ========================================================= */

const PREFS_KEY = "mt_prefs";

/** Defaults merged with whatever the user has saved. */
function getPrefs() {
  return Object.assign(
    { dateFormat: "MDY", theme: "light", emailNotif: true, budgetAlerts: true, monthlyReports: false },
    storage.get(PREFS_KEY, {}) || {}
  );
}

/** Persist one or more preference keys (shallow-merged). */
function setPrefs(patch) {
  storage.save(PREFS_KEY, Object.assign(getPrefs(), patch));
}

/* =========================================================
   THEME (light / dark / system)
   Applied as a `theme-dark` class on <html> so every CSS token
   re-maps at once. A matching pre-paint script in index.html sets
   the class before first paint to avoid any flash.
   ========================================================= */

/** Is the dark theme currently applied to the document? */
function isDarkActive() {
  return document.documentElement.classList.contains("theme-dark");
}

/** Resolve a theme preference ("light" | "dark" | "system") to a boolean. */
function resolveDark(theme) {
  if (theme === "dark")   return true;
  if (theme === "system") return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  return false;
}

/** Apply the saved theme to <html>. Pass `animate` to cross-fade the switch. */
function applyTheme(animate) {
  const el = document.documentElement;
  if (animate) {
    el.classList.add("theme-anim");
    setTimeout(() => el.classList.remove("theme-anim"), 350);
  }
  el.classList.toggle("theme-dark", resolveDark(getPrefs().theme));
}

/** Refresh the sun/moon icon on every quick theme-toggle button in place. */
function syncThemeToggleIcons() {
  const name = isDarkActive() ? "light_mode" : "dark_mode";
  document.querySelectorAll("[data-theme-toggle] .material-symbols-outlined")
    .forEach(ic => { ic.textContent = name; });
}

/** Wire every quick theme-toggle button under `root` (topbar, landing, auth). */
function wireThemeToggle(root) {
  root.querySelectorAll("[data-theme-toggle]").forEach(b =>
    b.addEventListener("click", () => {
      setPrefs({ theme: isDarkActive() ? "light" : "dark" });
      applyTheme(true);
      render();
    })
  );
}

/* =========================================================
   TOPBAR SEARCH — autocomplete navigator
   ========================================================= */

/** Searchable destinations — sidebar nav + a couple of special actions. */
const SEARCH_ITEMS = [
  { name: "Dashboard",      sub: "Overview & key stats",            icon: "dashboard",       tab: "dashboard",    aliases: "home main overview stats" },
  { name: "Transactions",   sub: "Income & expense log",            icon: "swap_horiz",      tab: "transactions", aliases: "tx entries history list payments" },
  { name: "Calendar",       sub: "Spending by day, month view",     icon: "calendar_month",  tab: "calendar",     aliases: "month day date schedule view grid" },
  { name: "Recurring",      sub: "Auto-add subscriptions & salary", icon: "autorenew",       tab: "recurring",    aliases: "subscription rent netflix bill repeat schedule auto" },
  { name: "Splits",         sub: "Track shared expenses",            icon: "group",          tab: "splits",       aliases: "split owe owed roommate friend trip settle group" },
  { name: "Budgets",        sub: "Monthly category limits",         icon: "donut_small",     tab: "budgets",      aliases: "limit spending cap" },
  { name: "Savings Goals",  sub: "Targets & progress rings",        icon: "flag",            tab: "goals",        aliases: "goal target save fund" },
  { name: "Analytics",      sub: "Charts, trends & breakdowns",     icon: "monitoring",      tab: "analytics",    aliases: "report chart graph insight stat" },
  { name: "Reports",        sub: "Printable summary",               icon: "description",     tab: "reports",      aliases: "summary print" },
  { name: "Settings",       sub: "Preferences & data management",   icon: "settings",        tab: "settings",     aliases: "preference config option" },
  { name: "Help & Support", sub: "FAQs, guides & contact",          icon: "help",            tab: "help",         aliases: "faq question docs guide" },
  { name: "Profile",        sub: "Your account in Settings",        icon: "person",          tab: "settings",     aliases: "account user me name email" },
  { name: "Logout",         sub: "Sign out of PockIt",              icon: "logout",          action: "logout",    aliases: "signout exit leave quit" },
];

/** Score-and-sort matches for a query (max 5). Prefix matches rank above contains; name beats sub/aliases. */
function searchMatch(query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return [];
  const scored = SEARCH_ITEMS.map(it => {
    const name    = it.name.toLowerCase();
    const sub     = it.sub.toLowerCase();
    const aliases = (it.aliases || "").toLowerCase();
    let score = -1;
    if (name === q)                 score = 100;
    else if (name.startsWith(q))    score = 90;
    else if (name.includes(" " + q)) score = 80;        // word-prefix match
    else if (name.includes(q))      score = 70;
    else if (aliases.split(/\s+/).some(a => a.startsWith(q))) score = 50;
    else if (sub.includes(q))       score = 30;
    else if (aliases.includes(q))   score = 20;
    return { it, score };
  });
  return scored
    .filter(s => s.score >= 0)
    .sort((a, b) => b.score - a.score || a.it.name.localeCompare(b.it.name))
    .slice(0, 5)
    .map(s => s.it);
}

/** Escape regex meta-characters so the highlight regex is safe. */
function escapeRegex(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

/** Wrap matching substring in <mark> for visible highlight. */
function highlightMatch(text, q) {
  const safeText = escapeHtml(text);
  if (!q) return safeText;
  const safeQ = escapeHtml(q);
  return safeText.replace(new RegExp("(" + escapeRegex(safeQ) + ")", "ig"), "<mark>$1</mark>");
}

/** Render one suggestion row. */
function searchItemHTML(it, q, isFirst) {
  return `
    <div class="search-item ${isFirst ? "highlight" : ""}" role="option" data-search-idx>
      <span class="si-ic">${icon(it.icon)}</span>
      <div class="si-main">
        <div class="si-name">${highlightMatch(it.name, q)}</div>
        <div class="si-sub">${highlightMatch(it.sub, q)}</div>
      </div>
      ${isFirst ? `<span class="si-kbd">↵</span>` : ""}
    </div>`;
}

/** Navigate to (or trigger) the selected suggestion. */
function searchActivate(it) {
  if (!it) return;
  if (it.action === "logout") { logout(); return; }
  if (it.tab) {
    activeTab = it.tab;
    txPage = 1;
    render();
    window.scrollTo(0, 0);
  }
}

/** Wire the topbar autocomplete search. Idempotent per render. */
function wireTopbarSearch(root) {
  const wrap     = root.querySelector("#topbarSearch");
  const input    = root.querySelector("#topbarSearchInput");
  const dropdown = root.querySelector("#topbarSearchDropdown");
  const clearBtn = root.querySelector("#topbarSearchClear");
  if (!wrap || !input || !dropdown) return;

  let highlight = 0;
  let lastResults = [];
  let debounceId = null;

  function paint(q) {
    lastResults = searchMatch(q);
    if (!q.trim()) {
      dropdown.hidden = true;
      input.setAttribute("aria-expanded", "false");
      return;
    }
    if (!lastResults.length) {
      dropdown.innerHTML = `<div class="search-empty">${icon("search_off")}No results for "<b>${escapeHtml(q)}</b>".</div>`;
    } else {
      highlight = 0;
      dropdown.innerHTML =
        `<div class="search-hint">Go to</div>` +
        lastResults.map((it, i) => searchItemHTML(it, q, i === 0)).join("");
      // Click handlers per row
      dropdown.querySelectorAll(".search-item").forEach((el, i) => {
        el.addEventListener("mousedown", e => e.preventDefault()); // keep focus before click
        el.addEventListener("click", () => {
          finish();
          searchActivate(lastResults[i]);
        });
        el.addEventListener("mouseenter", () => setHighlight(i));
      });
    }
    dropdown.hidden = false;
    input.setAttribute("aria-expanded", "true");
  }

  function setHighlight(idx) {
    if (!lastResults.length) return;
    highlight = (idx + lastResults.length) % lastResults.length;
    dropdown.querySelectorAll(".search-item").forEach((el, i) => {
      el.classList.toggle("highlight", i === highlight);
      if (i === highlight) el.scrollIntoView({ block: "nearest" });
    });
  }

  function finish() {
    input.value = "";
    dropdown.hidden = true;
    clearBtn.hidden = true;
    input.setAttribute("aria-expanded", "false");
  }

  // ---- Input: debounced filter ----
  input.addEventListener("input", () => {
    clearBtn.hidden = !input.value;
    clearTimeout(debounceId);
    debounceId = setTimeout(() => paint(input.value), 200);
  });

  // ---- Keyboard nav ----
  input.addEventListener("keydown", e => {
    if (e.key === "ArrowDown") { e.preventDefault(); paint(input.value); setHighlight(highlight + 1); }
    else if (e.key === "ArrowUp")   { e.preventDefault(); setHighlight(highlight - 1); }
    else if (e.key === "Enter") {
      if (!dropdown.hidden && lastResults[highlight]) {
        e.preventDefault();
        const target = lastResults[highlight];
        finish();
        searchActivate(target);
      }
    } else if (e.key === "Escape") {
      if (!dropdown.hidden) { e.preventDefault(); dropdown.hidden = true; input.setAttribute("aria-expanded", "false"); }
      else if (input.value) { input.value = ""; clearBtn.hidden = true; }
    }
  });

  // ---- Re-open dropdown on refocus if there's a query ----
  input.addEventListener("focus", () => { if (input.value.trim()) paint(input.value); });

  // ---- Clear button ----
  clearBtn.addEventListener("click", () => {
    input.value = ""; clearBtn.hidden = true;
    dropdown.hidden = true; input.focus();
    input.setAttribute("aria-expanded", "false");
  });

  // ---- Click outside closes ----
  // Bound once globally so it survives partial re-renders
  if (!document.__pockitSearchOutsideBound) {
    document.__pockitSearchOutsideBound = true;
    document.addEventListener("click", e => {
      const w = document.querySelector("#topbarSearch");
      if (!w) return;
      if (!w.contains(e.target)) {
        const dd = document.querySelector("#topbarSearchDropdown");
        const ip = document.querySelector("#topbarSearchInput");
        if (dd) dd.hidden = true;
        if (ip) ip.setAttribute("aria-expanded", "false");
      }
    });
  }

  // ---- Cmd/Ctrl + K focuses search ----
  if (!document.__pockitSearchHotkeyBound) {
    document.__pockitSearchHotkeyBound = true;
    document.addEventListener("keydown", e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        const ip = document.querySelector("#topbarSearchInput");
        if (ip) { e.preventDefault(); ip.focus(); ip.select(); }
      }
    });
  }
}

/** Reveal-on-scroll observer — adds `.is-visible` to any [data-reveal]
 *  / [data-stagger] element when ~15% of it enters the viewport.
 *  Falls back gracefully on browsers without IntersectionObserver. */
function wireRevealOnScroll(root) {
  const targets = root.querySelectorAll("[data-reveal], [data-stagger]");
  if (!targets.length) return;
  if (typeof IntersectionObserver === "undefined") {
    targets.forEach(el => el.classList.add("is-visible"));
    return;
  }
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.classList.add("is-visible");
        obs.unobserve(en.target);
      }
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
  targets.forEach(el => io.observe(el));
}

/** Lightweight toast for "saved" feedback. */
function showToast(msg, ic = "check_circle") {
  document.querySelectorAll(".mm-toast").forEach(t => t.remove());
  const el = document.createElement("div");
  el.className = "mm-toast";
  el.innerHTML = `${icon(ic)}<span>${escapeHtml(msg)}</span>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 250); }, 2400);
}

/* =========================================================
   SETTINGS
   ========================================================= */

const DATE_FORMATS = [
  { v: "MDY", l: "MM / DD / YYYY", ex: "06 / 20 / 2026" },
  { v: "DMY", l: "DD / MM / YYYY", ex: "20 / 06 / 2026" },
  { v: "ISO", l: "YYYY-MM-DD",     ex: "2026-06-20" },
];

function settingsHTML() {
  const auth = getAuth() || {};
  const p    = getPrefs();
  const tx   = storage.get(KEYS.transactions, []).length;
  const bd   = storage.get(KEYS.budgets, []).length;
  const gl   = storage.get(KEYS.goals, []).length;
  const c     = activeCountry();
  const isGuest = !!auth.guest;
  const name    = isGuest ? "Guest" : (auth.name || "User");
  const initial = (name[0] || "U").toUpperCase();
  const signIn  = isGuest ? "Guest session" : (auth.email ? "Email & password" : "Registered account");

  const sw = (key, on) =>
    `<label class="sx-switch"><input type="checkbox" data-pref-toggle="${key}" ${on ? "checked" : ""} aria-label="Toggle ${key}"><span class="track"></span></label>`;

  const dateOpts = DATE_FORMATS.map(d =>
    `<option value="${d.v}" ${p.dateFormat === d.v ? "selected" : ""}>${d.l}  ·  ${d.ex}</option>`).join("");

  const themeBtn = (v, ic, l) =>
    `<button data-theme-set="${v}" class="${p.theme === v ? "active" : ""}" aria-pressed="${p.theme === v}">${icon(ic)} ${l}</button>`;

  return `
    <div class="sx-page">
      <div class="page-head"><div><h1>Settings</h1><p>Manage your profile, preferences and data.</p></div></div>

      <!-- ===== Profile ===== -->
      <section class="sx-section">
        <div class="sx-section-head">
          <h2>${icon("person")} Profile</h2>
          <p>Your personal details and how you appear in PockIt.</p>
        </div>
        <div class="sx-card">
          <div class="sx-profile">
            <div class="sx-avatar">${initial}</div>
            <div class="sx-profile-info">
              <div class="sx-profile-name">${escapeHtml(name)}</div>
              <div class="sx-profile-email">${escapeHtml(auth.email || "No email on this session")}</div>
            </div>
            <span class="sx-pill ${isGuest ? "" : "green"}" style="margin-left:auto">${isGuest ? "Guest" : "Registered"}</span>
          </div>
          <div class="sx-row stacked">
            <div class="sx-row-main"><div class="sx-row-title">Display name</div></div>
            <div class="sx-row-control">
              <input class="sx-input" id="set-name" type="text" value="${escapeHtml(isGuest ? "" : (auth.name || ""))}"
                     placeholder="${isGuest ? "Guest" : "Your name"}" ${isGuest ? "disabled" : ""} maxlength="60" aria-label="Display name">
            </div>
          </div>
          <div class="sx-row stacked">
            <div class="sx-row-main"><div class="sx-row-title">Email address</div></div>
            <div class="sx-row-control">
              <input class="sx-input" type="email" value="${escapeHtml(auth.email || "")}" placeholder="—" disabled aria-label="Email address">
            </div>
          </div>
        </div>
      </section>

      <!-- ===== Preferences ===== -->
      <section class="sx-section">
        <div class="sx-section-head">
          <h2>${icon("tune")} Preferences</h2>
          <p>Control how numbers, dates and the interface are displayed.</p>
        </div>
        <div class="sx-card">
          <div class="sx-row">
            <div class="sx-row-main">
              <div class="sx-row-title">Currency &amp; region</div>
              <div class="sx-row-desc">Drives every amount shown across the app.</div>
            </div>
            <div class="sx-row-control">
              <div class="sx-currency">
                <span class="flag">${c.flag}</span>
                <div><div class="cc-name">${escapeHtml(c.currency)} ${escapeHtml(c.symbol)}</div><div class="cc-sub">${escapeHtml(c.name)} · ${money(1250)}</div></div>
              </div>
              <button class="btn-sm edit" data-action="change-country">${icon("language")} Change</button>
            </div>
          </div>
          <div class="sx-row">
            <div class="sx-row-main">
              <div class="sx-row-title">Date format</div>
              <div class="sx-row-desc">Preferred way to read dates.</div>
            </div>
            <div class="sx-row-control">
              <select class="sx-select" id="set-dateformat" aria-label="Date format">${dateOpts}</select>
            </div>
          </div>
          <div class="sx-row">
            <div class="sx-row-main">
              <div class="sx-row-title">Theme</div>
              <div class="sx-row-desc">Choose your preferred appearance.</div>
            </div>
            <div class="sx-row-control">
              <div class="sx-seg" role="group" aria-label="Theme">
                ${themeBtn("light", "light_mode", "Light")}
                ${themeBtn("system", "computer", "System")}
                ${themeBtn("dark", "dark_mode", "Dark")}
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ===== Notifications ===== -->
      <section class="sx-section">
        <div class="sx-section-head">
          <h2>${icon("notifications")} Notifications</h2>
          <p>Decide what PockIt should let you know about.</p>
        </div>
        <div class="sx-card">
          <div class="sx-row">
            <div class="sx-row-main">
              <div class="sx-row-title">Email notifications</div>
              <div class="sx-row-desc">Receive important account updates by email.</div>
            </div>
            <div class="sx-row-control">${sw("emailNotif", p.emailNotif)}</div>
          </div>
          <div class="sx-row">
            <div class="sx-row-main">
              <div class="sx-row-title">Budget alerts</div>
              <div class="sx-row-desc">Get warned when a category nears its limit.</div>
            </div>
            <div class="sx-row-control">${sw("budgetAlerts", p.budgetAlerts)}</div>
          </div>
          <div class="sx-row">
            <div class="sx-row-main">
              <div class="sx-row-title">Monthly reports</div>
              <div class="sx-row-desc">A summary of your spending at month end.</div>
            </div>
            <div class="sx-row-control">${sw("monthlyReports", p.monthlyReports)}</div>
          </div>
        </div>
      </section>

      <!-- ===== Security ===== -->
      <section class="sx-section">
        <div class="sx-section-head">
          <h2>${icon("shield")} Security</h2>
          <p>Manage how you sign in and protect your account.</p>
        </div>
        <div class="sx-card">
          <div class="sx-row">
            <div class="sx-row-main">
              <div class="sx-row-title">Sign-in method</div>
              <div class="sx-row-desc">How you currently access PockIt.</div>
            </div>
            <div class="sx-row-control"><span class="sx-pill blue">${icon("key")} ${escapeHtml(signIn)}</span></div>
          </div>
          <div class="sx-row">
            <div class="sx-row-main">
              <div class="sx-row-title">Active session</div>
              <div class="sx-row-desc">You're signed in on this browser.</div>
            </div>
            <div class="sx-row-control"><span class="sx-pill green"><span class="dot"></span> This device</span></div>
          </div>
          <div class="sx-row danger">
            <div class="sx-row-main">
              <div class="sx-row-title">Sign out</div>
              <div class="sx-row-desc">End your session on this device.</div>
            </div>
            <div class="sx-row-control"><button class="btn-sm del" data-logout>${icon("logout")} Log out</button></div>
          </div>
        </div>
      </section>

      <!-- ===== Data management ===== -->
      <section class="sx-section">
        <div class="sx-section-head">
          <h2>${icon("database")} Data management</h2>
          <p>Export, back up or reset the data stored on this device.</p>
        </div>
        <div class="sx-card">
          <div class="sx-datastats">
            <div class="sx-datastat"><b class="tnum">${tx}</b><span>Transactions</span></div>
            <div class="sx-datastat"><b class="tnum">${bd}</b><span>Budgets</span></div>
            <div class="sx-datastat"><b class="tnum">${gl}</b><span>Goals</span></div>
          </div>
          <div class="sx-row">
            <div class="sx-row-main">
              <div class="sx-row-title">Export as CSV</div>
              <div class="sx-row-desc">Download your transactions for spreadsheets.</div>
            </div>
            <div class="sx-row-control"><button class="btn-sm edit" data-action="export">${icon("download")} Export CSV</button></div>
          </div>
          <div class="sx-row">
            <div class="sx-row-main">
              <div class="sx-row-title">Back up &amp; restore</div>
              <div class="sx-row-desc">Save a full JSON backup, or restore one.</div>
            </div>
            <div class="sx-row-control">
              <button class="btn-sm" data-action="backup">${icon("save")} Download backup</button>
              <button class="btn-sm" data-action="import-backup">${icon("upload")} Restore</button>
            </div>
          </div>
          <div class="sx-row danger">
            <div class="sx-row-main">
              <div class="sx-row-title">Clear all data</div>
              <div class="sx-row-desc">Permanently delete every transaction, budget and goal.</div>
            </div>
            <div class="sx-row-control"><button class="btn-sm del" data-action="clear-data">${icon("delete_forever")} Clear data</button></div>
          </div>
        </div>
      </section>

      <!-- ===== Sticky save bar ===== -->
      <div class="sx-savebar">
        <div class="sb-hint">${icon("info")} Profile &amp; preference changes are saved when you click Save.</div>
        <div class="sx-savebar-actions">
          <button class="btn-ghost" data-action="settings-reset">Reset</button>
          <button class="btn-primary" data-action="save-settings">${icon("check")} Save changes</button>
        </div>
      </div>
      <input type="file" id="set-import-file" accept="application/json,.json" hidden>
    </div>`;
}

/* =========================================================
   HELP & SUPPORT
   ========================================================= */

const FAQS = [
  { q: "How do I add a transaction?",
    a: "Open <b>Transactions</b> from the sidebar and click <b>Add Transaction</b>. Choose income or expense, enter the amount, category and date, then save. It appears instantly in your dashboard." },
  { q: "How are budgets tracked?",
    a: "Set a monthly limit per category in <b>Budgets</b>. As you log expenses, PockIt matches them to the right category and updates the progress bar automatically." },
  { q: "How do savings goals work?",
    a: "Create a target in <b>Savings Goals</b> with a name, amount and optional date. Use <b>Add Funds</b> to log contributions — the progress ring fills as you get closer." },
  { q: "Where is my data stored?",
    a: "Your data lives privately in your browser via <b>localStorage</b>. If you sign in with an account, it also syncs securely to your PockIt profile so it follows you across devices." },
  { q: "Can I export or back up my data?",
    a: "Yes. Go to <b>Settings → Data management</b>. You can export transactions as CSV for spreadsheets, or download a complete JSON backup you can restore later." },
  { q: "How do I change my currency?",
    a: "Open <b>Settings → Preferences → Currency &amp; region</b> and click <b>Change</b>. Pick your country and every amount across the app reformats instantly." },
];

function helpHTML() {
  const q = (helpSearch || "").trim().toLowerCase();
  const matches = FAQS.filter(f => !q || f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q));

  const faqItems = matches.length
    ? matches.map(f => `
        <details class="faq-item">
          <summary>${escapeHtml(f.q)}<span class="material-symbols-outlined chev">expand_more</span></summary>
          <div class="faq-answer">${f.a}</div>
        </details>`).join("")
    : `<div class="faq-empty">${icon("search_off")}<div>No results for "<b>${escapeHtml(helpSearch)}</b>".</div><div style="margin-top:4px">Try a different keyword or contact support.</div></div>`;

  const start = [
    { n: "1", t: "Set your currency", d: "Pick your country so money formats correctly." },
    { n: "2", t: "Add your first transaction", d: "Log income or an expense to get started." },
    { n: "3", t: "Create a budget", d: "Set monthly limits and track your spending." },
    { n: "4", t: "Set a savings goal", d: "Define a target and watch your progress grow." },
  ].map(s => `
    <button class="start-item" data-nav-help="${s.n === "2" ? "transactions" : s.n === "3" ? "budgets" : s.n === "4" ? "goals" : "settings"}">
      <span class="si-num">${s.n}</span>
      <span class="si-text"><b>${s.t}</b><span>${s.d}</span></span>
      <span class="material-symbols-outlined si-go">arrow_forward</span>
    </button>`).join("");

  return `
    <div class="help-page">
      <div class="help-hero">
        <h1>How can we help?</h1>
        <p>Search our guides or browse the most common questions below.</p>
        <div class="help-search">
          ${icon("search")}
          <input id="helpSearch" type="text" placeholder="Search help articles…" value="${escapeHtml(helpSearch || "")}" aria-label="Search help">
        </div>
      </div>

      <div class="help-h">Quick actions</div>
      <div class="help-actions">
        <a class="help-action" href="mailto:support@pockit.example?subject=PockIt%20Support%20Request">
          <span class="ha-icon">${icon("support_agent")}</span>
          <h3>Contact support</h3><p>Reach our team for account help.</p>
        </a>
        <a class="help-action" href="mailto:support@pockit.example?subject=PockIt%20Bug%20Report">
          <span class="ha-icon amber">${icon("bug_report")}</span>
          <h3>Report a bug</h3><p>Something not working? Let us know.</p>
        </a>
        <a class="help-action" href="mailto:hello@pockit.example?subject=PockIt%20Feature%20Request">
          <span class="ha-icon purple">${icon("lightbulb")}</span>
          <h3>Feature request</h3><p>Suggest an idea to improve PockIt.</p>
        </a>
        <button class="help-action" data-doc="help">
          <span class="ha-icon blue">${icon("menu_book")}</span>
          <h3>Documentation</h3><p>Read the full help center.</p>
        </button>
      </div>

      <div class="help-status">
        <span class="hs-icon">${icon("check_circle")}</span>
        <div class="hs-main"><b>All systems operational</b><p>Support is online and responding to messages.</p></div>
        <div class="hs-metric"><b>&lt; 24h</b><span>Avg. response</span></div>
      </div>

      <div class="help-h">Frequently asked questions</div>
      <div class="help-faq">${faqItems}</div>

      <div class="help-h">Getting started</div>
      <div class="help-start">${start}</div>

      <div class="help-contact">
        <div>
          <h3>Still need a hand?</h3>
          <p>Our support team usually replies within a day.</p>
        </div>
        <a class="hc-btn" href="mailto:support@pockit.example?subject=PockIt%20Support%20Request">${icon("mail")} Email support</a>
      </div>
    </div>`;
}

/* =========================================================
   DATA BACKUP / RESTORE (Settings → Data management)
   ========================================================= */

/** Download a full JSON backup of all locally-stored data. */
function downloadBackup() {
  const data = {
    app: "PockIt", version: 1, exportedAt: new Date().toISOString(),
    transactions: storage.get(KEYS.transactions, []),
    budgets:      storage.get(KEYS.budgets, []),
    goals:        storage.get(KEYS.goals, []),
    country:      storage.get(KEYS.country, null),
    prefs:        getPrefs(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = `pockit-backup-${todayStr()}.json`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("Backup downloaded", "save");
}

/** Restore data from a JSON backup file (replaces current data after confirm). */
function restoreBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const d = JSON.parse(reader.result);
      const tx = Array.isArray(d && d.transactions) ? d.transactions : null;
      const bd = Array.isArray(d && d.budgets)      ? d.budgets      : null;
      const gl = Array.isArray(d && d.goals)        ? d.goals        : null;
      if (!tx && !bd && !gl) throw new Error("No PockIt data found in this file.");
      if (!confirm("Restore this backup? It will replace your current transactions, budgets and goals.")) return;
      if (tx) storage.save(KEYS.transactions, tx);
      if (bd) storage.save(KEYS.budgets, bd);
      if (gl) storage.save(KEYS.goals, gl);
      if (d.country && d.country.code) storage.save(KEYS.country, { code: d.country.code });
      if (d.prefs && typeof d.prefs === "object") storage.save(PREFS_KEY, Object.assign(getPrefs(), d.prefs));
      showToast("Backup restored");
      render();
    } catch (e) {
      alert("Could not restore backup: " + (e.message || "the file is not a valid PockIt backup."));
    }
  };
  reader.readAsText(file);
}

/* =========================================================
   APP-SCREEN FOOTER + CONTENT SWITCHING
   ========================================================= */

function footerHTML() {
  return `
    <footer>
      <div class="container footer-inner">
        <div class="footer-brand">${brandMark(26)} PockIt</div>
        <div class="footer-copy">© 2026 PockIt Personal Finance. All rights reserved.</div>
        <div class="footer-links">
          <a href="#" data-doc="privacy">Privacy Policy</a>
          <a href="#" data-doc="terms">Terms of Service</a>
          <a href="#" data-doc="help">Help Center</a>
          <a href="#" data-doc="contact">Contact Us</a>
        </div>
      </div>
    </footer>`;
}

/** Pick the markup for the current sidebar tab. */
function contentHTML() {
  switch (activeTab) {
    case "dashboard":    return dashboardHTML();
    case "transactions": return transactionsHTML();
    case "calendar":     return calendarHTML();
    case "recurring":    return recurringHTML();
    case "splits":       return splitsHTML();
    case "budgets":      return budgetsHTML();
    case "goals":        return goalsHTML();
    case "analytics":    return analyticsHTML();
    case "reports":      return reportsHTML();
    case "settings":     return settingsHTML();
    case "help":         return helpHTML();
    default:             return "";
  }
}

/* =========================================================
   MODAL DISPATCHER (shared across tx / budget / goal / funds)
   ========================================================= */

function modalHTML() {
  if (modalKind === "budget")    return budgetModalHTML();
  if (modalKind === "goal")      return goalModalHTML();
  if (modalKind === "funds")     return fundsModalHTML();
  if (modalKind === "recurring") return recurringModalHTML();
  if (modalKind === "split")     return splitModalHTML();
  return txModalHTML();
}

/** Sync DOM input values into the in-memory `form` (no re-render). */
function readForm() {
  const g = id => document.getElementById(id);

  if (modalKind === "budget") {
    if (g("f-bcategory")) form.category = g("f-bcategory").value;
    if (g("f-blimit"))    form.limit    = g("f-blimit").value;
    return;
  }
  if (modalKind === "goal") {
    if (g("f-gname"))    form.name   = g("f-gname").value;
    if (g("f-gtarget"))  form.target = g("f-gtarget").value;
    if (g("f-gsaved"))   form.saved  = g("f-gsaved").value;
    if (g("f-gdate"))    form.date   = g("f-gdate").value;
    if (g("f-gicon"))    form.icon   = g("f-gicon").value;
    return;
  }
  if (modalKind === "funds") {
    if (g("f-famount")) form.amount = g("f-famount").value;
    return;
  }
  if (modalKind === "recurring") {
    readRecurringForm();
    return;
  }
  if (modalKind === "split") {
    readSplitForm();
    return;
  }
  // tx (default)
  if (g("f-title"))    form.title       = g("f-title").value;
  if (g("f-amount"))   form.amount      = g("f-amount").value;
  if (g("f-date"))     form.date        = g("f-date").value;
  if (g("f-category")) form.category    = g("f-category").value;
  if (g("f-payment"))  form.payment     = g("f-payment").value;
  if (g("f-desc"))     form.description = g("f-desc").value;
}

/* =========================================================
   RENDER + EVENT WIRING
   ========================================================= */

function render() {
  const root = document.getElementById("root");

  // ===== LANDING =====
  if (appScreen === "landing") {
    root.innerHTML = landingHTML() + (onbOpen ? onboardingHTML() : "");
    wireOnboarding(root);
    root.querySelectorAll("[data-auth]").forEach(b =>
      b.addEventListener("click", () => {
        authTab = b.getAttribute("data-auth");
        appScreen = "auth"; showPassword = false;
        render(); window.scrollTo(0, 0);
      })
    );
    root.querySelectorAll("[data-guest]").forEach(b =>
      b.addEventListener("click", () => login({ guest: true, name: "Guest" }))
    );
    root.querySelectorAll("[data-enter-app]").forEach(b =>
      b.addEventListener("click", () => { appScreen = "app"; render(); window.scrollTo(0, 0); })
    );
    root.querySelectorAll("[data-logout]").forEach(b => b.addEventListener("click", logout));
    wireThemeToggle(root);
    wireDocLinks(root);
    wireRevealOnScroll(root);
    return;
  }

  // ===== AUTH =====
  if (appScreen === "auth") {
    root.innerHTML = authHTML() + (onbOpen ? onboardingHTML() : "");
    wireOnboarding(root);
    root.querySelectorAll("[data-authtab]").forEach(b =>
      b.addEventListener("click", () => { authTab = b.getAttribute("data-authtab"); render(); })
    );
    root.querySelectorAll("[data-pwtoggle]").forEach(b =>
      b.addEventListener("click", () => { showPassword = !showPassword; render(); })
    );
    root.querySelectorAll("[data-back-landing]").forEach(b =>
      b.addEventListener("click", () => { appScreen = "landing"; render(); window.scrollTo(0, 0); })
    );
    root.querySelectorAll("[data-guest]").forEach(b =>
      b.addEventListener("click", () => login({ guest: true, name: "Guest" }))
    );
    root.querySelectorAll("[data-social]").forEach(b =>
      b.addEventListener("click", () => {
        const provider = b.getAttribute("data-social");
        if (provider === "Google") {
          // Redirect browser to the backend OAuth entry point
          window.location.href = `${window.API_BASE_URL}/api/auth/google`;
        } else {
          alert(`${provider} login is not yet set up.`);
        }
      })
    );
    const fm = root.querySelector("#auth-form");
    if (fm) fm.addEventListener("submit", async e => {
      e.preventDefault();
      const email  = (root.querySelector("#a-email") || {}).value || "";
      const pass   = (root.querySelector("#a-pass")  || {}).value || "";
      const nameEl = root.querySelector("#a-name");
      if (!email.trim() || !pass.trim()) { alert("Please enter your email and password."); return; }

      const submitBtn = root.querySelector(".btn-auth");
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Please wait…"; }

      try {
        const isSignup = authTab === "signup";
        const result = await mmApi.authPost(
          isSignup ? "/api/auth/register" : "/api/auth/login",
          isSignup
            ? { name: (nameEl?.value?.trim() || nameFromEmail(email)), email: email.trim(), password: pass }
            : { email: email.trim(), password: pass }
        );
        await apiLogin(result);
      } catch (err) {
        alert(err.message || "Authentication failed. Please try again.");
        if (submitBtn) {
          submitBtn.disabled    = false;
          submitBtn.textContent = authTab === "signup" ? "Create Account" : "Sign In";
        }
      }
    });
    wireThemeToggle(root);
    wireDocLinks(root);
    return;
  }

  // ===== APP (sidebar shell) =====
  root.innerHTML =
    `<div class="app-layout">
      ${sidebarHTML()}
      <div class="app-body">
        ${topbarHTML()}
        <main class="app-content">${contentHTML()}</main>
        ${footerHTML()}
      </div>
    </div>
    <div class="sidebar-overlay ${mobileSidebarOpen ? "show" : ""}"></div>` +
    (modalOpen ? modalHTML() : "") +
    (onbOpen ? onboardingHTML() : "");
  wireOnboarding(root);

  // ---- Sidebar nav ----
  root.querySelectorAll("[data-nav]").forEach(b =>
    b.addEventListener("click", () => {
      activeTab = b.getAttribute("data-nav");
      txPage = 1; mobileSidebarOpen = false;
      render(); window.scrollTo(0, 0);
    })
  );
  root.querySelectorAll("[data-collapse]").forEach(b =>
    b.addEventListener("click", () => { sidebarCollapsed = !sidebarCollapsed; render(); })
  );
  root.querySelectorAll("[data-mobile-toggle]").forEach(b =>
    b.addEventListener("click", () => { mobileSidebarOpen = !mobileSidebarOpen; render(); })
  );
  const ov = root.querySelector(".sidebar-overlay");
  if (ov) ov.addEventListener("click", () => { mobileSidebarOpen = false; render(); });
  root.querySelectorAll("[data-logout]").forEach(b => b.addEventListener("click", logout));
  wireThemeToggle(root);
  wireDocLinks(root);
  wireTopbarSearch(root);

  // ---- Reports / Settings actions ----
  root.querySelectorAll('[data-action="print"]').forEach(b => b.addEventListener("click", () => window.print()));
  root.querySelectorAll('[data-action="clear-data"]').forEach(b =>
    b.addEventListener("click", () => {
      if (!confirm("This will permanently delete ALL your transactions, budgets and goals. Continue?")) return;
      storage.save(KEYS.transactions, []); storage.save(KEYS.budgets, []); storage.save(KEYS.goals, []);
      render();
    })
  );
  root.querySelectorAll('[data-action="change-country"]').forEach(b =>
    b.addEventListener("click", () => openOnboarding(true))
  );

  // ---- Settings: preferences, profile, backup ----
  // Toggles persist immediately (native checkbox keeps state, no re-render).
  root.querySelectorAll("[data-pref-toggle]").forEach(t =>
    t.addEventListener("change", () => setPrefs({ [t.getAttribute("data-pref-toggle")]: t.checked }))
  );
  // Theme segmented control — persist + apply live + update active state in place
  // (no re-render, so an unsaved name edit isn't lost).
  root.querySelectorAll("[data-theme-set]").forEach(b =>
    b.addEventListener("click", () => {
      setPrefs({ theme: b.getAttribute("data-theme-set") });
      applyTheme(true);
      const seg = b.closest(".sx-seg");
      if (seg) seg.querySelectorAll("button").forEach(x => {
        const on = x === b;
        x.classList.toggle("active", on);
        x.setAttribute("aria-pressed", on);
      });
      syncThemeToggleIcons();
    })
  );
  root.querySelectorAll('[data-action="save-settings"]').forEach(b =>
    b.addEventListener("click", () => {
      const nameEl = root.querySelector("#set-name");
      const dfEl   = root.querySelector("#set-dateformat");
      if (dfEl) setPrefs({ dateFormat: dfEl.value });
      const auth = getAuth();
      if (auth && !auth.guest && nameEl) {
        const nm = nameEl.value.trim();
        if (nm && nm !== auth.name) setAuth(Object.assign({}, auth, { name: nm }));
      }
      showToast("Settings saved");
      render();
    })
  );
  root.querySelectorAll('[data-action="settings-reset"]').forEach(b =>
    b.addEventListener("click", () => render())   // re-render discards unsaved edits
  );
  root.querySelectorAll('[data-action="backup"]').forEach(b => b.addEventListener("click", downloadBackup));
  const importBtn  = root.querySelector('[data-action="import-backup"]');
  const importFile = root.querySelector("#set-import-file");
  if (importBtn && importFile) {
    importBtn.addEventListener("click", () => importFile.click());
    importFile.addEventListener("change", e => {
      if (e.target.files && e.target.files[0]) restoreBackup(e.target.files[0]);
      e.target.value = "";   // allow re-importing the same file
    });
  }

  // ---- Help & Support: search + getting-started shortcuts ----
  const helpSearchEl = root.querySelector("#helpSearch");
  if (helpSearchEl) {
    helpSearchEl.addEventListener("input", e => { helpSearch = e.target.value; helpFocusSearch = true; render(); });
  }
  root.querySelectorAll("[data-nav-help]").forEach(b =>
    b.addEventListener("click", () => {
      activeTab = b.getAttribute("data-nav-help"); txPage = 1;
      render(); window.scrollTo(0, 0);
    })
  );

  // ---- Dashboard "View All" links ----
  root.querySelectorAll("[data-tab]").forEach(b =>
    b.addEventListener("click", () => {
      activeTab = b.getAttribute("data-tab"); txPage = 1;
      render(); window.scrollTo(0, 0);
    })
  );

  // ---- Add Transaction ----
  root.querySelectorAll('[data-action="add-tx"]').forEach(b =>
    b.addEventListener("click", () => openModal(null))
  );

  // ---- Budgets: add / edit / delete ----
  root.querySelectorAll('[data-action="add-budget"]').forEach(b => b.addEventListener("click", () => openBudgetModal(null)));
  root.querySelectorAll("[data-bedit]").forEach(b => b.addEventListener("click", () => openBudgetModal(b.getAttribute("data-bedit"))));
  root.querySelectorAll("[data-bdel]").forEach(b => b.addEventListener("click", () => deleteBudget(b.getAttribute("data-bdel"))));

  // ---- Goals: add / edit / delete / add-funds ----
  root.querySelectorAll('[data-action="add-goal"]').forEach(b => b.addEventListener("click", () => openGoalModal(null)));
  root.querySelectorAll("[data-gedit]").forEach(b => b.addEventListener("click", () => openGoalModal(b.getAttribute("data-gedit"))));
  root.querySelectorAll("[data-gdel]").forEach(b => b.addEventListener("click", () => deleteGoal(b.getAttribute("data-gdel"))));
  root.querySelectorAll("[data-gfund]").forEach(b => b.addEventListener("click", () => openFundsModal(b.getAttribute("data-gfund"))));

  // ---- Analytics: period + export ----
  const anSel = root.querySelector("[data-an-period]");
  if (anSel) anSel.addEventListener("change", e => { anPeriod = e.target.value; render(); });
  root.querySelectorAll('[data-action="export"]').forEach(b => b.addEventListener("click", exportCSV));

  // ---- Transactions: filters ----
  const search = root.querySelector("#txSearch");
  if (search) {
    search.addEventListener("input", e => { txSearch = e.target.value; txPage = 1; focusSearch = true; render(); });
  }
  root.querySelectorAll("[data-filter]").forEach(sel =>
    sel.addEventListener("change", e => {
      const f = sel.getAttribute("data-filter");
      if (f === "category") txCategory = e.target.value;
      if (f === "type")     txType     = e.target.value;
      if (f === "date")     txDate     = e.target.value;
      txPage = 1; render();
    })
  );

  // ---- Transactions: expand/collapse ----
  root.querySelectorAll("[data-toggle]").forEach(el =>
    el.addEventListener("click", () => {
      const id = el.getAttribute("data-toggle");
      if (openTxIds.has(id)) openTxIds.delete(id); else openTxIds.add(id);
      render();
    })
  );

  // ---- Transactions: edit / delete ----
  root.querySelectorAll("[data-edit]").forEach(b =>
    b.addEventListener("click", e => { e.stopPropagation(); openModal(b.getAttribute("data-edit")); })
  );
  root.querySelectorAll("[data-del]").forEach(b =>
    b.addEventListener("click", e => { e.stopPropagation(); deleteTx(b.getAttribute("data-del")); })
  );

  // ---- Recurring actions ----
  root.querySelectorAll('[data-action="add-recurring"]').forEach(b =>
    b.addEventListener("click", () => openRecurringModal(null))
  );
  root.querySelectorAll("[data-rec-edit]").forEach(b =>
    b.addEventListener("click", () => openRecurringModal(b.getAttribute("data-rec-edit")))
  );
  root.querySelectorAll("[data-rec-del]").forEach(b =>
    b.addEventListener("click", () => {
      const id = b.getAttribute("data-rec-del");
      if (!confirm("Delete this recurring transaction? Already-created entries are kept.")) return;
      deleteRecurring(id);
      showToast("Recurring transaction deleted");
      render();
    })
  );
  root.querySelectorAll("[data-rec-toggle]").forEach(b =>
    b.addEventListener("click", () => {
      pauseRecurring(b.getAttribute("data-rec-toggle"));
      render();
    })
  );

  // ---- Split actions ----
  root.querySelectorAll('[data-action="add-split"]').forEach(b =>
    b.addEventListener("click", openSplitModal)
  );
  root.querySelectorAll("[data-sp-mark]").forEach(b =>
    b.addEventListener("click", () => {
      const [sid, pid] = b.getAttribute("data-sp-mark").split("|");
      markParticipantPaid(sid, pid);
      showToast("Marked as paid");
      render();
    })
  );
  root.querySelectorAll("[data-sp-unmark]").forEach(b =>
    b.addEventListener("click", () => {
      const [sid, pid] = b.getAttribute("data-sp-unmark").split("|");
      unmarkParticipantPaid(sid, pid);
      render();
    })
  );
  root.querySelectorAll("[data-sp-settle]").forEach(b =>
    b.addEventListener("click", () => {
      settleSplit(b.getAttribute("data-sp-settle"));
      showToast("Split settled");
      render();
    })
  );
  root.querySelectorAll("[data-sp-del]").forEach(b =>
    b.addEventListener("click", () => {
      if (!confirm("Delete this split? This cannot be undone.")) return;
      deleteSplit(b.getAttribute("data-sp-del"));
      showToast("Split deleted");
      render();
    })
  );

  // ---- Calendar actions ----
  root.querySelectorAll("[data-cal-prev]").forEach(b => b.addEventListener("click", calPrevMonth));
  root.querySelectorAll("[data-cal-next]").forEach(b => b.addEventListener("click", calNextMonth));
  root.querySelectorAll("[data-cal-today]").forEach(b => b.addEventListener("click", calGotoToday));
  root.querySelectorAll("[data-cal-cell]").forEach(b =>
    b.addEventListener("click", () => {
      calSelectedDate = b.getAttribute("data-cal-cell");
      render();
    })
  );
  root.querySelectorAll("[data-cal-quickadd]").forEach(b =>
    b.addEventListener("click", () => openTxForDate(b.getAttribute("data-cal-quickadd")))
  );
  root.querySelectorAll("[data-cal-mini]").forEach(b =>
    b.addEventListener("click", () => {
      // Clicking a mini cell jumps to the calendar page with that date selected
      calSelectedDate = b.getAttribute("data-cal-mini");
      const d = isoToDate(calSelectedDate);
      if (d) { calYear = d.getFullYear(); calMonth = d.getMonth(); }
      activeTab = "calendar";
      render(); window.scrollTo(0, 0);
    })
  );

  // ---- Calendar keyboard nav ----
  if (activeTab === "calendar" && !root.__calKeysBound) {
    root.__calKeysBound = true;
    document.addEventListener("keydown", e => {
      if (activeTab !== "calendar" || modalOpen) return;
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "ArrowLeft")  { e.preventDefault(); calPrevMonth(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); calNextMonth(); }
      else if (e.key.toLowerCase() === "t") { e.preventDefault(); calGotoToday(); }
    });
  }
  // Modal-internal interactions (paidBy toggle, splitType, add/remove people)
  if (modalOpen && modalKind === "split") {
    root.querySelectorAll("[data-sp-paidby]").forEach(b =>
      b.addEventListener("click", () => {
        readSplitForm();
        form.paidBy = b.getAttribute("data-sp-paidby");
        if (form.paidBy === "me") form.payerName = "";
        render();
      })
    );
    root.querySelectorAll("[data-sp-stype]").forEach(b =>
      b.addEventListener("click", () => {
        readSplitForm();
        form.splitType = b.getAttribute("data-sp-stype");
        render();
      })
    );
    root.querySelectorAll("[data-sp-premove]").forEach(b =>
      b.addEventListener("click", () => {
        readSplitForm();
        const i = Number(b.getAttribute("data-sp-premove"));
        form.participants.splice(i, 1);
        render();
      })
    );
    const addBtn = root.querySelector("[data-sp-padd]");
    const addInput = root.querySelector("#f-spnew");
    const addParticipant = () => {
      readSplitForm();
      const name = (form._newName || "").trim();
      if (!name) return;
      form.participants.push({ id: _newId(), name, isMe: false, share: 0 });
      form._newName = "";
      // Mark which row to focus after re-render
      window.__spFocusIdx = form.participants.length - 1;
      render();
    };
    if (addBtn) addBtn.addEventListener("click", addParticipant);
    if (addInput) addInput.addEventListener("keydown", e => {
      if (e.key === "Enter") { e.preventDefault(); addParticipant(); }
    });

    // ---- Focus management after render ----
    // Case 1: a person was just added → focus their amount (custom) or refocus name input (equal)
    if (window.__spFocusIdx != null) {
      const idx = window.__spFocusIdx;
      window.__spFocusIdx = null;
      requestAnimationFrame(() => {
        if (form.splitType === "custom") {
          const amtEl = root.querySelector(`[data-sp-pshare="${idx}"]`);
          if (amtEl) { amtEl.focus(); amtEl.select(); }
        } else if (addInput) {
          addInput.focus();
        }
      });
    } else if (addInput && form.participants.length <= 1 && !form.title) {
      // Case 2: fresh modal (only "Me") → autofocus the name input
      requestAnimationFrame(() => addInput.focus());
    }
  }

  // ---- Pagination ----
  root.querySelectorAll("[data-page]").forEach(b =>
    b.addEventListener("click", () => { txPage = Number(b.getAttribute("data-page")); render(); window.scrollTo(0, 0); })
  );

  // ---- Modal events ----
  if (modalOpen) {
    root.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModal));
    const overlay = root.querySelector("[data-overlay]");
    if (overlay) overlay.addEventListener("click", e => { if (e.target === overlay) closeModal(); });

    // Tx modal: type toggle
    root.querySelectorAll("[data-type]").forEach(b =>
      b.addEventListener("click", () => {
        readForm();
        form.type = b.getAttribute("data-type");
        form.category = "";   // reset — category list depends on type
        render();
      })
    );
    // Goal modal: color swatches
    root.querySelectorAll("[data-color]").forEach(b =>
      b.addEventListener("click", () => { readForm(); form.color = b.getAttribute("data-color"); render(); })
    );

    // Keep `form` in sync as the user types (no re-render → no focus loss).
    root.querySelectorAll(".modal input, .modal select, .modal textarea").forEach(node =>
      node.addEventListener("input", () => {
        readForm();
        if (modalKind === "split") liveSplitUI();
      })
    );

    const saver = { tx: saveTx, budget: saveBudget, goal: saveGoal, funds: addFunds, recurring: saveRecurring, split: saveSplit }[modalKind];
    root.querySelectorAll("[data-save]").forEach(b => b.addEventListener("click", saver));
  }

  // ---- Restore tx search focus after re-render ----
  if (focusSearch) {
    const s = root.querySelector("#txSearch");
    if (s) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
    focusSearch = false;
  }

  // ---- Restore help search focus after re-render ----
  if (helpFocusSearch) {
    const h = root.querySelector("#helpSearch");
    if (h) { h.focus(); h.setSelectionRange(h.value.length, h.value.length); }
    helpFocusSearch = false;
  }
}

/* =========================================================
   BOOT
   ========================================================= */

// ── Boot ──────────────────────────────────────────────────────────────────────

// After Google OAuth the backend redirects back here with tokens in the URL:
// e.g.  https://your-frontend.com/?access_token=...&refresh_token=...
const _p    = new URLSearchParams(window.location.search);
const _oaAt = _p.get('access_token');
const _oaRt = _p.get('refresh_token');

// Apply the saved theme (the pre-paint script in index.html already set the
// class; this keeps things consistent across reloads and code paths).
applyTheme();

// When the preference is "System", follow the OS as it changes live.
if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getPrefs().theme === 'system') { applyTheme(true); render(); }
  });
}

if (_oaAt) {
  // Clean the tokens out of the address bar
  window.history.replaceState({}, '', window.location.pathname);
  mmApi.tokenStore.set(_oaAt, _oaRt);

  // Render landing immediately so the user is never staring at a blank page
  // while the profile request is in flight.
  initializeDefaultData();
  appScreen = "landing";
  if (!getCountry()) { onbOpen = true; onbSelected = detectCountry(); }
  render();

  // Then fetch the profile and switch into the app once it lands.
  mmApi.get('/api/user/profile')
    .then(async user => {
      if (user) {
        setAuth({ name: user.name, email: user.email });
        try { await loadFromApi(); } catch (e) { console.error('loadFromApi failed', e); }
        const created = processRecurring();
        login({ name: user.name, email: user.email });
        if (created) setTimeout(() => showToast(`${created} recurring transaction${created === 1 ? "" : "s"} auto-added`), 600);
      } else {
        console.warn('OAuth profile fetch returned no user — token may be invalid.');
        mmApi.tokenStore.clear();
      }
    })
    .catch(err => {
      console.error('OAuth boot failed:', err);
      mmApi.tokenStore.clear();
      alert('Sign-in completed but loading your profile failed. Please try again. (See console for details.)');
    });
} else {
  // Normal boot — render immediately from localStorage cache
  initializeDefaultData();
  appScreen = getAuth() ? "app" : "landing";
  if (!getCountry()) { onbOpen = true; onbSelected = detectCountry(); }

  // Catch up any due recurring transactions before first render
  if (getAuth()) {
    const created = processRecurring();
    if (created) {
      // Defer toast so the dashboard is already on screen
      setTimeout(() => showToast(`${created} recurring transaction${created === 1 ? "" : "s"} auto-added`), 600);
    }
  }
  render();

  // Pre-warm the serverless backend on landing page load so the first auth call
  // is fast instead of paying a cold-start (3–6 s) at the moment the user signs in.
  // Fire-and-forget; failures are silently ignored.
  if (appScreen === "landing" && window.API_BASE_URL) {
    fetch(`${window.API_BASE_URL}/api/health`, { method: 'GET', mode: 'cors', cache: 'no-store' })
      .catch(() => { /* backend asleep or offline — no problem, login will still work */ });
  }

  // If already authenticated, refresh data from server in the background
  if (mmApi.tokenStore.isLoggedIn() && getAuth()) {
    loadFromApi().then(() => render());
  }
}
