/**
 * Landing page — hero, features, awards, "users love" grid,
 * 3-step "money into shape" section, CTA and multi-column footer.
 */

function landingHTML() {
  const auth = getAuth();
  const authButtons = auth
    ? `<button class="btn-pill" data-enter-app>${icon("dashboard")} Open App</button>
       <button class="btn-outline" data-logout>Log out</button>`
    : `<button class="btn-outline" data-auth="signin">Sign In</button>
       <button class="btn-pill" data-auth="signup">Sign Up</button>`;

  const mockBar = (h, c) => `<span style="height:${h}%;background:${c}"></span>`;

  return `
    <header class="lp-header">
      <div class="lp-nav">
        <div class="lp-brand">${brandMark(38)} PockIt</div>
        <nav class="lp-links">
          <a href="#features">Features</a>
          <a data-doc="help" href="#" role="link">Help</a>
        </nav>
        <div class="lp-actions">
          <button class="icon-btn-lg lp-theme" data-theme-toggle title="Toggle theme" aria-label="Toggle light/dark theme">${icon(isDarkActive() ? "light_mode" : "dark_mode")}</button>
          ${authButtons}
        </div>
      </div>
    </header>
    <main class="landing">
      <section class="hero">
        <div class="hero-glow"></div>
        <div class="hero-grid">
          <div>
            <span class="badge-pill"><span class="badge-dot"></span> New: AI-Powered Insights</span>
            <h1>Take Control of Your Money.<br/><span class="accent">Build Your Financial Future.</span></h1>
            <p class="lead">Experience the ultimate clarity in wealth management. PockIt combines high-end analytics with effortless expense tracking to accelerate your path to financial freedom.</p>
            <div class="hero-cta">
              <button class="btn-hero primary" data-auth="signup">Sign Up Free</button>
              <button class="btn-hero ghost" data-guest>Continue as Guest</button>
            </div>
            <div class="social-proof">
              <div class="avatars">
                <div class="av" style="background:#dae2fd;color:#3f465c">A</div>
                <div class="av" style="background:#d7f0e4;color:#00422b">B</div>
                <div class="av" style="background:#e7ddff;color:#3a1f7a">C</div>
                <div class="av" style="background:var(--secondary-container);color:var(--on-secondary-container);font-size:12px">+10k</div>
              </div>
              <div>
                <div class="stars">★★★★★</div>
                <div class="proof-text">Trusted by professionals</div>
              </div>
            </div>
          </div>
          <div class="hero-visual">
            <div class="mockup float">
              <div class="mockup-bar">
                <span class="dot" style="background:var(--error)"></span>
                <span class="dot" style="background:var(--primary-container)"></span>
                <span class="dot" style="background:var(--primary)"></span>
              </div>
              <div class="mockup-body">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
                  <div class="mock-stat">
                    <div style="font-size:12px;color:var(--on-surface-variant)">Balance</div>
                    <div style="font-size:20px;font-weight:700">${moneyShort(34892)}</div>
                  </div>
                  <div class="mock-stat">
                    <div style="font-size:12px;color:var(--on-surface-variant)">Savings</div>
                    <div style="font-size:20px;font-weight:700;color:var(--primary)">${moneyShort(2150)}</div>
                  </div>
                </div>
                <div class="mock-bars">
                  ${mockBar(40, "#10b981")}${mockBar(70, "#006c49")}${mockBar(55, "#10b981")}${mockBar(90, "#006c49")}${mockBar(60, "#10b981")}${mockBar(80, "#006c49")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="features" id="features">
        <div class="features-inner">
          <h2>Unrivaled Financial Clarity</h2>
          <p class="sub">Everything you need to manage your wealth, organized beautifully.</p>
          <div class="feature-grid">
            <div class="feature-card">
              <div class="feature-icon" style="background:rgba(16,185,129,.18);color:var(--primary)">${icon("receipt_long")}</div>
              <h3>Expense Tracking</h3><p>Record and categorize your spending with clarity and precision.</p>
            </div>
            <div class="feature-card">
              <div class="feature-icon" style="background:rgba(113,161,255,.22);color:var(--tertiary)">${icon("account_balance_wallet")}</div>
              <h3>Income Management</h3><p>Track multiple revenue streams and watch your balance grow.</p>
            </div>
            <div class="feature-card">
              <div class="feature-icon" style="background:rgba(0,108,73,.1);color:var(--primary)">${icon("pie_chart")}</div>
              <h3>Smart Budgets</h3><p>Set limits per category and stay on top of your spending habits.</p>
            </div>
          </div>
        </div>
      </section>

      <section class="awards">
        <div class="awards-inner">
          <div class="award">${icon("workspace_premium")}<h4>4.8 / 5 user rating</h4><p>Across 10,000+ active users.</p></div>
          <div class="award">${icon("verified")}<h4>Bank-grade privacy</h4><p>Your data stays in your browser. Always.</p></div>
          <div class="award">${icon("emoji_events")}<h4>Built for clarity</h4><p>Designed by financial UX experts.</p></div>
        </div>
      </section>

      <section class="luv">
        <div class="luv-inner">
          <h2><span class="accent">Features</span> our users love</h2>
          <div class="luv-grid">
            <div class="luv-item">
              <div class="luv-circle" style="background:#10b981">${icon("account_balance_wallet")}</div>
              <h3>Multiple wallets</h3>
              <p>Track cash, cards, and savings accounts side by side in one clean view.</p>
            </div>
            <div class="luv-item">
              <div class="luv-circle" style="background:#0ea5e9">${icon("account_balance")}</div>
              <h3>Smart categories</h3>
              <p>Organize every transaction so you instantly see where your money goes.</p>
            </div>
            <div class="luv-item">
              <div class="luv-circle" style="background:#a855f7">${icon("palette")}</div>
              <h3>Personal touch</h3>
              <p>Pick colors, icons, and labels to make your finance feel like yours.</p>
            </div>
            <div class="luv-item">
              <div class="luv-circle" style="background:#22c55e">${icon("language")}</div>
              <h3>Local currency</h3>
              <p>Auto-detects your country and formats every amount the right way.</p>
            </div>
            <div class="luv-item">
              <div class="luv-circle" style="background:#f43f5e">${icon("notifications_active")}</div>
              <h3>Budget alerts</h3>
              <p>Get visual nudges when you're getting close to a category limit.</p>
            </div>
            <div class="luv-item">
              <div class="luv-circle" style="background:#0ea5e9">${icon("cloud_done")}</div>
              <h3>Always available</h3>
              <p>Works offline. Open PockIt anywhere — even without internet.</p>
            </div>
          </div>
        </div>
      </section>

      <section class="steps">
        <div class="steps-inner">
          <h2>How to get your money <span class="accent">into shape?</span></h2>

          <div class="step">
            <div class="step-num">1</div>
            <div class="step-text">
              <div class="step-label">STEP 1</div>
              <h3>Track your cash flow</h3>
              <ul class="step-list">
                <li>${icon("check_circle")} Log every income and expense in seconds.</li>
                <li>${icon("check_circle")} Pick from rich categories or add your own.</li>
                <li>${icon("check_circle")} See your real balance update instantly.</li>
              </ul>
            </div>
            <div class="step-visual">
              <div class="vis-card"><div><div class="vc-title">Salary</div><div class="vc-sub">Today · Income</div></div><div class="vc-amount">${money(4250)}</div></div>
              <div class="vis-card"><div><div class="vc-title">Groceries</div><div class="vc-sub">Yesterday · Food</div></div><div class="vc-amount" style="color:var(--error)">-${moneyShort(142)}</div></div>
              <div class="vis-card"><div><div class="vc-title">Coffee</div><div class="vc-sub">Mon · Dining</div></div><div class="vc-amount" style="color:var(--error)">-${moneyShort(6)}</div></div>
            </div>
          </div>

          <div class="step reverse">
            <div class="step-num">2</div>
            <div class="step-visual">
              <div class="vis-card" style="flex-direction:column;align-items:stretch;gap:8px">
                <div style="display:flex;justify-content:space-between"><div class="vc-title">Net Worth</div><div class="vc-sub">This year</div></div>
                <svg viewBox="0 0 280 80" style="width:100%;height:80px"><polyline points="0,60 30,52 60,40 90,46 120,34 150,28 180,22 210,28 240,18 280,12" fill="none" stroke="#006c49" stroke-width="2.5" stroke-linecap="round"/></svg>
                <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--on-surface-variant)"><span>Jan</span><span>Jun</span></div>
              </div>
              <div class="vis-card"><div><div class="vc-title">Current Balance</div><div class="vc-sub">All accounts</div></div><div class="vc-amount">${moneyShort(6487)}</div></div>
            </div>
            <div class="step-text">
              <div class="step-label">STEP 2</div>
              <h3>Understand your spending</h3>
              <ul class="step-list">
                <li>${icon("check_circle")} See your finance in beautiful charts, not spreadsheets.</li>
                <li>${icon("check_circle")} Spot where your money goes — and where it comes from.</li>
                <li>${icon("check_circle")} Compare months at a glance.</li>
              </ul>
            </div>
          </div>

          <div class="step">
            <div class="step-num">3</div>
            <div class="step-text">
              <div class="step-label">STEP 3</div>
              <h3>Make your spending stress-free</h3>
              <ul class="step-list">
                <li>${icon("check_circle")} Set smart budgets for any category.</li>
                <li>${icon("check_circle")} Know how much you can spend each day.</li>
                <li>${icon("check_circle")} Save toward goals that matter to you.</li>
              </ul>
            </div>
            <div class="step-visual">
              <div class="vis-bar"><div class="vis-bar-head"><b>Power &amp; energy</b><span>31%</span></div><div class="vis-bar-track"><div class="vis-bar-fill" style="width:31%;background:#f43f5e"></div></div></div>
              <div class="vis-bar"><div class="vis-bar-head"><b>Food &amp; Drink</b><span>62%</span></div><div class="vis-bar-track"><div class="vis-bar-fill" style="width:62%;background:#f59e0b"></div></div></div>
              <div class="vis-bar"><div class="vis-bar-head"><b>Travel</b><span>50%</span></div><div class="vis-bar-track"><div class="vis-bar-fill" style="width:50%;background:#ec4899"></div></div></div>
            </div>
          </div>
        </div>
      </section>

      <section class="cta-section">
        <h2>Start Managing Your Money Smarter Today</h2>
        <p>Join thousands of professionals who have taken control of their financial destiny.</p>
        <div class="cta-btns">
          <button class="btn-hero primary" data-auth="signup">Sign Up Free</button>
          <button class="btn-hero ghost" data-guest>Continue as Guest</button>
        </div>
      </section>
    </main>
    ${landingFooterHTML()}`;
}

