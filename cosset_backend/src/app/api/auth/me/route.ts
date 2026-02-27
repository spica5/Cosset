import type { NextRequest } from 'next/server';

import { getUserById, updateUser } from '@/models/users';

import { verify } from 'src/utils/jwt';
import { STATUS, response } from 'src/utils/response';

import { JWT_SECRET } from 'src/config-global';

// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const authorization = req.headers.get('authorization');

    if (!authorization || !authorization.startsWith('Bearer ')) {
      return response('Authorization token missing or invalid', STATUS.UNAUTHORIZED);
    }

    const accessToken = `${authorization}`.split(' ')[1];
    const data = await verify(accessToken, JWT_SECRET);

    if (!data.userId) {
      return response('Invalid authorization token', STATUS.UNAUTHORIZED);
    }

    const user = await getUserById(data.userId);

    if (!user) {
      return response('Invalid authorization token', STATUS.UNAUTHORIZED);
    }

    return response({ user }, STATUS.OK);
  } catch (error) {
    console.error('[Auth - me]: ', error);
    return response('Internal server error', STATUS.ERROR);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authorization = req.headers.get('authorization');

    if (!authorization || !authorization.startsWith('Bearer ')) {
      return response('Authorization token missing or invalid', STATUS.UNAUTHORIZED);
    }

    const accessToken = `${authorization}`.split(' ')[1];
    const data = await verify(accessToken, JWT_SECRET);

    if (!data.userId) {
      return response('Invalid authorization token', STATUS.UNAUTHORIZED);
    }

    const body = await req.json();

    const updatedUser = await updateUser(data.userId, body);

    return response({ user: updatedUser }, STATUS.OK);
  } catch (error) {
    console.error('[Auth - me PUT]: ', error);
    return response('Internal server error', STATUS.ERROR);
  }
}
