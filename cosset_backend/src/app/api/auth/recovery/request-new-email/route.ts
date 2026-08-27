import type { NextRequest } from 'next/server';

import {
  getRecoverySessionByToken,
  setRecoveryPendingEmail,
} from '@/models/account-recovery-sessions';
import { getUserByEmail } from '@/models/users';

import { sendEmailChangeVerificationEmail } from 'src/utils/email';
import { STATUS, response } from 'src/utils/response';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

// ----------------------------------------------------------------------

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const recoveryToken = String(body?.recoveryToken || '').trim();
    const newEmail = String(body?.newEmail || '')
      .trim()
      .toLowerCase();

    if (!recoveryToken || !newEmail) {
      return response(
        { message: 'Recovery token and new email are required.' },
        STATUS.BAD_REQUEST,
      );
    }

    if (!newEmail.includes('@')) {
      return response({ message: 'Enter a valid email address.' }, STATUS.BAD_REQUEST);
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

    const code = generateCode();
    await setRecoveryPendingEmail(session.id, newEmail, code);

    const emailResult = await sendEmailChangeVerificationEmail(newEmail, code);
    const devCode = emailResult.devMode ? code : undefined;

    return response(
      {
        message: devCode
          ? 'Could not send email. Use the verification code shown below.'
          : 'We sent a verification code to your new email address.',
        newEmail,
        ...(devCode ? { devCode } : {}),
      },
      STATUS.OK,
    );
  } catch (error) {
    console.error('[Auth - recovery request-new-email]: ', error);
    return response({ message: 'Unable to send new email verification.' }, STATUS.ERROR);
  }
}
