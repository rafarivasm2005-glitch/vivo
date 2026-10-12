/* sport.js — lógica del plan de running: sesiones, estados, seguridad, coach y logros */
const R = () => S.run;
const DAYS = [
  { key: 'tue', name: 'martes', short: 'Mar', off: 1 },
  { key: 'thu', name: 'jueves', short: 'Jue', off: 3 },
  { key: 'fri', name: 'viernes', short: 'Vie', off: 4 },
  { key: 'sun', name: 'domingo', short: 'Dom', off: 6 },
];
const SESSION_FIELDS = ['date_local', 'session_type', 'planned_km', 'actual_km', 'moving_seconds', 'avg_pace_seconds_per_km', 'rpe_0_10', 'pain_0_10', 'pain_location', 'fatigue_1_5', 'sleep_1_5', 'energy_1_5', 'session_completed', 'notes', 'import_source'];

const wkIdx = d => Math.floor(daysBetween(PLAN.start, d) / 7);
const weekStart = w => shift(PLAN.start, (w - 1) * 7);
const weekEnd = w => shift(weekStart(w), 6);
const mondayOf = d => shift(d, -weekdayMon(d));
const wkObj = w => PLAN.weeks[w - 1];

function hist(key, action, detail = '') {
  R().history.unshift({ ts: Date.now(), key, action, detail });
  if (R().history.length > 200) R().history.length = 200;
}

/* ---------- registro ---------- */
const runLog = () => R().log.slice().sort((a, b) => (a.date_local < b.date_local ? -1 : a.date_local > b.date_local ? 1 : 0));
// Estado reciente del cuerpo, tomado de la última salida registrada (sin cuestionarios aparte)
const lastCheckin = days => {
  const from = shift(today(), -days);
  const l = runLog().filter(x => x.date_local >= from).pop();
  return l ? { date: l.date_local, fatigue: l.fatigue_1_5, pain: l.pain_0_10 } : undefined;
};
function easyPace() {
  const rs = runLog().filter(l => l.avg_pace_seconds_per_km && l.rpe_0_10 <= 5).slice(-5);
  if (!rs.length) return 510;
  return Math.max(420, sum(rs, l => l.avg_pace_seconds_per_km) / rs.length);
}
function longest30(date) {
  const from = shift(date, -30);
  let m = 0;
  R().log.forEach(l => { if (l.date_local >= from && l.date_local < date) m = Math.max(m, l.actual_km); });
  const b = R().baseline;
  if (b && Math.abs(daysBetween(b.calibratedOn, date)) <= 30) m = Math.max(m, b.longestKm || 0);
  return m;
}
const maxKmEver = () => Math.max(0, ...R().log.map(l => l.actual_km), R().baseline?.longestKm || 0);
const kmBetween = (a, b) => sum(R().log.filter(l => l.date_local >= a && l.date_local <= b), l => l.actual_km);

/* ---------- sesiones ---------- */
const WD_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const WD_NAME = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const scaleKm = (k, sc) => (sc >= 0.995 ? k : Math.max(2, Math.round(k * sc * 2) / 2));

