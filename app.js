/* =========================================
   FlushPay — app.js  v3
   ========================================= */
'use strict';

// ── State ──
let timer       = null;
let startTime   = null;
let elapsed     = 0;
let currentType = 'pipi';
let currency    = '€';
let sessions    = JSON.parse(localStorage.getItem('fp_sessions') || '[]');

// ── DOM refs ──
const cSym        = document.getElementById('cCur');
const cInt        = document.getElementById('cInt');
const cCents      = document.getElementById('cDecBig');
const cMicro      = document.getElementById('cDecSmall');

const sessionBadge  = document.getElementById('sessionBadge');
const badgeLabel    = document.getElementById('badgeLabel');
const heroSub       = document.getElementById('heroSub');
const timerDisplay  = document.getElementById('timerDisplay');

const tabPipi   = document.getElementById('tabPipi');
const tabCaca   = document.getElementById('tabCaca');

const startBtn  = document.getElementById('startBtn');
const stopBtn   = document.getElementById('stopBtn');
const cancelBtn = document.getElementById('cancelBtn');

const salaryInput    = document.getElementById('salaryInput');
const currencySelect = document.getElementById('currencySelect');

const historyList = document.getElementById('historyList');
const statTotal   = document.getElementById('statTotal');
const statTime    = document.getElementById('statTime');
const statCount   = document.getElementById('statCount');
const statAvg     = document.getElementById('statAvg');
const chartSection = document.getElementById('chartSection');
const barChart     = document.getElementById('barChart');

const toastEl = document.getElementById('toast');

// ── Helpers ──

function getSalary() { return parseFloat(salaryInput.value) || 0; }

function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map(v => String(v).padStart(2, '0')).join(':');
}

function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60), r = s % 60;
  return r > 0 ? `${m}m ${r}s` : `${m}m`;
}

function calcEarned(ms) {
  const sal = getSalary();
  return sal ? (sal / 3600) * (ms / 1000) : null;
}

function saveSessions() {
  localStorage.setItem('fp_sessions', JSON.stringify(sessions));
}

// ── Toast ──
let toastTimer = null;
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2500);
}

// ── Counter display ──
// Splits e.g. 1.234567 into: sym=€ int=1 cents=23 micro=4567

function setCounterValue(value) {
  const s = value.toFixed(6);
  const [intPart, decPart] = s.split('.');
  cInt.textContent   = intPart;
  cCents.textContent = decPart.slice(0, 2);
  cMicro.textContent = decPart.slice(2);
  cSym.textContent   = currency;
}

const LIVE_PARTS = [cSym, cInt, cCents, cMicro];

function setLive(on) {
  LIVE_PARTS.forEach(el => el.classList.toggle('live', on));
  timerDisplay.classList.toggle('live', on);
}

function resetCounter() {
  cInt.textContent   = '0';
  cCents.textContent = '00';
  cMicro.textContent = '0000';
  cSym.textContent   = currency;
  setLive(false);
}

// ── Type selector ──
function setType(type) {
  currentType = type;
  tabPipi.classList.toggle('active', type === 'pipi');
  tabCaca.classList.toggle('active', type === 'caca');
}

// ── Timer ──
function startTimer() {
  startTime = Date.now();
  elapsed   = 0;

  startBtn.disabled  = true;
  stopBtn.disabled   = false;
  cancelBtn.disabled = false;

  sessionBadge.classList.add('active');
  badgeLabel.textContent = currentType === 'pipi' ? '💧 Pause en cours' : '💩 Pause en cours';
  heroSub.textContent    = currentType === 'pipi'
    ? 'gagné depuis le début de ta pause pipi'
    : 'gagné depuis le début de ta pause caca';

  setLive(true);
  timer = setInterval(tick, 100);
}

function tick() {
  elapsed = Date.now() - startTime;
  timerDisplay.textContent = formatTime(elapsed);

  const earned = calcEarned(elapsed);
  if (earned !== null) {
    setCounterValue(earned);
  } else {
    // No salary: show MM:SS in the integer slots
    const totalSec = Math.floor(elapsed / 1000);
    cInt.textContent   = String(Math.floor(totalSec / 60)).padStart(2, '0');
    cCents.textContent = String(totalSec % 60).padStart(2, '0');
    cMicro.textContent = '';
    cSym.textContent   = '';
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
    currency,
  };

  sessions.unshift(session);
  saveSessions();
  resetHero();
  renderHistory();
  renderStats();

  const msg = session.earned !== null
    ? `✓ Pause terminée — tu as gagné ${session.earned.toFixed(4)}${currency}`
    : '✓ Pause enregistrée';
  showToast(msg);
}

