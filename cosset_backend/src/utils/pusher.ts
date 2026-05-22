import Pusher from 'pusher';

// ----------------------------------------------------------------------

let client: Pusher | null | undefined;

export function getPusherServer(): Pusher | null {
  if (client === undefined) {
    const appId = process.env.PUSHER_APP_ID;
    const key = process.env.PUSHER_KEY;
    const secret = process.env.PUSHER_SECRET;
    const cluster = process.env.PUSHER_CLUSTER;

    if (!appId || !key || !secret || !cluster) {
      client = null;
    } else {
      client = new Pusher({
        appId,
        key,
        secret,
        cluster,
        useTLS: true,
      });
    }
  }

  return client;
}

export function coffeeShopChatChannel(coffeeShopId: number) {
  return `coffee-shop-${coffeeShopId}`;
}

export const COFFEE_SHOP_CHAT_EVENT = 'new-message';
export const COFFEE_SHOP_PARTICIPANT_JOINED_EVENT = 'participant-joined';
export const COFFEE_SHOP_PARTICIPANT_LEFT_EVENT = 'participant-left';
