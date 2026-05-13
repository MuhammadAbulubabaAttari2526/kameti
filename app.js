const STORAGE_KEY = "kameti_app_data";

// STATE
const COLORS = [
  'linear-gradient(135deg,#10b981,#065f46)',
  'linear-gradient(135deg,#3b82f6,#1e3a8a)',
  'linear-gradient(135deg,#f59e0b,#92400e)',
  'linear-gradient(135deg,#ef4444,#991b1b)',
  'linear-gradient(135deg,#8b5cf6,#4c1d95)',
  'linear-gradient(135deg,#06b6d4,#164e63)',
  'linear-gradient(135deg,#ec4899,#831843)',
  'linear-gradient(135deg,#84cc16,#365314)',
];

let state = {
  committees: [],
  members: [],
  payments: [],
  nextId: { committee: 1, member: 1, payment: 1 },
  filters: { member: 'all', payment: 'all' },
  isDark: true,
};

// SAVE
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// LOAD (SAFE VERSION)
function loadState() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return;

  try {
    const parsed = JSON.parse(data);

    state = {
      ...state,
      ...parsed,
      // safety fallback
      nextId: parsed.nextId || state.nextId,
      filters: parsed.filters || state.filters,
    };
  } catch (e) {
    console.log("Storage error reset");
  }
}
// ═══════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════
function getMember(id) { return state.members.find(m => m.id === id); }
function getCommittee(id) { return state.committees.find(c => c.id === id); }
function formatRs(n) { return 'Rs ' + Number(n).toLocaleString('en-PK'); }
function initials(name) { return name.trim().split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2); }
function colorForMember(m) { return m.color || COLORS[m.id % COLORS.length]; }
function today() { return new Date().toISOString().split('T')[0]; }

// ═══════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.getElementById('nav-' + page).classList.add('active');
  window.scrollTo({top:0,behavior:'smooth'});
  if (page === 'dashboard') renderDashboard();
  if (page === 'members') renderMembers();
  if (page === 'payments') renderPayments();
}

// ═══════════════════════════════════════
// THEME
// ═══════════════════════════════════════
let isDark = true;
function toggleTheme() {
  isDark = !isDark;
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  document.getElementById('themeIcon').className = isDark ? 'bi bi-moon-fill' : 'bi bi-sun-fill';
  showToast(isDark ? 'Dark mode on 🌙' : 'Light mode on ☀️', '');
}

