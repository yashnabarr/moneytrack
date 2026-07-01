/**
 * Transactions view + Add/Edit modal.
 * The shared modal dispatcher (`modalHTML`, `readForm`) lives in app.js;
 * this module only knows about transaction-specific form state.
 */

/* ===== Filtering / paging ===== */

/** Apply search + filters to the raw transaction list. */
function getFilteredTx() {
  let list = storage.get(KEYS.transactions, []).slice();

  const q = txSearch.trim().toLowerCase();
  if (q) list = list.filter(t =>
    (t.title || "").toLowerCase().includes(q) ||
    (t.category || "").toLowerCase().includes(q) ||
    (t.description || "").toLowerCase().includes(q)
  );

  if (txCategory !== "all") list = list.filter(t => t.category === txCategory);
  if (txType !== "all")     list = list.filter(t => t.type === txType);

  if (txDate !== "all") {
    const now = new Date();
    list = list.filter(t => {
      const d = new Date((t.date || "") + "T00:00:00");
      if (isNaN(d)) return false;
      if (txDate === "month")  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      if (txDate === "year")   return d.getFullYear() === now.getFullYear();
      if (txDate === "30days") return (now - d) <= 30 * 864e5;
      return true;
    });
  }

  list.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return list;
}

/* ===== Row + page markup ===== */

function txRowHTML(t) {
  const open = openTxIds.has(t.id);
  const sign = t.type === "income" ? "+" : "-";
  return `
    <div class="tx ${open ? "open" : ""}" data-id="${t.id}">
      <div class="tx-main" data-toggle="${t.id}">
        <div class="tx-left">
          <div class="tx-icon ${t.type === "income" ? "income" : ""}">${icon(catIcon(t.category))}</div>
          <div>
            <p class="tx-title">${escapeHtml(t.title)}</p>
            <p class="tx-sub">${formatDate(t.date)} • ${escapeHtml(t.category)}</p>
          </div>
        </div>
        <div class="tx-right">
          <p class="tx-amount tnum ${t.type === "income" ? "income" : ""}">${sign}${money(t.amount)}</p>
          <span class="material-symbols-outlined chev">expand_more</span>
        </div>
      </div>
      <div class="tx-details">
        <div class="tx-detail-row">${icon("notes")} <span><b>Description:</b> ${t.description ? escapeHtml(t.description) : "—"}</span></div>
        <div class="tx-detail-row">${icon("account_balance_wallet")} <span><b>Payment:</b> ${escapeHtml(t.payment || "—")}</span></div>
        <div class="tx-detail-row">${icon("sell")} <span><b>Type:</b> ${t.type === "income" ? "Income" : "Expense"}</span></div>
        <div class="tx-actions">
          <button class="btn-sm edit" data-edit="${t.id}">${icon("edit")} Edit</button>
          <button class="btn-sm del" data-del="${t.id}">${icon("delete")} Delete</button>
        </div>
      </div>
    </div>`;
}

/**
 * The filter-dependent part of the transactions page (list + pager).
 * Split out from the page shell so the search box can refresh just this
 * region on each keystroke instead of triggering a full app re-render —
 * the #txSearch input itself stays in the DOM, so focus/caret are preserved.
 */
function txResultsHTML() {
  const all = getFilteredTx();
  const totalPages = Math.max(1, Math.ceil(all.length / PER_PAGE));
  if (txPage > totalPages) txPage = totalPages;
  const start = (txPage - 1) * PER_PAGE;
  const pageItems = all.slice(start, start + PER_PAGE);

  const rawCount = storage.get(KEYS.transactions, []).length;
  let body;
  if (rawCount === 0) {
    body = `<div class="empty">${icon("receipt_long")}No transactions yet. Click “Add Transaction” to record your first one.</div>`;
  } else if (all.length === 0) {
    body = `<div class="empty">${icon("search_off")}No transactions match your filters.</div>`;
  } else {
    body = `<div class="tx-list">${pageItems.map(txRowHTML).join("")}</div>`;
  }

  let pager = "";
  if (all.length > PER_PAGE) {
    let pages = "";
    for (let p = 1; p <= totalPages; p++) {
      pages += `<button class="page-btn ${p === txPage ? "active" : ""}" data-page="${p}">${p}</button>`;
    }
    pager = `
      <div class="pagination">
        <button class="page-btn" data-page="${txPage - 1}" ${txPage === 1 ? "disabled" : ""}>${icon("chevron_left")}</button>
        ${pages}
        <button class="page-btn" data-page="${txPage + 1}" ${txPage === totalPages ? "disabled" : ""}>${icon("chevron_right")}</button>
      </div>`;
  }

  return body + pager;
}

