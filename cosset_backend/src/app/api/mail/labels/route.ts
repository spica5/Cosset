import type { NextRequest } from 'next/server';

import { STATUS, response, handleError } from 'src/utils/response';
import { buildMailLabels, getUserIdFromMailRequest } from 'src/utils/mail';

import { listUserMails } from 'src/models/user-mails';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromMailRequest(req);
    if (!userId) {
      return response({ message: 'Sign in to view mail labels' }, STATUS.UNAUTHORIZED);
    }

    const mails = await listUserMails(userId);
    const labels = buildMailLabels(mails);

    return response({ labels }, STATUS.OK);
  } catch (error) {
    return handleError('Mail - Get labels', error as Error);
  }
}
