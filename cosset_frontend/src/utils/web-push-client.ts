import axiosInstance, { endpoints } from 'src/utils/axios';

// ----------------------------------------------------------------------

export type BrowserPushSupport = {
  supported: boolean;
  reason?: string;
};

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

const hasPushManagerApi = () =>
  typeof window !== 'undefined' &&
  (('PushManager' in window && typeof window.PushManager === 'function') ||
    (typeof ServiceWorkerRegistration !== 'undefined' &&
      'pushManager' in ServiceWorkerRegistration.prototype));

export function getBrowserPushSupport(): BrowserPushSupport {
  if (typeof window === 'undefined') {
    return { supported: false, reason: 'Notifications are only available in the browser.' };
  }

  if (!window.isSecureContext) {
    return {
      supported: false,
      reason:
        'Notifications need a secure page (https:// or http://localhost). Open Cosset on localhost or HTTPS, then try again.',
    };
  }

  if (!('Notification' in window)) {
    return {
      supported: false,
      reason: 'This browser does not support the Notifications API.',
    };
  }

  if (!('serviceWorker' in navigator)) {
    return {
      supported: false,
      reason: 'This browser does not support service workers needed for push notifications.',
    };
  }

  if (!hasPushManagerApi()) {
    return {
      supported: false,
      reason:
        'This browser does not support Web Push. Use Chrome, Edge, Firefox, or Safari 16+ (or install Cosset on your phone).',
    };
  }

  return { supported: true };
}

export async function registerCossetServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  return navigator.serviceWorker.register('/sw.js', { scope: '/' });
}

export async function getPushStatus() {
  const res = await axiosInstance.get(endpoints.push.subscribe);
  return res.data as { configured?: boolean; publicKey?: string | null; enabled?: boolean };
}

export async function enablePhoneNotifications() {
  const support = getBrowserPushSupport();
  if (!support.supported) {
    throw new Error(support.reason || 'Push notifications are not available here');
  }

  const status = await getPushStatus();
  if (!status.configured || !status.publicKey) {
    throw new Error(
      'Phone notifications are not configured on the server yet (missing VAPID keys). Restart the API after setting VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.',
    );
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was blocked. Allow notifications for Cosset in the browser settings.');
  }

  const registration = await registerCossetServiceWorker();
  if (!registration) {
    throw new Error('Could not register the Cosset service worker');
  }

  const ready = await navigator.serviceWorker.ready;

  if (!ready.pushManager) {
    throw new Error(
      'Push messaging is unavailable in this browser session. Try Chrome/Edge on localhost or HTTPS.',
    );
  }

  let subscription = await ready.pushManager.getSubscription();
  if (!subscription) {
    subscription = await ready.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(status.publicKey),
    });
  }

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error('Could not create a valid push subscription');
  }

  await axiosInstance.post(endpoints.push.subscribe, {
    endpoint: json.endpoint,
    keys: json.keys,
  });

  return true;
}

export async function disablePhoneNotifications() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready.catch(() => null);
    const subscription = await registration?.pushManager?.getSubscription();
    if (subscription) {
      await subscription.unsubscribe().catch(() => undefined);
      await axiosInstance
        .delete(endpoints.push.subscribe, {
          params: { endpoint: subscription.endpoint },
        })
        .catch(() => undefined);
    }
  }

  await axiosInstance.patch(endpoints.push.subscribe, { enabled: false });
  return false;
}

export function canInstallPwaPrompt(
  deferredPrompt: { prompt: () => Promise<void> } | null,
): boolean {
  return !!deferredPrompt;
}
