/* home.js — Home: la racha une Alimentación + Deporte + Mente */
const AREAS = [['comida', 'Alimentación', 'f'], ['deporte', 'Deporte', 's'], ['mente', 'Mente', 'm']];

function dayStatus(k) {
  const f = foodStatus(k), s = sportStatus(k), m = mindStatus(k);
  return { f, s, m, all: f.done && s.done && m.done, count: [f, s, m].filter(x => x.done).length };
}
function dayStreak() {
  const t = today();
  let k = dayStatus(t).all ? t : shift(t, -1), n = 0;
  while (n < 1000 && dayStatus(k).all) { n++; k = shift(k, -1); }
  return n;
}
function streakStats() {
  const keys = Object.keys(S.days).sort();
  if (!keys.length) return { best: 0, total: 0 };
  let best = 0, run = 0, total = 0;
  const end = today();
  for (let k = keys[0]; k <= end; k = shift(k, 1)) {
    if (dayStatus(k).all) { run++; total++; best = Math.max(best, run); } else run = 0;
  }
  return { best, total };
}
function greeting() {
  const h = new Date().getHours();
  const g = h < 6 ? 'Buenas noches' : h < 13 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches';
  return S.settings.name ? `${g}, ${esc(S.settings.name)}` : g;
}

VIEWS.home = () => {
  const t = today(), st = dayStatus(cur), streak = dayStreak(), ss = streakStats();
  const pending = AREAS.filter(([, , c]) => !st[c].done).map(a => a[1]);
  const wd = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  const last7 = Array.from({ length: 7 }, (_, i) => shift(t, i - 6));

  // Mapa de las últimas 5 semanas (lunes a domingo)
  const start = shift(shift(t, -weekdayMon(t)), -28);
  const heat = Array.from({ length: 35 }, (_, i) => {
    const k = shift(start, i), d = dayStatus(k);
    const cls = k > t ? 'fut' : d.all ? 'on' : d.count === 2 ? 'half' : '';
    return `<i class="${cls} ${k === t ? 'now' : ''}" title="${k}"></i>`;
  }).join('');

  const next = nextSession(), dleft = daysBetween(t, PLAN.goal);
  const isToday = cur === t;

  return `
  <div class="homehead"><div><h1 class="lt">Home</h1><p class="sub" style="margin:0">${greeting()}</p></div><div class="logo" role="img" aria-label="Logo"><i></i></div></div>

  <div class="card pad streak">
    <p class="eyebrow">Racha</p>
    <div class="big">${streak}<small>${streak === 1 ? 'día' : 'días'}</small></div>
    <p class="sub2">${st.all ? `${isToday ? 'Hoy' : dlong(cur)} completado ✓` : `${isToday ? 'Hoy' : 'Ese día'} te falta: ${pending.join(' · ')}`}</p>
    <div class="hdots">${last7.map(k => `<div class="${dayStatus(k).all ? 'on' : ''} ${k === t ? 'now' : ''}"><i></i><span>${wd[parse(k).getDay()]}</span></div>`).join('')}</div>
  </div>

  <h3 class="gh">Objetivos del día</h3>
  <div class="card pad">
    <div class="rings">${AREAS.map(([v, l, c]) => `<button data-action="goto" data-view="${v}">
      ${ring(st[c].pct, 74, 7, st[c].done ? '✓' : Math.round(st[c].pct * 100) + '%')}<b>${l}</b><span>${st[c].short}</span></button>`).join('')}</div>
  </div>

  <h3 class="gh">Últimas 5 semanas</h3>
  <div class="card pad"><div class="heat">${heat}</div><p class="note">Un día se rellena cuando cumples Alimentación, Deporte y Mente. Descansar cuando toca cuenta como éxito.</p></div>

  <h3 class="gh">Mi reto</h3>
  <button class="card pad lnk" data-action="goto" data-view="deporte">
    <div class="srow"><div><p class="eyebrow">21,1 km · 31 de enero</p><div class="sname">${dleft > 0 ? `${dleft} días` : dleft === 0 ? 'Hoy' : 'Finalizado'}</div></div><span class="chev">${svg('chev', 20)}</span></div>
    <p class="note" style="margin:8px 0 0">${next ? `Próxima: ${TYPES[next.type].name} · ${next.dayName} ${dshort(next.date)} · ${fmtKm(next.km)} km` : 'Sin sesiones pendientes'}</p>
  </button>

  <div class="stat3 card pad" style="margin-top:12px">
    <div><b>${ss.best}</b><span>mejor racha</span></div>
    <div><b>${ss.total}</b><span>días completos</span></div>
    <div><b>${weekStreak()}</b><span>sem. running</span></div>
  </div>
  <p class="quote">${QUOTES[dayIndex() % QUOTES.length]}</p>`;
};
