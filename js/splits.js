/**
 * Split Expense Tracker — schema, service, view, and modal.
 *
 * Schema (localStorage["mt_splits"]):
 *   {
 *     id:           string,
 *     title:        string,
 *     totalAmount:  number,
 *     date:         "YYYY-MM-DD",
 *     category:     string,
 *     paidBy:       "me" | "them",
 *     payerName:    string,          // if paidBy=them, who paid
 *     splitType:    "equal" | "custom",
 *     note:         string,
 *     participants: [{
 *       id:     string,
 *       name:   string,    // "Me" for self
 *       isMe:   boolean,
 *       share:  number,    // their owed share of totalAmount
 *       isPaid: boolean,
 *       paidAt: number | null,
 *     }],
 *     isSettled:  boolean,
 *     settledAt:  number | null,
 *     createdAt:  number,
 *   }
 *
 * Public API:
 *   getSplits()                   → all splits, newest first
 *   getSplitSummary()             → { owedToMe, iOwe, net, activeCount }
 *   createSplit(data)
 *   updateSplit(id, patch)
 *   deleteSplit(id)
 *   markParticipantPaid(splitId, participantId)
 *   settleSplit(splitId)
 *   splitsHTML()                  → page markup
 *   splitModalHTML()              → Add/Edit modal markup
 *   splitsDashboardHTML()         → small dashboard widget
 */

/* ---------- Service ---------- */

function _newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

/** Equal split with extra paise pushed to the FIRST participant for rounding. */
function calcEqualSplit(total, n) {
  if (!n || n <= 0) return [];
  const each   = Math.floor((Number(total) || 0) * 100 / n) / 100;
  const rounded = Array(n).fill(each);
  const sumSoFar = each * n;
  const remainder = Math.round((Number(total) - sumSoFar) * 100) / 100;
  rounded[0] = Math.round((rounded[0] + remainder) * 100) / 100;
  return rounded;
}

