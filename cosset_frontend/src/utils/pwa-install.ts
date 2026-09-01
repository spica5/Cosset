type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

type Listener = () => void;

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;
let listening = false;
const listeners = new Set<Listener>();

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

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notify();
  });

  window.addEventListener('appinstalled', () => {
    installed = true;
    deferredPrompt = null;
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
  return {
    canInstall: Boolean(deferredPrompt) && !installed,
    installed: installed || getStandaloneInstalled(),
    hasPrompt: Boolean(deferredPrompt),
  };
}

export async function promptInstallCossetApp(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  ensurePwaInstallListeners();

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
    if (choice.outcome === 'accepted') {
      installed = true;
    }
    notify();
    return choice.outcome;
  } catch {
    deferredPrompt = null;
    notify();
    return 'unavailable';
  }
}

export function isIosSafari() {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const webkit = /WebKit/.test(ua);
  const chromeOrCriOS = /CriOS|Chrome|Firefox|EdgiOS/.test(ua);
  return iOS && webkit && !chromeOrCriOS;
}
