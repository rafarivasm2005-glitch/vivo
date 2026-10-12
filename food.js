/* food.js — Alimentación: hábitos diarios editables, con versionado por fecha y conectados a Home */
const FUNITS = ['veces', 'piezas', 'raciones', 'comidas', 'vasos', 'ml', 'otra'];
const FICONS = ['apple', 'utensils', 'cup', 'leaf', 'egg', 'fish', 'heart', 'star', 'dot'];
const fui = { tab: 'hoy' };
const nowIso = () => new Date().toISOString();
const fmtN = n => (Math.round(n * 100) / 100).toString().replace('.', ',');

Object.assign(ICON, {
  utensils: ICON.food,
  apple: '<path d="M12 20.940c1.500 0 2.750 1.060 4 1.060 3 0 6-8 6-12.220A4.910 4.910 0 0 0 17 5c-2.220 0-4 1.440-5 2-1-.560-2.780-2-5-2a4.900 4.900 0 0 0-5 4.780C2 14 5 22 8 22c1.250 0 2.500-1.060 4-1.060z"/><path d="M10 2c1 .5 2 2 2 5"/>',
  cup: '<path d="M6 4h12l-1.5 15.2a1 1 0 0 1-1 .8h-7a1 1 0 0 1-1-.8z"/><path d="M6.4 9h11.200"/>',
  leaf: '<path d="M5 19C5 10 10 5 19 5c0 9-5 14-13 14"/><path d="M5 19c3-5 6-8 10-10"/>',
  egg: '<path d="M12 3c3.500 0 6 5.200 6 9.200a6 6 0 0 1-12 0C6 8.200 8.500 3 12 3z"/>',
  fish: '<path d="M3 12c3-4 7-5 11-3l4-3v12l-4-3c-4 2-8 1-11-3z"/><circle cx="8" cy="11" r=".7"/>',
  heart: '<path d="M12 20s-7-4.500-8.500-9A4.500 4.500 0 0 1 12 7a4.500 4.500 0 0 1 8.500 4C19 15.500 12 20 12 20z"/>',
  star: '<path d="m12 3 2.700 5.600 6.100.9-4.400 4.300 1 6.100L12 17l-5.400 2.900 1-6.100L3.200 9.500l6.100-.9z"/>',
  dot: '<circle cx="12" cy="12" r="7"/>',
});

/* ---------- datos ---------- */
function F() {
  if (!S.food) S.food = defaults().food;
  if (!S.food.seeded) seedFood();
  return S.food;
}
function seedFood() {
  const f = S.food, eff = today() < '2026-10-11' ? today() : '2026-10-11';
  const mk = (id, title, description, icon, unit, target, order) => {
    f.goals.push({ id, title, description, icon, unit, target, tracking_type: 'count', increment: 1, is_active: true, is_archived: false, editable: true, sort_order: order, created_at: nowIso(), updated_at: nowIso() });
    f.versions.push({ id: uid(), goal_id: id, effective_local_date: eff, timezone: S.settings.tz, title, unit, target, is_active: true, is_archived: false, updated_at: nowIso() });
  };
  mk('fruit_portions', 'Fruta', 'Comer al menos una pieza o ración de fruta al día.', 'apple', 'raciones', 1, 0);
  mk('protein_meals', 'Comidas con proteína', 'Cuenta comidas distintas con una fuente clara de proteína (pescado, pollo, huevos, tofu, legumbres…), no varios alimentos de la misma comida.', 'utensils', 'comidas', 2, 1);
  f.seeded = true;
}
const goalById = id => F().goals.find(g => g.id === id);
function gv(goalId, date) { // versión vigente de un objetivo en una fecha
  const vs = F().versions.filter(v => v.goal_id === goalId && v.effective_local_date <= date);
  if (!vs.length) return null;
  return vs.reduce((a, b) => (b.effective_local_date > a.effective_local_date || (b.effective_local_date === a.effective_local_date && b.updated_at >= a.updated_at) ? b : a));
}
const entriesOn = (date, goalId) => F().entries.filter(e => e.local_date === date && e.goal_id === goalId && !e.deleted_at);
const recorded = (date, goalId) => sum(entriesOn(date, goalId), e => e.quantity);
function activeGoalsOn(date) {
  return F().goals.map(g => ({ g, v: gv(g.id, date) }))
    .filter(x => x.v && x.v.is_active && !x.v.is_archived)
    .sort((a, b) => a.g.sort_order - b.g.sort_order)
    .map(x => { const rec = recorded(date, x.g.id); return { ...x, rec, met: rec >= x.v.target }; });
}
function foodStatus(k) { // alimenta Home y la racha
  const gs = activeGoalsOn(k), total = gs.length, completed = gs.filter(x => x.met).length;
  const done = total > 0 && completed === total;
  const has = F().entries.some(e => e.local_date === k);
  const state = total === 0 ? 'not_configured' : done ? 'done' : 'pending';
  return {
    state, done, completed, total, has, short: `${completed}/${total}`, pct: total ? completed / total : 0, inner: total ? `${completed}/${total}` : '–',
    text: total === 0 ? 'Sin objetivos' : `${completed}/${total} · ${done ? 'Hecho' : has ? 'Pendiente' : 'Sin registros'}`,
  };
}
function pushVersion(g, patch = {}, from) {
  const f = F(), eff = from || today();
  const nv = { id: uid(), goal_id: g.id, effective_local_date: eff, timezone: S.settings.tz, title: g.title, unit: g.unit, target: g.target, is_active: g.is_active, is_archived: g.is_archived, updated_at: nowIso(), ...patch };
  f.versions = f.versions.filter(v => !(v.goal_id === g.id && v.effective_local_date === eff));
  f.versions.push(nv);
  g.updated_at = nowIso();
}