function getSplits() {
  return storage.get(KEYS.splits, []).slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

/** Summary across all splits: amounts I'm owed vs I owe. */
function getSplitSummary() {
  let owedToMe = 0, iOwe = 0, active = 0;
  storage.get(KEYS.splits, []).forEach(s => {
    if (s.isSettled) return;
    active++;
    if (s.paidBy === "me") {
      // Others owe me the unpaid share of each non-me participant
      s.participants.forEach(p => { if (!p.isMe && !p.isPaid) owedToMe += Number(p.share) || 0; });
    } else {
      // I owe the payer my own unpaid share
      const me = s.participants.find(p => p.isMe);
      if (me && !me.isPaid) iOwe += Number(me.share) || 0;
    }
  });
  return {
    owedToMe: Math.round(owedToMe * 100) / 100,
    iOwe:     Math.round(iOwe * 100) / 100,
    net:      Math.round((owedToMe - iOwe) * 100) / 100,
    activeCount: active,
  };
}

function createSplit(data) {
  const list = storage.get(KEYS.splits, []);
  // Auto-mark the payer as paid (they fronted the money)
  const participants = (data.participants || []).map(p => ({
    id:     p.id || _newId(),
    name:   (p.name || "").trim(),
    isMe:   !!p.isMe,
    share:  Math.round((Number(p.share) || 0) * 100) / 100,
    isPaid: data.paidBy === "me" ? !!p.isMe : !p.isMe,    // payer is already "paid"
    paidAt: null,
  }));
  const split = {
    id:          _newId(),
    title:       (data.title || "").trim(),
    totalAmount: Math.round((Number(data.totalAmount) || 0) * 100) / 100,
    date:        data.date || todayStr(),
    category:    data.category || "Other",
    paidBy:      data.paidBy === "them" ? "them" : "me",
    payerName:   (data.payerName || "").trim(),
    splitType:   data.splitType === "custom" ? "custom" : "equal",
    note:        (data.note || "").trim(),
    participants,
    isSettled:   false,
    settledAt:   null,
    createdAt:   Date.now(),
  };
  list.push(split);
  storage.save(KEYS.splits, list);
  return split;
}

function updateSplit(id, patch) {
  const list = storage.get(KEYS.splits, []);
  const i = list.findIndex(s => s.id === id);
  if (i === -1) return null;
  list[i] = { ...list[i], ...patch };
  storage.save(KEYS.splits, list);
  return list[i];
}

function deleteSplit(id) {
  storage.save(KEYS.splits, storage.get(KEYS.splits, []).filter(s => s.id !== id));
}

function markParticipantPaid(splitId, participantId) {
  const list = storage.get(KEYS.splits, []);
  const s = list.find(x => x.id === splitId);
  if (!s) return;
  const p = s.participants.find(x => x.id === participantId);
  if (!p) return;
  p.isPaid = true;
  p.paidAt = Date.now();
  if (s.participants.every(x => x.isPaid)) {
    s.isSettled = true;
    s.settledAt = Date.now();
  }
  storage.save(KEYS.splits, list);
}

function unmarkParticipantPaid(splitId, participantId) {
  const list = storage.get(KEYS.splits, []);
  const s = list.find(x => x.id === splitId);
  if (!s) return;
  const p = s.participants.find(x => x.id === participantId);
  if (!p) return;
  p.isPaid = false;
  p.paidAt = null;
  s.isSettled = false;
  s.settledAt = null;
  storage.save(KEYS.splits, list);
}

function settleSplit(splitId) {
  const list = storage.get(KEYS.splits, []);
  const s = list.find(x => x.id === splitId);
  if (!s) return;
  const now = Date.now();
  s.participants.forEach(p => { if (!p.isPaid) { p.isPaid = true; p.paidAt = now; } });
  s.isSettled = true;
  s.settledAt = now;
  storage.save(KEYS.splits, list);
}

/* ---------- Page markup ---------- */

function splitsHTML() {
  const splits = getSplits();
  const active = splits.filter(s => !s.isSettled);
  const settled = splits.filter(s => s.isSettled);
  const sum = getSplitSummary();

  const head = `
    <div class="page-head">
      <div><h1>Split Expenses</h1><p>Track who owes you and who you owe — roommates, trips, dinners, anywhere money is shared.</p></div>
      <button class="btn-primary" data-action="add-split">${icon("add")} New Split</button>
    </div>`;

  if (!splits.length) {
    return head + `
      <div class="empty">${icon("group")}
        No splits yet.
        <div style="margin-top:8px;font-size:14px">Create your first split to track shared expenses with friends or roommates.</div>
      </div>`;
  }

  const summary = `
    <div class="sp-summary">
      <div class="sp-stat owed">
        <div class="sp-stat-label">${icon("trending_up")} Owed to me</div>
        <div class="sp-stat-val tnum">${money(sum.owedToMe)}</div>
      </div>
      <div class="sp-stat owe">
        <div class="sp-stat-label">${icon("trending_down")} I owe</div>
        <div class="sp-stat-val tnum">${money(sum.iOwe)}</div>
      </div>
      <div class="sp-stat net ${sum.net >= 0 ? "pos" : "neg"}">
        <div class="sp-stat-label">${icon("account_balance")} Net balance</div>
        <div class="sp-stat-val tnum">${sum.net >= 0 ? "+" : ""}${money(sum.net)}</div>
      </div>
    </div>`;

  const activeBlock = active.length ? `
    <div class="sp-section-title">${icon("schedule")} Active <span class="rec-count">${active.length}</span></div>
    <div class="sp-list">${active.map(splitCardHTML).join("")}</div>
  ` : `
    <div class="sp-section-title">${icon("schedule")} Active <span class="rec-count">0</span></div>
    <div class="empty">No active splits — all settled up!</div>
  `;

  const settledBlock = settled.length ? `
    <details class="sp-settled-block">
      <summary class="sp-section-title sp-section-settled">
        ${icon("check_circle")} Settled <span class="rec-count">${settled.length}</span>
        <span class="material-symbols-outlined sp-toggle-chev">expand_more</span>
      </summary>
      <div class="sp-list">${settled.map(splitCardHTML).join("")}</div>
    </details>
  ` : "";

  return head + summary + activeBlock + settledBlock;
}

function splitCardHTML(s) {
  const sign     = s.paidBy === "me" ? "+" : "-";
  const sideCls  = s.paidBy === "me" ? "side-owed" : "side-owes";
  const payerLbl = s.paidBy === "me" ? "You paid" : `${escapeHtml(s.payerName || "Someone")} paid`;
  const me       = s.participants.find(p => p.isMe);

  const partRows = s.participants.map(p => {
    if (p.isMe && s.paidBy === "me") return ""; // skip own row when I paid (only show who owes)
    if (!p.isMe && s.paidBy === "them") return ""; // skip others when they paid (only show my row)
    const action = s.isSettled ? "" : (p.isPaid
      ? `<button class="btn-sm" data-sp-unmark="${s.id}|${p.id}" title="Mark unpaid">${icon("undo")} Unpaid</button>`
      : `<button class="btn-sm edit" data-sp-mark="${s.id}|${p.id}">${icon("check")} Mark paid</button>`);
    return `
      <div class="sp-part ${p.isPaid ? "paid" : ""}">
        <span class="sp-part-ic">${icon(p.isPaid ? "check_circle" : "schedule")}</span>
        <span class="sp-part-name">${escapeHtml(p.name)}${p.isMe ? " (you)" : ""}</span>
        <span class="sp-part-amt tnum">${money(p.share)}</span>
        ${action}
      </div>`;
  }).join("");

  // Aggregate remaining
  let remaining = 0;
  s.participants.forEach(p => {
    if (s.paidBy === "me" && !p.isMe && !p.isPaid) remaining += p.share;
    if (s.paidBy === "them" && p.isMe && !p.isPaid) remaining += p.share;
  });

  const remainingText = s.isSettled
    ? `<span class="sp-settled-tag">${icon("check_circle")} Settled ${s.settledAt ? "on " + formatDate(new Date(s.settledAt).toISOString().slice(0, 10)) : ""}</span>`
    : (remaining > 0
        ? `<span class="sp-remaining">${s.paidBy === "me" ? "Still owed" : "You owe"}: <b class="tnum">${money(remaining)}</b></span>`
        : `<span class="sp-remaining">All paid · ready to settle</span>`);

  return `
    <div class="sp-card ${s.isSettled ? "settled" : ""}">
      <div class="sp-card-head">
        <div class="sp-ic ${sideCls}">${icon("group")}</div>
        <div class="sp-card-main">
          <div class="sp-card-title">${escapeHtml(s.title)}</div>
          <div class="sp-card-sub">${formatDate(s.date)} · ${escapeHtml(s.category)} · ${payerLbl}</div>
        </div>
        <div class="sp-total tnum ${sideCls}">${sign}${money(s.totalAmount)}</div>
      </div>
      ${partRows ? `<div class="sp-parts">${partRows}</div>` : ""}
      <div class="sp-card-foot">
        ${remainingText}
        <div class="sp-actions">
          ${!s.isSettled ? `<button class="btn-sm" data-sp-settle="${s.id}">${icon("done_all")} Settle all</button>` : ""}
          <button class="btn-sm del" data-sp-del="${s.id}">${icon("delete")} Delete</button>
        </div>
      </div>
      ${s.note ? `<div class="rec-note">${icon("notes")} ${escapeHtml(s.note)}</div>` : ""}
    </div>`;
}

/* ---------- Modal ---------- */

function openSplitModal() {
  modalOpen = true; modalKind = "split"; formError = ""; editingId = null;
  form = {
    title: "", totalAmount: "", date: todayStr(), category: "Other",
    paidBy: "me", payerName: "", splitType: "equal", note: "",
    participants: [
      { id: "_me_" + _newId(), name: "Me", isMe: true, share: 0 },
    ],
    _newName: "",
  };
  render();
}

/** Recalculate shares for equal split, or run total for custom split. */
function recomputeShares() {
  const total = Number(form.totalAmount) || 0;
  if (form.splitType === "equal") {
    const shares = calcEqualSplit(total, form.participants.length);
    form.participants.forEach((p, i) => { p.share = shares[i] || 0; });
  }
}

function splitModalHTML() {
  const cats = (CATEGORIES.expense || []);
  const catOpts = cats.map(c => `<option value="${c}" ${form.category === c ? "selected" : ""}>${c}</option>`).join("");

  recomputeShares();
  const enteredSum = form.participants.reduce((s, p) => s + (Number(p.share) || 0), 0);
  const total = Number(form.totalAmount) || 0;

  const partRows = form.participants.map((p, i) => `
    <div class="sp-edit-part">
      <span class="sp-edit-ic">${icon(p.isMe ? "person" : "person_outline")}</span>
      ${p.isMe
        ? `<span class="sp-edit-name">${escapeHtml(p.name)} (you)</span>`
        : `<input class="sp-edit-name-input" type="text" data-sp-pname="${i}" value="${escapeHtml(p.name)}" placeholder="Name" autocomplete="off" />`}
      ${form.splitType === "custom"
        ? `<input class="sp-edit-share" type="number" min="0" step="0.01" placeholder="0" data-sp-pshare="${i}" value="${p.share || ""}" />`
        : `<span class="sp-edit-share-disp tnum" data-sp-share-disp="${i}">${money(p.share)}</span>`}
      ${!p.isMe ? `<button type="button" class="icon-btn sp-rm" data-sp-premove="${i}" title="Remove">${icon("close")}</button>` : `<span style="width:32px"></span>`}
    </div>`).join("");

  return `
    <div class="modal-overlay" data-overlay>
      <div class="modal sp-modal">
        <div class="modal-head">
          <h2>${editingId ? "Edit" : "Add"} Split</h2>
          <button class="icon-btn" data-close>${icon("close")}</button>
        </div>
        <div class="modal-body">
          ${formError ? `<div class="form-error">${escapeHtml(formError)}</div>` : ""}

          <div class="field">
            <label>What is this split for?</label>
            <input id="f-sptitle" type="text" placeholder="e.g. Pizza Night, Goa Trip" value="${escapeHtml(form.title)}" />
          </div>
          <div class="row2">
            <div class="field"><label>Total Amount</label>
              <input id="f-spamount" type="number" min="0" step="0.01" placeholder="0.00" value="${escapeHtml(form.totalAmount)}" /></div>
            <div class="field"><label>Date</label>
              <input id="f-spdate" type="date" value="${escapeHtml(form.date)}" /></div>
          </div>

          <div class="field">
            <label>Category</label>
            <select id="f-spcat">${catOpts}</select>
          </div>

          <div class="field">
            <label>Who paid?</label>
            <div class="type-toggle">
              <button type="button" class="${form.paidBy === "me" ? "active income" : ""}" data-sp-paidby="me">${icon("person")} You paid</button>
              <button type="button" class="${form.paidBy === "them" ? "active expense" : ""}" data-sp-paidby="them">${icon("person_outline")} Someone else</button>
            </div>
          </div>

          ${form.paidBy === "them" ? `
            <div class="field">
              <label>Their name</label>
              <input id="f-sppayer" type="text" placeholder="e.g. Rahul" value="${escapeHtml(form.payerName)}" />
            </div>` : ""}

          <div class="field">
            <label>Split type</label>
            <div class="type-toggle">
              <button type="button" class="${form.splitType === "equal" ? "active income" : ""}" data-sp-stype="equal">${icon("balance")} Equal</button>
              <button type="button" class="${form.splitType === "custom" ? "active expense" : ""}" data-sp-stype="custom">${icon("tune")} Custom</button>
            </div>
          </div>

          <div class="field">
            <label>People (${form.participants.length})</label>
            <div class="sp-edit-list">${partRows}</div>
            <div class="sp-add-row">
              <input id="f-spnew" class="sp-new" type="text" placeholder="Add person by name…" value="${escapeHtml(form._newName || "")}" autocomplete="off" />
              <button type="button" class="btn-sm" data-sp-padd id="sp-add-btn" ${(form._newName || "").trim() ? "" : "disabled"}>${icon("add")} Add</button>
            </div>
            <div class="sp-totals">
              <span>Entered: <b id="sp-entered" class="tnum">${money(enteredSum)}</b></span>
              <span>Total: <b id="sp-totalDisp" class="tnum">${money(total)}</b></span>
              <span id="sp-balance">${splitBalanceBadge(total, enteredSum, form.splitType)}</span>
            </div>
          </div>

          <div class="field">
            <label>Note (optional)</label>
            <textarea id="f-spnote" placeholder="Add a note…">${escapeHtml(form.note || "")}</textarea>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn-ghost" data-close>Cancel</button>
          <button class="btn-primary" id="sp-create-btn" data-save ${splitCanSave(total, enteredSum, form.splitType) ? "" : "disabled"} title="${splitCanSave(total, enteredSum, form.splitType) ? "" : `Amounts must sum to ${money(total)}`}">${icon("check")} Create Split</button>
        </div>
      </div>
    </div>`;
}

/** Build the balance badge HTML (used both in initial render and live updates). */
function splitBalanceBadge(total, enteredSum, splitType) {
  if (splitType !== "custom" || !total) return "";
  const diff = Math.round((total - enteredSum) * 100) / 100;
  if (Math.abs(diff) <= 0.005) {
    return `<span class="sp-balanced">${icon("check_circle")} Balanced</span>`;
  }
  return `<span class="sp-mismatch">${icon("warning")} Off by ${money(Math.abs(diff))}</span>`;
}

/** Whether the Create button should be enabled. */
function splitCanSave(total, enteredSum, splitType) {
  if (!total || total <= 0) return false;
  if (splitType !== "custom") return true;
  return Math.abs(total - enteredSum) <= 0.01;
}

/** Live partial DOM updates for split modal — keeps focus, runs on every keystroke.
 *  Called from app.js on input events. Updates share displays (equal mode),
 *  entered sum, balance badge, Create button state, and Add button state. */
function liveSplitUI() {
  if (!form || modalKind !== "split") return;
  // Sync form values from DOM first
  readSplitForm();
  const total = Number(form.totalAmount) || 0;
  const splitType = form.splitType;

  let enteredSum = 0;
  if (splitType === "equal") {
    const shares = calcEqualSplit(total, form.participants.length);
    form.participants.forEach((p, i) => {
      p.share = shares[i] || 0;
      const cell = document.querySelector(`[data-sp-share-disp="${i}"]`);
      if (cell) cell.textContent = money(p.share);
    });
    enteredSum = shares.reduce((s, x) => s + x, 0);
  } else {
    document.querySelectorAll("[data-sp-pshare]").forEach(el => {
      enteredSum += Number(el.value) || 0;
    });
    enteredSum = Math.round(enteredSum * 100) / 100;
  }

  const enteredEl = document.getElementById("sp-entered");
  if (enteredEl) enteredEl.textContent = money(enteredSum);
  const totalEl = document.getElementById("sp-totalDisp");
  if (totalEl) totalEl.textContent = money(total);
  const balEl = document.getElementById("sp-balance");
  if (balEl) balEl.innerHTML = splitBalanceBadge(total, enteredSum, splitType);

  const createBtn = document.getElementById("sp-create-btn");
  if (createBtn) {
    const canSave = splitCanSave(total, enteredSum, splitType);
    createBtn.disabled = !canSave;
    createBtn.title = canSave ? "" : `Amounts must sum to ${money(total)}`;
  }

  const addBtn = document.getElementById("sp-add-btn");
  if (addBtn) addBtn.disabled = !(form._newName || "").trim();
}

/** Read all split-modal inputs into `form` (no re-render). */
function readSplitForm() {
  const $ = id => document.getElementById(id);
  if ($("f-sptitle"))  form.title       = $("f-sptitle").value;
  if ($("f-spamount")) form.totalAmount = $("f-spamount").value;
  if ($("f-spdate"))   form.date        = $("f-spdate").value;
  if ($("f-spcat"))    form.category    = $("f-spcat").value;
  if ($("f-sppayer"))  form.payerName   = $("f-sppayer").value;
  if ($("f-spnote"))   form.note        = $("f-spnote").value;
  if ($("f-spnew"))    form._newName    = $("f-spnew").value;

  // Read participant inline edits
  document.querySelectorAll("[data-sp-pname]").forEach(el => {
    const i = Number(el.getAttribute("data-sp-pname"));
    if (form.participants[i]) form.participants[i].name = el.value;
  });
  document.querySelectorAll("[data-sp-pshare]").forEach(el => {
    const i = Number(el.getAttribute("data-sp-pshare"));
    if (form.participants[i]) form.participants[i].share = Math.round((Number(el.value) || 0) * 100) / 100;
  });
}

/** Validate + persist the split form. */
function saveSplit() {
  readSplitForm();

  const total = Number(form.totalAmount) || 0;
  if (!form.title.trim())                              { formError = "Please enter a title.";                       render(); return; }
  if (!total || total <= 0)                            { formError = "Please enter a total amount greater than 0."; render(); return; }
  if (form.paidBy === "them" && !form.payerName.trim()) { formError = "Please enter who paid.";                     render(); return; }
  const others = form.participants.filter(p => !p.isMe);
  if (!others.length)                                  { formError = "Add at least one other person to split with."; render(); return; }
  if (others.some(p => !(p.name || "").trim()))        { formError = "Every person needs a name.";                  render(); return; }

  recomputeShares();
  if (form.splitType === "custom") {
    const sum = form.participants.reduce((s, p) => s + (Number(p.share) || 0), 0);
    if (Math.abs(total - sum) > 0.01)                  { formError = `Shares must sum to ${money(total)} (currently ${money(sum)}).`; render(); return; }
  }

  createSplit({
    title: form.title.trim(),
    totalAmount: total,
    date: form.date,
    category: form.category,
    paidBy: form.paidBy,
    payerName: form.payerName.trim(),
    splitType: form.splitType,
    note: form.note.trim(),
    participants: form.participants.map(p => ({
      id: p.id, name: (p.name || "").trim(), isMe: !!p.isMe, share: Number(p.share) || 0,
    })),
  });
  showToast("Split created");
  closeModal();
}

/* ---------- Dashboard widget ---------- */

function splitsDashboardHTML() {
  const sum = getSplitSummary();
  if (sum.activeCount === 0) return "";
  return `
    <div class="card sp-dash">
      <div class="card-head">
        <h3>${icon("group")} Splits</h3>
        <button class="link-btn" data-nav="splits">View →</button>
      </div>
      <div class="sp-dash-row"><span>Owed to you</span><b class="tnum sp-dash-owed">${money(sum.owedToMe)}</b></div>
      <div class="sp-dash-row"><span>You owe</span><b class="tnum sp-dash-owe">${money(sum.iOwe)}</b></div>
      <div class="sp-dash-row net ${sum.net >= 0 ? "pos" : "neg"}">
        <span>Net balance</span>
        <b class="tnum">${sum.net >= 0 ? "+" : ""}${money(sum.net)}</b>
      </div>
    </div>`;
}
