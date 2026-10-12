/* sportui.js — pantalla de Deporte: resumen, plan, registro, progreso, coach */
const ui = { sportTab: 'resumen', openWeeks: null };
const PAIN_LOC = ['Ninguna', 'Pie', 'Tobillo', 'Gemelo', 'Espinilla', 'Rodilla', 'Cadera', 'Espalda', 'Otra'];
const STATE_LABEL = { done: 'Completada', rest: 'Descanso / adaptada', missed: 'No realizada' };
const PHASES_ES = { Adaptación: 'Adaptación', Descarga: 'Descarga' };

/* ---------- piezas ---------- */
const alertHTML = a => `<div class="alert"><b>!</b><span>${esc(a.text)}</span></div>`;
const scale5 = (g, v) => `<div class="scale" data-group="${g}">${[1, 2, 3, 4, 5].map(n => `<button class="${n == v ? 'on' : ''}" data-action="pick" data-v="${n}">${n}</button>`).join('')}</div>`;
const stateIcon = s => (s.state === 'done' ? '✓' : s.state === 'rest' ? '☾' : s.state === 'missed' || s.late ? '–' : '');
const stLabel = s => STATE_LABEL[s.state] || (s.late ? 'No realizada' : '');

function sportTabs() {
  const t = [['resumen', 'Resumen'], ['plan', 'Plan'], ['registro', 'Registro'], ['progreso', 'Progreso']];
  return `<div class="seg">${t.map(([k, l]) => `<button class="${ui.sportTab === k ? 'on' : ''}" data-action="sportTab" data-t="${k}">${l}</button>`).join('')}</div>`;
}
VIEWS.deporte = () => {
  const body = { resumen: sResumen, plan: sPlan, registro: sRegistro, progreso: sProgreso }[ui.sportTab]();
  return `<h1 class="lt">Deporte</h1>${sportTabs()}${body}`;
};
A.sportTab = el => { ui.sportTab = el.dataset.t; window.scrollTo(0, 0); };

function sessionCard(s) {
  const T = TYPES[s.type], al = alertsFor(s);
  const thu = s.day === 'thu' && THU[s.week] ? `<p class="detail">${THU[s.week]}</p>` : '';
  return `<div class="card pad sess">
    <div class="srow"><div><p class="eyebrow">${s.dayName} ${dshort(s.date)}${s.mandatory ? '' : ' · opcional'}${s.conditional ? ' · condicional' : ''}</p><div class="sname">${T.name}</div></div>
    <div class="skm">${fmtKm(s.km)}<small>km</small></div></div>
    ${s.why.length && s.km !== s.baseKm ? `<p class="note" style="margin:6px 0 0">Plan base ${fmtKm(s.baseKm)} km · ${s.why.join(' + ')}</p>` : ''}
    ${s.state ? `<p class="tag">${stateIcon(s)} ${STATE_LABEL[s.state]}${(() => { const l = R().log.filter(x => x.session_key === s.key)[0]; return l ? ` · hiciste ${fmtKm(l.actual_km)} km` : ''; })()}</p>` : `${s.late ? '<p class="tag">– No realizada: pasó la fecha sin registrar el entreno</p>' : ''}<p class="desc">${T.desc}</p>${thu}`}
    ${al.map(alertHTML).join('')}
    <div class="btns">
      ${s.state ? '' : `<button class="btn" data-action="openLog" data-key="${s.key}">Completar</button>`}
      <button class="btn sec" data-action="openSession" data-key="${s.key}">${s.state ? 'Detalles' : 'Opciones'}</button>
    </div></div>`;
}

