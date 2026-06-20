/**
 * Savings goals view + Add/Edit modal + Add-funds modal.
 * Goals use *manual* progress updates (Add Funds) — they aren't auto-derived
 * from transactions.
 */

/* ===== Helpers ===== */

/** Resolve a goal-color id (e.g. "emerald") to its color spec. */
function goalColor(id) { return GOAL_COLORS.find(c => c.id === id) || GOAL_COLORS[0]; }

/** Status chip + label based on completion percentage. */
function goalStatus(pct) {
  if (pct >= 100) return { chip: "green", label: "Completed!" };
  if (pct >= 75)  return { chip: "green", label: "Almost there!" };
  if (pct >= 50)  return { chip: "blue",  label: "Keep it up!" };
  if (pct >= 25)  return { chip: "blue",  label: "On track" };
  return            { chip: "amber", label: "Just started" };
}

/* ===== Page markup ===== */

function goalsHTML() {
  const goals = storage.get(KEYS.goals, []);

  let body;
  if (goals.length === 0) {
    body = `<div class="empty">${icon("flag")}No savings goals yet. Click “New Goal” to set your first milestone.</div>`;
  } else {
    body = `<div class="goal-grid">` + goals.map(g => {
      const col = goalColor(g.color);
      const pct = g.target > 0 ? (g.saved / g.target) * 100 : 0;
      const st  = goalStatus(pct);
      return `
        <div class="card goal-card" style="border-left-color:${col.hex}">
          <div class="goal-top">
            <div class="goal-id">
              <div class="goal-icon" style="background:${col.tint};color:${col.hex}">${icon(g.icon || "savings")}</div>
              <div><div class="goal-name">${escapeHtml(g.name)}</div><div class="goal-date">${formatMonth(g.date)}</div></div>
            </div>
            <div class="card-actions">
              <button class="icon-btn" data-gedit="${g.id}" title="Edit">${icon("edit")}</button>
              <button class="icon-btn" data-gdel="${g.id}" title="Delete">${icon("delete")}</button>
            </div>
          </div>
          <div class="goal-mid">
            <div>
              <div class="goal-amount tnum">${money(g.saved)}</div>
              <div class="goal-of">of ${money(g.target)} goal</div>
            </div>
            ${ringHTML(pct, col.hex)}
          </div>
          <div class="goal-foot">
            <span class="chip ${st.chip}">${st.label}</span>
            <button class="fund-btn" data-gfund="${g.id}">${icon("add_circle")} Add Funds</button>
          </div>
        </div>`;
    }).join("") + `</div>`;
  }

  return `
    <div class="page-head">
      <div><h1>Savings Goals</h1><p>Track your progress and achieve your financial milestones.</p></div>
      <button class="btn-primary" data-action="add-goal">${icon("add")} New Goal</button>
    </div>
    ${body}`;
}

/* ===== Add / Edit modal ===== */

function openGoalModal(id) {
  modalOpen = true; modalKind = "goal"; formError = ""; editingId = id || null;
  if (id) {
    const g = storage.get(KEYS.goals, []).find(x => x.id === id);
    form = g ? { ...g } : null;
  }
  if (!form) form = { name: "", icon: "savings", target: "", saved: "", date: "", color: "emerald" };
  render();
}