function sessionsOfWeek(wk) {
  const flags = R().weekFlags[wk.w] || {};
  const sc = R().scale * (R().weekScale[wk.w] ?? 1);
  return DAYS.filter(d => wk[d.key]).map(d => {
    const key = `${wk.w}-${d.key}`;
    const st = R().sessions[key] || {};
    let type = d.key === 'tue' ? 'easy' : d.key === 'thu' ? (wk.thuQ ? 'controlled' : 'easy') : d.key === 'fri' ? 'recovery' : wk.w === 16 ? 'goal_event' : 'long_easy';
    if (flags.noQuality && type === 'controlled') type = 'easy';
    let km = st.km ?? scaleKm(wk[d.key], sc);
    if (type === 'goal_event' && st.km == null) km = stretchEval().state === 'listo' ? PLAN.stretchKm : PLAN.primaryKm;
    const baseDate = shift(weekStart(wk.w), d.off), date = st.moveTo || baseDate;
    const gs = R().scale, ws = R().weekScale[wk.w] ?? 1, why = [];
    if (type !== 'goal_event') {
      if (st.km != null) why.push('ajustada por ti');
      else { if (gs < 0.995) why.push(`calibración ${Math.round(gs * 100)} %`); if (ws < 0.995) why.push(`ajuste del coach ${Math.round(ws * 100)} %`); }
    }
    return {
      why, key, week: wk.w, day: d.key, dayName: WD_NAME[weekdayMon(date)], short: WD_SHORT[weekdayMon(date)], type, baseKm: wk[d.key], km,
      baseDate, date, late: !st.state && date < today(),
      mandatory: d.key !== 'fri', conditional: d.key === 'sun' && !!wk.cond,
      dropped: d.key === 'fri' && !!flags.dropFri,
      state: st.state || null, adapted: st.km != null || sc !== 1 || !!st.moveTo,
    };
  });
}
const allSessions = () => PLAN.weeks.flatMap(sessionsOfWeek);
const findSession = key => allSessions().find(s => s.key === key);
const sessionsOn = d => allSessions().filter(s => s.date === d && !s.dropped);

function setState(key, state, detail) {
  const cur0 = R().sessions[key] || {};
  R().sessions[key] = { ...cur0, state };
  hist(key, state === null ? 'Restaurada' : state === 'done' ? 'Completada' : state === 'rest' ? 'Descanso / adaptada' : 'No realizada', detail || '');
}

/* alertas de seguridad (tirada +10 %, duración > 3 h) */
function alertsFor(s) {
  const out = [];
  if (s.state) return out;
  if (s.date > shift(today(), 7)) return out;
  if (s.type === 'long_easy' || s.type === 'goal_event') {
    const l = longest30(s.date);
    if (l > 0 && s.km > l * 1.1 + 0.05) {
      const suggest = Math.floor(l * 1.1 * 10) / 10;
      out.push({ kind: 'cap', suggest, text: `Supera un 10 % tu tirada más larga de los últimos 30 días (${fmtKm(l)} km). Sugerencia: ${fmtKm(suggest)} km.` });
    } else if (l === 0) {
      out.push({ kind: 'nodata', text: 'Sin tiradas recientes registradas: toma esta distancia como provisional.' });
    }
  }
  const mins = (s.km * easyPace()) / 60;
  if (mins > 180) {
    const suggest = Math.floor(((180 * 60) / easyPace()) * 10) / 10;
    out.push({ kind: 'dur', suggest, text: `Estimamos más de 3 h (${Math.round(mins)} min). Termina antes y ajusta la meta; no aceleres para cumplir.` });
  }
  return out;
}

/* ---------- semanas y racha ---------- */
function weekStatus(wk) {
  const t = today();
  const ss = sessionsOfWeek(wk).filter(s => s.mandatory && !s.dropped);
  if (ss.every(s => s.state === 'done' || s.state === 'rest')) return 'complete';
  const end = ss.reduce((m, s) => (s.date > m ? s.date : m), weekEnd(wk.w));
  if (t < weekStart(wk.w)) return 'future';
  if (t > end) return 'missed';
  return 'active';
}
function weekStreak() {
  const i = Math.min(15, wkIdx(today()));
  let n = 0;
  for (let k = i; k >= 0; k--) {
    const st = weekStatus(PLAN.weeks[k]);
    if (st === 'complete') n++;
    else if (st === 'active' || st === 'future') continue;
    else break;
  }
  return n;
}
const completedWeeks = () => PLAN.weeks.filter(w => weekStatus(w) === 'complete' && weekStart(w.w) <= today()).length;
const weekPlanKm = (wk, withOpt = false) => sum(sessionsOfWeek(wk).filter(s => !s.dropped && (withOpt || s.mandatory)), s => s.km);
const weekActualKm = wk => kmBetween(weekStart(wk.w), weekEnd(wk.w));

