/**
 * "Open in new tab" helper for help / privacy / terms / contact pages.
 * Each page is a self-contained HTML blob: shared theme CSS, scroll-reveal
 * IntersectionObserver, accordion logic — all inlined so the blob URL
 * works completely offline with zero asset dependencies.
 */

/* ===== Shared CSS for all doc pages (light + dark, animations, cards) ===== */
const DOC_CSS = `
  :root {
    --bg:#f4fbf4; --card:#ffffff; --text:#161d19; --muted:#5e6c64;
    --brand:#006c49; --brand-soft:#10b981; --accent:#4edea3;
    --border:rgba(28,40,33,.08); --border-strong:rgba(28,40,33,.14);
    --shadow:0 4px 20px rgba(0,0,0,.06); --shadow-lg:0 12px 40px rgba(0,0,0,.10);
    --radius:16px;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg:#0b1326; --card:#151d31; --text:#dae2fd; --muted:#aeb9cb;
      --brand:#4edea3; --brand-soft:#10b981; --accent:#74f8c0;
      --border:rgba(255,255,255,.08); --border-strong:rgba(255,255,255,.14);
      --shadow:0 6px 24px rgba(0,0,0,.45); --shadow-lg:0 18px 50px rgba(0,0,0,.55);
    }
  }
  * { box-sizing:border-box; margin:0; padding:0; }
  html { scroll-behavior:smooth; }
  body {
    font-family:Inter,system-ui,sans-serif;
    background:var(--bg); color:var(--text);
    line-height:1.65; font-size:16px; min-height:100vh;
  }
  a { color:var(--brand); text-decoration:none; }
  a:hover { text-decoration:underline; }

  /* Page chrome */
  .page-shell { max-width:1080px; margin:0 auto; padding:32px 24px 80px; }
  .topbar {
    display:flex; align-items:center; justify-content:space-between;
    padding-bottom:24px; margin-bottom:32px;
    border-bottom:1px solid var(--border);
  }
  .brand { display:flex; align-items:center; gap:10px; font-weight:700; color:var(--brand); font-size:22px; }
  .back-link {
    display:inline-flex; align-items:center; gap:6px;
    color:var(--muted); font-size:14px; font-weight:500;
  }
  .back-link:hover { color:var(--brand); text-decoration:none; }

  /* Hero / page header */
  .doc-hero {
    text-align:center; padding:48px 16px 40px;
    background:radial-gradient(ellipse at 50% 0%, rgba(16,185,129,.14), transparent 60%);
    border-radius:24px; margin-bottom:40px;
  }
  .doc-hero .eyebrow {
    display:inline-flex; align-items:center; gap:6px;
    padding:6px 14px; border-radius:9999px;
    background:rgba(16,185,129,.12); color:var(--brand);
    font-size:13px; font-weight:600; margin-bottom:16px;
  }
  .doc-hero h1 {
    font-size:clamp(32px, 5vw, 48px);
    font-weight:700; letter-spacing:-.02em; line-height:1.15;
    margin-bottom:14px;
  }
  .doc-hero h1 .accent { color:var(--brand); }
  .doc-hero p {
    font-size:18px; color:var(--muted); max-width:640px; margin:0 auto;
  }

  /* Layout — two-col with sidebar TOC */
  .doc-layout { display:grid; grid-template-columns:240px 1fr; gap:48px; align-items:start; }
  @media (max-width: 880px) { .doc-layout { grid-template-columns:1fr; gap:24px; } }

  .toc { position:sticky; top:24px; }
  .toc-card {
    background:var(--card); border:1px solid var(--border);
    border-radius:var(--radius); padding:20px;
    box-shadow:var(--shadow);
  }
  .toc h4 {
    font-size:12px; font-weight:700; letter-spacing:.08em;
    color:var(--muted); margin-bottom:12px; text-transform:uppercase;
  }
  .toc ul { list-style:none; }
  .toc a {
    display:flex; align-items:center; gap:8px;
    padding:8px 10px; border-radius:8px;
    font-size:14px; color:var(--muted); font-weight:500;
    transition:background .2s, color .2s;
  }
  .toc a:hover { background:rgba(16,185,129,.08); color:var(--brand); text-decoration:none; }
  .toc a.active { background:rgba(16,185,129,.14); color:var(--brand); }
  @media (max-width: 880px) { .toc { position:static; } }

  /* Cards (Privacy / Terms / Help sections) */
  .doc-section {
    background:var(--card); border:1px solid var(--border);
    border-radius:var(--radius); padding:24px 28px;
    box-shadow:var(--shadow); margin-bottom:20px;
    scroll-margin-top:24px;
    transition:box-shadow .25s ease, border-color .25s ease, transform .25s ease;
  }
  .doc-section:hover { box-shadow:var(--shadow-lg); border-color:var(--border-strong); }
  .doc-section-head {
    display:flex; align-items:center; gap:14px; margin-bottom:14px;
  }
  .doc-num {
    width:36px; height:36px; flex-shrink:0;
    border-radius:10px; display:flex; align-items:center; justify-content:center;
    background:linear-gradient(135deg, var(--brand-soft), var(--accent));
    color:#00382a; font-weight:700; font-size:15px;
  }
  .doc-section h2 { font-size:22px; font-weight:700; letter-spacing:-.01em; }
  .doc-section p { color:var(--muted); margin-bottom:10px; }
  .doc-section p:last-child { margin-bottom:0; }
  .doc-section ul { padding-left:20px; margin:8px 0; }
  .doc-section li { color:var(--muted); margin-bottom:6px; }
  .doc-section b { color:var(--text); font-weight:600; }

  /* Accordion variant (Help) */
  details.acc {
    background:var(--card); border:1px solid var(--border);
    border-radius:var(--radius); margin-bottom:12px;
    box-shadow:var(--shadow); overflow:hidden;
    transition:box-shadow .25s ease, border-color .25s ease;
  }
  details.acc:hover { border-color:var(--border-strong); box-shadow:var(--shadow-lg); }
  details.acc[open] { border-color:var(--brand); }
  details.acc > summary {
    display:flex; align-items:center; gap:14px;
    padding:18px 22px; cursor:pointer; font-weight:600; font-size:16px;
    list-style:none;
  }
  details.acc > summary::-webkit-details-marker { display:none; }
  details.acc .chev {
    margin-left:auto; transition:transform .3s cubic-bezier(.22,.61,.36,1);
    font-size:22px; color:var(--muted);
  }
  details.acc[open] .chev { transform:rotate(180deg); }
  details.acc .acc-body { padding:0 22px 20px 70px; color:var(--muted); }
  details.acc .acc-body p { margin-bottom:8px; }

  /* Contact cards */
  .contact-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:20px; margin-bottom:32px; }
  .contact-card {
    background:var(--card); border:1px solid var(--border);
    border-radius:var(--radius); padding:28px 24px;
    box-shadow:var(--shadow); text-decoration:none;
    display:flex; flex-direction:column; gap:8px;
    transition:transform .25s ease, box-shadow .25s ease, border-color .25s ease;
  }
  .contact-card:hover {
    transform:translateY(-4px); box-shadow:var(--shadow-lg);
    border-color:var(--brand); text-decoration:none;
  }
  .contact-icon {
    width:48px; height:48px; border-radius:14px;
    display:flex; align-items:center; justify-content:center;
    background:linear-gradient(135deg, var(--brand-soft), var(--accent));
    color:#00382a; margin-bottom:6px; font-size:24px;
  }
  .contact-card h3 { font-size:18px; font-weight:700; color:var(--text); }
  .contact-card .ct-sub { font-size:14px; color:var(--muted); }
  .contact-card .ct-value { font-size:15px; color:var(--brand); font-weight:600; margin-top:auto; padding-top:10px; }

  /* Help search */
  .help-search {
    display:flex; align-items:center; gap:10px;
    padding:14px 18px; border-radius:14px;
    background:var(--card); border:1px solid var(--border);
    box-shadow:var(--shadow); margin-bottom:24px;
  }
  .help-search input {
    flex:1; border:0; outline:0; background:transparent;
    font-family:inherit; font-size:15px; color:var(--text);
  }
  .help-search svg { color:var(--muted); flex-shrink:0; }
  .help-search input::placeholder { color:var(--muted); }
  .help-empty {
    text-align:center; padding:32px; color:var(--muted);
    border:1px dashed var(--border-strong); border-radius:var(--radius);
  }

  /* CTA buttons */
  .doc-cta {
    display:inline-flex; align-items:center; gap:8px;
    background:var(--brand); color:#00382a;
    padding:12px 24px; border-radius:9999px;
    font-weight:600; font-size:15px; border:0; cursor:pointer;
    font-family:inherit; transition:transform .2s ease, box-shadow .2s ease;
  }
  .doc-cta:hover { transform:translateY(-2px); box-shadow:0 8px 20px rgba(16,185,129,.4); text-decoration:none; }

  /* Footer */
  .doc-foot {
    text-align:center; color:var(--muted); font-size:13px;
    margin-top:48px; padding-top:24px; border-top:1px solid var(--border);
  }

  /* Reveal-on-scroll */
  .reveal {
    opacity:0; transform:translateY(28px);
    transition:opacity .65s cubic-bezier(.22,.61,.36,1), transform .75s cubic-bezier(.22,.61,.36,1);
  }
  .reveal.in { opacity:1; transform:translateY(0); }
  @media (prefers-reduced-motion: reduce) {
    .reveal { opacity:1 !important; transform:none !important; transition:none !important; }
    html { scroll-behavior:auto; }
  }
`;

