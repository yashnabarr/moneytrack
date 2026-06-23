/**
 * Recurring transactions: schema, service, view, and Add/Edit modal.
 *
 * Schema (stored as array under localStorage["mt_recurring"]):
 *   {
 *     id:            string,
 *     title:         string,
 *     amount:        number,
 *     type:          "income" | "expense",
 *     category:      string,
 *     payment:       string,            // payment method (same options as transactions)
 *     frequency:     "daily" | "weekly" | "monthly" | "yearly",
 *     startDate:     "YYYY-MM-DD",
 *     endDate:       "YYYY-MM-DD" | "", // empty = no end
 *     lastProcessed: "YYYY-MM-DD" | "", // last date we created a tx for
 *     nextDue:       "YYYY-MM-DD",
 *     isActive:      boolean,
 *     note:          string,
 *     createdAt:     number,
 *   }
 *
 * Public API (global functions, plain script style):
 *   processRecurring()            → boot-time catch-up; returns number created
 *   getUpcomingRecurring(days=7)  → list due within N days, sorted by next due
 *   addRecurring(data)            → create + save (calcs initial nextDue)
 *   updateRecurring(id, patch)    → patch + save (recalc nextDue if freq/start changed)
 *   deleteRecurring(id)           → hard delete from list
 *   pauseRecurring(id)            → toggle isActive
 *   recurringHTML()               → page markup
 *   recurringModalHTML()          → Add/Edit modal markup
 *   recurringDashboardHTML()      → "Upcoming this week" dashboard card
 */

/* ---------- Service ---------- */

/** Given a frequency and a from-ISO-date, return the next due ISO date. */
function calcNextDue(frequency, fromIso) {
  switch (frequency) {
    case "daily":   return addDays(fromIso, 1);
    case "weekly":  return addDays(fromIso, 7);
    case "monthly": return addMonths(fromIso, 1);
    case "yearly":  return addYears(fromIso, 1);
    default:        return addMonths(fromIso, 1);
  }
}

/** Walk every active recurring entry. For each, while nextDue <= today (and
 *  before endDate), create a transaction and advance. Returns number created. */
function processRecurring() {
  const recs = storage.get(KEYS.recurring, []);
  if (!recs.length) return 0;

  const txs   = storage.get(KEYS.transactions, []);
  const today = todayStr();
  let createdCount = 0;
  let changed      = false;

  for (const r of recs) {
    if (!r.isActive) continue;
    let due = r.nextDue || r.startDate;
    let guard = 0;
    while (due && due <= today) {
      if (r.endDate && due > r.endDate) break;
      txs.push({
        id:          Date.now().toString(36) + Math.random().toString(36).slice(2, 7) + "_r",
        type:        r.type,
        title:       r.title,
        amount:      Number(r.amount) || 0,
        category:    r.category,
        date:        due,
        payment:     r.payment || "Other",
        description: r.note ? `${r.note} (recurring)` : "(recurring)",
      });
      r.lastProcessed = due;
      due = calcNextDue(r.frequency, due);
      r.nextDue = due;
      createdCount++; changed = true;
      if (++guard > 500) break; // safety
    }
    if (r.endDate && r.nextDue && r.nextDue > r.endDate) r.isActive = false;
  }

  if (changed) {
    storage.save(KEYS.transactions, txs);
    storage.save(KEYS.recurring, recs);
  }
  return createdCount;
}

/** Return active recurring items due in [today, today+days], sorted by nextDue. */
function getUpcomingRecurring(days = 7) {
  const cutoff = addDays(todayStr(), days);
  return storage.get(KEYS.recurring, [])
    .filter(r => r.isActive && r.nextDue && r.nextDue <= cutoff)
    .sort((a, b) => (a.nextDue || "").localeCompare(b.nextDue || ""));
}

/** Validate data, generate id + initial nextDue, save. */
function addRecurring(data) {
  const recs = storage.get(KEYS.recurring, []);
  const start = data.startDate || todayStr();
  const rec = {
    id:            Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    title:         (data.title || "").trim(),
    amount:        Number(data.amount) || 0,
    type:          data.type === "income" ? "income" : "expense",
    category:      data.category || "",
    payment:       data.payment || "Other",
    frequency:     data.frequency || "monthly",
    startDate:     start,
    endDate:       data.endDate || "",
    lastProcessed: "",
    nextDue:       start,
    isActive:      true,
    note:          (data.note || "").trim(),
    createdAt:     Date.now(),
  };
  recs.push(rec);
  storage.save(KEYS.recurring, recs);
  return rec;
}

