import type { NextRequest } from 'next/server';

import { verify } from 'src/utils/jwt';
import { STATUS, response, handleError } from 'src/utils/response';
import { sendCinemaNotifyTestToUser } from 'src/utils/cinema-schedule-notify';

import { JWT_SECRET } from 'src/config-global';
import { hasEnabledPushSubscriptionForOrigin } from 'src/models/push-subscriptions';
import {
  getCinemaNotificationPref,
  setCinemaNotificationPref,
} from 'src/models/cinema-notification-prefs';

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

/** GET /api/cinema/notification-prefs?origin=... */
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId || !UUID_REGEX.test(userId)) {
      return response({ message: 'Authentication required' }, STATUS.UNAUTHORIZED);
    }

    const pref = await getCinemaNotificationPref(userId);
    const origin = (req.nextUrl.searchParams.get('origin') || '').trim();
    const pushReady = origin
      ? await hasEnabledPushSubscriptionForOrigin(userId, origin)
      : false;

    return response(
      {
        pref: {
          customerId: userId,
          notifySchedule: Boolean(pref?.notifySchedule),
          pushReady,
        },
      },
      STATUS.OK,
    );
  } catch (error) {
    return handleError('Cinema Notification Prefs - Get', error as Error);
  }
}

/** PATCH /api/cinema/notification-prefs  body: { notifySchedule, sendTest? } */
export async function PATCH(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId || !UUID_REGEX.test(userId)) {
      return response({ message: 'Authentication required' }, STATUS.UNAUTHORIZED);
    }

    const body = await req.json();
    if (typeof body?.notifySchedule !== 'boolean') {
      return response({ message: 'notifySchedule must be a boolean' }, STATUS.BAD_REQUEST);
    }

    const pref = await setCinemaNotificationPref(userId, body.notifySchedule);

    let testSent = false;
    if (body.notifySchedule && body.sendTest) {
      try {
        await sendCinemaNotifyTestToUser(userId);
        testSent = true;
      } catch (error) {
        console.error('[Cinema Notification Prefs] test notify failed', error);
      }
    }

    return response(
      {
        pref: {
          customerId: pref.customerId,
          notifySchedule: pref.notifySchedule,
        },
        testSent,
      },
      STATUS.OK,
    );
  } catch (error) {
    return handleError('Cinema Notification Prefs - Update', error as Error);
  }
}
