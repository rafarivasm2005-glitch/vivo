/* life.js — Mente y Ajustes (Alimentación está en food.js) */
const MOODS = ['', 'Difícil', 'Bajo', 'Normal', 'Bien', 'Excelente'];
const QUOTES = [
  'La disciplina es elegir entre lo que quieres ahora y lo que más quieres.',
  'Pequeños pasos, todos los días.',
  'No tienes que ser perfecto, solo constante.',
  'Lo que haces cada día importa más que lo que haces de vez en cuando.',
  'Cuida tu cuerpo: es el único lugar en el que tienes que vivir.',
  'La calma también es una forma de fuerza.',
  'Hazlo simple. Hazlo hoy.',
  'Tu yo del futuro te lo agradecerá.',
];
const PROMPTS = [
  '¿Qué ha ido bien hoy?',
  '¿Qué has aprendido hoy?',
  '¿Qué te preocupa y qué puedes hacer al respecto?',
  '¿Qué harías mañana para sentirte orgulloso?',
  '¿Qué agradeces ahora mismo?',
];
const dayIndex = () => Math.floor(parse(cur).getTime() / 864e5);

/* ---------- objetivos diarios (alimentan el Home) ---------- */
function mindStatus(k) {
  const d = get(k), hs = S.settings.habits;
  const hd = hs.filter(h => d.habits[h.id]).length;
  const hp = hs.length ? hd / hs.length : 1;
  const refl = !!d.reflection.trim(), allHabits = hd === hs.length;
  return { short: `${(d.mood ? 1 : 0) + (allHabits ? 1 : 0) + (refl ? 1 : 0)}/3`, done: !!d.mood && allHabits && refl, pct: ((d.mood ? 1 : 0) + hp + (refl ? 1 : 0)) / 3, text: `${hd}/${hs.length} hábitos${refl ? '' : ' · reflexión pendiente'}` };
}

/* ---------- bloques reutilizables ---------- */
function moodHTML(d) {
  return `<div class="card pad"><div class="moods">${[1, 2, 3, 4, 5].map(i =>
    `<button class="mood ${d.mood === i ? 'on' : ''}" data-action="mood" data-n="${i}">${i}</button>`).join('')}</div>
    <div class="moodlabel">${d.mood ? MOODS[d.mood] : '¿Cómo te sientes?'}</div></div>`;
}
const mui = { edit: false, draft: {} };
function habitsHTML(d, editable = false) {
  if (editable && mui.edit) return `<div class="card list">${S.settings.habits.map(h => `
    <div class="row hab"><span class="t"><b>${esc(h.name)}</b></span><button class="x" data-action="delHabit" data-id="${h.id}" aria-label="Eliminar">×</button></div>`).join('')}</div>`;
  if (!S.settings.habits.length) return '<div class="card pad"><p class="note" style="margin:0">Aún no tienes hábitos. Añade el primero abajo.</p></div>';
  return `<div class="card list">${S.settings.habits.map(h => `
    <button class="row hab ${d.habits[h.id] ? 'on' : ''}" data-action="habit" data-id="${h.id}">
      <span class="box">${d.habits[h.id] ? '✓' : ''}</span><span class="t"><b>${esc(h.name)}</b></span>
    </button>`).join('')}</div>`;
}
const goalBadge = st => `<p class="sub">${st.done ? '✓ Objetivo del día cumplido' : st.text}</p>`;

/* ---------- Mente ---------- */
VIEWS.mente = () => {
  const d = get(), st = mindStatus(cur);
  const days = Array.from({ length: 7 }, (_, i) => shift(cur, i - 6));
  const wd = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  return `
  <h1 class="lt">Mente</h1>${goalBadge(st)}
  <h3 class="gh">Ánimo</h3>${moodHTML(d)}
  <div class="card pad"><div class="dots">${days.map(k => { const m = get(k).mood; return `
    <div class="dot ${m ? 'has' : ''}"><i>${m || ''}</i>${wd[parse(k).getDay()]}</div>`; }).join('')}</div></div>
  <div class="ghrow"><h3 class="gh">Hábitos</h3><button class="link2" data-action="mindEdit">${mui.edit ? 'Listo' : 'Editar'}</button></div>${habitsHTML(d, true)}
  <div class="card pad"><div class="field"><input type="text" id="newHabit" placeholder="Nuevo hábito (p. ej. Estirar 10 min)" autocomplete="off" maxlength="60"></div><button class="btn sec" data-action="addHabit">+ Añadir hábito</button></div>
  <h3 class="gh">Diario</h3>
  <div class="card pad">
    <p class="prompt">Tu reflexión del día</p>
    <textarea id="journal" data-live="refl" placeholder="Escribe aquí tu reflexión…">${esc(mui.draft[cur] ?? d.reflection)}</textarea>
    ${(() => { const txt = mui.draft[cur] ?? d.reflection, saved = !!d.reflection.trim() && txt.trim() === d.reflection.trim(); return `<button class="btn" id="reflBtn" data-action="saveRefl" ${saved || !txt.trim() ? 'disabled' : ''}>${saved ? 'Guardado ✓' : 'Guardar'}</button>`; })()}
  </div>`;
};
LIVE.refl = t => {
  mui.draft[cur] = t.value;
  const d = get(), btn = $('#reflBtn'), saved = !!d.reflection.trim() && t.value.trim() === d.reflection.trim();
  btn.disabled = saved || !t.value.trim();
  btn.textContent = saved ? 'Guardado ✓' : 'Guardar';
};

