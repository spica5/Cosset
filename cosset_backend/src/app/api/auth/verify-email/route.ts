import type { NextRequest } from 'next/server';

import { getUserByEmail, updateUser } from '@/models/users';
import { verifyEmailVerificationCode } from '@/models/email-verification-codes';

import { sign } from 'src/utils/jwt';
import { STATUS, response } from 'src/utils/response';

import { JWT_SECRET, JWT_EXPIRES_IN } from 'src/config-global';

// ----------------------------------------------------------------------

function sanitizeUser<T extends { password?: string }>(user: T) {
  const { password: _password, ...safeUser } = user;
  return safeUser;
}

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();
    const normalizedEmail = String(email || '')
      .trim()
      .toLowerCase();
    const verificationCode = String(code || '').trim();

    if (!normalizedEmail || !verificationCode) {
      return response({ message: 'Email and verification code are required.' }, STATUS.BAD_REQUEST);
    }

    const user = await getUserByEmail(normalizedEmail);

    if (!user) {
      return response({ message: 'Invalid or expired verification code.' }, STATUS.BAD_REQUEST);
    }

    const accountState = String(user.state || 'active').trim().toLowerCase();
    if (accountState !== 'pending') {
      return response(
        { message: 'This email is already verified. Please sign in.' },
        STATUS.BAD_REQUEST,
      );
    }

    const isValidCode = await verifyEmailVerificationCode(normalizedEmail, verificationCode);

    if (!isValidCode) {
      return response({ message: 'Invalid or expired verification code.' }, STATUS.BAD_REQUEST);
    }

    const activatedUser = await updateUser(user.id, { state: 'active' });
    const accessToken = await sign({ userId: activatedUser.id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    return response(
      {
        user: sanitizeUser(activatedUser),
        accessToken,
        message: 'Email verified successfully.',
      },
      STATUS.OK,
    );
  } catch (error) {
    console.error('[Auth - verify email]: ', error);
    return response({ message: 'Unable to verify email. Please try again.' }, STATUS.ERROR);
  }
}
