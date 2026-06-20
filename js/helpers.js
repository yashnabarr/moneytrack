/**
 * Cross-cutting helpers used by every view module:
 *  - country / locale resolution (getCountry, activeCountry, detectCountry)
 *  - currency formatters (money, moneyShort)
 *  - HTML helpers (icon, escapeHtml)
 *  - date helpers (formatDate, formatMonth, todayStr)
 *  - SVG ring builder (ringHTML)
 */

/* ===== Country / locale ===== */

/** The user's chosen country, or `null` if not set yet. */
function getCountry() {
  const saved = storage.get(KEYS.country, null);
  if (saved) return COUNTRIES.find(c => c.code === saved.code) || COUNTRIES[1];
  return null;
}

/** The country to use for formatting (saved choice, or US fallback). */
function activeCountry() { return getCountry() || COUNTRIES[1]; }

/** Detect the user's likely country from the browser locale. */
function detectCountry() {
  try {
    const lang = (navigator.language || navigator.languages?.[0] || "en-US");
    const parts = lang.split("-");
    const region = (parts[1] || "").toUpperCase();
    const byRegion = region && COUNTRIES.find(c => c.code === region);
    if (byRegion) return byRegion;
    const langMap = { en: "US", hi: "IN", es: "ES", pt: "BR", fr: "FR", de: "DE", ja: "JP", ko: "KR", zh: "CN", ru: "RU", ar: "AE" };
    return COUNTRIES.find(c => c.code === langMap[parts[0]]) || COUNTRIES[1];
  } catch (e) { return COUNTRIES[1]; }
}

/* ===== Currency formatters ===== */

/** Format an amount with 2 decimals in the user's currency. */
function money(n) {
  const c = activeCountry();
  try {
    return new Intl.NumberFormat(c.locale, { style: "currency", currency: c.currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n || 0));
  } catch (e) {
    return c.symbol + Number(n || 0).toLocaleString(c.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}

/** Same as money() but with no decimals — for compact UI. */
function moneyShort(n) {
  const c = activeCountry();
  try {
    return new Intl.NumberFormat(c.locale, { style: "currency", currency: c.currency, maximumFractionDigits: 0 }).format(Number(n || 0));
  } catch (e) {
    return c.symbol + Number(n || 0).toLocaleString(c.locale, { maximumFractionDigits: 0 });
  }
}

/* ===== HTML helpers ===== */

/** Render a Material Symbols icon. */
function icon(name) { return '<span class="material-symbols-outlined">' + name + '</span>'; }

/**
 * PockIt brand mark — a rounded-square badge (emerald→teal gradient) holding a
 * white "value rising out of a pocket" glyph. Self-contained SVG that scales
 * crisply and looks identical in light and dark themes. Used for the sidebar,
 * landing nav, auth screen, footer and favicon.
 */
function brandMark(px = 40) {
  return `<svg class="brand-mark" width="${px}" height="${px}" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="PockIt logo">
  <rect width="40" height="40" rx="11" fill="url(#pockitGrad)"/>
  <path d="M12 24v2a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-2" stroke="#ffffff" stroke-opacity=".65" stroke-width="2.6" stroke-linecap="round" fill="none"/>
  <path d="M20 26V12M14.4 18 20 12l5.6 6" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <defs>
    <linearGradient id="pockitGrad" x1="3" y1="2" x2="37" y2="38" gradientUnits="userSpaceOnUse">
      <stop stop-color="#10b981"/><stop offset="1" stop-color="#44e2cd"/>
    </linearGradient>
  </defs>
</svg>`;
}

/** Look up the icon name for a transaction category. */
function catIcon(cat) { return CAT_ICON[cat] || "category"; }

/** Escape user-supplied strings before inserting into HTML. */
function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, c => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

/* ===== Date helpers ===== */

/** Format an ISO date (YYYY-MM-DD) as "Oct 24, 2026". */
function formatDate(d) {
  if (!d) return "";
  const dt = new Date(d + "T00:00:00");
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Format an ISO date as "Target: Dec 2024" for goal cards. */
function formatMonth(d) {
  if (!d) return "No target date";
  const dt = new Date(d + "T00:00:00");
  if (isNaN(dt)) return "No target date";
  return "Target: " + dt.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/** Today's date as ISO YYYY-MM-DD. */
function todayStr() { return new Date().toISOString().slice(0, 10); }

/* ===== SVG: circular progress ring (used by goal cards) ===== */

function ringHTML(pct, hex) {
  const r = 42, c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(100, pct) / 100);
  return `
    <svg class="ring" viewBox="0 0 100 100">
      <circle class="ring-bg" cx="50" cy="50" r="${r}"></circle>
      <circle class="ring-fg" cx="50" cy="50" r="${r}" stroke="${hex}"
        stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}"></circle>
      <text class="ring-text" x="50" y="50" fill="${hex}">${Math.round(pct)}%</text>
    </svg>`;
}
