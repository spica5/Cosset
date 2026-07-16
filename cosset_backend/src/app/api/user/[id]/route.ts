import type { NextRequest } from 'next/server';

import { updateUser, getUserById } from '@/models/users';

import { verify } from 'src/utils/jwt';
import { STATUS, handleError, response } from 'src/utils/response';

import { JWT_SECRET } from 'src/config-global';

// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const CUSTOMER_STATES = new Set(['active', 'blocked', 'deleted', 'pending', 'inactive']);

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return response({ message: 'User ID is required' }, STATUS.BAD_REQUEST);
    }

    const user = await getUserById(id);

    if (!user) {
      return response({ message: 'User not found' }, STATUS.NOT_FOUND);
    }

    const displayName =
      `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Customer';

    return response(
      {
        user: {
          id: user.id,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          displayName,
          photoURL: user.photoURL || '',
          isPublic: user.isPublic,
        },
      },
      STATUS.OK
    );
  } catch (error) {
    return handleError('User - details', error as Error);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    if (!actor || actor.role !== 'admin') {
      return response({ message: 'Admin access required' }, STATUS.FORBIDDEN);
    }

    const { id } = await params;

    if (!id) {
      return response({ message: 'User ID is required' }, STATUS.BAD_REQUEST);
    }

    const body = await req.json();
    const state = String(body?.state || '').trim().toLowerCase();

    if (!CUSTOMER_STATES.has(state)) {
      return response({ message: 'Invalid customer state' }, STATUS.BAD_REQUEST);
    }

    const updatedUser = await updateUser(id, { state });
    const safeUser = { ...updatedUser };
    delete (safeUser as { password?: string }).password;

    return response({ user: safeUser }, STATUS.OK);
  } catch (error) {
    return handleError('User - update', error as Error);
  }
}
