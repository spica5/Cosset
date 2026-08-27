import type { NextRequest } from 'next/server';

import {
  consumeRecoverySession,
  getRecoverySessionByToken,
  verifyRecoveryPendingEmailCode,
} from '@/models/account-recovery-sessions';
import { getUserByEmail, updateUserEmail } from '@/models/users';

import { STATUS, response } from 'src/utils/response';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

// ----------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const recoveryToken = String(body?.recoveryToken || '').trim();
    const newEmail = String(body?.newEmail || '')
      .trim()
      .toLowerCase();
    const code = String(body?.code || '').trim();

    if (!recoveryToken || !newEmail || !code) {
      return response(
        { message: 'Recovery token, new email, and code are required.' },
        STATUS.BAD_REQUEST,
      );
    }

    const session = await getRecoverySessionByToken(recoveryToken);
    if (!session) {
      return response(
        { message: 'Recovery session expired. Please start again.' },
        STATUS.UNAUTHORIZED,
      );
    }

    const existing = await getUserByEmail(newEmail);
    if (existing && existing.id !== session.userId) {
      return response(
        { message: 'That email is already registered to another account.' },
        STATUS.CONFLICT,
      );
    }

    const isValid = await verifyRecoveryPendingEmailCode(session, newEmail, code);
    if (!isValid) {
      return response({ message: 'Invalid or expired verification code.' }, STATUS.BAD_REQUEST);
    }

    await updateUserEmail(session.userId, newEmail);
    await consumeRecoverySession(session.id);

    return response(
      {
        message: 'Email updated successfully. You can sign in with your new email.',
        email: newEmail,
      },
      STATUS.OK,
    );
  } catch (error) {
    console.error('[Auth - recovery confirm-new-email]: ', error);
    return response({ message: 'Unable to confirm new email.' }, STATUS.ERROR);
  }
}
