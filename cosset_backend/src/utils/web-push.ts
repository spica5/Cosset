import webpush from 'web-push';

import {
  deletePushSubscriptionByEndpoint,
  listEnabledPushSubscriptionsForUser,
} from 'src/models/push-subscriptions';

// ----------------------------------------------------------------------

const getVapidConfig = () => {
  const publicKey = (process.env.VAPID_PUBLIC_KEY || '').trim();
  const privateKey = (process.env.VAPID_PRIVATE_KEY || '').trim();
  const subject = (process.env.VAPID_SUBJECT || 'mailto:support@cosset.app').trim();

  if (!publicKey || !privateKey) {
    return null;
  }

  return { publicKey, privateKey, subject };
};

let vapidConfigured = false;

const ensureVapid = () => {
  const config = getVapidConfig();
  if (!config) return null;

  if (!vapidConfigured) {
    webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
    vapidConfigured = true;
  }

  return config;
};

export function getVapidPublicKey(): string | null {
  return getVapidConfig()?.publicKey || null;
}

export function isWebPushConfigured(): boolean {
  return !!getVapidConfig();
}

const stripHtml = (value: string) =>
  value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export async function sendWebPushToUser(
  customerId: string,
  payload: {
    title: string;
    body?: string;
    url?: string;
    tag?: string;
  },
): Promise<void> {
  const config = ensureVapid();
  if (!config) return;

  const subscriptions = await listEnabledPushSubscriptionsForUser(customerId);
  if (!subscriptions.length) return;

  const data = JSON.stringify({
    title: stripHtml(payload.title) || 'Cosset',
    body: stripHtml(payload.body || '') || 'Something new is happening on Cosset.',
    url: payload.url || '/dashboard/preview',
    tag: payload.tag || 'cosset-activity',
  });

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          data,
        );
      } catch (error) {
        const statusCode =
          typeof error === 'object' && error && 'statusCode' in error
            ? Number((error as { statusCode?: number }).statusCode)
            : null;

        if (statusCode === 404 || statusCode === 410) {
          await deletePushSubscriptionByEndpoint(subscription.endpoint);
          return;
        }

        console.error(`[WebPush] failed for user ${customerId}`, error);
      }
    }),
  );
}
