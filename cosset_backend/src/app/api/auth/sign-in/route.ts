import type { NextRequest } from 'next/server';

import bcrypt from 'bcryptjs';
import { getUserByEmail } from '@/models/users';

import { sign } from 'src/utils/jwt';
import { STATUS, response } from 'src/utils/response';

import { JWT_SECRET, JWT_EXPIRES_IN } from 'src/config-global';

// ----------------------------------------------------------------------

function getAccountState(user: { state?: string | null }) {
  return String(user.state || 'active').trim().toLowerCase();
}

function sanitizeUser<T extends { password?: string }>(user: T) {
  const { password: _password, ...safeUser } = user;
  return safeUser;
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const normalizedEmail = String(email || '')
      .trim()
      .toLowerCase();

    const user = await getUserByEmail(normalizedEmail);

    if (!user) {
      return response(
        {
          message: 'This email is not registered. Please check your email or create an account.',
        },
        STATUS.UNAUTHORIZED,
      );
    }

    const passwordsMatch = await bcrypt.compare(password, user.password);

    if (!passwordsMatch) {
      return response({ message: 'Incorrect email or password.' }, STATUS.UNAUTHORIZED);
    }

    const accountState = getAccountState(user);

    if (accountState === 'pending') {
      return response(
        {
          message: 'Please verify your email before signing in.',
          requiresVerification: true,
          email: normalizedEmail,
        },
        STATUS.UNAUTHORIZED,
      );
    }

    if (accountState !== 'active') {
      return response(
        "Your account isn't active and can't log in. Please contact support.",
        STATUS.UNAUTHORIZED,
      );
    }

    const accessToken = await sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    return response({ user: sanitizeUser(user), accessToken }, 200);
  } catch (error) {
    console.error('[Auth - sign in]: ', error);
    return response('Internal server error', STATUS.ERROR);
  }
}
