const API = '/api';
const el = id => document.getElementById(id);
const money = n => '$' + Number(n).toFixed(2);

let tenantsCache = [];

/* ---------- Toast ---------- */
let toastTimer;
function showToast(msg, isError = false){
  const t = el('toast');
  t.textContent = msg;
  t.className = 'toast show' + (isError ? ' error' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = 'toast'; }, 3200);
}

/* ---------- Login ---------- */
el('loginBtn').onclick = async () => {
  const email = el('loginEmail').value.trim();
  const password = el('loginPassword').value;
  el('loginError').style.display = 'none';
  try{
    const res = await fetch(`${API}/auth/login`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      credentials:'include',
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if(!res.ok || data.role !== 'admin'){
      el('loginError').textContent = data.role && data.role !== 'admin' ? 'This account is not an admin account.' : (data.error || 'Invalid email or password.');
      el('loginError').style.display = 'block';
      return;
    }
    el('loginScreen').style.display = 'none';
    el('appScreen').style.display = 'block';
    el('brandTitle').textContent = 'Admin dashboard';
    loadDashboard();
  }catch(err){
    el('loginError').textContent = 'Could not reach the server.';
    el('loginError').style.display = 'block';
  }
};

el('logoutBtn').onclick = async () => {
  await fetch(`${API}/auth/logout`, { method:'POST', credentials:'include' });
  location.reload();
};

/* ---------- Nav ---------- */
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    el('view-' + btn.dataset.view).classList.add('active');
    if(btn.dataset.view === 'dashboard') loadDashboard();
    if(btn.dataset.view === 'branding') loadBrandingTenants();
    if(btn.dataset.view === 'users') loadUsers();
    if(btn.dataset.view === 'analytics') loadAnalytics();
  };
});

/* ---------- Dashboard ---------- */
async function loadDashboard(){
  const res = await fetch(`${API}/admin/dashboard`, { credentials:'include' });
  if(!res.ok){ showToast('Session expired. Please sign in again.', true); setTimeout(() => location.reload(), 1200); return; }
  const data = await res.json();
  tenantsCache = data.tenants || [];

  el('statTenants').textContent = tenantsCache.length;
  el('statOrders').textContent = data.totalOrders;
  el('statRevenue').textContent = money(data.totalRevenue);
  el('statStaff').textContent = data.totalStaff;

  el('tenantCount').textContent = `${tenantsCache.length} tenant${tenantsCache.length === 1 ? '' : 's'}`;
  const body = el('tenantBody');
  body.innerHTML = '';
  if(tenantsCache.length === 0){
    body.innerHTML = `<tr><td colspan="5" class="ledger-empty">No restaurants onboarded yet.</td></tr>`;
    return;
  }
  tenantsCache.forEach(t => {
    const isActive = t.is_active === true || t.is_active === 't' || t.is_active === 1;
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${t.name}</td>
      <td>${t.subdomain}</td>
      <td>${t.owner_name || '—'}</td>
      <td><span class="status-pill ${isActive ? 'active' : 'inactive'}">${isActive ? 'Active' : 'Inactive'}</span></td>
      <td><button class="toggle-btn">${isActive ? 'Deactivate' : 'Activate'}</button></td>
    `;
    row.querySelector('.toggle-btn').onclick = () => toggleTenant(t.tenant_id);
    body.appendChild(row);
  });
}

async function toggleTenant(tenantId){
  try{
    const res = await fetch(`${API}/admin/tenant/${tenantId}/toggle`, { method:'POST', credentials:'include' });
    const data = await res.json();
    if(!res.ok){ showToast(data.error || 'Could not update tenant.', true); return; }
    showToast(`${data.tenant.name} ${data.tenant.is_active ? 'activated' : 'deactivated'}.`);
    loadDashboard();
  }catch(err){ showToast('Could not reach the server.', true); }
}

/* ---------- Onboard ---------- */
el('onboardForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const note = el('onboardNote');
  note.className = 'form-note';
  const payload = {
    name: el('obName').value.trim(),
    subdomain: el('obSubdomain').value.trim().toLowerCase(),
    owner: el('obOwner').value.trim(),
    phone: el('obPhone').value.trim(),
    address: el('obAddress').value.trim()
  };
  try{
    const res = await fetch(`${API}/admin/onboard`, {
      method:'POST', credentials:'include',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if(!res.ok){
      note.textContent = data.error || 'Could not onboard restaurant.';
      note.className = 'form-note error';
      return;
    }
    note.textContent = `"${payload.name}" onboarded — set its branding next.`;
    note.className = 'form-note success';
    e.target.reset();
    showToast(`${payload.name} onboarded.`);
  }catch(err){
    note.textContent = 'Could not reach the server.';
    note.className = 'form-note error';
  }
});

/* ---------- Branding ---------- */
function populateTenantSelect(select){
  select.innerHTML = tenantsCache.map(t => `<option value="${t.tenant_id}">${t.name}</option>`).join('');
}

async function loadBrandingTenants(){
  if(tenantsCache.length === 0){
    const res = await fetch(`${API}/admin/dashboard`, { credentials:'include' });
    if(res.ok){ const data = await res.json(); tenantsCache = data.tenants || []; }
  }
  populateTenantSelect(el('brTenant'));
  updateBrandingPreview();
}

function updateBrandingPreview(){
  const tenant = tenantsCache.find(t => String(t.tenant_id) === el('brTenant').value);
  const primary = el('brPrimary').value;
  const logoText = el('brLogoText').value.trim() || (tenant ? tenant.name.slice(0,2).toUpperCase() : 'LP');
  el('previewLogo').style.background = primary;
  el('previewLogo').textContent = logoText;
  el('previewName').textContent = tenant ? tenant.name : 'Restaurant name';
  el('previewBtn').style.background = primary;
}

['brPrimary','brLogoText','brTenant'].forEach(id => el(id).addEventListener('input', updateBrandingPreview));
el('brSecondary').addEventListener('input', updateBrandingPreview);

el('brPrimary').addEventListener('input', () => { el('brPrimaryHex').value = el('brPrimary').value; });
el('brPrimaryHex').addEventListener('input', () => {
  if(/^#[0-9a-fA-F]{6}$/.test(el('brPrimaryHex').value)){ el('brPrimary').value = el('brPrimaryHex').value; updateBrandingPreview(); }
});
el('brSecondary').addEventListener('input', () => { el('brSecondaryHex').value = el('brSecondary').value; });
el('brSecondaryHex').addEventListener('input', () => {
  if(/^#[0-9a-fA-F]{6}$/.test(el('brSecondaryHex').value)){ el('brSecondary').value = el('brSecondaryHex').value; }
});

el('brandingForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const note = el('brandingNote');
  note.className = 'form-note';
  const tenantId = el('brTenant').value;
  if(!tenantId){ note.textContent = 'Onboard a restaurant first.'; note.className = 'form-note error'; return; }
  const payload = {
    primary_color: el('brPrimaryHex').value,
    secondary_color: el('brSecondaryHex').value,
    logo_text: el('brLogoText').value.trim() || 'LP'
  };
  try{
    const res = await fetch(`${API}/admin/branding/${tenantId}`, {
      method:'PUT', credentials:'include',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if(!res.ok){
      note.textContent = data.error || 'Could not update branding.';
      note.className = 'form-note error';
      return;
    }
    note.textContent = 'Branding saved.';
    note.className = 'form-note success';
    showToast('Branding updated.');
  }catch(err){
    note.textContent = 'Could not reach the server.';
    note.className = 'form-note error';
  }
});

/* ---------- Staff & Users ---------- */
async function loadUsers(){
  if(tenantsCache.length === 0){
    const dres = await fetch(`${API}/admin/dashboard`, { credentials:'include' });
    if(dres.ok){ const d = await dres.json(); tenantsCache = d.tenants || []; }
  }
  populateTenantSelect(el('uTenant'));

  const res = await fetch(`${API}/admin/users`, { credentials:'include' });
  const users = await res.json();
  el('userCount').textContent = `${users.length} account${users.length === 1 ? '' : 's'}`;
  const body = el('userBody');
  body.innerHTML = '';
  if(users.length === 0){
    body.innerHTML = `<tr><td colspan="4" class="ledger-empty">No accounts yet.</td></tr>`;
    return;
  }
  users.forEach(u => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${u.full_name}</td>
      <td>${u.email}</td>
      <td><span class="status-pill ${u.role === 'admin' ? 'active' : 'inactive'}">${u.role}</span></td>
      <td>${u.restaurant || '—'}</td>
    `;
    body.appendChild(row);
  });
}