function nextSession() {
  const t = today();
  return allSessions().filter(s => !s.dropped && !s.state && s.date >= t).sort((a, b) => (a.date < b.date ? -1 : 1))[0] || null;
}

/* estado deportivo de un día (para Home y racha) */
function sportStatus(k) {
  const ss = sessionsOn(k);
  const mand = ss.filter(s => s.mandatory);
  if (k < PLAN.start) return { done: true, pct: 1, short: 'Descanso', text: 'Antes del plan · descanso', rest: true };
  if (!mand.length) return { done: true, pct: 1, short: 'Descanso', text: ss.length ? 'Sesión opcional · descansar cuenta' : 'Día de descanso', rest: true };
  const d = mand.filter(s => s.state === 'done' || s.state === 'rest').length;
  if (d === mand.length) return { done: true, pct: 1, short: `${d}/${mand.length}`, text: 'Sesión cumplida' };
  const s = mand.find(x => !(x.state === 'done' || x.state === 'rest'));
  return { done: false, pct: d / mand.length, short: `${d}/${mand.length}`, text: s.state === 'missed' || s.late ? 'No realizada' : `${TYPES[s.type].name} · ${fmtKm(s.km)} km` };
}

/* ---------- récords y marcas ---------- */
function bestFor(km) {
  const c = R().log.filter(l => l.actual_km >= km - 0.05 && l.avg_pace_seconds_per_km);
  if (!c.length) return null;
  const b = c.reduce((a, x) => (x.avg_pace_seconds_per_km < a.avg_pace_seconds_per_km ? x : a));
  return { pace: b.avg_pace_seconds_per_km, time: b.avg_pace_seconds_per_km * km, date: b.date_local };
}

/* ---------- reto stretch ---------- */
function painPersistent(days = 14) {
  const from = shift(today(), -days);
  const n = R().log.filter(l => l.date_local >= from && l.pain_0_10 >= 4).length;
  return n >= 2;
}
function recoveryOk() {
  const ck = lastCheckin(14);
  return ck ? ck.fatigue <= 3 : null;
}
function stretchEval() {
  const t = today(), log = R().log;
  const recent = log.filter(l => l.date_local >= shift(t, -30));
  const items = [];
  items.push({ label: '23,5 km completados con comodidad (últimos 30 días)', ok: recent.some(l => l.actual_km >= 23 && l.rpe_0_10 <= 7 && l.pain_0_10 <= 3) });
  let w4 = 0;
  for (let i = 0; i < 5; i++) {
    const to = shift(mondayOf(t), 6 - 7 * i), from = shift(to, -6);
    if (log.filter(l => l.date_local >= from && l.date_local <= to).length >= 4) w4++;
  }
  items.push({ label: 'Al menos 2 semanas de 4 salidas toleradas cerca del pico', ok: w4 >= 2 });
  items.push({ label: 'Sin dolor persistente', ok: log.length ? !painPersistent() : null });
  items.push({ label: 'Buena recuperación', ok: recoveryOk() });
  const all = items.every(i => i.ok === true);
  const state = !R().baseline ? 'calibrar' : all ? 'listo' : 'camino';
  return { state, items, missing: items.filter(i => i.ok !== true).length };
}
function gateItems(w) {
  const t = today();
  const ss = PLAN.weeks.filter(x => x.w <= w && weekStart(x.w) <= t).flatMap(sessionsOfWeek).filter(s => s.mandatory && !s.dropped && s.date <= t);
  const done = ss.filter(s => s.state === 'done' || s.state === 'rest').length;
  const items = [
    { label: `Constancia: ${done}/${ss.length} sesiones obligatorias`, ok: ss.length ? done / ss.length >= 0.8 : null },
    { label: 'Sin dolor persistente', ok: R().log.length ? !painPersistent() : null },
    { label: 'Buena recuperación', ok: recoveryOk() },
  ];
  if (w === 14) items.push(...stretchEval().items.filter(i => !/dolor|recuperación/.test(i.label)));
  return items;
}

