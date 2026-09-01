import type { NextRequest } from 'next/server';

import { updateUser, normalizePhoneNumber } from '@/models/users';
import { createPhoneVerificationCode } from '@/models/phone-verification-codes';

import { STATUS, response } from 'src/utils/response';
import { sendPhoneVerificationSms } from 'src/utils/sms';
import { getAuthenticatedUser } from 'src/utils/request-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

// ----------------------------------------------------------------------

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return response({ message: 'Authorization required.' }, STATUS.UNAUTHORIZED);
    }

    const body = await req.json().catch(() => ({}));
    const phoneInput = String(body?.phone || body?.phoneNumber || user.phoneNumber || '').trim();
    const normalized = normalizePhoneNumber(phoneInput);

    if (!normalized || normalized.replace(/\D/g, '').length < 8) {
      return response({ message: 'A valid phone number is required.' }, STATUS.BAD_REQUEST);
    }

    if (normalized !== normalizePhoneNumber(user.phoneNumber || '')) {
      await updateUser(user.id, { phoneNumber: normalized });
    }

    const code = generateCode();
    await createPhoneVerificationCode(normalized, code, {
      userId: user.id,
      purpose: 'setup',
    });

    const smsResult = await sendPhoneVerificationSms(normalized, code);
    const devCode = smsResult.devMode ? code : undefined;

    return response(
      {
        message: devCode
          ? 'SMS is not configured. Use the verification code shown below.'
          : 'A verification code was sent to your phone.',
        phone: normalized,
        ...(devCode ? { devCode } : {}),
      },
      STATUS.OK,
    );
  } catch (error) {
    console.error('[Auth - recovery phone send-code]: ', error);
    return response({ message: 'Unable to send phone verification code.' }, STATUS.ERROR);
  }
}
