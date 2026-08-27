import type { NextRequest } from 'next/server';

import {
  getUserSecurityQuestionCount,
  getUserSecurityQuestions,
} from '@/models/user-security-questions';

import { getAuthenticatedUser } from 'src/utils/request-auth';
import { STATUS, response } from 'src/utils/response';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

// ----------------------------------------------------------------------

function maskPhone(phone?: string | null) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length < 4) {
    return null;
  }
  return `***${digits.slice(-4)}`;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return response({ message: 'Authorization required.' }, STATUS.UNAUTHORIZED);
    }

    const questionCount = await getUserSecurityQuestionCount(user.id);
    const questions = await getUserSecurityQuestions(user.id);
    const phoneVerified = Boolean(user.phoneVerifiedAt && user.phoneNumber);

    return response(
      {
        phoneNumber: user.phoneNumber || null,
        phoneMasked: maskPhone(user.phoneNumber),
        phoneVerified,
        questionsConfigured: questionCount >= 3,
        questionCount,
        questionIds: questions.map((q) => q.questionId),
      },
      STATUS.OK,
    );
  } catch (error) {
    console.error('[Auth - recovery status]: ', error);
    return response({ message: 'Unable to load recovery status.' }, STATUS.ERROR);
  }
}
