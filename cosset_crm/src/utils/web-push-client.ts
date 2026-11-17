export function getBrowserPushSupport() {
  return {
    supported: false,
    permission: 'denied' as NotificationPermission | 'unsupported',
    reason: 'Phone push is not available in Cosset CRM.',
  };
}

export async function getPushStatus() {
  return { enabled: false, ready: false };
}

export async function enablePhoneNotifications() {
  return { enabled: false, ready: false };
}

export async function ensureWebPushSubscription() {
  return null;
}

export async function unsubscribeWebPush() {
  return false;
}

export function isWebPushSupported() {
  return false;
}