/* ---------- RESUMEN ---------- */
function sResumen() {
  const t = today(), idx = wkIdx(t);
  const wk = wkObj(Math.min(16, Math.max(1, idx + 1)));
  const dleft = daysBetween(t, PLAN.goal), mk = maxKmEver(), se = stretchEval();
  const stretchTxt = se.state === 'calibrar' ? 'Pendiente de calibrar' : se.state === 'listo' ? 'Desbloqueado: puedes intentarlo' : `En camino · ${se.missing} condiciones por cumplir`;
  const pct = Math.min(100, (mk / PLAN.primaryKm) * 100);
  const ss = sessionsOn(cur);
  const next = nextSession();
  const wkSess = sessionsOfWeek(wk).filter(s => !s.dropped);
  const planKm = weekPlanKm(wk), actKm = weekActualKm(wk), wkStart = weekStart(wk.w), wkEnd = weekEnd(wk.w);
  const gate = PLAN.gates.includes(wk.w) && idx >= 0 && idx <= 15;

  return `
  ${R().baseline ? '' : `<div class="card pad calib"><p class="eyebrow">Plan pendiente de calibrar</p><p class="desc">Cuéntanos tu volumen real de las últimas semanas. Sin esto, el plan es provisional y no se declara apto para 25,5 km.</p><button class="btn" data-action="openCalib">Calibrar mi plan</button></div>`}

  <div class="card pad hero">
    <p class="eyebrow">Mi reto 25,5K</p>
    <div class="big">21,1<small>km · objetivo principal</small></div>
    <p class="sub2">${dleft > 0 ? `${dleft} días para el 31 de enero` : dleft === 0 ? 'Hoy es el día' : 'Reto finalizado'}${idx < 0 ? ` · el plan empieza en ${daysBetween(t, PLAN.start)} ${daysBetween(t, PLAN.start) === 1 ? 'día' : 'días'}` : ''}</p>
    <div class="bar"><i style="width:${pct}%"></i></div>
    <div class="stat3">
      <div><b>${fmtKm(mk)}</b><span>km máx.</span></div>
      <div><b>${fmtKm(actKm)}<small>/${fmtKm(planKm)}</small></b><span>km semana</span></div>
      <div><b>${weekStreak()}</b><span>sem. racha</span></div>
    </div>
    <div class="stretch"><span>Reto 25,5 km</span><b>${stretchTxt}</b></div>
  </div>

  <h3 class="gh">${cur === t ? 'Hoy' : dlong(cur)}</h3>
  ${ss.length ? ss.map(sessionCard).join('') : `<div class="card pad"><div class="restc"><span class="moon">☾</span><div><b>${cur < PLAN.start ? 'Antes del plan' : 'Día de descanso'}</b><p class="note" style="margin:2px 0 0">${cur < PLAN.start ? `El plan empieza el lunes ${dshort(PLAN.start)}.` : 'Descansar cuenta como cumplido.'}</p></div></div>
    ${next ? `<p class="note">Próxima sesión: ${TYPES[next.type].name} · ${next.dayName} ${dshort(next.date)} · ${fmtKm(next.km)} km</p>` : ''}</div>`}

  <h3 class="gh">Semana ${wk.w} · ${wk.phase}</h3>
  <div class="card pad">
    <div class="wdots">${wkSess.slice().sort((a, b) => (a.date < b.date ? -1 : 1)).map(s => `<button class="wd ${s.state ? 'on' : ''} ${s.late ? 'late' : ''}" data-action="openSession" data-key="${s.key}"><i>${stateIcon(s) || ''}</i>${s.short}${s.date !== s.baseDate ? ' ↪' : ''}<small>${s.date < wkStart || s.date > wkEnd ? dshort(s.date) + ' · ' : ''}${fmtKm(s.km)}</small></button>`).join('')}</div>
    <p class="note" style="margin-top:12px">${wk.note}</p>
    ${R().weekScale[wk.w] || R().weekFlags[wk.w] ? `<p class="note">Hay un ajuste del coach en esta semana. <button class="inl" data-action="clearWeekAdj" data-w="${wk.w}">Quitar ajuste</button></p>` : ''}
    ${R().scale < 0.995 ? `<p class="note">Distancias al ${Math.round(R().scale * 100)} % por la calibración. <button class="inl" data-action="openCalib">Cambiar</button></p>` : ''}
  </div>

  ${gate ? `<h3 class="gh">Puerta de control · semana ${wk.w}</h3><div class="card list">${gateItems(wk.w).map(i => `<div class="row"><div class="t"><b>${i.label}</b></div><span class="v">${i.ok === true ? '✓' : i.ok === false ? '✗' : '–'}</span></div>`).join('')}</div>
    <p class="note">${wk.w === 14 ? 'Los 23,5 km del domingo y el reto de 25,5 km solo se desbloquean si se cumple todo. Si no, 21,1 km o menos.' : 'Revisa cómo te sientes antes de seguir subiendo carga.'}</p>` : ''}

  ${R().baseline ? `<button class="link" data-action="openCalib">Recalibrar plan</button>` : ''}
  <p class="foot">Si notas dolor agudo, que empeora, cojera o mareo, para. Si el dolor dura más de 24–48 h, consulta a un profesional. La app no diagnostica.</p>`;
}

