/**
 * Dashboard view: 4 summary stat cards + bento grid
 * (Recent Transactions, Savings Goals, Budgets).
 * Reads aggregate data from storage every render — no caching.
 */

function dashboardHTML() {
  const tx      = storage.get(KEYS.transactions, []);
  const budgets = storage.get(KEYS.budgets, []);
  const goals   = storage.get(KEYS.goals, []);

  const income   = tx.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0);
  const expenses = tx.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0);
  const balance  = income - expenses;
  const savings  = balance > 0 ? balance : 0;

  /** A single stat card. */
  const statCard = (cls, label, value, badgeCls, badgeIcon, trendCls, trendIcon, trend, sparkCls) => `
    <div class="stat ${cls}">
      <div class="stat-top">
        <div><p class="stat-label">${label}</p><h2 class="stat-value tnum">${value}</h2></div>
        <div class="stat-badge ${badgeCls}">${icon(badgeIcon)}</div>
      </div>
      <div class="stat-bottom">
        <span class="trend ${trendCls}">${icon(trendIcon)} ${trend}</span>
        <div class="sparkline ${sparkCls}"></div>
      </div>
    </div>`;

  const stats = `
    <div class="stats">
      ${statCard("up",   "Total Income",   money(income),   "badge-green", "arrow_upward",   "t-green", "trending_up",   "Income",   "")}
      ${statCard("down", "Total Expenses", money(expenses), "badge-red",   "arrow_downward", "t-red",   "trending_down", "Spending", "red")}
      ${statCard("blue", "Current Balance", money(balance),  "badge-blue",  "account_balance", "t-blue", "trending_up",   "Balance",  "bluegrad")}
      ${statCard("up",   "Monthly Savings", money(savings),  "badge-green", "savings",        "t-green", "trending_up",   "Saved",    "")}
    </div>`;

  /** Recent transactions (top 5, newest first). */
  const recent = tx.slice().sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 5);
  const recentHTML = recent.length ? recent.map(t => `
    <div class="mini-tx">
      <div class="mini-left">
        <div class="tx-icon ${t.type === "income" ? "income" : ""}" style="width:40px;height:40px">${icon(catIcon(t.category))}</div>
        <div>
          <p class="tx-title">${escapeHtml(t.title)}</p>
          <p class="tx-sub">${formatDate(t.date)} • ${escapeHtml(t.category)}</p>
        </div>
      </div>
      <p class="tx-amount tnum ${t.type === "income" ? "income" : ""}">${t.type === "income" ? "+" : "-"}${money(t.amount)}</p>
    </div>`).join("")
    : `<div class="empty">${icon("receipt_long")}No transactions yet. Click “Add Transaction” to get started.</div>`;

  /** Top 4 goals as mini progress bars. */
  const goalsHTML = goals.length ? goals.slice(0, 4).map(g => {
    const pct = g.target > 0 ? Math.min(100, (g.saved / g.target) * 100) : 0;
    const col = goalColor(g.color);
    return `
      <div class="mini-budget">
        <div class="mini-budget-head">
          <span class="lbl">${escapeHtml(g.name)}</span>
          <span class="val">${moneyShort(g.saved)} / ${moneyShort(g.target)}</span>
        </div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%;background:${col.hex}"></div></div>
      </div>`;
  }).join("") : `<div class="empty">${icon("flag")}No savings goals yet. Add one in the Goals tab.</div>`;

  /** Top 6 budgets as mini progress bars. */
  const budgetsHTML = budgets.length ? budgets.slice(0, 6).map(b => {
    const spent = spentInCategory(b.category);
    const st    = budgetStatus(spent, b.limit);
    const over  = spent > b.limit;
    return `
      <div class="mini-budget">
        <div class="mini-budget-head">
          <span class="lbl">${escapeHtml(b.category)}</span>
          <span class="val ${over ? "over" : ""}">${Math.round(st.pct)}% (${moneyShort(spent)}/${moneyShort(b.limit)})</span>
        </div>
        <div class="progress-track"><div class="progress-fill ${st.fill}" style="width:${st.clamped}%"></div></div>
      </div>`;
  }).join("") : `<div class="empty">${icon("donut_small")}No budgets yet. Add one in the Budgets tab.</div>`;

  return `
    <div class="page-head">
      <div><h1>Dashboard</h1><p>Welcome back. Here's your financial overview.</p></div>
      <button class="btn-primary" data-action="add-tx">${icon("add")} Add Transaction</button>
    </div>
    ${stats}
    <div class="bento">
      <div class="col">
        <div class="card">
          <div class="card-head"><h3>Recent Transactions</h3><button class="link-btn" data-nav="transactions">View All</button></div>
          ${recentHTML}
        </div>
        <div class="card">
          <div class="card-head"><h3>Savings Goals</h3><button class="link-btn" data-nav="goals">View All</button></div>
          ${goalsHTML}
        </div>
      </div>
      <div class="col">
        ${calendarMiniHTML()}
        ${recurringDashboardHTML()}
        ${splitsDashboardHTML()}
        <div class="card">
          <div class="card-head"><h3>Budgets</h3><button class="link-btn" data-nav="budgets">View All</button></div>
          ${budgetsHTML}
        </div>
      </div>
    </div>`;
}