function updateRecurring(id, patch) {
  const recs = storage.get(KEYS.recurring, []);
  const i = recs.findIndex(r => r.id === id);
  if (i === -1) return null;
  const old = recs[i];
  const next = { ...old, ...patch };
  // Recalc nextDue if frequency or startDate changed
  if (patch.frequency !== undefined || patch.startDate !== undefined) {
    next.nextDue = next.startDate; // start fresh; future processing advances from there
    next.lastProcessed = "";
  }
  recs[i] = next;
  storage.save(KEYS.recurring, recs);
  return next;
}

function deleteRecurring(id) {
  storage.save(KEYS.recurring, storage.get(KEYS.recurring, []).filter(r => r.id !== id));
}

function pauseRecurring(id) {
  const recs = storage.get(KEYS.recurring, []);
  const r = recs.find(x => x.id === id);
  if (!r) return;
  r.isActive = !r.isActive;
  storage.save(KEYS.recurring, recs);
}

/* ---------- View ---------- */

function freqLabel(freq) {
  const f = RECURRING_FREQS.find(x => x.v === freq);
  return f ? f.l : freq;
}
function freqIcon(freq) {
  const f = RECURRING_FREQS.find(x => x.v === freq);
  return f ? f.icon : "autorenew";
}

function recurringCardHTML(r) {
  const days  = daysBetween(todayStr(), r.nextDue);
  const isDue = r.isActive && days <= 0;
  const soon  = r.isActive && days >= 0 && days <= 3;
  const stateClass = !r.isActive ? "paused" : isDue ? "due" : soon ? "soon" : "";
  const dueLabel = r.isActive
    ? `Next: ${formatDate(r.nextDue)} · ${friendlyDay(r.nextDue)}`
    : "Paused";
  const amountSign = r.type === "income" ? "+" : "-";
  return `
    <div class="rec-card ${stateClass}">
      <div class="rec-card-head">
        <div class="rec-ic ${r.type}">${icon(freqIcon(r.frequency))}</div>
        <div class="rec-card-main">
          <div class="rec-card-title">${escapeHtml(r.title)}</div>
          <div class="rec-card-sub">${escapeHtml(freqLabel(r.frequency))} · ${escapeHtml(r.category)}</div>
        </div>
        <div class="rec-amount tnum ${r.type}">${amountSign}${money(r.amount)}</div>
      </div>
      <div class="rec-card-foot">
        <span class="rec-due ${isDue ? "is-due" : soon ? "is-soon" : ""}">${icon(isDue ? "schedule" : "event")} ${escapeHtml(dueLabel)}</span>
        <div class="rec-actions">
          <button class="btn-sm" data-rec-toggle="${r.id}" title="${r.isActive ? "Pause" : "Resume"}">${icon(r.isActive ? "pause" : "play_arrow")} ${r.isActive ? "Pause" : "Resume"}</button>
          <button class="btn-sm edit" data-rec-edit="${r.id}">${icon("edit")} Edit</button>
          <button class="btn-sm del" data-rec-del="${r.id}">${icon("delete")} Delete</button>
        </div>
      </div>
      ${r.note ? `<div class="rec-note">${icon("notes")} ${escapeHtml(r.note)}</div>` : ""}
    </div>`;
}