/* ---------- rachas ---------- */
function foodDayStreak() {
  const t = today();
  let k = foodStatus(t).done ? t : shift(t, -1), n = 0;
  while (n < 1000 && foodStatus(k).done) { n++; k = shift(k, -1); }
  return n;
}
function weekDoneDays(mon) { let n = 0; for (let i = 0; i < 7; i++) { const k = shift(mon, i); if (k <= today() && foodStatus(k).done) n++; } return n; }
function foodWeekStreak() {
  const need = F().weeklyGoalDays;
  let mon = mondayOf(today()), n = weekDoneDays(mon) >= need ? 1 : 0;
  mon = shift(mon, -7);
  while (n < 500 && weekDoneDays(mon) >= need) { n++; mon = shift(mon, -7); }
  return n;
}

/* ---------- vista ---------- */
VIEWS.comida = () => {
  const body = { hoy: fToday, historial: fHistory, objetivos: fManager }[fui.tab]();
  const tabs = [['hoy', 'Hoy'], ['historial', 'Historial'], ['objetivos', 'Objetivos']];
  return `<h1 class="lt">Alimentación</h1>
  <div class="seg">${tabs.map(([k, l]) => `<button class="${fui.tab === k ? 'on' : ''}" data-action="fTab" data-t="${k}">${l}</button>`).join('')}</div>${body}`;
};
A.fTab = el => { fui.tab = el.dataset.t; window.scrollTo(0, 0); };

function goalCard(x) {
  const { g, v, rec, met } = x, bool = g.tracking_type === 'boolean';
  return `<div class="card pad goal ${met ? 'met' : ''}">
    <div class="gtop"><span class="gic">${svg(g.icon || 'dot', 22)}</span>
      <div class="gt"><b>${esc(v.title)}</b>${g.description ? `<span>${esc(g.description)}</span>` : ''}</div>
      <button class="x" data-action="fMenu" data-id="${g.id}" aria-label="Más opciones">⋯</button></div>
    <div class="gctl">
      <div class="gval"><b>${fmtN(rec)}</b><span>/ ${fmtN(v.target)} ${esc(v.unit)}</span>${met ? '<i>✓</i>' : ''}</div>
      <div class="gbtn">${bool
        ? `<button class="gb ${met ? 'on' : ''}" data-action="fToggle" data-id="${g.id}" aria-label="Marcar">✓</button>`
        : `<button class="gb" data-action="fDec" data-id="${g.id}" aria-label="Quitar">−</button><button class="gb on" data-action="fInc" data-id="${g.id}" aria-label="Añadir">+</button>`}</div>
    </div></div>`;
}

