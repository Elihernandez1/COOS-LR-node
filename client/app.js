const API = '/api/customer';
const el = id => document.getElementById(id);

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

loadPicker();