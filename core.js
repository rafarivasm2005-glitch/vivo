/* core.js — estado, utilidades, navegación y hojas modales */
const KEY = 'diario.v1';

function defaults() {
  return {
    settings: {
      name: '',
      kcal: 2000,
      water: 8,
      mealsGoal: 3,
      tz: 'Asia/Taipei',
      theme: null,          // null = como el sistema; 'light' | 'dark'
      habits: [
        { id: 'h1', name: 'Meditar 10 minutos' },
        { id: 'h2', name: 'Leer 10 páginas' },
        { id: 'h3', name: 'Escribir 3 gratitudes' },
      ],
    },
    days: {},
    food: { goals: [], versions: [], entries: [], weeklyGoalDays: 5, streakMode: 'days', seeded: false },
    run: {
      baseline: null,       // { weeklyKm, sessionsPerWeek, longestKm, pain, calibratedOn }
      scale: 1,             // escala global del plan según tu volumen real
      sessions: {},         // key -> { state, km, moveTo }
      weekScale: {},        // semana -> factor (coach)
      weekFlags: {},        // semana -> { noQuality, dropFri }
      log: [],
      checkins: [],
      history: [],
      badgesSeen: [],
      nutritionTested: false,
    },
  };
}

function load() {
  const d = defaults();
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw) return { settings: { ...d.settings, ...raw.settings }, days: raw.days || {}, food: { ...d.food, ...raw.food }, run: { ...d.run, ...raw.run } };
  } catch (e) {}
  return d;
}
let S = load();
let view = 'home';
let cur = '';
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };

/* ---------- utilidades ---------- */
const $ = s => document.querySelector(s);
const uid = () => Math.random().toString(36).slice(2, 9);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sum = (a, f) => a.reduce((t, x) => t + (Number(f(x)) || 0), 0);

function iso(d) { const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 10); }
function parse(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function shift(s, n) { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); }
function daysBetween(a, b) { return Math.round((parse(b) - parse(a)) / 864e5); }
function weekdayMon(s) { return (parse(s).getDay() + 6) % 7; } // lunes = 0
function today() {
  try { return new Intl.DateTimeFormat('en-CA', { timeZone: S.settings.tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
  catch (e) { return iso(new Date()); }
}
const dshort = s => parse(s).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
const dlong = s => parse(s).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

const fmtKm = n => (Math.round(n * 10) / 10).toString().replace('.', ',');
function fmtPace(sec) { if (!sec || !isFinite(sec)) return '–'; const m = Math.floor(sec / 60), s = Math.round(sec % 60); return s === 60 ? `${m + 1}:00` : `${m}:${String(s).padStart(2, '0')}`; }
function fmtTime(sec) { sec = Math.round(sec); const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`; }
function parseTime(str) {
  const p = String(str).trim().split(':').map(Number);
  if (!p.length || p.some(x => isNaN(x) || x < 0)) return NaN;
  if (p.length === 1) return p[0] * 60;
  if (p.length === 2) return p[0] * 60 + p[1];
  if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
  return NaN;
}
const num = v => Number(String(v).replace(',', '.'));

/* día: lectura segura sin crear entradas vacías */
const BLANK = () => ({ meals: [], water: 0, workouts: [], mood: null, journal: '', reflection: '', habits: {} });
const get = (k = cur) => ({ ...BLANK(), ...(S.days[k] || {}) });
function day(k = cur) { S.days[k] = { ...BLANK(), ...(S.days[k] || {}) }; return S.days[k]; }

/* ---------- iconos ---------- */
const ICON = {
  home: '<path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  food: '<path d="M7 3v7a2.5 2.5 0 0 0 5 0V3M9.5 10v11M17 3c-2.2 1.6-3 4.2-3 7h3v11"/>',
  sport: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  mind: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.4.4.6.8.6 1.2v1h6v-1c0-.4.2-.8.6-1.2A6 6 0 0 0 12 3z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  chev: '<path d="m9 6 6 6-6 6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.200 3.600-7 8-7s8 2.800 8 7"/>',
  moon: '<path d="M20 14.500A8 8 0 0 1 9.500 4 8 8 0 1 0 20 14.500z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.900 4.900l1.400 1.400M17.700 17.700l1.400 1.400M4.900 19.100l1.400-1.400M17.700 6.300l1.400-1.400"/>',
};
const svg = (k, s = 24, sw = 1.7) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${ICON[k]}</svg>`;

function ring(p, size = 64, stroke = 7, inner = '') {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, o = size / 2;
  p = Math.max(0, Math.min(1, p));
  return `<div class="ringw" style="width:${size}px;height:${size}px"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle class="rt" cx="${o}" cy="${o}" r="${r}" stroke-width="${stroke}"/>
    <circle class="rf" cx="${o}" cy="${o}" r="${r}" stroke-width="${stroke}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p)}" transform="rotate(-90 ${o} ${o})"/></svg>
    <span class="ringin">${inner}</span></div>`;
}

/* ---------- acciones, vistas y hojas ---------- */
const A = {};       // acciones (data-action)
const VIEWS = {};   // vistas
const LIVE = {};    // handlers de inputs en vivo (data-live)

function openSheet(html) {
  const el = $('#sheet');
  el.innerHTML = `<div class="scrim" data-action="closeSheet"></div><div class="panel"><div class="grab"></div><div class="pbody">${html}</div></div>`;
  requestAnimationFrame(() => el.classList.add('open'));
  document.body.classList.add('lock');
}
function closeSheet() {
  const el = $('#sheet');
  el.classList.remove('open');
  document.body.classList.remove('lock');
  setTimeout(() => { if (!el.classList.contains('open')) el.innerHTML = ''; }, 320);
}
A.closeSheet = () => { closeSheet(); return false; };

let toastT;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2400);
}

const groupVal = g => document.querySelector(`[data-group="${g}"] .on`)?.dataset.v;
const val = id => document.getElementById(id)?.value.trim() ?? '';
A.pick = el => { el.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === el)); return false; };
A.sw = el => { (el.querySelector('.switch') || el).classList.toggle('on'); return false; };

