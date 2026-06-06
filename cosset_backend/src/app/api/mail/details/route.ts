import type { NextRequest } from 'next/server';

import { getUserMailById } from 'src/models/user-mails';
import { getUserPhotoURLsByIds } from 'src/models/users';
import { mapUserMailToApi, buildPhotoByEmailForRows, getUserIdFromMailRequest } from 'src/utils/mail';
import { STATUS, response, handleError } from 'src/utils/response';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromMailRequest(req);
    if (!userId) {
      return response({ message: 'Sign in to view mail' }, STATUS.UNAUTHORIZED);
    }

    const { searchParams } = req.nextUrl;
    const mailId = searchParams.get('mailId');

    if (!mailId) {
      return response({ message: 'mailId is required' }, STATUS.BAD_REQUEST);
    }

    const row = await getUserMailById(userId, mailId);
    if (!row) {
      return response({ message: 'Mail not found!' }, STATUS.NOT_FOUND);
    }

    const photoByUserId = row.fromUserId
      ? await getUserPhotoURLsByIds([row.fromUserId])
      : new Map<string, string>();
    const photoByEmail = await buildPhotoByEmailForRows([row]);

    return response(
      { mail: mapUserMailToApi(row, photoByUserId, photoByEmail, { forDetails: true }) },
      STATUS.OK,
    );
  } catch (error) {
    return handleError('Mail - Get details', error as Error);
  }
}
