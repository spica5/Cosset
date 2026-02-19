import type { NextRequest } from 'next/server';

import bcrypt from 'bcryptjs';
import { getUserByEmail } from '@/models/users';

import { sign } from 'src/utils/jwt';
import { STATUS, response } from 'src/utils/response';

import { JWT_SECRET, JWT_EXPIRES_IN } from 'src/config-global';

// ----------------------------------------------------------------------

// export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    const user = await getUserByEmail(email);

    if (!user) {
      return response('There is no user corresponding to the email address.', STATUS.UNAUTHORIZED);
    }

    const passwordsMatch = await bcrypt.compare(password, user.password);

    if (!passwordsMatch) {
      return response('Wrong password', STATUS.UNAUTHORIZED);
    }

    const accessToken = await sign({ userId: user?.id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    return response({ user, accessToken }, 200);
  } catch (error) {
    console.error('[Auth - sign in]: ', error);
    return response('Internal server error', STATUS.ERROR);
  }
}