// ═══════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════
function renderDashboard() {
  const totalPool = state.committees.reduce((s, c) => s + c.totalMembers * c.monthlyAmount * c.totalMembers, 0);
  const totalCollected = state.payments.filter(p => p.type === 'paid').reduce((s, p) => s + p.amount, 0);
  const totalPending = state.payments.filter(p => p.type === 'pending' || p.type === 'late').reduce((s, p) => s + p.amount, 0);

  let html = `
  <div style="background:var(--accent-light);border:1px solid rgba(16,185,129,.25);border-radius:12px;padding:11px 14px;margin-bottom:14px;display:flex;align-items:center;gap:10px;font-size:13px;">
    <div class="pulse-dot"></div>
    <div>Aktif Committees: <strong>${state.committees.length}</strong> — ${state.members.length} total members</div>
  </div>
  <div class="stats-grid">
    <div class="stat-card"><div class="stat-label"><i class="bi bi-people me-1"></i>Total Members</div><div class="stat-val c-text">${state.members.length}</div></div>
    <div class="stat-card"><div class="stat-label"><i class="bi bi-collection me-1"></i>Collected</div><div class="stat-val c-green">${formatRs(totalCollected)}</div></div>
    <div class="stat-card"><div class="stat-label"><i class="bi bi-hourglass me-1"></i>Pending</div><div class="stat-val c-warn">${formatRs(totalPending)}</div></div>
    <div class="stat-card"><div class="stat-label"><i class="bi bi-journal-check me-1"></i>Payments</div><div class="stat-val c-text">${state.payments.filter(p=>p.type==='paid').length}/${state.payments.length}</div></div>
  </div>`;

  state.committees.forEach(c => {
    const members = state.members.filter(m => m.committeeId === c.id);
    const paid = members.filter(m => m.status === 'paid').length;
    const pct = members.length ? Math.round((paid / members.length) * 100) : 0;
    const collected = state.payments.filter(p => p.committeeId === c.id && p.type === 'paid').reduce((s, p) => s + p.amount, 0);
    const totalPossible = members.length * c.monthlyAmount;
    const fillClass = pct < 50 ? 'warn-fill' : '';
    const badgeMonths = `Month ${c.currentMonth}/${c.totalMembers}`;

    html += `<div class="committee-card">
      <div class="comm-head">
        <div>
          <div class="comm-title" style="cursor:pointer" onclick="openKametiDetail(${c.id})">${c.name}</div>
          <div class="comm-meta">Monthly · ${formatRs(c.monthlyAmount)}/member · ${c.totalMembers} members</div>
        </div>
        <span class="badge badge-month">${badgeMonths}</span>
      </div>
      <div class="prog-wrap">
        <div class="prog-bg"><div class="prog-fill ${fillClass}" style="width:${pct}%"></div></div>
        <div class="prog-meta"><span>${formatRs(collected)} collected</span><span>${pct}% paid</span></div>
      </div>
      <div class="divider"></div>
      <div class="sec-label">Is month ki collection</div>`;

    members.forEach(m => {
      const statusIcon = m.status === 'paid' ? 'bi-check-circle-fill' : m.status === 'late' ? 'bi-x-circle-fill' : 'bi-hourglass-split';
      const statusClass = m.status === 'paid' ? 's-paid' : m.status === 'late' ? 's-late' : 's-pending';
      const statusText = m.status === 'paid' ? `Paid · ${formatRs(c.monthlyAmount)}` : m.status === 'late' ? 'Late — Fine Applied' : 'Pending';
      html += `<div class="member-row">
        <div class="mem-left">
          <div class="mem-avatar" style="background:${colorForMember(m)}">${initials(m.name)}</div>
          <div><div class="mem-name">${m.name}</div><div class="mem-sub">Member #${m.turn}</div></div>
        </div>
        <span class="mem-status ${statusClass}" onclick="openMemberDetail(${m.id})"><i class="bi ${statusIcon} me-1"></i>${statusText}</span>
      </div>`;
    });

    html += `<div class="action-row">
      <button class="btn-ghost" onclick="navigate('payments')"><i class="bi bi-journal-text me-1"></i>Payment Log</button>
      <button class="btn-ghost" onclick="openKametiDetail(${c.id})"><i class="bi bi-info-circle me-1"></i>Details</button>
    </div></div>`;
  });

  if (state.committees.length === 0) {
    html += `<div class="empty-state"><i class="bi bi-people"></i><p>Koi committee nahi. Nayi kameti banayein!</p></div>`;
  }

  document.getElementById('dashboardContent').innerHTML = html;
  // animate progress bars
  setTimeout(() => {
    document.querySelectorAll('.prog-fill').forEach(bar => {
      const w = bar.style.width; bar.style.width = '0%';
      setTimeout(() => { bar.style.width = w; }, 50);
    });
  }, 50);
}

