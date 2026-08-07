import type { NextRequest } from 'next/server';

import { getUserById, type User } from '@/models/users';

import { verify } from 'src/utils/jwt';
import { JWT_SECRET } from 'src/config-global';

// ----------------------------------------------------------------------

export async function getAuthenticatedUser(req: NextRequest): Promise<User | null> {
  const authorization = req.headers.get('authorization');

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }

  const accessToken = authorization.split(' ')[1];
  if (!accessToken) {
    return null;
  }

  try {
    const data = await verify(accessToken, JWT_SECRET);
    if (!data.userId) {
      return null;
    }

    return await getUserById(String(data.userId));
  } catch {
    return null;
  }
}
