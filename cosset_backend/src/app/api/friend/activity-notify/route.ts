import type { NextRequest } from 'next/server';

import { verify } from 'src/utils/jwt';
import { JWT_SECRET } from 'src/config-global';
import { STATUS, response, handleError } from 'src/utils/response';
import {
  listFriendActivityNotifyPrefs,
  setFriendActivityNotifyPref,
} from 'src/models/friend-activity-notify';
import { getUserFriends } from 'src/models/user-friends';

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

const areAcceptedFriends = async (userIdA: string, userIdB: string) => {
  const friends = await getUserFriends(userIdA, 'accepted', 2000, 0);
  return friends.some(
    (friend) =>
      (friend.userId1 === userIdA && friend.userId2 === userIdB) ||
      (friend.userId2 === userIdA && friend.userId1 === userIdB),
  );
};

/** GET /api/friend/activity-notify?subscriberId= */
export async function GET(req: NextRequest) {
  try {
    const authUserId = await getUserIdFromRequest(req);
    const subscriberId = (req.nextUrl.searchParams.get('subscriberId') || authUserId || '').trim();

    if (!UUID_REGEX.test(subscriberId)) {
      return response({ message: 'subscriberId is required' }, STATUS.BAD_REQUEST);
    }

    if (authUserId && authUserId !== subscriberId) {
      return response({ message: 'Forbidden' }, STATUS.FORBIDDEN);
    }

    const prefs = await listFriendActivityNotifyPrefs(subscriberId);
    return response({ prefs }, STATUS.OK);
  } catch (error) {
    return handleError('Friend Activity Notify - List', error as Error);
  }
}

/** PATCH /api/friend/activity-notify  body: { friendId, enabled, subscriberId? } */
export async function PATCH(req: NextRequest) {
  try {
    const authUserId = await getUserIdFromRequest(req);
    const body = await req.json();
    const subscriberId = String(body?.subscriberId || authUserId || '').trim();
    const friendId = String(body?.friendId || '').trim();
    const enabled = Boolean(body?.enabled);

    if (!UUID_REGEX.test(subscriberId) || !UUID_REGEX.test(friendId)) {
      return response(
        { message: 'subscriberId and friendId must be valid UUIDs' },
        STATUS.BAD_REQUEST,
      );
    }

    if (authUserId && authUserId !== subscriberId) {
      return response({ message: 'Forbidden' }, STATUS.FORBIDDEN);
    }

    if (subscriberId === friendId) {
      return response({ message: 'Cannot subscribe to yourself' }, STATUS.BAD_REQUEST);
    }

    const isFriend = await areAcceptedFriends(subscriberId, friendId);
    if (!isFriend) {
      return response(
        { message: 'You can only enable notifications for accepted friends' },
        STATUS.BAD_REQUEST,
      );
    }

    const pref = await setFriendActivityNotifyPref(subscriberId, friendId, enabled);
    return response({ pref }, STATUS.OK);
  } catch (error) {
    return handleError('Friend Activity Notify - Update', error as Error);
  }
}