// ═══════════════════════════════════════
// MEMBERS
// ═══════════════════════════════════════
function renderMembers() {
  const q = (document.getElementById('memberSearch')?.value || '').toLowerCase();
  const f = state.filters.member;
  const filtered = state.members.filter(m => {
    const c = getCommittee(m.committeeId);
    const matchQ = m.name.toLowerCase().includes(q) || (c?.name.toLowerCase().includes(q));
    const matchF = f === 'all' || m.status === f;
    return matchQ && matchF;
  });

  if (filtered.length === 0) {
    document.getElementById('memberList').innerHTML = `<div class="empty-state"><i class="bi bi-person-x"></i><p>Koi member nahi mila</p></div>`;
    return;
  }

  document.getElementById('memberList').innerHTML = filtered.map(m => {
    const c = getCommittee(m.committeeId);
    const badgeClass = m.status === 'paid' ? 'badge-active' : m.status === 'late' ? '' : 'badge-month';
    const badgeStyle = m.status === 'late' ? 'background:rgba(239,68,68,.1);color:#ef4444;border:1px solid rgba(239,68,68,.2)' : '';
    const statusLabel = m.status.charAt(0).toUpperCase() + m.status.slice(1);
    return `<div class="member-card" onclick="openMemberDetail(${m.id})">
      <div class="mc-avatar" style="background:${colorForMember(m)}">${initials(m.name)}</div>
      <div class="mc-info">
        <div class="mc-name">${m.name}</div>
        <div class="mc-sub">Member #${m.turn} · ${c?.name || '—'}</div>
      </div>
      <span class="mc-badge ${badgeClass}" style="${badgeStyle}">${statusLabel}</span>
    </div>`;
  }).join('');
}

