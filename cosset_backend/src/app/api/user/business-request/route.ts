import type { NextRequest } from 'next/server';

import { createNotification } from '@/models/notifications';
import { getUserById, requestBusinessAccount, getAdminUsers } from '@/models/users';

import { verify } from 'src/utils/jwt';
import { STATUS, handleError, response } from 'src/utils/response';

import { JWT_SECRET } from 'src/config-global';

// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const authorization = req.headers.get('authorization');

    if (!authorization || !authorization.startsWith('Bearer ')) {
      return response({ message: 'Authorization token missing or invalid' }, STATUS.UNAUTHORIZED);
    }

    const accessToken = `${authorization}`.split(' ')[1];
    const data = await verify(accessToken, JWT_SECRET);

    if (!data.userId) {
      return response({ message: 'Invalid authorization token' }, STATUS.UNAUTHORIZED);
    }

    const actor = await getUserById(data.userId);

    if (!actor) {
      return response({ message: 'Invalid authorization token' }, STATUS.UNAUTHORIZED);
    }

    const updatedUser = await requestBusinessAccount(actor.id);
    const requesterName =
      `${actor.firstName || ''} ${actor.lastName || ''}`.trim() || actor.email || 'A user';

    const admins = await getAdminUsers();

    await Promise.all(
      admins.map((admin) =>
        createNotification({
          customerId: admin.id,
          avatarUrl: actor.photoURL || null,
          type: 10,
          category: 5,
          isUnRead: true,
          isArchived: false,
          title: 'Business account request',
          content: `${requesterName} requested a business account upgrade.`,
        }),
      ),
    );

    const safeUser = { ...updatedUser };
    delete (safeUser as { password?: string }).password;

    return response({ user: safeUser }, STATUS.OK);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Business account is already active') {
        return response({ message: error.message }, STATUS.BAD_REQUEST);
      }
      if (error.message === 'Business account request is already pending') {
        return response({ message: error.message }, STATUS.BAD_REQUEST);
      }
    }

    return handleError('User - business request', error as Error);
  }
}
