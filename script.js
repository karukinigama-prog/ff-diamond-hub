/* ================================================================
   FF DIAMOND HUB — script.js
   Main page logic: Auth, Wallet, Orders, Packages
   Created by Hasith
================================================================ */

// ── PACKAGES ─────────────────────────────────────────────────────
const PACKAGES = [
  { id:'pkg_100',    icon:'💎', name:'100 Diamonds',    price:170,  officialPrice:600,  type:'diamond' },
  { id:'pkg_210',    icon:'💎', name:'210 Diamonds',    price:355,  officialPrice:1100, type:'diamond' },
  { id:'pkg_530',    icon:'💎', name:'530 Diamonds',    price:850,  officialPrice:2600, type:'diamond' },
  { id:'pkg_1060',   icon:'💎', name:'1060 Diamonds',   price:1650, officialPrice:5000, type:'diamond' },
  { id:'pkg_weekly', icon:'🗓️', name:'Weekly Member',   price:600,  officialPrice:1200, type:'membership' },
  { id:'pkg_monthly',icon:'👑', name:'Monthly Member',  price:2400, officialPrice:4500, type:'membership' }
];

// ── STATE ─────────────────────────────────────────────────────────
let selectedPackage = null;
let selectedPayment = null;
let currentUser     = null;
let currentProfile  = null;

// ── INIT ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderPackages();
  checkAuth();
});

// ── AUTH CHECK ────────────────────────────────────────────────────
async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    currentUser = session.user;
    await loadProfile();
    showLoggedIn();
  } else {
    showGuest();
  }
}

async function loadProfile() {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', currentUser.id)
    .single();

  currentProfile = data;

  if (data) {
    document.getElementById('walletBalance').textContent =
      parseFloat(data.wallet_balance || 0).toFixed(2);
    document.getElementById('navUserName').textContent =
      '👋 ' + (data.name || 'User');

    // Show admin button if admin
    if (data.role === 'ADMIN') {
      document.getElementById('nav-admin-link').style.display = 'block';
    }
  }
}

function showLoggedIn() {
  document.getElementById('nav-guest').style.display   = 'none';
  document.getElementById('nav-user').style.display    = 'flex';
  document.getElementById('guestNotice').style.display = 'none';
  document.getElementById('orderForm').style.display   = 'block';
}

function showGuest() {
  document.getElementById('nav-guest').style.display   = 'block';
  document.getElementById('nav-user').style.display    = 'none';
  document.getElementById('guestNotice').style.display = 'block';
  document.getElementById('orderForm').style.display   = 'none';
}

async function handleLogout() {
  await supabase.auth.signOut();
  window.location.reload();
}

// ── RENDER PACKAGES ───────────────────────────────────────────────
function renderPackages() {
  const grid = document.getElementById('packageGrid');
  if (!grid) return;
  grid.innerHTML = PACKAGES.map(pkg => {
    const savings = pkg.officialPrice - pkg.price;
    return `
      <div class="pkg-card ${pkg.type === 'membership' ? 'membership' : ''}"
           id="pkg-${pkg.id}" onclick="selectPackage('${pkg.id}')">
        <span class="pkg-icon">${pkg.icon}</span>
        <span class="pkg-name">${pkg.name}</span>
        <span class="pkg-price">LKR ${pkg.price.toLocaleString()}</span>
        <span class="pkg-savings">Save LKR ${savings.toLocaleString()}</span>
      </div>`;
  }).join('');
}

// ── SELECT PACKAGE ────────────────────────────────────────────────
function selectPackage(pkgId) {
  document.querySelectorAll('.pkg-card').forEach(el => el.classList.remove('selected'));
  const pkg = PACKAGES.find(p => p.id === pkgId);
  if (!pkg) return;
  selectedPackage = pkg;
  document.getElementById(`pkg-${pkgId}`).classList.add('selected');
  updatePriceDisplay(pkg);
}

function updatePriceDisplay(pkg) {
  const amountEl = document.getElementById('priceAmount');
  amountEl.style.opacity = '0';
  setTimeout(() => {
    document.getElementById('selectedPackageName').textContent = pkg.name;
    amountEl.textContent = pkg.price.toLocaleString();
    amountEl.style.opacity = '1';
    amountEl.style.transition = 'opacity 0.2s';
  }, 120);
}