function recurringHTML() {
  const recs = storage.get(KEYS.recurring, []);
  const active = recs.filter(r => r.isActive);
  const paused = recs.filter(r => !r.isActive);

  const head = `
    <div class="page-head">
      <div><h1>Recurring Transactions</h1><p>Auto-add income and expenses on a schedule — rent, subscriptions, salary, more.</p></div>
      <button class="btn-primary" data-action="add-recurring">${icon("add")} Add Recurring</button>
    </div>`;

  if (!recs.length) {
    return head + `
      <div class="empty">${icon("autorenew")}
        No recurring transactions yet.
        <div style="margin-top:8px;font-size:14px">Set up subscriptions, salary, or rent — they'll be added automatically each cycle.</div>
      </div>`;
  }

  const upcoming = getUpcomingRecurring(7);
  const summary = `
    <div class="rec-summary">
      <div class="rec-stat">
        <span class="rec-stat-lbl">Active</span>
        <span class="rec-stat-val">${active.length}</span>
      </div>
      <div class="rec-stat">
        <span class="rec-stat-lbl">Paused</span>
        <span class="rec-stat-val">${paused.length}</span>
      </div>
      <div class="rec-stat">
        <span class="rec-stat-lbl">Due in next 7 days</span>
        <span class="rec-stat-val">${upcoming.length}</span>
      </div>
    </div>`;

  const activeBlock = active.length ? `
    <div class="rec-section-title">${icon("autorenew")} Active <span class="rec-count">${active.length}</span></div>
    <div class="rec-grid">${active.map(recurringCardHTML).join("")}</div>
  ` : `
    <div class="rec-section-title">${icon("autorenew")} Active <span class="rec-count">0</span></div>
    <div class="empty">No active recurring transactions.</div>
  `;

  const pausedBlock = paused.length ? `
    <div class="rec-section-title rec-section-paused">${icon("pause_circle")} Paused <span class="rec-count">${paused.length}</span></div>
    <div class="rec-grid">${paused.map(recurringCardHTML).join("")}</div>
  ` : "";

  return head + summary + activeBlock + pausedBlock;
}

/* ---------- Modal (Add / Edit) ---------- */

function recurringModalHTML() {
  const cats = CATEGORIES[form.type] || [];
  const catOpts = ["<option value=''>Select category…</option>"]
    .concat(cats.map(c => `<option value="${c}" ${form.category === c ? "selected" : ""}>${c}</option>`)).join("");
  const payOpts = PAYMENTS.map(p => `<option value="${p}" ${form.payment === p ? "selected" : ""}>${p}</option>`).join("");
  const freqOpts = RECURRING_FREQS.map(f =>
    `<option value="${f.v}" ${form.frequency === f.v ? "selected" : ""}>${f.l}</option>`).join("");
  const noEndChecked = !form.endDate;

  return `
    <div class="modal-overlay" data-overlay>
      <div class="modal">
        <div class="modal-head">
          <h2>${editingId ? "Edit" : "Add"} Recurring Transaction</h2>
          <button class="icon-btn" data-close>${icon("close")}</button>
        </div>
        <div class="modal-body">
          ${formError ? `<div class="form-error">${escapeHtml(formError)}</div>` : ""}
          <div class="field">
            <label>Type</label>
            <div class="type-toggle">
              <button class="${form.type === "income" ? "active income" : ""}" data-type="income">${icon("arrow_upward")} Income</button>
              <button class="${form.type === "expense" ? "active expense" : ""}" data-type="expense">${icon("arrow_downward")} Expense</button>
            </div>
          </div>
          <div class="field">
            <label>Title</label>
            <input id="f-title" type="text" placeholder="e.g. Monthly Rent, Netflix, Salary" value="${escapeHtml(form.title)}" />
          </div>
          <div class="row2">
            <div class="field"><label>Amount</label>
              <input id="f-amount" type="number" min="0" step="0.01" placeholder="0.00" value="${escapeHtml(form.amount)}" /></div>
            <div class="field"><label>Frequency</label>
              <select id="f-frequency">${freqOpts}</select></div>
          </div>
          <div class="row2">
            <div class="field"><label>Category</label><select id="f-category">${catOpts}</select></div>
            <div class="field"><label>Payment Method</label><select id="f-payment">${payOpts}</select></div>
          </div>
          <div class="row2">
            <div class="field"><label>Start Date</label>
              <input id="f-startDate" type="date" value="${escapeHtml(form.startDate)}" /></div>
            <div class="field">
              <label>End Date <span style="font-weight:400;color:var(--on-surface-variant)">(optional)</span></label>
              <input id="f-endDate" type="date" value="${escapeHtml(form.endDate || "")}" ${noEndChecked ? "disabled" : ""} />
              <label style="display:inline-flex;gap:6px;margin-top:6px;font-weight:500;font-size:13px;cursor:pointer">
                <input id="f-noEnd" type="checkbox" ${noEndChecked ? "checked" : ""}> No end date
              </label>
            </div>
          </div>
          <div class="field">
            <label>Note (optional)</label>
            <textarea id="f-note" placeholder="e.g. landlord transfer">${escapeHtml(form.note || "")}</textarea>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn-ghost" data-close>Cancel</button>
          <button class="btn-primary" data-save>${icon("check")} ${editingId ? "Save Changes" : "Add Recurring"}</button>
        </div>
      </div>
    </div>`;
}

