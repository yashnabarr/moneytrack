/**
 * Mutable in-memory UI state.
 * Persisted state (transactions, budgets, etc.) lives in localStorage; this
 * file holds only ephemeral view state that other modules read and mutate.
 */

/* ----- App shell ----- */
let appScreen        = "landing";   // "landing" | "auth" | "app"
let activeTab        = "dashboard"; // current sidebar tab
let sidebarCollapsed = false;       // desktop sidebar rail
let mobileSidebarOpen = false;      // mobile slide-in drawer

/* ----- Auth screen ----- */
let authTab      = "signin";        // "signin" | "signup"
let showPassword = false;

/* ----- Country / currency onboarding popup ----- */
let onbOpen        = false;         // popup visible
let onbSelected    = null;          // currently highlighted country
let onbSearch      = "";            // search query
let onbFocusSearch = false;         // restore focus after re-render

/* ----- Transactions ----- */
let txSearch    = "";
let txCategory  = "all";
let txType      = "all";
let txDate      = "all";
let txPage      = 1;
let openTxIds   = new Set();        // expanded transaction rows
let focusSearch = false;            // restore search-input focus after re-render

/* ----- Analytics ----- */
let anPeriod = "month";             // "month" | "3m" | "year" | "all"

/* ----- Modal (shared across tx / budget / goal / funds) ----- */
let modalOpen = false;
let modalKind = "tx";               // "tx" | "budget" | "goal" | "funds"
let editingId = null;
let formError = "";
let form      = null;
