/* =========================================
   FlushPay — app.js  (fixed & optimised)
   ========================================= */

'use strict';

// --- State ---
let timer        = null;
let startTime    = null;
let elapsed      = 0;
let currentType  = 'pipi';
let currency     = '€';
let sessions     = JSON.parse(localStorage.getItem('pausepay_sessions') || '[]');

// --- DOM refs ---
// Counter parts (matches the HTML structure)
const cInt        = document.getElementById('cInt');
const cSep        = document.getElementById('cSep');
const cDecBig     = document.getElementById('cDecBig');
const cDecSmall   = document.getElementById('cDecSmall');
const cCur        = document.getElementById('cCur');

// Badge / sub / timer
const sessionBadge  = document.getElementById('sessionBadge');
const badgeLabel    = document.getElementById('badgeLabel');
const heroSub       = document.getElementById('heroSub');
const timerDisplay  = document.getElementById('timerDisplay');

// Type tabs (HTML uses tabPipi / tabCaca)
const tabPipi   = document.getElementById('tabPipi');
const tabCaca   = document.getElementById('tabCaca');

// Buttons
const startBtn  = document.getElementById('startBtn');
const stopBtn   = document.getElementById('stopBtn');
const cancelBtn = document.getElementById('cancelBtn');

// Salary / currency
const salaryInput    = document.getElementById('salaryInput');
const currencySelect = document.getElementById('currencySelect');

// History & stats
const historyList = document.getElementById('historyList');
const statTotal   = document.getElementById('statTotal');
const statTime    = document.getElementById('statTime');
const statCount   = document.getElementById('statCount');
const statAvg     = document.getElementById('statAvg');

// Chart (inserted dynamically if missing)
let chartSection = document.getElementById('chartSection');
let barChart     = document.getElementById('barChart');

// Ensure chart section exists in DOM (it was missing from the HTML)
if (!chartSection) {
  chartSection = document.createElement('div');
  chartSection.id = 'chartSection';
  chartSection.className = 'chart-section';
  chartSection.style.display = 'none';

  barChart = document.createElement('div');
  barChart.id = 'barChart';
  barChart.className = 'bar-chart';

  chartSection.appendChild(barChart);

  // Insert after .stats-row
  const statsRow = document.querySelector('.stats-row');
  if (statsRow) statsRow.after(chartSection);
}

// --- Helpers ---

function getSalary() {
  return parseFloat(salaryInput.value) || 0;
}

function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}

