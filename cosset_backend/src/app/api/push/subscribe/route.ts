import type { NextRequest } from 'next/server';

import { verify } from 'src/utils/jwt';
import { JWT_SECRET } from 'src/config-global';
import { STATUS, response, handleError } from 'src/utils/response';
import { getVapidPublicKey, isWebPushConfigured } from 'src/utils/web-push';
import {
  deletePushSubscription,
  hasEnabledPushSubscription,
  setPushSubscriptionsEnabled,
  upsertPushSubscription,
} from 'src/models/push-subscriptions';

// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const getUserIdFromRequest = async (req: NextRequest): Promise<string | null> => {
  const authorization = req.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return null;

  try {
    const data = await verify(authorization.split(' ')[1], JWT_SECRET);
    return typeof data?.userId === 'string' && data.userId ? data.userId : null;
  } catch {
    return null;
  }
};

/** GET /api/push/vapid-public-key — also returns enabled status when authenticated */
export async function GET(req: NextRequest) {
  try {
    const publicKey = getVapidPublicKey();
    const userId = await getUserIdFromRequest(req);
    const enabled = userId ? await hasEnabledPushSubscription(userId) : false;

    return response(
      {
        configured: isWebPushConfigured(),
        publicKey,
        enabled,
      },
      STATUS.OK,
    );
  } catch (error) {
    return handleError('Push - Get status', error as Error);
  }
}

/** POST /api/push/subscribe */
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId || !UUID_REGEX.test(userId)) {
      return response({ message: 'Authentication required' }, STATUS.UNAUTHORIZED);
    }

    if (!isWebPushConfigured()) {
      return response(
        { message: 'Web push is not configured on the server' },
        STATUS.BAD_REQUEST,
      );
    }

    const body = await req.json();
    const endpoint = String(body?.endpoint || body?.subscription?.endpoint || '').trim();
    const p256dh = String(
      body?.keys?.p256dh || body?.subscription?.keys?.p256dh || '',
    ).trim();
    const auth = String(body?.keys?.auth || body?.subscription?.keys?.auth || '').trim();

    if (!endpoint || !p256dh || !auth) {
      return response(
        { message: 'endpoint, keys.p256dh, and keys.auth are required' },
        STATUS.BAD_REQUEST,
      );
    }

    const subscription = await upsertPushSubscription({
      customerId: userId,
      endpoint,
      p256dh,
      auth,
    });

    return response({ subscription, enabled: true }, STATUS.OK);
  } catch (error) {
    return handleError('Push - Subscribe', error as Error);
  }
}

/** PATCH /api/push/subscribe — enable/disable phone notifications */
export async function PATCH(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId || !UUID_REGEX.test(userId)) {
      return response({ message: 'Authentication required' }, STATUS.UNAUTHORIZED);
    }

    const body = await req.json();
    const enabled = Boolean(body?.enabled);
    await setPushSubscriptionsEnabled(userId, enabled);

    return response({ enabled }, STATUS.OK);
  } catch (error) {
    return handleError('Push - Toggle', error as Error);
  }
}

/** DELETE /api/push/subscribe */
export async function DELETE(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId || !UUID_REGEX.test(userId)) {
      return response({ message: 'Authentication required' }, STATUS.UNAUTHORIZED);
    }

    const endpoint = (req.nextUrl.searchParams.get('endpoint') || '').trim();
    await deletePushSubscription(userId, endpoint || undefined);

    return response({ enabled: false }, STATUS.OK);
  } catch (error) {
    return handleError('Push - Unsubscribe', error as Error);
  }
}
