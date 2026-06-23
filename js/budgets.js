/**
 * Budgets view + Add/Edit modal.
 * "Spent" is auto-computed from expense transactions in the current month
 * matching the budget's category.
 */

/* ===== Spending helpers ===== */

/** True if an ISO date falls within `now`'s year+month. */
function sameMonth(dateStr, now) {
  const d = new Date((dateStr || "") + "T00:00:00");
  return !isNaN(d) && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

/** Total expenses in `cat` for the current month. */
function spentInCategory(cat) {
  const now = new Date();
  return storage.get(KEYS.transactions, [])
    .filter(t => t.type === "expense" && t.category === cat && sameMonth(t.date, now))
    .reduce((s, t) => s + Number(t.amount || 0), 0);
}

/** Compute progress %, fill colour, status chip + label. */
function budgetStatus(spent, limit) {
  const pct = limit > 0 ? (spent / limit) * 100 : 0;
  let fill = "fill-green", chip = "green", label = "On track";
  if (pct >= 100)     { fill = "fill-red";   chip = "red";   label = "Over budget"; }
  else if (pct >= 75) { fill = "fill-amber"; chip = "amber"; label = "Almost there"; }
  return { pct, clamped: Math.min(100, pct), fill, chip, label };
}

/* ===== Page markup ===== */

function budgetsHTML() {
  const budgets    = storage.get(KEYS.budgets, []);
  const totalBudget = budgets.reduce((s, b) => s + Number(b.limit || 0), 0);
  const totalSpent  = budgets.reduce((s, b) => s + spentInCategory(b.category), 0);
  const remaining   = totalBudget - totalSpent;

  const summary = `
    <div class="budget-summary">
      <div class="sumcard"><p>Total Budget</p><h3 class="tnum">${money(totalBudget)}</h3></div>
      <div class="sumcard"><p>Spent This Month</p><h3 class="tnum">${money(totalSpent)}</h3></div>
      <div class="sumcard"><p>Remaining</p><h3 class="tnum" style="color:${remaining < 0 ? "var(--error)" : "var(--primary)"}">${money(remaining)}</h3></div>
    </div>`;

  let body;
  if (budgets.length === 0) {
    body = `<div class="empty">${icon("donut_small")}No budgets yet. Click “Add Budget” to set a monthly limit for a category.</div>`;
  } else {
    body = `<div class="budget-grid">` + budgets.map(b => {
      const spent = spentInCategory(b.category);
      const st    = budgetStatus(spent, b.limit);
      const remain = b.limit - spent;
      return `
        <div class="card budget-card">
          <div class="budget-top">
            <div class="budget-cat">
              <div class="b-icon">${icon(catIcon(b.category))}</div>
              <div><div class="b-name">${escapeHtml(b.category)}</div><div class="b-period">Monthly budget</div></div>
            </div>
            <div class="card-actions">
              <button class="icon-btn" data-bedit="${b.id}" title="Edit">${icon("edit")}</button>
              <button class="icon-btn" data-bdel="${b.id}" title="Delete">${icon("delete")}</button>
            </div>
          </div>
          <div class="budget-amounts">
            <span class="budget-spent tnum">${money(spent)}</span>
            <span class="budget-limit">of ${money(b.limit)}</span>
          </div>
          <div class="progress-track"><div class="progress-fill ${st.fill}" style="width:${st.clamped}%"></div></div>
          <div class="budget-foot">
            <span class="chip ${st.chip}">${st.label}</span>
            <span class="chip-remaining ${remain < 0 ? "over" : ""}">${remain < 0 ? money(-remain) + " over" : money(remain) + " left"}</span>
          </div>
        </div>`;
    }).join("") + `</div>`;
  }

  return `
    <div class="page-head">
      <div><h1>Budgets</h1><p>Set monthly spending limits and track your progress.</p></div>
      <button class="btn-primary" data-action="add-budget">${icon("add")} Add Budget</button>
    </div>
    ${summary}
    ${body}`;
}

/* ===== Add / Edit modal ===== */

function openBudgetModal(id) {
  modalOpen = true; modalKind = "budget"; formError = ""; editingId = id || null;
  if (id) {
    const b = storage.get(KEYS.budgets, []).find(x => x.id === id);
    form = b ? { ...b } : null;
  }
  if (!form) form = { category: "", limit: "" };
  render();
}

function budgetModalHTML() {
  const used = storage.get(KEYS.budgets, []).map(b => b.category);
  // Only show categories not already budgeted (plus the one we're editing).
  const avail = CATEGORIES.expense.filter(c => !used.includes(c) || c === form.category);
  const catOpts = ["<option value=''>Select category…</option>"]
    .concat(avail.map(c => `<option value="${c}" ${form.category === c ? "selected" : ""}>${c}</option>`)).join("");

  return `
    <div class="modal-overlay" data-overlay>
      <div class="modal">
        <div class="modal-head">
          <h2>${editingId ? "Edit" : "Add"} Budget</h2>
          <button class="icon-btn" data-close>${icon("close")}</button>
        </div>
        <div class="modal-body">
          ${formError ? `<div class="form-error">${escapeHtml(formError)}</div>` : ""}
          <div class="field"><label>Category</label><select id="f-bcategory">${catOpts}</select></div>
          <div class="field">
            <label>Monthly Limit</label>
            <input id="f-blimit" type="number" min="0" step="0.01" placeholder="0.00" value="${escapeHtml(form.limit)}" />
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn-ghost" data-close>Cancel</button>
          <button class="btn-primary" data-save>${icon("check")} ${editingId ? "Save Changes" : "Add Budget"}</button>
        </div>
      </div>
    </div>`;
}

function saveBudget() {
  readForm();
  if (!form.category)                         { formError = "Please choose a category.";              render(); return; }
  if (!form.limit || Number(form.limit) <= 0) { formError = "Please enter a limit greater than 0.";   render(); return; }

  const list = storage.get(KEYS.budgets, []);
  if (editingId) {
    const i = list.findIndex(x => x.id === editingId);
    if (i !== -1) list[i] = { ...list[i], category: form.category, limit: Number(form.limit) };
  } else {
    if (list.some(b => b.category === form.category)) {
      formError = "A budget for this category already exists."; render(); return;
    }
    list.push({
      id: newId(),
      category: form.category, limit: Number(form.limit),
    });
  }
  storage.save(KEYS.budgets, list);
  closeModal();
}

function deleteBudget(id) {
  if (!confirm("Delete this budget?")) return;
  storage.save(KEYS.budgets, storage.get(KEYS.budgets, []).filter(x => x.id !== id));
  render();
}