/* ===== Shared boot script for all doc pages (reveal-on-scroll, TOC scrollspy, help search) ===== */
const DOC_BOOT = `
  // Reveal on scroll
  const io = new IntersectionObserver((ents, obs) => {
    ents.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); } });
  }, { threshold:.12, rootMargin:'0px 0px -6% 0px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  // TOC scrollspy
  const links = document.querySelectorAll('.toc a[href^="#"]');
  if (links.length) {
    const map = new Map();
    links.forEach(a => { const id = a.getAttribute('href').slice(1); const sec = document.getElementById(id); if (sec) map.set(sec, a); });
    const spy = new IntersectionObserver(ents => {
      ents.forEach(e => {
        const a = map.get(e.target);
        if (!a) return;
        if (e.isIntersecting) {
          links.forEach(l => l.classList.remove('active'));
          a.classList.add('active');
        }
      });
    }, { rootMargin:'-40% 0px -55% 0px', threshold:0 });
    map.forEach((_, sec) => spy.observe(sec));
  }

  // Help search filter
  const helpInput = document.getElementById('helpSearch');
  if (helpInput) {
    helpInput.addEventListener('input', () => {
      const q = helpInput.value.trim().toLowerCase();
      let any = false;
      document.querySelectorAll('[data-faq]').forEach(item => {
        const text = item.getAttribute('data-faq').toLowerCase();
        const match = !q || text.includes(q);
        item.style.display = match ? '' : 'none';
        if (match) any = true;
      });
      const empty = document.getElementById('helpEmpty');
      if (empty) empty.style.display = any ? 'none' : 'block';
    });
  }
`;