/* ---------- coach adaptativo (conservador: nunca sube más allá del plan) ---------- */
function targetWeek() {
  const t = today();
  let i = wkIdx(t);
  if (i < 0) return 1;
  if (i > 15) return 16;
  if (weekdayMon(t) >= 5 && i < 15) i++;
  return i + 1;
}
function advice() {
  const t = today(), tw = targetWeek(), wk = wkObj(tw);
  const ck = lastCheckin(8);
  const recent = R().log.filter(l => l.date_local >= shift(t, -7));
  const reasons = [];
  let level = 'ok', factor = 1, quality = false, dropFri = false, rest = false;
  const ease = (f, txt, q = true) => {
    if (level !== 'rest') level = 'ease';
    factor = Math.min(factor, f);
    if (q) { quality = true; dropFri = true; }
    reasons.push(txt);
  };
  const maxPain = Math.max(ck?.pain || 0, ...recent.map(l => l.pain_0_10 || 0));
  if (maxPain >= 7) { level = 'rest'; rest = true; reasons.push(`Dolor ${maxPain}/10: descansa. Si persiste más de 24–48 h, consulta con un profesional.`); }
  else if (maxPain >= 4) ease(0.75, `Dolor ${maxPain}/10 reciente: baja la carga y evita sesiones de calidad.`);
  if (ck) {
    if (ck.fatigue >= 4) ease(0.85, 'Fatiga alta esta semana.');
  }
  const hardEasy = recent.filter(l => l.session_type === 'easy' && l.rpe_0_10 >= 7);
  if (hardEasy.length) reasons.push('Algún rodaje fácil te ha costado RPE 7 o más: la próxima, más suave. El plan no cambia.');
  const prev = wkObj(Math.max(1, tw - 1));
  const missedPrev = sessionsOfWeek(prev).filter(s => s.mandatory && !s.dropped && (s.state === 'missed' || s.late)).length;
  if (tw > 1 && missedPrev >= 2) ease(0.85, 'Perdiste varias sesiones la semana pasada: no recuperamos kilómetros; retrocedemos algo la carga.', false);
  sessionsOfWeek(wk).filter(s => !s.state).forEach(s => alertsFor(s).filter(a => a.kind !== 'nodata').forEach(a => reasons.push(`${TYPES[s.type].name} (${s.short}): ${a.text}`)));
  if (!reasons.length) reasons.push(wk.phase === 'Descarga' || wk.phase === 'Taper' ? 'Semana de descarga: todo fácil.' : 'Todo en orden. Sigue el plan tal cual.');
  return { level, factor, quality, dropFri, rest, reasons, target: tw };
}

/* ---------- logros (derivados de los datos) ---------- */
function badgeList() {
  const log = R().log, mk = maxKmEver();
  const b10 = bestFor(10);
  return [
    { id: 'first', name: 'Primer paso', desc: 'Registra tu primer entreno', ok: log.length >= 1 },
    { id: 'runs10', name: '10 salidas', desc: 'Registra 10 entrenos', ok: log.length >= 10 },
    { id: 'k10', name: '10 K', desc: 'Corre 10 km seguidos', ok: mk >= 10 },
    { id: 'k15', name: '15 K', desc: 'Corre 15 km seguidos', ok: mk >= 15 },
    { id: 'k21', name: 'Media maratón', desc: 'Corre 21,1 km', ok: mk >= 21.1 },
    { id: 'k25', name: '25,5 K', desc: 'Corre 25,5 km', ok: mk >= 25.5 },
    { id: 'w1', name: 'Semana completa', desc: 'Completa una semana planificada', ok: completedWeeks() >= 1 },
    { id: 'w4', name: 'Constancia ×4', desc: '4 semanas planificadas completadas', ok: completedWeeks() >= 4 },
    { id: 'w8', name: 'Constancia ×8', desc: '8 semanas planificadas completadas', ok: completedWeeks() >= 8 },
    { id: 'rest', name: 'Descanso inteligente', desc: 'Descansa o adapta una sesión cuando tocaba', ok: Object.values(R().sessions).some(x => x.state === 'rest') },
    { id: 'bonus', name: '10 K a 6:30', desc: 'Bonus: 10 km a 6:30 min/km o menos', ok: !!b10 && b10.pace <= 390 },
  ];
}
function newBadges() {
  const fresh = badgeList().filter(b => b.ok && !R().badgesSeen.includes(b.id));
  fresh.forEach(b => R().badgesSeen.push(b.id));
  return fresh;
}

