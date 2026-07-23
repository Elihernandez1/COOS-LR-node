const params = new URLSearchParams(location.search);
const SUBDOMAIN = params.get('r');
const API = '/api/customer';

const THEME_MAP = { 'pizzeria-luigi':'theme-italian', 'sakura-sushi':'theme-japan', 'brew-and-bean':'theme-coffee' };

const el = id => document.getElementById(id);
const money = n => '$' + Number(n).toFixed(2);

/* ============================================================
   PICKER MODE — no ?r= param, show "choose a restaurant" screen
   ============================================================ */
async function loadPicker(){
  const grid = el('pickerGrid');
  try{
    const res = await fetch(`${API}/restaurants`);
    const restaurants = await res.json();
    if(!res.ok || restaurants.length === 0){
      grid.innerHTML = `<div class="empty-state">No restaurants are available to order from right now.</div>`;
      return;
    }
    grid.innerHTML = '';
    restaurants.forEach(r => {
      const card = document.createElement('a');
      card.className = 'picker-card';
      card.href = `/customer/?r=${encodeURIComponent(r.subdomain)}`;
      const primary = r.primary_color || '#e8751a';
      card.innerHTML = `
        <div class="picker-card-logo" style="background:${primary};">${r.logo_text || r.name.slice(0,2).toUpperCase()}</div>
        <div class="picker-card-body">
          <div class="picker-card-name">${r.name}</div>
          <div class="picker-card-address">${r.address || ''}</div>
        </div>
        <div class="picker-card-arrow">&rarr;</div>
      `;
      grid.appendChild(card);
    });
  }catch(err){
    grid.innerHTML = `<div class="empty-state">Could not load restaurants. Please try again.</div>`;
  }
}

/* ============================================================
   ORDER MODE — ?r=<subdomain> present, existing menu/cart flow
   ============================================================ */
let tenant = null, branding = null, allItems = [], categories = [];
let currentCat = 'All', currentQ = '';
let cart = {}; // item_id -> {name, price, qty}

function applyBranding(){
  if(!branding) return;
  document.documentElement.style.setProperty('--accent', branding.primary_color || '#e8751a');
  const soft = hexToRgba(branding.primary_color || '#e8751a', 0.16);
  document.documentElement.style.setProperty('--accent-soft', soft);
  el('logoBadge').textContent = branding.logo_text || '??';
}
function hexToRgba(hex, a){
  const c = hex.replace('#','');
  const r = parseInt(c.substring(0,2),16), g = parseInt(c.substring(2,4),16), b = parseInt(c.substring(4,6),16);
  return `rgba(${r},${g},${b},${a})`;
}

async function loadMenu(){
  const url = `${API}/menu/${SUBDOMAIN}?cat=${encodeURIComponent(currentCat)}&q=${encodeURIComponent(currentQ)}`;
  const res = await fetch(url);
  if(!res.ok){
    el('menuList').innerHTML = `<div class="empty-state">Restaurant not found or currently closed. <a href="/customer/">Choose a different restaurant</a>.</div>`;
    return;
  }
  const data = await res.json();
  tenant = data.tenant; branding = data.branding; allItems = data.items; categories = data.categories;

  el('tenantName').textContent = tenant.name;
  el('tenantTagline').textContent = tenant.address || '';
  applyBranding();
  renderCategoryBar();
  renderMenu();
}

function renderCategoryBar(){
  const bar = el('catBar');
  bar.innerHTML = '';
  ['All', ...categories].forEach(cat => {
    const b = document.createElement('button');
    b.className = 'cat-btn' + (cat === currentCat ? ' active' : '');
    b.textContent = cat;
    b.onclick = () => { currentCat = cat; loadMenu(); };
    bar.appendChild(b);
  });
}