/* ---------- Ajustes ---------- */
VIEWS.ajustes = () => {
  const s = S.settings;
  return `
  <h1 class="lt">Perfil</h1>
  <h3 class="gh">Apariencia</h3>
  <div class="card pad"><div class="seg" style="margin:0">${[['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Oscuro']].map(([v, l]) => `<button class="${(S.settings.theme || 'auto') === v ? 'on' : ''}" data-action="setTheme" data-v="${v}">${l}</button>`).join('')}</div>
    <p class="note">Automático sigue el modo de tu iPhone y es la única forma de que la app se funda con la barra de arriba (hora, batería y notch).${(S.settings.theme && S.settings.theme !== (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) ? ' <b>Ahora mismo tu tema es distinto al del iPhone, por eso la barra de arriba se ve de otro color.</b>' : ''}</p></div>
  <h3 class="gh">General</h3>
  <div class="card pad">
    <label class="lbl">Nombre</label><div class="field"><input type="text" id="setName" placeholder="Tu nombre" value="${esc(s.name)}"></div>
    <label class="lbl">Zona horaria</label><div class="field"><input type="text" id="setTz" value="${esc(s.tz)}" placeholder="Asia/Taipei"></div>
    <p class="note">Ejemplos: Asia/Taipei, Europe/Madrid, America/Mexico_City. Define qué día es “hoy”.</p>
    <button class="btn" data-action="saveSettings">Guardar</button>
  </div>

  <h3 class="gh">Running</h3>
  <div class="card list">
    <button class="row" data-action="openCalib"><div class="t"><b>${R().baseline ? 'Recalibrar plan' : 'Calibrar plan'}</b><span>${R().baseline ? `Escala actual ${Math.round(R().scale * 100)} %` : 'Pendiente de calibrar'}</span></div><span class="chev">${svg('chev', 18)}</span></button>
  </div>

  <h3 class="gh">Datos</h3>
  <div class="card pad">
    <button class="btn sec" data-action="exportJSON">Exportar copia completa (.json)</button>
    <button class="btn sec" data-action="exportCSV">Exportar historial de running (.csv)</button>
    <button class="btn sec" data-action="exportICS">Exportar calendario del plan (.ics)</button>
    <button class="btn sec" data-action="importJSON">Importar copia (.json)</button>
    <button class="btn sec" data-action="importCSV">Importar entrenos (.csv)</button>
    <input type="file" id="fileJSON" accept="application/json" hidden>
    <input type="file" id="fileCSV" accept=".csv,text/csv" hidden>
    <button class="btn danger" data-action="wipe">Borrar todos mis datos</button>
    <p class="note">Tus datos viven solo en este navegador y nunca salen de tu dispositivo.</p>
  </div>`;
};

/* ---------- acciones ---------- */
Object.assign(A, {
  mood: el => { const d = day(), n = +el.dataset.n; d.mood = d.mood === n ? null : n; },
  habit: el => { const d = day(), id = el.dataset.id; d.habits[id] = !d.habits[id]; },
  saveSettings: () => {
    const tz = val('setTz') || 'Asia/Taipei';
    try { new Intl.DateTimeFormat('en-CA', { timeZone: tz }); } catch (e) { toast('Zona horaria no válida'); return false; }
    Object.assign(S.settings, {
      name: val('setName'), tz,
    });
    cur = today(); view = 'home'; toast('Guardado');
  },
  addHabit: () => { const name = val('newHabit'); if (!name) return false; S.settings.habits.push({ id: uid(), name }); },
  saveRefl: () => {
    const text = $('#journal').value.trim();
    if (!text) { toast('Escribe tu reflexión'); return false; }
    day().reflection = text; delete mui.draft[cur]; toast('Reflexión guardada');
  },
  mindEdit: () => { mui.edit = !mui.edit; },
  delHabit: el => { if (!confirm('¿Eliminar este hábito?')) return false; S.settings.habits = S.settings.habits.filter(h => h.id !== el.dataset.id); },
  exportJSON: () => { download(`kivo-${today()}.json`, JSON.stringify(S, null, 2), 'application/json'); return false; },
  importJSON: () => { $('#fileJSON').click(); return false; },
  importCSV: () => { $('#fileCSV').click(); return false; },
  wipe: () => {
    if (!confirm('¿Borrar todos tus datos? No se puede deshacer.')) return false;
    S = defaults(); view = 'home'; toast('Datos borrados');
  },
});

document.addEventListener('change', e => {
  const f = e.target.files?.[0];
  if (!f) return;
  const rd = new FileReader();
  if (e.target.id === 'fileJSON') {
    rd.onload = () => {
      try {
        const raw = JSON.parse(rd.result);
        if (!raw.days) throw 0;
        const d = defaults();
        S = { settings: { ...d.settings, ...raw.settings }, days: raw.days, food: { ...d.food, ...raw.food }, run: { ...d.run, ...raw.run } };
        save(); view = 'home'; render(); toast('Copia importada');
      } catch (_) { alert('Archivo no válido.'); }
    };
  } else if (e.target.id === 'fileCSV') {
    rd.onload = () => { const n = importRunCSV(rd.result); save(); render(); toast(n ? `${n} entrenos importados` : 'No se importó ningún entreno'); };
  } else return;
  rd.readAsText(f);
  e.target.value = '';
});

document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || e.target.tagName !== 'INPUT') return;
  const map = { newHabit: 'addHabit' };
  const a = map[e.target.id];
  if (a && A[a]() !== false) { save(); render(); }
});