/* Vincula cada entreno con la sesión programada EN SU FECHA (respeta las sesiones movidas).
   Una sesión solo se cumple registrando el entreno el día en que está programada. */
function syncLinks() {
  R().log.forEach(l => {
    const linked = l.session_key && findSession(l.session_key);
    if (linked && linked.date === l.date_local) {
      if (!linked.state) setState(linked.key, 'done', `${fmtKm(l.actual_km)} de ${fmtKm(linked.km)} km`);
      return;
    }
    if (linked) {
      l.session_key = '';
      if (linked.state === 'done' && !R().log.some(x => x !== l && x.session_key === linked.key)) setState(linked.key, null, 'Entreno registrado en otra fecha');
    }
    const m = sessionsOn(l.date_local).find(s => !s.state);
    if (m) {
      l.session_key = m.key;
      if (!l.planned_km) l.planned_km = m.km;
      if (l.session_type === 'other') l.session_type = m.type;
      setState(m.key, 'done', `${fmtKm(l.actual_km)} de ${fmtKm(m.km)} km`);
    }
  });
}

/* ---------- acciones de lógica ---------- */
A.clearWeekAdj = el => {
  const w = Number(el.dataset.w);
  delete R().weekScale[w]; delete R().weekFlags[w];
  hist(`${w}-sun`, 'Ajuste del coach quitado', 'Distancias de la semana restauradas');
  toast('Distancias de la semana restauradas');
};
A.setState = el => {
  const { key, st } = el.dataset;
  setState(key, st === 'null' ? null : st);
  closeSheet(); toast(st === 'rest' ? 'Descanso registrado: cuenta como cumplido' : st === 'null' ? 'Sesión restaurada' : 'Anotado');
};
A.adaptKm = el => {
  const s = findSession(el.dataset.key);
  const km = Number(el.dataset.km) || Math.max(2, Math.round(s.km * 0.8 * 2) / 2);
  R().sessions[s.key] = { ...(R().sessions[s.key] || {}), km };
  hist(s.key, 'Distancia adaptada', `${fmtKm(s.km)} → ${fmtKm(km)} km`);
  closeSheet(); toast(`Ajustada a ${fmtKm(km)} km`);
};
A.restoreKm = el => {
  const st = { ...(R().sessions[el.dataset.key] || {}) };
  delete st.km; delete st.moveTo;
  R().sessions[el.dataset.key] = st;
  hist(el.dataset.key, 'Restaurada al plan');
  syncLinks();
  closeSheet(); toast('Restaurada al plan');
};
A.moveSession = el => {
  const s = findSession(el.dataset.key), to = val('mvDate');
  if (!to) return false;
  const hard = x => x.type === 'long_easy' || x.type === 'controlled' || x.type === 'goal_event';
  if (hard(s)) {
    const clash = sessionsOn(shift(to, -1)).concat(sessionsOn(shift(to, 1))).filter(x => x.key !== s.key && hard(x) && !x.state);
    if (clash.length && !confirm('Quedaría pegada a otra sesión exigente. ¿Mover igualmente?')) return false;
  }
  R().sessions[s.key] = { ...(R().sessions[s.key] || {}), moveTo: to === s.baseDate ? null : to };
  hist(s.key, 'Movida', `${dshort(s.date)} → ${dshort(to)}`);
  syncLinks();
  closeSheet(); toast(`Movida al ${dshort(to)}`);
};