function fToday() {
  const st = foodStatus(cur), gs = activeGoalsOn(cur), pct = Math.round(st.pct * 100);
  const longRun = [cur, shift(cur, 1)].flatMap(sessionsOn).find(s => (s.type === 'long_easy' || s.type === 'goal_event') && !s.state);
  const msg = st.state === 'done' ? 'Todo hecho por hoy. Bien.' : st.state === 'not_configured' ? 'Añade un objetivo para empezar.' : st.completed ? 'Buen avance, sigue a tu ritmo.' : '';
  return `
  <div class="card pad">
    <div class="srow"><div><p class="eyebrow">Mis objetivos</p><div class="sname">${st.total ? `${st.completed} de ${st.total}` : 'Sin objetivos'}</div></div>
      <span class="tag" style="margin:0">${st.state === 'done' ? '✓ Hecho' : st.state === 'pending' ? 'Pendiente' : '–'}</span></div>
    <div class="bar"><i style="width:${pct}%"></i></div>
    <p class="note" style="margin:6px 0 0">${st.total ? `${pct} %` : ''}${msg ? (st.total ? ' · ' : '') + msg : ''}</p>
  </div>
  ${gs.map(goalCard).join('')}
  <button class="btn" data-action="fNew">+ Añadir objetivo</button>
  <button class="btn sec" data-action="fTab" data-t="objetivos">Gestionar objetivos</button>
  ${longRun ? `<h3 class="gh">Contexto de tirada larga</h3>
  <div class="card pad"><p class="eyebrow">Opcional · no cuenta en tus objetivos</p>
    <p class="desc" style="margin-top:0"><b>Antes:</b> una comida con hidratos que ya conozcas, 2–3 h antes. Nada nuevo el día de la tirada.</p>
    <p class="desc"><b>Durante</b> (si pasas de 60–90 min): 30–60 g de hidratos por hora y bebe según sed y calor. Practícalo antes del reto.</p>
    <p class="desc" style="margin-bottom:0"><b>Después:</b> hidratos, algo de proteína y líquidos.</p></div>` : ''}`;
}

function fHistory() {
  const t = today(), f = F();
  const start = shift(shift(t, -weekdayMon(t)), -28);
  const cells = Array.from({ length: 35 }, (_, i) => {
    const k = shift(start, i), st = foodStatus(k);
    const cls = k > t ? 'fut' : st.state === 'not_configured' ? 'nc' : st.done ? 'on' : st.completed ? 'half' : st.has ? 'rec' : '';
    return `<button class="hc ${cls} ${k === cur ? 'sel' : ''}" data-action="fDay" data-d="${k}"><span>${parse(k).getDate()}</span></button>`;
  }).join('');
  const days = Array.from({ length: 30 }, (_, i) => shift(t, i - 29));
  const stats = f.goals.map(g => {
    let active = 0, met = 0, total = 0; const series = [];
    days.forEach(k => {
      const v = gv(g.id, k);
      if (v && v.is_active && !v.is_archived) { active++; const r = recorded(k, g.id); total += r; if (r >= v.target) met++; series.push(r >= v.target ? 2 : r > 0 ? 1 : 0); } else series.push(-1);
    });
    return { g, active, met, total, series };
  }).filter(x => x.active > 0);
  const weekDone = weekDoneDays(mondayOf(t));
  const wk = f.streakMode === 'weeks';
  return `
  <div class="card pad">
    <div class="srow"><div><p class="eyebrow">Racha de alimentación</p><div class="big" style="font-size:48px">${wk ? foodWeekStreak() : foodDayStreak()}<small>${wk ? 'semanas' : 'días'}</small></div></div>
      <div class="chips" data-group="fmode" style="margin:0"><button class="chip ${wk ? '' : 'on'}" data-action="fMode" data-v="days">Días</button><button class="chip ${wk ? 'on' : ''}" data-action="fMode" data-v="weeks">Semanas</button></div></div>
    <div class="rowx"><div><b>Meta semanal</b><span class="note">${weekDone}/${f.weeklyGoalDays} días completos esta semana</span></div>
      <div class="gbtn"><button class="gb" data-action="fWeekGoal" data-d="-1" aria-label="Menos">−</button><button class="gb" data-action="fWeekGoal" data-d="1" aria-label="Más">+</button></div></div>
    <p class="note">Un día no completado no es un fracaso: solo es un día sin marcar.</p>
  </div>

  <h3 class="gh">Últimos 35 días</h3>
  <div class="card pad"><div class="hhead">${['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => `<span>${d}</span>`).join('')}</div><div class="hgrid">${cells}</div>
    <p class="note">Toca un día para revisarlo o corregirlo. Cada día usa los objetivos que tenías entonces.</p></div>

  <h3 class="gh">Por objetivo · 30 días</h3>
  <div class="card list">${stats.length ? stats.map(x => `<div class="row"><span class="gic">${svg(x.g.icon || 'dot', 20)}</span>
    <div class="t"><b>${esc(gv(x.g.id, t)?.title || x.g.title)}</b><span>${x.met}/${x.active} días cumplidos · total ${fmtN(x.total)}</span>
    <div class="mini">${x.series.slice(-14).map(s => `<i class="m${s}"></i>`).join('')}</div></div></div>`).join('') : '<div class="row empty">Aún no hay datos.</div>'}</div>`;
}
A.fDay = el => { cur = el.dataset.d; fui.tab = 'hoy'; window.scrollTo(0, 0); };
A.fMode = el => { F().streakMode = el.dataset.v; };
A.fWeekGoal = el => { const f = F(); f.weeklyGoalDays = Math.min(7, Math.max(1, f.weeklyGoalDays + Number(el.dataset.d))); };

