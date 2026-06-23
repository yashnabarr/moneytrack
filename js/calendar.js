/**
 * Financial Calendar — reads transactions + recurring; no new schema.
 *
 * Public API:
 *   calendarHTML()             → full page markup
 *   calendarMiniHTML()         → compact current-week widget for the dashboard
 *   openTxForDate(iso)         → open the existing tx modal pre-filled with the given date
 *   calPrevMonth() / calNextMonth() — navigate
 *   calGotoToday() — jump back to today
 */

/* ---------- Service ---------- */

const _MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const _DAY_LABELS  = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

/** Maximum months you can navigate into the future (for upcoming recurring previews). */
const CAL_MAX_FUTURE_MONTHS = 3;

/** Build a 6-row × 7-col grid of cells covering the given month.
 *  Cells from previous/next month fill the edges. Week starts Monday. */
function calMonthCells(year, month) {
  const first = new Date(year, month, 1);
  // Monday-based offset: 0 = Mon … 6 = Sun
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset);
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push({
      date:    dateToIso(d),
      day:     d.getDate(),
      inMonth: d.getMonth() === month,
    });
  }
  return cells;
}

/** All transactions for the given month, indexed by date. */
function calTransactionsByMonth(year, month) {
  const txs = storage.get(KEYS.transactions, []);
  const byDate = {};
  txs.forEach(t => {
    if (!t.date) return;
    const d = isoToDate(t.date);
    if (!d || d.getFullYear() !== year || d.getMonth() !== month) return;
    (byDate[t.date] = byDate[t.date] || []).push(t);
  });
  return byDate;
}

/** Active recurring entries whose `nextDue` falls in the given month, by date. */
function calRecurringByMonth(year, month) {
  const out = {};
  const monthStart = dateToIso(new Date(year, month, 1));
  const monthEnd   = dateToIso(new Date(year, month + 1, 0));
  storage.get(KEYS.recurring, []).forEach(r => {
    if (!r.isActive || !r.nextDue) return;
    // Project forward across the month (recurring may fire multiple times within month)
    let due = r.nextDue;
    let guard = 0;
    while (due && due <= monthEnd && guard++ < 60) {
      if (due >= monthStart) (out[due] = out[due] || []).push(r);
      due = calcNextDue(r.frequency, due);
    }
  });
  return out;
}

/** Aggregate totals for a month (income, expense, net, top day). */
function calMonthStats(year, month) {
  const byDate = calTransactionsByMonth(year, month);
  let income = 0, expense = 0;
  Object.values(byDate).forEach(list => list.forEach(t => {
    if (t.type === "income") income += Number(t.amount || 0);
    else                     expense += Number(t.amount || 0);
  }));
  return {
    income, expense,
    net: income - expense,
  };
}

/** Percentage change between current and previous month's value. Returns null if previous is 0. */
function calPctChange(curr, prev) {
  if (!prev) return null;
  return Math.round(((curr - prev) / prev) * 100);
}

/* ---------- Navigation ---------- */

function calPrevMonth() {
  if (calMonth === 0) { calMonth = 11; calYear--; }
  else                 calMonth--;
  // Reset selection so calCurrentSelection() picks today (if in view) or the 1st
  calSelectedDate = null;
  render();
}

function calNextMonth() {
  // Cap at CAL_MAX_FUTURE_MONTHS ahead of current
  const today = new Date();
  const maxDate = new Date(today.getFullYear(), today.getMonth() + CAL_MAX_FUTURE_MONTHS, 1);
  const target  = new Date(calYear, calMonth + 1, 1);
  if (target > maxDate) return;
  if (calMonth === 11) { calMonth = 0; calYear++; }
  else                  calMonth++;
  calSelectedDate = null;
  render();
}

function calGotoToday() {
  const now = new Date();
  calYear = now.getFullYear();
  calMonth = now.getMonth();
  calSelectedDate = todayStr();
  render();
}

/** Selected date as ISO; defaults to today if today is in the current view month, else first of month. */
function calCurrentSelection() {
  if (calSelectedDate) return calSelectedDate;
  const today = todayStr();
  const t = isoToDate(today);
  if (t.getFullYear() === calYear && t.getMonth() === calMonth) return today;
  return dateToIso(new Date(calYear, calMonth, 1));
}

/* ---------- Page markup ---------- */

