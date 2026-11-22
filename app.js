'use strict';

/* =========================================================
 * Chi Tiêu – PWA quản lý chi tiêu cá nhân
 * Dữ liệu lưu trong localStorage của thiết bị (không có server).
 * ========================================================= */

const STORAGE_KEY = 'chitieu.data.v1';
const DATA_VERSION = 1;

const DEFAULT_CATEGORIES = [
  { id: 'c-food', type: 'expense', emoji: '🍜', name: 'Ăn uống' },
  { id: 'c-move', type: 'expense', emoji: '🛵', name: 'Đi lại' },
  { id: 'c-shop', type: 'expense', emoji: '🛍️', name: 'Mua sắm' },
  { id: 'c-bill', type: 'expense', emoji: '💡', name: 'Hóa đơn' },
  { id: 'c-home', type: 'expense', emoji: '🏠', name: 'Nhà ở' },
  { id: 'c-fun', type: 'expense', emoji: '🎮', name: 'Giải trí' },
  { id: 'c-health', type: 'expense', emoji: '💊', name: 'Sức khỏe' },
  { id: 'c-edu', type: 'expense', emoji: '📚', name: 'Giáo dục' },
  { id: 'c-other-ex', type: 'expense', emoji: '📦', name: 'Khác' },
  { id: 'c-salary', type: 'income', emoji: '💰', name: 'Lương' },
  { id: 'c-bonus', type: 'income', emoji: '🎁', name: 'Thưởng' },
  { id: 'c-biz', type: 'income', emoji: '💼', name: 'Kinh doanh' },
  { id: 'c-other-in', type: 'income', emoji: '📥', name: 'Khác' },
];

const CHART_COLORS = [
  '#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
  '#06b6d4', '#a855f7',
];

/* ---------------- Tiện ích ---------------- */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const numberFmt = new Intl.NumberFormat('vi-VN');
const formatMoney = (n) => `${numberFmt.format(n)} ₫`;

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function uid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/** Ngày theo giờ địa phương dạng YYYY-MM-DD (tránh lệch múi giờ của toISOString). */
function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const WEEKDAYS = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

function formatDayHeader(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = toDateStr(new Date());
  const yest = new Date(); yest.setDate(yest.getDate() - 1);
  if (dateStr === today) return 'Hôm nay';
  if (dateStr === toDateStr(yest)) return 'Hôm qua';
  return `${WEEKDAYS[date.getDay()]}, ${d}/${m}`;
}

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.hidden = true; }, 2200);
}

/* ---------------- Lưu trữ ---------------- */

function defaultData() {
  return {
    version: DATA_VERSION,
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
    transactions: [],
  };
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData();
    const data = JSON.parse(raw);
    if (!isValidData(data)) throw new Error('invalid');
    return data;
  } catch (e) {
    console.error('Không đọc được dữ liệu, dùng dữ liệu mặc định', e);
    return defaultData();
  }
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    alert('Không lưu được dữ liệu: ' + e.message);
  }
}

function isValidData(d) {
  return d && typeof d === 'object'
    && Array.isArray(d.categories) && Array.isArray(d.transactions)
    && d.categories.every((c) => c && typeof c.id === 'string' && (c.type === 'expense' || c.type === 'income') && typeof c.name === 'string')
    && d.transactions.every((t) => t && typeof t.id === 'string'
      && (t.type === 'expense' || t.type === 'income')
      && Number.isFinite(t.amount) && t.amount > 0
      && typeof t.categoryId === 'string'
      && /^\d{4}-\d{2}-\d{2}$/.test(t.date));
}

/* ---------------- Trạng thái ---------------- */

let data = loadData();

const ui = {
  tab: 'tx',
  month: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  statsType: 'expense',
  catType: 'expense',
  // form giao dịch
  editingTxId: null,
  formType: 'expense',
  formCatId: null,
  // form danh mục
  editingCatId: null,
};

const getCategory = (id) => data.categories.find((c) => c.id === id);
const categoriesOf = (type) => data.categories.filter((c) => c.type === type);

