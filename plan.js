/* plan.js — plan de 16 semanas (running_26k_plan_app.json). Es una ruta aspiracional, no una obligación. */
const PLAN = {
  start: '2026-10-12',
  goal: '2027-01-31',
  primaryKm: 21.1,
  stretchKm: 25.5,
  gates: [4, 8, 12, 14],
  // tue/thu/fri/sun = km del plan; thuQ = jueves con calidad; cond = domingo condicionado
  weeks: [
    { w: 1, phase: 'Adaptación', tue: 4, thu: 5, fri: 0, sun: 9.3, note: 'Base: rodajes fáciles; observar esfuerzo y recuperación.' },
    { w: 2, phase: 'Adaptación', tue: 5, thu: 5, fri: 0, sun: 10.2, note: 'Base: ritmo conversacional.' },
    { w: 3, phase: 'Adaptación', tue: 5, thu: 6, fri: 0, sun: 11.2, note: 'Base: sin entrenamientos rápidos.' },
    { w: 4, phase: 'Descarga', tue: 4, thu: 5, fri: 0, sun: 8.0, note: 'Descarga: reducir volumen y asimilar.' },
    { w: 5, phase: 'Construcción', tue: 6, thu: 6, fri: 0, sun: 12.3, note: 'Jueves fácil; opcionalmente 3 progresivos de 15 s si te sientes cómodo.' },
    { w: 6, phase: 'Construcción', tue: 6, thu: 7, fri: 3, sun: 13.5, note: '4.ª sesión opcional: recuperación de 3 km solo si no hay molestias.' },
    { w: 7, phase: 'Construcción', tue: 7, thu: 7, fri: 3, sun: 14.8, note: 'Consolidación: jueves suave + técnica de carrera opcional.' },
    { w: 8, phase: 'Descarga', tue: 6, thu: 6, fri: 3, sun: 11.0, note: 'Descarga: todo muy fácil.' },
    { w: 9, phase: 'Resistencia', tue: 8, thu: 8, fri: 3, sun: 16.2, thuQ: true, note: 'Primer jueves con bloques moderados.' },
    { w: 10, phase: 'Resistencia', tue: 8, thu: 9, fri: 4, sun: 17.8, thuQ: true, note: 'Jueves con ritmo estable controlado.' },
    { w: 11, phase: 'Resistencia', tue: 9, thu: 9, fri: 4, sun: 19.5, thuQ: true, note: 'Jueves con bloques moderados; sin esprintar.' },
    { w: 12, phase: 'Descarga', tue: 7, thu: 7, fri: 3, sun: 14.8, note: 'Descarga: todo fácil; revisar tolerancia.' },
    { w: 13, phase: 'Pico', tue: 9, thu: 10, fri: 5, sun: 21.4, thuQ: true, cond: true, note: 'Jueves de calidad solo si estás recuperado; si no, todo fácil.' },
    { w: 14, phase: 'Pico', tue: 10, thu: 10, fri: 5, sun: 23.5, cond: true, note: 'Semana pico, exigente. Los 23,5 km solo si todas las puertas de seguridad están superadas.' },
    { w: 15, phase: 'Taper', tue: 6, thu: 6, fri: 0, sun: 12.3, cond: true, note: 'Taper: bajar carga; todo fácil y descansar.' },
    { w: 16, phase: 'Reto', tue: 5, thu: 4, fri: 0, sun: 25.5, cond: true, note: 'Principal: 21,1 km. Stretch opcional: 25,5 km. Sin objetivo de tiempo obligatorio.' },
  ],
};

const TYPES = {
  easy: { name: 'Rodaje fácil', desc: 'RPE 3–4/10. Ritmo conversacional: debes poder hablar sin jadear. Puede ser 8:00–9:00 min/km o más lento; camina a ratos si lo necesitas.' },
  recovery: { name: 'Recuperación', desc: 'Muy suave y corto. Solo si te encuentras bien y sin molestias. Si dudas, sáltalo: no pasa nada.' },
  long_easy: { name: 'Tirada larga', desc: 'Suave y conversacional. 5–10 min de caminata/trote progresivo al inicio, pausas breves para caminar si hace falta y vuelta a la calma. No busques velocidad.' },
  controlled: { name: 'Rodaje con calidad', desc: 'Parte moderada (RPE 5–6/10), nunca un esprint. Calentamiento y enfriamiento incluidos en la distancia total.' },
  goal_event: { name: 'Día del reto', desc: 'Sal suave, come y bebe como has practicado y termina sin lesión. El tiempo no importa. Principal: 21,1 km.' },
  other: { name: 'Salida libre', desc: '' },
};

// Detalle extra del jueves por semana
const THU = {
  5: 'Opcional: 3 aceleraciones relajadas de 15 s si estás cómodo y sin dolor.',
  6: 'Opcional: 3–4 aceleraciones relajadas de 15 s si no hay dolor.',
  7: 'Opcional: 3–4 aceleraciones relajadas de 15 s o técnica de carrera.',
  9: '3 × 4 min moderados (RPE 6) con 3 min de trote suave entre bloques.',
  10: '15 min a ritmo estable (RPE 5–6) y el resto muy fácil.',
  11: '4 × 4 min moderados (RPE 6) con 3 min suaves; sin esprintar.',
  13: 'Si la recuperación es buena: 2 × 8 min controlados (RPE 6). Si no, todo fácil.',
  14: 'Todo fácil. No añadas velocidad.',
  15: 'Todo fácil.',
  16: 'Todo fácil.',
};