function cancelTimer() {
  clearInterval(timer);
  timer = null;
  elapsed = 0;
  resetHero();
  showToast('Pause annulée');
}

function resetHero() {
  startBtn.disabled  = false;
  stopBtn.disabled   = true;
  cancelBtn.disabled = true;

  sessionBadge.classList.remove('active');
  badgeLabel.textContent = 'En attente';
  heroSub.textContent    = 'gagné pendant cette pause';

  timerDisplay.textContent = '00:00:00';
  resetCounter();
}

// ── Delete & clear ──
function deleteSession(i) {
  sessions.splice(i, 1);
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

// ── Render history ──
function renderHistory() {
  if (!sessions.length) {
    historyList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🚽</div>
        <p class="empty-title">Aucune pause enregistrée</p>
        <p class="empty-sub">Lance ton premier chrono pour commencer</p>
      </div>`;
    return;
  }

  const head = `
    <div class="h-table-head">
      <span>Type</span><span>Heure</span><span>Durée</span><span>Gagné</span><span></span>
    </div>`;

  const rows = sessions.map((s, i) => `
    <div class="h-row">
      <span class="badge ${s.type === 'pipi' ? 'badge-pipi' : 'badge-caca'}">
        ${s.type === 'pipi' ? '💧 Pipi' : '💩 Caca'}
      </span>
      <span class="h-time">${s.date} ${s.start}</span>
      <span class="h-dur">${formatDuration(s.duration)}</span>
      <span class="h-earn">${s.earned !== null ? s.earned.toFixed(4) + s.currency : '—'}</span>
      <button class="del-btn" onclick="deleteSession(${i})" aria-label="Supprimer">
        <svg viewBox="0 0 14 14" fill="none" width="12" height="12">
          <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    </div>`).join('');

  historyList.innerHTML = head + rows;
}

// ── Render stats & chart ──
function renderStats() {
  const total  = sessions.reduce((a, s) => a + (s.earned || 0), 0);
  const totalMs = sessions.reduce((a, s) => a + s.duration, 0);
  const count  = sessions.length;

  statTotal.textContent = total.toFixed(2) + currency;
  const totalMin = Math.round(totalMs / 60000);
  statTime.textContent = totalMin >= 60 ? `${(totalMin/60).toFixed(1)}h` : `${totalMin} min`;
  statCount.textContent = count;
  statAvg.textContent   = count ? formatDuration(Math.round(totalMs / count)) : '—';

  // Chart
  const pipiS = sessions.filter(s => s.type === 'pipi');
  const cacaS = sessions.filter(s => s.type === 'caca');
  const pipiMs = pipiS.reduce((a, s) => a + s.duration, 0);
  const cacaMs = cacaS.reduce((a, s) => a + s.duration, 0);

  if (pipiS.length || cacaS.length) {
    chartSection.style.display = 'block';
    const maxMs = Math.max(pipiMs, cacaMs, 1);

    barChart.innerHTML = `
      <div class="bar-row bar-pipi">
        <span class="bar-label">💧</span>
        <div class="bar-track">
          <div class="bar-fill" style="width:${Math.round(pipiMs/maxMs*100)}%">
            <span>${formatDuration(pipiMs)} · ${pipiS.length} pause${pipiS.length > 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>
      <div class="bar-row bar-caca">
        <span class="bar-label">💩</span>
        <div class="bar-track">
          <div class="bar-fill" style="width:${Math.round(cacaMs/maxMs*100)}%">
            <span>${formatDuration(cacaMs)} · ${cacaS.length} pause${cacaS.length > 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>`;
  } else {
    chartSection.style.display = 'none';
  }
}

// ── Theme ──
function toggleTheme() {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('fp_theme', next);
}

// ── Currency ──
currencySelect.addEventListener('change', function () {
  currency = this.value.split(' ')[0];
  cSym.textContent = currency;
  if (!timer) resetCounter();
  renderStats();
});

// ── Init ──
resetCounter();
renderHistory();
renderStats();
