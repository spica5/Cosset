import type { NextRequest } from 'next/server';

import { getUserByEmail } from '@/models/users';
import { createEmailVerificationCode } from '@/models/email-verification-codes';

import { sendEmailVerificationEmail } from 'src/utils/email';
import { STATUS, response } from 'src/utils/response';

// ----------------------------------------------------------------------

function generateVerificationCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const normalizedEmail = String(email || '')
      .trim()
      .toLowerCase();

    if (!normalizedEmail) {
      return response({ message: 'Email is required.' }, STATUS.BAD_REQUEST);
    }

    const user = await getUserByEmail(normalizedEmail);
    let devCode: string | undefined;

    if (user && String(user.state || '').trim().toLowerCase() === 'pending') {
      const code = generateVerificationCode();
      await createEmailVerificationCode(normalizedEmail, code);

      const emailResult = await sendEmailVerificationEmail(normalizedEmail, code);
      if (emailResult.devMode) {
        devCode = code;
      }
    }

    return response(
      {
        message: devCode
          ? 'Could not send email (SMTP unreachable). Use the verification code shown below.'
          : 'If a pending account exists for this email, you will receive a verification code shortly.',
        ...(devCode ? { devCode } : {}),
      },
      STATUS.OK,
    );
  } catch (error) {
    console.error('[Auth - resend verification]: ', error);
    const message =
      error instanceof Error ? error.message : 'Unable to resend verification email.';
    return response({ message }, STATUS.ERROR);
  }
}
