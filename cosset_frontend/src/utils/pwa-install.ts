import { registerCossetServiceWorker } from 'src/utils/web-push-client';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

type Listener = () => void;

type GlobalPwaInstallState = {
  deferredPrompt: BeforeInstallPromptEvent | null;
  installed: boolean;
  initialized?: boolean;
};

type InstalledRelatedWebApp = {
  platform: string;
  url?: string;
  id?: string;
};

const GLOBAL_KEY = '__cossetPwaInstall';
const CHANGE_EVENT = 'cosset-pwa-install-change';
const INSTALLED_STORAGE_KEY = 'cosset-pwa-installed';

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;
let listening = false;
let installedCheckPromise: Promise<boolean> | null = null;
const listeners = new Set<Listener>();

function getGlobalState(): GlobalPwaInstallState | null {
  if (typeof window === 'undefined') return null;
  return (window as Window & { [GLOBAL_KEY]?: GlobalPwaInstallState })[GLOBAL_KEY] ?? null;
}

function clearInstalledFlag() {
  installed = false;

  const global = getGlobalState();
  if (global) {
    global.installed = false;
  }

  try {
    localStorage.removeItem(INSTALLED_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
}

function markInstalled() {
  installed = true;
  deferredPrompt = null;

  const global = getGlobalState();
  if (global) {
    global.installed = true;
    global.deferredPrompt = null;
  }

  try {
    localStorage.setItem(INSTALLED_STORAGE_KEY, '1');
  } catch {
    // ignore storage errors
  }
}

function syncFromGlobal() {
  const global = getGlobalState();
  if (!global) return;

  const { deferredPrompt: globalDeferredPrompt, installed: globalInstalled } = global;

  if (globalDeferredPrompt) {
    deferredPrompt = globalDeferredPrompt;
    // A live install prompt means the app is not installed in this browser profile.
    installed = false;
  } else if (globalInstalled) {
    installed = true;
    deferredPrompt = null;
  }
}

function notify() {
  listeners.forEach((listener) => listener());
}

function isInstalledLocally() {
  if (typeof window === 'undefined') return false;

  try {
    return localStorage.getItem(INSTALLED_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function getStandaloneInstalled() {
  if (typeof window === 'undefined') return false;

  const displayModes = ['standalone', 'minimal-ui', 'fullscreen'];
  const displayModeInstalled = displayModes.some(
    (mode) => window.matchMedia?.(`(display-mode: ${mode})`)?.matches,
  );
  const iosStandalone = Boolean(
    (window.navigator as Navigator & { standalone?: boolean }).standalone,
  );

  return Boolean(displayModeInstalled || iosStandalone);
}

function getInstalledRelatedAppsApi() {
  if (typeof navigator === 'undefined') return undefined;

  const { getInstalledRelatedApps } = navigator as Navigator & {
    getInstalledRelatedApps?: () => Promise<InstalledRelatedWebApp[]>;
  };

  return getInstalledRelatedApps;
}

function isSameOriginWebApp(app: InstalledRelatedWebApp) {
  if (app.platform !== 'webapp') return false;

  const origin = window.location.origin;
  const candidate = app.url || app.id || '';

  // Require an explicit url/id — empty candidates are not proof of install.
  if (!candidate) return false;

  try {
    return new URL(candidate, origin).origin === origin;
  } catch {
    return candidate.includes(origin.replace(/^https?:\/\//, ''));
  }
}

async function detectInstalledRelatedApp() {
  if (typeof window === 'undefined') return false;

  const getInstalledRelatedApps = getInstalledRelatedAppsApi();
  if (!getInstalledRelatedApps) {
    return false;
  }

  try {
    const apps = await getInstalledRelatedApps.call(navigator);
    return apps.some(isSameOriginWebApp);
  } catch {
    return false;
  }
}

/**
 * Only trust definite install signals. Do not infer from service worker presence —
 * Cosset registers a SW for push, which is required for installability, not proof of install.
 */
export async function checkPwaAlreadyInstalled() {
  if (deferredPrompt) {
    if (installed || isInstalledLocally()) {
      clearInstalledFlag();
      notify();
    }
    return false;
  }

  if (getStandaloneInstalled()) {
    if (!installed) {
      markInstalled();
      notify();
    }
    return true;
  }

  const relatedInstalled = await detectInstalledRelatedApp();
  if (relatedInstalled) {
    if (!installed) {
      markInstalled();
      notify();
    }
    return true;
  }

  // Stale localStorage from earlier false positives must not keep the UI locked.
  if (installed || isInstalledLocally()) {
    clearInstalledFlag();
    notify();
  }

  return false;
}

export async function refreshPwaInstallState() {
  if (!installedCheckPromise) {
    installedCheckPromise = checkPwaAlreadyInstalled().finally(() => {
      installedCheckPromise = null;
    });
  }

  await installedCheckPromise;
}

export function ensurePwaInstallListeners() {
  if (typeof window === 'undefined' || listening) {
    return;
  }

  listening = true;
  // Start from live display-mode only. localStorage is verified asynchronously.
  installed = getStandaloneInstalled();
  if (installed) {
    try {
      localStorage.setItem(INSTALLED_STORAGE_KEY, '1');
    } catch {
      // ignore
    }
  }
  syncFromGlobal();

  // If early init wrongly marked installed, but we have a prompt, prefer the prompt.
  if (deferredPrompt) {
    clearInstalledFlag();
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    clearInstalledFlag();
    deferredPrompt = event as BeforeInstallPromptEvent;

    const global = getGlobalState();
    if (global) {
      global.installed = false;
      global.deferredPrompt = deferredPrompt;
    }

    notify();
  });

  window.addEventListener('appinstalled', () => {
    markInstalled();
    notify();
  });

  window.addEventListener(CHANGE_EVENT, () => {
    syncFromGlobal();
    notify();
  });

  refreshPwaInstallState().catch(() => undefined);
}

export function subscribePwaInstallState(listener: Listener) {
  ensurePwaInstallListeners();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getPwaInstallState() {
  ensurePwaInstallListeners();
  syncFromGlobal();

  // Prefer a live install prompt over any cached installed flag.
  if (deferredPrompt) {
    return {
      canInstall: true,
      installed: false,
      hasPrompt: true,
    };
  }

  return {
    canInstall: false,
    installed: installed || getStandaloneInstalled(),
    hasPrompt: false,
  };
}

export async function waitForInstallPrompt(
  options?: { timeoutMs?: number },
): Promise<'ready' | 'installed' | 'unavailable'> {
  const timeoutMs = options?.timeoutMs ?? 8000;

  ensurePwaInstallListeners();
  syncFromGlobal();

  if (await checkPwaAlreadyInstalled()) {
    return 'installed';
  }

  if (deferredPrompt) {
    return 'ready';
  }

  await registerCossetServiceWorker().catch(() => null);
  if ('serviceWorker' in navigator) {
    await navigator.serviceWorker.ready.catch(() => null);
  }

  syncFromGlobal();
  if (deferredPrompt) {
    return 'ready';
  }

  if (await checkPwaAlreadyInstalled()) {
    return 'installed';
  }

  return new Promise((resolve) => {
    let settled = false;

    const finish = (value: 'ready' | 'installed' | 'unavailable') => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    };

    const check = async () => {
      syncFromGlobal();

      if (await checkPwaAlreadyInstalled()) {
        finish('installed');
        return;
      }

      if (deferredPrompt) {
        finish('ready');
      }
    };

    const onChange = () => {
      check().catch(() => undefined);
    };

    window.addEventListener(CHANGE_EVENT, onChange);
    const unsubscribe = subscribePwaInstallState(onChange);

    const deadline = Date.now() + timeoutMs;
    const timer = window.setInterval(() => {
      (async () => {
        await check();

        if (Date.now() >= deadline) {
          if (await checkPwaAlreadyInstalled()) {
            finish('installed');
            return;
          }

          finish(deferredPrompt ? 'ready' : 'unavailable');
        }
      })().catch(() => undefined);
    }, 250);

    const cleanup = () => {
      window.clearInterval(timer);
      window.removeEventListener(CHANGE_EVENT, onChange);
      unsubscribe();
    };

    check().catch(() => undefined);
  });
}

export async function promptInstallCossetApp(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  ensurePwaInstallListeners();
  syncFromGlobal();

  if (await checkPwaAlreadyInstalled()) {
    return 'accepted';
  }

  const promptEvent = deferredPrompt;
  if (!promptEvent) {
    return 'unavailable';
  }

  try {
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    deferredPrompt = null;

    const global = getGlobalState();
    if (global) {
      global.deferredPrompt = null;
    }

    if (choice.outcome === 'accepted') {
      markInstalled();
    }
    notify();
    return choice.outcome;
  } catch {
    deferredPrompt = null;

    const global = getGlobalState();
    if (global) {
      global.deferredPrompt = null;
    }

    notify();
    return 'unavailable';
  }
}

export async function getPwaInstallUnavailableReason() {
  if (typeof window === 'undefined') {
    return 'Open Cosset in your browser to install the app.';
  }

  if (!window.isSecureContext) {
    return 'Install requires HTTPS (or localhost). Open Cosset on a secure connection, then try again.';
  }

  if (await checkPwaAlreadyInstalled()) {
    return getPwaInstalledMessage();
  }

  if (isIosDevice()) {
    return 'On iPhone, tap Share, then Add to Home Screen to install Cosset.';
  }

  return 'Install is not ready yet. Browse Cosset for a few seconds, then try again — or use the install icon in Chrome’s address bar.';
}

/** All iOS browsers (Safari, Chrome, Firefox, Edge) use WebKit and lack beforeinstallprompt. */
export function isIosDevice() {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/** @deprecated Prefer isIosDevice — every iOS browser needs Add to Home Screen help. */
export function isIosSafari() {
  return isIosDevice();
}

export function getPwaInstalledMessage() {
  if (isIosDevice()) {
    return 'Cosset is already on your Home Screen. Open it from there.';
  }
  return 'Cosset is already installed. Use Open in app in Chrome’s address bar to launch it.';
}