/** Icon helper for inline SVG (Material Symbols not available in the standalone blob). */
function docIcon(path) {
  return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}
const SVG_MAIL    = docIcon(`<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>`);
const SVG_CHAT    = docIcon(`<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>`);
const SVG_BRIEF   = docIcon(`<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>`);
const SVG_SEARCH  = docIcon(`<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>`);
const SVG_BACK    = docIcon(`<path d="m15 18-6-6 6-6"/>`);
const SVG_SHIELD  = docIcon(`<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>`);
const SVG_LOCK    = docIcon(`<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>`);
const SVG_USER    = docIcon(`<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>`);
const SVG_FILE    = docIcon(`<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>`);
const SVG_GAVEL   = docIcon(`<path d="m14 14-7.5 7.5L3 18l7.5-7.5"/><path d="m14 14 4-4"/><path d="m11 11 4-4"/><path d="m21 14-7-7"/>`);
const SVG_INFO    = docIcon(`<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>`);
const SVG_ROCKET  = docIcon(`<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>`);
const SVG_PLUS    = docIcon(`<path d="M5 12h14M12 5v14"/>`);
const SVG_TARGET  = docIcon(`<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>`);
const SVG_CHART   = docIcon(`<path d="M3 3v18h18"/><path d="m7 14 4-4 4 4 5-5"/>`);
const SVG_DB      = docIcon(`<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>`);
const SVG_SETTINGS = docIcon(`<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>`);
const SVG_HELP_Q  = docIcon(`<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/>`);

