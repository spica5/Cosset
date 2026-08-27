import { SECURITY_QUESTION_CATALOG } from '@/models/user-security-questions';

import { STATUS, response } from 'src/utils/response';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

// ----------------------------------------------------------------------

export async function GET() {
  return response(
    {
      questions: SECURITY_QUESTION_CATALOG.map((q) => ({
        id: q.id,
        prompt: q.prompt,
      })),
    },
    STATUS.OK,
  );
}
