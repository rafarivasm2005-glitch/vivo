/* main.js — arranque */
(function init() {
  cur = today();
  const h = (location.hash || '').slice(1);
  if (VIEWS[h]) view = h;
  syncLinks();
  save();
  applyTheme();
  renderTabs();
  render();
  let lastToday = today();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    const t = today();
    if (t !== lastToday) { if (cur === lastToday) cur = t; lastToday = t; render(); }
  });
  // Pide al navegador que no borre los datos de la app (donde esté permitido)
  try { navigator.storage?.persist?.(); } catch (e) {}
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