/** Render a numbered card section. */
function docCardSection(num, title, html) {
  return `
    <section class="doc-section reveal" id="sec-${num}">
      <div class="doc-section-head">
        <div class="doc-num">${num}</div>
        <h2>${title}</h2>
      </div>
      ${html}
    </section>`;
}

/** Render an accordion item (Help). */
function docAcc(title, body, searchKey) {
  return `
    <details class="acc reveal" data-faq="${searchKey || title.toLowerCase()}">
      <summary>
        <span style="color:var(--brand)">${SVG_HELP_Q}</span>
        <span>${title}</span>
        <svg class="chev" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </summary>
      <div class="acc-body">${body}</div>
    </details>`;
}

/** Wrap the inner page in the shared shell + open it in a new tab. */
function openDocPage(title, bodyHtml) {
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>${title} — PockIt</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
    <style>${DOC_CSS}</style></head>
    <body>
      <div class="page-shell">
        <header class="topbar">
          <div class="brand">${brandMark(36)} PockIt</div>
          <a class="back-link" href="javascript:window.close()">${SVG_BACK} Close tab</a>
        </header>
        ${bodyHtml}
        <div class="doc-foot">© 2026 PockIt Personal Finance · <a href="javascript:window.close()">Close window</a></div>
      </div>
      <script>${DOC_BOOT}<\/script>
    </body></html>`;
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* ===== Page builders ===== */

function buildContactBody() {
  return `
    <section class="doc-hero reveal">
      <span class="eyebrow">${SVG_CHAT} We're here to help</span>
      <h1>Get in <span class="accent">touch.</span></h1>
      <p>Whether you have a question, found a bug, or want to suggest a feature — our team would love to hear from you.</p>
    </section>

    <div class="contact-grid">
      <a class="contact-card reveal" href="mailto:support@pockit.example?subject=PockIt%20Support">
        <div class="contact-icon">${SVG_MAIL}</div>
        <h3>Customer Support</h3>
        <p class="ct-sub">For help with your account, transactions, sync issues or anything that's not working as expected.</p>
        <span class="ct-value">support@pockit.example</span>
      </a>
      <a class="contact-card reveal" href="mailto:hello@pockit.example?subject=PockIt%20Sales">
        <div class="contact-icon">${SVG_BRIEF}</div>
        <h3>Sales &amp; Partnerships</h3>
        <p class="ct-sub">For business inquiries, partnership proposals, and bulk-licensing opportunities.</p>
        <span class="ct-value">hello@pockit.example</span>
      </a>
      <a class="contact-card reveal" href="mailto:press@pockit.example?subject=PockIt%20Press">
        <div class="contact-icon">${SVG_CHAT}</div>
        <h3>Press &amp; Media</h3>
        <p class="ct-sub">For interview requests, press kits, and quotes from the PockIt team.</p>
        <span class="ct-value">press@pockit.example</span>
      </a>
    </div>

    <section class="doc-section reveal">
      <div class="doc-section-head">
        <div class="doc-num">${SVG_INFO}</div>
        <h2>Before you write</h2>
      </div>
      <p>You might find a faster answer in our help center — most common questions are documented there.</p>
      <p style="margin-top:14px"><a class="doc-cta" href="javascript:window.close()">${SVG_BACK} Back to PockIt</a></p>
    </section>`;
}

function buildPrivacyBody() {
  const sections = [
    ["Overview",            `<p>This Privacy Policy explains what data PockIt collects, how it is stored, and the control you have over it. PockIt is designed to be <b>privacy-first</b> — your financial data lives on your device by default.</p>`],
    ["What we store",       `<p>When you use PockIt as a guest, the following data is stored <b>only in your browser's localStorage</b>:</p><ul><li>Transactions (income and expenses)</li><li>Budgets (per-category monthly limits)</li><li>Savings goals (targets, progress, dates)</li><li>Your chosen country &amp; currency</li><li>UI preferences (theme, date format)</li></ul><p>If you create an account, the same data is also synced to our PostgreSQL database (Neon) under your user id so it follows you across devices.</p>`],
    ["What we don't do",    `<p>PockIt does <b>not</b> sell, share, or monetize your data. We do not run third-party trackers, ad networks, or analytics that profile you. There is no advertising, no behavioral targeting, no data resale — ever.</p>`],
    ["Your control",        `<p>You are always in control of your data:</p><ul><li>Export everything as JSON or CSV from <b>Settings → Data management</b></li><li>Wipe local data instantly with <b>Settings → Clear all data</b></li><li>Delete your account to remove all server-side data</li></ul>`],
    ["Cookies &amp; sessions", `<p>We use a small set of localStorage keys (prefixed <code>mt_</code>) and, if signed in, JWT access &amp; refresh tokens for authentication. No third-party cookies.</p>`],
    ["Contact",             `<p>Questions about this policy? Email <a href="mailto:support@pockit.example">support@pockit.example</a>.</p>`],
  ];
  return `
    <section class="doc-hero reveal">
      <span class="eyebrow">${SVG_SHIELD} Last updated: June 2026</span>
      <h1>Privacy <span class="accent">Policy.</span></h1>
      <p>Your financial data is yours. We've designed PockIt around that principle from day one.</p>
    </section>

    <div class="doc-layout">
      <aside class="toc reveal">
        <div class="toc-card">
          <h4>On this page</h4>
          <ul>
            ${sections.map((s, i) => `<li><a href="#sec-${i + 1}">${s[0]}</a></li>`).join("")}
          </ul>
        </div>
      </aside>
      <div>
        ${sections.map((s, i) => docCardSection(i + 1, s[0], s[1])).join("")}
      </div>
    </div>`;
}