function setMemberFilter(f, el) {
  state.filters.member = f;
  document.querySelectorAll('#memberChips .chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  renderMembers();
}

// ═══════════════════════════════════════
// PAYMENTS
// ═══════════════════════════════════════
function renderPayments() {
  const f = state.filters.payment;
  const filtered = state.payments.filter(p => f === 'all' || p.type === f);

  if (filtered.length === 0) {
    document.getElementById('paymentList').innerHTML = `<div class="empty-state"><i class="bi bi-cash-stack"></i><p>Koi payment record nahi</p></div>`;
    return;
  }

  // Group payments by committeeId
  const grouped = {};
  [...filtered].reverse().forEach(p => {
    const cId = p.committeeId || 0;
    if (!grouped[cId]) grouped[cId] = [];
    grouped[cId].push(p);
  });

  let html = '';
  Object.keys(grouped).forEach(cId => {
    const c = getCommittee(parseInt(cId));
    const groupPayments = grouped[cId];
    const groupTotal = groupPayments.filter(p => p.type === 'paid').reduce((s, p) => s + p.amount, 0);
    const paidCount = groupPayments.filter(p => p.type === 'paid').length;

    // Committee header
    html += `<div class="pay-group">
      <div class="pay-group-header">
        <div class="pay-group-left">
          <div class="pay-group-dot"></div>
          <div>
            <div class="pay-group-name">${c?.name || 'Unknown Committee'}</div>
            <div class="pay-group-meta">${groupPayments.length} entries · ${paidCount} paid</div>
          </div>
        </div>
        <div class="pay-group-total">${formatRs(groupTotal)}</div>
      </div>
      <div class="pay-group-items">`;

    groupPayments.forEach(p => {
      const m = getMember(p.memberId);
      const iconClass = p.type === 'paid' ? 'green' : p.type === 'late' ? 'red' : 'orange';
      const icon = p.type === 'paid' ? 'bi-check-circle-fill' : p.type === 'late' ? 'bi-x-circle-fill' : 'bi-hourglass-split';
      const iconColor = p.type === 'paid' ? 'var(--accent)' : p.type === 'late' ? 'var(--danger)' : 'var(--warn)';
      const amtColor = p.type === 'paid' ? 'c-green' : '';
      const amtStyle = p.type === 'late' ? 'style="color:var(--danger)"' : p.type === 'pending' ? 'style="color:var(--warn)"' : '';
      const prefix = p.type === 'paid' ? '+' : '';
      const dateStr = p.type === 'pending' ? `Due: ${p.date}` : p.date;
      const noteStr = p.notes ? ` · ${p.notes}` : '';
      html += `<div class="payment-item">
        <div class="pay-icon ${iconClass}"><i class="bi ${icon}" style="color:${iconColor}"></i></div>
        <div class="pay-info">
          <div class="pay-name">${m?.name || '—'}</div>
          <div class="pay-date">${dateStr}${noteStr}</div>
        </div>
        <div class="pay-amt ${amtColor}" ${amtStyle}>${prefix}${formatRs(p.amount)}</div>
      </div>`;
    });

    html += `</div></div>`;
  });

  document.getElementById('paymentList').innerHTML = html;
}

function setPayFilter(f, el) {
  state.filters.payment = f;
  document.querySelectorAll('#payChips .chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  renderPayments();
}

// ═══════════════════════════════════════
// MEMBER DETAIL MODAL
// ═══════════════════════════════════════
function openMemberDetail(memberId) {
  const m = getMember(memberId);
  const c = getCommittee(m.committeeId);
  document.getElementById('mdTitle').textContent = m.name;

  const statusColor = m.status === 'paid' ? 'var(--accent)' : m.status === 'late' ? 'var(--danger)' : 'var(--warn)';
  const memberPayments = state.payments.filter(p => p.memberId === memberId);
  const totalPaid = memberPayments.filter(p => p.type === 'paid').reduce((s,p) => s + p.amount, 0);

  document.getElementById('mdBody').innerHTML = `
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;">
      <div style="width:54px;height:54px;border-radius:50%;background:${colorForMember(m)};display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:#fff">${initials(m.name)}</div>
      <div>
        <div style="font-size:16px;font-weight:600">${m.name}</div>
        <div style="font-size:11px;color:var(--text3)">${m.phone} · ${c?.name}</div>
        <div style="font-size:12px;font-weight:600;color:${statusColor};margin-top:2px">${m.status.toUpperCase()}</div>
      </div>
    </div>
    <div style="background:var(--card2);border-radius:12px;padding:14px;margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--text2)">Turn #</span><span style="font-size:12px;font-weight:600">${m.turn}</span></div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--text2)">Committee</span><span style="font-size:12px;font-weight:600">${c?.name}</span></div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--text2)">Monthly Amount</span><span style="font-size:12px;font-weight:600">${formatRs(c?.monthlyAmount)}</span></div>
      <div style="display:flex;justify-content:space-between;padding:8px 0"><span style="font-size:12px;color:var(--text2)">Total Paid</span><span style="font-size:12px;font-weight:600;color:var(--accent)">${formatRs(totalPaid)}</span></div>
    </div>
    ${m.status !== 'paid' ? `<div style="background:var(--accent-light);border:1px solid rgba(16,185,129,.2);border-radius:10px;padding:12px;font-size:12px;margin-bottom:14px;">
      <i class="bi bi-info-circle me-2" style="color:var(--accent)"></i>
      Is member ka ${formatRs(c?.monthlyAmount)} abhi pending hai. Reminder bhejein ya payment record karein.
    </div>` : ''}`;

  document.getElementById('mdActions').innerHTML = `
    <button class="btn-ghost" onclick="sendReminder(${memberId})"><i class="bi bi-send me-1"></i>Reminder</button>
    ${m.status !== 'paid' ? `<button class="btn-ghost" onclick="quickMarkPaid(${memberId})"><i class="bi bi-check2 me-1"></i>Mark Paid</button>` : ''}
    <button class="btn-danger-ghost" onclick="deleteMember(${memberId})"><i class="bi bi-trash me-1"></i>Remove</button>`;

  openModal('memberDetailModal');
}
function sendReminder(memberId) {
  const m = getMember(memberId);

  if (!m || !m.phone) {
    showToast('Phone number missing hai 📵', 'warn');
    return;
  }

  let phone = m.phone.replace(/\D/g, '');

  // Pakistan auto fix (optional but useful)
  if (phone.length === 10) {
    phone = '92' + phone;
  }

  if (phone.length < 10) {
    showToast('Invalid phone number 📵', 'warn');
    return;
  }

  const message = `Assalam-o-Alaikum ${m.name}, apki kameti payment pending hai. Please jaldi update karein.`;

  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  window.open(url, "_blank");

  showToast(`${m.name} ko WhatsApp open ho gaya 📲`, '');
}

function quickMarkPaid(memberId) {
  const m = getMember(memberId);
  const c = getCommittee(m.committeeId);
  m.status = 'paid';
  // add payment record
  const existing = state.payments.find(p => p.memberId === memberId && p.type !== 'paid');
  if (existing) { existing.type = 'paid'; existing.date = today(); }
  else {
    state.payments.push({ id: state.nextId.payment++, memberId, committeeId: m.committeeId, amount: c.monthlyAmount, date: today(), type: 'paid', notes: '' });
  }
  closeModal('memberDetailModal');
  showToast(`${m.name} ka payment mark ho gaya! ✅`, '');
  renderDashboard();
  renderMembers();
  renderPayments();
}

function deleteMember(memberId) {
  const m = getMember(memberId);
  if (!confirm(`"${m.name}" ko remove karna chahte hain?`)) return;
  state.members = state.members.filter(x => x.id !== memberId);
  state.payments = state.payments.filter(x => x.memberId !== memberId);
  closeModal('memberDetailModal');
  showToast(`${m.name} remove ho gaya`, 'warn');
  renderDashboard();
  renderMembers();
  renderPayments();
  saveState();
}

// ═══════════════════════════════════════
// KAMETI DETAIL MODAL
// ═══════════════════════════════════════
function openKametiDetail(committeeId) {
  const c = getCommittee(committeeId);
  const members = state.members.filter(m => m.committeeId === committeeId);
  const paid = members.filter(m => m.status === 'paid').length;
  const totalCollected = state.payments.filter(p => p.committeeId === committeeId && p.type === 'paid').reduce((s,p) => s+p.amount, 0);

  document.getElementById('kdTitle').textContent = c.name;
  document.getElementById('kdBody').innerHTML = `
    <div style="background:var(--card2);border-radius:12px;padding:14px;margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--text2)">Total Members</span><span style="font-size:12px;font-weight:600">${c.totalMembers}</span></div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--text2)">Monthly Amount</span><span style="font-size:12px;font-weight:600">${formatRs(c.monthlyAmount)}</span></div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--text2)">Start Date</span><span style="font-size:12px;font-weight:600">${c.startDate}</span></div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--text2)">Current Month</span><span style="font-size:12px;font-weight:600">${c.currentMonth}/${c.totalMembers}</span></div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--text2)">Paid This Month</span><span style="font-size:12px;font-weight:600;color:var(--accent)">${paid}/${members.length}</span></div>
      <div style="display:flex;justify-content:space-between;padding:8px 0"><span style="font-size:12px;color:var(--text2)">Total Collected</span><span style="font-size:12px;font-weight:600;color:var(--accent)">${formatRs(totalCollected)}</span></div>
    </div>
    <div style="display:flex;gap:8px;">
      <button class="btn-ghost" style="flex:1" onclick="closeModal('kametiDetailModal');openModal('addMemberModal');setTimeout(()=>{document.getElementById('nmKameti').value='${c.id}'},100)"><i class="bi bi-person-plus me-1"></i>Add Member</button>
      <button class="btn-danger-ghost" style="flex:1" onclick="deleteKameti(${committeeId})"><i class="bi bi-trash me-1"></i>Delete</button>
    </div>`;
  openModal('kametiDetailModal');
}

function deleteKameti(committeeId) {
  const c = getCommittee(committeeId);
  if (!confirm(`"${c.name}" delete karna chahte hain? Sab members aur payments bhi hata diye jayenge.`)) return;
  state.committees = state.committees.filter(x => x.id !== committeeId);
  const mIds = state.members.filter(m => m.committeeId === committeeId).map(m => m.id);
  state.members = state.members.filter(m => m.committeeId !== committeeId);
  state.payments = state.payments.filter(p => !mIds.includes(p.memberId));
  closeModal('kametiDetailModal');
  showToast(`"${c.name}" delete ho gayi`, 'danger');
  renderDashboard();
  renderMembers();
  renderPayments();
  populateKametiDropdowns();
  saveState();
}

// ═══════════════════════════════════════
// CREATE KAMETI
// ═══════════════════════════════════════
function createKameti() {
  const name = document.getElementById('nkName').value.trim();
  const members = parseInt(document.getElementById('nkMembers').value);
  const amount = parseInt(document.getElementById('nkAmount').value);
  const date = document.getElementById('nkDate').value;
  if (!name) { showToast('Committee ka naam likhein!', 'warn'); return; }
  if (!members || members < 1) { showToast('Members ki tadaad likhein!', 'warn'); return; }
  if (!amount || amount < 1) { showToast('Monthly amount likhein!', 'warn'); return; }

  const newC = { id: state.nextId.committee++, name, totalMembers: members, monthlyAmount: amount, startDate: date || today(), currentMonth: 1 };
  state.committees.push(newC);
  closeModal('newKametiModal');
  document.getElementById('nkName').value = '';
  document.getElementById('nkMembers').value = '';
  document.getElementById('nkAmount').value = '';
  showToast(`"${name}" successfully create ho gayi! ✅`, '');
  populateKametiDropdowns();
  renderDashboard();
saveState();
}

// ═══════════════════════════════════════
// ADD MEMBER
// ═══════════════════════════════════════
function addMember() {
  const name = document.getElementById('nmName').value.trim();
  const phone = document.getElementById('nmPhone').value.trim();
  const committeeId = parseInt(document.getElementById('nmKameti').value);

  if (!name) { showToast('Member ka naam likhein!', 'warn'); return; }
  if (!committeeId) { showToast('Committee select karein!', 'warn'); return; }

  const c = getCommittee(committeeId);
  const existingInComm = state.members.filter(m => m.committeeId === committeeId);
  if (existingInComm.length >= c.totalMembers) {
    showToast('Yeh committee bhar chuki hai!', 'warn'); return;
  }

  const colorIdx = state.nextId.member % COLORS.length;
  const newM = {
    id: state.nextId.member++,
    name, phone: phone || '—',
    committeeId,
    status: 'pending',
    color: COLORS[colorIdx],
    turn: existingInComm.length + 1
  };
  state.members.push(newM);
  // add pending payment record
  state.payments.push({ id: state.nextId.payment++, memberId: newM.id, committeeId, amount: c.monthlyAmount, date: today(), type: 'pending', notes: '' });

  closeModal('addMemberModal');
  document.getElementById('nmName').value = '';
  document.getElementById('nmPhone').value = '';
  showToast(`${name} ko ${c.name} mein add kar diya! ✅`, '');
  renderDashboard();
  renderMembers();
  renderPayments();
saveState();
}

// ═══════════════════════════════════════
// RECORD PAYMENT
// ═══════════════════════════════════════
function populatePayMembers() {
  const cId = parseInt(document.getElementById('payKameti').value);
  const members = state.members.filter(m => m.committeeId === cId);
  document.getElementById('payMember').innerHTML = members.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
}

function recordPayment() {
  const committeeId = parseInt(document.getElementById('payKameti').value);
  const memberId = parseInt(document.getElementById('payMember').value);
  const amount = parseInt(document.getElementById('payAmount').value);
  const date = document.getElementById('payDate').value;
  const notes = document.getElementById('payNotes').value.trim();

  if (!amount || amount < 1) { showToast('Amount daakhil karein!', 'warn'); return; }
  if (!memberId) { showToast('Member select karein!', 'warn'); return; }

  const m = getMember(memberId);
  // update existing pending payment or add new
  const existing = state.payments.find(p => p.memberId === memberId && p.committeeId === committeeId && p.type !== 'paid');
  if (existing) {
    existing.type = 'paid'; existing.amount = amount; existing.date = date || today(); existing.notes = notes;
  } else {
    state.payments.push({ id: state.nextId.payment++, memberId, committeeId, amount, date: date || today(), type: 'paid', notes });
  }
  // update member status
  m.status = 'paid';

  closeModal('recordPaymentModal');
  document.getElementById('payAmount').value = '';
  document.getElementById('payNotes').value = '';
  showToast(`${m.name} ka ${formatRs(amount)} record ho gaya! 💰`, '');
  renderDashboard();
  renderMembers();
  renderPayments();
  saveState();
}

// ═══════════════════════════════════════
// FINE
// ═══════════════════════════════════════
function populateFineMembers() {
  const cId = parseInt(document.getElementById('fineKameti').value);
  const members = state.members.filter(m => m.committeeId === cId && m.status !== 'paid');
  document.getElementById('fineMember').innerHTML = members.length
    ? members.map(m => `<option value="${m.id}">${m.name}</option>`).join('')
    : '<option value="">No pending members</option>';
}

function applyFine() {
  const memberId = parseInt(document.getElementById('fineMember').value);
  const fineAmt = parseInt(document.getElementById('fineAmount').value);
  const reason = document.getElementById('fineReason').value.trim();

  if (!memberId) { showToast('Member select karein!', 'warn'); return; }
  if (!fineAmt || fineAmt < 1) { showToast('Fine amount likhein!', 'warn'); return; }

  const m = getMember(memberId);
  m.status = 'late';
  // update payment to late + add fine amount
  const existing = state.payments.find(p => p.memberId === memberId && p.type !== 'paid');
  if (existing) {
    existing.type = 'late'; existing.amount += fineAmt; existing.notes = `Fine: ${formatRs(fineAmt)}${reason ? ' · ' + reason : ''}`;
  }

  closeModal('fineModal');
  document.getElementById('fineAmount').value = '';
  document.getElementById('fineReason').value = '';
  showToast(`${m.name} par ${formatRs(fineAmt)} fine apply ho gaya! ⚠️`, 'warn');
  renderDashboard();
  renderMembers();
  renderPayments();
  saveState();
}

// ═══════════════════════════════════════
// DROPDOWNS POPULATE
// ═══════════════════════════════════════
function populateKametiDropdowns() {
  const opts = state.committees.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  const noOpts = '<option value="">Pehle committee banayein</option>';
  ['nmKameti', 'payKameti', 'fineKameti', 'qaKameti'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = state.committees.length ? opts : noOpts;
  });
  populatePayMembers();
  populateFineMembers();
  populateQaMembers();
}

// ═══════════════════════════════════════
// MODALS
// ═══════════════════════════════════════
function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
  if (id === 'addMemberModal' || id === 'recordPaymentModal' || id === 'fineModal' || id === 'quranAndaziModal') populateKametiDropdowns();
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
}
function closeModalOutside(e, id) {
  if (e.target === document.getElementById(id)) closeModal(id);
}