function transactionsHTML() {
  const catOptions = ["<option value='all'>All Categories</option>"]
    .concat([].concat(CATEGORIES.income, CATEGORIES.expense)
      .map(c => `<option value="${c}" ${txCategory === c ? "selected" : ""}>${c}</option>`)).join("");

  const filterBar = `
    <div class="filter-bar">
      <div class="filter-search">${icon("search")}<input id="txSearch" type="text" placeholder="Search transactions..." value="${escapeHtml(txSearch)}" /></div>
      <select class="filter-select" data-filter="category">${catOptions}</select>
      <select class="filter-select" data-filter="date">
        <option value="all"    ${txDate === "all"    ? "selected" : ""}>Any Date</option>
        <option value="month"  ${txDate === "month"  ? "selected" : ""}>This Month</option>
        <option value="30days" ${txDate === "30days" ? "selected" : ""}>Last 30 Days</option>
        <option value="year"   ${txDate === "year"   ? "selected" : ""}>This Year</option>
      </select>
      <select class="filter-select" data-filter="type">
        <option value="all"     ${txType === "all"     ? "selected" : ""}>All Types</option>
        <option value="income"  ${txType === "income"  ? "selected" : ""}>Income</option>
        <option value="expense" ${txType === "expense" ? "selected" : ""}>Expense</option>
      </select>
    </div>`;

  return `
    <div class="page-head">
      <div><h1>Transactions</h1><p>Manage and review your recent financial activity.</p></div>
      <button class="btn-primary" data-action="add-tx">${icon("add")} Add Transaction</button>
    </div>
    ${filterBar}
    <div id="tx-results">${txResultsHTML()}</div>`;
}

/* ===== Add / Edit modal ===== */

/** Open the transaction modal (id=null for "Add"). */
function openModal(id) {
  modalOpen = true; modalKind = "tx"; formError = ""; editingId = id || null;
  if (id) {
    const t = storage.get(KEYS.transactions, []).find(x => x.id === id);
    form = t ? { ...t } : null;
  }
  if (!form) {
    form = { type: "expense", title: "", amount: "", category: "", date: todayStr(), payment: "Cash", description: "" };
  }
  render();
}

function closeModal() {
  modalOpen = false; editingId = null; form = null; formError = "";
  render();
}

function txModalHTML() {
  const cats = CATEGORIES[form.type] || [];
  const catOpts = ["<option value=''>Select category…</option>"]
    .concat(cats.map(c => `<option value="${c}" ${form.category === c ? "selected" : ""}>${c}</option>`)).join("");
  const payOpts = PAYMENTS.map(p => `<option value="${p}" ${form.payment === p ? "selected" : ""}>${p}</option>`).join("");

  return `
    <div class="modal-overlay" data-overlay>
      <div class="modal">
        <div class="modal-head">
          <h2>${editingId ? "Edit" : "Add"} Transaction</h2>
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
            <label>Title / Payee</label>
            <input id="f-title" type="text" placeholder="e.g. Whole Foods Market" value="${escapeHtml(form.title)}" />
          </div>
          <div class="row2">
            <div class="field"><label>Amount</label>
              <input id="f-amount" type="number" min="0" step="0.01" placeholder="0.00" value="${escapeHtml(form.amount)}" /></div>
            <div class="field"><label>Date</label>
              <input id="f-date" type="date" value="${escapeHtml(form.date)}" /></div>
          </div>
          <div class="row2">
            <div class="field"><label>Category</label><select id="f-category">${catOpts}</select></div>
            <div class="field"><label>Payment Method</label><select id="f-payment">${payOpts}</select></div>
          </div>
          <div class="field">
            <label>Description (optional)</label>
            <textarea id="f-desc" placeholder="Add a note…">${escapeHtml(form.description)}</textarea>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn-ghost" data-close>Cancel</button>
          <button class="btn-primary" data-save>${icon("check")} ${editingId ? "Save Changes" : "Add Transaction"}</button>
        </div>
      </div>
    </div>`;
}

/** Validate and persist the current transaction form. */
function saveTx() {
  readForm();
  if (!form.title.trim())                       { formError = "Please enter a title.";                       render(); return; }
  if (!form.amount || Number(form.amount) <= 0) { formError = "Please enter an amount greater than 0.";      render(); return; }
  if (!form.category)                           { formError = "Please choose a category.";                   render(); return; }
  if (!form.date)                               { formError = "Please choose a date.";                       render(); return; }

  const list = storage.get(KEYS.transactions, []);
  if (editingId) {
    const i = list.findIndex(x => x.id === editingId);
    if (i !== -1) list[i] = { ...list[i], ...form, amount: Number(form.amount), title: form.title.trim() };
  } else {
    list.push({
      id: newId(),
      type: form.type, title: form.title.trim(), amount: Number(form.amount),
      category: form.category, date: form.date, payment: form.payment, description: form.description.trim(),
    });
  }
  storage.save(KEYS.transactions, list);
  closeModal();
}

function deleteTx(id) {
  if (!confirm("Delete this transaction? This cannot be undone.")) return;
  const list = storage.get(KEYS.transactions, []).filter(x => x.id !== id);
  storage.save(KEYS.transactions, list);
  openTxIds.delete(id);
  render();
}