const TABS = [['home', 'Home', 'home'], ['deporte', 'Deporte', 'sport'], ['comida', 'Alimentación', 'apple'], ['mente', 'Mente', 'mind']];

function renderTabs() {
  $('#tabs').innerHTML = TABS.map(([v, l, i]) => `<button data-action="goto" data-view="${v}">${svg(i, 24, 1.6)}<span>${l}</span></button>`).join('');
}

function render() {
  const f = VIEWS[view] || VIEWS.home;
  $('#main').innerHTML = `<div class="fade">${f()}</div>`;
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.view === view));
  const t = today();
  const lab = cur === t ? 'Hoy' : cur === shift(t, -1) ? 'Ayer' : cur === shift(t, 1) ? 'Mañana' : '';
  const dl = dlong(cur);
  $('#dateLabel').textContent = `${lab ? lab + ' · ' : ''}${dl.charAt(0).toUpperCase() + dl.slice(1)}`;
}

/* ---------- tema ---------- */
const themeNow = () => S.settings.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
function applyTheme() {
  const t = themeNow();
  document.documentElement.dataset.theme = t;
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.setAttribute('content', t === 'dark' ? '#000000' : '#ffffff'));
  $('#themeBtn').innerHTML = svg(t === 'dark' ? 'sun' : 'moon', 22);
  $('#profileBtn').innerHTML = svg('user', 22);
}
A.theme = () => { S.settings.theme = themeNow() === 'dark' ? 'light' : 'dark'; applyTheme(); };

A.prev = () => { cur = shift(cur, -1); };
A.next = () => { cur = shift(cur, 1); };
A.todayBtn = () => { cur = today(); };
A.goto = el => { view = el.dataset.view; history.replaceState(null, '', '#' + view); window.scrollTo(0, 0); };

document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const f = A[el.dataset.action];
  if (!f) return;
  if (f(el, e) === false) return;
  save(); render();
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.live) LIVE[t.dataset.live]?.(t);
});

/* ---------- descargas ---------- */
function download(name, text, mime) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: mime }));
  a.download = name; a.click();
}