function fManager() {
  const t = today(), gs = F().goals.slice().sort((a, b) => a.sort_order - b.sort_order);
  const rows = { act: [], paused: [], arch: [] };
  gs.forEach(g => {
    const v = gv(g.id, t);
    if (g.is_archived || (v && v.is_archived)) rows.arch.push(g);
    else if (v && v.is_active) rows.act.push({ g, v });
    else rows.paused.push({ g, v });
  });
  const row = (x, i, n, kind) => {
    const { g, v } = x;
    const sub = !v ? `Empieza el ${dshort(F().versions.filter(q => q.goal_id === g.id).map(q => q.effective_local_date).sort()[0])}` : `${fmtN(v.target)} ${esc(v.unit)} al día`;
    return `<div class="row"><span class="gic">${svg(g.icon || 'dot', 20)}</span><div class="t"><b>${esc(v ? v.title : g.title)}</b><span>${sub}</span></div>
      ${kind === 'act' ? `<div class="ord"><button data-action="fMove" data-id="${g.id}" data-d="-1" ${i === 0 ? 'disabled' : ''} aria-label="Subir">▲</button><button data-action="fMove" data-id="${g.id}" data-d="1" ${i === n - 1 ? 'disabled' : ''} aria-label="Bajar">▼</button></div>` : ''}
      <button class="x" data-action="fMenu" data-id="${g.id}" aria-label="Más opciones">⋯</button></div>`;
  };
  return `
  <p class="sub">Aquí decides qué hábitos cuentan cada día. Los cambios valen desde hoy y no tocan los días anteriores.</p>
  <h3 class="gh" style="margin-top:0">Activos · ${rows.act.length}</h3>
  <div class="card list">${rows.act.length ? rows.act.map((x, i) => row(x, i, rows.act.length, 'act')).join('') : '<div class="row empty">Sin objetivos activos. Home mostrará “Sin objetivos”.</div>'}</div>
  ${rows.paused.length ? `<h3 class="gh">Pausados</h3><div class="card list">${rows.paused.map((x, i) => row(x, i, 0, 'p')).join('')}</div>` : ''}
  ${rows.arch.length ? `<h3 class="gh">Archivados</h3><div class="card list">${rows.arch.map(g => `<div class="row"><span class="gic">${svg(g.icon || 'dot', 20)}</span><div class="t"><b>${esc(g.title)}</b><span>Historial conservado</span></div><button class="btn sec sm" data-action="fRestore" data-id="${g.id}">Restaurar</button></div>`).join('')}</div>` : ''}
  <button class="btn" data-action="fNew">+ Añadir objetivo</button>`;
}

