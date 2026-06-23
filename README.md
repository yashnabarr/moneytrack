# PockIt — Personal Finance Tracker

> **Live demo →** [moneytrack-23qk.vercel.app](https://moneytrack-23qk.vercel.app/)

A polished, offline-first personal-finance web app. Track income & expenses, set monthly budgets, save toward goals, and explore your spending with beautiful charts — all with a sleek light/dark theme and zero install.

The **frontend** is a zero-build, vanilla HTML/CSS/JS single-page app that runs entirely from `localStorage` — open it and it works, no server required. An **optional Node/Express + Prisma backend** (in [`backend/`](backend/)) adds user accounts (email/password + Google OAuth) and cross-device sync. When you're signed in, your data syncs to the backend automatically; as a guest or offline, everything stays local in your browser.

---

## Features

- **Dashboard** — income, expenses, balance at a glance with sparkline stat cards
- **Transactions** — add, edit, filter, search and paginate all your entries
- **Budgets** — per-category monthly limits with progress bars and overspend alerts
- **Goals** — savings targets with circular ring progress and add-funds flow
- **Analytics** — spending by category (donut chart), trends, insights and CSV export
- **Settings** — date format, notifications, backup/restore, clear data
- **Help & Support** — searchable FAQ, contact, live system status
- **Dark theme** — "Obsidian Emerald" palette, persisted in `localStorage`, no flash on load
- **Offline-first** — works fully as a guest with no backend

---

## Quick start (frontend only)

No build step, no install. Just open `index.html`.

- **Easiest:** double-click `index.html`.
- **Best (avoids some browser security limits):** serve it locally:

  ```bash
  npx http-server -p 8080
  # or
  python -m http.server 8080
  ```

  Then open <http://localhost:8080>.

Used this way (no backend running), the app stores everything in `localStorage`.
Sign-up/sign-in and Google login require the backend below; **Continue as Guest** works fully offline.

---

## Deployment

| Layer | Service | URL |
|-------|---------|-----|
| Frontend | Vercel (static) | [moneytrack-23qk.vercel.app](https://moneytrack-23qk.vercel.app/) |
| Backend API | Vercel (serverless) | `moneytrack-phi.vercel.app` |
| Database | Neon (PostgreSQL) | Neon free tier |

To redeploy after changes:
```bash
git add .
git commit -m "your message"
git push   # Vercel auto-redeploys both frontend and backend
```

---

## Project structure

```
pockit/
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
│   ├── settings.css            Settings + Help pages and the light/dark theme tokens' consumers.
│   └── responsive.css          All media queries.
│
├── js/                         JavaScript modules (plain script tags, no bundler).
│   ├── api.js                  REST client + JWT token store (talks to the backend).
│   ├── storage.js              localStorage wrapper + background sync to the backend.
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
├── data/
│   ├── constants.js            Pure data: KEYS, COUNTRIES, CATEGORIES, NAV, etc.
│   └── sample-data.json        Optional starter data shape (not auto-loaded).
│
└── backend/                    Optional Node/Express + Prisma API (deployable to Vercel).
    ├── api/index.js            Entry point (local server + Vercel handler).
    ├── prisma/schema.prisma    Database schema (users, transactions, budgets, goals).
    ├── .env.example            Required environment variables.
    └── src/
        ├── app.js              Express app: CORS, routes, error handling.
        ├── config/             Prisma client + Passport (Google OAuth) setup.
        ├── controllers/        auth, transactions, budgets, goals, user.
        ├── middleware/         JWT auth, rate limiting, request validation.
        ├── routes/             REST endpoints under /api/*.
        └── utils/tokens.js     Access/refresh JWT helpers.
```

---

## Architecture in one paragraph

The app is a single-page app rendered as one big string from `render()` in `js/app.js`. State (current screen, active tab, open modals, form values, filters) lives as plain `let`s in `js/state.js`. After every state change, `render()` rebuilds the HTML and re-attaches event listeners. Persisted data (transactions, budgets, goals, auth, country) lives in `localStorage`, accessed exclusively through `js/storage.js`. When the user is signed in, `js/storage.js` also fires background create/update/delete calls to the backend (via `js/api.js`) so the browser cache and the server stay in sync — the UI is never blocked on the network. Money is always formatted through `money()` / `moneyShort()` in `js/helpers.js`, which honour the country chosen in the onboarding popup.

---

## Adding a new feature

When you add a feature, **put each piece in the right file** — do not stuff new code back into `index.html`:

- **A new view (page).** Create `js/<feature>.js` that exports a `<feature>HTML()` builder. Add a `case` in `contentHTML()` (`js/app.js`) and a row in `NAV` (`data/constants.js`).
- **A new modal.** Add a `<feature>ModalHTML()` builder + open/save/close functions in the feature module. Add a branch in `modalHTML()` and `readForm()` in `js/app.js`, plus a saver in the `saver` lookup.
- **New styles.** Add a class to the most relevant existing CSS file. Use the existing tokens (`var(--primary)` etc.) rather than hard-coded colors.
- **New persisted data.** Add a key to `KEYS` in `data/constants.js` and initialize it inside `initializeDefaultData()` in `js/storage.js`.

---

## Where data is stored

The browser always keeps a local copy in `localStorage` (this is the source of truth when offline / signed out):

| Key | Contents |
| ------------------- | ------------------------------------------------ |
| `mt_transactions` | Array of transactions |
| `mt_budgets` | Array of category budgets |
| `mt_goals` | Array of savings goals |
| `mt_auth` | `{ name, email, guest? }` for the signed-in user |
| `mt_country` | `{ code }` of the chosen country |
| `mt_prefs` | UI preferences (theme, date format, notifications) |
| `mt_access_token` | JWT access token (only while signed in) |
| `mt_refresh_token` | JWT refresh token (only while signed in) |

When signed in, transactions / budgets / goals are **also** persisted to the backend database and re-hydrated on login, so they follow you across devices.

To wipe local data, open **Settings → Clear all data**, or run `localStorage.clear()` in DevTools. (This clears the browser copy only; data already synced to the backend stays on the server.)

---

## Backend (optional)

The `backend/` folder is a standalone Node/Express API backed by Prisma + PostgreSQL. It provides authentication (email/password + Google OAuth, JWT access/refresh tokens) and CRUD sync for transactions, budgets and goals.

```bash
cd backend
npm install
cp .env.example .env          # fill in DATABASE_URL, JWT secrets, OAuth creds
npm run db:push               # push schema to database
npm run dev                   # starts the API on http://localhost:3001
```

**Required environment variables (set in Vercel → Settings → Environment Variables):**

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (e.g. from Neon) |
| `JWT_SECRET` | Random secret for access tokens |
| `JWT_REFRESH_SECRET` | Random secret for refresh tokens |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | Your frontend's Vercel URL (for CORS) |
| `GOOGLE_CLIENT_ID` | *(optional)* Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | *(optional)* Google OAuth client secret |

The API is Vercel-ready via `backend/vercel.json`. If you never run the backend, the app still works fully as a local, offline tracker.

---

## Browser support

Modern Chromium, Firefox, Safari, and Edge. Uses `Intl.NumberFormat`, `URL.createObjectURL`, CSS custom properties, `backdrop-filter` (with `-webkit-` fallback), and the Intersection Observer API. Light and dark themes are driven by a `theme-dark` class on `<html>`, applied before first paint via an inline script in `<head>` — no flash of unstyled content.

---

*Built with vanilla HTML, CSS, and JavaScript — no framework, no bundler, no dependencies.*