// ═══════════════════════════════════════
// TOAST
// ═══════════════════════════════════════
function showToast(msg, type) {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = 'toast' + (type ? ' ' + type : '');
  const icons = { warn:'bi-exclamation-triangle-fill', danger:'bi-x-circle-fill' };
  const icon = icons[type] || 'bi-check-circle-fill';
  t.innerHTML = `<i class="bi ${icon}"></i> ${msg}`;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity='0'; t.style.transform='translateY(-6px)'; t.style.transition='.3s ease'; setTimeout(()=>t.remove(),300); }, 2800);
}

// ═══════════════════════════════════════
// QURAN ANDAZI
// ═══════════════════════════════════════
function populateQaMembers() {
  const cId = parseInt(document.getElementById('qaKameti').value);
  if (!cId) return;
  const c = getCommittee(cId);
  const members = state.members.filter(m => m.committeeId === cId);
  // eligible = members jinka turn abhi nahi aaya (winnersHistory mein nahi)
  if (!c.winnersHistory) c.winnersHistory = [];
  const wonIds = c.winnersHistory.map(w => w.memberId);
  const eligible = members.filter(m => !wonIds.includes(m.id));

  const infoEl = document.getElementById('qaEligibleInfo');
  infoEl.innerHTML = `<span style="color:var(--accent);font-weight:600">${eligible.length}</span> eligible members · <span style="color:var(--text3)">${wonIds.length} pehle se winner ban chuke hain</span>`;

  // render cards
  const wrap = document.getElementById('qaCardsWrap');
  wrap.innerHTML = eligible.length === 0
    ? `<div style="color:var(--text3);font-size:12px;padding:10px">Tamam members is kameti mein draw ho chuke hain. Committee reset karein.</div>`
    : eligible.map(m => `
        <div class="qa-card" id="qacard-${m.id}" title="${m.name}">
          ${initials(m.name)}
        </div>`).join('');

  document.getElementById('qaResult').style.display = 'none';
  const btn = document.getElementById('qaDrawBtn');
  btn.disabled = eligible.length === 0;
  btn.textContent = eligible.length === 0 ? 'Koi eligible member nahi' : '';
  if (eligible.length > 0) btn.innerHTML = '<i class="bi bi-shuffle me-2"></i>Draw Karein';
}

