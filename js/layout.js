// js/layout.js — App shell (sidebar + top bar)
// FIX: render() only called once. Subsequent nav changes just update active highlights.

const Layout = (() => {
  let _user = null, _firm = null, _userDoc = null;
  let _rendered = false;

  const NAV = [
    { path:'/dashboard', icon:'dashboard', label:'Dashboard' },
    { path:'/clients',   icon:'clients',   label:'Clients' },
    { path:'/invoices',  icon:'invoices',  label:'Invoices' },
    { path:'/tasks',     icon:'tasks',     label:'Tasks' },
    { path:'/calendar',  icon:'calendar',  label:'Calendar' },
    { path:'/compliance',   icon:'check',     label:'Compliance' },
    { path:'/doc-requests',  icon:'upload',    label:'Documents' },
    { path:'/my-tasks',      icon:'tasks',     label:'My Tasks' },
    { path:'/reports',       icon:'rupee',     label:'Reports Store' },
    { path:'/comm-log',      icon:'comment',   label:'Comm. Log' },
    { path:'/notices',       icon:'alert',     label:'Notices' },
    { path:'/email',         icon:'email',     label:'Email Center' },
    { path:'/analytics',     icon:'trending',  label:'Analytics' },
    { path:'/import-export',  icon:'upload',    label:'Import / Export' },
    { path:'/white-label',    icon:'star',      label:'White Label' },
    { path:'/staff',     icon:'staff',     label:'Staff' },
    { path:'/gst-tracker', icon:'gst',      label:'GST Tracker' },
    { path:'/itr-tracker', icon:'itr',      label:'ITR Tracker' },
    { path:'/tds-tracker', icon:'tds',      label:'TDS Tracker' },
    { path:'/roc-tracker', icon:'roc',      label:'ROC Tracker' },
  ];
  const NAV_BOTTOM = [
    { path:'/staff',       icon:'staff',     label:'Staff & Team' },
    { path:'/notifications',icon:'bell',     label:'Notifications' },
    { path:'/whatsapp',  icon:'whatsapp',  label:'WhatsApp Setup' },
    { path:'/billing',  icon:'billing',  label:'Plan & Billing' },
    { path:'/settings', icon:'settings', label:'Settings' },
  ];

  function setContext(user, firm, userDoc) {
    _user = user; _firm = firm; _userDoc = userDoc;
    // If already rendered, just update the firm name / trial banner
    if (_rendered) _updateDynamic();
  }

  function isRendered() { return _rendered && !!document.getElementById('page-content'); }

  function render() {
    _rendered = true;
    const firmName = _firm ? esc(_firm.name) : '';
    const trialLeft = _firm && _firm.trialEndsAt
      ? Math.max(0, Math.ceil((_firm.trialEndsAt.toDate() - new Date()) / 86400000))
      : null;
    const isTrial = _firm && _firm.subscriptionStatus === 'trial';

    const navLinks = items => items.map(n => `
      <a href="#${n.path}" class="nav-link" data-path="${n.path}">
        ${Icons[n.icon]||''} <span>${n.label}</span>
        ${n.path==='/notifications'?'<span id="notif-badge" style="display:none;background:var(--red);color:white;border-radius:10px;padding:0 5px;font-size:.65rem;font-weight:700;margin-left:auto">0</span>':''}
      </a>`).join('');

    document.getElementById('app').innerHTML = `
    <div class="sidebar-overlay" id="sidebar-overlay" onclick="Layout.closeMobile()"></div>
    <aside class="sidebar" id="sidebar">
      <!-- Logo -->
      <div style="padding:1.25rem 1.25rem 1rem;border-bottom:1px solid var(--border-light);display:flex;align-items:center;justify-content:space-between">
        <a href="#/dashboard" class="logo-wrap">
          <div class="logo-icon">${Icons.logo}</div>
          <span class="logo-text">Filio</span>
        </a>
        <button class="btn btn-icon btn-ghost" id="sidebar-close-btn" onclick="Layout.closeMobile()" style="display:none">${Icons.x}</button>
      </div>
      <!-- Firm name -->
      <div style="padding:.75rem 1.25rem;border-bottom:1px solid var(--border-light)">
        <div style="display:flex;align-items:center;gap:.5rem">
          ${Icons.building}
          <span id="sidebar-firm-name" style="font-size:.75rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${firmName}</span>
        </div>
      </div>
      <!-- Nav -->
      <nav style="flex:1;padding:1rem .75rem;overflow-y:auto">
        ${navLinks(NAV)}
      </nav>
      <!-- Trial banner -->
      <div id="sidebar-trial" style="${isTrial && trialLeft !== null && trialLeft <= 14 ? '' : 'display:none'}">
        <div style="margin:.75rem;padding:.75rem;background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.2);border-radius:var(--r-md)">
          <p style="font-size:.75rem;color:var(--gold);font-weight:600" id="trial-days-text">${trialLeft} days left in trial</p>
          <a href="#/billing" style="font-size:.7rem;color:var(--text-muted);display:block;margin-top:.2rem">Upgrade plan →</a>
        </div>
      </div>
      <!-- Bottom nav + user -->
      <div style="padding:.75rem;border-top:1px solid var(--border-light)">
        ${navLinks(NAV_BOTTOM)}
        <div style="display:flex;align-items:center;gap:.625rem;padding:.625rem .75rem;margin-top:.5rem;border-radius:var(--r-md);background:var(--bg-hover)">
          ${Fmt.avatar(_user)}
          <div style="flex:1;min-width:0">
            <div style="font-size:.8125rem;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(_user ? _user.displayName || 'User' : '')}</div>
            <div style="font-size:.7rem;color:var(--text-muted);text-transform:capitalize">${esc(_userDoc ? _userDoc.role || 'owner' : 'owner')}</div>
          </div>
          <button class="btn btn-icon btn-ghost" onclick="Layout.logout()" title="Sign out" style="flex-shrink:0">${Icons.logout}</button>
        </div>
      </div>
    </aside>

    <div class="main-area">
      <header class="top-bar">
        <button class="btn btn-icon btn-ghost" onclick="Layout.openMobile()">${Icons.menu}</button>
        <div style="flex:1"></div>
        <span style="font-size:.8125rem;color:var(--text-muted);display:none" class="hide-mobile-sm">${Fmt.today()}</span>
      </header>
      <main class="page-content" id="page-content"></main>
    </div>`;

    highlightNav();
  }

  function _updateDynamic() {
    // Update firm name in sidebar without full re-render
    const fn = document.getElementById('sidebar-firm-name');
    if (fn && _firm) fn.textContent = _firm.name;
    // Update trial banner
    const trialDiv = document.getElementById('sidebar-trial');
    if (trialDiv && _firm) {
      const trialLeft = _firm.trialEndsAt
        ? Math.max(0, Math.ceil((_firm.trialEndsAt.toDate() - new Date()) / 86400000))
        : null;
      if (_firm.subscriptionStatus === 'trial' && trialLeft !== null && trialLeft <= 14) {
        trialDiv.style.display = '';
        const txt = document.getElementById('trial-days-text');
        if (txt) txt.textContent = `${trialLeft} days left in trial`;
      }
    }
  }

  function highlightNav() {
    const cur = Router.current();
    document.querySelectorAll('.nav-link[data-path]').forEach(a => {
      a.classList.toggle('active', cur.startsWith(a.dataset.path));
    });
  }

  function openMobile() {
    document.getElementById('sidebar')?.classList.add('open');
    const ov = document.getElementById('sidebar-overlay');
    if (ov) ov.style.display = 'block';
    const cl = document.getElementById('sidebar-close-btn');
    if (cl) cl.style.display = '';
  }

  function closeMobile() {
    document.getElementById('sidebar')?.classList.remove('open');
    const ov = document.getElementById('sidebar-overlay');
    if (ov) ov.style.display = 'none';
    const cl = document.getElementById('sidebar-close-btn');
    if (cl) cl.style.display = 'none';
  }

  async function logout() {
    await Auth.signOut();
    _rendered = false;
    Toast.success('Signed out');
    Router.navigate('/');
  }

  function getContentEl() { return document.getElementById('page-content'); }

  function reset() { _rendered = false; }
  return { setContext, render, isRendered, reset, highlightNav, openMobile, closeMobile, logout, getContentEl };
})();