function formatDuration(ms) {
  const totalSec = Math.floor(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const m   = Math.floor(totalSec / 60);
  const rem = totalSec % 60;
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}

function calcEarned(ms) {
  const salary = getSalary();
  if (!salary) return null;
  return (salary / 3600) * (ms / 1000);
}

function saveSessions() {
  localStorage.setItem('pausepay_sessions', JSON.stringify(sessions));
}

// --- Counter display ---
// Splits a number like 0.001234 into typographic layers:
//   cInt      → "0"
//   cDecBig   → "00"   (centimes — same visual weight as integer)
//   cDecSmall → "1234" (sub-centime precision)
//   cCur      → currency symbol

function setCounterValue(value) {
  const str    = value.toFixed(6); // e.g. "0.001234"
  const [intPart, decPart] = str.split('.');

  cInt.textContent      = intPart;
  cDecBig.textContent   = decPart.slice(0, 2);
  cDecSmall.textContent = decPart.slice(2);   // 4 sub-centime digits
  cCur.textContent      = currency;
}

function resetCounter() {
  cInt.textContent      = '0';
  cSep.textContent      = ',';
  cDecBig.textContent   = '00';
  cDecSmall.textContent = '0000';
  cCur.textContent      = currency;

  // Remove active colouring
  [cInt, cSep, cDecBig, cDecSmall].forEach(el => el.classList.remove('active'));
}

function activateCounter() {
  [cInt, cSep, cDecBig, cDecSmall].forEach(el => el.classList.add('active'));
}

// --- Type selector ---
// HTML uses tabPipi / tabCaca with class "type-tab" / "type-tab active"

function setType(type) {
  currentType = type;
  tabPipi.classList.toggle('active', type === 'pipi');
  tabCaca.classList.toggle('active', type === 'caca');

  if (!timer) {
    heroSub.textContent = type === 'pipi'
      ? 'gagné pendant cette pause'
      : 'gagné pendant cette pause';
  }
}

// --- Timer controls ---

function startTimer() {
  startTime = Date.now();
  elapsed   = 0;

  startBtn.disabled  = true;
  stopBtn.disabled   = false;
  cancelBtn.disabled = false;

  // Badge → live
  sessionBadge.classList.add('active');
  badgeLabel.textContent = currentType === 'pipi' ? '💧 En cours' : '💩 En cours';

  activateCounter();
  heroSub.textContent = currentType === 'pipi'
    ? 'gagné depuis le début de ta pause pipi 💧'
    : 'gagné depuis le début de ta pause caca 💩';

  timer = setInterval(tick, 100);
}

function tick() {
  elapsed = Date.now() - startTime;

  timerDisplay.textContent = formatTime(elapsed);
  timerDisplay.classList.add('active');

  const earned = calcEarned(elapsed);
  if (earned !== null) {
    setCounterValue(earned);
  } else {
    // No salary set: show elapsed as "0,MM,SS" instead
    const totalSec = Math.floor(elapsed / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    cInt.textContent      = String(m).padStart(2, '0');
    cDecBig.textContent   = String(s).padStart(2, '0');
    cDecSmall.textContent = '';
    cCur.textContent      = '';
  }
}

function stopTimer() {
  clearInterval(timer);
  timer = null;

  const session = {
    type:     currentType,
    start:    new Date(startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    date:     new Date(startTime).toLocaleDateString('fr-FR'),
    duration: elapsed,
    earned:   calcEarned(elapsed),
    salary:   getSalary(),
    currency: currency
  };

  sessions.unshift(session);
  saveSessions();

  resetHero();
  renderHistory();
  renderStats();
}

function cancelTimer() {
  clearInterval(timer);
  timer    = null;
  elapsed  = 0;
  resetHero();
}

function resetHero() {
  startBtn.disabled  = false;
  stopBtn.disabled   = true;
  cancelBtn.disabled = true;

  sessionBadge.classList.remove('active');
  badgeLabel.textContent = 'En attente';

  resetCounter();

  timerDisplay.textContent = '00:00:00';
  timerDisplay.classList.remove('active');

  heroSub.textContent = 'gagné pendant cette pause';
}

// --- Delete & clear ---

function deleteSession(index) {
  sessions.splice(index, 1);
  saveSessions();
  renderHistory();
  renderStats();
}

function clearAll() {
  if (!confirm('Effacer tout l\'historique ?')) return;
  sessions = [];
  saveSessions();
  renderHistory();
  renderStats();
}

// --- Render history ---
// CSS uses .h-cols / .h-row — aligned to what style.css actually defines

function renderHistory() {
  if (sessions.length === 0) {
    historyList.innerHTML = `
      <div class="empty">
        <span class="empty-icon" aria-hidden="true">🚽</span><br>
        Aucune pause enregistrée.<br>Lance ton premier chrono !
      </div>`;
    return;
  }

  const head = `
    <div class="h-cols">
      <span>Type</span>
      <span>Heure</span>
      <span>Durée</span>
      <span>Gagné</span>
      <span></span>
    </div>`;

  const rows = sessions.map((s, i) => {
    const earnedStr = s.earned !== null
      ? s.earned.toFixed(4) + s.currency
      : '—';

    const badge = s.type === 'pipi'
      ? `<span class="badge badge-pipi">💧 Pipi</span>`
      : `<span class="badge badge-caca">💩 Caca</span>`;

    return `
      <div class="h-row">
        ${badge}
        <span class="h-time-val">${s.date} ${s.start}</span>
        <span class="h-dur">${formatDuration(s.duration)}</span>
        <span class="h-earn">${earnedStr}</span>
        <button class="del-btn" onclick="deleteSession(${i})" aria-label="Supprimer cette pause">✕</button>
      </div>`;
  }).join('');

  historyList.innerHTML = head + rows;
}

// --- Render stats & chart ---

function renderStats() {
  const totalEarned = sessions.reduce((acc, s) => acc + (s.earned || 0), 0);
  const totalMs     = sessions.reduce((acc, s) => acc + s.duration, 0);
  const count       = sessions.length;

  // Use current currency symbol for display
  statTotal.textContent = totalEarned.toFixed(2) + currency;

  const totalMin = Math.round(totalMs / 60000);
  statTime.textContent = totalMin >= 60
    ? `${(totalMin / 60).toFixed(1)}h`
    : `${totalMin} min`;

  statCount.textContent = count;

  statAvg.textContent = count > 0
    ? formatDuration(Math.round(totalMs / count))
    : '—';

  // Bar chart
  const pipiSessions = sessions.filter(s => s.type === 'pipi');
  const cacaSessions = sessions.filter(s => s.type === 'caca');
  const pipiMs = pipiSessions.reduce((a, s) => a + s.duration, 0);
  const cacaMs = cacaSessions.reduce((a, s) => a + s.duration, 0);

  if (pipiSessions.length > 0 || cacaSessions.length > 0) {
    chartSection.style.display = 'block';

    const maxMs   = Math.max(pipiMs, cacaMs, 1);
    const pipiPct = Math.round((pipiMs / maxMs) * 100);
    const cacaPct = Math.round((cacaMs / maxMs) * 100);

    barChart.innerHTML = `
      <div class="bar-row bar-pipi">
        <span class="bar-label">💧</span>
        <div class="bar-track">
          <div class="bar-fill" style="width: ${pipiPct}%">
            <span>${formatDuration(pipiMs)} · ${pipiSessions.length} pause${pipiSessions.length > 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>
      <div class="bar-row bar-caca">
        <span class="bar-label">💩</span>
        <div class="bar-track">
          <div class="bar-fill" style="width: ${cacaPct}%">
            <span>${formatDuration(cacaMs)} · ${cacaSessions.length} pause${cacaSessions.length > 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>`;
  } else {
    chartSection.style.display = 'none';
  }
}

// --- Currency change ---

currencySelect.addEventListener('change', function () {
  currency = this.value.split(' ')[0];
  // Sync the visible currency symbol in the counter
  cCur.textContent = currency;
  if (!timer) resetCounter();
  renderStats();
});

// --- Init ---
resetCounter();   // sets correct currency symbol on load
renderHistory();
renderStats();
