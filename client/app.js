const API = '/api/customer';
const el = id => document.getElementById(id);

/* Free-to-use Pexels photos, one per cuisine, matched by subdomain.
   Direct CDN hotlinks — Pexels license: free for commercial use, no attribution required. */
const PHOTO_MAP = {
  'pizzeria-luigi': 'https://images.pexels.com/photos/905847/pexels-photo-905847.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop',
  'sakura-sushi': 'https://images.pexels.com/photos/2098134/pexels-photo-2098134.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop',
  'brew-and-bean': 'https://images.pexels.com/photos/302900/pexels-photo-302900.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop'
};
const FALLBACK_PHOTO = 'https://images.pexels.com/photos/905847/pexels-photo-905847.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop';

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
      const photo = PHOTO_MAP[r.subdomain] || FALLBACK_PHOTO;
      card.style.backgroundImage = `linear-gradient(180deg, rgba(22,19,17,0.15) 0%, rgba(22,19,17,0.55) 55%, rgba(22,19,17,0.92) 100%), url('${photo}')`;
      card.innerHTML = `
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