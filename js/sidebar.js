/**
 * App shell chrome: left sidebar + top bar.
 * Reads `NAV` and `TAB_TITLES` from data/constants.js and renders the
 * markup. Behaviour (click handlers) is wired by js/app.js render().
 */

function sidebarHTML() {
  const auth = getAuth() || {};
  const uname = auth.guest ? "Guest" : (auth.name || "User");
  const role = auth.guest ? "Guest session" : (auth.email || "Signed in");
  const initial = (uname[0] || "U").toUpperCase();

  const items = NAV.map(n => `
    <button class="sb-item ${activeTab === n.id && !n.external ? "active" : ""}"
            ${n.external ? `data-doc="help"` : `data-nav="${n.id}"`}>
      ${icon(n.icon)}<span class="sb-label">${n.label}</span>
    </button>`).join("");

  return `
    <aside class="sidebar ${sidebarCollapsed ? "collapsed" : ""} ${mobileSidebarOpen ? "mobile-open" : ""}">
      <div class="sb-brand"><span class="sb-logo">${brandMark(40)}</span><span class="sb-label">PockIt</span></div>
      <nav class="sb-nav">${items}</nav>
      <div class="sb-foot">
        <div class="sb-user">
          <div class="sb-avatar">${initial}</div>
          <div class="sb-uinfo">
            <div class="sb-username">${escapeHtml(uname)}</div>
            <div class="sb-role">${escapeHtml(role)}</div>
          </div>
        </div>
        <button class="sb-logout" data-logout>${icon("logout")}<span class="sb-logout-text">Log out</span></button>
      </div>
    </aside>`;
}

function topbarHTML() {
  return `
    <header class="app-topbar">
      <div class="topbar-left">
        <button class="icon-btn-lg hamburger" data-mobile-toggle title="Menu">${icon("menu")}</button>
        <button class="icon-btn-lg collapse-btn" data-collapse title="Collapse menu">${icon("menu_open")}</button>
        <span class="topbar-title">${TAB_TITLES[activeTab] || ""}</span>
      </div>
      <div class="nav-right">
        <div class="search-wrap" id="topbarSearch">
          <div class="search">
            ${icon("search")}
            <input type="text" id="topbarSearchInput" placeholder="Search sections… (try 'budgets')" autocomplete="off" aria-label="Search" aria-haspopup="listbox" aria-expanded="false" aria-controls="topbarSearchDropdown" />
            <button type="button" class="search-clear" id="topbarSearchClear" title="Clear" aria-label="Clear search" hidden>${icon("close")}</button>
          </div>
          <div class="search-dropdown" id="topbarSearchDropdown" role="listbox" hidden></div>
        </div>
        <button class="icon-btn-lg" data-theme-toggle title="Toggle theme" aria-label="Toggle light/dark theme">${icon(isDarkActive() ? "light_mode" : "dark_mode")}</button>
        <button class="icon-btn-lg" data-doc="help" title="Help">${icon("help")}</button>
      </div>
    </header>`;
}
