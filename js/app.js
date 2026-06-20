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
   SETTINGS
   ========================================================= */

function settingsHTML() {
  const auth = getAuth() || {};
  const tx = storage.get(KEYS.transactions, []).length;
  const bd = storage.get(KEYS.budgets, []).length;
  const gl = storage.get(KEYS.goals, []).length;
  const c  = activeCountry();

  return `
    <div class="page-head"><div><h1>Settings</h1><p>Manage your profile and data.</p></div></div>
    <div class="card" style="margin-bottom:24px">
      <div class="card-head"><h3>Profile</h3></div>
      <div class="tx-detail-row">${icon("person")} <span><b>Name:</b> ${escapeHtml(auth.guest ? "Guest" : (auth.name || "User"))}</span></div>
      <div class="tx-detail-row">${icon("mail")} <span><b>Email:</b> ${escapeHtml(auth.email || "—")}</span></div>
      <div class="tx-detail-row">${icon("badge")} <span><b>Account type:</b> ${auth.guest ? "Guest session" : "Registered"}</span></div>
    </div>
    <div class="card" style="margin-bottom:24px">
      <div class="card-head"><h3>Country &amp; Currency</h3></div>
      <div class="tx-detail-row" style="font-size:16px">
        <span style="font-size:24px">${c.flag}</span>
        <span><b>${escapeHtml(c.name)}</b> — ${escapeHtml(c.currency)} (${escapeHtml(c.symbol)})</span>
      </div>
      <div class="tx-detail-row" style="color:var(--primary);font-weight:600">${icon("preview")} <span>${money(1250)}</span></div>
      <div class="tx-actions">
        <button class="btn-sm edit" data-action="change-country">${icon("language")} Change country</button>
      </div>
    </div>
    <div class="card" style="margin-bottom:24px">
      <div class="card-head"><h3>Your Data</h3></div>
      <div class="tx-detail-row">${icon("swap_horiz")} <span><b>${tx}</b> transactions · <b>${bd}</b> budgets · <b>${gl}</b> goals</span></div>
      <div class="tx-actions">
        <button class="btn-sm edit" data-action="export">${icon("download")} Export CSV</button>
        <button class="btn-sm del" data-action="clear-data">${icon("delete_forever")} Clear all data</button>
      </div>
    </div>
    <div class="card">
      <div class="card-head"><h3>Help</h3></div>
      <p style="color:var(--on-surface-variant);margin-bottom:12px">Browse guides and FAQs in a new tab.</p>
      <button class="btn-sm" data-doc="help">${icon("help")} Open Help Center</button>
    </div>`;
}

/* =========================================================
   APP-SCREEN FOOTER + CONTENT SWITCHING
   ========================================================= */

function footerHTML() {
  return `
    <footer>
      <div class="container footer-inner">
        <div class="footer-brand">MoneyMint</div>
        <div class="footer-copy">© 2026 MoneyMint Personal Finance. All rights reserved.</div>
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
    case "budgets":      return budgetsHTML();
    case "goals":        return goalsHTML();
    case "analytics":    return analyticsHTML();
    case "reports":      return reportsHTML();
    case "settings":     return settingsHTML();
    default:             return "";
  }
}

/* =========================================================
   MODAL DISPATCHER (shared across tx / budget / goal / funds)
   ========================================================= */

function modalHTML() {
  if (modalKind === "budget") return budgetModalHTML();
  if (modalKind === "goal")   return goalModalHTML();
  if (modalKind === "funds")  return fundsModalHTML();
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
    wireDocLinks(root);
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
  wireDocLinks(root);

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
      node.addEventListener("input", () => readForm())
    );

    const saver = { tx: saveTx, budget: saveBudget, goal: saveGoal, funds: addFunds }[modalKind];
    root.querySelectorAll("[data-save]").forEach(b => b.addEventListener("click", saver));
  }

  // ---- Restore tx search focus after re-render ----
  if (focusSearch) {
    const s = root.querySelector("#txSearch");
    if (s) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
    focusSearch = false;
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

if (_oaAt) {
  // Clean the tokens out of the address bar
  window.history.replaceState({}, '', window.location.pathname);
  mmApi.tokenStore.set(_oaAt, _oaRt);
  // Fetch the user's profile then hydrate localStorage and enter the app
  mmApi.get('/api/user/profile').then(async user => {
    if (user) {
      setAuth({ name: user.name, email: user.email });
      await loadFromApi();
      login({ name: user.name, email: user.email });
    } else {
      mmApi.tokenStore.clear();
      appScreen = "landing";
      render();
    }
  });
} else {
  // Normal boot — render immediately from localStorage cache
  initializeDefaultData();
  appScreen = getAuth() ? "app" : "landing";
  if (!getCountry()) { onbOpen = true; onbSelected = detectCountry(); }
  render();

  // If already authenticated, refresh data from server in the background
  if (mmApi.tokenStore.isLoggedIn() && getAuth()) {
    loadFromApi().then(() => render());
  }
}