function buildTermsBody() {
  const sections = [
    ["Acceptance",         `<p>By using PockIt (the "Service") you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service.</p>`],
    ["The Service",        `<p>PockIt is a personal-finance tracking application provided <b>as-is</b> for personal, non-commercial use. The Service includes a web app, optional account &amp; sync, and supporting infrastructure.</p>`],
    ["Your account",       `<p>If you create an account, you are responsible for keeping your credentials secure and for all activity under your account. You may close your account at any time from <b>Settings</b>.</p>`],
    ["Acceptable use",     `<p>You agree not to use the Service to violate any law, infringe on others' rights, or attempt to disrupt the Service. Automated scraping, reverse engineering, and abusive request patterns are not permitted.</p>`],
    ["No financial advice",`<p>PockIt is a <b>tracking tool</b> only. It does not provide financial, tax, investment, or legal advice. Decisions you make based on data shown in the Service are entirely your own.</p>`],
    ["Limitation of liability", `<p>To the maximum extent permitted by law, PockIt and its operators are not liable for any indirect, incidental, or consequential damages arising from your use of the Service.</p>`],
    ["Changes",            `<p>We may update these Terms occasionally. Continued use of the Service after a change constitutes acceptance of the new Terms.</p>`],
  ];
  return `
    <section class="doc-hero reveal">
      <span class="eyebrow">${SVG_GAVEL} Effective: June 2026</span>
      <h1>Terms of <span class="accent">Service.</span></h1>
      <p>The straightforward rules for using PockIt — written in plain English, not legalese.</p>
    </section>

    <div class="doc-layout">
      <aside class="toc reveal">
        <div class="toc-card">
          <h4>On this page</h4>
          <ul>
            ${sections.map((s, i) => `<li><a href="#sec-${i + 1}">${s[0]}</a></li>`).join("")}
          </ul>
        </div>
      </aside>
      <div>
        ${sections.map((s, i) => docCardSection(i + 1, s[0], s[1])).join("")}
      </div>
    </div>`;
}

