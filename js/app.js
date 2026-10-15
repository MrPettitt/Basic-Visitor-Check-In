(() => {
  'use strict';

  const STORAGE_KEY = 'checkin-visitors';
  const EMPTY_CELL = 'N/A';

  let visitors = loadVisitors();
  let filterMode = 'all';
  let searchQuery = '';

  const $ = (id) => document.getElementById(id);

  // ---------- Storage ----------

  function loadVisitors() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw).map((v) => ({
        ...v,
        checkin: new Date(v.checkin),
        checkout: v.checkout ? new Date(v.checkout) : null,
      }));
    } catch (err) {
      return [];
    }
  }

  function saveVisitors() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(visitors));
    } catch (err) {
      showToast('Could not save to browser storage');
    }
  }

  // ---------- Helpers ----------

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  const pad = (n) => String(n).padStart(2, '0');
  const formatTime = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const formatDate = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;

  function getDuration(start, end) {
    const mins = Math.max(0, Math.floor((end - start) / 60000));
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }

  function isToday(date) {
    return date.toDateString() === new Date().toDateString();
  }

  let toastTimer;
  function showToast(message) {
    const toast = $('toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
  }

  // ---------- Clock ----------

  function updateClock() {
    const now = new Date();
    $('liveDate').textContent = now.toLocaleDateString('en-ZA', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    $('liveTime').textContent = now.toLocaleTimeString('en-ZA', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  }

  // ---------- Actions ----------

  function checkIn(event) {
    event.preventDefault();
    const name = $('visitorName').value.trim();
    if (!name) {
      showToast('Please enter the visitor name');
      $('visitorName').focus();
      return;
    }

    visitors.unshift({
      id: Date.now(),
      name,
      org: $('visitorOrg').value.trim(),
      host: $('visitorHost').value.trim(),
      purpose: $('visitorPurpose').value,
      notes: $('visitorNotes').value.trim(),
      checkin: new Date(),
      checkout: null,
    });

    $('checkinForm').reset();
    saveVisitors();
    render();
    showToast(`${name} checked in`);
  }

  function checkOut(id) {
    const visitor = visitors.find((v) => v.id === id);
    if (!visitor || visitor.checkout) return;
    visitor.checkout = new Date();
    saveVisitors();
    render();
    showToast(`${visitor.name} checked out`);
  }

  // ---------- Rendering ----------

  function renderActiveChips() {
    const container = $('activeChips');
    const active = visitors.filter((v) => !v.checkout);

    if (active.length === 0) {
      container.innerHTML = '<div class="no-active">No visitors on site</div>';
      return;
    }

    const now = new Date();
    container.innerHTML = active.map((v) => {
      const meta = [v.org, `${getDuration(v.checkin, now)} ago`].filter(Boolean).map(escapeHtml).join(' | ');
      return `<button type="button" class="visitor-chip" data-checkout="${v.id}" title="Click to check out">
        <span class="chip-info">
          <span class="chip-name">${escapeHtml(v.name)}</span>
          <span class="chip-meta">${meta}</span>
        </span>
        <span class="chip-checkout-hint">Check Out</span>
      </button>`;
    }).join('');
  }

  function renderLog() {
    let list = visitors;
    if (filterMode === 'in') list = list.filter((v) => !v.checkout);
    if (filterMode === 'out') list = list.filter((v) => v.checkout);
    if (searchQuery) list = list.filter((v) => v.name.toLowerCase().includes(searchQuery));

    const todays = visitors.filter((v) => isToday(v.checkin));
    $('statIn').textContent = visitors.filter((v) => !v.checkout).length;
    $('statTotal').textContent = todays.length;
    $('statOut').textContent = todays.filter((v) => v.checkout).length;
    $('visibleCount').textContent = list.length;

    const body = $('logBody');
    const empty = $('emptyState');

    if (list.length === 0) {
      body.innerHTML = '';
      empty.hidden = false;
      return;
    }
    empty.hidden = true;

    body.innerHTML = list.map((v, i) => {
      const isOut = Boolean(v.checkout);
      const checkinStr = `${formatDate(v.checkin)} ${formatTime(v.checkin)}`;
      const checkoutStr = isOut ? `${formatDate(v.checkout)} ${formatTime(v.checkout)}` : EMPTY_CELL;
      const duration = isOut ? getDuration(v.checkin, v.checkout) : '';

      const orgLine = [v.org, v.host ? `to ${v.host}` : ''].filter(Boolean).map(escapeHtml).join(' ');

      return `<tr class="log-row ${isOut ? 'checked-out' : ''}">
        <td class="seq-cell">${pad(list.length - i)}</td>
        <td>
          <div class="visitor-name">${escapeHtml(v.name)}</div>
          ${orgLine ? `<div class="visitor-org">${orgLine}</div>` : ''}
          ${v.notes ? `<div class="visitor-notes">${escapeHtml(v.notes)}</div>` : ''}
        </td>
        <td><span class="purpose-tag">${escapeHtml(v.purpose)}</span></td>
        <td class="time-cell">${checkinStr}</td>
        <td class="time-cell">
          ${checkoutStr}
          ${duration ? `<span class="duration">${duration}</span>` : ''}
        </td>
        <td>
          <span class="status-pill ${isOut ? 'status-out' : 'status-in'}">
            <span class="dot ${isOut ? 'dot-out' : 'dot-in'}"></span>
            ${isOut ? 'Out' : 'On Site'}
          </span>
        </td>
        <td>
          <button type="button" class="action-btn" data-checkout="${v.id}" ${isOut ? 'disabled' : ''}>
            ${isOut ? 'Done' : 'Check Out'}
          </button>
        </td>
      </tr>`;
    }).join('');
  }

  function render() {
    renderLog();
    renderActiveChips();
  }

  // ---------- Events ----------

  $('checkinForm').addEventListener('submit', checkIn);

  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-checkout]');
    if (target) checkOut(Number(target.dataset.checkout));
  });

  document.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      filterMode = btn.dataset.filter;
      document.querySelectorAll('.filter-btn').forEach((b) => b.classList.toggle('active', b === btn));
      renderLog();
    });
  });

  $('searchBox').addEventListener('input', (event) => {
    searchQuery = event.target.value.trim().toLowerCase();
    renderLog();
  });

  // ---------- Init ----------

  updateClock();
  setInterval(updateClock, 1000);
  setInterval(renderActiveChips, 60000);
  render();
})();