// ── SELECT PAYMENT ────────────────────────────────────────────────
function selectPayment(method) {
  selectedPayment = method;
  ['wallet','cash'].forEach(m => {
    document.getElementById(`pay-${m}`)?.classList.remove('selected');
  });
  document.getElementById(`pay-${method}`)?.classList.add('selected');
  const cashNote = document.getElementById('cashNote');
  if (cashNote) cashNote.classList.toggle('show', method === 'cash');
}

// ── VALIDATE ID ───────────────────────────────────────────────────
function validateID(input) {
  const hint = document.getElementById('idHint');
  input.value = input.value.replace(/\D/g, '');
  if (input.value.length > 0 && input.value.length < 6) {
    input.classList.add('error');
    hint.textContent = '⚠ Player ID must be at least 6 digits';
    hint.classList.add('error-msg');
  } else if (input.value.length >= 6) {
    input.classList.remove('error');
    hint.textContent = '✓ Looks good!';
    hint.style.color = '#4ade80';
  } else {
    input.classList.remove('error');
    hint.textContent = 'Enter your in-game numeric ID';
    hint.style.color = '';
  }
}

// ── CONFIRM ORDER ─────────────────────────────────────────────────
async function confirmOrder() {
  const playerID = document.getElementById('playerID').value.trim();

  if (!playerID || playerID.length < 6) {
    showToast('⚠ Enter a valid Player ID (min 6 digits)', 'error'); return;
  }
  if (!selectedPackage) {
    showToast('⚠ Please select a package', 'error'); return;
  }
  if (!selectedPayment) {
    showToast('⚠ Please choose a payment method', 'error'); return;
  }

  // Wallet payment: check balance
  if (selectedPayment === 'wallet') {
    const balance = parseFloat(currentProfile?.wallet_balance || 0);
    if (balance < selectedPackage.price) {
      showToast(`❌ Insufficient balance. You have LKR ${balance.toFixed(2)}`, 'error');
      return;
    }
  }

  const btn = document.getElementById('confirmBtn');
  const btnText = btn.querySelector('.btn-confirm-text');
  btnText.textContent = 'Processing...';
  btn.disabled = true;

  try {
    // Deduct wallet if wallet payment
    if (selectedPayment === 'wallet') {
      const newBalance = parseFloat(currentProfile.wallet_balance) - selectedPackage.price;
      const { error: walletErr } = await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', currentUser.id);
      if (walletErr) throw walletErr;
      currentProfile.wallet_balance = newBalance;
      document.getElementById('walletBalance').textContent = newBalance.toFixed(2);
    }

    // Insert order
    const { error: orderErr } = await supabase
      .from('orders')
      .insert({
        user_id:        currentUser.id,
        player_uid:     playerID,
        package_name:   selectedPackage.name,
        price:          selectedPackage.price,
        status:         'PENDING',
        payment_method: selectedPayment === 'wallet' ? 'WALLET' : 'CASH'
      });

    if (orderErr) throw orderErr;

    if (selectedPayment === 'cash') {
      showToast('⏳ Order placed! Pay cash to admin to confirm.', 'pending');
    } else {
      showToast('✅ Order placed! Diamonds will be delivered shortly.', 'success');
    }

    // Reset form
    selectedPackage = null;
    selectedPayment = null;
    document.querySelectorAll('.pkg-card').forEach(c => c.classList.remove('selected'));
    ['wallet','cash'].forEach(m => document.getElementById(`pay-${m}`)?.classList.remove('selected'));
    document.getElementById('playerID').value = '';
    document.getElementById('selectedPackageName').textContent = 'No package selected';
    document.getElementById('priceAmount').textContent = '—';
    document.getElementById('cashNote').classList.remove('show');

  } catch (err) {
    showToast('❌ Error: ' + err.message, 'error');
  }

  btnText.textContent = 'Confirm Order';
  btn.disabled = false;
}

// ── TOAST ──────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  if (toastTimer) clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}

// ── NAVBAR SCROLL ─────────────────────────────────────────────────
window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;
  navbar.style.borderBottomColor = window.scrollY > 10 ? '#1e2430' : 'var(--border)';
}, { passive: true });

// ── PWA ───────────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('✅ FF Hub PWA ready'))
      .catch(err => console.log('SW error:', err));
  });
}
