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

/** Build the filtered country rows for the list (used by both initial render and live filtering). */
function onbListHTML(sel, q) {
  const filtered = COUNTRIES.filter(c =>
    !q || c.name.toLowerCase().includes(q) || c.currency.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
  ).sort((a, b) => a.name.localeCompare(b.name));
  return filtered.map(c => `
    <div class="onb-row ${sel && sel.code === c.code ? "selected" : ""}" data-pickc="${c.code}">
      <span class="flag">${flagImg(c.code, 24)}</span>
      <span class="row-name">${c.name}</span>
      <span class="row-curr">${c.symbol} ${c.currency}</span>
    </div>`).join("") || `<div class="empty" style="margin:12px">No countries match "${escapeHtml(q)}"</div>`;
}

/** Build the preview card (selected country + sample amount). */
function onbPreviewHTML(sel) {
  let previewAmount;
  try { previewAmount = new Intl.NumberFormat(sel.locale, { style: "currency", currency: sel.currency }).format(1250); }
  catch (e) { previewAmount = sel.symbol + "1,250.00"; }
  return `
    <span class="flag">${flagImg(sel.code, 32)}</span>
    <div class="pv-info">
      <div class="pv-country">${escapeHtml(sel.name)}</div>
      <div class="pv-currency">${escapeHtml(sel.currency)} · ${escapeHtml(sel.symbol)}</div>
    </div>
    <div class="pv-amount">${previewAmount}</div>`;
}

/** Markup for the onboarding popup. */
function onboardingHTML() {
  const detected = detectCountry();
  const sel = onbSelected || detected;
  const q = onbSearch.trim().toLowerCase();

  const popular = POPULAR_CODES.map(code => COUNTRIES.find(c => c.code === code)).filter(Boolean);
  const popularGrid = popular.map(c => `
    <button class="pop-chip ${sel && sel.code === c.code ? "selected" : ""}" data-pickc="${c.code}">
      <span class="flag">${flagImg(c.code, 28)}</span>
      <span class="pop-name">${c.name.split(" ")[0]}</span>
      <span class="pop-curr">${c.symbol} ${c.currency}</span>
    </button>`).join("");

  const list = onbListHTML(sel, q);

  const isDetected = sel.code === detected.code;
  const detectedRow = isDetected ? "" : `
    <div class="onb-detected">
      <span class="flag">${flagImg(detected.code, 24)}</span>
      <div class="det-info"><b>We detected ${detected.name}</b><span>${detected.symbol} ${detected.currency}</span></div>
      <button data-use-detected>Use this</button>
    </div>`;

  return `
    <div class="onb-overlay" data-onb-overlay>
      <div class="onb-card">
        <div class="onb-head">
          <div class="onb-icon">${icon("language")}</div>
          <h2>Welcome to PockIt</h2>
          <p>Pick your country so we can format your money correctly.</p>
        </div>
        <div class="onb-body">
          ${detectedRow}
          <div class="onb-section-label">Popular</div>
          <div class="popular-grid">${popularGrid}</div>
          <div class="onb-section-label">All countries</div>
          <div class="onb-search">${icon("search")}<input id="onb-q" type="text" placeholder="Search country or currency..." value="${escapeHtml(onbSearch)}" autocomplete="off" /></div>
          <div class="onb-list" id="onb-list">${list}</div>
          <div class="preview-card" id="onb-preview">${onbPreviewHTML(sel)}</div>
        </div>
        <div class="onb-foot">
          <button class="onb-skip" data-onb-skip>Skip</button>
          <button class="btn-primary" data-onb-confirm><span id="onb-confirm-label">${icon("check")} Continue with ${escapeHtml(sel.name)}</span></button>
        </div>
      </div>
    </div>`;
}

/** Update only the selected-row highlight + preview card + confirm label, without re-rendering. */
function repaintOnbSelection(root) {
  const sel = onbSelected || detectCountry();
  // Update highlight on chips and rows
  root.querySelectorAll("[data-pickc]").forEach(el => {
    const code = el.getAttribute("data-pickc");
    if (code === sel.code) el.classList.add("selected");
    else                   el.classList.remove("selected");
  });
  // Update preview card
  const pv = root.querySelector("#onb-preview");
  if (pv) pv.innerHTML = onbPreviewHTML(sel);
  // Update confirm-button label
  const lbl = root.querySelector("#onb-confirm-label");
  if (lbl) lbl.innerHTML = `${icon("check")} Continue with ${escapeHtml(sel.name)}`;
}

/** Bind row/chip clicks (idempotent — uses event delegation). */
function wireOnbPicks(root) {
  // Use event delegation on the popup root so we don't have to rebind after list re-renders
  if (root.__onbPickBound) return;
  root.__onbPickBound = true;
  root.addEventListener("click", e => {
    const t = e.target.closest("[data-pickc]");
    if (!t || !root.contains(t)) return;
    const c = COUNTRIES.find(x => x.code === t.getAttribute("data-pickc"));
    if (!c) return;
    onbSelected = c;
    repaintOnbSelection(root);
  });
}

/** Bind interactions inside the popup. Safe to call when the popup isn't open. */
function wireOnboarding(root) {
  if (!onbOpen) return;
  const popup = root.querySelector(".onb-overlay") || root;

  wireOnbPicks(popup);

  // Live search — re-renders only the list, never the whole app
  const s = root.querySelector("#onb-q");
  const listEl = root.querySelector("#onb-list");
  if (s && listEl) {
    s.addEventListener("input", e => {
      onbSearch = e.target.value;
      const sel = onbSelected || detectCountry();
      listEl.innerHTML = onbListHTML(sel, onbSearch.trim().toLowerCase());
    });
    s.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        const q = onbSearch.trim().toLowerCase();
        const first = COUNTRIES.find(c => c.name.toLowerCase().includes(q) || c.currency.toLowerCase().includes(q));
        if (first) { onbSelected = first; repaintOnbSelection(popup); }
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
