import type { NextRequest } from 'next/server';

import { listUserMails } from 'src/models/user-mails';
import { getUserPhotoURLsByIds } from 'src/models/users';

import {
  mapUserMailToApi,
  SYSTEM_MAIL_LABELS,
  filterMailsByLabelId,
  buildPhotoByEmailForRows,
  getUserIdFromMailRequest,
} from 'src/utils/mail';
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
    const labelId = searchParams.get('labelId') || 'inbox';

    const labelExists = SYSTEM_MAIL_LABELS.some((label) => label.id === labelId);
    if (!labelExists) {
      return response({ message: 'Label not found!' }, STATUS.NOT_FOUND);
    }

    const rows = await listUserMails(userId);
    const filteredRows = filterMailsByLabelId(rows, labelId);
    const senderIds = filteredRows
      .map((row) => row.fromUserId)
      .filter((id): id is string => Boolean(id?.trim()));
    const photoByUserId = await getUserPhotoURLsByIds(senderIds);
    const photoByEmail = await buildPhotoByEmailForRows(filteredRows);
    const mails = filteredRows.map((row) => mapUserMailToApi(row, photoByUserId, photoByEmail));

    return response({ mails }, STATUS.OK);
  } catch (error) {
    return handleError('Mail - Get list', error as Error);
  }
}
