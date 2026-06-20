# MoneyMint — Personal Finance Tracker

A polished, offline-first personal-finance web app. Track income & expenses,
set monthly budgets, save toward goals, and explore your spending with
beautiful charts — all without a backend. Data lives in your browser's
`localStorage`.

## Quick start

No build step, no install. Just open `index.html`.

- **Easiest:** double-click `index.html`.
- **Best (avoids some browser security limits):** serve it locally:

  ```bash
  # any of these works from inside the project root
  npx http-server -p 8080
  python -m http.server 8080
  ```

  Then open <http://localhost:8080>.

## Project structure

```
moneymint/
├── index.html                  Clean shell: <link> + <script> only.
├── README.md                   This file.
│
├── css/                        Stylesheets, one concern per file.
│   ├── main.css                Tokens, reset, buttons, cards, forms, modals, chips.
│   ├── landing.css             Hero, features, awards, "users love", 3-step section, multi-col footer.
│   ├── auth.css                Sign in / sign up screen + country onboarding popup.
│   ├── sidebar.css             App shell: sidebar, topbar, layout.
│   ├── dashboard.css           Dashboard + Transactions + Budgets + Goals views.
│   ├── analytics.css           Analytics page (stats, insights, charts, donut).
│   └── responsive.css          All media queries.
│
├── js/                         JavaScript modules (plain script tags, no bundler).
│   ├── storage.js              localStorage wrapper + first-time data setup.
│   ├── state.js                In-memory UI state (mutable globals).
│   ├── helpers.js              Country/locale, money formatters, icon, escapeHtml, dates, ringHTML.
│   ├── docs.js                 "Open Help / Privacy / Terms / Contact in a new tab" helper.
│   ├── auth.js                 Sign in / sign up / guest auth + auth screen markup.
│   ├── currency-selector.js    Country/currency onboarding popup (markup + wiring).
│   ├── sidebar.js              Sidebar + topbar builders.
│   ├── landing.js              Landing page + multi-column footer.
│   ├── dashboard.js            Dashboard view.
│   ├── transactions.js         Transactions view + Add/Edit modal.
│   ├── budgets.js              Budgets view + Add/Edit modal.
│   ├── goals.js                Goals view + Add/Edit + Add-Funds modals.
│   ├── analytics.js            Analytics view + CSV export + SVG charts.
│   └── app.js                  Orchestrator: Reports + Settings + render() + boot.
│
└── data/
    ├── constants.js            Pure data: KEYS, COUNTRIES, CATEGORIES, NAV, etc.
    └── sample-data.json        Optional starter data shape (not auto-loaded).
```

### What lives where

- **HTML.** `index.html` contains only the shell. Every page (landing, auth,
  dashboard, etc.) is rendered into `<div id="root"></div>` by JavaScript —
  this is a single-page app.
- **CSS.** Variables live in `css/main.css` (load it first). Every other
  stylesheet uses those tokens; no inline styles for theming.
- **JS.** All view markup is generated from JavaScript modules using template
  literals — easier to reason about than scattered HTML fragments. Each
  feature module owns its view + its modal + its persistence.

### Script load order

Scripts run top-to-bottom (no modules, no bundler), so order matters:

```
data/constants.js  ← pure data
js/storage.js      ← persistence
js/state.js        ← shared mutable state
js/helpers.js      ← formatters (uses storage + constants)
js/docs.js         ← "open in new tab" pages
js/auth.js
js/currency-selector.js
js/sidebar.js
js/landing.js
js/dashboard.js
js/transactions.js
js/budgets.js
js/goals.js
js/analytics.js
js/app.js          ← renders + boots — must load last
```

## Architecture in one paragraph

The app is a single-page app rendered as one big string from `render()` in
`js/app.js`. State (current screen, active tab, open modals, form values,
filters) lives as plain `let`s in `js/state.js`. After every state change,
`render()` rebuilds the HTML and re-attaches event listeners. Persisted data
(transactions, budgets, goals, auth, country) lives in `localStorage`,
accessed exclusively through `js/storage.js`. Money is always formatted
through `money()` / `moneyShort()` in `js/helpers.js`, which honour the
country chosen in the onboarding popup.

## Adding a new feature

When you add a feature, **put each piece in the right file** — do not stuff
new code back into `index.html`:

- **A new view (page).** Create `js/<feature>.js` that exports a
  `<feature>HTML()` builder. Add a `case` in `contentHTML()` (`js/app.js`)
  and a row in `NAV` (`data/constants.js`).
- **A new modal.** Add a `<feature>ModalHTML()` builder + open/save/close
  functions in the feature module. Add a branch in `modalHTML()` and
  `readForm()` in `js/app.js`, plus a saver in the `saver` lookup.
- **New styles.** Add a class to the most relevant existing CSS file. Use
  the existing tokens (`var(--primary)` etc.) rather than hard-coded colors.
- **New persisted data.** Add a key to `KEYS` in `data/constants.js` and
  initialize it inside `initializeDefaultData()` in `js/storage.js`.

## Where data is stored

Everything lives in your browser's `localStorage` under these keys:

| Key               | Contents                                       |
| ----------------- | ---------------------------------------------- |
| `mt_transactions` | Array of transactions                          |
| `mt_budgets`      | Array of category budgets                      |
| `mt_goals`        | Array of savings goals                         |
| `mt_auth`         | `{ name, email, guest? }` for the signed-in user |
| `mt_country`      | `{ code }` of the chosen country               |

To wipe everything, open **Settings → Clear all data**, or run
`localStorage.clear()` in DevTools.

## Browser support

Modern Chromium, Firefox, Safari, and Edge. Uses `Intl.NumberFormat`,
`URL.createObjectURL`, CSS variables, and `backdrop-filter` (with `-webkit-`
fallback).
# moneytrack
