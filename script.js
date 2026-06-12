/* ================================================================
   FF DIAMOND HUB — script.js
   Full interactive logic: packages, price calc, payment, orders
   Created by Hasith
================================================================ */

// ── PACKAGE DATA ─────────────────────────────────────────────────
// Edit prices here anytime to update the whole UI instantly
const PACKAGES = [
  {
    id: 'pkg_100',
    icon: '💎',
    name: '100 Diamonds',
    shortName: '100 💎',
    price: 170,
    officialPrice: 600,
    type: 'diamond'
  },
  {
    id: 'pkg_210',
    icon: '💎',
    name: '210 Diamonds',
    shortName: '210 💎',
    price: 355,
    officialPrice: 1100,
    type: 'diamond'
  },
  {
    id: 'pkg_530',
    icon: '💎',
    name: '530 Diamonds',
    shortName: '530 💎',
    price: 850,
    officialPrice: 2600,
    type: 'diamond'
  },
  {
    id: 'pkg_1060',
    icon: '💎',
    name: '1060 Diamonds',
    shortName: '1060 💎',
    price: 1650,
    officialPrice: 5000,
    type: 'diamond'
  },
  {
    id: 'pkg_weekly',
    icon: '🗓️',
    name: 'Weekly Member',
    shortName: 'Weekly',
    price: 650,
    officialPrice: 1200,
    type: 'membership'
  },
  {
    id: 'pkg_monthly',
    icon: '👑',
    name: 'Monthly Member',
    shortName: 'Monthly',
    price: 2400,
    officialPrice: 4500,
    type: 'membership'
  }
];

// ── STATE ────────────────────────────────────────────────────────
let selectedPackage = null;   // currently selected PACKAGES item
let selectedPayment = null;   // 'card' | 'cash'

// ── INIT ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderPackages();
});

// ── RENDER PACKAGES ──────────────────────────────────────────────
function renderPackages() {
  const grid = document.getElementById('packageGrid');
  if (!grid) return;

  grid.innerHTML = PACKAGES.map(pkg => {
    const savings = pkg.officialPrice - pkg.price;
    const isMembership = pkg.type === 'membership';

    return `
      <div
        class="pkg-card ${isMembership ? 'membership' : ''}"
        id="pkg-${pkg.id}"
        onclick="selectPackage('${pkg.id}')"
      >
        <span class="pkg-icon">${pkg.icon}</span>
        <span class="pkg-name">${pkg.name}</span>
        <span class="pkg-price">LKR ${pkg.price.toLocaleString()}</span>
        <span class="pkg-savings">Save LKR ${savings.toLocaleString()}</span>
      </div>
    `;
  }).join('');
}

// ── SELECT PACKAGE ───────────────────────────────────────────────
function selectPackage(pkgId) {
  // Deselect all
  document.querySelectorAll('.pkg-card').forEach(el => el.classList.remove('selected'));

  // Find and apply selection
  const pkg = PACKAGES.find(p => p.id === pkgId);
  if (!pkg) return;

  selectedPackage = pkg;
  document.getElementById(`pkg-${pkgId}`).classList.add('selected');

  // Update price display with animation
  updatePriceDisplay(pkg);
}

// ── UPDATE PRICE DISPLAY ─────────────────────────────────────────
function updatePriceDisplay(pkg) {
  const nameEl   = document.getElementById('selectedPackageName');
  const amountEl = document.getElementById('priceAmount');

  // Brief flash animation
  amountEl.style.opacity = '0';
  amountEl.style.transform = 'translateY(6px)';

  setTimeout(() => {
    nameEl.textContent   = pkg.name;
    amountEl.textContent = pkg.price.toLocaleString();
    amountEl.style.opacity   = '1';
    amountEl.style.transform = 'translateY(0)';
    amountEl.style.transition = 'opacity 0.2s, transform 0.2s';
  }, 120);
}

// ── SELECT PAYMENT ───────────────────────────────────────────────
function selectPayment(method) {
  selectedPayment = method;

  // Reset UI
  ['card', 'cash'].forEach(m => {
    const card = document.getElementById(`pay-${m}`);
    if (card) card.classList.remove('selected');
  });

  // Apply selection
  const el = document.getElementById(`pay-${method}`);
  if (el) el.classList.add('selected');

  // Show/hide cash note
  const cashNote = document.getElementById('cashNote');
  if (cashNote) {
    if (method === 'cash') {
      cashNote.classList.add('show');
    } else {
      cashNote.classList.remove('show');
    }
  }
}

