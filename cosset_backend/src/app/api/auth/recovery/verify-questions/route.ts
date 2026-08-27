import type { NextRequest } from 'next/server';

import { createRecoverySession } from '@/models/account-recovery-sessions';
import { verifyUserSecurityAnswers } from '@/models/user-security-questions';
import { getUserByEmail } from '@/models/users';

import { STATUS, response } from 'src/utils/response';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

// ----------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body?.email || '')
      .trim()
      .toLowerCase();
    const answers = Array.isArray(body?.answers) ? body.answers : [];

    if (!email || answers.length < 3) {
      return response(
        { message: 'Email and at least 3 security answers are required.' },
        STATUS.BAD_REQUEST,
      );
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return response({ message: 'Incorrect security answers.' }, STATUS.BAD_REQUEST);
    }

    const ok = await verifyUserSecurityAnswers(
      user.id,
      answers.map((item: { questionId?: string; answer?: string }) => ({
        questionId: String(item?.questionId || ''),
        answer: String(item?.answer || ''),
      })),
    );

    if (!ok) {
      return response({ message: 'Incorrect security answers.' }, STATUS.BAD_REQUEST);
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
    console.error('[Auth - recovery verify-questions]: ', error);
    return response({ message: 'Unable to verify security answers.' }, STATUS.ERROR);
  }
}
