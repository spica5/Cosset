import type { NextRequest } from 'next/server';

import { normalizePhoneNumber, setUserPhoneVerified } from '@/models/users';
import { verifyPhoneVerificationCode } from '@/models/phone-verification-codes';

import { STATUS, response } from 'src/utils/response';
import { getAuthenticatedUser } from 'src/utils/request-auth';

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
    const phoneInput = String(body?.phone || body?.phoneNumber || user.phoneNumber || '').trim();
    const code = String(body?.code || '').trim();
    const normalized = normalizePhoneNumber(phoneInput);

    if (!normalized || !code) {
      return response({ message: 'Phone and verification code are required.' }, STATUS.BAD_REQUEST);
    }

    const isValid = await verifyPhoneVerificationCode(normalized, code, 'setup');
    if (!isValid) {
      return response({ message: 'Invalid or expired verification code.' }, STATUS.BAD_REQUEST);
    }

    const updated = await setUserPhoneVerified(user.id, normalized);

    return response(
      {
        message: 'Phone number verified for account recovery.',
        phoneNumber: updated.phoneNumber,
        phoneVerified: true,
      },
      STATUS.OK,
    );
  } catch (error) {
    console.error('[Auth - recovery phone verify]: ', error);
    return response({ message: 'Unable to verify phone number.' }, STATUS.ERROR);
  }
}