// ── VALIDATE PLAYER ID ───────────────────────────────────────────
function validateID(input) {
  const hint = document.getElementById('idHint');
  const val  = input.value.trim();

  // Remove non-numeric characters
  input.value = val.replace(/\D/g, '');

  if (input.value.length > 0 && input.value.length < 6) {
    input.classList.add('error');
    hint.textContent = '⚠ Player ID must be at least 6 digits';
    hint.classList.add('error-msg');
  } else if (input.value.length >= 6) {
    input.classList.remove('error');
    hint.textContent = '✓ Looks good!';
    hint.classList.remove('error-msg');
    hint.style.color = '#4ade80';
  } else {
    input.classList.remove('error');
    hint.textContent = 'Enter your in-game numeric ID';
    hint.classList.remove('error-msg');
    hint.style.color = '';
  }
}

// ── CONFIRM ORDER ────────────────────────────────────────────────
function confirmOrder() {
  const playerID = document.getElementById('playerID').value.trim();

  // — Validate Player ID
  if (!playerID || playerID.length < 6) {
    document.getElementById('playerID').focus();
    showToast('⚠ Please enter a valid Player ID (min 6 digits)', 'error');
    return;
  }

  // — Validate Package
  if (!selectedPackage) {
    showToast('⚠ Please select a diamond package', 'error');
    return;
  }

  // — Validate Payment Method
  if (!selectedPayment) {
    showToast('⚠ Please choose a payment method', 'error');
    return;
  }

  // — Build order object (ready to send to backend later)
  const order = {
    id:        `ORD-${Date.now()}`,
    playerID:  playerID,
    package:   selectedPackage.name,
    price:     selectedPackage.price,
    payment:   selectedPayment,
    status:    selectedPayment === 'cash' ? 'PENDING' : 'PROCESSING',
    createdAt: new Date().toISOString()
  };

  console.log('📦 New Order:', order);

  // — Show result
  if (selectedPayment === 'cash') {
    showToast(`⏳ Order #${order.id.slice(-6)} placed! Pending cash payment.`, 'pending');
  } else {
    showToast(`✅ Order confirmed! Processing payment for ${selectedPackage.name}.`, 'success');
  }

  // — Animate button
  animateConfirmBtn();
}

// ── ANIMATE CONFIRM BUTTON ───────────────────────────────────────
function animateConfirmBtn() {
  const btn      = document.getElementById('confirmBtn');
  const textEl   = btn.querySelector('.btn-confirm-text');
  const arrowEl  = btn.querySelector('.btn-confirm-arrow');

  const orig = textEl.textContent;

  textEl.textContent = 'Processing...';
  arrowEl.textContent = '⏳';
  btn.disabled = true;
  btn.style.opacity = '0.7';

  setTimeout(() => {
    textEl.textContent = 'Confirm Order';
    arrowEl.textContent = '→';
    btn.disabled = false;
    btn.style.opacity = '1';
  }, 2200);
}

// ── TOAST NOTIFICATION ───────────────────────────────────────────
let toastTimer = null;

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;

  // Clear any existing timer
  if (toastTimer) clearTimeout(toastTimer);

  toast.textContent = message;
  toast.className = `toast ${type} show`;

  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

// ── ADMIN MODAL ──────────────────────────────────────────────────
function openAdminModal() {
  const modal = document.getElementById('adminModal');
  if (modal) modal.classList.add('open');
}

function closeAdminModal() {
  const modal = document.getElementById('adminModal');
  if (modal) modal.classList.remove('open');
}

// Close if clicking outside the modal box
function closeAdminModalOutside(event) {
  if (event.target.id === 'adminModal') closeAdminModal();
}

function adminLogin() {
  const user = document.getElementById('adminUser').value.trim();
  const pass = document.getElementById('adminPass').value;

  if (!user || !pass) {
    showToast('⚠ Enter username and password', 'error');
    return;
  }

  // Placeholder: replace with real auth (Supabase / Firebase) later
  if (user === 'admin' && pass === 'admin123') {
    closeAdminModal();
    showToast('✅ Welcome back, Admin!', 'success');
    // TODO: redirect to /admin.html or load admin panel
  } else {
    showToast('❌ Incorrect credentials', 'error');
  }
}

// ── NAVBAR SCROLL SHADOW ─────────────────────────────────────────
window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;
  if (window.scrollY > 10) {
    navbar.style.borderBottomColor = '#1e2430';
  } else {
    navbar.style.borderBottomColor = 'var(--border)';
  }
}, { passive: true });

// ── PWA SERVICE WORKER ───────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('✅ FF Hub PWA ready'))
      .catch(err => console.log('SW error:', err));
  });
}
