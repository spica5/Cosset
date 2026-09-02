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

const GLOBAL_KEY = '__cossetPwaInstall';
const CHANGE_EVENT = 'cosset-pwa-install-change';

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;
let listening = false;
const listeners = new Set<Listener>();

function getGlobalState(): GlobalPwaInstallState | null {
  if (typeof window === 'undefined') return null;
  return (window as Window & { [GLOBAL_KEY]?: GlobalPwaInstallState })[GLOBAL_KEY] ?? null;
}

function syncFromGlobal() {
  const global = getGlobalState();
  if (!global) return;

  if (global.deferredPrompt) {
    deferredPrompt = global.deferredPrompt;
  }
  if (global.installed) {
    installed = true;
    deferredPrompt = null;
  }
}

function notify() {
  listeners.forEach((listener) => listener());
}

function getStandaloneInstalled() {
  if (typeof window === 'undefined') return false;
  const media = window.matchMedia?.('(display-mode: standalone)')?.matches;
  const iosStandalone = Boolean(
    (window.navigator as Navigator & { standalone?: boolean }).standalone,
  );
  return Boolean(media || iosStandalone);
}

export function ensurePwaInstallListeners() {
  if (typeof window === 'undefined' || listening) {
    return;
  }

  listening = true;
  installed = getStandaloneInstalled();
  syncFromGlobal();

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;

    const global = getGlobalState();
    if (global) {
      global.deferredPrompt = deferredPrompt;
    }

    notify();
  });

  window.addEventListener('appinstalled', () => {
    installed = true;
    deferredPrompt = null;

    const global = getGlobalState();
    if (global) {
      global.installed = true;
      global.deferredPrompt = null;
    }

    notify();
  });

  window.addEventListener(CHANGE_EVENT, () => {
    syncFromGlobal();
    notify();
  });
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

  return {
    canInstall: Boolean(deferredPrompt) && !installed,
    installed: installed || getStandaloneInstalled(),
    hasPrompt: Boolean(deferredPrompt),
  };
}

export async function waitForInstallPrompt(options?: { timeoutMs?: number }): Promise<boolean> {
  const timeoutMs = options?.timeoutMs ?? 12000;

  ensurePwaInstallListeners();
  syncFromGlobal();

  if (installed || getStandaloneInstalled()) {
    installed = true;
    return false;
  }

  if (deferredPrompt) {
    return true;
  }

  await registerCossetServiceWorker().catch(() => null);
  if ('serviceWorker' in navigator) {
    await navigator.serviceWorker.ready.catch(() => null);
  }

  syncFromGlobal();
  if (deferredPrompt) {
    return true;
  }

  return new Promise((resolve) => {
    let settled = false;

    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    };

    const check = () => {
      syncFromGlobal();
      if (deferredPrompt && !installed) {
        finish(true);
      }
    };

    const onChange = () => check();

    window.addEventListener(CHANGE_EVENT, onChange);
    const unsubscribe = subscribePwaInstallState(onChange);

    const deadline = Date.now() + timeoutMs;
    const timer = window.setInterval(() => {
      check();
      if (Date.now() >= deadline) {
        finish(Boolean(deferredPrompt) && !installed);
      }
    }, 250);

    const cleanup = () => {
      window.clearInterval(timer);
      window.removeEventListener(CHANGE_EVENT, onChange);
      unsubscribe();
    };

    check();
  });
}

export async function promptInstallCossetApp(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  ensurePwaInstallListeners();
  syncFromGlobal();

  if (installed || getStandaloneInstalled()) {
    installed = true;
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
      installed = true;
      if (global) {
        global.installed = true;
      }
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

export function getPwaInstallUnavailableReason(): string {
  if (typeof window === 'undefined') {
    return 'Open Cosset in your browser to install the app.';
  }

  if (!window.isSecureContext) {
    return 'Install requires HTTPS (or localhost). Open Cosset on a secure connection, then try again.';
  }

  if (getStandaloneInstalled()) {
    return 'Cosset is already installed on this device.';
  }

  if (isIosSafari()) {
    return 'Safari cannot trigger install automatically. Tap Share, then Add to Home Screen.';
  }

  return 'Install is not ready yet. Browse Cosset for a few seconds, then try again — or use the install icon in Chrome’s address bar.';
}

export function isIosSafari() {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  const iOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const webkit = /WebKit/.test(ua);
  const chromeOrCriOS = /CriOS|Chrome|Firefox|EdgiOS/.test(ua);
  return iOS && webkit && !chromeOrCriOS;
}
