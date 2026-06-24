/* =========================================
   PausePay — app.js
   ========================================= */

'use strict';

// --- State ---
let timer      = null;
let startTime  = null;
let elapsed    = 0;
let currentType = 'pipi';
let currency   = '€';
let sessions   = JSON.parse(localStorage.getItem('pausepay_sessions') || '[]');

// --- DOM refs ---
const heroAmount   = document.getElementById('heroAmount');
const heroSub      = document.getElementById('heroSub');
const timerDisplay = document.getElementById('timerDisplay');
const liveIndicator = document.getElementById('liveIndicator');
const startBtn     = document.getElementById('startBtn');
const stopBtn      = document.getElementById('stopBtn');
const cancelBtn    = document.getElementById('cancelBtn');
const salaryInput  = document.getElementById('salaryInput');
const currencySelect = document.getElementById('currencySelect');
const currencySymbol = document.getElementById('currencySymbol');
const historyList  = document.getElementById('historyList');
const statTotal    = document.getElementById('statTotal');
const statTime     = document.getElementById('statTime');
const statCount    = document.getElementById('statCount');
const statAvg      = document.getElementById('statAvg');
const chartSection = document.getElementById('chartSection');
const barChart     = document.getElementById('barChart');

// --- Helpers ---

function getSalary() {
  return parseFloat(salaryInput.value) || 0;
}

function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h   = Math.floor(totalSec / 3600);
  const m   = Math.floor((totalSec % 3600) / 60);
  const s   = totalSec % 60;
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

// --- Type selector ---

function setType(type) {
  currentType = type;
  document.getElementById('typePipi').className = 'type-btn' + (type === 'pipi' ? ' active-pipi' : '');
  document.getElementById('typeCaca').className = 'type-btn' + (type === 'caca' ? ' active-caca' : '');
}

// --- Timer controls ---

function startTimer() {
  startTime = Date.now();
  elapsed   = 0;

  startBtn.disabled  = true;
  stopBtn.disabled   = false;
  cancelBtn.disabled = false;

  liveIndicator.classList.add('visible');
  heroAmount.classList.add('active');
  heroSub.textContent = currentType === 'pipi'
    ? 'Pause pipi en cours... 💧'
    : 'Pause caca en cours... 💩';

  timer = setInterval(tick, 100);
}

function tick() {
  elapsed = Date.now() - startTime;

  timerDisplay.textContent = formatTime(elapsed);
  timerDisplay.classList.add('active');

  const earned = calcEarned(elapsed);
  if (earned !== null) {
    heroAmount.textContent = earned.toFixed(4) + currency;
  } else {
    heroAmount.textContent = formatTime(elapsed);
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
  timer = null;
  elapsed = 0;
  resetHero();
}

function resetHero() {
  startBtn.disabled  = false;
  stopBtn.disabled   = true;
  cancelBtn.disabled = true;

  liveIndicator.classList.remove('visible');
  heroAmount.classList.remove('active');
  heroAmount.style.fontSize = '';
  heroAmount.textContent = '0.0000' + currency;

  timerDisplay.textContent = '00:00:00';
  timerDisplay.classList.remove('active');

  heroSub.textContent = 'Lance un chrono pour commencer';
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

function renderHistory() {
  if (sessions.length === 0) {
    historyList.innerHTML = `
      <div class="history-empty">
        <i class="ti ti-toilet-paper" aria-hidden="true"></i>
        Aucune pause enregistrée encore.<br>Lance ton premier chrono !
      </div>`;
    return;
  }

  const head = `
    <div class="history-col-head">
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
      ? `<span class="history-type-badge badge-pipi">💧 Pipi</span>`
      : `<span class="history-type-badge badge-caca">💩 Caca</span>`;

    return `
      <div class="history-row">
        ${badge}
        <span class="h-time">${s.date} ${s.start}</span>
        <span class="h-duration">${formatDuration(s.duration)}</span>
        <span class="h-earned">${earnedStr}</span>
        <button class="h-delete" onclick="deleteSession(${i})" aria-label="Supprimer cette pause">
          <i class="ti ti-x" aria-hidden="true"></i>
        </button>
      </div>`;
  }).join('');

  historyList.innerHTML = head + rows;
}

// --- Render stats & chart ---

function renderStats() {
  const totalEarned = sessions.reduce((acc, s) => acc + (s.earned || 0), 0);
  const totalMs     = sessions.reduce((acc, s) => acc + s.duration, 0);
  const count       = sessions.length;

  // Total earned
  statTotal.textContent = totalEarned.toFixed(2) + currency;

  // Total time
  const totalMin = Math.round(totalMs / 60000);
  statTime.textContent = totalMin >= 60
    ? `${(totalMin / 60).toFixed(1)}h`
    : `${totalMin} min`;

  // Count
  statCount.textContent = count;

  // Average duration
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

    const maxMs    = Math.max(pipiMs, cacaMs, 1);
    const pipiPct  = Math.round((pipiMs / maxMs) * 100);
    const cacaPct  = Math.round((cacaMs / maxMs) * 100);

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
  currencySymbol.textContent = currency;
  if (!timer) heroAmount.textContent = '0.0000' + currency;
  renderStats();
});

// --- Init ---
renderHistory();
renderStats();
