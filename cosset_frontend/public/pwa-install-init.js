/* Capture PWA install prompt before React hydrates (Chrome/Edge). */
(function () {
  if (typeof window === 'undefined') return;

  var state = (window.__cossetPwaInstall = window.__cossetPwaInstall || {
    deferredPrompt: null,
    installed: false,
    initialized: false,
  });

  if (state.initialized) return;
  state.initialized = true;

  function notify() {
    window.dispatchEvent(new Event('cosset-pwa-install-change'));
  }

  function detectInstalled() {
    var standalone =
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      window.navigator.standalone === true;
    if (standalone) {
      state.installed = true;
      state.deferredPrompt = null;
    }
  }

  detectInstalled();

  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    state.deferredPrompt = event;
    notify();
  });

  window.addEventListener('appinstalled', function () {
    state.installed = true;
    state.deferredPrompt = null;
    notify();
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function () {});
  }
})();
