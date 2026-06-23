import type { NextRequest } from 'next/server';

import { getUserById, getCommunityDirectoryUsers } from '@/models/users';

import { verify } from 'src/utils/jwt';
import { STATUS, response } from 'src/utils/response';

import { JWT_SECRET } from 'src/config-global';

// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

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

    const actor = await getUserById(data.userId);

    if (!actor) {
      return response('Invalid authorization token', STATUS.UNAUTHORIZED);
    }

    const { searchParams } = req.nextUrl;
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const users = await getCommunityDirectoryUsers(limit, offset);

    return response({ users }, STATUS.OK);
  } catch (error) {
    console.error('[User - directory]: ', error);
    return response('Internal server error', STATUS.ERROR);
  }
}