function monthTransactions() {
  const key = monthKey(ui.month);
  return data.transactions.filter((t) => t.date.startsWith(key));
}

/* ---------------- Render ---------------- */

function render() {
  $('#monthLabel').textContent = `Tháng ${ui.month.getMonth() + 1}/${ui.month.getFullYear()}`;
  $('#prevMonth').style.visibility = ui.tab === 'settings' ? 'hidden' : 'visible';
  $('#nextMonth').style.visibility = ui.tab === 'settings' ? 'hidden' : 'visible';
  if (ui.tab === 'settings') $('#monthLabel').textContent = 'Cài đặt';

  for (const tab of ['tx', 'stats', 'settings']) {
    $(`#view-${tab}`).hidden = ui.tab !== tab;
  }
  $$('.tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.tab === ui.tab));
  $('#fab').hidden = ui.tab === 'settings';

  if (ui.tab === 'tx') renderTransactions();
  if (ui.tab === 'stats') renderStats();
  if (ui.tab === 'settings') renderSettings();
}

function renderTransactions() {
  const txs = monthTransactions();
  let income = 0, expense = 0;
  for (const t of txs) {
    if (t.type === 'income') income += t.amount; else expense += t.amount;
  }
  const balance = income - expense;
  $('#sumIncome').textContent = formatMoney(income);
  $('#sumExpense').textContent = formatMoney(expense);
  const balEl = $('#sumBalance');
  balEl.textContent = (balance < 0 ? '−' : '') + formatMoney(Math.abs(balance));
  balEl.className = 'value ' + (balance < 0 ? 'expense' : balance > 0 ? 'income' : '');

  const list = $('#txList');
  if (txs.length === 0) {
    list.innerHTML = `<div class="empty"><div class="big">🧾</div>Chưa có giao dịch nào trong tháng này.<br>Bấm <b>+</b> để thêm.</div>`;
    return;
  }

  // Nhóm theo ngày, mới nhất lên trước
  const groups = new Map();
  [...txs]
    .sort((a, b) => (b.date.localeCompare(a.date)) || ((b.createdAt || 0) - (a.createdAt || 0)))
    .forEach((t) => {
      if (!groups.has(t.date)) groups.set(t.date, []);
      groups.get(t.date).push(t);
    });

  let html = '';
  for (const [date, items] of groups) {
    const dayNet = items.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
    html += `<div class="day-group">
      <div class="day-header"><span>${formatDayHeader(date)}</span><span>${dayNet < 0 ? '−' : '+'}${formatMoney(Math.abs(dayNet))}</span></div>`;
    for (const t of items) {
      const cat = getCategory(t.categoryId) || { emoji: '❔', name: 'Không rõ' };
      const sign = t.type === 'income' ? '+' : '−';
      html += `<button class="tx-item" data-id="${escapeHtml(t.id)}">
        <div class="tx-emoji">${escapeHtml(cat.emoji)}</div>
        <div class="tx-main">
          <div class="tx-cat">${escapeHtml(cat.name)}</div>
          ${t.note ? `<div class="tx-note">${escapeHtml(t.note)}</div>` : ''}
        </div>
        <div class="tx-amount ${t.type}">${sign}${formatMoney(t.amount)}</div>
      </button>`;
    }
    html += `</div>`;
  }
  list.innerHTML = html;
}

function renderStats() {
  $$('#statsType button').forEach((b) => b.classList.toggle('active', b.dataset.type === ui.statsType));

  const txs = monthTransactions().filter((t) => t.type === ui.statsType);
  const total = txs.reduce((s, t) => s + t.amount, 0);
  const byCat = new Map();
  for (const t of txs) byCat.set(t.categoryId, (byCat.get(t.categoryId) || 0) + t.amount);
  const rows = [...byCat.entries()]
    .map(([id, amount]) => ({ cat: getCategory(id) || { emoji: '❔', name: 'Không rõ' }, amount }))
    .sort((a, b) => b.amount - a.amount);

  const chart = $('#chart');
  const legend = $('#statsLegend');
  const label = ui.statsType === 'expense' ? 'Tổng chi' : 'Tổng thu';

  if (total === 0) {
    chart.innerHTML = `<div class="empty"><div class="big">📊</div>Chưa có dữ liệu ${ui.statsType === 'expense' ? 'chi' : 'thu'} trong tháng này.</div>`;
    legend.hidden = true;
    return;
  }
  legend.hidden = false;

  // Biểu đồ donut bằng SVG: mỗi lát là một vòng tròn với stroke-dasharray (chu vi = 100)
  const R = 15.9155; // 2πR ≈ 100
  let offset = 0;
  let circles = '';
  rows.forEach((r, i) => {
    const pct = (r.amount / total) * 100;
    const color = CHART_COLORS[i % CHART_COLORS.length];
    circles += `<circle cx="21" cy="21" r="${R}" fill="none" stroke="${color}" stroke-width="6"
      stroke-dasharray="${pct} ${100 - pct}" stroke-dashoffset="${-offset}"></circle>`;
    offset += pct;
  });
  chart.innerHTML = `<svg viewBox="0 0 42 42" aria-hidden="true">
      <circle cx="21" cy="21" r="${R}" fill="none" stroke="var(--surface-2)" stroke-width="6"></circle>
      ${circles}
    </svg>
    <div class="chart-center"><div><div class="label">${label}</div><div class="value ${ui.statsType}">${formatMoney(total)}</div></div></div>`;

  legend.innerHTML = rows.map((r, i) => {
    const pct = (r.amount / total) * 100;
    return `<div class="legend-item">
      <span class="dot" style="background:${CHART_COLORS[i % CHART_COLORS.length]}"></span>
      <span class="legend-name">${escapeHtml(r.cat.emoji)} ${escapeHtml(r.cat.name)}</span>
      <span class="legend-pct">${pct < 1 ? '<1' : Math.round(pct)}%</span>
      <span class="legend-amt">${formatMoney(r.amount)}</span>
    </div>`;
  }).join('');
}

function renderSettings() {
  $$('#catType button').forEach((b) => b.classList.toggle('active', b.dataset.type === ui.catType));
  $('#catList').innerHTML = categoriesOf(ui.catType).map((c) => `
    <button class="list-item" data-id="${escapeHtml(c.id)}">
      <span>${escapeHtml(c.emoji)}</span><span class="grow">${escapeHtml(c.name)}</span><span class="chev">›</span>
    </button>`).join('');
  $('#txCount').textContent = `Tổng số giao dịch đã lưu: ${data.transactions.length}`;
}

/* ---------------- Form giao dịch ---------------- */

const amountInput = $('#txAmount');

function parseAmount() {
  return Number(amountInput.value.replace(/\D/g, '')) || 0;
}

function setAmount(n) {
  amountInput.value = n > 0 ? numberFmt.format(n) : '';
}

amountInput.addEventListener('input', () => {
  const digits = amountInput.value.replace(/\D/g, '').slice(0, 13);
  setAmount(Number(digits));
});

$('#add000').addEventListener('click', () => {
  const n = parseAmount();
  if (n > 0 && String(n).length <= 10) setAmount(n * 1000);
  amountInput.focus();
});

function renderFormCategories() {
  $$('#txType button').forEach((b) => b.classList.toggle('active', b.dataset.type === ui.formType));
  const cats = categoriesOf(ui.formType);
  if (!cats.some((c) => c.id === ui.formCatId)) ui.formCatId = cats[0]?.id || null;
  $('#txCats').innerHTML = cats.map((c) => `
    <button type="button" class="cat-btn ${c.id === ui.formCatId ? 'active' : ''}" data-id="${escapeHtml(c.id)}">
      <span class="e">${escapeHtml(c.emoji)}</span>${escapeHtml(c.name)}
    </button>`).join('');
}

function openTxSheet(tx = null) {
  ui.editingTxId = tx ? tx.id : null;
  ui.formType = tx ? tx.type : 'expense';
  ui.formCatId = tx ? tx.categoryId : null;
  $('#txSheetTitle').textContent = tx ? 'Sửa giao dịch' : 'Thêm giao dịch';
  setAmount(tx ? tx.amount : 0);
  // Mặc định: hôm nay nếu đang xem tháng hiện tại, ngược lại ngày 1 của tháng đang xem
  let defDate = toDateStr(new Date());
  if (!defDate.startsWith(monthKey(ui.month))) defDate = toDateStr(ui.month);
  $('#txDate').value = tx ? tx.date : defDate;
  $('#txNote').value = tx ? (tx.note || '') : '';
  $('#txDelete').hidden = !tx;
  renderFormCategories();
  $('#txSheet').hidden = false;
  if (!tx) setTimeout(() => amountInput.focus(), 250);
}

function closeSheet(id) {
  $(id).hidden = true;
  document.activeElement?.blur();
}

$('#txType').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-type]');
  if (!btn) return;
  ui.formType = btn.dataset.type;
  renderFormCategories();
});

