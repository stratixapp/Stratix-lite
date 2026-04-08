// js/pages/dashboard.js

const DashboardPage = {
  _unsubs: [], _clients: [], _tasks: [], _invoices: [],
  _firm: null, _user: null,

  mount(user, firm) {
    this._user = user; this._firm = firm;
    this._clients = []; this._tasks = []; this._invoices = [];
    this._renderSkeleton();
    this._unsubs.push(
      FS.subscribeClients(firm.id, d => { this._clients = d; this._render(); }),
      FS.subscribeInvoices(firm.id, d => { this._invoices = d; this._render(); }),
      FS.subscribeTasks(firm.id, d => { this._tasks = d; this._render(); }),
    );
  },

  unmount() { this._unsubs.forEach(u => u()); this._unsubs = []; },

  _renderSkeleton() {
    const c = Layout.getContentEl(); if (!c) return;
    c.innerHTML = `<div style="display:flex;justify-content:center;padding:4rem"><div class="spinner spinner-lg"></div></div>`;
  },

  _todayDeadlines() {
    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const week  = new Date(today); week.setDate(week.getDate() + 7);
    // Compliance deadlines this week
    const MONTHLY = [
      { day:11, label:'GSTR-1 due' },
      { day:20, label:'GSTR-3B due' },
    ];
    const urgent = [];
    MONTHLY.forEach(d => {
      const date = new Date(now.getFullYear(), now.getMonth(), d.day);
      const diff = Math.ceil((date - today) / 86400000);
      if (diff >= 0 && diff <= 7) urgent.push({ label: d.label, daysLeft: diff, color: diff <= 2 ? 'red' : 'amber' });
    });
    // Task deadlines this week
    this._tasks.filter(t => t.status !== 'done').forEach(t => {
      const due = t.dueDate?.toDate?.();
      if (!due) return;
      const diff = Math.ceil((due - today) / 86400000);
      if (diff >= 0 && diff <= 7) urgent.push({ label: esc(t.title || 'Task'), daysLeft: diff, color: diff <= 1 ? 'red' : 'amber', isTask: true });
    });
    return urgent.sort((a,b) => a.daysLeft - b.daysLeft);
  },

  _render() {
    const c = Layout.getContentEl(); if (!c) return;
    const name = this._user?.displayName?.split(' ')[0] || 'CA';
    const firm = this._firm;

    const outstanding = this._invoices.filter(i => i.status==='sent'||i.status==='overdue').reduce((s,i)=>s+(i.total||0),0);
    const collected   = this._invoices.filter(i => i.status==='paid').reduce((s,i)=>s+(i.total||0),0);
    const pendingT    = this._tasks.filter(t => t.status==='pending'||t.status==='in_progress').length;
    const overdueT    = this._tasks.filter(t => { if(t.status==='done') return false; const d=t.dueDate?.toDate?.(); return d&&d<new Date(); }).length;
    const todayDeadlines = this._todayDeadlines();

    const statCard = (icon, label, val, path, clr) => `
      <a class="stat-card" href="#${path}">
        <div class="stat-icon" style="background:var(${clr}-bg,rgba(255,255,255,.06));color:var(${clr})">${icon}</div>
        <div class="stat-value">${val}</div>
        <div class="stat-label">${label}</div>
      </a>`;

    c.innerHTML = `
    <!-- Greeting -->
    <div style="margin-bottom:1.75rem">
      <h1 style="font-size:1.75rem;font-weight:600">${Fmt.greeting()}, ${esc(name)} 👋</h1>
      <p style="color:var(--text-muted);margin-top:.25rem">${Fmt.today()} · ${esc(firm?.name||'')}</p>
    </div>

    <!-- Today's urgent deadlines banner -->
    ${todayDeadlines.length ? `
    <div style="background:rgba(221,107,32,.08);border:1px solid rgba(221,107,32,.25);border-radius:var(--r-md);padding:.875rem 1.25rem;margin-bottom:1.5rem;display:flex;align-items:flex-start;gap:.75rem">
      <div style="color:var(--amber);margin-top:.1rem">${Icons.alert}</div>
      <div>
        <div style="font-weight:600;font-size:.875rem;color:var(--amber);margin-bottom:.25rem">Upcoming Deadlines</div>
        <div style="display:flex;gap:.625rem;flex-wrap:wrap">
          ${todayDeadlines.slice(0,5).map(d=>`
            <span class="badge badge-${d.color}" style="font-size:.75rem">${d.label} — ${d.daysLeft===0?'Today':d.daysLeft===1?'Tomorrow':d.daysLeft+'d'}</span>
          `).join('')}
        </div>
      </div>
    </div>` : ''}

    <!-- Stats -->
    <div class="grid-stat">
      ${statCard(Icons.users,    'Total Clients',  this._clients.length, '/clients',  '--blue')}
      ${statCard(Icons.invoices, 'Outstanding',    Fmt.moneyNum(outstanding), '/invoices', '--amber')}
      ${statCard(Icons.trending, 'Collected',      Fmt.moneyNum(collected),   '/invoices', '--green')}
      ${statCard(Icons.tasks,    'Pending Tasks',  pendingT, '/tasks', '--purple')}
      ${overdueT > 0 ? statCard(Icons.alert, 'Overdue Tasks', overdueT, '/tasks', '--red') : ''}
    </div>

    <!-- Quick Actions -->
    <!-- Phase 2 shortcuts in dashboard -->
    <div style="display:flex;gap:.75rem;margin-bottom:1.75rem;flex-wrap:wrap">
      <button class="btn btn-secondary btn-sm" onclick="Router.navigate('/clients');setTimeout(()=>ClientsPage.openAdd(),300)">${Icons.plus} Add Client</button>
      <button class="btn btn-secondary btn-sm" onclick="Router.navigate('/invoices');setTimeout(()=>InvoicesPage.openCreate(),300)">${Icons.plus} New Invoice</button>
      <button class="btn btn-secondary btn-sm" onclick="Router.navigate('/tasks');setTimeout(()=>TasksPage.openAdd(),300)">${Icons.plus} Add Task</button>
    </div>

    <!-- Three column grid -->
    <div class="grid-dash">
      <!-- Recent Clients -->
      <div class="card">
        <div class="section-header">
          <span class="section-title">Recent Clients</span>
          <a href="#/clients" class="btn btn-ghost btn-sm" style="color:var(--gold);font-size:.8rem">View all ${Icons.chevron}</a>
        </div>
        ${this._clients.length === 0
          ? `<div class="empty-state">${Icons.users}<h4>No clients yet</h4><p>Add your first client</p><button class="btn btn-primary btn-sm" style="margin-top:.75rem" onclick="Router.navigate('/clients')">Add Client</button></div>`
          : this._clients.slice(0,6).map(c=>`
            <div style="display:flex;align-items:center;gap:.75rem;padding:.55rem 0;border-bottom:1px solid var(--border-light)">
              <div class="avatar" style="background:rgba(201,168,76,.12);color:var(--gold);font-size:.7rem;width:30px;height:30px">${Fmt.initials(c.name)}</div>
              <div style="flex:1;min-width:0">
                <div style="font-size:.875rem;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.name)}</div>
                <div style="font-size:.72rem;color:var(--text-muted)">${c.pan||c.gstin||c.phone||''}</div>
              </div>
              <span class="badge badge-muted" style="font-size:.7rem;text-transform:capitalize">${c.type||'individual'}</span>
            </div>`).join('')}
      </div>

      <!-- Pending Tasks -->
      <div class="card">
        <div class="section-header">
          <span class="section-title">Pending Tasks</span>
          <a href="#/tasks" class="btn btn-ghost btn-sm" style="color:var(--gold);font-size:.8rem">View all ${Icons.chevron}</a>
        </div>
        ${this._tasks.filter(t=>t.status!=='done').length === 0
          ? `<div class="empty-state">${Icons.tasks}<h4>All clear!</h4><p>No pending tasks</p></div>`
          : this._tasks.filter(t=>t.status!=='done').slice(0,5).map(t=>{
            const due = t.dueDate?.toDate?.();
            const isOverdue = due && due < new Date();
            return `
            <div style="padding:.6rem 0;border-bottom:1px solid var(--border-light)">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:.5rem">
                <span style="font-size:.875rem;font-weight:500;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.title||'Untitled')}</span>
                ${priorityBadge(t.priority)}
              </div>
              <div style="font-size:.72rem;color:${isOverdue?'var(--red)':'var(--text-muted)'};margin-top:.15rem">
                ${t.clientName?esc(t.clientName)+' · ':''}${due?Fmt.date(t.dueDate)+(isOverdue?' ⚠':''):'No due date'}
              </div>
            </div>`;}).join('')}
      </div>

      <!-- Recent Invoices -->
      <div class="card">
        <div class="section-header">
          <span class="section-title">Recent Invoices</span>
          <a href="#/invoices" class="btn btn-ghost btn-sm" style="color:var(--gold);font-size:.8rem">View all ${Icons.chevron}</a>
        </div>
        ${this._invoices.length === 0
          ? `<div class="empty-state">${Icons.invoices}<h4>No invoices yet</h4><p>Create your first invoice</p></div>`
          : this._invoices.slice(0,5).map(i=>`
            <div style="padding:.6rem 0;border-bottom:1px solid var(--border-light)">
              <div style="display:flex;align-items:center;justify-content:space-between">
                <span style="font-size:.8rem;font-family:var(--font-mono);color:var(--gold)">${esc(i.invoiceNo||'—')}</span>
                ${statusBadge(i.status)}
              </div>
              <div style="display:flex;justify-content:space-between;margin-top:.2rem">
                <span style="font-size:.75rem;color:var(--text-muted)">${esc(i.clientName||'—')}</span>
                <span style="font-size:.8125rem;font-weight:600">${Fmt.money(i.total)}</span>
              </div>
            </div>`).join('')}
      </div>
    </div>`;
  },
};
