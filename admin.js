/* ================================================================
   FF DIAMOND HUB — admin.js
   Admin Panel Logic: Users, Wallets, Orders
   Created by Hasith
================================================================ */

let allUsers   = [];
let allOrders  = [];
let selectedUser = null;

// ── INIT ─────────────────────────────────────────────────────────
async function init() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.href = 'auth.html'; return; }

  // Check admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (!profile || profile.role !== 'ADMIN') {
    alert('Access denied. Admins only.');
    window.location.href = 'index.html';
    return;
  }

  await loadStats();
  await loadUsers();
  await loadAllOrders();

  // Auto refresh every 15 seconds
  setInterval(async () => {
    await loadStats();
    await loadAllOrders();
  }, 15000);
}

// ── STATS ─────────────────────────────────────────────────────────
async function loadStats() {
  // Total users
  const { count: userCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'CUSTOMER');

  // Pending orders
  const { count: pendingCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'PENDING');

  // Total orders
  const { count: totalCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true });

  // Total profit (sum of SUCCESS order prices)
  const { data: successOrders } = await supabase
    .from('orders')
    .select('price')
    .eq('status', 'SUCCESS');

  const profit = successOrders
    ? successOrders.reduce((sum, o) => sum + parseFloat(o.price), 0)
    : 0;

  document.getElementById('statUsers').textContent   = userCount || 0;
  document.getElementById('statPending').textContent = pendingCount || 0;
  document.getElementById('statTotal').textContent   = totalCount || 0;
  document.getElementById('statProfit').textContent  = profit.toFixed(2);
}

// ── USERS ─────────────────────────────────────────────────────────
async function loadUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) { showToast('Failed to load users', 'error'); return; }
  allUsers = data || [];
  renderUsers(allUsers);
}

function renderUsers(users) {
  const list = document.getElementById('usersList');
  if (users.length === 0) {
    list.innerHTML = '<p style="color:var(--text-muted);font-size:14px">No users found.</p>';
    return;
  }

  list.innerHTML = users.map(user => `
    <div class="user-row" onclick="openBalanceModal('${user.id}')">
      <div>
        <div class="user-name">${user.name || 'Unnamed'}</div>
        <div class="user-meta">
          ${user.email || ''}
          ${user.whatsapp ? ' · 📱 ' + user.whatsapp : ''}
          · <span style="color:${user.role === 'ADMIN' ? 'var(--orange)' : 'var(--text-dim)'}">${user.role}</span>
        </div>
      </div>
      <div class="user-balance">
        LKR ${parseFloat(user.wallet_balance || 0).toFixed(2)}
        <span>Tap to add balance</span>
      </div>
    </div>
  `).join('');
}

function searchUsers() {
  const q = document.getElementById('userSearch').value.toLowerCase();
  const filtered = allUsers.filter(u =>
    (u.name || '').toLowerCase().includes(q) ||
    (u.email || '').toLowerCase().includes(q)
  );
  renderUsers(filtered);
}

// ── BALANCE MODAL ─────────────────────────────────────────────────
function openBalanceModal(userId) {
  selectedUser = allUsers.find(u => u.id === userId);
  if (!selectedUser) return;

  document.getElementById('modalUserName').textContent =
    `${selectedUser.name || 'User'} — ${selectedUser.email || ''}`;
  document.getElementById('modalCurrentBal').textContent =
    parseFloat(selectedUser.wallet_balance || 0).toFixed(2);
  document.getElementById('balanceInput').value = '';

  document.getElementById('balanceModal').classList.add('open');
}

function closeModal() {
  document.getElementById('balanceModal').classList.remove('open');
  selectedUser = null;
}

function closeModalOutside(event) {
  if (event.target.id === 'balanceModal') closeModal();
}

async function addBalance() {
  if (!selectedUser) return;
  const amount = parseFloat(document.getElementById('balanceInput').value);

  if (!amount || amount <= 0) {
    showToast('Enter a valid amount', 'error'); return;
  }

  const newBalance = parseFloat(selectedUser.wallet_balance || 0) + amount;

  const { error } = await supabase
    .from('profiles')
    .update({ wallet_balance: newBalance })
    .eq('id', selectedUser.id);

  if (error) {
    showToast('Failed to update balance', 'error'); return;
  }

  showToast(`✅ Added LKR ${amount} to ${selectedUser.name || 'user'}`, 'success');
  closeModal();
  await loadUsers();
  await loadStats();
}

// ── ORDERS ────────────────────────────────────────────────────────
async function loadAllOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      profiles ( name, email )
    `)
    .order('created_at', { ascending: false });

  if (error) { showToast('Failed to load orders', 'error'); return; }
  allOrders = data || [];
  renderAdminOrders(allOrders);
}

function renderAdminOrders(orders) {
  const tbody = document.getElementById('ordersTableBody');
  if (orders.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="9">No orders found</td></tr>';
    return;
  }

  tbody.innerHTML = orders.map(order => {
    const date = new Date(order.created_at).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
    const userName = order.profiles?.name || 'Unknown';
    const actions = order.status === 'PENDING' ? `
      <button class="action-btn success" onclick="updateOrderStatus('${order.id}','SUCCESS')">✓ Success</button>
      <button class="action-btn failed"  onclick="updateOrderStatus('${order.id}','FAILED')">✗ Fail</button>
    ` : '—';

    return `
      <tr>
        <td style="font-family:monospace;font-size:12px">#${order.id.slice(-8).toUpperCase()}</td>
        <td>${userName}</td>
        <td style="font-family:monospace">${order.player_uid}</td>
        <td>${order.package_name}</td>
        <td style="color:var(--cyan);font-weight:600">LKR ${order.price}</td>
        <td>${order.payment_method === 'CASH' ? '💵 Cash' : '💳 Wallet'}</td>
        <td><span class="status-badge ${order.status}">${order.status}</span></td>
        <td style="font-size:12px;color:var(--text-muted)">${date}</td>
        <td>${actions}</td>
      </tr>`;
  }).join('');
}

function filterAdminOrders(status, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (status === 'ALL') renderAdminOrders(allOrders);
  else renderAdminOrders(allOrders.filter(o => o.status === status));
}

async function updateOrderStatus(orderId, newStatus) {
  const { error } = await supabase
    .from('orders')
    .update({ status: newStatus })
    .eq('id', orderId);

  if (error) { showToast('Failed to update order', 'error'); return; }

  showToast(`✅ Order marked as ${newStatus}`, 'success');
  await loadAllOrders();
  await loadStats();
}

// ── LOGOUT ────────────────────────────────────────────────────────
async function handleLogout() {
  await supabase.auth.signOut();
  window.location.href = 'auth.html';
}

// ── TOAST ─────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  if (toastTimer) clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}

// Start
init();
