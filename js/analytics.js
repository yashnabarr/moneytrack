/**
 * Analytics view — summary stats, insight cards, line/bar/donut SVG charts.
 * All charts are built from inline SVG (no chart library) so they work offline.
 */

/* ===== Time helpers ===== */

/** Return the last `n` months as [{ y, m, label }, ...]. */
function lastMonths(n) {
  const arr = [], now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    arr.push({ y: d.getFullYear(), m: d.getMonth(), label: d.toLocaleDateString("en-US", { month: "short" }) });
  }
  return arr;
}

/** Compute total income & expense for each of the last `n` months.
 *  Single-pass: bucket all transactions by year-month once, then look up. */
function monthlyTotals(n) {
  const tx = storage.get(KEYS.transactions, []);
  const buckets = new Map();   // key "YYYY-M" → { income, expense }
  tx.forEach(t => {
    const d = isoToDate(t.date || "");
    if (!d || isNaN(d)) return;
    const k = `${d.getFullYear()}-${d.getMonth()}`;
    const b = buckets.get(k) || { income: 0, expense: 0 };
    if (t.type === "income") b.income  += Number(t.amount || 0);
    else                     b.expense += Number(t.amount || 0);
    buckets.set(k, b);
  });
  return lastMonths(n).map(mo => {
    const b = buckets.get(`${mo.y}-${mo.m}`) || { income: 0, expense: 0 };
    return { label: mo.label, income: b.income, expense: b.expense };
  });
}

/** Filter transactions by analytics period ("month" | "3m" | "year" | "all"). */
function txInPeriod(period) {
  const tx = storage.get(KEYS.transactions, []), now = new Date();
  return tx.filter(t => {
    const d = new Date((t.date || "") + "T00:00:00");
    if (isNaN(d)) return false;
    if (period === "month") return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    if (period === "3m")    return d >= new Date(now.getFullYear(), now.getMonth() - 2, 1);
    if (period === "year")  return d.getFullYear() === now.getFullYear();
    return true;
  });
}

/* ===== SVG charts ===== */