function buildHelpBody() {
  const faqs = [
    ["How do I add my first transaction?",      `<p>Open <b>Transactions</b> from the sidebar and click <b>Add Transaction</b>. Choose income or expense, enter the amount, category and date, then save. It appears instantly on your dashboard.</p>`],
    ["How are budgets tracked?",                `<p>Set a monthly limit per category in <b>Budgets</b>. As you log expenses, PockIt matches them to the right category and updates the progress bar automatically. You'll see a warning chip when you cross 80% of a limit.</p>`],
    ["How do savings goals work?",              `<p>Create a target in <b>Savings Goals</b> with a name, amount, optional date and a color. Use <b>Add Funds</b> to log contributions — the ring fills as you get closer to the target.</p>`],
    ["Where is my data stored?",                `<p>Your data lives privately in your browser via <b>localStorage</b>. If you create an account, it also syncs securely to your PockIt profile so it follows you across devices.</p>`],
    ["Can I export or back up my data?",        `<p>Yes. Go to <b>Settings → Data management</b>. You can export transactions as CSV for spreadsheets, or download a complete JSON backup you can restore later.</p>`],
    ["How do I change my currency?",            `<p>Open <b>Settings → Preferences → Currency &amp; region</b> and click <b>Change</b>. Pick your country and every amount across the app reformats instantly.</p>`],
    ["How do I switch to dark mode?",           `<p>Use the sun/moon icon in the topbar (or on the landing page nav). Your choice is persisted across visits. You can also set <b>System</b> in <b>Settings → Preferences → Theme</b> to follow your OS.</p>`],
    ["I forgot my password — what now?",        `<p>Email <a href="mailto:support@pockit.example">support@pockit.example</a> with your registered email and we'll send you a reset link. Password reset directly from the app is coming soon.</p>`],
  ];
  return `
    <section class="doc-hero reveal">
      <span class="eyebrow">${SVG_HELP_Q} Help center</span>
      <h1>How can we <span class="accent">help?</span></h1>
      <p>Search our guides or browse the most common questions below.</p>
    </section>

    <div class="help-search reveal">
      ${SVG_SEARCH}
      <input id="helpSearch" type="text" placeholder="Search help articles…" autocomplete="off">
    </div>

    <div>
      ${faqs.map(f => docAcc(f[0], f[1], f[0] + " " + f[1].replace(/<[^>]+>/g, ""))).join("")}
      <div id="helpEmpty" class="help-empty reveal" style="display:none">
        No results match your search. Try a different keyword or <a href="mailto:support@pockit.example">contact support</a>.
      </div>
    </div>

    <section class="doc-section reveal" style="margin-top:24px">
      <div class="doc-section-head">
        <div class="doc-num">${SVG_MAIL}</div>
        <h2>Still need help?</h2>
      </div>
      <p>Reach our team directly and we'll respond within 24 hours.</p>
      <p style="margin-top:14px"><a class="doc-cta" href="mailto:support@pockit.example?subject=PockIt%20Support%20Request">${SVG_MAIL} Email support</a></p>
    </section>`;
}

/** Doc page registry. */
const DOCS = {
  help:    ["Help & Support",    buildHelpBody],
  privacy: ["Privacy Policy",    buildPrivacyBody],
  terms:   ["Terms of Service",  buildTermsBody],
  contact: ["Contact Us",        buildContactBody],
};

/** Open a doc page by key in a new tab. */
function openDoc(key) {
  const d = DOCS[key];
  if (d) openDocPage(d[0], d[1]());
}

/** Wire every `[data-doc]` element under `root` to open its doc in a new tab. */
function wireDocLinks(root) {
  root.querySelectorAll("[data-doc]").forEach(b =>
    b.addEventListener("click", e => { e.preventDefault(); openDoc(b.getAttribute("data-doc")); })
  );
}
