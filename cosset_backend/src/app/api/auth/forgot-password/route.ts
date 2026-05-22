import type { NextRequest } from 'next/server';

import { getUserByEmail } from '@/models/users';
import { createPasswordResetCode } from '@/models/password-reset-codes';

import { sendPasswordResetEmail } from 'src/utils/email';
import { STATUS, response } from 'src/utils/response';

// ----------------------------------------------------------------------

function generateResetCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const normalizedEmail = String(email || '')
      .trim()
      .toLowerCase();

    if (!normalizedEmail) {
      return response('Email is required.', STATUS.BAD_REQUEST);
    }

    const user = await getUserByEmail(normalizedEmail);

    let devCode: string | undefined;

    if (user) {
      const code = generateResetCode();
      await createPasswordResetCode(normalizedEmail, code);

      const emailResult = await sendPasswordResetEmail(normalizedEmail, code);

      if (emailResult.devMode) {
        devCode = code;
      }
    }

    return response(
      {
        message: devCode
          ? 'Could not send email (SMTP unreachable). Use the verification code shown below.'
          : 'If an account exists for this email, you will receive a password reset code shortly.',
        ...(devCode ? { devCode } : {}),
      },
      STATUS.OK,
    );
  } catch (error) {
    console.error('[Auth - forgot password]: ', error);
    const message =
      error instanceof Error ? error.message : 'Unable to send password reset email.';
    return response(message, STATUS.ERROR);
  }
}