el('userForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const note = el('userNote');
  note.className = 'form-note';
  const payload = {
    tenant_id: el('uTenant').value,
    email: el('uEmail').value.trim().toLowerCase(),
    password: el('uPassword').value,
    full_name: el('uName').value.trim()
  };
  try{
    const res = await fetch(`${API}/admin/users`, {
      method:'POST', credentials:'include',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if(!res.ok){
      note.textContent = data.error || 'Could not create account.';
      note.className = 'form-note error';
      return;
    }
    note.textContent = 'Staff account created.';
    note.className = 'form-note success';
    e.target.reset();
    showToast('Staff account created.');
    loadUsers();
  }catch(err){
    note.textContent = 'Could not reach the server.';
    note.className = 'form-note error';
  }
});

/* ---------- Analytics ---------- */
async function loadAnalytics(){
  const res = await fetch(`${API}/admin/analytics`, { credentials:'include' });
  const rows = await res.json();
  const totalOrders = rows.reduce((sum, r) => sum + Number(r.orders), 0);
  const totalRevenue = rows.reduce((sum, r) => sum + Number(r.revenue), 0);
  el('anTotalOrders').textContent = totalOrders;
  el('anTotalRevenue').textContent = money(totalRevenue);

  const body = el('analyticsBody');
  body.innerHTML = '';
  if(rows.length === 0){
    body.innerHTML = `<tr><td colspan="5" class="ledger-empty">No tenants to report on yet.</td></tr>`;
    return;
  }
  rows.forEach(r => {
    const isActive = r.is_active === true || r.is_active === 't' || r.is_active === 1;
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${r.name}</td>
      <td>${r.subdomain}</td>
      <td><span class="status-pill ${isActive ? 'active' : 'inactive'}">${isActive ? 'Active' : 'Inactive'}</span></td>
      <td class="num">${r.orders}</td>
      <td class="num">${money(r.revenue)}</td>
    `;
    body.appendChild(row);
  });
}