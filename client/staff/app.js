const API = '/api';
const el = id => document.getElementById(id);
const money = n => '$' + Number(n).toFixed(2);

const STATUS_NEXT = { 'Received':'In-Progress', 'In-Progress':'Ready', 'Ready':'Completed' };
const STATUS_LABEL = { 'Received':'Start preparing', 'In-Progress':'Mark ready', 'Ready':'Complete order' };

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
    if(!res.ok || data.role !== 'staff'){
      el('loginError').textContent = data.role && data.role !== 'staff' ? 'This account is not a staff account.' : (data.error || 'Invalid email or password.');
      el('loginError').style.display = 'block';
      return;
    }
    el('loginScreen').style.display = 'none';
    el('appScreen').style.display = 'block';
    el('staffName').textContent = 'Order board';
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
    if(btn.dataset.view === 'menu') loadMenu();
    if(btn.dataset.view === 'history') loadHistory();
  };
});

/* ---------- Dashboard ---------- */
async function loadDashboard(){
  const res = await fetch(`${API}/staff/dashboard`, { credentials:'include' });
  if(!res.ok){ alert('Session expired. Please sign in again.'); location.reload(); return; }
  const data = await res.json();
  el('statReceived').textContent = data.counts['Received'] || 0;
  el('statProgress').textContent = data.counts['In-Progress'] || 0;
  el('statReady').textContent = data.counts['Ready'] || 0;

  const cols = { 'Received': el('colReceived'), 'In-Progress': el('colProgress'), 'Ready': el('colReady') };
  Object.values(cols).forEach(c => c.innerHTML = '');
  const grouped = { 'Received':[], 'In-Progress':[], 'Ready':[] };
  data.orders.forEach(o => { if(grouped[o.status]) grouped[o.status].push(o); });

  Object.keys(grouped).forEach(status => {
    const col = cols[status];
    if(grouped[status].length === 0){
      col.innerHTML = `<div class="rail-empty">Nothing here right now.</div>`;
      return;
    }
    grouped[status].forEach(order => col.appendChild(renderTicket(order)));
  });
}

function renderTicket(order){
  const t = document.createElement('div');
  t.className = 'ticket';
  t.innerHTML = `
    <div class="ticket-top">
      <span class="ticket-id">#${order.order_id}</span>
      <span class="ticket-total">${money(order.total_amount)}</span>
    </div>
    <div class="ticket-name">${order.customer_name}</div>
    <div class="ticket-meta">${order.customer_phone} &middot; ${order.delivery_address}</div>
    ${order.special_notes ? `<div class="ticket-notes">${order.special_notes}</div>` : ''}
    <div class="ticket-actions">
      <button class="advance-btn">${STATUS_LABEL[order.status]}</button>
      <button class="cancel-btn">Cancel</button>
    </div>
  `;
  t.querySelector('.advance-btn').onclick = () => advanceOrder(order.order_id);
  t.querySelector('.cancel-btn').onclick = () => cancelOrder(order.order_id);
  return t;
}

async function advanceOrder(orderId){
  await fetch(`${API}/staff/order/${orderId}/advance`, { method:'POST', credentials:'include' });
  loadDashboard();
}
async function cancelOrder(orderId){
  const reason = prompt('Reason for cancelling this order?', 'Customer request');
  if(reason === null) return;
  await fetch(`${API}/staff/order/${orderId}/cancel`, {
    method:'POST', credentials:'include',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ reason })
  });
  loadDashboard();
}

/* ---------- Menu ---------- */
async function loadMenu(){
  const res = await fetch(`${API}/staff/menu`, { credentials:'include' });
  const items = await res.json();
  const body = el('menuBody');
  body.innerHTML = '';
  items.forEach(item => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${item.name}</td>
      <td>${item.category}</td>
      <td>${money(item.price)}</td>
      <td><button class="avail-toggle ${item.is_available ? 'avail-on' : 'avail-off'}">${item.is_available ? 'Available' : 'Unavailable'}</button></td>
    `;
    row.querySelector('.avail-toggle').onclick = async () => {
      await fetch(`${API}/staff/menu/${item.item_id}/toggle`, { method:'POST', credentials:'include' });
      loadMenu();
    };
    body.appendChild(row);
  });
}

/* ---------- History ---------- */
async function loadHistory(){
  const res = await fetch(`${API}/staff/history`, { credentials:'include' });
  const orders = await res.json();
  const list = el('historyList');
  list.innerHTML = '';
  if(orders.length === 0){
    list.innerHTML = `<div class="rail-empty">No completed or cancelled orders yet.</div>`;
    return;
  }
  orders.forEach(o => {
    const row = document.createElement('div');
    row.className = 'history-row';
    row.innerHTML = `
      <span>#${o.order_id} &middot; ${o.customer_name}</span>
      <span>${money(o.total_amount)}</span>
      <span class="status-tag ${o.status}">${o.status}</span>
    `;
    list.appendChild(row);
  });
}

/* ---------- Auto-refresh dashboard every 15s ---------- */
setInterval(() => {
  if(el('appScreen').style.display === 'block' && el('view-dashboard').classList.contains('active')){
    loadDashboard();
  }
}, 15000);