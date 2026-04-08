// js/pages/billing.js — Razorpay subscription plans with real checkout

const BillingPage = {
  _firm: null, _user: null, _annual: false,

  mount(user, firm) {
    this._user = user; this._firm = firm;
    this._render();
  },
  unmount() {},

  _plans: [
    {
      id:'starter', name:'Starter', price:799, annual:7990, clients:50,
      desc:'Solo CA practitioner',
      features:['Up to 50 clients','Full dashboard & calendar','GST & ITR tracker','Invoicing + PDF download','Task management','Email support'],
    },
    {
      id:'growth', name:'Growth', price:1499, annual:14990, clients:150,
      desc:'Small 2–5 member firm', popular:true,
      features:['Up to 150 clients','Everything in Starter','Staff task management','Client portal access','WhatsApp reminders','Priority support'],
    },
    {
      id:'pro', name:'Pro', price:2499, annual:24990, clients:400,
      desc:'Growing mid-size firm',
      features:['Up to 400 clients','Everything in Growth','Reports marketplace','Advanced analytics','Client Excel import','Dedicated support'],
    },
    {
      id:'enterprise', name:'Enterprise', price:4999, annual:49990, clients:null,
      desc:'Large multi-partner firm',
      features:['Unlimited clients','Everything in Pro','Multi-branch support','White label','Referral program','Custom onboarding'],
    },
  ],

  _render() {
    const cnt = Layout.getContentEl(); if (!cnt) return;
    const f   = this._firm || {};
    const cur = f.plan || 'starter';
    const isTrial  = f.subscriptionStatus === 'trial';
    const trialLeft = f.trialEndsAt
      ? Math.max(0, Math.ceil((f.trialEndsAt.toDate() - new Date()) / 86400000))
      : 0;

    cnt.innerHTML = `
    <div style="max-width:960px">
      <h2 style="font-size:1.5rem;font-weight:600;margin-bottom:.5rem">Plan & Billing</h2>
      <p style="color:var(--text-muted);margin-bottom:2rem">Choose the right plan. All plans include a 14-day free trial. GST invoices provided.</p>

      <!-- Status banner -->
      ${isTrial ? `
      <div style="background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.25);border-radius:var(--r-md);padding:1rem 1.25rem;margin-bottom:1.75rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.75rem">
        <div>
          <div style="font-weight:600;color:var(--gold)">Free Trial Active — ${trialLeft} days remaining</div>
          <div style="font-size:.8125rem;color:var(--text-muted);margin-top:.2rem">Upgrade before trial ends to keep your data and access.</div>
        </div>
        <span class="badge badge-amber">Trial</span>
      </div>` : `
      <div style="background:var(--green-bg);border:1px solid rgba(56,161,105,.25);border-radius:var(--r-md);padding:1rem 1.25rem;margin-bottom:1.75rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.75rem">
        <div>
          <div style="font-weight:600;color:var(--green)">Active — ${cur.charAt(0).toUpperCase()+cur.slice(1)} Plan</div>
          <div style="font-size:.8125rem;color:var(--text-muted);margin-top:.2rem">Your subscription is active.</div>
        </div>
        <span class="badge badge-green">Active</span>
      </div>`}

      <!-- Monthly / Annual toggle -->
      <div style="display:flex;align-items:center;justify-content:center;gap:1rem;margin-bottom:2rem">
        <span style="font-size:.875rem;color:var(--text-secondary)">Monthly</span>
        <div id="billing-toggle" onclick="BillingPage._toggle()" style="width:46px;height:26px;background:rgba(201,168,76,.15);border-radius:13px;cursor:pointer;position:relative;transition:background .2s;border:1px solid rgba(201,168,76,.2)">
          <div id="billing-knob" style="position:absolute;top:3px;left:3px;width:18px;height:18px;background:var(--gold);border-radius:50%;transition:transform .2s ease"></div>
        </div>
        <span style="font-size:.875rem;color:var(--text-secondary)">Annual <span style="color:var(--green);font-weight:600">2 months free</span></span>
      </div>

      <!-- Plan cards -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:1rem;margin-bottom:2rem" id="plan-grid">
        ${this._plans.map(p => this._planCard(p, cur)).join('')}
      </div>

      <!-- Additional clients + billing info -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
        <div class="card">
          <h4 style="font-family:var(--font-body);font-size:.9375rem;font-weight:600;margin-bottom:.75rem">Additional Clients</h4>
          <p style="color:var(--text-secondary);font-size:.875rem;line-height:1.7">Beyond your plan limit: <strong style="color:var(--gold)">₹5 per client/month</strong>. Upgrade for better value.</p>
        </div>
        <div class="card">
          <h4 style="font-family:var(--font-body);font-size:.9375rem;font-weight:600;margin-bottom:.75rem">Billing Notes</h4>
          <div style="color:var(--text-secondary);font-size:.8125rem;line-height:1.9">
            ✓ Prices exclusive of 18% GST<br/>
            ✓ GST invoice for every payment<br/>
            ✓ Annual = 10 months price<br/>
            ✓ Cancel anytime, no lock-in<br/>
            ✓ UPI, card, net banking via Razorpay
          </div>
        </div>
      </div>
    </div>`;
  },

  _toggle() {
    this._annual = !this._annual;
    const knob = document.getElementById('billing-knob');
    if (knob) knob.style.transform = this._annual ? 'translateX(20px)' : '';
    const grid = document.getElementById('plan-grid');
    if (grid) grid.innerHTML = this._plans.map(p => this._planCard(p, this._firm?.plan||'starter')).join('');
  },

  _planCard(p, currentPlan) {
    const price    = this._annual ? p.annual : p.price;
    const period   = this._annual ? '/year' : '/month';
    const isCur    = p.id === currentPlan;
    return `
    <div style="position:relative;background:${p.popular?'var(--bg-elevated)':'var(--bg-card)'};border:1px solid ${p.popular?'var(--gold)':isCur?'var(--green)':'var(--border-light)'};border-radius:var(--r-lg);padding:1.5rem;display:flex;flex-direction:column;gap:0;transition:transform .2s,box-shadow .2s" onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 8px 24px rgba(0,0,0,.4)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
      ${p.popular ? `<div style="position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:var(--gold);color:var(--navy);font-size:.68rem;font-weight:700;padding:.2rem .75rem;border-radius:20px;white-space:nowrap;letter-spacing:.05em">MOST POPULAR</div>` : ''}
      ${isCur    ? `<div style="position:absolute;top:-12px;right:1rem;background:var(--green);color:white;font-size:.68rem;font-weight:700;padding:.2rem .75rem;border-radius:20px">CURRENT</div>` : ''}
      <div style="font-family:var(--font-display);font-size:1.25rem;font-weight:600;margin-bottom:.2rem">${p.name}</div>
      <div style="color:var(--text-muted);font-size:.78rem;margin-bottom:1rem">${p.desc}</div>
      <div style="margin-bottom:.5rem">
        <span style="font-size:1.875rem;font-weight:700">₹${price.toLocaleString('en-IN')}</span>
        <span style="color:var(--text-muted);font-size:.8rem">${period}</span>
      </div>
      <div style="font-size:.75rem;color:var(--text-muted);margin-bottom:1.25rem">${p.clients?`Up to ${p.clients} clients`:'Unlimited clients'}</div>
      <div style="flex:1;margin-bottom:1.25rem">
        ${p.features.map(feat=>`
        <div style="display:flex;align-items:flex-start;gap:.4rem;margin-bottom:.375rem">
          <span style="color:var(--green);font-size:.8rem;margin-top:.1rem;flex-shrink:0">✓</span>
          <span style="font-size:.8rem;color:var(--text-secondary)">${feat}</span>
        </div>`).join('')}
      </div>
      ${isCur
        ? `<button class="btn btn-secondary btn-full" disabled style="opacity:.6">Current Plan</button>`
        : `<button class="btn btn-${p.popular?'primary':'secondary'} btn-full" onclick="BillingPage._checkout('${p.id}',${price},'${p.name}')">
            ${p.popular ? `Upgrade to ${p.name}` : `Select ${p.name}`}
          </button>`}
    </div>`;
  },

  // ── Razorpay Checkout ──────────────────────────────────────
  _checkout(planId, amount, planName) {
    // Check if Razorpay key is configured
    const rzpKey = typeof RAZORPAY_KEY_ID !== 'undefined' ? RAZORPAY_KEY_ID : null;

    if (!rzpKey || rzpKey.includes('PASTE')) {
      // Show setup instructions
      showModal(`
        <div class="modal-header">
          <h3 class="modal-title">Razorpay Setup Required</h3>
          <button class="modal-close" onclick="closeModal()">${Icons.x}</button>
        </div>
        <div style="padding:.5rem 0">
          <p style="color:var(--text-secondary);font-size:.875rem;line-height:1.7;margin-bottom:1.25rem">
            To enable real payments, add your Razorpay Key ID to <code style="background:var(--bg-card);padding:.1em .35em;border-radius:4px;color:var(--gold)">js/firebase-config.js</code>
          </p>
          <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--r-md);padding:1rem;font-family:var(--font-mono);font-size:.8rem;color:var(--text-secondary);line-height:2;margin-bottom:1.25rem">
            // Add this line to firebase-config.js:<br/>
            <span style="color:var(--gold)">const RAZORPAY_KEY_ID = "rzp_live_YOUR_KEY_HERE";</span>
          </div>
          <div style="background:var(--blue-bg);border:1px solid rgba(49,130,206,.2);border-radius:var(--r-md);padding:.875rem">
            <p style="font-size:.8125rem;color:var(--blue);line-height:1.7">
              Get your key from <strong>dashboard.razorpay.com</strong> → Settings → API Keys → Generate Key
            </p>
          </div>
          <div class="modal-footer" style="padding-top:1.25rem;margin-top:1.25rem;border-top:1px solid var(--border-light)">
            <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="BillingPage._activateDemo('${planId}');closeModal()">Activate (Demo Mode)</button>
          </div>
        </div>`);
      return;
    }

    // Real Razorpay checkout
    const options = {
      key:         rzpKey,
      amount:      amount * 100, // paise (amount is already in rupees, ×100 for paise — but GST not added here for simplicity)
      currency:    'INR',
      name:        'Filio — CA Office OS',
      description: `${planName} Plan ${this._annual?'(Annual)':'(Monthly)'}`,
      prefill: {
        name:  this._user?.displayName || '',
        email: this._user?.email       || '',
      },
      theme:     { color: '#C9A84C' },
      modal:     { ondismiss: () => Toast.info('Payment cancelled') },
      handler:   async (response) => {
        // Payment successful — update firm plan in Firestore
        Toast.success('Payment successful! Activating plan…');
        await this._activatePlan(planId, response.razorpay_payment_id);
      },
    };

    if (typeof Razorpay === 'undefined') {
      // Load Razorpay script dynamically
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => { new Razorpay(options).open(); };
      script.onerror = () => Toast.error('Failed to load Razorpay. Check your internet connection.');
      document.head.appendChild(script);
    } else {
      new Razorpay(options).open();
    }
  },

  // Demo mode — activate plan without payment
  async _activateDemo(planId) {
    Toast.info('Demo mode — activating plan without payment');
    await this._activatePlan(planId, 'demo_' + Date.now());
  },

  async _activatePlan(planId, paymentId) {
    const limits = { starter:50, growth:150, pro:400, enterprise:999999 };
    try {
      await FS.updateFirm(this._firm.id, {
        plan:               planId,
        planClientLimit:    limits[planId] || 50,
        subscriptionStatus: 'active',
        lastPaymentId:      paymentId,
        subscribedAt:       firebase.firestore.FieldValue.serverTimestamp(),
      });
      Toast.success(`🎉 ${planId.charAt(0).toUpperCase()+planId.slice(1)} plan activated!`);
      // Re-render with updated plan
      setTimeout(() => { this._render(); }, 500);
    } catch(e) {
      Toast.error('Plan activation failed. Contact support.');
    }
  },
};