function calendarHTML() {
  const today  = todayStr();
  const txByDate  = calTransactionsByMonth(calYear, calMonth);
  const recByDate = calRecurringByMonth(calYear, calMonth);
  const cells     = calMonthCells(calYear, calMonth);
  const sel       = calCurrentSelection();

  // ----- Header -----
  const monthLabel = `${_MONTH_NAMES[calMonth]} ${calYear}`;
  const todayInView = (() => {
    const t = isoToDate(today);
    return t.getFullYear() === calYear && t.getMonth() === calMonth;
  })();
  const nextDisabled = (() => {
    const now = new Date();
    const maxDate = new Date(now.getFullYear(), now.getMonth() + CAL_MAX_FUTURE_MONTHS, 1);
    const next    = new Date(calYear, calMonth + 1, 1);
    return next > maxDate;
  })();

  const header = `
    <div class="cal-head">
      <div>
        <h1>${monthLabel}</h1>
        <p>${todayInView ? "Click any day to see its transactions." : "Viewing a different month."}</p>
      </div>
      <div class="cal-head-actions">
        <button class="icon-btn-lg" data-cal-prev title="Previous month">${icon("chevron_left")}</button>
        <button class="btn-sm" data-cal-today ${todayInView && sel === today ? "disabled" : ""}>${icon("today")} Today</button>
        <button class="icon-btn-lg" data-cal-next title="Next month" ${nextDisabled ? "disabled" : ""}>${icon("chevron_right")}</button>
      </div>
    </div>`;

  // ----- Stats -----
  const cur = calMonthStats(calYear, calMonth);
  const prevDate = new Date(calYear, calMonth - 1, 1);
  const prev = calMonthStats(prevDate.getFullYear(), prevDate.getMonth());

  const trend = (curr, prevVal, goodHigh) => {
    const pct = calPctChange(curr, prevVal);
    if (pct == null) return "";
    const up = pct > 0;
    const good = goodHigh ? up : !up;
    return `<span class="cal-trend ${good ? "good" : "bad"}">${icon(up ? "trending_up" : "trending_down")} ${Math.abs(pct)}%</span>`;
  };

  const stats = `
    <div class="cal-stats">
      <div class="cal-stat up">
        <div class="cal-stat-lbl">Income</div>
        <div class="cal-stat-val tnum">${money(cur.income)}</div>
        ${trend(cur.income, prev.income, true)}
      </div>
      <div class="cal-stat down">
        <div class="cal-stat-lbl">Expenses</div>
        <div class="cal-stat-val tnum">${money(cur.expense)}</div>
        ${trend(cur.expense, prev.expense, false)}
      </div>
      <div class="cal-stat ${cur.net >= 0 ? "saved" : "down"}">
        <div class="cal-stat-lbl">Net ${cur.net >= 0 ? "saved" : "loss"}</div>
        <div class="cal-stat-val tnum">${cur.net >= 0 ? "+" : ""}${money(cur.net)}</div>
        ${trend(cur.net, prev.net, true)}
      </div>
    </div>`;

  // ----- Day-name header row -----
  const dayHead = `<div class="cal-grid-head">${_DAY_LABELS.map(d => `<div>${d}</div>`).join("")}</div>`;

  // ----- Day grid -----
  const gridCells = cells.map(c => {
    const dayTx  = txByDate[c.date] || [];
    const dayRec = (recByDate[c.date] || []).filter(() => c.date >= today); // only future recurring as previews
    const hasInc = dayTx.some(t => t.type === "income");
    const hasExp = dayTx.some(t => t.type === "expense");
    const isToday    = c.date === today;
    const isSelected = c.date === sel;
    const isFuture   = c.date > today;

    const dots = [];
    if (hasInc) dots.push(`<span class="cal-dot inc"></span>`);
    if (hasExp) dots.push(`<span class="cal-dot exp"></span>`);
    if (dayRec.length && !hasInc && !hasExp) dots.push(`<span class="cal-dot rec"></span>`);

    const cls = [
      "cal-cell",
      !c.inMonth ? "out" : "",
      isToday   ? "today" : "",
      isSelected ? "selected" : "",
      isFuture && dayRec.length ? "has-rec" : "",
    ].filter(Boolean).join(" ");

    return `
      <button class="${cls}" data-cal-cell="${c.date}" type="button">
        <span class="cal-cell-day">${c.day}</span>
        ${dots.length ? `<span class="cal-cell-dots">${dots.join("")}</span>` : ""}
        ${dayRec.length && isFuture ? `<span class="cal-cell-rec-ic" title="${dayRec.length} recurring">${icon("event_repeat")}</span>` : ""}
      </button>`;
  }).join("");

  // ----- Legend -----
  const legend = `
    <div class="cal-legend">
      <span><span class="cal-dot inc"></span>Income</span>
      <span><span class="cal-dot exp"></span>Expense</span>
      <span>${icon("event_repeat")} Upcoming recurring</span>
    </div>`;

  // ----- Day detail panel -----
  const panel = calDayPanelHTML(sel, txByDate[sel] || [], recByDate[sel] || []);

  return `
    ${header}
    ${stats}
    <div class="cal-shell">
      <div class="cal-grid-wrap">
        ${dayHead}
        <div class="cal-grid">${gridCells}</div>
        ${legend}
      </div>
      ${panel}
    </div>`;
}

