/**
 * Country / currency onboarding popup.
 * Shown on first visit (and from Settings → Change country) to choose
 * the locale that drives every money() / moneyShort() formatter in the app.
 */

/** Open the popup (force=true keeps the current screen). */
function openOnboarding(force) {
  onbOpen = true;
  onbSelected = onbSelected || detectCountry();
  onbSearch = "";
  if (force) appScreen = appScreen;
  render();
}

/** Persist the chosen country and close the popup. */
function saveCountry(c) {
  storage.save(KEYS.country, { code: c.code });
  onbOpen = false;
  onbSelected = null;
  render();
}

/** Markup for the onboarding popup. */
function onboardingHTML() {
  const detected = detectCountry();
  const sel = onbSelected || detected;
  const q = onbSearch.trim().toLowerCase();
  const filtered = COUNTRIES.filter(c =>
    !q || c.name.toLowerCase().includes(q) || c.currency.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
  ).sort((a, b) => a.name.localeCompare(b.name));

  const popular = POPULAR_CODES.map(code => COUNTRIES.find(c => c.code === code)).filter(Boolean);
  const popularGrid = popular.map(c => `
    <button class="pop-chip ${sel && sel.code === c.code ? "selected" : ""}" data-pickc="${c.code}">
      <span class="flag">${c.flag}</span>
      <span class="pop-name">${c.name.split(" ")[0]}</span>
      <span class="pop-curr">${c.symbol} ${c.currency}</span>
    </button>`).join("");

  const list = filtered.map(c => `
    <div class="onb-row ${sel && sel.code === c.code ? "selected" : ""}" data-pickc="${c.code}">
      <span class="flag">${c.flag}</span>
      <span class="row-name">${c.name}</span>
      <span class="row-curr">${c.symbol} ${c.currency}</span>
    </div>`).join("") || `<div class="empty" style="margin:12px">No countries match "${escapeHtml(onbSearch)}"</div>`;

  const previewAmount = (() => {
    try { return new Intl.NumberFormat(sel.locale, { style: "currency", currency: sel.currency }).format(1250); }
    catch (e) { return sel.symbol + "1,250.00"; }
  })();

  const isDetected = sel.code === detected.code;
  const detectedRow = isDetected ? "" : `
    <div class="onb-detected">
      <span class="flag">${detected.flag}</span>
      <div class="det-info"><b>We detected ${detected.name}</b><span>${detected.symbol} ${detected.currency}</span></div>
      <button data-use-detected>Use this</button>
    </div>`;

  return `
    <div class="onb-overlay" data-onb-overlay>
      <div class="onb-card">
        <div class="onb-head">
          <div class="onb-icon">${icon("language")}</div>
          <h2>Welcome to MoneyMint</h2>
          <p>Pick your country so we can format your money correctly.</p>
        </div>
        <div class="onb-body">
          ${detectedRow}
          <div class="onb-section-label">Popular</div>
          <div class="popular-grid">${popularGrid}</div>
          <div class="onb-section-label">All countries</div>
          <div class="onb-search">${icon("search")}<input id="onb-q" type="text" placeholder="Search country or currency..." value="${escapeHtml(onbSearch)}" autocomplete="off" /></div>
          <div class="onb-list">${list}</div>
          <div class="preview-card">
            <span class="flag">${sel.flag}</span>
            <div class="pv-info">
              <div class="pv-country">${escapeHtml(sel.name)}</div>
              <div class="pv-currency">${escapeHtml(sel.currency)} · ${escapeHtml(sel.symbol)}</div>
            </div>
            <div class="pv-amount">${previewAmount}</div>
          </div>
        </div>
        <div class="onb-foot">
          <button class="onb-skip" data-onb-skip>Skip</button>
          <button class="btn-primary" data-onb-confirm>${icon("check")} Continue with ${escapeHtml(sel.name)}</button>
        </div>
      </div>
    </div>`;
}

/** Bind interactions inside the popup. Safe to call when the popup isn't open. */
function wireOnboarding(root) {
  if (!onbOpen) return;

  // Country chip / list row click
  root.querySelectorAll("[data-pickc]").forEach(b =>
    b.addEventListener("click", () => {
      onbSelected = COUNTRIES.find(c => c.code === b.getAttribute("data-pickc"));
      render();
    })
  );

  // Live search + Enter to pick first match
  const s = root.querySelector("#onb-q");
  if (s) {
    s.addEventListener("input", e => { onbSearch = e.target.value; onbFocusSearch = true; render(); });
    s.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        const q = onbSearch.trim().toLowerCase();
        const first = COUNTRIES.find(c => c.name.toLowerCase().includes(q) || c.currency.toLowerCase().includes(q));
        if (first) { onbSelected = first; render(); }
      }
    });
  }

  root.querySelectorAll("[data-use-detected]").forEach(b =>
    b.addEventListener("click", () => saveCountry(detectCountry()))
  );
  root.querySelectorAll("[data-onb-confirm]").forEach(b =>
    b.addEventListener("click", () => saveCountry(onbSelected || detectCountry()))
  );
  root.querySelectorAll("[data-onb-skip]").forEach(b =>
    b.addEventListener("click", () => saveCountry(detectCountry()))
  );

  // Restore search-input focus after re-render
  if (onbFocusSearch && s) {
    s.focus();
    s.setSelectionRange(s.value.length, s.value.length);
    onbFocusSearch = false;
  }
}
