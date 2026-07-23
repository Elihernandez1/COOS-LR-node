const API = '/api';
const el = id => document.getElementById(id);

el('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = el('loginEmail').value.trim();
  const password = el('loginPassword').value;
  const errorEl = el('loginError');
  errorEl.style.display = 'none';

  const btn = el('loginBtn');
  btn.disabled = true;
  btn.textContent = 'Signing in…';

  try{
    const res = await fetch(`${API}/auth/login`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      credentials:'include',
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if(!res.ok){
      errorEl.textContent = data.error || 'Invalid email or password.';
      errorEl.style.display = 'block';
      return;
    }

    if(data.role === 'staff'){
      location.href = '/staff/';
    }else if(data.role === 'admin'){
      location.href = '/admin/';
    }else{
      errorEl.textContent = 'This account type isn\'t supported for sign-in here.';
      errorEl.style.display = 'block';
    }
  }catch(err){
    errorEl.textContent = 'Could not reach the server.';
    errorEl.style.display = 'block';
  }finally{
    btn.disabled = false;
    btn.textContent = 'Sign in';
  }
});