/* ---------- editor ---------- */
A.fNew = () => { goalSheet(null); return false; };
function goalSheet(id) {
  const g = id ? goalById(id) : null, v = g ? gv(g.id, today()) || { title: g.title, unit: g.unit, target: g.target } : null;
  const unit = v?.unit || 'veces', known = FUNITS.includes(unit) && unit !== 'otra';
  openSheet(`<div id="goalForm" data-id="${g?.id || ''}">
    <h2 class="sh">${g ? 'Editar objetivo' : 'Nuevo objetivo'}</h2>
    <label class="lbl">Nombre</label><div class="field"><input type="text" id="gTitle" value="${esc(v?.title || '')}" placeholder="Ej. Legumbres" autocomplete="off"></div>
    <label class="lbl">Descripción (opcional)</label><div class="field"><input type="text" id="gDesc" value="${esc(g?.description || '')}" placeholder="Para qué lo haces"></div>
    <label class="lbl">Icono</label>
    <div class="chips" data-group="gIcon">${FICONS.map(i => `<button class="chip ic ${(g?.icon || 'dot') === i ? 'on' : ''}" data-action="pick" data-v="${i}" aria-label="${i}">${svg(i, 20)}</button>`).join('')}</div>
    <label class="lbl">Tipo de registro</label>
    <div class="chips" data-group="gType"><button class="chip ${g?.tracking_type === 'boolean' ? '' : 'on'}" data-action="pick" data-v="count">Contador + / −</button><button class="chip ${g?.tracking_type === 'boolean' ? 'on' : ''}" data-action="pick" data-v="boolean">Sí / No</button></div>
    <div class="two"><div><label class="lbl">Meta diaria</label><div class="field"><input type="number" step="any" id="gTarget" inputmode="decimal" value="${v?.target ?? 1}"></div></div>
    <div><label class="lbl">Paso por toque</label><div class="field"><input type="number" step="any" id="gStep" inputmode="decimal" value="${g?.increment ?? ''}" placeholder="1 (250 para ml)"></div></div></div>
    <label class="lbl">Unidad</label>
    <div class="chips" data-group="gUnit">${FUNITS.map(u => `<button class="chip ${(known ? unit : 'otra') === u ? 'on' : ''}" data-action="pick" data-v="${u}">${u}</button>`).join('')}</div>
    <div class="field"><input type="text" id="gUnitOther" value="${known ? '' : esc(unit)}" placeholder="Otra unidad (si eliges “otra”)"></div>
    <label class="lbl">Aplicar desde</label>
    <div class="chips" data-group="gFrom"><button class="chip on" data-action="pick" data-v="today">Hoy</button><button class="chip" data-action="pick" data-v="tomorrow">Mañana</button></div>
    <p class="note">Los días anteriores no cambian y lo ya registrado hoy se conserva.</p>
    <button class="btn" data-action="fSave">Guardar objetivo</button></div>`);
}
A.fSave = () => {
  const f = F(), id = $('#goalForm').dataset.id, title = val('gTitle');
  if (!title) { toast('Escribe un nombre'); return false; }
  const type = groupVal('gType') || 'count';
  const target = type === 'boolean' ? 1 : num(val('gTarget'));
  if (!(target > 0)) { toast('La meta debe ser mayor que 0'); return false; }
  let unit = groupVal('gUnit') || 'veces';
  if (unit === 'otra') unit = val('gUnitOther') || 'otra';
  const step = type === 'boolean' ? 1 : (num(val('gStep')) > 0 ? num(val('gStep')) : unit === 'ml' ? 250 : 1);
  const from = groupVal('gFrom') === 'tomorrow' ? shift(today(), 1) : today();
  let g = id ? goalById(id) : null;
  if (!g) {
    g = { id: 'g_' + uid(), title, description: '', icon: 'dot', unit, target, tracking_type: type, increment: step, is_active: true, is_archived: false, editable: true, sort_order: Math.max(-1, ...f.goals.map(x => x.sort_order)) + 1, created_at: nowIso(), updated_at: nowIso() };
    f.goals.push(g);
  }
  Object.assign(g, { title, description: val('gDesc'), icon: groupVal('gIcon') || 'dot', unit, target, tracking_type: type, increment: step });
  pushVersion(g, { title, unit, target, is_active: g.is_active, is_archived: false }, from);
  closeSheet(); toast(from > today() ? 'Guardado: empieza mañana' : 'Objetivo guardado');
};

