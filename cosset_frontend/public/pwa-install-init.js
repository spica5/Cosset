/* Capture PWA install prompt before React hydrates (Chrome/Edge). */
(function () {
  if (typeof window === 'undefined') return;

  var STORAGE_KEY = 'cosset-pwa-installed';

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

  function markInstalled() {
    state.installed = true;
    state.deferredPrompt = null;
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch (e) {}
    notify();
  }

  function detectStandaloneInstalled() {
    var modes = ['standalone', 'minimal-ui', 'fullscreen'];
    var standalone = modes.some(function (mode) {
      return window.matchMedia && window.matchMedia('(display-mode: ' + mode + ')').matches;
    });
    if (standalone || window.navigator.standalone === true) {
      markInstalled();
      return true;
    }

    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') {
        state.installed = true;
        return true;
      }
    } catch (e) {}

    return false;
  }

  detectStandaloneInstalled();

  if (navigator.getInstalledRelatedApps) {
    navigator
      .getInstalledRelatedApps()
      .then(function (apps) {
        if (apps && apps.some(function (app) { return app.platform === 'webapp'; })) {
          markInstalled();
        }
      })
      .catch(function () {});
  }

  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    state.deferredPrompt = event;
    notify();
  });

  window.addEventListener('appinstalled', function () {
    markInstalled();
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function () {});
  }
})();