/* ---------- PLAN ---------- */
function sPlan() {
  if (!ui.openWeeks) ui.openWeeks = new Set([Math.min(16, Math.max(1, wkIdx(today()) + 1))]);
  const lab = { complete: 'Completa', active: 'En curso', missed: 'Incompleta', future: '' };
  const h = R().history.slice(0, 12);
  return `<p class="sub">16 semanas hacia el 31 de enero. Es una propuesta revisable: toca una sesión para completarla, moverla o adaptarla.</p>
  ${PLAN.weeks.map(wk => {
    const ss = sessionsOfWeek(wk).filter(s => !s.dropped).sort((x, y) => (x.date < y.date ? -1 : 1)), st = weekStatus(wk), open = ui.openWeeks.has(wk.w);
    return `<div class="card wk ${st === 'active' ? 'cur' : ''}">
      <button class="wkh" data-action="toggleWeek" data-w="${wk.w}"><div><b>Semana ${wk.w}</b><span>${wk.phase} · ${dshort(weekStart(wk.w))} – ${dshort(weekEnd(wk.w))}</span></div>
        <div class="r"><em>${lab[st]}</em><b>${fmtKm(weekPlanKm(wk))} km</b></div></button>
      ${open ? `<div class="list">${ss.map(s => `<button class="row" data-action="openSession" data-key="${s.key}">
        <div class="t"><b>${s.short} ${dshort(s.date)}${s.date !== s.baseDate ? ' ↪' : ''} · ${TYPES[s.type].name}</b><span>${s.mandatory ? '' : 'Opcional · '}${s.conditional ? 'Condicional · ' : ''}${s.adapted && s.km !== s.baseKm ? `plan ${fmtKm(s.baseKm)} km` : ''}</span></div>
        <span class="v">${fmtKm(s.km)} km</span><span class="si">${stateIcon(s)}</span></button>`).join('')}
        <div class="row"><div class="t"><span>${wk.note}</span></div></div></div>` : ''}
    </div>`;
  }).join('')}
  <h3 class="gh">Historial de cambios</h3>
  <div class="card list">${h.length ? h.map(x => `<div class="row"><div class="t"><b>${x.action}</b><span>Sem. ${x.key.split('-')[0]} · ${DAYS.find(d => d.key === x.key.split('-')[1])?.name || ''}${x.detail ? ' · ' + esc(x.detail) : ''}</span></div><span class="v">${new Date(x.ts).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span></div>`).join('') : '<div class="row empty">Aún no hay cambios.</div>'}</div>`;
}
A.toggleWeek = el => { const w = +el.dataset.w; ui.openWeeks.has(w) ? ui.openWeeks.delete(w) : ui.openWeeks.add(w); };

/* ---------- REGISTRO ---------- */
function sRegistro() {
  const l = runLog().reverse();
  return `<button class="btn" data-action="openLog" data-key="">+ Registrar entreno</button>
  <h3 class="gh">Historial · ${l.length} ${l.length === 1 ? 'salida' : 'salidas'}</h3>
  <div class="card list">${l.length ? l.map(e => `<button class="row" data-action="editLog" data-id="${e.id}">
    <div class="t"><b>${fmtKm(e.actual_km)} km · ${fmtPace(e.avg_pace_seconds_per_km)} /km</b><span>${dshort(e.date_local)} · ${TYPES[e.session_type]?.name || 'Libre'} · RPE ${e.rpe_0_10}${e.pain_0_10 ? ` · dolor ${e.pain_0_10}` : ''}</span></div>
    <span class="v">${fmtTime(e.moving_seconds)}</span></button>`).join('') : '<div class="row empty">Aún no hay entrenos. Registra el primero cuando salgas a correr.</div>'}</div>`;
}

function logSheet(id, key) {
  const e = id ? R().log.find(l => l.id === id) : null;
  const s = (key ? findSession(key) : e?.session_key ? findSession(e.session_key) : null) || null;
  const v = e || {
    date_local: s ? (s.date > today() ? today() : s.date) : cur, session_type: s ? s.type : 'easy', planned_km: s ? s.km : 0,
    actual_km: '', moving_seconds: '', rpe_0_10: 4, pain_0_10: 0, pain_location: 'Ninguna', fatigue_1_5: 3,
    session_completed: true, notes: '', nutrition_tested: false,
  };
  openSheet(`
  <div id="logForm" data-id="${e?.id || ''}" data-key="${s?.key || ''}" data-planned="${v.planned_km || 0}">
    <h2 class="sh">${e ? 'Editar entreno' : 'Registrar entreno'}</h2>
    ${v.planned_km ? `<p class="sub">Plan: ${fmtKm(v.planned_km)} km</p>` : ''}
    <label class="lbl">Fecha</label><div class="field"><input type="date" id="fDate" value="${v.date_local}"></div>
    <div class="two">
      <div><label class="lbl">Distancia (km)</label><div class="field"><input type="number" step="0.01" id="fKm" inputmode="decimal" value="${v.actual_km}" placeholder="0,0" data-live="pace"></div></div>
      <div><label class="lbl">Tiempo (mm:ss o h:mm:ss)</label><div class="field"><input type="text" id="fTime" inputmode="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done" value="${v.moving_seconds ? fmtTime(v.moving_seconds) : ''}" placeholder="52:30" data-live="pace"></div></div>
    </div>
    <p class="pace" id="fPace">${v.avg_pace_seconds_per_km ? fmtPace(v.avg_pace_seconds_per_km) + ' min/km' : 'Ritmo: –'}</p>
    <h3 class="gh" style="margin-left:0">¿Cómo te has sentido?</h3>
    <label class="lbl">Esfuerzo (RPE) <b id="vRpe">${v.rpe_0_10}</b>/10</label>
    <input type="range" min="0" max="10" id="fRpe" value="${v.rpe_0_10}" data-live="out" data-out="vRpe">
    <label class="lbl">Dolor <b id="vPain">${v.pain_0_10}</b>/10</label>
    <input type="range" min="0" max="10" id="fPain" value="${v.pain_0_10}" data-live="out" data-out="vPain">
    <label class="lbl">Dónde</label>
    <div class="chips" data-group="fLoc">${PAIN_LOC.map(p => `<button class="chip ${p === v.pain_location ? 'on' : ''}" data-action="pick" data-v="${p}">${p}</button>`).join('')}</div>
    <label class="lbl">Fatiga (1 baja – 5 alta)</label>${scale5('fFat', v.fatigue_1_5)}
    <label class="lbl">Notas</label><textarea id="fNotes" style="min-height:100px" placeholder="Sensaciones, clima, ruta…">${esc(v.notes)}</textarea>
    <button class="btn" data-action="saveLog">Guardar</button>
    ${e ? '<button class="btn danger" data-action="delLog">Borrar entreno</button>' : ''}
  </div>`);
}
A.openLog = el => { logSheet(null, el.dataset.key); return false; };
A.editLog = el => { logSheet(el.dataset.id, null); return false; };
LIVE.out = t => { $('#' + t.dataset.out).textContent = t.value; };
LIVE.pace = () => {
  const km = num(val('fKm')), sec = parseTime(val('fTime'));
  $('#fPace').textContent = km > 0 && sec > 0 ? `${fmtPace(sec / km)} min/km` : 'Ritmo: –';
};

A.saveLog = () => {
  const f = $('#logForm'), km = num(val('fKm')), sec = parseTime(val('fTime'));
  if (!(km > 0) || !(sec > 0)) { toast('Introduce distancia y tiempo'); return false; }
  const old = f.dataset.id ? R().log.find(l => l.id === f.dataset.id) : null;
  const date = val('fDate') || cur;
  const asked = f.dataset.key;
  const key = asked || old?.session_key || '';
  const e = {
    id: old?.id || uid(), date_local: date, session_type: old?.session_type || (key && findSession(key) ? findSession(key).type : 'other'), session_key: key,
    planned_km: Number(f.dataset.planned) || old?.planned_km || 0, actual_km: Math.round(km * 100) / 100, moving_seconds: Math.round(sec),
    avg_pace_seconds_per_km: Math.round(sec / km), rpe_0_10: +val('fRpe'), pain_0_10: +val('fPain'), pain_location: groupVal('fLoc') || 'Ninguna',
    fatigue_1_5: +groupVal('fFat'), sleep_1_5: old?.sleep_1_5 ?? null, energy_1_5: old?.energy_1_5 ?? null,
    session_completed: true, notes: val('fNotes'), import_source: old?.import_source || 'manual',
    nutrition_tested: old?.nutrition_tested || false,
  };
  if (old) R().log[R().log.indexOf(old)] = e; else R().log.push(e);
  syncLinks();
  closeSheet();
  const fresh = newBadges();
  const msgs = [];
  if (asked && e.session_key !== asked) { const s0 = findSession(asked); msgs.push(`Este entreno no está en la fecha de la sesión programada (${s0.dayName} ${dshort(s0.date)}), así que esa sesión sigue pendiente. Regístralo el día en que está programada o muévela desde Opciones.`); }
  if (e.rpe_0_10 >= 9) msgs.push('Esfuerzo muy alto para un rodaje. La próxima, más lento.');
  if (e.planned_km && e.actual_km < e.planned_km * 0.9) msgs.push(`Has corrido ${fmtKm(e.actual_km)} de ${fmtKm(e.planned_km)} km. Cuenta como sesión cumplida; los km que faltan no se recuperan.`);
  resultSheet(e, fresh, msgs);
};
function resultSheet(e, fresh, msgs) {
  openSheet(`<div class="center">
    <div class="check">✓</div><h2 class="sh">Entreno guardado</h2>
    <div class="stat3"><div><b>${fmtKm(e.actual_km)}</b><span>km</span></div><div><b>${fmtPace(e.avg_pace_seconds_per_km)}</b><span>min/km</span></div><div><b>${fmtTime(e.moving_seconds)}</b><span>tiempo</span></div></div>
    ${msgs.map(m => alertHTML({ text: m })).join('')}
    ${adviceHTML()}
    ${fresh.length ? `<h3 class="gh">Nuevos logros</h3>${fresh.map(b => `<div class="card pad bdg"><b>★ ${b.name}</b><span>${b.desc}</span></div>`).join('')}` : ''}
    ${advice().level === 'ok' ? '<button class="btn" data-action="closeSheet">Listo</button>' : '<button class="btn" data-action="applyAdvice">Aprobar cambios</button><button class="btn sec" data-action="closeSheet">Mantener el plan</button>'}</div>`);
}
function adviceHTML() {
  const a = advice();
  const title = a.level === 'ok' ? 'Sigue el plan' : a.level === 'ease' ? 'Baja un poco la carga' : 'Descansa';
  const changes = a.rest ? 'Marcar las sesiones pendientes de esta semana como descanso'
    : [a.factor < 1 ? `Reducir distancias al ${Math.round(a.factor * 100)} %` : '', a.quality ? 'Jueves sin calidad (todo fácil)' : '', a.dropFri ? 'Quitar la salida opcional del viernes' : ''].filter(Boolean).join(' · ');
  return `<h3 class="gh" style="text-align:left">Coach · semana ${a.target}</h3>
    <div class="card pad" style="text-align:left;box-shadow:none;background:var(--card)"><b>${title}</b>
    ${a.reasons.map(r => `<p class="reason">• ${esc(r)}</p>`).join('')}
    ${a.level !== 'ok' && changes ? `<p class="note"><b>Propuesta:</b> ${changes}</p>` : ''}</div>`;
}
A.delLog = () => {
  const id = $('#logForm').dataset.id, e = R().log.find(l => l.id === id);
  if (!e || !confirm('¿Borrar este entreno?')) return false;
  R().log = R().log.filter(l => l.id !== id);
  if (e.session_key && !R().log.some(l => l.session_key === e.session_key)) {
    const st = R().sessions[e.session_key];
    if (st && (st.state === 'done' || st.state === 'rest')) setState(e.session_key, null, 'Entreno borrado');
  }
  closeSheet(); toast('Entreno borrado');
};

/* ---------- SESIÓN (opciones) ---------- */
A.openSession = el => { sessionSheet(el.dataset.key); return false; };
function sessionSheet(key) {
  const s = findSession(key), T = TYPES[s.type], al = alertsFor(s);
  const hs = R().history.filter(x => x.key === key).slice(0, 4);
  const thu = s.day === 'thu' && THU[s.week] ? `<p class="detail">${THU[s.week]}</p>` : '';
  const sugg = al.filter(a => a.suggest);
  openSheet(`
    <p class="eyebrow">Semana ${s.week} · ${s.dayName} ${dshort(s.date)}</p>
    <h2 class="sh">${T.name}</h2>
    <div class="big">${fmtKm(s.km)}<small>km${s.km !== s.baseKm ? ` · plan ${fmtKm(s.baseKm)}` : ''}</small></div>
    <p class="tags">${s.mandatory ? 'Imprescindible' : 'Opcional'}${s.conditional ? ' · Condicional' : ''}${stLabel(s) ? ' · ' + stLabel(s) : ''}</p>
    <p class="desc">${T.desc}</p>${thu}
    ${al.map(alertHTML).join('')}
    <div class="actions">
      ${s.state ? `<button class="btn sec" data-action="setState" data-key="${key}" data-st="null">Deshacer estado</button>` : `
        <button class="btn" data-action="openLog" data-key="${key}">Completar y registrar</button>
        ${sugg.map(a => `<button class="btn sec" data-action="adaptKm" data-key="${key}" data-km="${a.suggest}">Aplicar sugerencia: ${fmtKm(a.suggest)} km</button>`).join('')}
        <div class="mv"><input type="date" id="mvDate" value="${shift(s.date, 1)}"><button class="btn sec sm" data-action="moveSession" data-key="${key}">Mover</button></div>
        <button class="btn sec" data-action="setState" data-key="${key}" data-st="missed">No pude hacerla</button>`}
      ${s.adapted && (R().sessions[key]?.km != null || R().sessions[key]?.moveTo) ? `<button class="link" data-action="restoreKm" data-key="${key}">Restaurar distancia y fecha del plan</button>` : ''}
    </div>
    <p class="note">Si llega el día y no registras el entreno, la sesión cuenta como no realizada. Los kilómetros no se redistribuyen.</p>
    ${hs.length ? `<h3 class="gh">Cambios</h3>${hs.map(x => `<p class="note" style="margin:2px 0">${x.action}${x.detail ? ' · ' + esc(x.detail) : ''} · ${new Date(x.ts).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</p>`).join('')}` : ''}`);
}

/* ---------- PROGRESO ---------- */
function polyChart(vals, { min, max, fmt, ref, W = 320, H = 120 }) {
  const pad = 22, n = vals.length;
  const x = i => pad + (n === 1 ? (W - 2 * pad) / 2 : (i * (W - 2 * pad)) / (n - 1));
  const y = v => H - 18 - ((v - min) / (max - min || 1)) * (H - 36);
  const pts = vals.map((v, i) => [x(i), y(v)]);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">
    ${ref ? `<line x1="${pad}" x2="${W - pad}" y1="${y(ref.v)}" y2="${y(ref.v)}" class="cd"/><text x="${W - pad}" y="${y(ref.v) - 4}" text-anchor="end">${ref.t}</text>` : ''}
    <polyline points="${pts.map(p => p.join(',')).join(' ')}" class="cl"/>
    ${pts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="3.2" class="cc"/>`).join('')}
    <text x="${pad}" y="${H - 3}">${fmt(vals[0])}</text><text x="${W - pad}" y="${H - 3}" text-anchor="end">${fmt(vals[n - 1])}</text></svg>`;
}
function sProgreso() {
  const logs = runLog();
  const weeks = PLAN.weeks;
  const plans = weeks.map(w => weekPlanKm(w, true)), acts = weeks.map(weekActualKm);
  const maxK = Math.max(10, ...plans, ...acts);
  const W = 320, H = 130, pad = 16, bw = (W - 2 * pad) / 16;
  const bars = weeks.map((w, i) => {
    const h1 = (plans[i] / maxK) * (H - 30), h2 = (acts[i] / maxK) * (H - 30), x = pad + i * bw;
    return `<rect x="${x + 2}" y="${H - 16 - h1}" width="${bw - 4}" height="${h1}" class="cp"/>${acts[i] ? `<rect x="${x + 5}" y="${H - 16 - h2}" width="${bw - 10}" height="${h2}" class="ca"/>` : ''}<text x="${x + bw / 2}" y="${H - 4}" text-anchor="middle">${w.w}</text>`;
  }).join('');
  const longW = weeks.map(w => Math.max(0, ...R().log.filter(l => l.date_local >= weekStart(w.w) && l.date_local <= weekEnd(w.w)).map(l => l.actual_km))).filter(v => v > 0);
  const pace = logs.filter(l => l.avg_pace_seconds_per_km).map(l => l.avg_pace_seconds_per_km);
  const recs = [[5, '5 K'], [10, '10 K'], [PLAN.primaryKm, '21,1 K']].map(([k, n]) => ({ n, b: bestFor(k) }));
  const b10 = bestFor(10);
  const bd = badgeList();
  return `
  <h3 class="gh">Kilómetros por semana</h3>
  <div class="card pad"><svg class="chart" viewBox="0 0 ${W} ${H}">${bars}</svg><p class="note">Contorno: plan · Relleno: real</p></div>

  <h3 class="gh">Tirada más larga</h3>
  <div class="card pad">${longW.length ? polyChart(longW, { min: 0, max: Math.max(23, ...longW), fmt: v => fmtKm(v) + ' km', ref: { v: PLAN.primaryKm, t: '21,1' } }) : '<p class="note" style="margin:0">Aparecerá cuando registres tus primeras tiradas.</p>'}</div>

  <h3 class="gh">Ritmo medio por salida</h3>
  <div class="card pad">${pace.length > 1 ? polyChart(pace, { min: Math.min(...pace) - 10, max: Math.max(...pace) + 10, fmt: fmtPace }) + '<p class="note">No es una clasificación: el ritmo depende del esfuerzo de cada salida.</p>' : '<p class="note" style="margin:0">Necesitas al menos 2 salidas.</p>'}</div>

  <h3 class="gh">Marcas personales</h3>
  <div class="card list">${recs.map(r => `<div class="row"><div class="t"><b>${r.n}</b><span>${r.b ? dshort(r.b.date) + ' · estimado desde tus salidas' : 'Sin marca todavía'}</span></div><span class="v">${r.b ? fmtTime(r.b.time) : '–'}</span></div>`).join('')}
    <div class="row"><div class="t"><b>Bonus · 10 K a 6:30</b><span>${b10 ? `Mejor ritmo en 10 K: ${fmtPace(b10.pace)}` : 'Sin 10 K registrado'}. Sin acelerar el volumen por esto.</span></div><span class="v">${b10 && b10.pace <= 390 ? '✓' : '6:30'}</span></div></div>

  <h3 class="gh">Logros · ${bd.filter(b => b.ok).length}/${bd.length}</h3>
  <div class="badges">${bd.map(b => `<div class="badge ${b.ok ? 'on' : ''}"><i>${b.ok ? '★' : '○'}</i><b>${b.name}</b><span>${b.desc}</span></div>`).join('')}</div>`;
}

/* ---------- COACH (tras cada entreno) ---------- */
A.applyAdvice = () => {
  const a = advice(), wk = wkObj(a.target);
  if (a.rest) {
    sessionsOfWeek(wk).filter(s => !s.state && s.date >= today()).forEach(s => setState(s.key, 'rest', 'Aprobado por el coach'));
  } else {
    if (a.factor < 1) R().weekScale[a.target] = Math.min(R().weekScale[a.target] ?? 1, a.factor);
    R().weekFlags[a.target] = { noQuality: a.quality || R().weekFlags[a.target]?.noQuality, dropFri: a.dropFri || R().weekFlags[a.target]?.dropFri };
    hist(`${a.target}-sun`, 'Ajuste del coach', a.reasons[0]);
  }
  closeSheet(); toast('Cambios aplicados');
};

/* ---------- CALIBRACIÓN ---------- */
A.openCalib = () => {
  const b = R().baseline;
  openSheet(`<h2 class="sh">Calibrar el plan</h2><p class="sub">Ajusta las distancias a lo que realmente corres. No inventamos datos: dinos los tuyos.</p>
    <label class="lbl">Km corridos por semana (media de las últimas 2–4 semanas)</label><div class="field"><input type="number" id="calKm" inputmode="decimal" value="${b?.weeklyKm ?? ''}" placeholder="p. ej. 12" data-live="calc"></div>
    <label class="lbl">Salidas por semana</label><div class="field"><input type="number" id="calSess" inputmode="numeric" value="${b?.sessionsPerWeek ?? 2}"></div>
    <label class="lbl">Tirada más larga de los últimos 30 días (km)</label><div class="field"><input type="number" id="calLong" inputmode="decimal" value="${b?.longestKm ?? 9}" data-live="calc"></div>
    <label class="lbl">Historial de dolor o lesiones</label>
    <div class="chips" data-group="calPain">${[['none', 'Ninguno'], ['past', 'Molestias pasadas'], ['recent', 'Lesión reciente'], ['unknown', 'No lo sé']].map(([v, l]) => `<button class="chip ${(b?.pain || 'unknown') === v ? 'on' : ''}" data-action="pick" data-v="${v}">${l}</button>`).join('')}</div>
    <label class="lbl">Escala del plan (%) <span class="note" id="calHint"></span></label><div class="field"><input type="number" id="calPct" inputmode="numeric" value="${Math.round((R().scale || 1) * 100)}"></div>
    <p class="note">100 % = plan tal cual. Si 18 km por semana son demasiados para ti, baja el porcentaje. Si tienes lesión reciente, consulta a un profesional.</p>
    <button class="btn" data-action="saveCalib">Guardar</button>`);
  return false;
};
LIVE.calc = () => {
  const w = num(val('calKm'));
  if (!(w > 0)) return;
  const s = Math.round(Math.min(1, Math.max(0.5, (w * 1.3) / 18.3)) * 20) * 5;
  $('#calPct').value = s;
  $('#calHint').textContent = `· sugerido ${s} %`;
};
A.saveCalib = () => {
  const w = num(val('calKm'));
  if (!(w >= 0) || val('calKm') === '') { toast('Indica tus km semanales'); return false; }
  const pct = Math.min(100, Math.max(40, Number(val('calPct')) || 100));
  R().baseline = { weeklyKm: w, sessionsPerWeek: Number(val('calSess')) || 2, longestKm: num(val('calLong')) || 0, pain: groupVal('calPain') || 'unknown', calibratedOn: today() };
  R().scale = pct / 100;
  hist('1-tue', 'Plan calibrado', `escala ${pct} %`);
  closeSheet(); toast(`Plan calibrado al ${pct} %`);
};

/* ---------- EXPORTAR / IMPORTAR ---------- */
const csvCell = v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
A.exportCSV = () => {
  const rows = runLog().map(l => SESSION_FIELDS.map(f => csvCell(l[f])).join(','));
  download(`running-${today()}.csv`, [SESSION_FIELDS.join(','), ...rows].join('\n'), 'text/csv');
  return false;
};
A.exportICS = () => {
  const ev = allSessions().filter(s => !s.dropped).map(s => `BEGIN:VEVENT\nUID:${s.key}@kivo\nDTSTAMP:20260101T000000Z\nDTSTART;VALUE=DATE:${s.date.replace(/-/g, '')}\nDTEND;VALUE=DATE:${shift(s.date, 1).replace(/-/g, '')}\nSUMMARY:Running · ${TYPES[s.type].name} ${fmtKm(s.km)} km${s.mandatory ? '' : ' (opcional)'}\nDESCRIPTION:${TYPES[s.type].desc.replace(/\n/g, ' ')}\nEND:VEVENT`);
  download('plan-running.ics', `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Kivo//ES\n${ev.join('\n')}\nEND:VCALENDAR`, 'text/calendar');
  return false;
};
function parseCSV(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim()));
}
function importRunCSV(text) {
  const rows = parseCSV(text);
  if (rows.length < 2) return 0;
  const h = rows[0].map(x => x.trim());
  let n = 0;
  rows.slice(1).forEach(r => {
    const o = {}; h.forEach((k, i) => { o[k] = (r[i] ?? '').trim(); });
    const km = num(o.actual_km), sec = Number(o.moving_seconds);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(o.date_local) || !(km > 0) || !(sec > 0)) return;
    if (R().log.some(l => l.date_local === o.date_local && l.actual_km === km && l.moving_seconds === sec)) return;
    R().log.push({
      id: uid(), date_local: o.date_local, session_type: TYPES[o.session_type] ? o.session_type : 'other', session_key: '',
      planned_km: num(o.planned_km) || 0, actual_km: km, moving_seconds: sec, avg_pace_seconds_per_km: Number(o.avg_pace_seconds_per_km) || Math.round(sec / km),
      rpe_0_10: Number(o.rpe_0_10) || 5, pain_0_10: Number(o.pain_0_10) || 0, pain_location: o.pain_location || 'Ninguna',
      fatigue_1_5: Number(o.fatigue_1_5) || 3, sleep_1_5: Number(o.sleep_1_5) || null, energy_1_5: Number(o.energy_1_5) || null,
      session_completed: o.session_completed !== 'false', notes: o.notes || '', import_source: 'csv',
    });
    n++;
  });
  return n;
}