$('#txCats').addEventListener('click', (e) => {
  const btn = e.target.closest('.cat-btn');
  if (!btn) return;
  ui.formCatId = btn.dataset.id;
  renderFormCategories();
});

$('#txForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const amount = parseAmount();
  const date = $('#txDate').value;
  if (amount <= 0) { toast('Vui lòng nhập số tiền'); amountInput.focus(); return; }
  if (!ui.formCatId) { toast('Vui lòng chọn danh mục'); return; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { toast('Vui lòng chọn ngày'); return; }

  const fields = {
    type: ui.formType,
    amount,
    categoryId: ui.formCatId,
    date,
    note: $('#txNote').value.trim(),
  };

  if (ui.editingTxId) {
    const tx = data.transactions.find((t) => t.id === ui.editingTxId);
    Object.assign(tx, fields);
    toast('Đã cập nhật');
  } else {
    data.transactions.push({ id: uid(), createdAt: Date.now(), ...fields });
    toast('Đã thêm');
  }
  saveData();

  // Chuyển tới tháng của giao dịch vừa lưu để người dùng thấy ngay
  const [y, m] = date.split('-').map(Number);
  ui.month = new Date(y, m - 1, 1);
  closeSheet('#txSheet');
  render();
});

$('#txDelete').addEventListener('click', () => {
  if (!confirm('Xóa giao dịch này?')) return;
  data.transactions = data.transactions.filter((t) => t.id !== ui.editingTxId);
  saveData();
  closeSheet('#txSheet');
  toast('Đã xóa');
  render();
});