function landingFooterHTML() {
  return `
    <footer class="lp-footer">
      <div class="lp-footer-inner">
        <div class="lp-foot-col">
          <h5>Product</h5>
          <a href="#features">Features</a>
          <a href="#" data-doc="help">How it works</a>
          <a href="#" data-doc="help">Security</a>
          <a href="#" data-doc="help">What's new</a>
        </div>
        <div class="lp-foot-col">
          <h5>Company</h5>
          <a href="#" data-doc="help">About</a>
          <a href="#" data-doc="contact">Careers</a>
          <a href="#" data-doc="help">Press</a>
          <a href="#" data-doc="help">Blog</a>
        </div>
        <div class="lp-foot-col">
          <h5>Resources</h5>
          <a href="#" data-doc="help">Help Center</a>
          <a href="#" data-doc="contact">Contact us</a>
          <a href="#" data-doc="help">Community</a>
          <a href="#" data-doc="help">Status</a>
        </div>
        <div class="lp-foot-col">
          <h5>Legal</h5>
          <a href="#" data-doc="terms">Terms of use</a>
          <a href="#" data-doc="privacy">Privacy policy</a>
          <a href="#" data-doc="privacy">Cookies policy</a>
        </div>
        <div class="lp-foot-col">
          <h5>Open it in</h5>
          <div class="lp-foot-badges">
            <button class="badge-btn" data-doc="help">${icon("public")} Web Browser</button>
            <button class="badge-btn" data-doc="help">${icon("apple")} App Store</button>
            <button class="badge-btn" data-doc="help">${icon("android")} Google Play</button>
          </div>
        </div>
      </div>
      <div class="lp-foot-base">© 2026 PockIt Personal Finance. All rights reserved. Made with ♥ for clarity.</div>
    </footer>`;
}
