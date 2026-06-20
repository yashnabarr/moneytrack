/**
 * "Open in new tab" helper for help / privacy / terms / contact pages.
 * Pages are generated as a standalone HTML blob and opened via
 * window.open(..., "noopener,noreferrer") so they're safe to share.
 */

function openDocPage(title, bodyHtml) {
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>${title} — PockIt</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
    <style>
      body{font-family:Inter,system-ui,sans-serif;background:#f4fbf4;color:#161d19;margin:0;line-height:1.6;}
      .wrap{max-width:760px;margin:0 auto;padding:48px 24px;}
      .brand{display:flex;align-items:center;gap:10px;font-weight:700;color:#006c49;font-size:22px;margin-bottom:24px;}
      h1{font-size:32px;letter-spacing:-.01em;}
      h2{font-size:20px;margin-top:28px;}
      p,li{color:#3c4a42;}
      a{color:#006c49;}
      .card{background:#fff;border:1px solid #bbcabf55;border-radius:16px;padding:24px;box-shadow:0 4px 20px rgba(0,0,0,.05);}
    </style></head>
    <body><div class="wrap">
      <div class="brand">${brandMark(36)} PockIt</div>
      <div class="card">${bodyHtml}</div>
      <p style="text-align:center;color:#6c7a71;font-size:13px;margin-top:24px;">© 2026 PockIt Personal Finance.</p>
    </div></body></html>`;
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Doc page content keyed by short id. */
const DOCS = {
  help: ["Help & Support", `<h1>Help &amp; Support</h1>
    <p>Welcome to the PockIt Help Center. Here are answers to common questions.</p>
    <h2>Getting started</h2>
    <p>Use the sidebar to move between Dashboard, Transactions, Budgets, Savings Goals, Analytics and Reports.</p>
    <h2>Adding a transaction</h2>
    <p>Open <b>Transactions</b> and click <b>Add Transaction</b>. Choose income or expense, fill in the amount, category and date, then save.</p>
    <h2>Budgets &amp; Goals</h2>
    <p>Set monthly limits in <b>Budgets</b>; spending is tracked automatically. Create savings targets in <b>Savings Goals</b> and use <b>Add Funds</b> to log progress.</p>
    <h2>Your data</h2>
    <p>All data is stored privately in your browser. Use <b>Analytics → Export CSV</b> to back it up.</p>
    <h2>Contact</h2>
    <p>Need more help? Email <a href="mailto:support@pockit.example">support@pockit.example</a>.</p>`],
  privacy: ["Privacy Policy", `<h1>Privacy Policy</h1><p>PockIt stores all of your financial data locally in your own browser using <b>localStorage</b>. We do not collect, transmit, or sell your data.</p><h2>What we store</h2><p>Transactions, budgets, goals, and your sign-in name — all on your device only.</p><h2>Your control</h2><p>You can clear all data at any time from Settings, or by clearing your browser storage.</p>`],
  terms: ["Terms of Service", `<h1>Terms of Service</h1><p>PockIt is provided as-is for personal finance tracking. By using it you agree to use it responsibly.</p><h2>No financial advice</h2><p>PockIt is a tracking tool and does not provide financial, tax, or investment advice.</p>`],
  contact: ["Contact Us", `<h1>Contact Us</h1><p>We'd love to hear from you.</p><h2>Support</h2><p><a href="mailto:support@pockit.example">support@pockit.example</a></p><h2>Sales</h2><p><a href="mailto:hello@pockit.example">hello@pockit.example</a></p>`],
};

/** Open a doc page by key in a new tab. */
function openDoc(key) {
  const d = DOCS[key];
  if (d) openDocPage(d[0], d[1]);
}

/** Wire every `[data-doc]` element under `root` to open its doc in a new tab. */
function wireDocLinks(root) {
  root.querySelectorAll("[data-doc]").forEach(b =>
    b.addEventListener("click", e => { e.preventDefault(); openDoc(b.getAttribute("data-doc")); })
  );
}
