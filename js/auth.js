/**
 * Authentication: storage, helpers, screens, login/logout.
 * Talks to the PockIt backend (email/password + Google OAuth) via js/api.js.
 * Guest mode is offline-only — auth is stored as { name, email, guest? } in
 * localStorage[KEYS.auth].
 */

/* ===== Auth state in storage ===== */
function getAuth() { return storage.get(KEYS.auth, null); }
function setAuth(a) { storage.save(KEYS.auth, a); }

/** Build a friendly display name from an email address. */
function nameFromEmail(email) {
  const base = (email || "").split("@")[0].replace(/[._-]+/g, " ").trim();
  return base ? base.replace(/\b\w/g, c => c.toUpperCase()) : "User";
}

/** Sign in: save auth, jump to the app shell, reset transient UI. */
function login(auth) {
  setAuth(auth);
  appScreen = "app";
  activeTab = "dashboard";
  mobileSidebarOpen = false;
  render();
  window.scrollTo(0, 0);
}

/**
 * Called after a successful API login/register response.
 * Stores tokens, hydrates localStorage from the server, then enters the app.
 */
async function apiLogin(serverResponse) {
  mmApi.tokenStore.set(serverResponse.accessToken, serverResponse.refreshToken);
  setAuth({ name: serverResponse.user.name, email: serverResponse.user.email });
  await loadFromApi();
  login({ name: serverResponse.user.name, email: serverResponse.user.email });
}

/** Sign out: revoke refresh token on server, clear tokens, return to landing. */
function logout() {
  const rt = mmApi.tokenStore.getRefresh();
  if (rt) mmApi.authPost('/api/auth/logout', { refreshToken: rt }).catch(() => {});
  mmApi.tokenStore.clear();
  storage.remove(KEYS.auth);
  appScreen = "landing";
  render();
  window.scrollTo(0, 0);
}

/* ===== Auth screen markup ===== */

function authHTML() {
  const isSignup = authTab === "signup";
  return `
    <div class="auth-screen">
      <div class="auth-card">
        <div class="auth-top">
          <button class="auth-back" data-back-landing>${icon("arrow_back")} Back to home</button>
          <button class="icon-btn-lg" data-theme-toggle title="Toggle theme" aria-label="Toggle light/dark theme">${icon(isDarkActive() ? "light_mode" : "dark_mode")}</button>
        </div>
        <div class="auth-logo">${brandMark(60)}</div>
        <h1>PockIt</h1>
        <p class="auth-sub">Secure access to your wealth.</p>
        <div class="auth-toggle">
          <button class="${!isSignup ? "active" : ""}" data-authtab="signin">Sign In</button>
          <button class="${isSignup ? "active" : ""}" data-authtab="signup">Sign Up</button>
        </div>
        <form id="auth-form">
          ${isSignup ? `<div class="auth-field"><input id="a-name" type="text" placeholder="Full Name" /></div>` : ""}
          <div class="auth-field"><input id="a-email" type="email" placeholder="Email Address" /></div>
          <div class="auth-field pw-wrap">
            <input id="a-pass" type="password" placeholder="Password" autocomplete="${isSignup ? "new-password" : "current-password"}" />
            <button type="button" class="pw-toggle" data-pwtoggle aria-label="Show password">${icon("visibility")}</button>
          </div>
          ${isSignup ? `
          <div class="auth-hint">${icon("info")} Use at least 8 characters.</div>
          ` : `<div style="height:8px"></div>`}
          <button type="submit" class="btn-auth">${isSignup ? "Create Account" : "Sign In"}</button>
        </form>
        <button class="auth-guest" data-guest>Continue as Guest</button>
        <div class="auth-divider">OR CONTINUE WITH</div>
        <button class="btn-social" data-social="Google">${icon("g_translate")} Continue with Google</button>
        <button class="btn-social github" disabled title="Coming soon">${icon("code")} GitHub <span class="auth-soon">soon</span></button>
      </div>
    </div>`;
}