$('#txList').addEventListener('click', (e) => {
  const item = e.target.closest('.tx-item');
  if (!item) return;
  const tx = data.transactions.find((t) => t.id === item.dataset.id);
  if (tx) openTxSheet(tx);
});

/* ---------------- Form danh mục ---------------- */

function openCatSheet(cat = null) {
  ui.editingCatId = cat ? cat.id : null;
  $('#catSheetTitle').textContent = cat ? 'Sửa danh mục' : `Thêm danh mục ${ui.catType === 'expense' ? 'chi' : 'thu'}`;
  $('#catEmoji').value = cat ? cat.emoji : '';
  $('#catName').value = cat ? cat.name : '';
  $('#catDelete').hidden = !cat;
  $('#catSheet').hidden = false;
}

$('#addCat').addEventListener('click', () => openCatSheet());

$('#catList').addEventListener('click', (e) => {
  const item = e.target.closest('.list-item');
  if (!item) return;
  const cat = getCategory(item.dataset.id);
  if (cat) openCatSheet(cat);
});

$('#catForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const emoji = $('#catEmoji').value.trim();
  const name = $('#catName').value.trim();
  if (!emoji || !name) { toast('Vui lòng nhập đủ biểu tượng và tên'); return; }

  if (ui.editingCatId) {
    Object.assign(getCategory(ui.editingCatId), { emoji, name });
    toast('Đã cập nhật danh mục');
  } else {
    data.categories.push({ id: 'c-' + uid(), type: ui.catType, emoji, name });
    toast('Đã thêm danh mục');
  }
  saveData();
  closeSheet('#catSheet');
  render();
});

