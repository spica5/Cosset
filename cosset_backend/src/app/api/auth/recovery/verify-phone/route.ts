import type { NextRequest } from 'next/server';

import { getUserByPhone, normalizePhoneNumber } from '@/models/users';
import { createRecoverySession } from '@/models/account-recovery-sessions';
import { verifyPhoneVerificationCode } from '@/models/phone-verification-codes';

import { STATUS, response } from 'src/utils/response';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

// ----------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const phone = normalizePhoneNumber(String(body?.phone || ''));
    const code = String(body?.code || '').trim();

    if (!phone || !code) {
      return response({ message: 'Phone and verification code are required.' }, STATUS.BAD_REQUEST);
    }

    const user = await getUserByPhone(phone);
    if (!user?.phoneVerifiedAt) {
      return response({ message: 'Invalid or expired verification code.' }, STATUS.BAD_REQUEST);
    }

    const isValid = await verifyPhoneVerificationCode(phone, code, 'recovery');
    if (!isValid) {
      return response({ message: 'Invalid or expired verification code.' }, STATUS.BAD_REQUEST);
    }

    const recoveryToken = await createRecoverySession(user.id);

    return response(
      {
        message: 'Identity verified. You can now set a new email address.',
        recoveryToken,
      },
      STATUS.OK,
    );
  } catch (error) {
    console.error('[Auth - recovery verify-phone]: ', error);
    return response({ message: 'Unable to verify phone recovery.' }, STATUS.ERROR);
  }
}
