// js/pages/clients.js — Fixed: global event bug, error display, invite link

const ClientsPage = {
  _unsub: null, _clients: [], _firm: null,
  _search: '', _typeFilter: 'all',

  mount(firm) {
    this._firm = firm; this._clients = [];
    this._render();
    this._unsub = FS.subscribeClients(firm.id, docs => { this._clients = docs; this._renderList(); });
  },
  unmount() { if (this._unsub) { this._unsub(); this._unsub = null; } },

  _filtered() {
    const q = this._search.toLowerCase();
    return this._clients.filter(c => {
      const m = !q || [c.name,c.pan,c.gstin,c.phone,c.email].some(v=>(v||'').toLowerCase().includes(q));
      return m && (this._typeFilter==='all' || c.type===this._typeFilter);
    });
  },

  _render() {
    const cnt = Layout.getContentEl(); if (!cnt) return;
    cnt.innerHTML = `
    <div class="section-header" style="margin-bottom:1.5rem">
      <h2 style="font-size:1.5rem;font-weight:600">Clients <span style="font-size:1rem;color:var(--text-muted);font-family:var(--font-body)" id="client-count"></span></h2>
      <button class="btn btn-primary btn-sm" onclick="ClientsPage.openAdd()">${Icons.plus} Add Client</button>
    </div>
    <div style="display:flex;gap:.75rem;margin-bottom:1.25rem;flex-wrap:wrap;align-items:center">
      <div class="search-bar" style="flex:1;min-width:200px;max-width:340px">
        ${Icons.search}
        <input type="text" placeholder="Search name, PAN, phone…" id="client-search" oninput="ClientsPage._onSearch(this.value)" />
      </div>
      <div class="tabs" id="type-tabs">
        ${['all','individual','company','huf','llp','partnership'].map(t=>`
          <button class="tab" data-type="${t}" onclick="ClientsPage._setType('${t}',this)">${t==='all'?'All':t.charAt(0).toUpperCase()+t.slice(1)}</button>`).join('')}
      </div>
    </div>
    <div class="card" style="padding:0;overflow:hidden">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Client</th><th class="table-mobile-hide">Type</th><th class="table-mobile-hide">PAN</th><th class="table-mobile-hide">GSTIN</th><th class="table-mobile-hide">Phone</th><th>Actions</th></tr></thead>
          <tbody id="clients-tbody"><tr><td colspan="6" style="text-align:center;padding:3rem"><div class="spinner" style="margin:0 auto"></div></td></tr></tbody>
        </table>
      </div>
    </div>`;
    // Set active tab
    const tabs = document.querySelectorAll('#type-tabs .tab');
    tabs.forEach(b => b.classList.toggle('active', b.dataset.type === this._typeFilter));
  },

  _renderList() {
    const tbody = document.getElementById('clients-tbody');
    const countEl = document.getElementById('client-count');
    if (!tbody) return;
    const filtered = this._filtered();
    if (countEl) countEl.textContent = `(${this._clients.length})`;
    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state">${Icons.users}
        <h4>${this._search||this._typeFilter!=='all'?'No matches':'No clients yet'}</h4>
        ${!this._search?`<button class="btn btn-primary btn-sm" style="margin-top:.75rem" onclick="ClientsPage.openAdd()">Add Client</button>`:''}
      </div></td></tr>`; return;
    }
    tbody.innerHTML = filtered.map(c=>`
      <tr>
        <td><div style="display:flex;align-items:center;gap:.625rem">
          <div class="avatar" style="background:rgba(201,168,76,.12);color:var(--gold);font-size:.7rem;width:30px;height:30px;flex-shrink:0">${Fmt.initials(c.name)}</div>
          <div><div style="font-weight:500">${esc(c.name||'—')}</div>${c.email?`<div style="font-size:.72rem;color:var(--text-muted)">${esc(c.email)}</div>`:''}</div>
        </div></td>
        <td class="table-mobile-hide"><span class="badge badge-muted" style="text-transform:capitalize">${esc(c.type||'individual')}</span></td>
        <td class="table-mobile-hide"><code style="font-size:.8rem;color:var(--text-secondary)">${esc(c.pan||'—')}</code></td>
        <td class="table-mobile-hide"><code style="font-size:.75rem;color:var(--text-muted)">${esc(c.gstin||'—')}</code></td>
        <td class="table-mobile-hide" style="color:var(--text-secondary)">${esc(c.phone||'—')}</td>
        <td><div style="display:flex;gap:.25rem">
          <button class="btn btn-icon btn-ghost" title="Copy invite link" onclick="ClientsPage._copyInvite('${c.id}')">${Icons.link}</button>
          <button class="btn btn-icon btn-ghost" title="Edit" onclick="ClientsPage.openEdit('${c.id}')">${Icons.edit}</button>
          <button class="btn btn-icon btn-ghost" title="Delete" style="color:var(--red)" onclick="ClientsPage.openDelete('${c.id}','${esc(c.name||'').replace(/'/g,"\\'")}')">
            ${Icons.trash}
          </button>
        </div></td>
      </tr>`).join('');
  },

  // FIX: pass button element directly, don't use global `event`
  _setType(t, btn) {
    this._typeFilter = t;
    document.querySelectorAll('#type-tabs .tab').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    this._renderList();
  },
  _onSearch(v) { this._search = v; this._renderList(); },

  async _copyInvite(clientId) {
    try {
      const token = await FS.createClientInvite(this._firm.id, clientId);
      const link = `${window.location.origin}${window.location.pathname}#/portal?token=${token}`;
      copyText(link, 'Client invite link copied!');
    } catch(e) { Toast.error('Failed to generate invite link'); }
  },

  openAdd()    { this._showModal(null); },
  openEdit(id) { this._showModal(this._clients.find(c=>c.id===id)); },

  _showModal(client) {
    const isEdit = !!client;
    const f = client || {};
    const tagsStr = Array.isArray(f.tags) ? f.tags.join(', ') : '';

    showModal(`
      <div class="modal-header">
        <h3 class="modal-title">${isEdit?'Edit Client':'Add Client'}</h3>
        <button class="modal-close" onclick="closeModal()">${Icons.x}</button>
      </div>
      <div class="grid-2">
        <div class="input-group">
          <label class="input-label">Full Name *</label>
          <input class="input" id="cf-name" value="${esc(f.name||'')}" placeholder="Client full name" />
          <span class="error-text" id="cf-name-err" style="display:none">Name is required</span>
        </div>
        <div class="input-group">
          <label class="input-label">Type</label>
          <select class="input" id="cf-type">
            ${['individual','company','huf','llp','partnership'].map(t=>
              `<option value="${t}" ${(f.type||'individual')===t?'selected':''}>${t.charAt(0).toUpperCase()+t.slice(1)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="grid-2">
        <div class="input-group">
          <label class="input-label">PAN</label>
          <input class="input" id="cf-pan" value="${esc(f.pan||'')}" placeholder="ABCDE1234F" style="text-transform:uppercase" />
          <span class="error-text" id="cf-pan-err" style="display:none"></span>
        </div>
        <div class="input-group">
          <label class="input-label">GSTIN</label>
          <input class="input" id="cf-gstin" value="${esc(f.gstin||'')}" placeholder="29AABCT1332L1ZV" style="text-transform:uppercase" />
          <span class="error-text" id="cf-gstin-err" style="display:none"></span>
        </div>
      </div>
      <div class="grid-2">
        <div class="input-group">
          <label class="input-label">Mobile</label>
          <input class="input" id="cf-phone" value="${esc(f.phone||'')}" placeholder="9876543210" type="tel" />
          <span class="error-text" id="cf-phone-err" style="display:none"></span>
        </div>
        <div class="input-group">
          <label class="input-label">Email</label>
          <input class="input" id="cf-email" value="${esc(f.email||'')}" placeholder="client@email.com" type="email" />
          <span class="error-text" id="cf-email-err" style="display:none"></span>
        </div>
      </div>
      <div class="input-group">
        <label class="input-label">Address</label>
        <input class="input" id="cf-address" value="${esc(f.address||'')}" placeholder="Street, Locality" />
      </div>
      <div class="grid-2">
        <div class="input-group">
          <label class="input-label">City</label>
          <input class="input" id="cf-city" value="${esc(f.city||'')}" placeholder="Kochi" />
        </div>
        <div class="input-group">
          <label class="input-label">State</label>
          <select class="input" id="cf-state">${stateOptions(f.state||'Kerala')}</select>
        </div>
      </div>
      <div class="input-group">
        <label class="input-label">Tags <span style="color:var(--text-muted);font-size:.75rem">(comma-separated)</span></label>
        <input class="input" id="cf-tags" value="${esc(tagsStr)}" placeholder="gst, itr, audit" />
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" id="cf-save-btn" onclick="ClientsPage._save('${isEdit?client.id:''}')">${isEdit?'Save Changes':'Add Client'}</button>
      </div>`);
  },

  async _save(editId) {
    const name  = el('cf-name')?.value.trim();
    const pan   = el('cf-pan')?.value.trim().toUpperCase();
    const gstin = el('cf-gstin')?.value.trim().toUpperCase();
    const phone = el('cf-phone')?.value.trim();
    const email = el('cf-email')?.value.trim();

    // Validate — show inline errors
    let ok = true;
    const setErr = (id, msg) => {
      const e = el(id); if (!e) return;
      e.textContent = msg; e.style.display = msg ? '' : 'none';
      if (msg) ok = false;
    };
    setErr('cf-name-err', !name ? 'Name is required' : '');
    setErr('cf-pan-err',   pan   && !Validate.pan(pan)   ? 'Invalid PAN (e.g. ABCDE1234F)' : '');
    setErr('cf-gstin-err', gstin && !Validate.gstin(gstin) ? 'Invalid GSTIN' : '');
    setErr('cf-phone-err', phone && !Validate.phone(phone) ? 'Invalid 10-digit mobile' : '');
    setErr('cf-email-err', email && !Validate.email(email) ? 'Invalid email' : '');
    if (!ok) return;

    const data = {
      name, pan, gstin, phone, email,
      type:    el('cf-type')?.value    || 'individual',
      address: el('cf-address')?.value.trim() || '',
      city:    el('cf-city')?.value.trim()    || '',
      state:   el('cf-state')?.value          || 'Kerala',
      tags:    (el('cf-tags')?.value||'').split(',').map(s=>s.trim()).filter(Boolean),
    };

    const btn = el('cf-save-btn');
    if (btn) { btn.disabled=true; btn.innerHTML='<div class="spinner"></div> Saving…'; }
    try {
      if (editId) { await FS.updateClient(this._firm.id, editId, data); Toast.success('Client updated'); }
      else        { await FS.addClient(this._firm.id, data); Toast.success('Client added'); }
      closeModal();
    } catch(e) {
      Toast.error('Save failed. Try again.');
      if (btn) { btn.disabled=false; btn.innerHTML=editId?'Save Changes':'Add Client'; }
    }
  },

  openDelete(id, name) {
    showModal(`
      <div class="modal-header"><h3 class="modal-title">Delete Client</h3><button class="modal-close" onclick="closeModal()">${Icons.x}</button></div>
      <p style="color:var(--text-secondary);line-height:1.7">Delete <strong style="color:var(--text-primary)">${esc(name)}</strong>? All associated data will be removed. This cannot be undone.</p>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-danger" onclick="ClientsPage._confirmDelete('${id}')">Delete</button>
      </div>`);
  },
  async _confirmDelete(id) {
    try { await FS.deleteClient(this._firm.id, id); Toast.success('Client deleted'); closeModal(); }
    catch(e) { Toast.error('Delete failed'); }
  },
};
