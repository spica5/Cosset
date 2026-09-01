import type { NextRequest } from 'next/server';

import { DatabaseError } from '@/db/errors';
import { replaceUserSecurityQuestions } from '@/models/user-security-questions';

import { STATUS, response } from 'src/utils/response';
import { getAuthenticatedUser } from 'src/utils/request-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

// ----------------------------------------------------------------------

export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return response({ message: 'Authorization required.' }, STATUS.UNAUTHORIZED);
    }

    const body = await req.json();
    const questions = Array.isArray(body?.questions) ? body.questions : [];

    await replaceUserSecurityQuestions(
      user.id,
      questions.map((item: { questionId?: string; answer?: string }) => ({
        questionId: String(item?.questionId || ''),
        answer: String(item?.answer || ''),
      })),
    );

    return response(
      {
        message: 'Security questions saved.',
        questionsConfigured: true,
        questionCount: questions.length,
      },
      STATUS.OK,
    );
  } catch (error) {
    console.error('[Auth - save security questions]: ', error);
    if (error instanceof DatabaseError) {
      return response({ message: error.message }, STATUS.BAD_REQUEST);
    }
    return response({ message: 'Unable to save security questions.' }, STATUS.ERROR);
  }
}
