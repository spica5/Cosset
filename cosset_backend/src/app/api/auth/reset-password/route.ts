import type { NextRequest } from 'next/server';

import bcrypt from 'bcryptjs';
import { getUserByEmail, updateUserPassword } from '@/models/users';
import { verifyPasswordResetCode } from '@/models/password-reset-codes';

import { STATUS, response } from 'src/utils/response';

// ----------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const { email, code, password } = await req.json();

    const normalizedEmail = String(email || '')
      .trim()
      .toLowerCase();
    const resetCode = String(code || '').trim();
    const newPassword = String(password || '');

    if (!normalizedEmail || !resetCode || !newPassword) {
      return response('Email, code, and password are required.', STATUS.BAD_REQUEST);
    }

    if (newPassword.length < 6) {
      return response('Password must be at least 6 characters.', STATUS.BAD_REQUEST);
    }

    const user = await getUserByEmail(normalizedEmail);

    if (!user) {
      return response('Invalid or expired reset code.', STATUS.BAD_REQUEST);
    }

    const isValidCode = await verifyPasswordResetCode(normalizedEmail, resetCode);

    if (!isValidCode) {
      return response('Invalid or expired reset code.', STATUS.BAD_REQUEST);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await updateUserPassword(user.id, hashedPassword);

    return response({ message: 'Password updated successfully.' }, STATUS.OK);
  } catch (error) {
    console.error('[Auth - reset password]: ', error);
    return response('Internal server error', STATUS.ERROR);
  }
}