function goalModalHTML() {
  const iconOpts = GOAL_ICONS.map(i => `<option value="${i.v}" ${form.icon === i.v ? "selected" : ""}>${i.l}</option>`).join("");
  const swatches = GOAL_COLORS.map(c =>
    `<div class="swatch ${form.color === c.id ? "active" : ""}" style="background:${c.hex}" data-color="${c.id}" title="${c.id}"></div>`
  ).join("");

  return `
    <div class="modal-overlay" data-overlay>
      <div class="modal">
        <div class="modal-head">
          <h2>${editingId ? "Edit" : "New"} Goal</h2>
          <button class="icon-btn" data-close>${icon("close")}</button>
        </div>
        <div class="modal-body">
          ${formError ? `<div class="form-error">${escapeHtml(formError)}</div>` : ""}
          <div class="field"><label>Goal Name</label>
            <input id="f-gname" type="text" placeholder="e.g. Emergency Fund" value="${escapeHtml(form.name)}" /></div>
          <div class="row2">
            <div class="field"><label>Target Amount</label>
              <input id="f-gtarget" type="number" min="0" step="0.01" placeholder="0.00" value="${escapeHtml(form.target)}" /></div>
            <div class="field"><label>Already Saved</label>
              <input id="f-gsaved" type="number" min="0" step="0.01" placeholder="0.00" value="${escapeHtml(form.saved)}" /></div>
          </div>
          <div class="row2">
            <div class="field"><label>Target Date</label>
              <input id="f-gdate" type="date" value="${escapeHtml(form.date)}" /></div>
            <div class="field"><label>Icon</label><select id="f-gicon">${iconOpts}</select></div>
          </div>
          <div class="field"><label>Color</label><div class="color-pick">${swatches}</div></div>
        </div>
        <div class="modal-foot">
          <button class="btn-ghost" data-close>Cancel</button>
          <button class="btn-primary" data-save>${icon("check")} ${editingId ? "Save Changes" : "Create Goal"}</button>
        </div>
      </div>
    </div>`;
}

function saveGoal() {
  readForm();
  if (!form.name.trim())                         { formError = "Please enter a goal name.";                       render(); return; }
  if (!form.target || Number(form.target) <= 0)  { formError = "Please enter a target amount greater than 0.";    render(); return; }

  const saved = Number(form.saved || 0);
  const list = storage.get(KEYS.goals, []);
  if (editingId) {
    const i = list.findIndex(x => x.id === editingId);
    if (i !== -1) list[i] = { ...list[i], name: form.name.trim(), icon: form.icon, target: Number(form.target), saved, date: form.date, color: form.color };
  } else {
    list.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      name: form.name.trim(), icon: form.icon, target: Number(form.target), saved,
      date: form.date, color: form.color,
    });
  }
  storage.save(KEYS.goals, list);
  closeModal();
}

function deleteGoal(id) {
  if (!confirm("Delete this goal?")) return;
  storage.save(KEYS.goals, storage.get(KEYS.goals, []).filter(x => x.id !== id));
  render();
}

/* ===== Add-funds modal ===== */

function openFundsModal(id) {
  modalOpen = true; modalKind = "funds"; formError = ""; editingId = id;
  form = { amount: "" };
  render();
}

function fundsModalHTML() {
  const g = storage.get(KEYS.goals, []).find(x => x.id === editingId);
  if (!g) return "";
  const remaining = Math.max(0, g.target - g.saved);
  return `
    <div class="modal-overlay" data-overlay>
      <div class="modal">
        <div class="modal-head">
          <h2>Add Funds</h2>
          <button class="icon-btn" data-close>${icon("close")}</button>
        </div>
        <div class="modal-body">
          ${formError ? `<div class="form-error">${escapeHtml(formError)}</div>` : ""}
          <div class="funds-info"><b>${escapeHtml(g.name)}</b> — ${money(g.saved)} of ${money(g.target)} saved. ${money(remaining)} to go.</div>
          <div class="field"><label>Amount to Add</label>
            <input id="f-famount" type="number" min="0" step="0.01" placeholder="0.00" value="${escapeHtml(form.amount)}" /></div>
        </div>
        <div class="modal-foot">
          <button class="btn-ghost" data-close>Cancel</button>
          <button class="btn-primary" data-save>${icon("add_circle")} Add Funds</button>
        </div>
      </div>
    </div>`;
}

function addFunds() {
  readForm();
  if (!form.amount || Number(form.amount) <= 0) {
    formError = "Please enter an amount greater than 0."; render(); return;
  }
  const list = storage.get(KEYS.goals, []);
  const i = list.findIndex(x => x.id === editingId);
  if (i !== -1) {
    list[i].saved = Number(list[i].saved || 0) + Number(form.amount);
    storage.save(KEYS.goals, list);
  }
  closeModal();
}