/** Income (solid green) vs expenses (red dashed) line chart. */
function lineChart(data) {
  const W = 640, H = 280, padL = 72, padR = 20, padT = 20, padB = 40;
  const max = Math.max(1, ...data.map(d => Math.max(d.income, d.expense)));
  const n = data.length, plotW = W - padL - padR, plotH = H - padT - padB;
  const x = i => padL + (n > 1 ? i * plotW / (n - 1) : plotW / 2);
  const y = v => padT + (1 - v / max) * plotH;
  const pts = key => data.map((d, i) => `${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(" ");

  let grid = "";
  [0, 0.5, 1].forEach(f => {
    const gy = padT + f * plotH, val = max * (1 - f);
    grid += `<line x1="${padL}" y1="${gy}" x2="${W - padR}" y2="${gy}" stroke="currentColor" stroke-width="1" opacity=".15"/>`;
    grid += `<text x="${padL - 10}" y="${gy + 4}" text-anchor="end" font-size="11" fill="currentColor" opacity=".7">${moneyShort(val)}</text>`;
  });
  const xlabels = data.map((d, i) => `<text x="${x(i)}" y="${H - 14}" text-anchor="middle" font-size="12" fill="currentColor" opacity=".7">${d.label}</text>`).join("");
  const dots = key => data.map((d, i) => `<circle cx="${x(i)}" cy="${y(d[key])}" r="3.5" fill="${key === "income" ? "#006c49" : "#ba1a1a"}"/>`).join("");

  return `
    <svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" style="overflow:visible">
      ${grid}
      <polyline points="${pts("income")}"  fill="none" stroke="#006c49" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      <polyline points="${pts("expense")}" fill="none" stroke="#ba1a1a" stroke-width="2.5" stroke-dasharray="6 5" stroke-linejoin="round" stroke-linecap="round"/>
      ${dots("income")}${dots("expense")}
      ${xlabels}
    </svg>
    <div class="chart-legend">
      <span class="legend-item"><span class="legend-line" style="background:#006c49"></span>Income</span>
      <span class="legend-item"><span class="legend-line" style="background:#ba1a1a"></span>Expenses</span>
    </div>`;
}

/** Side-by-side bars per month (income vs expense). */
function barChart(data) {
  const W = 640, H = 280, padL = 72, padR = 20, padT = 20, padB = 40;
  const max = Math.max(1, ...data.map(d => Math.max(d.income, d.expense)));
  const n = data.length, plotW = W - padL - padR, plotH = H - padT - padB;
  const gw = plotW / n, bw = Math.min(22, gw * 0.3);
  const y = v => padT + (1 - v / max) * plotH;

  let grid = "";
  [0, 0.5, 1].forEach(f => {
    const gy = padT + f * plotH, val = max * (1 - f);
    grid += `<line x1="${padL}" y1="${gy}" x2="${W - padR}" y2="${gy}" stroke="currentColor" stroke-width="1" opacity=".15"/>`;
    grid += `<text x="${padL - 10}" y="${gy + 4}" text-anchor="end" font-size="11" fill="currentColor" opacity=".7">${moneyShort(val)}</text>`;
  });

  let bars = "";
  data.forEach((d, i) => {
    const cx = padL + i * gw + gw / 2;
    const ih = (d.income / max) * plotH, eh = (d.expense / max) * plotH;
    bars += `<rect x="${cx - bw - 2}" y="${y(d.income)}"  width="${bw}" height="${ih}" rx="3" fill="#006c49"/>`;
    bars += `<rect x="${cx + 2}"      y="${y(d.expense)}" width="${bw}" height="${eh}" rx="3" fill="#ba1a1a"/>`;
    bars += `<text x="${cx}" y="${H - 14}" text-anchor="middle" font-size="12" fill="currentColor" opacity=".7">${d.label}</text>`;
  });

  return `
    <svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" style="overflow:visible">${grid}${bars}</svg>
    <div class="chart-legend">
      <span class="legend-item"><span class="legend-dot" style="background:#006c49"></span>Income</span>
      <span class="legend-item"><span class="legend-dot" style="background:#ba1a1a"></span>Expenses</span>
    </div>`;
}

/** Expense breakdown donut chart with a side legend. */
function donutChart(tx) {
  const byCat = {};
  tx.filter(t => t.type === "expense").forEach(t => {
    byCat[t.category] = (byCat[t.category] || 0) + Number(t.amount || 0);
  });
  let cats = Object.keys(byCat).map(k => ({ label: k, value: byCat[k] })).sort((a, b) => b.value - a.value);
  const total = cats.reduce((s, c) => s + c.value, 0);
  if (total === 0) return `<div class="empty">${icon("donut_small")}No expenses in this period.</div>`;

  // Show the top 5 categories, group the rest as "Other".
  if (cats.length > 6) {
    const top = cats.slice(0, 5);
    const other = cats.slice(5).reduce((s, c) => s + c.value, 0);
    top.push({ label: "Other", value: other });
    cats = top;
  }
  cats.forEach((c, i) => { c.color = CHART_COLORS[i % CHART_COLORS.length]; c.pct = c.value / total * 100; });

  const r = 60, C = 2 * Math.PI * r, cx = 80, cy = 80, sw = 22;
  let off = 0, segs = "";
  cats.forEach(c => {
    const dash = c.pct / 100 * C;
    segs += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${c.color}" stroke-width="${sw}"
      stroke-dasharray="${dash.toFixed(2)} ${(C - dash).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}"
      transform="rotate(-90 ${cx} ${cy})"/>`;
    off += dash;
  });
  const legend = cats.map(c => `
    <div class="donut-row">
      <span class="donut-left"><span class="legend-dot" style="background:${c.color}"></span>${escapeHtml(c.label)}</span>
      <span class="donut-pct">${Math.round(c.pct)}%</span>
    </div>`).join("");

  return `
    <div class="donut-wrap">
      <svg class="donut" viewBox="0 0 160 160">
        ${segs}
        <text class="donut-center" x="80" y="72" font-size="13" fill="currentColor" opacity=".7">Total</text>
        <text class="donut-center" x="80" y="92" font-size="17" fill="currentColor">${moneyShort(total)}</text>
      </svg>
      <div class="donut-legend">${legend}</div>
    </div>`;
}

/* ===== Page markup ===== */

function analyticsHTML() {
  const allTx = storage.get(KEYS.transactions, []);
  const periodLabels = { month: "This Month", "3m": "Last 3 Months", year: "This Year", all: "All Time" };

  const head = `
    <div class="page-head">
      <div><h1>Financial Analytics</h1><p>A comprehensive overview of your financial health.</p></div>
      <div class="an-actions">
        <select class="filter-select" data-an-period>
          ${Object.keys(periodLabels).map(k => `<option value="${k}" ${anPeriod === k ? "selected" : ""}>${periodLabels[k]}</option>`).join("")}
        </select>
        <button class="btn-primary" data-action="export">${icon("download")} Export CSV</button>
      </div>
    </div>`;

  if (allTx.length === 0) {
    return head + `<div class="empty">${icon("monitoring")}No data to analyze yet. Add some transactions first.</div>`;
  }

  const periodTx    = txInPeriod(anPeriod);
  const income      = periodTx.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0);
  const expense     = periodTx.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0);
  const net         = income - expense;
  const savingsRate = income > 0 ? (net / income) * 100 : 0;

  const stats = `
    <div class="stats">
      <div class="stat up"><div class="stat-top"><div><p class="stat-label">Income (${periodLabels[anPeriod]})</p><h2 class="stat-value tnum">${money(income)}</h2></div><div class="stat-badge badge-green">${icon("arrow_upward")}</div></div><div class="stat-bottom"><span class="trend t-green">${icon("payments")} Earned</span></div></div>
      <div class="stat down"><div class="stat-top"><div><p class="stat-label">Expenses (${periodLabels[anPeriod]})</p><h2 class="stat-value tnum">${money(expense)}</h2></div><div class="stat-badge badge-red">${icon("arrow_downward")}</div></div><div class="stat-bottom"><span class="trend t-red">${icon("shopping_cart")} Spent</span></div></div>
      <div class="stat blue"><div class="stat-top"><div><p class="stat-label">Net Balance</p><h2 class="stat-value tnum" style="color:${net < 0 ? "var(--error)" : "var(--on-surface)"}">${money(net)}</h2></div><div class="stat-badge badge-blue">${icon("account_balance")}</div></div><div class="stat-bottom"><span class="trend t-blue">${icon("savings")} Saved</span></div></div>
      <div class="stat up"><div class="stat-top"><div><p class="stat-label">Savings Rate</p><h2 class="stat-value tnum">${Math.round(savingsRate)}%</h2></div><div class="stat-badge badge-green">${icon("percent")}</div></div><div class="stat-bottom"><span class="trend t-green">${icon("trending_up")} of income</span></div></div>
    </div>`;

  // Insights: current vs previous month
  const mt = monthlyTotals(2), cur = mt[1], prev = mt[0];
  const spendChange = prev.expense > 0 ? ((cur.expense - prev.expense) / prev.expense) * 100 : (cur.expense > 0 ? 100 : 0);
  const up = spendChange >= 0;
  const monthRate = cur.income > 0 ? ((cur.income - cur.expense) / cur.income) * 100 : 0;

  const insights = `
    <div class="card insight" style="border-left-color:${up ? "var(--error)" : "var(--primary)"}">
      <div class="ic-top" style="color:${up ? "var(--error)" : "var(--primary)"}">${icon(up ? "trending_up" : "trending_down")} Spending ${up ? "Alert" : "Update"}</div>
      <h4>Spending ${up ? "increased" : "decreased"} ${Math.abs(Math.round(spendChange))}% this month</h4>
      <p>Compared with last month's expenses of ${money(prev.expense)}. ${up ? "Consider reviewing your budgets." : "Nice work keeping costs down!"}</p>
    </div>
    <div class="card insight" style="border-left-color:var(--primary)">
      <div class="ic-top" style="color:var(--primary)">${icon("emoji_events")} Savings Milestone</div>
      <h4>You saved ${Math.round(monthRate)}% of your income this month</h4>
      <p>${monthRate >= 20 ? "Great job — you're above the recommended 20% savings rate!" : "Aim for a 20% savings rate to build wealth faster."}</p>
    </div>
    <div class="card net-card">
      <p class="lbl">Net Balance (All Time)</p>
      <div class="net-val tnum">${money(allTx.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0) - allTx.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0))}</div>
    </div>`;

  const months6 = monthlyTotals(6);

  return `
    ${head}
    ${stats}
    <div class="analytics-grid">
      <div class="an-left">${insights}</div>
      <div class="card">
        <div class="card-head"><h3>Spending Trend</h3></div>
        ${lineChart(months6)}
      </div>
    </div>
    <div class="charts-2">
      <div class="card">
        <div class="card-head"><h3>Expense Breakdown</h3></div>
        ${donutChart(periodTx)}
      </div>
      <div class="card">
        <div class="card-head"><h3>Monthly Comparison</h3></div>
        ${barChart(months6)}
      </div>
    </div>`;
}

/* ===== CSV export ===== */

function exportCSV() {
  const tx = storage.get(KEYS.transactions, []);
  if (!tx.length) { alert("No transactions to export."); return; }

  // CSV-injection safe: if a cell starts with =, +, -, @, tab, or CR, prefix with a single quote
  // so spreadsheet apps treat it as text instead of executing it as a formula.
  function csvSafe(v) {
    const s = String(v == null ? "" : v);
    return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
  }

  const rows = [["Date", "Type", "Title", "Category", "Amount", "Payment", "Description"]];
  tx.slice().sort((a, b) => (a.date || "").localeCompare(b.date || ""))
    .forEach(t => rows.push([t.date, t.type, t.title, t.category, t.amount, t.payment || "", (t.description || "").replace(/\s+/g, " ")]));

  const csv = rows.map(r => r.map(c => `"${csvSafe(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "pockit-transactions.csv";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
