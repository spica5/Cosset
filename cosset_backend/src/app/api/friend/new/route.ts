import type { NextRequest } from 'next/server';

import { DatabaseError } from '@/db/errors';

import { createFriendRequest } from 'src/models/user-friends';
import { getUserById } from 'src/models/users';
import { createNotification } from 'src/models/notifications';
import { STATUS, response, handleError } from 'src/utils/response';

// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId1 = String(body?.userId1 || '').trim();
    const userId2 = String(body?.userId2 || '').trim();

    if (!UUID_REGEX.test(userId1) || !UUID_REGEX.test(userId2)) {
      return response({ message: 'userId1 and userId2 are required and must be valid UUIDs' }, STATUS.BAD_REQUEST);
    }

    if (userId1 === userId2) {
      return response({ message: 'Cannot create friendship with the same user' }, STATUS.BAD_REQUEST);
    }

    const friend = await createFriendRequest(userId1, userId2);

    // Notify receiver that a new friend request was sent.
    try {
      const requester = await getUserById(userId1);
      const requesterName =
        `${requester?.firstName || ''} ${requester?.lastName || ''}`.trim() ||
        requester?.email ||
        'A user';

      await createNotification({
        customerId: userId2,
        avatarUrl: requester?.photoURL || null,
        type: 1,
        category: 1,
        isUnRead: true,
        isArchived: false,
        title: `<p><strong>${requesterName}</strong> sent you a friend request</p>`,
        content: `${requesterName} sent you a friend request`,
      });
    } catch (notificationError) {
      console.error('[Friend - Create request] failed to create request notification', notificationError);
    }

    return response({ friend }, STATUS.OK);
  } catch (error) {
    if (error instanceof DatabaseError && error.code === 'FRIEND_REQUEST_EXISTS') {
      return response({ message: error.message }, STATUS.CONFLICT);
    }

    return handleError('Friend - Create request', error as Error);
  }
}