$('#catDelete').addEventListener('click', () => {
  const cat = getCategory(ui.editingCatId);
  if (!cat) return;
  const used = data.transactions.filter((t) => t.categoryId === cat.id).length;
  if (used > 0) {
    alert(`Không thể xóa: danh mục "${cat.name}" đang được dùng bởi ${used} giao dịch.\nHãy đổi danh mục của các giao dịch đó trước, hoặc chỉ đổi tên danh mục.`);
    return;
  }
  if (categoriesOf(cat.type).length <= 1) {
    alert('Phải còn ít nhất một danh mục.');
    return;
  }
  if (!confirm(`Xóa danh mục "${cat.name}"?`)) return;
  data.categories = data.categories.filter((c) => c.id !== cat.id);
  saveData();
  closeSheet('#catSheet');
  toast('Đã xóa danh mục');
  render();
});

/* ---------------- Backup / Restore ---------------- */

$('#exportBtn').addEventListener('click', async () => {
  const json = JSON.stringify({ ...data, exportedAt: new Date().toISOString() }, null, 2);
  const filename = `chi-tieu-backup-${toDateStr(new Date())}.json`;
  const file = new File([json], filename, { type: 'application/json' });

  // Trên điện thoại: mở bảng chia sẻ (Lưu vào Tệp, Drive, Zalo...)
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
      // lỗi khác → thử tải xuống
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
});

$('#importBtn').addEventListener('click', () => $('#importFile').click());

$('#importFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    if (!isValidData(parsed)) throw new Error('File không đúng định dạng backup của Chi Tiêu');
    const msg = `File có ${parsed.transactions.length} giao dịch.\n\nNhập sẽ THAY THẾ toàn bộ dữ liệu hiện tại (${data.transactions.length} giao dịch). Tiếp tục?`;
    if (!confirm(msg)) return;
    data = {
      version: DATA_VERSION,
      categories: parsed.categories,
      transactions: parsed.transactions,
    };
    saveData();
    toast('Đã nhập dữ liệu');
    render();
  } catch (err) {
    alert('Không nhập được: ' + err.message);
  }
});

$('#wipeBtn').addEventListener('click', () => {
  if (!confirm('Xóa TOÀN BỘ giao dịch và danh mục? Hành động này không thể hoàn tác.\n\nNên xuất backup trước!')) return;
  if (!confirm('Bạn chắc chắn chứ?')) return;
  data = defaultData();
  saveData();
  toast('Đã xóa toàn bộ dữ liệu');
  render();
});

/* ---------------- Điều hướng ---------------- */

$$('.tabbar button').forEach((b) => b.addEventListener('click', () => {
  ui.tab = b.dataset.tab;
  render();
  window.scrollTo(0, 0);
}));

$('#prevMonth').addEventListener('click', () => {
  ui.month = new Date(ui.month.getFullYear(), ui.month.getMonth() - 1, 1);
  render();
});
$('#nextMonth').addEventListener('click', () => {
  ui.month = new Date(ui.month.getFullYear(), ui.month.getMonth() + 1, 1);
  render();
});

$('#statsType').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-type]');
  if (!btn) return;
  ui.statsType = btn.dataset.type;
  renderStats();
});

$('#catType').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-type]');
  if (!btn) return;
  ui.catType = btn.dataset.type;
  renderSettings();
});

$('#fab').addEventListener('click', () => openTxSheet());

// Đóng sheet: nút Hủy hoặc chạm ra ngoài
$$('.sheet-backdrop').forEach((bd) => {
  bd.addEventListener('click', (e) => {
    if (e.target === bd || e.target.closest('[data-close]')) closeSheet('#' + bd.id);
  });
});

/* ---------------- Khởi động ---------------- */

render();

// Xin trình duyệt giữ dữ liệu lâu dài (giảm nguy cơ bị tự xóa khi máy thiếu dung lượng)
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().catch(() => {});
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW lỗi', e));
  });
}