/* ---------- registro y gestión ---------- */
const canLog = () => { if (cur > today()) { toast('No puedes registrar días futuros'); return false; } return true; };
function addEntry(g, q) {
  F().entries.push({ id: uid(), goal_id: g.id, quantity: q, local_date: cur, timezone: S.settings.tz, logged_at_utc: nowIso(), updated_at: nowIso(), deleted_at: null, note: '', meal_key: '' });
}
function removeLast(g) {
  const es = entriesOn(cur, g.id).sort((a, b) => (a.logged_at_utc < b.logged_at_utc ? 1 : -1));
  if (!es.length) return false;
  es[0].deleted_at = nowIso(); es[0].updated_at = nowIso();
  return true;
}
A.fInc = el => { if (!canLog()) return false; const g = goalById(el.dataset.id); addEntry(g, g.increment || 1); };
A.fDec = el => { if (!canLog()) return false; if (!removeLast(goalById(el.dataset.id))) return false; };
A.fToggle = el => {
  if (!canLog()) return false;
  const g = goalById(el.dataset.id);
  if (recorded(cur, g.id) >= 1) entriesOn(cur, g.id).forEach(e => { e.deleted_at = nowIso(); e.updated_at = nowIso(); });
  else addEntry(g, 1);
};
A.fMenu = el => {
  const g = goalById(el.dataset.id), t = today(), v = gv(g.id, t), paused = !(v && v.is_active);
  openSheet(`<h2 class="sh">${esc(v?.title || g.title)}</h2>
    <div class="actions">
      <button class="btn sec" data-action="fEditBtn" data-id="${g.id}">Editar</button>
      <button class="btn sec" data-action="fPause" data-id="${g.id}">${paused ? 'Reanudar' : 'Pausar'}</button>
      <button class="btn danger" data-action="fArchive" data-id="${g.id}">Eliminar objetivo</button>
    </div>
    <p class="note">Pausar o eliminar no borra el historial. Solo deja de contar desde hoy.</p>`);
  return false;
};
A.fEditBtn = el => { goalSheet(el.dataset.id); return false; };
A.fPause = el => {
  const g = goalById(el.dataset.id), v = gv(g.id, today()), activate = !(v && v.is_active);
  g.is_active = activate;
  pushVersion(g, { is_active: activate, is_archived: false });
  closeSheet(); toast(activate ? 'Objetivo reanudado' : 'Objetivo en pausa');
};
A.fArchive = el => {
  if (!confirm('¿Eliminar este objetivo? Se conserva su historial.')) return false;
  const g = goalById(el.dataset.id);
  g.is_archived = true; g.is_active = false;
  pushVersion(g, { is_active: false, is_archived: true });
  closeSheet(); toast('Objetivo eliminado');
};
A.fRestore = el => {
  const g = goalById(el.dataset.id);
  g.is_archived = false; g.is_active = true;
  pushVersion(g, { is_active: true, is_archived: false });
  toast('Objetivo restaurado');
};
A.fMove = el => {
  const t = today(), act = F().goals.filter(g => { const v = gv(g.id, t); return v && v.is_active && !v.is_archived; }).sort((a, b) => a.sort_order - b.sort_order);
  const i = act.findIndex(g => g.id === el.dataset.id), j = i + Number(el.dataset.d);
  if (i < 0 || j < 0 || j >= act.length) return false;
  [act[i].sort_order, act[j].sort_order] = [act[j].sort_order, act[i].sort_order];
};