function renderMenu(){
  const list = el('menuList');
  if(allItems.length === 0){
    list.innerHTML = `<div class="empty-state">Nothing matches that search.</div>`;
    return;
  }
  const grouped = {};
  allItems.forEach(item => {
    if(!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  });
  list.innerHTML = '';
  Object.keys(grouped).forEach(cat => {
    const label = document.createElement('div');
    label.className = 'category-label';
    label.textContent = cat;
    list.appendChild(label);
    grouped[cat].forEach(item => list.appendChild(renderItemRow(item)));
  });
}

function renderItemRow(item){
  const row = document.createElement('div');
  row.className = 'item-row';
  row.innerHTML = `
    <div class="item-info">
      <div class="item-name-line">
        <span class="item-name">${item.name}</span>
        ${item.badge ? `<span class="badge">${item.badge}</span>` : ''}
      </div>
      ${item.description ? `<div class="item-desc">${item.description}</div>` : ''}
    </div>
    <div class="item-price">${money(item.price)}</div>
    <button class="add-btn" aria-label="Add ${item.name}">+</button>
  `;
  row.querySelector('.add-btn').onclick = () => addToCart(item);
  return row;
}

function addToCart(item){
  const key = String(item.item_id);
  if(cart[key]) cart[key].qty += 1;
  else cart[key] = { item_id: item.item_id, name: item.name, price: Number(item.price), qty: 1 };
  updateCartUI();
}
function changeQty(key, delta){
  cart[key].qty += delta;
  if(cart[key].qty <= 0) delete cart[key];
  updateCartUI();
}

function updateCartUI(){
  const keys = Object.keys(cart);
  const count = keys.reduce((s,k)=>s+cart[k].qty,0);
  const total = keys.reduce((s,k)=>s+cart[k].qty*cart[k].price,0);
  el('cartCount').textContent = count;
  el('cartTotal').textContent = money(total);
  el('checkoutTotal').textContent = money(total);
  el('goToCheckout').disabled = count === 0;

  const itemsEl = el('cartItems');
  if(keys.length === 0){
    itemsEl.innerHTML = `<div class="empty-state">Your ticket is empty. Add something from the menu.</div>`;
    return;
  }
  itemsEl.innerHTML = '';
  keys.forEach(key => {
    const c = cart[key];
    const line = document.createElement('div');
    line.className = 'cart-line';
    line.innerHTML = `
      <span class="cart-line-name">${c.name}</span>
      <div class="qty-controls">
        <button data-d="-1">&minus;</button>
        <span>${c.qty}</span>
        <button data-d="1">+</button>
      </div>
      <span>${money(c.price*c.qty)}</span>
    `;
    line.querySelectorAll('button').forEach(btn=>{
      btn.onclick = () => changeQty(key, parseInt(btn.dataset.d));
    });
    itemsEl.appendChild(line);
  });
}

/* --- Drawer state machine --- */
function openCart(){ el('cartOverlay').classList.add('open'); el('cartDrawer').classList.add('open'); showState('cart'); }
function closeCart(){ el('cartOverlay').classList.remove('open'); el('cartDrawer').classList.remove('open'); }
function showState(name){
  el('stateCart').style.display = name==='cart' ? 'flex' : 'none';
  el('stateCheckout').style.display = name==='checkout' ? 'flex' : 'none';
  el('stateConfirm').style.display = name==='confirm' ? 'flex' : 'none';
}

function initOrderApp(){
  document.body.classList.add(THEME_MAP[SUBDOMAIN] || 'theme-italian');

  el('cartToggle').onclick = openCart;
  el('cartOverlay').onclick = closeCart;
  el('closeCart').onclick = closeCart;
  el('closeCart2').onclick = closeCart;
  el('closeCart3').onclick = closeCart;
  el('goToCheckout').onclick = () => showState('checkout');
  el('backToCart').onclick = () => showState('cart');

  el('searchInput').addEventListener('input', (e)=>{
    currentQ = e.target.value;
    clearTimeout(window._searchTimer);
    window._searchTimer = setTimeout(loadMenu, 300);
  });

  el('placeOrderBtn').onclick = async () => {
    const name = el('fName').value.trim();
    const phone = el('fPhone').value.trim();
    const address = el('fAddress').value.trim();
    if(!name || !phone || !address){
      alert('Please fill in name, phone, and delivery address.');
      return;
    }
    const payload = {
      subdomain: SUBDOMAIN,
      name, phone, address,
      notes: el('fNotes').value.trim(),
      payment: el('fPayment').value,
      cart: Object.values(cart)
    };
    el('placeOrderBtn').disabled = true;
    el('placeOrderBtn').textContent = 'Placing order…';
    try{
      const res = await fetch(`${API}/checkout`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Order failed');

      el('confirmId').textContent = `Order #${data.orderId}`;
      el('confirmStatus').textContent = 'Received';
      el('confirmItems').innerHTML = Object.values(cart).map(c =>
        `<div class="cart-line"><span class="cart-line-name">${c.qty}&times; ${c.name}</span><span>${money(c.price*c.qty)}</span></div>`
      ).join('');
      cart = {};
      updateCartUI();
      showState('confirm');
    }catch(err){
      alert(err.message);
    }finally{
      el('placeOrderBtn').disabled = false;
      el('placeOrderBtn').textContent = 'Place order';
    }
  };

  updateCartUI();
  loadMenu();
}

/* ============================================================
   ENTRY POINT — decide picker vs. order app
   ============================================================ */
if(!SUBDOMAIN){
  el('pickerScreen').style.display = 'block';
  el('orderApp').style.display = 'none';
  loadPicker();
}else{
  el('pickerScreen').style.display = 'none';
  el('orderApp').style.display = 'block';
  initOrderApp();
}