/** Read recurring-modal fields into `form` (called from app.js's readForm dispatcher). */
function readRecurringForm() {
  const $ = id => document.getElementById(id);
  if (!$("f-title")) return;
  form.title     = $("f-title").value;
  form.amount    = $("f-amount").value;
  form.frequency = $("f-frequency").value;
  form.category  = $("f-category").value;
  form.payment   = $("f-payment").value;
  form.startDate = $("f-startDate").value;
  form.endDate   = $("f-noEnd").checked ? "" : $("f-endDate").value;
  form.note      = $("f-note").value;
}

/** Validate + persist the recurring form. */
function saveRecurring() {
  readRecurringForm();
  if (!(form.title || "").trim())                                                { formError = "Please enter a title."; render(); return; }
  if (!form.amount || Number(form.amount) <= 0)                                  { formError = "Please enter an amount greater than 0."; render(); return; }
  if (!form.category)                                                            { formError = "Please choose a category."; render(); return; }
  if (!form.startDate)                                                           { formError = "Please choose a start date."; render(); return; }
  if (form.endDate && form.endDate < form.startDate)                             { formError = "End date must be after start date."; render(); return; }

  if (editingId) {
    updateRecurring(editingId, {
      title: form.title.trim(), amount: Number(form.amount), type: form.type,
      category: form.category, payment: form.payment, frequency: form.frequency,
      startDate: form.startDate, endDate: form.endDate || "", note: (form.note || "").trim(),
    });
    showToast("Recurring transaction updated");
  } else {
    addRecurring({
      title: form.title.trim(), amount: Number(form.amount), type: form.type,
      category: form.category, payment: form.payment, frequency: form.frequency,
      startDate: form.startDate, endDate: form.endDate || "", note: (form.note || "").trim(),
    });
    showToast("Recurring transaction added");
  }
  // Process before closing so the single render() in closeModal() reflects new tx too
  const created = processRecurring();
  if (created) setTimeout(() => showToast(`${created} transaction${created === 1 ? "" : "s"} auto-added`), 600);
  closeModal();
}

/** Open the recurring modal (id=null for "Add"). */
function openRecurringModal(id) {
  modalOpen = true; modalKind = "recurring"; formError = ""; editingId = id || null;
  if (id) {
    const r = storage.get(KEYS.recurring, []).find(x => x.id === id);
    form = r ? { ...r } : null;
  }
  if (!form) {
    form = {
      type: "expense", title: "", amount: "", category: "",
      payment: "Cash", frequency: "monthly", startDate: todayStr(),
      endDate: "", note: "",
    };
  }
  render();
}

/* ---------- Dashboard widget ---------- */

function recurringDashboardHTML() {
  const upcoming = getUpcomingRecurring(7);
  if (!upcoming.length) return "";

  // Group by nextDue date
  const grouped = {};
  upcoming.slice(0, 6).forEach(r => {
    (grouped[r.nextDue] = grouped[r.nextDue] || []).push(r);
  });

  const rows = Object.keys(grouped).sort().map(date => `
    <div class="up-group">
      <div class="up-date">${friendlyDay(date)} · <span style="color:var(--on-surface-variant);font-weight:500">${formatDate(date)}</span></div>
      ${grouped[date].map(r => `
        <div class="up-item">
          <span class="up-dot ${r.type}"></span>
          <span class="up-title">${escapeHtml(r.title)}</span>
          <span class="up-amount tnum ${r.type}">${r.type === "income" ? "+" : "-"}${money(r.amount)}</span>
        </div>`).join("")}
    </div>`).join("");

  return `
    <div class="card up-card">
      <div class="card-head">
        <h3>${icon("event_upcoming")} Upcoming this week</h3>
        <button class="link-btn" data-nav="recurring">View all →</button>
      </div>
      <div class="up-list">${rows}</div>
    </div>`;
}
