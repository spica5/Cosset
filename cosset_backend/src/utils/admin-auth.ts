import type { NextRequest } from 'next/server';

import { type User, getUserById } from '@/models/users';

import { verify } from 'src/utils/jwt';
import { STATUS, response } from 'src/utils/response';

import { JWT_SECRET } from 'src/config-global';

// ----------------------------------------------------------------------

type AdminAuthResult =
  | { ok: true; user: User }
  | { ok: false; response: Response };

export async function requireAdminUser(req: NextRequest): Promise<AdminAuthResult> {
  const authorization = req.headers.get('authorization');

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return {
      ok: false,
      response: response(
        { message: 'Authorization token missing or invalid' },
        STATUS.UNAUTHORIZED,
      ),
    };
  }

  const accessToken = authorization.split(' ')[1];
  if (!accessToken) {
    return {
      ok: false,
      response: response(
        { message: 'Authorization token missing or invalid' },
        STATUS.UNAUTHORIZED,
      ),
    };
  }

  try {
    const data = await verify(accessToken, JWT_SECRET);
    if (!data.userId) {
      return {
        ok: false,
        response: response({ message: 'Invalid authorization token' }, STATUS.UNAUTHORIZED),
      };
    }

    const actor = await getUserById(String(data.userId));
    if (!actor || actor.role !== 'admin') {
      return {
        ok: false,
        response: response({ message: 'Admin access required' }, STATUS.FORBIDDEN),
      };
    }

    return { ok: true, user: actor };
  } catch {
    return {
      ok: false,
      response: response({ message: 'Invalid authorization token' }, STATUS.UNAUTHORIZED),
    };
  }
}