function calDayPanelHTML(iso, txs, recurring) {
  const d = isoToDate(iso);
  const dayLabel = d ? d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "";
  const today = todayStr();
  const isFuture = iso > today;

  const income  = txs.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0);
  const expense = txs.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0);

  const txList = txs.length ? txs.map(t => `
    <div class="cal-tx">
      <div class="tx-icon ${t.type === "income" ? "income" : ""}" style="width:36px;height:36px">${icon(catIcon(t.category))}</div>
      <div class="cal-tx-main">
        <div class="cal-tx-title">${escapeHtml(t.title)}</div>
        <div class="cal-tx-sub">${escapeHtml(t.category)}</div>
      </div>
      <div class="cal-tx-amount tnum ${t.type === "income" ? "income" : "expense"}">${t.type === "income" ? "+" : "-"}${money(t.amount)}</div>
    </div>`).join("") : "";

  const recList = (isFuture && recurring.length) ? `
    <div class="cal-up-block">
      <div class="cal-up-lbl">${icon("event_repeat")} Upcoming on this date</div>
      ${recurring.map(r => `
        <div class="cal-tx muted">
          <div class="tx-icon ${r.type === "income" ? "income" : ""}" style="width:36px;height:36px">${icon(catIcon(r.category))}</div>
          <div class="cal-tx-main">
            <div class="cal-tx-title">${escapeHtml(r.title)}</div>
            <div class="cal-tx-sub">${escapeHtml(r.category)} · recurring</div>
          </div>
          <div class="cal-tx-amount tnum ${r.type === "income" ? "income" : "expense"}">${r.type === "income" ? "+" : "-"}${money(r.amount)}</div>
        </div>`).join("")}
    </div>` : "";

  const totals = txs.length ? `
    <div class="cal-day-totals">
      ${income  ? `<span class="cal-day-total inc">${icon("arrow_upward")} ${money(income)}</span>`   : ""}
      ${expense ? `<span class="cal-day-total exp">${icon("arrow_downward")} ${money(expense)}</span>` : ""}
    </div>` : "";

  const empty = (!txs.length && !recurring.length) ? `
    <div class="cal-day-empty">
      ${icon("event_busy")}
      <div>No transactions on this day.</div>
    </div>` : "";

  return `
    <div class="cal-panel">
      <div class="cal-panel-head">
        <div>
          <h3>${escapeHtml(dayLabel)}</h3>
          ${totals}
        </div>
        <button class="btn-primary btn-sm" data-cal-quickadd="${iso}">${icon("add")} Add Transaction</button>
      </div>
      ${txList ? `<div class="cal-tx-list">${txList}</div>` : ""}
      ${recList}
      ${empty}
    </div>`;
}

/* ---------- Quick-add transaction for a given date ---------- */

function openTxForDate(iso) {
  modalOpen = true; modalKind = "tx"; formError = ""; editingId = null;
  form = {
    type: "expense", title: "", amount: "", category: "",
    date: iso || todayStr(), payment: "Cash", description: "",
  };
  render();
}

/* ---------- Dashboard mini widget (current week) ---------- */

function calendarMiniHTML() {
  const now    = new Date();
  const today  = todayStr();
  // Find Monday of this week
  const monOff = (now.getDay() + 6) % 7;
  const monday = new Date(now); monday.setDate(now.getDate() - monOff);

  // Pull this week's tx + recurring (approx — only this week's window)
  const txs   = storage.get(KEYS.transactions, []);
  const recs  = storage.get(KEYS.recurring, []);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday); d.setDate(monday.getDate() + i);
    const iso = dateToIso(d);
    const dayTx = txs.filter(t => t.date === iso);
    const hasInc = dayTx.some(t => t.type === "income");
    const hasExp = dayTx.some(t => t.type === "expense");
    const hasRec = iso >= today && recs.some(r => r.isActive && r.nextDue === iso);
    days.push({ iso, label: _DAY_LABELS[i], day: d.getDate(), isToday: iso === today, hasInc, hasExp, hasRec });
  }

  const cells = days.map(d => `
    <button class="cal-mini-cell ${d.isToday ? "today" : ""}" data-cal-mini="${d.iso}" type="button">
      <span class="cal-mini-d">${d.label}</span>
      <span class="cal-mini-n">${d.day}</span>
      <span class="cal-mini-dots">
        ${d.hasInc ? `<span class="cal-dot inc"></span>` : ""}
        ${d.hasExp ? `<span class="cal-dot exp"></span>` : ""}
        ${d.hasRec && !d.hasInc && !d.hasExp ? `<span class="cal-dot rec"></span>` : ""}
      </span>
    </button>`).join("");

  return `
    <div class="card cal-mini-card">
      <div class="card-head">
        <h3>${icon("calendar_month")} This week</h3>
        <button class="link-btn" data-nav="calendar">View calendar →</button>
      </div>
      <div class="cal-mini-row">${cells}</div>
    </div>`;
}