function startQuranAndazi() {
  const cId = parseInt(document.getElementById('qaKameti').value);
  if (!cId) { showToast('Committee select karein!', 'warn'); return; }

  const c = getCommittee(cId);
  if (!c.winnersHistory) c.winnersHistory = [];
  const wonIds = c.winnersHistory.map(w => w.memberId);
  const members = state.members.filter(m => m.committeeId === cId);
  const eligible = members.filter(m => !wonIds.includes(m.id));

  if (eligible.length === 0) { showToast('Koi eligible member nahi!', 'warn'); return; }

  const btn = document.getElementById('qaDrawBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Draw ho raha hai...';

  // spinning animation
  const cards = document.querySelectorAll('.qa-card');
  cards.forEach(card => card.classList.add('spinning'));

  let count = 0;
  const totalFlips = 20 + Math.floor(Math.random() * 15);
  let currentHighlight = -1;

  const interval = setInterval(() => {
    // unhighlight previous
    if (currentHighlight >= 0 && eligible[currentHighlight]) {
      const prev = document.getElementById('qacard-' + eligible[currentHighlight].id);
      if (prev) prev.style.transform = '';
    }
    // highlight random
    const rnd = Math.floor(Math.random() * eligible.length);
    currentHighlight = rnd;
    const el = document.getElementById('qacard-' + eligible[rnd].id);
    if (el) el.style.transform = 'scale(1.15)';
    count++;

    if (count >= totalFlips) {
      clearInterval(interval);
      // stop on random winner
      const winnerIdx = Math.floor(Math.random() * eligible.length);
      const winner = eligible[winnerIdx];

      cards.forEach(card => { card.classList.remove('spinning'); card.style.transform = ''; });

      setTimeout(() => {
        // mark winner card
        const winEl = document.getElementById('qacard-' + winner.id);
        if (winEl) winEl.classList.add('winner');

        // save to history
        c.winnersHistory.push({ memberId: winner.id, name: winner.name, date: today(), turn: c.winnersHistory.length + 1 });
        saveState();

        // show result
        const resultEl = document.getElementById('qaResult');
        resultEl.style.display = 'block';
        resultEl.innerHTML = `
          <span class="qa-result-crown">🏆</span>
          <div class="qa-result-label">Is Maah Ka Winner</div>
          <div class="qa-result-name">${winner.name}</div>
          <div class="qa-result-sub">${c.name} · Member #${winner.turn}</div>
          <div class="qa-result-turn">Draw #${c.winnersHistory.length}</div>
          ${c.winnersHistory.length > 1 ? `
          <div class="qa-history">
            <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Pichle Winners</div>
            ${[...c.winnersHistory].reverse().slice(1).map(w =>
              `<div class="qa-history-item"><span>${w.name}</span><span>Draw #${w.turn} · ${w.date}</span></div>`
            ).join('')}
          </div>` : ''}`;

        showToast(`🎉 ${winner.name} is maah ka winner! Mubarak!`, '');
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-arrow-repeat me-2"></i>Dubara Draw Karein';
        populateQaMembers();
      }, 300);
    }
  }, 80);
}

// ═══════════════════════════════════════
// INIT
// ═══════════════════════════════════════
document.getElementById('nkDate').value = today();
document.getElementById('payDate').value = today();
loadState();
populateKametiDropdowns();
renderDashboard();