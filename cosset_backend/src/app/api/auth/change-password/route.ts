import type { NextRequest } from 'next/server';

import bcrypt from 'bcryptjs';
import { getUserById, updateUserPassword } from '@/models/users';

import { getAuthenticatedUser } from 'src/utils/request-auth';
import { STATUS, response } from 'src/utils/response';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

// ----------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return response({ message: 'Authorization required.' }, STATUS.UNAUTHORIZED);
    }

    const body = await req.json();
    const currentPassword = String(body?.currentPassword || '');
    const newPassword = String(body?.newPassword || body?.password || '');

    if (!currentPassword || !newPassword) {
      return response(
        { message: 'Current password and new password are required.' },
        STATUS.BAD_REQUEST,
      );
    }

    if (newPassword.length < 6) {
      return response(
        { message: 'New password must be at least 6 characters.' },
        STATUS.BAD_REQUEST,
      );
    }

    if (currentPassword === newPassword) {
      return response(
        { message: 'New password must be different from your current password.' },
        STATUS.BAD_REQUEST,
      );
    }

    // Re-fetch to ensure we have the latest password hash.
    const freshUser = await getUserById(user.id);
    if (!freshUser?.password) {
      return response({ message: 'Unable to verify current password.' }, STATUS.ERROR);
    }

    const matches = await bcrypt.compare(currentPassword, freshUser.password);
    if (!matches) {
      return response({ message: 'Current password is incorrect.' }, STATUS.UNAUTHORIZED);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await updateUserPassword(freshUser.id, hashedPassword);

    return response({ message: 'Password updated successfully.' }, STATUS.OK);
  } catch (error) {
    console.error('[Auth - change password]: ', error);
    return response({ message: 'Unable to change password.' }, STATUS.ERROR);
  }
}
